"""
File storage abstraction for product images (and any other uploads).

WHY: Keeps upload endpoints decoupled from *where* the file physically lands.
Today it saves to local disk (UPLOAD_DIR, served via /uploads static mount).
To move to Cloudinary / S3 / Cloudflare R2 in production:

  1. Implement a new class inheriting StorageBackend (see stubs below).
  2. Point get_storage_backend() at it based on an env var (e.g. STORAGE_BACKEND).
  3. No other code changes needed — routers only call `storage.save(file)`.
"""
import os
import uuid
from abc import ABC, abstractmethod
from fastapi import UploadFile, HTTPException
from app.core.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


class StorageBackend(ABC):
    @abstractmethod
    def save(self, file: UploadFile, subfolder: str = "products") -> str:
        """Persist file, return a publicly accessible URL/path."""
        ...


class LocalStorageBackend(StorageBackend):
    def save(self, file: UploadFile, subfolder: str = "products") -> str:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        contents = file.file.read()
        if len(contents) > MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File too large (max {settings.MAX_UPLOAD_SIZE_MB}MB)",
            )
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        # SECURITY: never trust the client-supplied Content-Type header alone —
        # it's trivial to relabel a malicious file (e.g. an HTML/SVG payload or
        # a webshell) as "image/png". Decode the actual bytes with Pillow and
        # re-verify it's a genuine, decodable image before writing it to disk.
        try:
            from PIL import Image
            import io

            img = Image.open(io.BytesIO(contents))
            img.verify()
        except Exception:
            raise HTTPException(status_code=400, detail="File is not a valid image")

        ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            ext = ".jpg"

        # Never trust the client-supplied filename for the on-disk path —
        # always generate our own random name to prevent path traversal
        # (e.g. "../../etc/passwd") or overwriting other users' files.
        filename = f"{uuid.uuid4().hex}{ext}"
        folder = os.path.join(settings.UPLOAD_DIR, subfolder)
        os.makedirs(folder, exist_ok=True)
        filepath = os.path.join(folder, filename)
        with open(filepath, "wb") as f:
            f.write(contents)

        return f"/uploads/{subfolder}/{filename}"


class CloudinaryStorageBackend(StorageBackend):
    """STUB — install `cloudinary` SDK and configure CLOUDINARY_URL to use."""

    def save(self, file: UploadFile, subfolder: str = "products") -> str:
        raise NotImplementedError("Configure Cloudinary credentials and implement upload here.")


class S3StorageBackend(StorageBackend):
    """STUB — install `boto3` and configure AWS_* / R2 env vars to use."""

    def save(self, file: UploadFile, subfolder: str = "products") -> str:
        raise NotImplementedError("Configure boto3 client and implement upload here.")


def get_storage_backend() -> StorageBackend:
    backend = os.getenv("STORAGE_BACKEND", "local").lower()
    if backend == "cloudinary":
        return CloudinaryStorageBackend()
    if backend in ("s3", "r2"):
        return S3StorageBackend()
    return LocalStorageBackend()


storage = get_storage_backend()
