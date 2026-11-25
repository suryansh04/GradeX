"""Helpers shared by the API tests."""

import json
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import engine

PASSWORD = "password123"


def auth_headers(client: TestClient, role: str, name: str | None = None) -> dict[str, str]:
    email = f"{role}-{uuid.uuid4().hex[:8]}@example.com"
    signup = client.post(
        "/auth/signup",
        json={"name": name or role.title(), "email": email, "password": PASSWORD, "role": role},
    )
    assert signup.status_code == 201, signup.text
    login = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def create_exam(
    client: TestClient,
    teacher: dict[str, str],
    *,
    duration_minutes: int | None = None,
    marks: tuple[float, ...] = (5, 3),
) -> dict:
    body = {
        "course_code": "PHY101",
        "exam_name": "Midterm",
        "duration_minutes": duration_minutes,
        "questions": [
            {"question_number": i + 1, "question_text": f"Question {i + 1}?", "marks": m}
            for i, m in enumerate(marks)
        ],
        "answers": [f"Model answer {i + 1}" for i in range(len(marks))],
    }
    response = client.post("/exams", headers=teacher, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def grade(submission_id: str, grades: list[float]) -> None:
    """Stores grading results directly, standing in for the grader."""
    responses = [
        {
            "grade": g, "answer_status": "Correct", "feedback": "", "sample_answer": "",
            "common_mistake": "", "learning_tip": "", "plagiarism_status": "", "metrics": {},
        }
        for g in grades
    ]  # fmt: skip
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE submissions SET graded_responses = CAST(:r AS jsonb) WHERE id = :id"),
            {"r": json.dumps(responses), "id": submission_id},
        )
