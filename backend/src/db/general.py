"""
General Database Utilities & Helpers
Provides reusable execution wrappers, connection health verification, and error handling for Supabase PostgREST queries.
"""

from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from supabase import Client


def handle_db_error(exc: Exception, operation: str) -> None:
    """
    Translates PostgREST and Supabase exceptions into appropriate FastAPI HTTPExceptions.
    """
    err_msg = str(exc)
    
    # Check for duplicate key / unique constraint violation
    if "duplicate key" in err_msg or "23505" in err_msg:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict during {operation}: Record already exists.",
        ) from exc
        
    # Check for foreign key constraint violation
    if "foreign key" in err_msg or "23503" in err_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reference during {operation}: Referenced record does not exist.",
        ) from exc

    # Default to 500 error
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Database error during {operation}: {err_msg}",
    ) from exc


def select_one(
    client: Client,
    table: str,
    match_column: str,
    match_value: Any,
) -> Optional[Dict[str, Any]]:
    """
    Generic query helper to fetch a single record from any table matching a given column value.
    Returns None if no matching record is found.
    """
    try:
        response = (
            client.table(table)
            .select("*")
            .eq(match_column, match_value)
            .limit(1)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as exc:
        handle_db_error(exc, f"select_one on '{table}'")
        return None


def select_all(
    client: Client,
    table: str,
    filters: Optional[Dict[str, Any]] = None,
    order_by: Optional[str] = None,
    desc: bool = False,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Generic query helper to fetch multiple records from any table with optional filters and sorting.
    """
    try:
        query = client.table(table).select("*")
        if filters:
            for col, val in filters.items():
                query = query.eq(col, val)
        if order_by:
            query = query.order(order_by, desc=desc)
        if limit:
            query = query.limit(limit)

        response = query.execute()
        return response.data or []
    except Exception as exc:
        handle_db_error(exc, f"select_all on '{table}'")
        return []


def insert_record(
    client: Client,
    table: str,
    record: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generic helper to insert a new record into any table.
    """
    try:
        response = client.table(table).insert(record).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return record
    except Exception as exc:
        handle_db_error(exc, f"insert into '{table}'")
        return {}


def update_record(
    client: Client,
    table: str,
    match_column: str,
    match_value: Any,
    updates: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Generic helper to update records matching a column value.
    """
    try:
        response = (
            client.table(table)
            .update(updates)
            .eq(match_column, match_value)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as exc:
        handle_db_error(exc, f"update on '{table}'")
        return None


def delete_record(
    client: Client,
    table: str,
    match_column: str,
    match_value: Any,
) -> bool:
    """
    Generic helper to delete records matching a column value.
    """
    try:
        client.table(table).delete().eq(match_column, match_value).execute()
        return True
    except Exception as exc:
        handle_db_error(exc, f"delete from '{table}'")
        return False
