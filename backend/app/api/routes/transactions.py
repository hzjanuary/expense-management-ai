from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transactions import CreateTransactionRequest, TransactionResponse
from app.application.transactions import (
    CreateExpenseCommand,
    TransactionValidationError,
    create_manual_expense,
)
from app.db.session import get_db_session

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.post(
    "", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED
)
async def create_transaction(
    request: CreateTransactionRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> TransactionResponse:
    try:
        result = await create_manual_expense(
            session,
            CreateExpenseCommand(
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
