from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.dependencies import DbSession, GradingScheduler, OwnSubmission, StudentUser
from app.models import Submission
from app.schemas import AnswersIn, SubmissionResult, SubmitResult
from app.services import attempts

router = APIRouter(prefix="/submissions", tags=["submissions"])


def _check_answer_count(submission: Submission, answers: list[str]) -> None:
    expected = submission.exam.question_count
    if len(answers) != expected:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Expected {expected} answers, got {len(answers)}.",
        )


@router.put("/{submission_id}/answers", status_code=status.HTTP_204_NO_CONTENT)
def save_answers(body: AnswersIn, submission: OwnSubmission, db: DbSession) -> Response:
    """Saves the in-progress answers, so they survive a refresh or a lost connection."""
    _check_answer_count(submission, body.answers)
    attempts.save_answers(submission, body.answers, attempts.utc_now())
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{submission_id}/submit", response_model=SubmitResult)
def submit(
    body: AnswersIn,
    submission: OwnSubmission,
    db: DbSession,
    schedule_grading: GradingScheduler,
) -> SubmitResult:
    _check_answer_count(submission, body.answers)
    answers_accepted = attempts.submit(submission, body.answers, attempts.utc_now())
    db.commit()
    schedule_grading(submission.id)
    return SubmitResult(
        submission_id=submission.id,
        submitted_at=submission.submitted_at,
        answers_accepted=answers_accepted,
    )


@router.get("/me", response_model=list[SubmissionResult])
def list_my_submissions(
    db: DbSession, student: StudentUser, schedule_grading: GradingScheduler
) -> list[SubmissionResult]:
    attempts.finalize_overdue(db, schedule_grading, Submission.student_id == student.id)
    submissions = db.scalars(
        select(Submission)
        .where(Submission.student_id == student.id, Submission.submitted_at.is_not(None))
        .options(joinedload(Submission.exam))
        .order_by(Submission.submitted_at.desc())
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
            score=attempts.score(submission),
            total_marks=submission.exam.total_marks,
            submitted_at=submission.submitted_at,
        )
        for submission in submissions
    ]
