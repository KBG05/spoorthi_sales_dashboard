"""
Upload Endpoint

Accepts an Excel or CSV file and forwards it to the configured external processor.
Only accessible to users with role='upload'.

Set the target URL via the UPLOAD_TARGET_URL environment variable.
Default: http://localhost:9000/file
"""

import os
import httpx
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
from ..schemas import User
from ..endpoints.auth import get_current_user

# Target URL for the external file processor — override via environment variable
UPLOAD_TARGET_URL = os.getenv("UPLOAD_TARGET_URL", "http://127.0.0.1:9000/upload-and-run")

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv", ".xlsm", ".xlsb"}

router = APIRouter(prefix="/upload", tags=["Upload"])


def require_upload_role(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: only users with role='upload' may access upload endpoints."""
    if current_user.role != "upload":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Upload access requires the 'upload' role.",
        )
    return current_user


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_upload_role),
):
    """
    Accept an Excel or CSV file and forward it to the external processor endpoint.

    - Requires role='upload'.
    - Accepted extensions: .xlsx, .xls, .csv, .xlsm, .xlsb
    - The file is forwarded as multipart/form-data to UPLOAD_TARGET_URL.
    """
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unsupported file type '{ext or '(none)'}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                UPLOAD_TARGET_URL,
                files={
                    "file": (
                        filename,
                        contents,
                        file.content_type or "application/octet-stream",
                    )
                },
            )
        return JSONResponse(
            status_code=response.status_code,
            content={"detail": response.text or "File forwarded successfully."},
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not connect to the upload processor at {UPLOAD_TARGET_URL}.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Upload processor did not respond in time.",
        )
