from pydantic import BaseModel, ConfigDict, Field


class CategoryBudgetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category_slug: str = Field(min_length=1)
    budget_minor: int = Field(strict=True, ge=0)


class UpsertMonthlyBudgetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    currency: str = Field(min_length=1)
    total_budget_minor: int = Field(strict=True, ge=0)
    category_budgets: list[CategoryBudgetRequest] = Field(default_factory=list)


class CategoryBudgetResponse(BaseModel):
    category_slug: str
    budget_minor: int


class MonthlyBudgetResponse(BaseModel):
    year: int
    month: int
    currency: str
    total_budget_minor: int
    category_budgets: list[CategoryBudgetResponse]


class CategoryBudgetRemainingResponse(BaseModel):
    category_slug: str
    budget_minor: int
    spent_minor: int
    remaining_minor: int
    is_over_budget: bool


class BudgetRemainingResponse(BaseModel):
    year: int
    month: int
    currency: str
    total_budget_minor: int
    total_expense_minor: int
    total_remaining_minor: int
    categories: list[CategoryBudgetRemainingResponse]
