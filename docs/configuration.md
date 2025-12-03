# Configuration

DashFrog is configured using environment variables. When using Docker Compose, these are set in a `.env` file.

## Quick Setup

```bash
cp .env.example .env
# Edit .env with your values
```

## Environment Variables

### Application Configuration

These variables are read by the DashFrog application at runtime.

#### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHFROG_POSTGRES_HOST` | `postgres` | PostgreSQL hostname |
| `DASHFROG_POSTGRES_PORT` | `5432` | PostgreSQL port |
| `DASHFROG_POSTGRES_DBNAME` | `dashfrog_test` | Database name |
| `DASHFROG_POSTGRES_USER` | `postgres` | Database user |
| `DASHFROG_POSTGRES_PASSWORD` | `postgres` | Database password ⚠️ **Change in production** |

#### Metrics Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHFROG_PROMETHEUS_ENDPOINT` | `http://prometheus:9090` | Prometheus server URL |

#### API Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHFROG_API_USERNAME` | `admin` | API/UI login username |
| `DASHFROG_API_PASSWORD` | `admin` | API/UI login password ⚠️ **Change in production** |
| `DASHFROG_API_SECRET_KEY` | `change-me-in-production` | Secret key for session signing ⚠️ **Must be random and secret in production** |

### Infrastructure Configuration

These variables configure Docker Compose port mappings and service labels. They are not read by the application code.

#### Port Mappings

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHFROG_API_PORT` | `8000` | External port for DashFrog API/UI |
| `DASHFROG_POSTGRES_EXTERNAL_PORT` | `5432` | External port for PostgreSQL (for debugging) |
| `DASHFROG_OTLP_GRPC_PORT` | `4317` | External port for OTLP gRPC receiver |
| `DASHFROG_OTLP_HTTP_PORT` | `4318` | External port for OTLP HTTP receiver |
| `DASHFROG_PROMETHEUS_PORT` | `9090` | External port for Prometheus UI (for debugging) |

#### Telemetry Labels

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHFROG_ENVIRONMENT` | `production` | Environment label for OTel collector |
| `DASHFROG_CLUSTER` | `dashfrog` | Cluster label for OTel collector |

#### Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `PROMETHEUS_RETENTION` | `15d` | How long to retain metrics data |

## Production Hardening

For production deployments, ensure you:

1. **Generate a secure secret key**:
   ```bash
   DASHFROG_API_SECRET_KEY=$(openssl rand -hex 32)
   ```

2. **Use strong passwords**:
   ```bash
   DASHFROG_API_PASSWORD=<strong-password>
   DASHFROG_POSTGRES_PASSWORD=<strong-db-password>
   ```

3. **Restrict port exposure**: Only expose ports that need external access. Consider removing external port mappings for PostgreSQL and Prometheus in production.

4. **Set appropriate retention**: Adjust `PROMETHEUS_RETENTION` based on your storage capacity and data retention requirements.

## Docker Image Version

When using `docker-compose.production.yml`, you can pin to a specific DashFrog version:

```bash
DASHFROG_VERSION=v1.0.0
```

If not set, defaults to `latest`.
