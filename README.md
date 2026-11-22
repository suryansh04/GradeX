# GradeX

Teachers create exams; students take them and get AI-assisted grades and feedback.

- **Frontend**: static HTML/CSS/JS pages (`login/`, `signup/`, `TeacherPortal/`, `studentPortal/`, `examPortal/`), talking to the API through `lib/api.js`.
- **Backend**: FastAPI + PostgreSQL in `backend/`. Grading (NLP similarity metrics, a plagiarism check and Claude feedback) runs in the background after each submission.

## Prerequisites

- Python 3.12+
- PostgreSQL 14+ running locally
- Node.js (only for the `check-password-strength` package used by the signup page)
- An Anthropic API key

## Backend setup

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE gradex;"

cd backend

# 2. Install dependencies
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m nltk.downloader punkt punkt_tab

# 3. Configure: copy the template and fill in DATABASE_URL, JWT_SECRET and ANTHROPIC_API_KEY
copy .env.example .env          # macOS/Linux: cp .env.example .env

# 4. Create the tables
alembic upgrade head

# 5. Run the API (http://localhost:8000, interactive docs at /docs)
uvicorn app.main:app --reload
```

If the server stops while submissions are being graded, grade whatever is left with:

```bash
python -m app.grading
```

## Frontend setup

```bash
npm install
```

Serve the repository root with VS Code's Live Server (port 5501, configured in `.vscode/settings.json`) and open `login/login.html`.

The API URL is set in `lib/config.js`. If you serve the frontend from another origin, add it to `CORS_ORIGINS` in `backend/.env`.

## Database migrations

After changing `backend/app/models.py`:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```
