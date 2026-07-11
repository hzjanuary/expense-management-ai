from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CreateTransactionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["expense", "income"]
    amount_minor: int = Field(strict=True, gt=0)
    currency: str = Field(min_length=1)
    category_slug: str = Field(min_length=1)
    description: str = Field(min_length=1)
    occurred_at: datetime
    source: Literal["manual"]


class TransactionResponse(BaseModel):
    id: str
    type: str
    amount_minor: int
    currency: str
    category_slug: str
    description: str
    occurred_at: datetime
    source: str


class TransactionListItemResponse(BaseModel):
    id: str
    type: str
    amount_minor: int
    currency: str
    category_slug: str
    description: str
    merchant: str | None
    occurred_at: datetime
    source: str


class TransactionListResponse(BaseModel):
    items: list[TransactionListItemResponse]
    limit: int
    offset: int
    total: int
