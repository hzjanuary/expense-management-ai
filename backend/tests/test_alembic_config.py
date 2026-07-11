from pathlib import Path

from alembic.config import Config

from app.db.base import Base


def test_alembic_config_points_to_local_scripts() -> None:
    config = Config("alembic.ini")

    assert config.get_main_option("script_location") == "alembic"
    assert config.get_main_option("sqlalchemy.url").startswith("sqlite+aiosqlite:///")


def test_initial_migration_contains_no_product_domain_tables() -> None:
    migration = Path("alembic/versions/0001_initialize_database_infrastructure.py")

    migration_text = migration.read_text(encoding="utf-8")

    assert "create_table" not in migration_text
    assert Base.metadata.tables == {}
