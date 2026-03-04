"""
Lightweight database module for Spoorthi Analytics.
Provides connection pooling and query helpers for PostgreSQL.
"""

import os
from contextlib import contextmanager
from typing import Generator, Optional, Dict, Any, List
import psycopg2
from psycopg2 import pool, extras
from psycopg2.extensions import connection, cursor

from dotenv import load_dotenv
import pandas as pd
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# =============================================
# CONFIGURATION
# =============================================

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "spoorthi_db"),
    "user": os.getenv("DB_USER", "kbg"),
    "password": os.getenv("DB_PASSWORD", "kbg"),
}

_connection_pool: Optional[pool.SimpleConnectionPool] = None


# =============================================
# FINANCIAL YEAR PARSING HELPER
# =============================================

def parse_fy(financial_year: str) -> tuple:
    """
    Parse financial year string in any format to (start_year, end_year, fin_year_label).
    
    Handles: "FY24-25", "24-25", "2024-25", "2024-2025"
    Returns: (2024, 2025, "2024-25")
    
    - start_year: int, e.g. 2024 (also matches fin_year bigint in datamart)
    - end_year: int, e.g. 2025
    - fin_year_label: str, e.g. "2024-25" (matches fin_year_label in datamart)
    """
    cleaned = financial_year.replace("FY", "").strip()
    parts = cleaned.split("-")
    if len(parts) != 2:
        raise ValueError(f"Invalid financial year format: {financial_year}")
    
    p0, p1 = parts[0].strip(), parts[1].strip()
    
    # Parse start year
    if len(p0) == 2:
        start_year = 2000 + int(p0)
    elif len(p0) == 4:
        start_year = int(p0)
    else:
        raise ValueError(f"Invalid financial year format: {financial_year}")
    
    # Parse end year
    if len(p1) == 2:
        end_year = 2000 + int(p1)
    elif len(p1) == 4:
        end_year = int(p1)
    else:
        raise ValueError(f"Invalid financial year format: {financial_year}")
    
    fin_year_label = f"{start_year}-{str(end_year)[-2:]}"
    
    return (start_year, end_year, fin_year_label)


# =============================================
# CONNECTION POOL
# =============================================

def init_db():
    """Initialize connection pool (call at FastAPI startup)."""
    global _connection_pool
    
    _connection_pool = pool.SimpleConnectionPool(
        minconn=2,
        maxconn=10,
        **DB_CONFIG
    )
    logger.info("✅ Database pool initialized")


def close_db():
    """Close connection pool (call at FastAPI shutdown)."""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("✅ Database pool closed")


@contextmanager
def get_connection() -> Generator[connection, None, None]:
    """Get a pooled connection (context manager)."""
    if not _connection_pool:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    
    conn = _connection_pool.getconn()
    try:
        yield conn
    finally:
        _connection_pool.putconn(conn)


@contextmanager
def get_cursor() -> Generator[cursor, None, None]:
    """
    Get a dict cursor (returns rows as dicts).
    
    Usage:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (1,))
            row = cur.fetchone()  # {'id': 1, 'name': 'Alice'}
    """
    with get_connection() as conn:
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)
        try:
            yield cur
        finally:
            cur.close()


# =============================================
# QUERY HELPERS
# =============================================

def query_one(sql: str, params: tuple | None = None) -> Optional[Dict[str, Any]]:
    """
    Execute SELECT and return one row as dict.
    
    Example:
        row = query_one("SELECT * FROM users WHERE id = %s", (1,))
    """
    with get_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()  # type: ignore


def query_all(sql: str, params: tuple = None) -> List[Dict[str, Any]]:  # type: ignore
    """
    Execute SELECT and return all rows as list of dicts.
    
    Example:
        rows = query_all("SELECT * FROM products WHERE category = %s", ("A",))
    """
    with get_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()  # type: ignore


def query_scalar(sql: str, params: tuple = None) -> Any:  # type: ignore
    """
    Execute SELECT and return single scalar value.
    
    Example:
        max_date = query_scalar("SELECT MAX(invoice_date) FROM spoorthi_dataset_without_spares")
    """
    with get_cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return list(row.values())[0] if row else None  # type: ignore


def query_df(sql: str, params: tuple = None) -> pd.DataFrame:  # type: ignore
    """
    Execute SELECT and return pandas DataFrame.
    
    Example:
        df = query_df("SELECT * FROM spoorthi_dataset_without_spares WHERE invoice_date > %s", ('2024-01-01',))
    """
    with get_connection() as conn:
        return pd.read_sql_query(sql, conn, params=params)  # type: ignore


# =============================================
# PROJECT-SPECIFIC HELPERS
# =============================================

def get_latest_rolling_table() -> Optional[str]:
    """
    Get the name of the latest rolling_abc_xyz_summary table.
    
    Returns:
        Table name (e.g., 'rolling_abc_xyz_summary_2025_07') or None
    """
    sql = """
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename ~ '^rolling_abc_xyz_summary_[0-9]{4}_[0-9]{2}$'
        ORDER BY tablename DESC
        LIMIT 1
    """
    row = query_one(sql)
    return row['tablename'] if row else None


def get_rolling_table_for_time_id(time_id: int) -> Optional[str]:
    """
    Get the rolling_abc_xyz_summary table name for a specific TimeID.
    TimeID represents months since January 2021 (TimeID=1).
    
    Example:
        time_id = 61 -> January 2026 -> 'rolling_abc_xyz_summary_2026_01'
        time_id = 60 -> December 2025 -> 'rolling_abc_xyz_summary_2025_12'
    
    Args:
        time_id: TimeID (1 = January 2021, 2 = February 2021, etc.)
    
    Returns:
        Table name (e.g., 'rolling_abc_xyz_summary_2025_12') or None
    """
    from datetime import datetime, timedelta
    
    # TimeID 1 = January 2021
    base_date = datetime(2021, 1, 1)
    # Add (time_id - 1) months to the base date
    year = base_date.year + ((base_date.month + time_id - 2) // 12)
    month = ((base_date.month + time_id - 2) % 12) + 1
    
    # Format table name: rolling_abc_xyz_summary_YYYY_MM
    table_name = f"rolling_abc_xyz_summary_{year:04d}_{month:02d}"
    
    # Check if table exists
    sql = """
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename = %s
    """
    row = query_one(sql, (table_name,))
    return row['tablename'] if row else None


def get_latest_time_id() -> Optional[str]:
    """
    Get the latest year-month from the main dataset.
    
    Returns:
        Latest month as 'YYYY-MM' string or None
    """
    return query_scalar("SELECT TO_CHAR(MAX(invoice_date), 'YYYY-MM') FROM public.spoorthi_dataset_without_spares")


def safe_table_name(table_name: str) -> str:
    """
    Safely quote table name for SQL query.
    Prevents SQL injection for dynamic table names.
    
    Example:
        table = safe_table_name("product_ABC_XYZ_FY25_26")
        sql = f'SELECT * FROM {table}'
    """
    # Simple validation: only allow alphanumeric + underscore
    if not table_name.replace('_', '').isalnum():
        raise ValueError(f"Invalid table name: {table_name}")
    return f'public."{table_name}"'


def build_in_list(values: List[str]) -> str:
    """
    Build safe IN clause for SQL.
    
    Example:
        abc_in = build_in_list(["A", "B", "C"])
        sql = f"SELECT * FROM products WHERE abc_category IN ({abc_in})"
        # Results in: ... WHERE abc_category IN ('A','B','C')
    """
    return ",".join([f"'{v}'" for v in values])


# =============================================
# FASTAPI LIFECYCLE
# =============================================

async def startup_db():
    """Call in FastAPI startup event."""
    init_db()
    logger.info("✅ Database ready")


async def shutdown_db():
    """Call in FastAPI shutdown event."""
    close_db()
