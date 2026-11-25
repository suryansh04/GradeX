"""Claude review: prompt content, structured-reply validation and grade clamping (no API calls)."""

import json
from types import SimpleNamespace

import anthropic
import httpx
import pytest

from app.grading import review
from app.grading.review import ReviewUnavailable, build_prompt, clamp_grade, parse_review

VALID = {
    "grade": 4,
    "answer_status": "Partially Correct",
    "feedback": "Good start.",
    "correct_answer": "Every action has an equal and opposite reaction.",
    "common_mistake": "",
    "learning_tip": "Name both bodies.",
}


def response(payload=VALID, stop_reason="end_turn"):
    text = payload if isinstance(payload, str) else json.dumps(payload)
    blocks = [
        SimpleNamespace(type="thinking", thinking=""),
        SimpleNamespace(type="text", text=text),
    ]
    return SimpleNamespace(stop_reason=stop_reason, content=blocks)


@pytest.mark.parametrize(
    ("grade", "max_marks", "expected"),
    [(4, 5, 4), (4.3, 5, 4.5), (4.2, 5, 4), (7, 5, 5), (-1, 5, 0), (2.75, 3, 3)],
)
def test_clamp_grade_rounds_to_half_marks_within_range(grade, max_marks, expected):
    assert clamp_grade(grade, max_marks) == expected


def test_parse_review_reads_the_text_block_after_thinking():
    result = parse_review(response(), max_marks=5)
    assert result.grade == 4
    assert result.answer_status == "Partially Correct"
    assert result.learning_tip == "Name both bodies."


def test_parse_review_clamps_an_out_of_range_grade():
    assert parse_review(response({**VALID, "grade": 9}), max_marks=5).grade == 5


@pytest.mark.parametrize(
    "reply",
    [
        response(stop_reason="refusal"),
        response(stop_reason="max_tokens"),
        response("not json"),
        response({**VALID, "answer_status": "Great"}),
    ],
)
def test_parse_review_rejects_unusable_replies(reply):
    with pytest.raises(ReviewUnavailable):
        parse_review(reply, max_marks=5)


def test_prompt_contains_answers_metrics_and_mark_range():
    prompt = build_prompt("Q?", "Model", "Student", {"bert_similarity": 0.812}, 3.5, 5)
    assert "<model_answer>Model</model_answer>" in prompt
    assert "<student_answer>Student</student_answer>" in prompt
    assert "bert similarity: 0.81" in prompt
    assert "3.5 out of 5" in prompt


def test_api_errors_become_review_unavailable(monkeypatch):
    def fail(**_kwargs):
        raise anthropic.APIConnectionError(
            request=httpx.Request("POST", "https://api.anthropic.com")
        )

    client = SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(create=fail)))
    monkeypatch.setattr(review, "_client", lambda: client)
    with pytest.raises(ReviewUnavailable):
        review.review_answer("Q?", "Model", "Student", {}, 1, 5)
