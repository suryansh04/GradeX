import enum
import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import Role

MAX_ANSWER_LENGTH = 20_000


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Auth -------------------------------------------------------------------


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: uuid.UUID
    name: str
    email: str
    role: Role


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --- Exams ------------------------------------------------------------------


class Question(BaseModel):
    question_number: int = Field(ge=1)
    question_text: str = Field(min_length=1)
    marks: float = Field(ge=0)
    image_url: str | None = None


class ExamCreate(BaseModel):
    course_code: str = Field(min_length=1, max_length=50)
    exam_name: str = Field(min_length=1, max_length=200)
    # Null for an untimed exam.
    duration_minutes: int | None = Field(default=None, ge=1, le=600)
    questions: list[Question] = Field(min_length=1)
    answers: list[str]


class ExamSummary(ORMModel):
    id: uuid.UUID
    course_code: str
    exam_name: str
    total_marks: float
    duration_minutes: int | None
    question_count: int
    created_at: datetime


class AttemptStatus(enum.StrEnum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"


class AttemptSummary(BaseModel):
    submission_id: uuid.UUID
    status: AttemptStatus


class ExamListItem(ExamSummary):
    # The current student's attempt; always null for teachers.
    attempt: AttemptSummary | None = None


class ExamDetail(ExamSummary):
    """An exam as shown to a student taking it: model answers are left out."""

    questions: list[Question]


# --- Attempts and submissions -----------------------------------------------


class AttemptOut(BaseModel):
    submission_id: uuid.UUID
    exam: ExamDetail
    answers: list[str]
    started_at: datetime
    # When the attempt must be submitted; null for an untimed exam.
    deadline: datetime | None
    # Lets the client correct for a clock that differs from the server's.
    server_time: datetime


class AnswersIn(BaseModel):
    answers: list[Annotated[str, Field(max_length=MAX_ANSWER_LENGTH)]] = Field(max_length=500)


class SubmitResult(BaseModel):
    submission_id: uuid.UUID
    submitted_at: datetime
    # False when time had run out: the last saved draft was submitted instead.
    answers_accepted: bool


class GradedResponse(BaseModel):
    grade: float
    answer_status: str
    feedback: str
    sample_answer: str
    common_mistake: str
    learning_tip: str
    plagiarism_status: str
    metrics: dict[str, Any]


class SubmissionResult(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    course_code: str
    exam_name: str
    questions: list[Question]
    answers: list[str]
    graded_responses: list[GradedResponse] | None
    score: float | None
    total_marks: float
    submitted_at: datetime


class UploadedImage(BaseModel):
    url: str


# --- Teacher analytics ------------------------------------------------------


class ExamStats(ExamSummary):
    submission_count: int
    graded_count: int
    # Mean score of graded submissions, in marks; null when none are graded.
    average_score: float | None


class StudentSubmissionRow(BaseModel):
    submission_id: uuid.UUID
    student_name: str
    student_email: str
    submitted_at: datetime
    score: float | None


class ExamReport(ExamStats):
    submissions: list[StudentSubmissionRow]
