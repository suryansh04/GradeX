import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession, TeacherUser
from app.models import Exam
from app.schemas import ExamCreate, ExamDetail, ExamSummary

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=list[ExamSummary])
def list_exams(db: DbSession, _: CurrentUser) -> list[Exam]:
    return list(db.scalars(select(Exam).order_by(Exam.created_at.desc())))


@router.get("/{exam_id}", response_model=ExamDetail)
def get_exam(exam_id: uuid.UUID, db: DbSession, _: CurrentUser) -> Exam:
    exam = db.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")
    return exam


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
        total_marks=sum(question.marks for question in body.questions),
        questions=[question.model_dump() for question in body.questions],
        answers=body.answers,
        created_by=teacher.id,
    )
    db.add(exam)
    db.commit()
    return exam
