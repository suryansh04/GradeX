import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import Role


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
    questions: list[Question] = Field(min_length=1)
    answers: list[str]


class ExamSummary(ORMModel):
    id: uuid.UUID
    course_code: str
    exam_name: str


class ExamDetail(ExamSummary):
    """An exam as shown to a student taking it: model answers are left out."""

    total_marks: float
    questions: list[Question]


# --- Submissions ------------------------------------------------------------


class SubmissionCreate(BaseModel):
    exam_id: uuid.UUID
    answers: list[str]


class SubmissionCreated(ORMModel):
    id: uuid.UUID


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
    submitted_at: datetime


class UploadedImage(BaseModel):
    url: str
