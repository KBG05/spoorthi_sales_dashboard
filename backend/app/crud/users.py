"""CRUD operations for user management."""

from typing import Optional
from datetime import datetime
from app.database import get_connection
from app.schemas import UserInDB, UserCreate
from app.auth.utils import get_password_hash


def get_user_by_username(username: str) -> Optional[UserInDB]:
    """
    Fetch user from database by username.
    
    Args:
        username: The username to search for
        
    Returns:
        UserInDB object if found, None otherwise
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, username, hashed_password, role, created_at, updated_at
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


def get_user_by_id(user_id: int) -> Optional[UserInDB]:
    """
    Fetch user from database by ID.
    
    Args:
        user_id: The user ID to search for
        
    Returns:
        UserInDB object if found, None otherwise
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, username, hashed_password, role, created_at, updated_at
            FROM users
            WHERE id = %s
            """,
            (user_id,),
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


def create_user(user_data: UserCreate) -> UserInDB:
    """
    Create a new user in the database.
    
    Args:
        user_data: UserCreate object containing username and password
        
    Returns:
        UserInDB object of the created user
        
    Raises:
        Exception: If user creation fails
    """
    hashed_password = get_password_hash(user_data.password)
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (username, hashed_password, role, created_at, updated_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, username, hashed_password, role
            """,
            (user_data.username, hashed_password, user_data.role),
        )
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        if result:
            return UserInDB(
                id=result[0],
                username=result[1],
                hashed_password=result[2],
                role=result[3],
            )
        raise Exception("Failed to create user")


def update_user_password(username: str, new_hashed_password: str) -> bool:
    """
    Update user password in the database.
    
    Args:
        username: The username of the user
        new_hashed_password: The new hashed password
        
    Returns:
        True if update was successful, False otherwise
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET hashed_password = %s, updated_at = CURRENT_TIMESTAMP
            WHERE username = %s
            """,
            (new_hashed_password, username),
        )
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0


def delete_user(username: str) -> bool:
    """
    Delete a user from the database.
    
    Args:
        username: The username of the user to delete
        
    Returns:
        True if deletion was successful, False otherwise
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            DELETE FROM users
            WHERE username = %s
            """,
            (username,),
        )
        rows_affected = cursor.rowcount
        conn.commit()
        cursor.close()
        return rows_affected > 0


def user_exists(username: str) -> bool:
    """
    Check if a user exists in the database.
    
    Args:
        username: The username to check
        
    Returns:
        True if user exists, False otherwise
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COUNT(*) FROM users WHERE username = %s
            """,
            (username,),
        )
        result = cursor.fetchone()
        cursor.close()
        return result[0] > 0 if result else False
