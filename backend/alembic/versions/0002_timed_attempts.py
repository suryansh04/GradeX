"""Timed exams and one attempt per student.

Adds an optional time limit to exams. A submission now represents an attempt:
it is created when the student starts (started_at) and finalised on submit
(submitted_at, null while in progress). Each student gets one attempt per exam.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("exams", sa.Column("duration_minutes", sa.Integer(), nullable=True))
    op.create_check_constraint("ck_exams_duration_positive", "exams", "duration_minutes > 0")

    op.add_column(
        "submissions",
        sa.Column(
            "started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    # Existing submissions were created at submit time, so that is also when they started.
    op.execute("UPDATE submissions SET started_at = submitted_at")
    op.alter_column("submissions", "submitted_at", nullable=True, server_default=None)

    # Fails if a student already has several submissions for one exam; resolve those first.
    op.create_unique_constraint(
        "uq_submissions_student_exam", "submissions", ["student_id", "exam_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_submissions_student_exam", "submissions", type_="unique")
    op.execute("DELETE FROM submissions WHERE submitted_at IS NULL")
    op.alter_column(
        "submissions", "submitted_at", nullable=False, server_default=sa.func.now()
    )
    op.drop_column("submissions", "started_at")
    op.drop_constraint("ck_exams_duration_positive", "exams", type_="check")
    op.drop_column("exams", "duration_minutes")
