from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.dashboard import (
    DashboardCategoryBreakdownResponse,
    DashboardSummaryResponse,
)
from app.application.dashboard import (
    DashboardSummaryQuery,
    DashboardValidationError,
    get_dashboard_summary,
)
from app.db.session import get_db_session

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    month: Annotated[str, Query()],
) -> DashboardSummaryResponse:
    try:
        result = await get_dashboard_summary(
            session,
            DashboardSummaryQuery(month=month),
        )
    except DashboardValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return DashboardSummaryResponse(
        currency=result.currency,
        total_balance_minor=result.total_balance_minor,
        monthly_income_minor=result.monthly_income_minor,
        monthly_expense_minor=result.monthly_expense_minor,
        category_breakdown=[
            DashboardCategoryBreakdownResponse(
                category_slug=item.category_slug,
                type=item.type,
                amount_minor=item.amount_minor,
            )
            for item in result.category_breakdown
        ],
    )
