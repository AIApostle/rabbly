"""
Signup Page Backend Controller / Router
Located in src.pages.signup per modular architectural convention.
"""

from src.auth.signup import router as signup_page_router, router as signup_router

__all__ = ["signup_page_router", "signup_router"]
