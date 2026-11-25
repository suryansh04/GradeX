"""Grades a single answer: similarity metrics, a plagiarism check, and a Claude review.

Ported from the former examPortal/grade.py. The heavy NLP models are loaded lazily
on first use, so importing this module (and starting the API) stays fast.
"""

import logging
import re
import warnings
from functools import lru_cache
from typing import Any

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

from app.grading.review import ReviewUnavailable, clamp_grade, review_answer

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
_PLAGIARISED_LEVELS = {"cut", "light"}


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def _containment(text1: str, text2: str, n: int) -> float:
    ngrams1 = set(ngrams(nltk.word_tokenize(text1), n))
    ngrams2 = set(ngrams(nltk.word_tokenize(text2), n))
    return len(ngrams1 & ngrams2) / len(ngrams1) if ngrams1 else 0


def _containment_features(text1: str, text2: str) -> list[float]:
    return [_containment(text1, text2, n) for n in range(1, 11)]


@lru_cache
def _plagiarism_classifier() -> MultinomialNB:
    normalised = [(_normalise(text), label) for text, label in _TRAINING_DATA]
    original = normalised[0][0]
    features = [_containment_features(text, original) for text, _ in normalised]
    labels = [_LABEL_MAP[label] for _, label in normalised]

    x_train, _, y_train, _ = train_test_split(features, labels, test_size=0.2, random_state=42)
    classifier = MultinomialNB()
    classifier.fit(x_train, y_train)
    return classifier


def _check_plagiarism(text: str, original_text: str) -> tuple[str, float]:
    features = _containment_features(_normalise(text), _normalise(original_text))
    prediction = _plagiarism_classifier().predict([features])[0]
    level = next(label for label, value in _LABEL_MAP.items() if value == prediction)
    return level, sum(features) / len(features)


# --- Similarity metrics -----------------------------------------------------

_METRIC_WEIGHTS = {
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
_DISCOURSE_MARKERS = (
    "however", "therefore", "thus", "consequently", "in conclusion", "for example", "in contrast",
)  # fmt: skip


def _ratio(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0


def _bert_embedding(text: str) -> np.ndarray:
    tokenizer, model = _bert()
    inputs = tokenizer(text, return_tensors="pt", max_length=512, truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    return outputs.last_hidden_state.mean(dim=1).squeeze().numpy()


def _discourse_markers(text: str) -> int:
    lowered = text.lower()
    return sum(1 for marker in _DISCOURSE_MARKERS if marker in lowered)


def _similarity_metrics(sample_answer: str, student_answer: str) -> dict[str, float]:
    """Scores how closely the student's answer matches the model answer, each from 0 to 1."""
    nlp = _nlp()

    def lemmatize(text: str) -> str:
        return " ".join(
            token.lemma_ for token in nlp(text.lower()) if not token.is_stop and token.is_alpha
        )

    processed_sample = lemmatize(sample_answer)
    processed_student = lemmatize(student_answer)
    vectors = TfidfVectorizer().fit_transform([processed_sample, processed_student])

    sample_keywords = set(processed_sample.split())
    student_keywords = set(processed_student.split())
    sample_doc = nlp(sample_answer)
    student_doc = nlp(student_answer)
    important_keywords = {str(k) for k in set(sample_doc.noun_chunks) | set(sample_doc.ents)}

    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore", message="The model you're using has no word vectors loaded"
        )
        semantic_similarity = sample_doc.similarity(student_doc)

    sample_readability = textstat.flesch_reading_ease(sample_answer)
    student_readability = textstat.flesch_reading_ease(student_answer)
    readability_diff = _ratio(
        abs(sample_readability - student_readability),
        max(sample_readability, student_readability),
    )

    metrics = {
        "cosine_similarity": cosine_similarity(vectors[0:1], vectors[1:2])[0][0],
        "keyword_overlap": _ratio(len(sample_keywords & student_keywords), len(sample_keywords)),
        "important_keyword_overlap": _ratio(
            len(important_keywords & student_keywords), len(important_keywords)
        ),
        "semantic_similarity": semantic_similarity,
        "length_ratio": min(_ratio(len(student_answer), len(sample_answer)), 1.0),
        "sentence_count_ratio": min(
            _ratio(len(list(student_doc.sents)), len(list(sample_doc.sents))), 1.0
        ),
        "readability_similarity": 1 - readability_diff,
        "discourse_structure": _discourse_markers(student_answer)
        / max(_discourse_markers(sample_answer), 1),
        "bert_similarity": cosine_similarity(
            [_bert_embedding(sample_answer)], [_bert_embedding(student_answer)]
        )[0][0],
    }
    # numpy scalars -> floats, so the result can be stored as JSON.
    return {name: float(value) for name, value in metrics.items()}


def _metric_grade(metrics: dict[str, float], max_marks: float) -> float:
    weighted = sum(metrics[name] * weight for name, weight in _METRIC_WEIGHTS.items())
    # A steep sigmoid around 0.5 separates weak and strong matches.
    return clamp_grade(1 / (1 + np.exp(-10 * (weighted - 0.5))) * max_marks, max_marks)


def _status_from_grade(grade: float, max_marks: float) -> str:
    share = _ratio(grade, max_marks)
    if share >= 0.9:
        return "Correct"
    if share >= 0.5:
        return "Partially Correct"
    return "Partially Incorrect" if share > 0 else "Incorrect"


# --- Public API -------------------------------------------------------------


def _result(
    grade: float, answer_status: str, feedback: str, sample_answer: str, **extra: Any
) -> dict:
    return {
        "grade": grade,
        "answer_status": answer_status,
        "feedback": feedback,
        "sample_answer": sample_answer,
        "common_mistake": extra.get("common_mistake", ""),
        "learning_tip": extra.get("learning_tip", ""),
        "plagiarism_status": extra.get("plagiarism_status", "Not checked"),
        "metrics": extra.get("metrics", {}),
    }


def grade_answer(
    question: str, sample_answer: str, student_answer: str, max_marks: float
) -> dict[str, Any]:
    # Timed exams can end with questions left blank: no models or Claude call needed.
    if not student_answer.strip():
        return _result(
            0, "Not answered", "No answer was submitted for this question.", sample_answer
        )

    metrics = _similarity_metrics(sample_answer, student_answer)
    suggested_grade = _metric_grade(metrics, max_marks)
    plagiarism_level, similarity = _check_plagiarism(student_answer, sample_answer)
    checked = {
        "metrics": metrics,
        "plagiarism_status": f"Plagiarism level: {plagiarism_level}, Similarity: {similarity:.2f}",
    }

    if plagiarism_level in _PLAGIARISED_LEVELS:
        return _result(
            0,
            "Plagiarized",
            f"Potential plagiarism detected (similarity {similarity:.2f}). Please submit original work.",
            sample_answer,
            **checked,
        )

    try:
        review = review_answer(
            question, sample_answer, student_answer, metrics, suggested_grade, max_marks
        )
    except ReviewUnavailable:
        # Fall back to the metric grade rather than failing the whole submission.
        logger.exception("Claude review unavailable; using the metric grade")
        return _result(
            suggested_grade,
            _status_from_grade(suggested_grade, max_marks),
            "Graded automatically against the model answer; written feedback is unavailable.",
            sample_answer,
            **checked,
        )

    return _result(
        review.grade,
        review.answer_status,
        review.feedback,
        review.correct_answer or sample_answer,
        common_mistake=review.common_mistake,
        learning_tip=review.learning_tip,
        **checked,
    )
