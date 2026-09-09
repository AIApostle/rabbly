"""
Backend Pages Package
Organizes page-level backend controllers and API routers.
"""

from .recent_sessions import recent_sessions_router
from .auth import auth_page_router
from .sprints import sprints_router
from .classrooms import classrooms_router

__all__ = [
    "recent_sessions_router",
    "auth_page_router",
    "sprints_router",
    "classrooms_router",
]
