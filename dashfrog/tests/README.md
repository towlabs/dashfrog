# Running Tests

Tests use a real PostgreSQL database that runs automatically in the devcontainer.

## Quick Start

```bash
# Just run pytest - database is already running
pytest tests/

# Run specific test
pytest tests/test_flow.py::TestFlowContextManager::test_successful_flow -v
```

## That's It!

The devcontainer includes PostgreSQL, so you don't need to start anything manually.

## How It Works

- PostgreSQL runs as a service in the devcontainer
- Database: `dashfrog_test`
- User/Password: `postgres/postgres`
- Port: `5432` (localhost)
- Tables are created automatically before tests
- Data is cleaned before each test

## Inspecting the Database

```bash
# Connect with psql
psql -h localhost -U postgres -d dashfrog_test

# View tables
\dt

# View events
SELECT * FROM event ORDER BY id;
```
