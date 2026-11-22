"""Grades a single answer: similarity metrics, a plagiarism check, and Claude feedback.

Ported from the former examPortal/grade.py. The heavy NLP models are loaded lazily
on first use, so importing this module (and starting the API) stays fast.
"""

import logging
import re
import warnings
from functools import lru_cache
from typing import Any

import anthropic
import nltk
import numpy as np
import spacy
import textstat
import torch
from nltk.util import ngrams
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from transformers import BertModel, BertTokenizer

from app.config import get_settings

logger = logging.getLogger(__name__)

# --- Model loading ----------------------------------------------------------


@lru_cache
def _nlp():
    return spacy.load("en_core_web_sm")


@lru_cache
def _bert():
    return BertTokenizer.from_pretrained("bert-base-uncased"), BertModel.from_pretrained(
        "bert-base-uncased"
    )


@lru_cache
def _anthropic_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=get_settings().anthropic_api_key)


# --- Plagiarism detection ---------------------------------------------------

# Simulated dataset for plagiarism detection (replace with real data).
_TRAINING_DATA = [
    ("This is the original text.", "orig"),
    ("This is the original text.", "cut"),
    ("This is a slightly modified text.", "light"),
    ("This text has been heavily modified but keeps the main idea.", "heavy"),
    ("This is a completely different text.", "non"),
]
_LABEL_MAP = {"orig": -1, "non": 0, "heavy": 1, "light": 2, "cut": 3}


def _preprocess_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def _calculate_containment(text1: str, text2: str, n: int) -> float:
    ngrams1 = set(ngrams(nltk.word_tokenize(text1), n))
    ngrams2 = set(ngrams(nltk.word_tokenize(text2), n))
    return len(ngrams1 & ngrams2) / len(ngrams1) if ngrams1 else 0


def _extract_features(text1: str, text2: str) -> list[float]:
    return [_calculate_containment(text1, text2, n) for n in range(1, 11)]


@lru_cache
def _plagiarism_classifier() -> MultinomialNB:
    preprocessed = [(_preprocess_text(text), label) for text, label in _TRAINING_DATA]
    original = preprocessed[0][0]
    features = [_extract_features(text, original) for text, _ in preprocessed]
    labels = [_LABEL_MAP[label] for _, label in preprocessed]

    x_train, _, y_train, _ = train_test_split(features, labels, test_size=0.2, random_state=42)
    classifier = MultinomialNB()
    classifier.fit(x_train, y_train)
    return classifier


def _check_plagiarism(text: str, original_text: str) -> tuple[str, float]:
    features = _extract_features(_preprocess_text(text), _preprocess_text(original_text))
    prediction = _plagiarism_classifier().predict([features])[0]
    plagiarism_level = next(label for label, value in _LABEL_MAP.items() if value == prediction)
    similarity = sum(features) / len(features)
    return plagiarism_level, similarity


# --- Similarity metrics -----------------------------------------------------


def _bert_embedding(text: str) -> np.ndarray:
    tokenizer, model = _bert()
    inputs = tokenizer(text, return_tensors="pt", max_length=512, truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    return outputs.last_hidden_state.mean(dim=1).squeeze().numpy()


def _discourse_markers(text: str) -> int:
    markers = [
        "however", "therefore", "thus", "consequently",
        "in conclusion", "for example", "in contrast",
    ]  # fmt: skip
    return sum(1 for marker in markers if marker in text.lower())


def _ratio(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0


def _to_native(value: Any) -> Any:
    """Converts numpy scalars so the result can be stored as JSON."""
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {key: _to_native(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_native(item) for item in value]
    return value


# --- Claude feedback --------------------------------------------------------


def _feedback_prompt(
    question: str,
    sample_answer: str,
    student_answer: str,
    metrics: dict[str, float],
    weighted_score: float,
    grade: int,
    max_marks: float,
) -> str:
    return f"""You are an experienced, compassionate university teacher who genuinely cares about your students' learning and growth. Your goal is to provide constructive, encouraging feedback that helps students understand their mistakes and improve.
Grade the following student answer:
Question: {question}
Correct Answer: {sample_answer}
Student Answer: {student_answer}
Carefully analyze the student's answer, comparing it to the Correct answer. Consider partial credit for correct steps or reasoning, even if the final answer is incorrect.
The algorithm has calculated the following metrics:
Cosine Similarity: {metrics["cosine_similarity"]:.2f}
Keyword Overlap: {metrics["keyword_overlap"]:.2f}
Length Ratio: {metrics["length_ratio"]:.2f}
Readability Similarity: {metrics["readability_similarity"]:.2f}
BERT Similarity: {metrics["bert_similarity"]:.2f}
Overall Weighted Score: {weighted_score:.2f}
Calculated Grade: {grade}/{max_marks}

Based on the student's performance, assign an 'Answer Status' from the following categories: Correct, Partially Correct, Partially Incorrect, Incorrect.

Provide a detailed response in the following format:
Grade: [Use the calculated grade: {grade}/{max_marks}]
Answer Status: [Provide the answer status based on your analysis]
Feedback:
[Provide detailed, encouraging feedback..., keep the feedback to the point it and also tell me why have deducted marks if you have and it should be maximum of 60 words]
Correct Answer:
[Provide the full correct answer, including any important steps or explanations.]
Common Mistake:
[Briefly explain a common mistake related to this type of problem,keep it to the point  if applicable.]
Learning Tip:
[Offer a concise, helpful tip for better understanding or approaching similar problems in the future.]
Remember to maintain a supportive and encouraging tone throughout your feedback, focusing on the student's learning journey rather than just the correctness of the answer."""


def _claude_feedback(prompt: str) -> str:
    response = _anthropic_client().beta.messages.create(
        model=get_settings().claude_model,
        max_tokens=16000,
        output_config={"effort": "high"},
        # On a safety refusal, the API retries on a fallback model in the same call.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": prompt}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined to grade this answer.")
    # Thinking is always on for this model, so the reply is not necessarily content[0].
    return next(block.text for block in response.content if block.type == "text").strip()


def _section(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.DOTALL)
    return match.group(1).strip() if match else None


# --- Public API -------------------------------------------------------------


def grade_answer(
    question: str, sample_answer: str, student_answer: str, max_marks: float
) -> dict[str, Any]:
    nlp = _nlp()

    def lemmatize(text: str) -> str:
        doc = nlp(text.lower())
        return " ".join(token.lemma_ for token in doc if not token.is_stop and token.is_alpha)

    processed_sample = lemmatize(sample_answer)
    processed_student = lemmatize(student_answer)

    # Text similarity using TF-IDF and cosine similarity
    vectors = TfidfVectorizer().fit_transform([processed_sample, processed_student])
    cosine_sim = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]

    # Keyword matching with importance weighting
    sample_keywords = set(processed_sample.split())
    student_keywords = set(processed_student.split())
    sample_doc = nlp(sample_answer)
    student_doc = nlp(student_answer)
    important_keywords = {str(k) for k in set(sample_doc.noun_chunks) | set(sample_doc.ents)}

    keyword_overlap = _ratio(len(sample_keywords & student_keywords), len(sample_keywords))
    important_keyword_overlap = _ratio(
        len(important_keywords & student_keywords), len(important_keywords)
    )

    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="The model you're using has no word vectors loaded")
        semantic_sim = sample_doc.similarity(student_doc)

    # Length and structure analysis
    length_ratio = min(_ratio(len(student_answer), len(sample_answer)), 1.0)
    sentence_count_ratio = min(
        _ratio(len(list(student_doc.sents)), len(list(sample_doc.sents))), 1.0
    )

    # Readability and complexity measures
    sample_readability = textstat.flesch_reading_ease(sample_answer)
    student_readability = textstat.flesch_reading_ease(student_answer)
    readability_diff = _ratio(
        abs(sample_readability - student_readability),
        max(sample_readability, student_readability),
    )

    discourse_ratio = _discourse_markers(student_answer) / max(_discourse_markers(sample_answer), 1)

    bert_similarity = cosine_similarity(
        [_bert_embedding(sample_answer)], [_bert_embedding(student_answer)]
    )[0][0]

    metrics = {
        "cosine_similarity": cosine_sim,
        "keyword_overlap": keyword_overlap,
        "important_keyword_overlap": important_keyword_overlap,
        "semantic_similarity": semantic_sim,
        "length_ratio": length_ratio,
        "sentence_count_ratio": sentence_count_ratio,
        "readability_similarity": 1 - readability_diff,
        "discourse_structure": discourse_ratio,
        "bert_similarity": bert_similarity,
    }
    weights = {
        "cosine_similarity": 0.15,
        "keyword_overlap": 0.1,
        "important_keyword_overlap": 0.15,
        "semantic_similarity": 0.15,
        "length_ratio": 0.05,
        "sentence_count_ratio": 0.05,
        "readability_similarity": 0.1,
        "discourse_structure": 0.05,
        "bert_similarity": 0.2,
    }
    weighted_score = sum(metrics[key] * weights[key] for key in metrics)
    transformed_score = 1 / (1 + np.exp(-10 * (weighted_score - 0.5)))
    grade = round(transformed_score * max_marks)

    plagiarism_level, similarity = _check_plagiarism(student_answer, sample_answer)

    correct_answer = sample_answer
    common_mistake = ""
    learning_tip = ""

    if plagiarism_level in ("cut", "light"):
        grade = 0
        answer_status = "Plagiarized"
        feedback = (
            f"Potential plagiarism detected. Plagiarism level: {plagiarism_level}, "
            f"Similarity: {similarity:.2f}. Please submit original work."
        )
    else:
        prompt = _feedback_prompt(
            question, sample_answer, student_answer, metrics, weighted_score, grade, max_marks
        )
        try:
            result = _claude_feedback(prompt)
            grade_match = re.search(r"Grade: (\d+)/", result)
            grade = int(grade_match.group(1)) if grade_match else grade
            answer_status = _section(r"Answer Status:\s*(.*?)(?:Feedback:|$)", result) or "Unknown"
            feedback = (
                _section(r"Feedback:\s*(.*?)(?:Correct Answer:|$)", result)
                or "No feedback provided."
            )
            correct_answer = (
                _section(r"Correct Answer:\s*(.*?)(?:Common Mistake:|Learning Tip:|$)", result)
                or sample_answer
            )
            common_mistake = _section(r"Common Mistake:\s*(.*?)(?:Learning Tip:|$)", result) or ""
            learning_tip = _section(r"Learning Tip:\s*(.*?)$", result) or ""
        except Exception as error:
            logger.exception("Error calling Claude API")
            grade = 0
            answer_status = "Error"
            feedback = f"Error occurred while grading: {error}"

    return _to_native(
        {
            "grade": grade,
            "answer_status": answer_status,
            "feedback": feedback,
            "sample_answer": correct_answer,
            "common_mistake": common_mistake,
            "learning_tip": learning_tip,
            "plagiarism_status": (
                f"Plagiarism level: {plagiarism_level}, Similarity: {similarity:.2f}"
            ),
            "metrics": metrics,
        }
    )
