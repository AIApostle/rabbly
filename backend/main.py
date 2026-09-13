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

import logging

# Configure structured logging with timestamp and level
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from src.auth import get_current_user, UserProfile
from src.pages.auth import auth_page_router
from src.pages.recent_sessions import recent_sessions_router
from src.pages.sprints import sprints_router
from src.pages.classrooms import classrooms_router
from src.pages.curriculum import curriculum_router
from src.connection import connection_router

app = FastAPI(
    title="Rabbly AI Tutor API",
    description="Backend API powering Rabbly with modular Supabase Authentication and AI Whiteboard capabilities.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for frontend Vite development server and production origins
cors_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,https://rabbly.onrender.com,https://rabbly.vercel.app",
)
origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.onrender\.com|.*\.vercel\.app)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount page routers under /api
app.include_router(auth_page_router, prefix="/api")
app.include_router(recent_sessions_router, prefix="/api")
app.include_router(sprints_router, prefix="/api")
app.include_router(classrooms_router, prefix="/api")
app.include_router(curriculum_router, prefix="/api")

# Mount Live Dual WebSocket router
app.include_router(connection_router)
app.include_router(connection_router, prefix="/api")


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
