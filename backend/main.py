"""
Rabbly AI Tutor - FastAPI Application
Main root entry point mounting the modular Supabase Authentication system, CORS middleware, and health endpoints.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env in the backend root directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from src.auth import auth_router, get_current_user, UserProfile
from src.sessions import sessions_router

app = FastAPI(
    title="Rabbly AI Tutor API",
    description="Backend API powering Rabbly with modular Supabase Authentication and AI Whiteboard capabilities.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for frontend Vite development server and production origins
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the unified routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint confirming API service status."""
    supabase_configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))
    return {
        "status": "healthy",
        "service": "rabbly-backend",
        "supabase_configured": supabase_configured,
        "version": "0.1.0",
    }


@app.get(
    "/api/auth/protected-example",
    tags=["Authentication"],
    summary="Example protected route requiring valid Bearer token",
)
async def protected_example(current_user: UserProfile = Depends(get_current_user)):
    """Sample protected endpoint to verify Bearer token authentication."""
    return {
        "message": f"Access granted for user {current_user.email} ({current_user.id})",
        "user": current_user,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
