import pytest

from app.cli.e2e_seed import E2eSeedSafetyError, validate_e2e_seed_settings
from app.core.config import Settings


def test_e2e_seed_rejects_production_environment() -> None:
    settings = Settings(
        environment="production",
        database_url="sqlite+aiosqlite:////app/data/pocket_ledger_e2e.db",
    )

    with pytest.raises(E2eSeedSafetyError, match="test environment"):
        validate_e2e_seed_settings(settings)


def test_e2e_seed_rejects_non_e2e_sqlite_path() -> None:
    settings = Settings(
        environment="test",
        database_url="sqlite+aiosqlite:////app/data/pocket_ledger.db",
    )

    with pytest.raises(E2eSeedSafetyError, match="e2e-specific"):
        validate_e2e_seed_settings(settings)


def test_e2e_seed_accepts_test_e2e_sqlite_path() -> None:
    settings = Settings(
        environment="test",
        database_url="sqlite+aiosqlite:////app/data/pocket_ledger_e2e.db",
    )

    validate_e2e_seed_settings(settings)
