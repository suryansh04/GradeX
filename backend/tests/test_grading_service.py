"""The grading job, with the NLP/Claude scoring replaced by a stub."""

import sys
import types
import uuid

import pytest

from app.database import SessionLocal
from app.grading import service
from app.models import Submission
from tests.helpers import create_exam


@pytest.fixture
def scored(monkeypatch):
    """Replaces app.grading.grader so tests do not need the NLP models."""
    calls = []

    def grade_answer(question, sample_answer, student_answer, max_marks):
        calls.append((question, sample_answer, student_answer, max_marks))
        return {"grade": 1, "answer_status": "Correct", "feedback": "", "sample_answer": sample_answer,
                "common_mistake": "", "learning_tip": "", "plagiarism_status": "", "metrics": {}}  # fmt: skip

    fake = types.ModuleType("app.grading.grader")
    fake.grade_answer = grade_answer
    monkeypatch.setitem(sys.modules, "app.grading.grader", fake)
    return calls


def attempt(client, exam, student, submit=True):
    submission_id = client.post(f"/exams/{exam['id']}/attempt", headers=student).json()["submission_id"]
    if submit:
        client.post(f"/submissions/{submission_id}/submit", headers=student, json={"answers": ["a1", "a2"]})
    return uuid.UUID(submission_id)


def graded_responses(submission_id):
    with SessionLocal() as db:
        return db.get(Submission, submission_id).graded_responses


def test_grades_each_answer_against_its_model_answer(client, teacher, student, scored):
    exam = create_exam(client, teacher, marks=(5, 3))
    submission_id = attempt(client, exam, student)

    service.grade_submission(submission_id)

    assert scored == [("Question 1?", "Model answer 1", "a1", 5), ("Question 2?", "Model answer 2", "a2", 3)]
    assert len(graded_responses(submission_id)) == 2


def test_skips_graded_and_unsubmitted_attempts(client, teacher, student, scored):
    submission_id = attempt(client, create_exam(client, teacher), student)
    service.grade_submission(submission_id)
    service.grade_submission(submission_id)
    assert len(scored) == 2

    in_progress = attempt(client, create_exam(client, teacher), student, submit=False)
    service.grade_submission(in_progress)
    assert graded_responses(in_progress) is None


def test_pending_run_grades_submitted_and_overdue_attempts(client, teacher, student, scored, clock):
    submitted = attempt(client, create_exam(client, teacher), student)
    overdue = attempt(client, create_exam(client, teacher, duration_minutes=5), student, submit=False)
    open_untimed = attempt(client, create_exam(client, teacher), student, submit=False)
    clock.advance(minutes=10)

    service.grade_pending_submissions()

    assert graded_responses(submitted) is not None
    assert graded_responses(overdue) is not None
    assert graded_responses(open_untimed) is None
