from app.core.config import Settings, get_settings


def test_settings_defaults() -> None:
    settings = Settings()

    assert settings.app_name == "Pocket Ledger AI"
    assert settings.environment == "local"
    assert settings.log_level == "INFO"
    assert settings.default_currency == "VND"
    assert settings.database_url == "sqlite+aiosqlite:///./data/pocket_ledger.db"
    assert settings.ollama_base_url == "http://127.0.0.1:11434"
    assert settings.ollama_model == "qwen2.5:3b"
    assert settings.ollama_timeout_seconds == 10
    assert settings.ollama_enabled is False
    assert settings.ai_draft_ttl_seconds == 900


def test_settings_load_from_environment(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("POCKET_LEDGER_APP_NAME", "Test Ledger")
    monkeypatch.setenv("POCKET_LEDGER_ENVIRONMENT", "test")
    monkeypatch.setenv("POCKET_LEDGER_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("POCKET_LEDGER_DEFAULT_CURRENCY", "USD")
    monkeypatch.setenv(
        "POCKET_LEDGER_DATABASE_URL",
        "sqlite+aiosqlite:////tmp/test-ledger.db",
    )
    monkeypatch.setenv("POCKET_LEDGER_OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setenv("POCKET_LEDGER_OLLAMA_MODEL", "llama3.2:3b")
    monkeypatch.setenv("POCKET_LEDGER_OLLAMA_TIMEOUT_SECONDS", "3.5")
    monkeypatch.setenv("POCKET_LEDGER_OLLAMA_ENABLED", "true")
    monkeypatch.setenv("POCKET_LEDGER_AI_DRAFT_TTL_SECONDS", "60")

    settings = Settings()

    assert settings.app_name == "Test Ledger"
    assert settings.environment == "test"
    assert settings.log_level == "DEBUG"
    assert settings.default_currency == "USD"
    assert settings.database_url == "sqlite+aiosqlite:////tmp/test-ledger.db"
    assert settings.ollama_base_url == "http://localhost:11434"
    assert settings.ollama_model == "llama3.2:3b"
    assert settings.ollama_timeout_seconds == 3.5
    assert settings.ollama_enabled is True
    assert settings.ai_draft_ttl_seconds == 60


def test_get_settings_is_cached() -> None:
    get_settings.cache_clear()

    first = get_settings()
    second = get_settings()

    assert first is second

    get_settings.cache_clear()
