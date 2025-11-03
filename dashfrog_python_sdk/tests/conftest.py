"""Pytest configuration and fixtures for DashFrog tests."""

from sqlalchemy import create_engine, text

from dashfrog_python_sdk import setup
from dashfrog_python_sdk.config import Config
from dashfrog_python_sdk.models import Base

import pytest


@pytest.fixture(scope="session")
def test_engine():
    """Create SQLAlchemy engine for test database."""
    # Postgres runs in devcontainer on localhost
    engine = create_engine("postgresql://postgres:postgres@localhost:5432/dashfrog_test")
    yield engine
    engine.dispose()


@pytest.fixture(scope="session")
def setup_test_db(test_engine):
    """Create all tables in test database."""
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield
    Base.metadata.drop_all(test_engine)


@pytest.fixture(scope="function")
def clean_db(test_engine, setup_test_db):
    """Clean all data from tables before each test."""
    with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f"TRUNCATE TABLE {table.name} CASCADE"))
    yield


@pytest.fixture
def setup_dashfrog(clean_db):
    """Initialize DashFrog with test database."""
    config = Config(
        otel_endpoint="localhost:4317",
        postgres_host="localhost",
        postgres_port=5432,
        postgres_dbname="dashfrog_test",
        postgres_user="postgres",
        postgres_password="postgres",
    )
    setup(config)
    yield
