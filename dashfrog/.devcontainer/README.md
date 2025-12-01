# DashFrog Development Environment

This devcontainer provides a complete development environment for DashFrog with all necessary services.

## Architecture

```
DashFrog SDK → OTLP Collector → Prometheus (Remote Write + Native Histograms)
                    ↓
              PostgreSQL
```

Metrics flow:
1. DashFrog SDK sends metrics to OTLP Collector via gRPC/HTTP
2. OTLP Collector converts exponential histograms to native histograms
3. OTLP Collector pushes metrics to Prometheus via remote write API
4. Prometheus stores metrics using native histogram format for better accuracy and lower cardinality

**Native Histograms**: Exponential histograms from OpenTelemetry are automatically converted to Prometheus native histograms, providing better accuracy with fewer buckets and lower storage overhead compared to classic histograms.

## Network Configuration

All services run on the same `dashfrog` Docker network. **Important**: After modifying `docker-compose.yml`, you must rebuild the devcontainer for network changes to take effect.

### Hostname Resolution
- From **inside the devcontainer** (tests, SDK code): Use docker service names
  - Postgres: `postgres:5432`
  - OTEL Collector: `otel-collector:4318` (HTTP) or `otel-collector:4317` (gRPC)
  - Prometheus: `prometheus:9090`

- From **host machine** (browser, local tools): Use localhost
  - Postgres: `localhost:5432`
  - OTEL Collector: `localhost:4318` / `localhost:4317`
  - Prometheus: `localhost:9090`

## Services

### PostgreSQL (port 5432)
- Database for storing flow events and timeline events
- **From devcontainer**: `postgresql://postgres:postgres@postgres:5432/dashfrog_test`
- **From host**: `postgresql://postgres:postgres@localhost:5432/dashfrog_test`

### OpenTelemetry Collector (ports 4317, 4318, 8888)
- **4317**: OTLP gRPC receiver - send traces and metrics via gRPC
- **4318**: OTLP HTTP receiver - send traces and metrics via HTTP
- **8888**: Internal metrics (health, performance)

**Mode**: Push metrics to Prometheus via remote write

Configuration: `.devcontainer/otel-collector-config.yml`

### Prometheus (port 9090)
- Metrics storage and querying
- Receives metrics via remote write API (push mode)
- **Web UI**: http://localhost:9090 (from host) or http://prometheus:9090 (from devcontainer)

Configuration: `.devcontainer/prometheus.yml`

## Usage

### Sending Metrics to OTLP Collector

Configure your DashFrog SDK to send metrics to the collector:

```python
from dashfrog import setup, Config

setup(Config(
    otlp_endpoint="localhost:4317",  # gRPC
    # or
    # otlp_endpoint="http://localhost:4318",  # HTTP
    postgres_host="localhost",
    postgres_dbname="dashfrog_test",
))
```

### Viewing Metrics in Prometheus

1. Open http://localhost:9090
2. Query metrics with prefix `dashfrog_*`

#### Example Queries

**Counter metrics:**
```promql
# Total orders placed
dashfrog_orders_placed_total

# Rate of orders per second over 5 minutes
rate(dashfrog_orders_placed_total[5m])
```

**Native Histogram metrics:**
```promql
# 95th percentile using native histograms
histogram_quantile(0.95, dashfrog_request_duration_seconds)

# Average using native histograms
histogram_avg(dashfrog_request_duration_seconds)

# Count of observations
histogram_count(dashfrog_request_duration_seconds)

# Sum of all observations
histogram_sum(dashfrog_request_duration_seconds)

# Fraction of observations below 0.1s
histogram_fraction(0, 0.1, dashfrog_request_duration_seconds)
```

**Note**: Native histograms use `histogram_*` functions instead of the traditional `_bucket` suffix approach. They provide more accurate quantile calculations with adaptive bucket boundaries.

### Checking Service Health

- **Prometheus**: http://localhost:9090/-/healthy
- **OTLP Collector**: http://localhost:8888/metrics (internal metrics)

## Development

After modifying configuration files, restart the services:

```bash
docker-compose -f .devcontainer/docker-compose.yml restart otel-collector prometheus
```
