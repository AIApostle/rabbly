"""
Sessions Router
Re-exports the Recent Sessions router from src.pages.recent_sessions.
"""

from src.pages.recent_sessions import recent_sessions_router, recent_sessions_router as sessions_router

__all__ = ["recent_sessions_router", "sessions_router"]
