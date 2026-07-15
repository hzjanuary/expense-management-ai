from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.errors import (
    LlmProviderError,
    LlmProviderInvalidResponseError,
    LlmProviderTimeoutError,
    LlmProviderUnavailableError,
)
from app.ai.factory import get_llm_provider
from app.ai.providers import LlmProvider
from app.api.schemas.ai import (
    AiConfirmedTransactionResponse,
    AiConfirmRequest,
    AiConfirmResponse,
    AiParseRequest,
    AiParseResponse,
    AiTransactionDraftResponse,
)
from app.application.ai_parse import (
    AiDraftConfirmationError,
    AiDraftNotFoundError,
    AiParseCommand,
    AiParseValidationError,
    ConfirmAiDraftCommand,
    confirm_ai_transaction_draft,
    parse_ai_transaction_draft,
)
from app.db.session import get_db_session

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


@router.post("/parse", response_model=AiParseResponse)
async def parse_ai_draft(
    request: AiParseRequest,
    provider_dependency: Annotated[object, Depends(get_llm_provider)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AiParseResponse:
    provider = cast(LlmProvider, provider_dependency)
    try:
        result = await parse_ai_transaction_draft(
            session,
            provider,
            AiParseCommand(
                message=request.message,
                locale=request.locale,
                default_currency=request.default_currency,
                timezone=request.timezone,
            ),
        )
    except LlmProviderUnavailableError as error:
        raise HTTPException(
            status_code=503,
            detail="LLM provider is unavailable",
        ) from error
    except LlmProviderTimeoutError as error:
        raise HTTPException(
            status_code=504,
            detail="LLM provider timed out",
        ) from error
    except LlmProviderInvalidResponseError as error:
        raise HTTPException(
            status_code=502,
            detail="LLM provider returned invalid structured output",
        ) from error
    except LlmProviderError as error:
        raise HTTPException(
            status_code=502,
            detail="LLM provider error",
        ) from error
    except AiParseValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    draft = None
    if result.draft is not None:
        draft = AiTransactionDraftResponse(
            type=result.draft.type,
            amount_minor=result.draft.amount_minor,
            currency=result.draft.currency,
            category_slug=result.draft.category_slug,
            description=result.draft.description,
            merchant=result.draft.merchant,
            occurred_at=result.draft.occurred_at,
            source=result.draft.source,
        )

    return AiParseResponse(
        intent=result.intent,
        draft_id=result.draft_id,
        draft=draft,
        needs_confirmation=result.needs_confirmation,
        confidence=result.confidence,
        missing_fields=result.missing_fields,
    )


@router.post("/confirm", response_model=AiConfirmResponse)
async def confirm_ai_draft(
    request: AiConfirmRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AiConfirmResponse:
    try:
        result = await confirm_ai_transaction_draft(
            session,
            ConfirmAiDraftCommand(draft_id=request.draft_id),
        )
    except AiDraftNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except AiDraftConfirmationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return AiConfirmResponse(
        transaction=AiConfirmedTransactionResponse(
            id=result.transaction.id,
            type=result.transaction.type,
            amount_minor=result.transaction.amount_minor,
            currency=result.transaction.currency,
            category_slug=result.transaction.category_slug,
            description=result.transaction.description,
            merchant=result.transaction.merchant,
            occurred_at=result.transaction.occurred_at,
            source=result.transaction.source,
        ),
        account_balance_minor=result.account_balance_minor,
    )
