from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.dependencies import DbSession, StudentUser
from app.grading.service import grade_submission
from app.models import Exam, Submission
from app.schemas import SubmissionCreate, SubmissionCreated, SubmissionResult

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionCreated, status_code=status.HTTP_201_CREATED)
def create_submission(
    body: SubmissionCreate,
    db: DbSession,
    student: StudentUser,
    background_tasks: BackgroundTasks,
) -> Submission:
    exam = db.get(Exam, body.exam_id)
    if exam is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")
    if len(body.answers) != len(exam.questions):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Expected {len(exam.questions)} answers, got {len(body.answers)}.",
        )

    submission = Submission(student_id=student.id, exam_id=exam.id, answers=body.answers)
    db.add(submission)
    db.commit()

    # Grading takes a while, so it runs after the response has been sent.
    background_tasks.add_task(grade_submission, submission.id)
    return submission


@router.get("/me", response_model=list[SubmissionResult])
def list_my_submissions(db: DbSession, student: StudentUser) -> list[SubmissionResult]:
    submissions = db.scalars(
        select(Submission)
        .where(Submission.student_id == student.id)
        .options(joinedload(Submission.exam))
        .order_by(Submission.submitted_at)
    )
    return [
        SubmissionResult(
            id=submission.id,
            exam_id=submission.exam_id,
            course_code=submission.exam.course_code,
            exam_name=submission.exam.exam_name,
            questions=submission.exam.questions,
            answers=submission.answers,
            graded_responses=submission.graded_responses,
            submitted_at=submission.submitted_at,
        )
        for submission in submissions
    ]
