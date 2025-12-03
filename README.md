# DashFrog

Customer-scoped observability for B2B SaaS

![Screenshot or GIF placeholder]

## What is DashFrog?

DashFrog is open-source observability built around your customers, not your infrastructure.

It sits on OpenTelemetry but abstracts away the complexity. Customer namespaces are auto-created as you push data. Anyone on your team can explore what's happening with a customer — no PromQL, no trace IDs.

**Key Features:**
- 🎯 **Customer-first** - Organize telemetry by customer, not infrastructure
- ⚡ **Zero config** - Customer namespaces auto-created as data arrives
- 🔍 **No query languages** - Explore without PromQL or trace IDs
- 📊 **Shareable insights** - Give customers visibility into their own data

## Deploying DashFrog

You can deploy DashFrog either through docker compose or by using the provided helm chart.

For configuration options, see the [Configuration Guide](docs/configuration.md).

### Docker Compose

**Quick start** (works immediately with defaults):

```bash
cd dashfrog
docker compose up -d
```

Access at `http://localhost:8000` (login: `admin` / `admin`).

**Production deployment** (uses pre-built images):

```bash
# Download configuration files
mkdir -p dashfrog/deploy/docker && cd dashfrog
curl -O https://raw.githubusercontent.com/[your-org]/dashfrog/main/dashfrog/docker-compose.production.yml
curl -O https://raw.githubusercontent.com/[your-org]/dashfrog/main/dashfrog/.env.example
curl -o deploy/docker/otel-collector-config.yml https://raw.githubusercontent.com/[your-org]/dashfrog/main/dashfrog/deploy/docker/otel-collector-config.yml
curl -o deploy/docker/prometheus.yml https://raw.githubusercontent.com/[your-org]/dashfrog/main/dashfrog/deploy/docker/prometheus.yml

# Configure
cp .env.example .env
# Edit .env with production secrets (API keys, passwords, etc.)

# Deploy
docker compose -f docker-compose.production.yml up -d
```

This deploys:
- **DashFrog API** on port 8000
- **PostgreSQL** for flow and metadata storage
- **Prometheus** for metrics storage
- **OpenTelemetry Collector** on ports 4317 (gRPC) and 4318 (HTTP)

→ See [Configuration Guide](docs/configuration.md) for detailed environment variable documentation.

### Helm

**Quick start** (includes PostgreSQL and Prometheus):

```bash
helm install dashfrog oci://registry-1.docker.io/dashfrog/dashfrog \
  --version 0.1.0 \
  -n dashfrog --create-namespace
```

Access via port-forward:
```bash
kubectl port-forward -n dashfrog svc/dashfrog 8000:8000
```

**Production deployment**:

```bash
# Create secret with strong credentials
kubectl create namespace dashfrog
kubectl create secret generic dashfrog-secrets \
  --namespace dashfrog \
  --from-literal=postgres-password=$(openssl rand -base64 32) \
  --from-literal=api-password=YOUR_SECURE_PASSWORD \
  --from-literal=api-secret-key=$(openssl rand -hex 32)

# Install with custom values
helm install dashfrog oci://registry-1.docker.io/dashfrog/dashfrog \
  --version 0.1.0 \
  -n dashfrog \
  --set api.secrets.existingSecret=dashfrog-secrets \
  --set api.ingress.enabled=true \
  --set api.ingress.hosts[0].host=dashfrog.yourdomain.com
```

→ See the [Helm Chart README](dashfrog/deploy/helm/dashfrog/README.md) for detailed configuration options.

## Pushing data

### Setup

TODO: explain how to use dashfrog sdk


### Flows

Flows let you follow a distributed workflow as logical steps.

You define a flow in your code. DashFrog tracks it across services using OpenTelemetry. Your support team sees "customer X's import is stuck at validation" — not span IDs and service graphs.

TODO show code snippet and show screenshot of how this looks like

### Metrics

Metrics use standard OTel under the hood. DashFrog presents them so you don't need to know what a gauge, counter, or histogram is.

TODO show code snippet and show screenshot of how this looks like



## Notebooks

Notebooks let you build simple views that combine flows and metrics for a customer. 

You can share notebooks directly with customers — give them visibility into their own data without building a custom dashboard.

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

[TODO]