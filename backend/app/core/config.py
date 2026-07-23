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
    default_timezone: str = Field(default="Asia/Ho_Chi_Minh", min_length=1)
    database_url: str = "sqlite+aiosqlite:///./data/pocket_ledger.db"
    default_account_name: str = Field(default="Cash Wallet", min_length=1)
    default_account_opening_balance_minor: int = Field(default=0, ge=0)
    ollama_base_url: str = Field(default="http://127.0.0.1:11434", min_length=1)
    ollama_model: str = Field(default="qwen3:4b-instruct", min_length=1)
    ollama_timeout_seconds: float = Field(default=10, gt=0)
    ollama_enabled: bool = False
    ai_draft_ttl_seconds: int = Field(default=900, gt=0)
    export_max_rows: int = Field(default=10_000, gt=0)

    model_config = SettingsConfigDict(
        env_prefix="POCKET_LEDGER_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
