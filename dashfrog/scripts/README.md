# DashFrog Scripts

Utility scripts for populating and testing DashFrog.

## populate_prometheus.py

Populates Prometheus with sample metrics data for testing and demonstration.

### Features

- Creates 3 counter metrics (orders, revenue, API requests)
- Creates 3 histogram metrics (order duration, API latency, order value)
- Generates realistic data with multiple label combinations
- Runs continuously until stopped

### Usage

```bash
# From the repository root
python scripts/populate_prometheus.py
```

Or directly:

```bash
# Make it executable first
chmod +x scripts/populate_prometheus.py

# Run it
./scripts/populate_prometheus.py
```

### What it does

1. **Batch Generation**: Quickly generates 100 historical data points
2. **Continuous Generation**: Generates new metrics every 1 second for orders
3. **Metrics Created**:
   - `dashfrog_orders_placed` - Counter with region and payment_method labels
   - `dashfrog_revenue` - Counter with region and product_category labels
   - `dashfrog_api_requests` - Counter with endpoint, method, and status_code labels
   - `dashfrog_order_processing_duration` - Histogram with region label
   - `dashfrog_api_request_duration` - Histogram with endpoint and method labels
   - `dashfrog_order_value` - Histogram with region and customer_tier labels

### Sample Prometheus Queries

After running the script, try these queries in Prometheus:

```promql
# Orders per second
rate(dashfrog_orders_placed[1m])

# Revenue rate by region
sum by (region) (rate(dashfrog_revenue[1m]))

# API request rate by endpoint
sum by (endpoint) (rate(dashfrog_api_requests[1m]))

# P95 order processing time
histogram_quantile(0.95, sum by (le) (rate(dashfrog_order_processing_duration_bucket[1m])))

# P95 API latency by endpoint
histogram_quantile(0.95, sum by (endpoint, le) (rate(dashfrog_api_request_duration_bucket[1m])))

# Median order value by region
histogram_quantile(0.5, sum by (region, le) (rate(dashfrog_order_value_bucket[1m])))
```

### Environment Variables

The script uses the standard DashFrog configuration from environment variables:

- `DASHFROG_OTLP_ENDPOINT` - OpenTelemetry collector endpoint (default: `grpc://otel-collector:4317`)
- `DASHFROG_PROMETHEUS_ENDPOINT` - Prometheus endpoint for verification (default: `http://prometheus:9090`)
- `DASHFROG_POSTGRES_*` - Postgres connection (for metric registration)

### Customization

You can modify the script to:
- Change the tenant name
- Add more regions or label values
- Adjust data generation rates
- Add more metric types
- Change value ranges

Example:

```python
# Generate data faster
populate_orders(metrics, tenant="acme-corp", duration_seconds=300, interval_seconds=0.5)

# Add more regions
regions = ["us-east", "us-west", "us-central", "eu-west", "eu-central", "ap-south", "ap-northeast"]
```
