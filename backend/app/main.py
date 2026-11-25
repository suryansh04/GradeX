from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import analytics, auth, exams, submissions, uploads

settings = get_settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="GradeX API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(exams.router)
app.include_router(submissions.router)
app.include_router(uploads.router)
app.include_router(analytics.router)

app.mount("/media", StaticFiles(directory=settings.upload_dir), name="media")


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
