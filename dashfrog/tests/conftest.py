"""Pytest configuration and fixtures for DashFrog tests."""

from sqlalchemy import create_engine

from dashfrog import setup
from dashfrog.config import Config
from dashfrog.migrations import run_migrations

import pytest


@pytest.fixture(scope="session")
def test_engine():
    """Create SQLAlchemy engine for test database."""
    # Postgres runs as a docker service
    engine = create_engine("postgresql://postgres:postgres@postgres:5432/dashfrog_test")

    # Run migrations to ensure schema is up to date
    run_migrations(engine)

    yield engine
    engine.dispose()


@pytest.fixture
def setup_dashfrog(test_engine):
    """Initialize DashFrog with test database."""
    from dashfrog import get_dashfrog_instance
    from dashfrog.models import Base

    config = Config()
    setup(config)

    # Clean all tables before test
    dashfrog = get_dashfrog_instance()
    with dashfrog.db_engine.begin() as conn:
        conn.execute(Base.metadata.tables["flow_event"].delete())
        conn.execute(Base.metadata.tables["flow"].delete())
        conn.execute(Base.metadata.tables["metric"].delete())
        conn.execute(Base.metadata.tables["notebook"].delete())

    # Clear in-memory caches
    dashfrog._flows.clear()
    dashfrog._metrics.clear()

    yield
