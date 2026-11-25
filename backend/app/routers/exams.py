from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import (
    CurrentUser,
    DbSession,
    ExamFromPath,
    GradingScheduler,
    StudentUser,
    TeacherUser,
)
from app.models import Exam, Role, Submission
from app.schemas import (
    AttemptOut,
    AttemptStatus,
    AttemptSummary,
    ExamCreate,
    ExamDetail,
    ExamListItem,
    ExamSummary,
)
from app.services import attempts

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=list[ExamListItem])
def list_exams(db: DbSession, user: CurrentUser, schedule_grading: GradingScheduler) -> list[ExamListItem]:
    exams = db.scalars(select(Exam).order_by(Exam.created_at.desc())).all()
    items = [ExamListItem.model_validate(exam) for exam in exams]
    if user.role != Role.STUDENT:
        return items

    attempts.finalize_overdue(db, schedule_grading, Submission.student_id == user.id)
    by_exam = {
        submission.exam_id: AttemptSummary(
            submission_id=submission.id,
            status=AttemptStatus.IN_PROGRESS
            if submission.submitted_at is None
            else AttemptStatus.SUBMITTED,
        )
        for submission in db.scalars(select(Submission).where(Submission.student_id == user.id))
    }
    for item in items:
        item.attempt = by_exam.get(item.id)
    return items


@router.post("", response_model=ExamSummary, status_code=status.HTTP_201_CREATED)
def create_exam(body: ExamCreate, db: DbSession, teacher: TeacherUser) -> Exam:
    # Every question needs a model answer, or it cannot be graded later.
    if len(body.answers) != len(body.questions):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"The answer sheet has {len(body.answers)} answers but the exam has "
                f"{len(body.questions)} questions."
            ),
        )

    exam = Exam(
        course_code=body.course_code.strip(),
        exam_name=body.exam_name.strip(),
        duration_minutes=body.duration_minutes,
        total_marks=sum(question.marks for question in body.questions),
        questions=[question.model_dump() for question in body.questions],
        answers=body.answers,
        created_by=teacher.id,
    )
    db.add(exam)
    db.commit()
    return exam


@router.post("/{exam_id}/attempt", response_model=AttemptOut)
def start_attempt(
    exam: ExamFromPath,
    db: DbSession,
    student: StudentUser,
    schedule_grading: GradingScheduler,
) -> AttemptOut:
    """Starts the student's attempt, or resumes it if already started."""
    now = attempts.utc_now()
    try:
        submission = attempts.start_or_resume(db, exam, student.id, now)
    except attempts.AttemptTimeExpired as error:
        attempts.finalize_overdue(
            db, schedule_grading, Submission.student_id == student.id, Submission.exam_id == exam.id
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None
    except attempts.AttemptError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from None

    return AttemptOut(
        submission_id=submission.id,
        exam=ExamDetail.model_validate(exam),
        answers=submission.answers,
        started_at=submission.started_at,
        deadline=attempts.deadline(submission),
        server_time=now,
    )
