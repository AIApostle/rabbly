"""
Auth Page Backend Controller / Router
Located in src.pages.auth per architectural convention.
Provides authentication endpoints (sign in, sign up, password recovery, profile retrieval).
"""

from src.auth.router import auth_router

auth_page_router = auth_router

__all__ = ["auth_page_router", "auth_router"]
