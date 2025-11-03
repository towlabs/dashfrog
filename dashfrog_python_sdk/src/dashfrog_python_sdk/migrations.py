"""Programmatic database migration runner for DashFrog SDK."""

from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from sqlalchemy import Engine


def get_alembic_config(engine: Engine) -> AlembicConfig:
    """
    Create Alembic configuration for programmatic execution.

    Args:
        engine: SQLAlchemy engine to use for migrations

    Returns:
        Configured Alembic Config object
    """
    # Get the package directory
    package_dir = Path(__file__).parent

    # Path to alembic.ini
    alembic_ini = package_dir / "alembic.ini"

    # Create Alembic config
    alembic_cfg = AlembicConfig(str(alembic_ini))

    # Set the script location to the alembic directory in the package
    alembic_cfg.set_main_option("script_location", str(package_dir / "alembic"))

    # Provide the engine connection to the config
    alembic_cfg.attributes["connection"] = engine

    return alembic_cfg


def run_migrations(engine: Engine, target_revision: str = "head") -> None:
    """
    Run database migrations programmatically.

    This function executes all pending Alembic migrations up to the target revision.

    Args:
        engine: SQLAlchemy engine to use for migrations
        target_revision: Target revision to migrate to (default: "head" for latest)

    Example:
        from dashfrog_python_sdk import setup, get_dashfrog_instance
        from dashfrog_python_sdk.migrations import run_migrations

        setup()
        dashfrog = get_dashfrog_instance()
        run_migrations(dashfrog.db_engine)
    """
    alembic_cfg = get_alembic_config(engine)

    # Run migrations
    with engine.begin() as connection:
        alembic_cfg.attributes["connection"] = connection
        command.upgrade(alembic_cfg, target_revision)
