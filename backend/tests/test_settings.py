from app.core.config import Settings, get_settings


def test_settings_defaults() -> None:
    settings = Settings()

    assert settings.app_name == "Pocket Ledger AI"
    assert settings.environment == "local"
    assert settings.log_level == "INFO"
    assert settings.default_currency == "VND"
    assert settings.database_url == "sqlite+aiosqlite:///./data/pocket_ledger.db"


def test_settings_load_from_environment(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("POCKET_LEDGER_APP_NAME", "Test Ledger")
    monkeypatch.setenv("POCKET_LEDGER_ENVIRONMENT", "test")
    monkeypatch.setenv("POCKET_LEDGER_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("POCKET_LEDGER_DEFAULT_CURRENCY", "USD")
    monkeypatch.setenv(
        "POCKET_LEDGER_DATABASE_URL",
        "sqlite+aiosqlite:////tmp/test-ledger.db",
    )

    settings = Settings()

    assert settings.app_name == "Test Ledger"
    assert settings.environment == "test"
    assert settings.log_level == "DEBUG"
    assert settings.default_currency == "USD"
    assert settings.database_url == "sqlite+aiosqlite:////tmp/test-ledger.db"


def test_get_settings_is_cached() -> None:
    get_settings.cache_clear()

    first = get_settings()
    second = get_settings()

    assert first is second

    get_settings.cache_clear()
