"""
Backend Pages Package
Organizes page-level backend controllers and API routers.
"""

from .recent_sessions import recent_sessions_router
from .auth import auth_page_router
from .sprints import sprints_router
from .classrooms import classrooms_router
from .signup import signup_page_router
from .signin import signin_page_router
from .login import login_page_router
from .forgot_password import forgot_password_page_router
from .reset_password import reset_password_page_router

__all__ = [
    "recent_sessions_router",
    "auth_page_router",
    "sprints_router",
    "classrooms_router",
    "signup_page_router",
    "signin_page_router",
    "login_page_router",
    "forgot_password_page_router",
    "reset_password_page_router",
]
