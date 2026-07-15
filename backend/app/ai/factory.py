from app.ai.fake import FakeLlmProvider
from app.ai.ollama import OllamaLlmProvider
from app.ai.providers import LlmProvider
from app.core.config import get_settings


def get_llm_provider() -> LlmProvider:
    settings = get_settings()
    if settings.ollama_enabled:
        return OllamaLlmProvider()

    if settings.environment in {"local", "test", "development"}:
        return FakeLlmProvider()

    return OllamaLlmProvider(enabled=False)
