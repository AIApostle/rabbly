"""
Unified Authentication Router
Combines all modular auth sub-routers into a single APIRouter.
"""

from fastapi import APIRouter

from .signup import router as signup_router
from .signin import router as signin_router
from .forgot_password import router as forgot_password_router
from .reset_password import router as reset_password_router
from .verify_token import router as verify_token_router
from .profile import router as profile_router

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# Include modular endpoints
auth_router.include_router(signup_router)
auth_router.include_router(signin_router)
auth_router.include_router(forgot_password_router)
auth_router.include_router(reset_password_router)
auth_router.include_router(verify_token_router)
auth_router.include_router(profile_router)
