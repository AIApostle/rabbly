"""
Forgot Password Page Backend Controller / Router
Located in src.pages.forgot_password per modular architectural convention.
"""

from src.auth.forgot_password import (
    router as forgot_password_page_router,
    router as forgot_password_router,
)

__all__ = ["forgot_password_page_router", "forgot_password_router"]
