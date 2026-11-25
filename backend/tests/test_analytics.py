from tests.helpers import auth_headers, create_exam, grade


def take(client, exam, student, answers=("a", "b")):
    submission_id = client.post(f"/exams/{exam['id']}/attempt", headers=student).json()["submission_id"]
    client.post(f"/submissions/{submission_id}/submit", headers=student, json={"answers": list(answers)})
    return submission_id


def test_exam_stats_and_report(client, teacher, clock):
    exam = create_exam(client, teacher, marks=(5, 5))
    alice = auth_headers(client, "student", "Alice")
    bob = auth_headers(client, "student", "Bob")
    carol = auth_headers(client, "student", "Carol")
    grade(take(client, exam, alice), [5, 4])
    grade(take(client, exam, bob), [2, 3])
    take(client, exam, carol)  # Submitted, not graded yet.
    client.post(f"/exams/{exam['id']}/attempt", headers=auth_headers(client, "student"))  # In progress.

    [stats] = client.get("/analytics/exams", headers=teacher).json()
    assert stats["submission_count"] == 3
    assert stats["graded_count"] == 2
    assert stats["average_score"] == 7

    report = client.get(f"/analytics/exams/{exam['id']}", headers=teacher).json()
    scores = {row["student_name"]: row["score"] for row in report["submissions"]}
    assert scores == {"Alice": 9, "Bob": 5, "Carol": None}


def test_teachers_only_see_their_own_exams(client, teacher, student, clock):
    exam = create_exam(client, teacher)
    other_teacher = auth_headers(client, "teacher")
    assert client.get("/analytics/exams", headers=other_teacher).json() == []
    assert client.get(f"/analytics/exams/{exam['id']}", headers=other_teacher).status_code == 404
    assert client.get("/analytics/exams", headers=student).status_code == 403


def test_overdue_attempts_count_once_their_time_is_up(client, teacher, student, clock, graded):
    exam = create_exam(client, teacher, duration_minutes=5)
    client.post(f"/exams/{exam['id']}/attempt", headers=student)
    assert client.get("/analytics/exams", headers=teacher).json()[0]["submission_count"] == 0

    clock.advance(minutes=10)
    assert client.get("/analytics/exams", headers=teacher).json()[0]["submission_count"] == 1
    assert len(graded) == 1


def test_exam_with_no_submissions(client, teacher):
    create_exam(client, teacher)
    [stats] = client.get("/analytics/exams", headers=teacher).json()
    assert stats["submission_count"] == stats["graded_count"] == 0
    assert stats["average_score"] is None
