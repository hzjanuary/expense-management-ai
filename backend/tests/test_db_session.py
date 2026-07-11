from collections.abc import AsyncIterator

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import (
    create_engine,
    create_session_factory,
    ensure_sqlite_parent_directory,
)


@pytest.mark.anyio
async def test_async_session_uses_isolated_temp_database(tmp_path) -> None:
    database_path = tmp_path / "isolated.db"
    database_url = f"sqlite+aiosqlite:///{database_path}"
    engine = create_engine(database_url)
    session_factory = create_session_factory(engine)

    async with session_factory() as session:
        result = await session.execute(text("select 1"))

    assert result.scalar_one() == 1
    assert database_path.exists()

    await engine.dispose()


def test_sqlite_parent_directory_is_created(tmp_path) -> None:
    database_path = tmp_path / "nested" / "pocket_ledger.db"

    ensure_sqlite_parent_directory(f"sqlite+aiosqlite:///{database_path}")

    assert database_path.parent.exists()


async def collect_session(
    session_iter: AsyncIterator[AsyncSession],
) -> AsyncSession:
    session = await anext(session_iter)
    await session_iter.aclose()
    return session
