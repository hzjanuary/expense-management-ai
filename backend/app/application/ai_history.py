from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import (
    count_ai_draft_created_transactions,
    count_ai_transaction_drafts,
    delete_ai_transaction_drafts,
)


@dataclass(frozen=True)
class ClearAiHistoryResult:
    deleted_draft_count: int
    preserved_transaction_count: int
    cleared: bool


async def clear_ai_history(session: AsyncSession) -> ClearAiHistoryResult:
    async with session.begin():
        draft_count = await count_ai_transaction_drafts(session)
        preserved_transaction_count = await count_ai_draft_created_transactions(session)
        await delete_ai_transaction_drafts(session)

    return ClearAiHistoryResult(
        deleted_draft_count=draft_count,
        preserved_transaction_count=preserved_transaction_count,
        cleared=True,
    )
