from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "test", "development", "staging", "production"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


class Settings(BaseSettings):
    app_name: str = Field(default="Pocket Ledger AI", min_length=1)
    environment: Environment = "local"
    log_level: LogLevel = "INFO"
    default_currency: str = Field(default="VND", min_length=3, max_length=3)
    database_url: str = "sqlite+aiosqlite:///./data/pocket_ledger.db"
    default_account_name: str = Field(default="Cash Wallet", min_length=1)
    default_account_opening_balance_minor: int = Field(default=0, ge=0)

    model_config = SettingsConfigDict(
        env_prefix="POCKET_LEDGER_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
