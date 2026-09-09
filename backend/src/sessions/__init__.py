"""
Sessions Package
Re-exports the Recent Sessions Page router from src.pages.recent_sessions for backward compatibility.
"""

from src.pages.recent_sessions import recent_sessions_router as sessions_router

__all__ = ["sessions_router"]
