class LlmProviderError(Exception):
    """Base provider error with a safe user-facing message."""

    safe_message = "LLM provider error"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.safe_message)


class LlmProviderUnavailableError(LlmProviderError):
    safe_message = "LLM provider is unavailable"


class LlmProviderTimeoutError(LlmProviderError):
    safe_message = "LLM provider timed out"


class LlmProviderInvalidResponseError(LlmProviderError):
    safe_message = "LLM provider returned invalid structured output"
