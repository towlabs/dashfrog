# Deployment Guide

## Quick Start (Docker Compose)

For local development or testing, use the installer:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/towlabs/dashfrog/main/bin/deploy)"
```

This installs DashFrog with Docker Compose and exposes:
- **API/UI** on http://localhost:8000 (login: `admin` / `admin`)
- **OTLP endpoints** on ports 4317 (gRPC) and 4318 (HTTP)

## Customizing the Deployment

After running the deploy script, you'll have a `dashfrog/` directory with a `.env` file and `docker-compose.yml`.

### Environment Variables

The installer creates default values. Edit `dashfrog/.env` to customize:

```bash
# Required secrets (change for production)
DASHFROG_API_SECRET_KEY=change-this-secret-key-in-production
DASHFROG_POSTGRES_PASSWORD=postgres
DASHFROG_OTLP_AUTH_TOKEN=pwd
DASHFROG_API_PASSWORD=admin
```

After editing, recreate containers to pick up new values:
```bash
cd dashfrog
docker compose down -v  # Removes containers and volumes
docker compose up -d    # Recreates with new values
```

**Note:** The `-v` flag removes volumes including the database.

### What Gets Deployed

The stack includes:
- **DashFrog API** - FastAPI backend with authentication (port 8000)
- **PostgreSQL** - Stores flow metadata and definitions (port 5432)
- **Prometheus** - Metrics storage with native histogram support (port 9090)
- **OpenTelemetry Collector** - Ingests OTLP data with authentication (ports 4317, 4318)

## Kubernetes (Helm)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/towlabs/dashfrog.git
   cd dashfrog
   ```

2. **Create secrets:**
   ```bash
   kubectl create namespace dashfrog

   kubectl create secret generic dashfrog-secrets \
     --namespace dashfrog \
     --from-literal=postgres-password=YOUR_POSTGRES_PASSWORD \
     --from-literal=api-password=YOUR_API_PASSWORD \
     --from-literal=api-secret-key=YOUR_SECRET_KEY \
     --from-literal=otlp-auth-token=YOUR_OTLP_TOKEN
   ```

   Replace the placeholder values with your own secure passwords. You'll need `otlp-auth-token` and `postgres-password` to configure your application.

3. **Install the chart:**
   ```bash
   helm install dashfrog dashfrog/deploy/helm/dashfrog \
     -n dashfrog \
     --set api.secrets.existingSecret=dashfrog-secrets \
     --set postgresql.auth.existingSecret=dashfrog-secrets
   ```

### Accessing DashFrog

**Option 1: Port Forward (testing)**
```bash
kubectl port-forward -n dashfrog svc/dashfrog 8000:8000
```

Then access at http://localhost:8000

**Option 2: Ingress**

Create your own Ingress resource pointing to service `dashfrog` on port `8000` in the `dashfrog` namespace.

### Configuring Your Application

After deploying DashFrog, configure your application to send telemetry.

**Set these environment variables** where your application runs:

```bash
# OTLP endpoint
DASHFROG_OTLP_ENDPOINT=grpc://dashfrog.dashfrog.svc.cluster.local:4317
# Authentication token (from the secret you created in step 2)
DASHFROG_OTLP_AUTH_TOKEN=<otlp-auth-token>
# PostgreSQL connection (for metadata registration)
DASHFROG_POSTGRES_HOST=dashfrog-postgresql.dashfrog.svc.cluster.local
DASHFROG_POSTGRES_PASSWORD=<postgres-password>
```

**In your application code:**
```python
from dashfrog import setup

setup()  # Reads from environment variables
```

### Advanced Configuration

**Use external PostgreSQL or Prometheus:**

Create a `values.yaml`:
```yaml
postgresql:
  enabled: false

externalPostgresql:
  host: postgres.example.com
  port: 5432
  database: dashfrog
  username: dashfrog
  password: your-password

prometheus:
  enabled: false

externalPrometheus:
  endpoint: http://prometheus.example.com:9090
```

**Adjust resource limits:**
```yaml
api:
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

prometheus:
  persistence:
    enabled: true
    size: 100Gi
```

**Upgrading:**
```bash
git pull

# Upgrade the release
helm upgrade dashfrog ./deploy/helm/dashfrog -n dashfrog --reuse-values

# Force pods to restart and pull the new image
kubectl rollout restart deployment/dashfrog -n dashfrog
```
