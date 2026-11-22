import uuid

from fastapi import APIRouter, HTTPException, Request, UploadFile, status

from app.config import get_settings
from app.dependencies import TeacherUser
from app.schemas import UploadedImage

router = APIRouter(prefix="/uploads", tags=["uploads"])

_IMAGE_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


@router.post("/images", response_model=UploadedImage, status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile, request: Request, _: TeacherUser) -> UploadedImage:
    settings = get_settings()

    extension = _IMAGE_EXTENSIONS.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PNG, JPEG, GIF and WebP images are allowed.",
        )

    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Images must be at most {settings.max_upload_bytes // (1024 * 1024)} MB.",
        )

    # The stored name is generated, never taken from the client.
    filename = f"{uuid.uuid4()}{extension}"
    (settings.upload_dir / filename).write_bytes(content)

    return UploadedImage(url=str(request.url_for("media", path=filename)))
