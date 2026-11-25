"""Asks Claude to grade one answer and returns its review as validated, structured data.

Kept apart from the NLP metrics so it can be tested without loading the models.
"""

from functools import lru_cache
from typing import Literal

import anthropic
from pydantic import BaseModel, Field, ValidationError

from app.config import get_settings

AnswerStatus = Literal["Correct", "Partially Correct", "Partially Incorrect", "Incorrect"]


class Review(BaseModel):
    grade: float = Field(ge=0)
    answer_status: AnswerStatus
    feedback: str
    correct_answer: str
    common_mistake: str
    learning_tip: str


# Structured outputs guarantee Claude's reply matches this schema, so no text parsing is needed.
_REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "grade": {"type": "number", "description": "Marks awarded, from 0 to the question's maximum."},
        "answer_status": {"type": "string", "enum": list(AnswerStatus.__args__)},
        "feedback": {"type": "string", "description": "At most 60 words, including why marks were deducted."},
        "correct_answer": {"type": "string", "description": "The full correct answer with key steps."},
        "common_mistake": {"type": "string", "description": "A typical mistake on this question, or empty."},
        "learning_tip": {"type": "string", "description": "One concise tip for similar questions."},
    },
    "required": ["grade", "answer_status", "feedback", "correct_answer", "common_mistake", "learning_tip"],
    "additionalProperties": False,
}  # fmt: skip


class ReviewUnavailable(RuntimeError):
    """Claude could not review the answer (API error or refusal)."""


@lru_cache
def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=get_settings().anthropic_api_key)


def build_prompt(
    question: str,
    sample_answer: str,
    student_answer: str,
    metrics: dict[str, float],
    suggested_grade: float,
    max_marks: float,
) -> str:
    metric_lines = "\n".join(
        f"- {name.replace('_', ' ')}: {value:.2f}" for name, value in metrics.items()
    )
    return f"""You are an experienced, encouraging university teacher grading one exam answer.

<question>{question}</question>
<model_answer>{sample_answer}</model_answer>
<student_answer>{student_answer}</student_answer>

An automatic comparison with the model answer produced these similarity metrics (0 to 1):
{metric_lines}
They suggest a grade of {suggested_grade:g} out of {max_marks:g}.

Judge the answer on its substance, not its wording: award partial credit for correct steps \
or reasoning even if the final answer is wrong, and do not penalise a correct answer for being \
phrased differently from the model answer. Use the suggested grade as a starting point, not a rule.

Give a grade between 0 and {max_marks:g} in steps of 0.5. Keep the feedback supportive and \
specific, and say why any marks were deducted."""


def review_answer(
    question: str,
    sample_answer: str,
    student_answer: str,
    metrics: dict[str, float],
    suggested_grade: float,
    max_marks: float,
) -> Review:
    prompt = build_prompt(
        question, sample_answer, student_answer, metrics, suggested_grade, max_marks
    )
    try:
        response = _client().beta.messages.create(
            model=get_settings().claude_model,
            max_tokens=16000,
            output_config={
                "effort": "high",
                "format": {"type": "json_schema", "schema": _REVIEW_SCHEMA},
            },
            # On a safety refusal, the API retries on a fallback model in the same call.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as error:
        raise ReviewUnavailable(f"Claude API error: {error}") from error
    return parse_review(response, max_marks)


def parse_review(response, max_marks: float) -> Review:
    """Validates Claude's structured reply and keeps the grade within the question's marks."""
    if response.stop_reason == "refusal":
        raise ReviewUnavailable("Claude declined to grade this answer.")
    if response.stop_reason == "max_tokens":
        raise ReviewUnavailable("Claude's review was cut off.")
    # Thinking is always on for this model, so the JSON is in the text block, not content[0].
    text = next((block.text for block in response.content if block.type == "text"), "")
    try:
        review = Review.model_validate_json(text)
    except ValidationError as error:
        raise ReviewUnavailable(f"Claude's review did not match the schema: {error}") from error
    review.grade = clamp_grade(review.grade, max_marks)
    return review


def clamp_grade(grade: float, max_marks: float) -> float:
    """Rounds to the nearest half mark and keeps it between 0 and the maximum."""
    return min(max(round(grade * 2) / 2, 0.0), float(max_marks))
