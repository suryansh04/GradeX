<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/banner-light.svg">
  <img alt="GradeX: set an exam, collect the answers, and get every answer graded and explained" src=".github/assets/banner-dark.svg" width="100%">
</picture>

<br>

![JavaScript](https://img.shields.io/badge/JavaScript-ES_modules-20232a?style=flat-square&logo=javascript&logoColor=f7df1e)
![FastAPI](https://img.shields.io/badge/FastAPI-009485?style=flat-square&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169e1?style=flat-square&logo=postgresql&logoColor=white)
![SQLAlchemy 2](https://img.shields.io/badge/SQLAlchemy-2-d71f00?style=flat-square&logo=sqlalchemy&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-Anthropic-d97757?style=flat-square)
![spaCy](https://img.shields.io/badge/spaCy-09a3d5?style=flat-square&logo=spacy&logoColor=white)
![BERT](https://img.shields.io/badge/BERT-Transformers-ffcc4d?style=flat-square&logo=huggingface&logoColor=black)
![scikit-learn](https://img.shields.io/badge/scikit--learn-f7931e?style=flat-square&logo=scikitlearn&logoColor=white)

**[How it works](#how-it-works)** · **[Run locally](#run-locally)**

</div>

<br>

GradeX turns a written exam into graded, explained feedback. A teacher sets the questions and uploads a model answer sheet; students answer one question at a time; and when a student finishes, GradeX scores every answer against the model answer, checks it for plagiarism, and asks Claude for feedback, the correct answer, a common mistake to avoid and a learning tip.

## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Build an exam in minutes</h3>
      Write each question, give it marks and, if it needs one, an image. The total updates as you type. Then upload the model answer sheet as a PDF: GradeX reads it in the browser and matches each answer to its question.
    </td>
    <td width="50%" valign="top">
      <h3>One question at a time</h3>
      Students pick an exam from their portal and answer it question by question, with any image shown alongside. The model answers never reach the student's browser; they stay on the server until grading.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Grading that explains itself</h3>
      Every answer is scored on nine measures of how close it is to the model answer, from keyword overlap to BERT embeddings. Those scores set the grade, and Claude reads the answer to give it a status: Correct, Partially Correct, Partially Incorrect or Incorrect.
    </td>
    <td width="50%" valign="top">
      <h3>Results you can learn from</h3>
      The Results tab shows each question next to the student's answer, with a card for the grade, the status, the plagiarism check and the feedback. Swipe the card for the correct answer, a common mistake and a learning tip.
    </td>
  </tr>
</table>

Also: separate teacher and student accounts, a password strength meter at sign-up, a plagiarism check on every answer (copied answers score zero), and grading that carries on in the background while the student moves on.

## How it works

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/architecture-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/architecture-light.svg">
  <img alt="How GradeX works: the teacher and student portals call the FastAPI backend with a login token; the API stores users, exams and submissions in PostgreSQL and question images on local disk; after each submission a background grader scores every answer, checks it for plagiarism, and asks Claude Opus 5.5 for the grade, status, feedback, correct answer, common mistake and learning tip" src=".github/assets/architecture-light.svg" width="100%">
</picture>

1. **Set.** The teacher writes the questions and marks, and adds images, which upload to the API and are stored on disk. The model answer sheet is read in the browser with pdf.js and split on its numbering (`A1)`, `A2)`, …). The API checks that there is one answer per question, works out the total marks, and saves the exam in Postgres.
2. **Take.** A student opens an exam and gets the questions without the model answers. When they finish, the answers go to the API in one request. The API checks there is an answer for every question, saves the submission and replies straight away.
3. **Grade.** Grading starts in the background. For each answer, nine measures (TF-IDF cosine similarity, keyword and key-phrase overlap, spaCy similarity, BERT embedding similarity, length, sentence count, readability and discourse markers) are weighted into a provisional grade. A plagiarism check compares word sequences with the model answer, and an answer flagged as copied scores zero. Otherwise Claude Opus 5.5 gets the question, both answers, the measures and the provisional grade, and returns the final grade, the status, feedback, the correct answer, a common mistake and a learning tip.
4. **Review.** Results are saved with the submission, and the student's Results tab shows every graded exam, question by question.

Grading runs one submission at a time, because the language models are large and share memory. If the server stops part-way, `python -m app.grading` grades whatever was left.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | HTML, CSS, JavaScript (ES modules), pdf.js, Splide, Font Awesome, Poppins, check-password-strength |
| Backend | FastAPI, Pydantic, SQLAlchemy 2, Alembic, Python 3.12 |
| Auth | Argon2 password hashing (pwdlib), JWT bearer tokens (PyJWT) |
| Data | PostgreSQL (psycopg 3), question images on local disk |
| Grading | Claude Opus 5.5 (Anthropic Python SDK), spaCy, BERT (Hugging Face Transformers, PyTorch), scikit-learn, NLTK, textstat |

## Run locally

**You need:** Python 3.12+, PostgreSQL 14+, Node.js (for the password strength meter), an [Anthropic API key](https://console.anthropic.com), and a static file server such as VS Code's Live Server.

**1. Database.** Create an empty database:

```bash
psql -U postgres -c "CREATE DATABASE gradex;"
```

**2. Backend.**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m nltk.downloader punkt punkt_tab
cp .env.example .env              # fill in the values below
alembic upgrade head              # creates the tables
uvicorn app.main:app --reload     # http://localhost:8000, API docs at /docs
```

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | The Postgres connection, e.g. `postgresql+psycopg://postgres:PASSWORD@localhost:5432/gradex` |
| `JWT_SECRET` | A long random string that signs login tokens: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (server only, never in the frontend) |
| `CORS_ORIGINS` | Optional. Sites allowed to call the API, as a JSON list. Defaults to Live Server on port 5501 |
| `CLAUDE_MODEL` | Optional. The model that writes feedback. Defaults to `claude-opus-5-5` |

**3. Frontend.**

```bash
npm install                       # from the repository root
```

Serve the repository root with Live Server (port 5501, set in `.vscode/settings.json`) and open `login/login.html`. The API URL is in [`lib/config.js`](lib/config.js).

To change the database, edit `backend/app/models.py`, then run `alembic revision --autogenerate -m "describe the change"` and `alembic upgrade head`.

## Project structure

```
backend/
  app/
    main.py             the FastAPI app, CORS, and the /media file server
    models.py           users, exams, submissions
    routers/            auth, exams, uploads, submissions
    grading/            grader (measures, plagiarism check, Claude) and the grading job
  alembic/              database migrations
lib/
  api.js                API client shared by every page: login token, errors, session check
login/  signup/         sign-in and sign-up pages
TeacherPortal/          create exams and upload the answer sheet
studentPortal/          exam list and results
examPortal/             answer an exam one question at a time
```

## License

Copyright © 2026 Suryansh Pratap Singh. All rights reserved. The source is public to read; it is not licensed for reuse.
