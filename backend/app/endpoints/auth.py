"""Authentication endpoints."""

from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.database import get_connection
from app.schemas import Token, User, UserInDB, PasswordChange
from app.auth.utils import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_user_from_db(username: str) -> UserInDB | None:
    """Fetch user from database by username."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, username, hashed_password, role
            FROM users
            WHERE username = %s
            """,
            (username,),
        )
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return UserInDB(
                id=result[0],
                username=result[1],
                hashed_password=result[2],
                role=result[3],
            )
        return None


def authenticate_user(username: str, password: str) -> UserInDB | None:
    """Authenticate a user by username and password."""
    user = get_user_from_db(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    username = decode_access_token(token)
    if username is None:
        raise credentials_exception
    
    user = get_user_from_db(username)
    if user is None:
        raise credentials_exception
    
    return User(id=user.id, username=user.username, role=user.role)


@router.post("/login", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Login endpoint - returns JWT token."""
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Change password for the current user."""
    # Verify current password
    user_in_db = get_user_from_db(current_user.username)
    if not user_in_db or not verify_password(password_data.current_password, user_in_db.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )
    
    # Update password
    new_hashed_password = get_password_hash(password_data.new_password)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET hashed_password = %s, updated_at = CURRENT_TIMESTAMP
            WHERE username = %s
            """,
            (new_hashed_password, current_user.username),
        )
        conn.commit()
        cursor.close()
    
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: Annotated[User, Depends(get_current_user)]):
    """Get current user information."""
    return current_user
