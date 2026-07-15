from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.budgets import (
    BudgetRemainingResponse,
    CategoryBudgetRemainingResponse,
    CategoryBudgetResponse,
    MonthlyBudgetResponse,
    UpsertMonthlyBudgetRequest,
)
from app.application.budgets import (
    BudgetNotFoundError,
    BudgetRemainingResult,
    BudgetValidationError,
    CategoryBudgetCommand,
    GetBudgetRemainingQuery,
    GetMonthlyBudgetQuery,
    MonthlyBudgetResult,
    UpsertMonthlyBudgetCommand,
    get_budget_remaining,
    get_monthly_budget,
    upsert_monthly_budget,
)
from app.db.session import get_db_session

router = APIRouter(prefix="/api/v1/budgets", tags=["budgets"])


@router.put("/monthly/{year}/{month}", response_model=MonthlyBudgetResponse)
async def put_monthly_budget(
    request: UpsertMonthlyBudgetRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    year: Annotated[int, Path(ge=1900, le=9999)],
    month: Annotated[int, Path(ge=1, le=12)],
) -> MonthlyBudgetResponse:
    try:
        result = await upsert_monthly_budget(
            session,
            UpsertMonthlyBudgetCommand(
                year=year,
                month=month,
                currency=request.currency,
                total_budget_minor=request.total_budget_minor,
                category_budgets=[
                    CategoryBudgetCommand(
                        category_slug=item.category_slug,
                        budget_minor=item.budget_minor,
                    )
                    for item in request.category_budgets
                ],
            ),
        )
    except BudgetValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return _monthly_budget_response(result)


@router.get("/monthly/{year}/{month}", response_model=MonthlyBudgetResponse)
async def read_monthly_budget(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    year: Annotated[int, Path(ge=1900, le=9999)],
    month: Annotated[int, Path(ge=1, le=12)],
    currency: Annotated[str, Query(min_length=1)] = "VND",
) -> MonthlyBudgetResponse:
    try:
        result = await get_monthly_budget(
            session,
            GetMonthlyBudgetQuery(
                year=year,
                month=month,
                currency=currency,
            ),
        )
    except BudgetNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except BudgetValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return _monthly_budget_response(result)


@router.get(
    "/monthly/{year}/{month}/remaining",
    response_model=BudgetRemainingResponse,
)
async def read_monthly_budget_remaining(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    year: Annotated[int, Path(ge=1900, le=9999)],
    month: Annotated[int, Path(ge=1, le=12)],
    currency: Annotated[str, Query(min_length=1)] = "VND",
) -> BudgetRemainingResponse:
    try:
        result = await get_budget_remaining(
            session,
            GetBudgetRemainingQuery(
                year=year,
                month=month,
                currency=currency,
            ),
        )
    except BudgetNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except BudgetValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return _budget_remaining_response(result)


def _monthly_budget_response(result: MonthlyBudgetResult) -> MonthlyBudgetResponse:
    return MonthlyBudgetResponse(
        year=result.year,
        month=result.month,
        currency=result.currency,
        total_budget_minor=result.total_budget_minor,
        category_budgets=[
            CategoryBudgetResponse(
                category_slug=item.category_slug,
                budget_minor=item.budget_minor,
            )
            for item in result.category_budgets
        ],
    )


def _budget_remaining_response(
    result: BudgetRemainingResult,
) -> BudgetRemainingResponse:
    return BudgetRemainingResponse(
        year=result.year,
        month=result.month,
        currency=result.currency,
        total_budget_minor=result.total_budget_minor,
        total_expense_minor=result.total_expense_minor,
        total_remaining_minor=result.total_remaining_minor,
        categories=[
            CategoryBudgetRemainingResponse(
                category_slug=item.category_slug,
                budget_minor=item.budget_minor,
                spent_minor=item.spent_minor,
                remaining_minor=item.remaining_minor,
                is_over_budget=item.is_over_budget,
            )
            for item in result.categories
        ],
    )
