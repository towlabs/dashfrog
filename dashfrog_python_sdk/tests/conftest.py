"""Pytest configuration and fixtures for DashFrog tests."""

from sqlalchemy import create_engine, text

from dashfrog_python_sdk import setup
from dashfrog_python_sdk.config import Config
from dashfrog_python_sdk.migrations import run_migrations
from dashfrog_python_sdk.models import Base

import pytest


@pytest.fixture(scope="session")
def test_engine():
    """Create SQLAlchemy engine for test database."""
    # Postgres runs in devcontainer on localhost
    engine = create_engine("postgresql://postgres:postgres@localhost:5432/dashfrog_test")

    # Run migrations to ensure schema is up to date
    run_migrations(engine)

    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def clean_db(test_engine):
    """Clean all data from tables before each test."""
    with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            if not table.info.get("is_view"):
                conn.execute(text(f"TRUNCATE TABLE {table.name} CASCADE"))

            if table.name == "dashfrog_metadata":
                conn.execute(text("INSERT INTO dashfrog_metadata (id, last_refresh_ts) VALUES (1, null)"))
    yield


@pytest.fixture
def setup_dashfrog(clean_db):
    """Initialize DashFrog with test database."""
    config = Config(
        postgres_host="localhost",
        postgres_port=5432,
        postgres_dbname="dashfrog_test",
        postgres_user="postgres",
        postgres_password="postgres",
    )
    setup(config)
    yield
