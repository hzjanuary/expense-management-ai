from pydantic import BaseModel


class DashboardCategoryBreakdownResponse(BaseModel):
    category_slug: str
    type: str
    amount_minor: int


class DashboardSummaryResponse(BaseModel):
    currency: str
    total_balance_minor: int
    monthly_income_minor: int
    monthly_expense_minor: int
    category_breakdown: list[DashboardCategoryBreakdownResponse]
