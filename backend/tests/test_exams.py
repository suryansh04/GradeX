import uuid

from tests.helpers import create_exam

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


def test_teacher_creates_exam_with_computed_total(client, teacher):
    exam = create_exam(client, teacher, duration_minutes=45, marks=(5, 3, 2))
    assert exam["total_marks"] == 10
    assert exam["question_count"] == 3
    assert exam["duration_minutes"] == 45


def test_exam_validation(client, teacher):
    exam = {
        "course_code": "PHY101",
        "exam_name": "Quiz",
        "questions": [{"question_number": 1, "question_text": "Q?", "marks": 2}],
        "answers": ["A"],
    }
    assert client.post("/exams", headers=teacher, json={**exam, "answers": []}).status_code == 422
    assert client.post("/exams", headers=teacher, json={**exam, "duration_minutes": 0}).status_code == 422
    assert client.post("/exams", headers=teacher, json={**exam, "questions": []}).status_code == 422
    assert client.post("/exams", headers=teacher, json=exam).status_code == 201


def test_only_teachers_create_exams(client, student):
    response = client.post(
        "/exams",
        headers=student,
        json={"course_code": "X", "exam_name": "Y", "questions": [], "answers": []},
    )
    assert response.status_code == 403


def test_students_see_attempt_status(client, teacher, student):
    untouched = create_exam(client, teacher)
    started = create_exam(client, teacher)
    client.post(f"/exams/{started['id']}/attempt", headers=student)

    items = {item["id"]: item for item in client.get("/exams", headers=student).json()}
    assert items[untouched["id"]]["attempt"] is None
    assert items[started["id"]]["attempt"]["status"] == "in_progress"
    assert all(item["attempt"] is None for item in client.get("/exams", headers=teacher).json())


def test_image_upload(client, teacher, student):
    files = {"file": ("q.png", PNG, "image/png")}
    assert client.post("/uploads/images", headers=student, files=files).status_code == 403
    text_file = {"file": ("q.txt", b"hi", "text/plain")}
    assert client.post("/uploads/images", headers=teacher, files=text_file).status_code == 415

    response = client.post("/uploads/images", headers=teacher, files=files)
    assert response.status_code == 201
    path = response.json()["url"].replace("http://testserver", "")
    assert client.get(path).content == PNG


def test_unknown_exam(client, student):
    assert client.post(f"/exams/{uuid.uuid4()}/attempt", headers=student).status_code == 404
