"""
Login Page Backend Controller / Router (Alias to signin)
Located in src.pages.login per modular architectural convention.
"""

from src.pages.signin import signin_page_router as login_page_router, signin_router as login_router

__all__ = ["login_page_router", "login_router"]
