# Metrics

Track customer-scoped metrics.

## What Are Metrics?

Metrics let you measure and aggregate numerical data per customer. DashFrog provides three types:

- **Counter** - Count occurrences (e.g., API calls, errors, orders)
- **Histogram** - Measure distributions (e.g., latency, file sizes, processing times)
- **Gauge** - Track current values (e.g., active connections, queue depth, memory usage)

These primitives map directly to OpenTelemetry metric types. However, they're not exposed as-is in notebooks because they have too many caveats (counters are cumulative, histograms need special aggregation, etc.). Instead, notebooks provide higher-level abstractions:

- **Rates** - Automatically calculate rates from counters (e.g., requests/second, errors/minute)
- **Percentiles** - Pre-calculated P50, P95, P99 from histograms
- **Ratios** - Percentage of a given label (e.g., % of 500 errors within all requests, success rate)

This gives you the simplicity of working with OpenTelemetry in your code, while getting intuitive queries and visualizations in notebooks.

## Basic Usage

### Counter

Count things that only go up:

```python
from dashfrog.metrics import Counter

# Initialize counter
api_calls = Counter(
    name="api_calls",
    labels=["method", "status"],
    pretty_name="API Calls",
    unit="count"
)

# Increment counter
api_calls.add(1, tenant="acme-corp", method="POST", status="200")
api_calls.add(1, tenant="acme-corp", method="GET", status="404")
```

**Common use cases:**
- HTTP requests
- Database queries
- Background jobs
- Errors and exceptions
- Business events (orders, signups, payments)

### Histogram

Measure distributions:

```python
from dashfrog.metrics import Histogram

# Initialize histogram
request_duration = Histogram(
    name="request_duration_seconds",
    labels=["endpoint"],
    pretty_name="Request Duration",
    unit="seconds"
)

# Record values
request_duration.record(0.234, tenant="acme-corp", endpoint="/api/users")
request_duration.record(1.456, tenant="acme-corp", endpoint="/api/data")
```

**Common use cases:**
- Latency and response times
- File sizes
- Processing times
- Request/response payload sizes

### Gauge

Track current values that can go up or down. Unlike counters and histograms (push-based), gauges are **pull-based** — you provide a callback that DashFrog calls periodically to fetch current values.

```python
from dashfrog.metrics import Gauge, GaugeValue

# Initialize gauge
active_connections = Gauge(
    name="active_connections",
    labels=["region"],
    pretty_name="Active Connections",
    unit="count"
)

# Define callback to fetch current values
def get_active_connections(timeout_seconds: int):
    """Called every 30 seconds to fetch current connection counts.

    Args:
        timeout_seconds: Maximum time to spend fetching values

    Yields:
        GaugeValue for each customer and label combination
    """
    # Query database for current state
    for customer_id, region, count in fetch_connection_counts():
        yield GaugeValue(
            value=count,              # Current number of connections
            tenant=customer_id,       # Customer this value belongs to
            labels={"region": region} # Additional dimensions
        )

# Set up periodic sampling (every 30 seconds)
active_connections.set_periodically(
    period_in_seconds=30,              # How often to call the callback
    callback=get_active_connections    # Function that fetches current values
)
```

**How `set_periodically` works:**

1. **You define a callback** - A function that fetches current values from your system
2. **DashFrog calls it periodically** - Every `period_in_seconds`, your callback runs
3. **Yield one GaugeValue per customer** - Return the current value for each tenant/label combination

**Example: Tracking queue depth**

```python
from dashfrog.metrics import Gauge, GaugeValue

queue_depth = Gauge(
    name="job_queue_depth",
    labels=["queue_name"],
    pretty_name="Job Queue Depth",
    unit="count"
)

def get_queue_depths(timeout_seconds: int):
    # Query Redis/database for current queue sizes
    queues = redis.hgetall("queue_depths")  # {'customer:acme:high': '5', 'customer:acme:low': '2'}

    for key, depth in queues.items():
        # Parse customer_id and queue_name from key
        parts = key.split(":")
        customer_id = parts[1]
        queue_name = parts[2]

        yield GaugeValue(
            value=int(depth),
            tenant=customer_id,
            labels={"queue_name": queue_name}
        )

# Poll queue depths every 15 seconds
queue_depth.set_periodically(
    period_in_seconds=15,
    callback=get_queue_depths
)
```

**Common use cases:**
- Active connections or sessions
- Queue depth/length
- In-progress operations
- Memory or CPU usage
- Cache size
- Pool utilization (database connections, thread pools)

**Key differences from Counter/Histogram:**
- **Pull-based, not push** - You don't call `.record()`, DashFrog calls your callback
- **Sampled periodically** - Values are fetched on a schedule, not on every event
- **Current state** - Reports the value at the time of sampling, not accumulated
- **Can decrease** - Unlike counters, gauges can go up or down
- **Multiple values per callback** - One callback yields values for all customers

## Metric Parameters

### Required Parameters

- **`name`** (str): Metric name (use snake_case)
- **`labels`** (list[str]): Label names for dimensions (can be empty)
- **`pretty_name`** (str): Human-readable name shown in UI
- **`unit`** (str): Unit of measurement (e.g., "seconds", "bytes", "count")

### Example

```python
from dashfrog.metrics import Counter

imports_counter = Counter(
    name="customer_imports",           # Internal name
    labels=["status", "source"],        # Dimensions
    pretty_name="Customer Imports",     # Display name
    unit="count"                        # Unit
)

# Use with labels
imports_counter.add(1, tenant="acme-corp", status="success", source="api")
imports_counter.add(1, tenant="acme-corp", status="failed", source="sftp")
```

## Best Practices

### Initialize Metrics at Module Level

Initialize metrics once, use them everywhere:

```python
# metrics.py
from dashfrog.metrics import Counter, Histogram, Gauge, GaugeValue

# Initialize at module level
api_calls = Counter(
    name="api_calls",
    labels=["method"],
    pretty_name="API Calls",
    unit="count"
)

request_duration = Histogram(
    name="request_duration_seconds",
    labels=["endpoint"],
    pretty_name="Request Duration",
    unit="seconds"
)

active_requests = Gauge(
    name="active_requests",
    labels=[],
    pretty_name="Active Requests",
    unit="count"
)
```

```python
# views.py
from . import metrics

@app.get("/users")
def get_users():
    metrics.api_calls.add(1, tenant=customer_id, method="GET")
    # ...
```

### Keep Label Cardinality Low

Aim for <100 unique values per label:

**✅ Good labels:**
- HTTP method (GET, POST, PUT, DELETE)
- Status code (200, 404, 500)
- Environment (prod, staging, dev)
- Feature flags (enabled, disabled)
- Error types (validation, timeout, auth)

**❌ Avoid high-cardinality labels:**
- User IDs
- Request IDs
- Timestamps
- URLs with parameters
- Email addresses

### Gauge Callbacks Should Be Fast

Gauge callbacks run periodically during metric collection. Keep them lightweight:

```python
# ✅ Good - fast query
def get_queue_depth(timeout_seconds: int):
    for customer_id, depth in database.query("SELECT customer_id, count(*) FROM queue GROUP BY customer_id"):
        yield GaugeValue(value=depth, tenant=customer_id, labels={})

# ❌ Bad - slow operation
def get_queue_depth(timeout_seconds: int):
    for customer_id in get_all_customers():  # Could be thousands
        depth = expensive_calculation(customer_id)  # Slow per customer
        yield GaugeValue(value=depth, tenant=customer_id, labels={})
```

## Complete Example

Want to see metrics in action? Check out our [demo application](../examples/demo-app/README.md) that simulates a data import service.


