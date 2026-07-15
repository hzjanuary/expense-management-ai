from app.ai.factory import get_llm_provider
from app.ai.fake import FakeLlmProvider
from app.ai.ollama import OllamaLlmProvider
from app.core.config import get_settings


def test_provider_factory_uses_fake_provider_for_local_when_ollama_disabled(
    monkeypatch,
) -> None:
    monkeypatch.setenv("POCKET_LEDGER_ENVIRONMENT", "local")
    monkeypatch.setenv("POCKET_LEDGER_OLLAMA_ENABLED", "false")
    get_settings.cache_clear()

    provider = get_llm_provider()

    assert isinstance(provider, FakeLlmProvider)
    get_settings.cache_clear()


def test_provider_factory_uses_ollama_when_enabled(monkeypatch) -> None:
    monkeypatch.setenv("POCKET_LEDGER_ENVIRONMENT", "local")
    monkeypatch.setenv("POCKET_LEDGER_OLLAMA_ENABLED", "true")
    get_settings.cache_clear()

    provider = get_llm_provider()

    assert isinstance(provider, OllamaLlmProvider)
    assert provider.resolved_enabled is True
    get_settings.cache_clear()


def test_provider_factory_returns_unavailable_ollama_for_production_without_ollama(
    monkeypatch,
) -> None:
    monkeypatch.setenv("POCKET_LEDGER_ENVIRONMENT", "production")
    monkeypatch.setenv("POCKET_LEDGER_OLLAMA_ENABLED", "false")
    get_settings.cache_clear()

    provider = get_llm_provider()

    assert isinstance(provider, OllamaLlmProvider)
    assert provider.resolved_enabled is False
    get_settings.cache_clear()
