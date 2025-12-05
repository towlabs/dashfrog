# DashFrog

Customer-scoped observability for B2B SaaS

![DashFrog Status Page](docs/assets/main.png)

## What is DashFrog?

DashFrog is open-source observability built around your customers, not your infrastructure.

It sits on OpenTelemetry but abstracts away the complexity. Customer namespaces are auto-created as you push data. Anyone on your team can explore what's happening with a customer — no PromQL, no trace IDs.

**Key Features:**
- 🎯 **Customer-first** - Organize telemetry by customer, not infrastructure
- ⚡ **Zero config** - Customer namespaces auto-created as data arrives
- 🔍 **No query languages** - Explore without PromQL or trace IDs
- 📊 **Shareable insights** - Give customers visibility into their own data

## Deploying DashFrog

**Quick start:**

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/towlabs/dashfrog/main/bin/deploy)"
```

This installs DashFrog with Docker Compose and exposes:
- **API** on http://localhost:8000 (login: `admin` / `admin`)
- **OTLP endpoints** on ports 4317 (gRPC) and 4318 (HTTP)

Once installed, proceed to the next section to start pushing data.

> **For production:** See the [Deployment Guide](docs/deployment.md) for Kubernetes, custom configuration, and security hardening.

## Pushing data

### Setup

Install the DashFrog SDK:

```bash
pip install dashfrog fastapi
```

Initialize DashFrog in your application:

```python
from dashfrog import setup

setup()  # Reads from environment variables
```

By default, `setup()` uses the same credentials from the deployment above. If you customized the deployment `.env` file, set matching environment variables in your application:

```bash
export DASHFROG_OTLP_ENDPOINT=grpc://localhost:4317
export DASHFROG_OTLP_AUTH_TOKEN=pwd  # Match deployment
export DASHFROG_POSTGRES_HOST=localhost
export DASHFROG_POSTGRES_PASSWORD=postgres  # Match deployment
```

### Flows

Flows let you follow a distributed workflow as logical steps.

You define a flow in your code. DashFrog tracks it across services using OpenTelemetry. Your support team sees "customer X's import is stuck at validation" — not span IDs and service graphs.

```python
from dashfrog import flow, step

# Start a flow for a customer
with flow.start(
    name="customer_data_import",  # flow name
    tenant="acme-corp",  # tenant name
    env="prod"  # optional labels
):
    # Each step is tracked
    with step.start("validate_data"):
        # validation logic
        validate_csv(file)

    with step.start("transform_data"):
        # transformation logic
        transform(data)

    with step.start("load_to_database"):
        # database logic
        db.insert(data)
```

Flow data is automatically available in notebooks, where you can query and visualize workflows per customer.

→ See [Flows documentation](docs/flows.md) for distributed flows, error handling, and advanced usage.

### Metrics

Metrics use standard OTel under the hood. DashFrog presents them so you don't need to know what a gauge, counter, or histogram is.

```python
from fastapi import FastAPI
from dashfrog import metrics

app = FastAPI()

computation_duration = metrics.Histogram(
    "computation_duration", labels=["env"], pretty_name="Computation Duration", unit="s"
)
computation_count = metrics.Counter("computation_count", labels=["env"], pretty_name="Computations")

@app.get("/heavy-computation/{customer_id}/{env}")
async def heavy_computation(customer_id: str, env: str):
    duration = sleep(3)
    computation_duration.record(duration, tenant=customer_id, env=env)
    computation_count.add(1, tenant=customer_id, env=env)
```

Metrics data is automatically available in notebooks for querying and visualization.

→ See [Metrics documentation](docs/metrics.md) for histograms, percentiles, labels, and best practices.

## Notebooks

Notebooks are customer-specific dashboards built with a block-based editor. Each notebook combines metrics and flows to give you (or your customers) a complete view of what's happening.

### Key Features

**Drill-down** - Click any metric or flow to explore historical data and dig deeper

**Shareable** - Make a notebook public and share the URL directly with your customer

**Time annotations** - Mark releases, incidents, or important events on the timeline for context

### Use Cases

**Support dashboards** - Give your support team a single page to understand what's happening with a customer

**Customer visibility** - Share a public notebook so customers can see their own metrics and workflows

**Incident review** - Add time annotations to document what happened during an outage

**Release tracking** - Annotate deployment windows to see before/after impact


## Try the Demo

Want to see DashFrog in action? Download and run demo scripts that simulate data imports with flows and metrics.

```bash
pip install dashfrog

# Download demo scripts
wget https://raw.githubusercontent.com/towlabs/dashfrog/main/dashfrog/demo-app/sync_flow.py
wget https://raw.githubusercontent.com/towlabs/dashfrog/main/dashfrog/demo-app/async_flow.py
wget https://raw.githubusercontent.com/towlabs/dashfrog/main/dashfrog/demo-app/metrics.py

# Run them
python sync_flow.py     # Synchronous flow example
python async_flow.py    # Async flow example
python metrics.py       # Metrics example
```

These scripts generate flows and metrics for multiple customers. Some imports succeed, some fail — you can start exploring the data in notebooks.

## Roadmap

See [GitHub Issues](link) for what's planned.

Ideas we're exploring:
- Helpdesk integrations (Zendesk, Intercom)
- Alerting rules
- External API data sources

## Community

- [Discord](link)
- [Contributing](link)

## License

MIT License - see [LICENSE](LICENSE) for details.