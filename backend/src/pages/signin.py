"""
Signin Page Backend Controller / Router
Located in src.pages.signin per modular architectural convention.
"""

from src.auth.signin import router as signin_page_router, router as signin_router

__all__ = ["signin_page_router", "signin_router"]


