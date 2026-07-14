from fastapi import FastAPI

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.health import router as health_router
from app.api.routes.transactions import router as transactions_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    api = FastAPI(title=settings.app_name)
    api.add_middleware(RequestContextMiddleware)
    api.include_router(health_router)
    api.include_router(dashboard_router)
    api.include_router(transactions_router)

    @api.get("/")
    def root() -> dict[str, str]:
        return {"name": settings.app_name, "status": "ok"}

    return api


app = create_app()
