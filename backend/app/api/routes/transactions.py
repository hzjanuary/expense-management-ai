from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transactions import (
    CreateTransactionRequest,
    TransactionListItemResponse,
    TransactionListResponse,
    TransactionResponse,
)
from app.application.transactions import (
    CreateManualTransactionCommand,
    ListTransactionsQuery,
    TransactionValidationError,
    create_manual_transaction,
    list_filtered_transactions,
)
from app.db.session import get_db_session

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.get("", response_model=TransactionListResponse)
async def list_transaction_history(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    month: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    type: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TransactionListResponse:
    try:
        result = await list_filtered_transactions(
            session,
            ListTransactionsQuery(
                month=month,
                category=category,
                type=type,
                q=q,
                limit=limit,
                offset=offset,
            ),
        )
    except TransactionValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return TransactionListResponse(
        items=[
            TransactionListItemResponse(
                id=transaction.id,
                type=transaction.type,
                amount_minor=transaction.amount_minor,
                currency=transaction.currency,
                category_slug=transaction.category_slug,
                description=transaction.description,
                merchant=transaction.merchant,
                occurred_at=transaction.occurred_at,
                source=transaction.source,
            )
            for transaction in result.items
        ],
        limit=result.limit,
        offset=result.offset,
        total=result.total,
    )


@router.post(
    "", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED
)
async def create_transaction(
    request: CreateTransactionRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> TransactionResponse:
    try:
        result = await create_manual_transaction(
            session,
            CreateManualTransactionCommand(
                type=request.type,
                amount_minor=request.amount_minor,
                currency=request.currency,
                category_slug=request.category_slug,
                description=request.description,
                occurred_at=request.occurred_at,
                source=request.source,
            ),
        )
    except TransactionValidationError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    return TransactionResponse(
        id=result.transaction.id,
        type=result.transaction.type,
        amount_minor=result.transaction.amount_minor,
        currency=result.transaction.currency,
        category_slug=result.transaction.category_slug,
        description=result.transaction.description,
        occurred_at=result.transaction.occurred_at,
        source=result.transaction.source,
    )
