"""
Re-export FastAPI app from root main.py for backwards compatibility.
"""

from main import app

__all__ = ["app"]
