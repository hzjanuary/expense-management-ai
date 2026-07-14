from typing import Protocol

from app.ai.schemas import (
    LlmProviderStatus,
    TransactionParseRequest,
    TransactionParseResult,
)


class LlmProvider(Protocol):
    async def parse_transaction_text(
        self,
        request: TransactionParseRequest,
    ) -> TransactionParseResult:
        """Parse user text into a structured draft without mutating the ledger."""

    async def get_status(self) -> LlmProviderStatus:
        """Return provider/model availability without making ledger changes."""
