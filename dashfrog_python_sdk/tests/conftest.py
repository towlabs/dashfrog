"""Pytest configuration and fixtures for DashFrog tests."""

from sqlalchemy import create_engine

from dashfrog_python_sdk import setup
from dashfrog_python_sdk.config import Config
from dashfrog_python_sdk.migrations import run_migrations

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
    from dashfrog_python_sdk import get_dashfrog_instance
    from dashfrog_python_sdk.models import Base

    config = Config(
        postgres_host="postgres",
        postgres_port=5432,
        postgres_dbname="dashfrog_test",
        postgres_user="postgres",
        postgres_password="postgres",
        otlp_endpoint="http://otel-collector:4318",
        prometheus_endpoint="http://prometheus:9090",
    )
    setup(config)

    # Clean all tables before test
    dashfrog = get_dashfrog_instance()
    with dashfrog.db_engine.begin() as conn:
        conn.execute(Base.metadata.tables["flow_event"].delete())
        conn.execute(Base.metadata.tables["flow"].delete())
        conn.execute(Base.metadata.tables["statistic"].delete())
        conn.execute(Base.metadata.tables["timeline_event"].delete())

    # Clear in-memory caches
    dashfrog._flows.clear()
    dashfrog._statistics.clear()

    yield
