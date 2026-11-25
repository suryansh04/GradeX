import uuid
from typing import Annotated

from fastapi import BackgroundTasks, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.grading.service import grade_submission
from app.models import Exam, Role, Submission, User
from app.security import decode_access_token
from app.services.attempts import ScheduleGrading

DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def _require_role(role: Role):
    def dependency(user: CurrentUser) -> User:
        if user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Only {role.value}s can do this.",
            )
        return user

    return dependency


TeacherUser = Annotated[User, Depends(_require_role(Role.TEACHER))]
StudentUser = Annotated[User, Depends(_require_role(Role.STUDENT))]


def get_exam(exam_id: uuid.UUID, db: DbSession) -> Exam:
    exam = db.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")
    return exam


ExamFromPath = Annotated[Exam, Depends(get_exam)]


def get_own_submission(submission_id: uuid.UUID, db: DbSession, student: StudentUser) -> Submission:
    submission = db.get(Submission, submission_id)
    # Someone else's submission is reported as missing, not forbidden, so ids are not probeable.
    if submission is None or submission.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    return submission


OwnSubmission = Annotated[Submission, Depends(get_own_submission)]


def get_grading_scheduler(background_tasks: BackgroundTasks) -> ScheduleGrading:
    """Grades submissions after the response is sent, since grading takes a while."""

    def schedule(submission_id: uuid.UUID) -> None:
        background_tasks.add_task(grade_submission, submission_id)

    return schedule


GradingScheduler = Annotated[ScheduleGrading, Depends(get_grading_scheduler)]
