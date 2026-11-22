"""Grades all ungraded submissions: python -m app.grading"""

import logging

from app.grading.service import grade_pending_submissions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
grade_pending_submissions()
