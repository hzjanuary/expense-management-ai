from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass

from sqlalchemy import delete
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.models import (
    AccountModel,
    AiTransactionDraftModel,
    BudgetPeriodModel,
    CategoryBudgetModel,
    TransactionModel,
)
from app.db.session import get_session_factory

EXPECTED_OPENING_BALANCE_MINOR = 1_000_000


class E2eSeedSafetyError(RuntimeError):
    """Raised when the E2E seed command is pointed at unsafe state."""


@dataclass(frozen=True, slots=True)
class E2eSeedResult:
    account_count: int
    ai_draft_count: int
    budget_period_count: int
    category_budget_count: int
    current_balance_minor: int
    transaction_count: int


def validate_e2e_seed_settings(settings: Settings) -> None:
    if settings.environment != "test":
        raise E2eSeedSafetyError("E2E seed requires test environment")

    database_url = make_url(settings.database_url)
    if not database_url.drivername.startswith("sqlite"):
        raise E2eSeedSafetyError("E2E seed supports SQLite only")

    database_path = database_url.database or ""
    if database_path == ":memory:" or "e2e" not in database_path.lower():
        raise E2eSeedSafetyError("E2E seed requires an e2e-specific SQLite path")


async def reset_and_seed_e2e_database(
    session: AsyncSession,
    settings: Settings,
) -> E2eSeedResult:
    validate_e2e_seed_settings(settings)

    async with session.begin():
        await session.execute(delete(AiTransactionDraftModel))
        await session.execute(delete(CategoryBudgetModel))
        await session.execute(delete(BudgetPeriodModel))
        await session.execute(delete(TransactionModel))
        await session.execute(delete(AccountModel))

        account = AccountModel(
            name=settings.default_account_name,
            currency=settings.default_currency,
            opening_balance_minor=EXPECTED_OPENING_BALANCE_MINOR,
            current_balance_minor=EXPECTED_OPENING_BALANCE_MINOR,
        )
        session.add(account)
        await session.flush()

    return E2eSeedResult(
        account_count=1,
        ai_draft_count=0,
        budget_period_count=0,
        category_budget_count=0,
        current_balance_minor=EXPECTED_OPENING_BALANCE_MINOR,
        transaction_count=0,
    )


async def run_seed_command() -> E2eSeedResult:
    settings = get_settings()
    validate_e2e_seed_settings(settings)
    async with get_session_factory()() as session:
        return await reset_and_seed_e2e_database(session, settings)


def main() -> None:
    try:
        result = asyncio.run(run_seed_command())
    except E2eSeedSafetyError as error:
        raise SystemExit(str(error)) from error

    print(
        json.dumps(
            {
                "account_count": result.account_count,
                "ai_draft_count": result.ai_draft_count,
                "budget_period_count": result.budget_period_count,
                "category_budget_count": result.category_budget_count,
                "current_balance_minor": result.current_balance_minor,
                "seeded": True,
                "transaction_count": result.transaction_count,
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
