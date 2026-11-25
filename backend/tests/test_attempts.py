"""Starting, saving, and submitting attempts, including time limits."""

import uuid
from datetime import datetime

from tests.helpers import auth_headers, create_exam, grade


def start(client, exam, student):
    return client.post(f"/exams/{exam['id']}/attempt", headers=student)


def save(client, submission_id, student, answers):
    return client.put(f"/submissions/{submission_id}/answers", headers=student, json={"answers": answers})


def submit(client, submission_id, student, answers):
    return client.post(f"/submissions/{submission_id}/submit", headers=student, json={"answers": answers})


def test_attempt_hides_model_answers_and_starts_blank(client, teacher, student, clock):
    exam = create_exam(client, teacher)
    response = start(client, exam, student)
    assert response.status_code == 200
    attempt = response.json()
    assert attempt["answers"] == ["", ""]
    assert attempt["deadline"] is None
    assert "answers" not in attempt["exam"]
    assert attempt["exam"]["questions"][0]["question_text"] == "Question 1?"


def test_resume_returns_saved_answers(client, teacher, student, clock):
    exam = create_exam(client, teacher)
    first = start(client, exam, student).json()
    assert save(client, first["submission_id"], student, ["draft", ""]).status_code == 204

    again = start(client, exam, student).json()
    assert again["submission_id"] == first["submission_id"]
    assert again["answers"] == ["draft", ""]
    assert again["started_at"] == first["started_at"]


def test_submit_once(client, teacher, student, clock, graded):
    exam = create_exam(client, teacher)
    submission_id = start(client, exam, student).json()["submission_id"]

    response = submit(client, submission_id, student, ["a", "b"])
    assert response.status_code == 200
    assert response.json()["answers_accepted"] is True
    assert graded == [uuid.UUID(submission_id)]

    assert submit(client, submission_id, student, ["a", "b"]).status_code == 409
    assert save(client, submission_id, student, ["a", "b"]).status_code == 409
    assert start(client, exam, student).status_code == 409


def test_answer_count_must_match(client, teacher, student, clock):
    exam = create_exam(client, teacher)
    submission_id = start(client, exam, student).json()["submission_id"]
    assert save(client, submission_id, student, ["only one"]).status_code == 422
    assert submit(client, submission_id, student, ["a", "b", "c"]).status_code == 422


def test_cannot_touch_another_students_attempt(client, teacher, student, clock):
    exam = create_exam(client, teacher)
    submission_id = start(client, exam, student).json()["submission_id"]
    other = auth_headers(client, "student")
    assert save(client, submission_id, other, ["x", "y"]).status_code == 404
    assert submit(client, submission_id, other, ["x", "y"]).status_code == 404
    assert submit(client, submission_id, teacher, ["x", "y"]).status_code == 403


def test_timed_attempt_reports_deadline(client, teacher, student, clock):
    exam = create_exam(client, teacher, duration_minutes=30)
    attempt = start(client, exam, student).json()
    deadline = datetime.fromisoformat(attempt["deadline"])
    server_time = datetime.fromisoformat(attempt["server_time"])
    assert (deadline - server_time).total_seconds() == 30 * 60


def test_submission_within_grace_period_is_accepted(client, teacher, student, clock):
    exam = create_exam(client, teacher, duration_minutes=10)
    submission_id = start(client, exam, student).json()["submission_id"]
    clock.advance(minutes=10, seconds=20)  # Inside the 30 s grace period.

    response = submit(client, submission_id, student, ["final", "answers"])
    assert response.json()["answers_accepted"] is True
    # Recorded as submitted at the deadline, not later.
    assert response.json()["submitted_at"].startswith("2026-01-01T09:10:00")


def test_late_submission_keeps_last_saved_draft(client, teacher, student, clock, graded):
    exam = create_exam(client, teacher, duration_minutes=10)
    submission_id = start(client, exam, student).json()["submission_id"]
    save(client, submission_id, student, ["saved draft", ""])
    clock.advance(minutes=11)

    assert save(client, submission_id, student, ["too", "late"]).status_code == 409
    response = submit(client, submission_id, student, ["too", "late"])
    assert response.status_code == 200
    assert response.json()["answers_accepted"] is False
    assert graded == [uuid.UUID(submission_id)]

    results = client.get("/submissions/me", headers=student).json()
    assert results[0]["answers"] == ["saved draft", ""]


def test_abandoned_timed_attempt_is_submitted_automatically(client, teacher, student, clock, graded):
    exam = create_exam(client, teacher, duration_minutes=5)
    submission_id = start(client, exam, student).json()["submission_id"]
    save(client, submission_id, student, ["half done", ""])
    clock.advance(hours=1)

    items = client.get("/exams", headers=student).json()
    assert items[0]["attempt"]["status"] == "submitted"
    assert graded == [uuid.UUID(submission_id)]
    assert start(client, exam, student).status_code == 409


def test_expired_attempt_cannot_be_resumed(client, teacher, student, clock, graded):
    exam = create_exam(client, teacher, duration_minutes=5)
    submission_id = start(client, exam, student).json()["submission_id"]
    clock.advance(minutes=6)

    response = start(client, exam, student)
    assert response.status_code == 409
    assert "Time is up" in response.json()["detail"]
    assert graded == [uuid.UUID(submission_id)]


def test_untimed_attempt_never_expires(client, teacher, student, clock):
    exam = create_exam(client, teacher)
    submission_id = start(client, exam, student).json()["submission_id"]
    clock.advance(days=30)
    assert save(client, submission_id, student, ["still", "here"]).status_code == 204


def test_results_list_only_submitted_attempts_with_score(client, teacher, student, clock):
    exam = create_exam(client, teacher, marks=(5, 3))
    in_progress = create_exam(client, teacher)
    start(client, in_progress, student)
    submission_id = start(client, exam, student).json()["submission_id"]
    submit(client, submission_id, student, ["a", "b"])

    results = client.get("/submissions/me", headers=student).json()
    assert [r["id"] for r in results] == [submission_id]
    assert results[0]["score"] is None
    assert results[0]["total_marks"] == 8

    grade(submission_id, [4, 2.5])
    assert client.get("/submissions/me", headers=student).json()[0]["score"] == 6.5
