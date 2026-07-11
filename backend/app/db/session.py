from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


def ensure_sqlite_parent_directory(database_url: str) -> None:
    url = make_url(database_url)
    if not url.drivername.startswith("sqlite"):
        return

    database_path = url.database
    if not database_path or database_path == ":memory:":
        return

    Path(database_path).expanduser().parent.mkdir(parents=True, exist_ok=True)


def create_engine(database_url: str | None = None) -> AsyncEngine:
    resolved_url = database_url or get_settings().database_url
    ensure_sqlite_parent_directory(resolved_url)
    return create_async_engine(resolved_url, pool_pre_ping=True)


def create_session_factory(
    engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=engine, expire_on_commit=False)


_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine

    if _engine is None:
        _engine = create_engine()
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _async_session_factory

    if _async_session_factory is None:
        _async_session_factory = create_session_factory(get_engine())
    return _async_session_factory


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session
