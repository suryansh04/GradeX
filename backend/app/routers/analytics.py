"""Results of a teacher's own exams."""

import uuid
from collections import defaultdict
from statistics import mean
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import ColumnElement, select
from sqlalchemy.orm import Session, joinedload

from app.dependencies import DbSession, ExamFromPath, GradingScheduler, TeacherUser
from app.models import Exam, Submission
from app.schemas import ExamReport, ExamStats, ExamSummary, StudentSubmissionRow
from app.services import attempts

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _stats(exam: Exam, submissions: list[Submission]) -> dict[str, Any]:
    scores = [s for s in map(attempts.score, submissions) if s is not None]
    return {
        **ExamSummary.model_validate(exam).model_dump(),
        "submission_count": len(submissions),
        "graded_count": len(scores),
        "average_score": mean(scores) if scores else None,
    }


def _submitted(db: Session, *conditions: ColumnElement[bool]) -> list[Submission]:
    return list(
        db.scalars(
            select(Submission)
            .where(Submission.submitted_at.is_not(None), *conditions)
            .options(joinedload(Submission.student))
            .order_by(Submission.submitted_at.desc())
        )
    )


@router.get("/exams", response_model=list[ExamStats])
def list_exam_stats(
    db: DbSession, teacher: TeacherUser, schedule_grading: GradingScheduler
) -> list[ExamStats]:
    exams = db.scalars(
        select(Exam).where(Exam.created_by == teacher.id).order_by(Exam.created_at.desc())
    ).all()
    exam_ids = [exam.id for exam in exams]
    attempts.finalize_overdue(db, schedule_grading, Submission.exam_id.in_(exam_ids))

    by_exam: defaultdict[uuid.UUID, list[Submission]] = defaultdict(list)
    for submission in _submitted(db, Submission.exam_id.in_(exam_ids)):
        by_exam[submission.exam_id].append(submission)
    return [ExamStats(**_stats(exam, by_exam[exam.id])) for exam in exams]


@router.get("/exams/{exam_id}", response_model=ExamReport)
def get_exam_report(
    exam: ExamFromPath, db: DbSession, teacher: TeacherUser, schedule_grading: GradingScheduler
) -> ExamReport:
    if exam.created_by != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")

    attempts.finalize_overdue(db, schedule_grading, Submission.exam_id == exam.id)
    submissions = _submitted(db, Submission.exam_id == exam.id)
    return ExamReport(
        **_stats(exam, submissions),
        submissions=[
            StudentSubmissionRow(
                submission_id=submission.id,
                student_name=submission.student.name,
                student_email=submission.student.email,
                submitted_at=submission.submitted_at,
                score=attempts.score(submission),
            )
            for submission in submissions
        ],
    )
