"""Loads submissions from the database, grades them, and stores the results."""

import logging
import threading
import uuid

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Submission
from app.services.attempts import finalize_overdue

logger = logging.getLogger(__name__)

# Grading is CPU-heavy and shares the NLP models, so run one grading at a time.
_grading_lock = threading.Lock()


def grade_submission(submission_id: uuid.UUID) -> None:
    """Grades one submission. Safe to call again: graded submissions are skipped."""
    # Imported here so the API starts without loading the NLP stack.
    from app.grading.grader import grade_answer

    with _grading_lock:
        # Read what is needed and release the connection before the slow grading step.
        with SessionLocal() as db:
            submission = db.get(Submission, submission_id)
            if (
                submission is None
                or submission.submitted_at is None
                or submission.graded_responses is not None
            ):
                return
            exam = submission.exam
            questions = exam.questions
            sample_answers = exam.answers
            student_answers = submission.answers

        logger.info("Grading submission %s", submission_id)
        try:
            graded_responses = [
                grade_answer(
                    question=question["question_text"],
                    sample_answer=sample_answer,
                    student_answer=student_answer,
                    max_marks=question["marks"],
                )
                for question, sample_answer, student_answer in zip(
                    questions, sample_answers, student_answers, strict=True
                )
            ]
        except Exception:
            logger.exception("Failed to grade submission %s", submission_id)
            return

        with SessionLocal() as db:
            submission = db.get(Submission, submission_id)
            if submission is not None:
                submission.graded_responses = graded_responses
                db.commit()
        logger.info("Finished grading submission %s", submission_id)


def grade_pending_submissions() -> None:
    """Grades every submitted attempt that has no results yet (e.g. after a server
    restart), first submitting timed attempts whose deadline has passed."""
    with SessionLocal() as db:
        # Not scheduled one by one: the query below picks them up.
        finalize_overdue(db, lambda _submission_id: None)
        pending_ids = list(
            db.scalars(
                select(Submission.id)
                .where(
                    Submission.submitted_at.is_not(None),
                    Submission.graded_responses.is_(None),
                )
                .order_by(Submission.submitted_at)
            )
        )

    logger.info("Found %d ungraded submissions", len(pending_ids))
    for submission_id in pending_ids:
        grade_submission(submission_id)
