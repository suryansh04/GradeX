import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Role(str, enum.Enum):
    TEACHER = "teacher"
    STUDENT = "student"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="user_role", values_callable=lambda roles: [r.value for r in roles])
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Exam(Base):
    __tablename__ = "exams"
    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_exams_duration_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    course_code: Mapped[str] = mapped_column(String(50))
    exam_name: Mapped[str] = mapped_column(String(200))
    total_marks: Mapped[float] = mapped_column(Float)
    # Time limit for one attempt; null means untimed.
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    # [{question_number, question_text, marks, image_url}]
    questions: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    # Model answers parsed from the teacher's answer sheet, one per question.
    answers: Mapped[list[str]] = mapped_column(ARRAY(Text))
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    @property
    def question_count(self) -> int:
        return len(self.questions)


class Submission(Base):
    """A student's single attempt at an exam: created when they start, finalised on submit."""

    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("student_id", "exam_id", name="uq_submissions_student_exam"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exams.id", ondelete="CASCADE"), index=True
    )
    # The latest saved answers: a draft until submitted_at is set.
    answers: Mapped[list[str]] = mapped_column(ARRAY(Text))
    # Null until the grader has processed the submission.
    graded_responses: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # Null while the attempt is in progress.
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    exam: Mapped[Exam] = relationship()
    student: Mapped[User] = relationship()
