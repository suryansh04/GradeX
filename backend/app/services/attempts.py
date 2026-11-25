"""Rules for exam attempts: deadlines, saving answers, and submitting.

A Submission row is one student's single attempt at an exam. It is created when
the student starts, holds their latest saved answers, and is finalised once:
when the student submits, or automatically after a timed exam's deadline.
"""

import uuid
from collections.abc import Callable, Iterable
from datetime import UTC, datetime, timedelta

from sqlalchemy import ColumnElement, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, contains_eager

from app.config import get_settings
from app.models import Exam, Submission

# Called with a submission id once it is final, to queue it for grading.
ScheduleGrading = Callable[[uuid.UUID], None]


class AttemptError(Exception):
    """An attempt cannot be changed; the message is safe to show to the student."""


class AttemptAlreadySubmitted(AttemptError):
    def __init__(self) -> None:
        super().__init__("You have already submitted this exam.")


class AttemptTimeExpired(AttemptError):
    def __init__(self) -> None:
        super().__init__("Time is up for this exam. Your last saved answers were submitted.")


def utc_now() -> datetime:
    return datetime.now(UTC)


def deadline(submission: Submission) -> datetime | None:
    minutes = submission.exam.duration_minutes
    return submission.started_at + timedelta(minutes=minutes) if minutes else None


def _grace() -> timedelta:
    return timedelta(seconds=get_settings().submission_grace_seconds)


def _accepts_answers(submission: Submission, now: datetime) -> bool:
    due = deadline(submission)
    return due is None or now <= due + _grace()


def _finalize(submission: Submission, now: datetime) -> None:
    due = deadline(submission)
    submission.submitted_at = min(now, due) if due else now


def start_or_resume(db: Session, exam: Exam, student_id: uuid.UUID, now: datetime) -> Submission:
    """Returns the student's open attempt, creating it on first start."""
    submission = db.scalar(
        select(Submission).where(Submission.exam_id == exam.id, Submission.student_id == student_id)
    )
    if submission is None:
        submission = Submission(
            exam=exam,
            student_id=student_id,
            answers=[""] * exam.question_count,
            started_at=now,
        )
        db.add(submission)
        try:
            db.commit()
        except IntegrityError:
            # Started twice at once (e.g. a double click): use the attempt that won.
            db.rollback()
            return start_or_resume(db, exam, student_id, now)
        return submission

    if submission.submitted_at is not None:
        raise AttemptAlreadySubmitted()
    if not _accepts_answers(submission, now):
        raise AttemptTimeExpired()
    return submission


def save_answers(submission: Submission, answers: list[str], now: datetime) -> None:
    """Saves a draft. Raises AttemptError if the attempt is closed."""
    if submission.submitted_at is not None:
        raise AttemptAlreadySubmitted()
    if not _accepts_answers(submission, now):
        raise AttemptTimeExpired()
    submission.answers = answers


def submit(submission: Submission, answers: list[str], now: datetime) -> bool:
    """Finalises the attempt. Returns False if time had run out, in which case the
    last saved draft is submitted instead of `answers`."""
    if submission.submitted_at is not None:
        raise AttemptAlreadySubmitted()
    accepted = _accepts_answers(submission, now)
    if accepted:
        submission.answers = answers
    _finalize(submission, now)
    return accepted


def finalize_overdue(
    db: Session,
    schedule_grading: ScheduleGrading,
    *conditions: ColumnElement[bool],
    now: datetime | None = None,
) -> None:
    """Submits in-progress timed attempts whose deadline (plus grace) has passed,
    e.g. a student who closed the tab. `conditions` narrow which attempts to check."""
    now = now or utc_now()
    in_progress: Iterable[Submission] = db.scalars(
        select(Submission)
        .join(Submission.exam)
        .options(contains_eager(Submission.exam))  # deadline() needs the exam: no extra queries
        .where(
            Submission.submitted_at.is_(None),
            Exam.duration_minutes.is_not(None),
            *conditions,
        )
    )
    finalized = [s for s in in_progress if not _accepts_answers(s, now)]
    for submission in finalized:
        _finalize(submission, now)
    if finalized:
        db.commit()
        for submission in finalized:
            schedule_grading(submission.id)


def score(submission: Submission) -> float | None:
    if submission.graded_responses is None:
        return None
    return sum(response["grade"] for response in submission.graded_responses)
