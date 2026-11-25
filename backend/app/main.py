from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import analytics, auth, exams, submissions, uploads
from app.services.attempts import AttemptError

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


@app.exception_handler(AttemptError)
def attempt_conflict(_request: Request, error: AttemptError) -> JSONResponse:
    """An attempt that can no longer change (already submitted, time up) is a 409."""
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(error)})


app.mount("/media", StaticFiles(directory=settings.upload_dir), name="media")


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
