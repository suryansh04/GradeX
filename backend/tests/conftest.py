"""Test setup. Requires a disposable Postgres database in TEST_DATABASE_URL:
every test empties its tables.

    TEST_DATABASE_URL=postgresql+psycopg://postgres:PASSWORD@localhost:5432/gradex_test pytest
"""

import os
import tempfile
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest

if "TEST_DATABASE_URL" not in os.environ:
    pytest.exit("Set TEST_DATABASE_URL to a disposable Postgres database.", returncode=2)

# Configure the app before it is imported.
os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
os.environ["JWT_SECRET"] = "test-secret-" + "x" * 32
os.environ["ANTHROPIC_API_KEY"] = "test-key"
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="gradex-uploads-")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.dependencies import get_grading_scheduler  # noqa: E402
from app.main import app  # noqa: E402
from app.services import attempts  # noqa: E402
from tests.helpers import auth_headers  # noqa: E402

@pytest.fixture(scope="session", autouse=True)
def _schema() -> Iterator[None]:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def _empty_tables() -> None:
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE users, exams, submissions CASCADE"))


@pytest.fixture
def graded() -> list[uuid.UUID]:
    """Ids of submissions queued for grading during the test."""
    return []


@pytest.fixture
def client(graded: list[uuid.UUID]) -> Iterator[TestClient]:
    app.dependency_overrides[get_grading_scheduler] = lambda: graded.append
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class Clock:
    """Stands in for the current time in attempt rules."""

    def __init__(self) -> None:
        self.now = datetime(2026, 1, 1, 9, 0, tzinfo=UTC)

    def advance(self, **delta: float) -> None:
        self.now += timedelta(**delta)


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> Clock:
    fake = Clock()
    monkeypatch.setattr(attempts, "utc_now", lambda: fake.now)
    return fake


@pytest.fixture
def teacher(client: TestClient) -> dict[str, str]:
    return auth_headers(client, "teacher")


@pytest.fixture
def student(client: TestClient) -> dict[str, str]:
    return auth_headers(client, "student", "Rohan")
