"""
Reset Password Page Backend Controller / Router
Located in src.pages.reset_password per modular architectural convention.
"""

from src.auth.reset_password import (
    router as reset_password_page_router,
    router as reset_password_router,
)

__all__ = ["reset_password_page_router", "reset_password_router"]
