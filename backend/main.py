import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from config import get_settings
from api.routes import api_router
from middleware.cors_middleware import add_cors_middleware
from api.dependencies import get_session_storage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()

# Background task for session cleanup
async def session_cleanup_task():
    logger.info("Starting background session cleanup task.")
    session_storage = get_session_storage()
    while True:
        try:
            # Sleep for the cleanup interval
            await asyncio.sleep(settings.cleanup_interval_minutes * 60)
            logger.info("Running session cleanup...")
            session_storage.cleanup_expired_sessions()
        except asyncio.CancelledError:
            logger.info("Session cleanup task cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in session cleanup task: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the background cleanup task
    cleanup_task = asyncio.create_task(session_cleanup_task())
    yield
    # Shutdown: Cancel the cleanup task
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    logger.info("Application shutdown complete.")

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description=settings.app_description,
    lifespan=lifespan
)

# Setup CORS
add_cors_middleware(app)

# Include API Router
app.include_router(api_router, prefix="/api")

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": settings.app_version}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
