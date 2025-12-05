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

After editing, restart:
```bash
cd dashfrog
docker compose restart
```

### What Gets Deployed

The stack includes:
- **DashFrog API** - FastAPI backend with authentication (port 8000)
- **PostgreSQL** - Stores flow metadata and definitions (port 5432)
- **Prometheus** - Metrics storage with native histogram support (port 9090)
- **OpenTelemetry Collector** - Ingests OTLP data with authentication (ports 4317, 4318)

## Kubernetes (Helm)

### Prerequisites
- Kubernetes cluster (1.21+)
- Helm 3.x installed
- kubectl configured

### Quick Install

Install with defaults (includes PostgreSQL and Prometheus):

```bash
helm install dashfrog oci://ghcr.io/towlabs/dashfrog \
  --version 0.1.0 \
  -n dashfrog --create-namespace
```

Access via port-forward:
```bash
kubectl port-forward -n dashfrog svc/dashfrog 8000:8000
```

### Production Install

1. **Create secrets:**
   ```bash
   kubectl create namespace dashfrog

   kubectl create secret generic dashfrog-secrets \
     --namespace dashfrog \
     --from-literal=postgres-password=$(openssl rand -base64 32) \
     --from-literal=api-password=YOUR_SECURE_PASSWORD \
     --from-literal=api-secret-key=$(openssl rand -hex 32) \
     --from-literal=otlp-auth-token=$(openssl rand -hex 32)
   ```

2. **Create values.yaml:**
   ```yaml
   api:
     secrets:
       existingSecret: dashfrog-secrets

     ingress:
       enabled: true
       className: nginx
       hosts:
         - host: dashfrog.yourdomain.com
           paths:
             - path: /
               pathType: Prefix
       tls:
         - secretName: dashfrog-tls
           hosts:
             - dashfrog.yourdomain.com

   postgresql:
     enabled: true
     auth:
       existingSecret: dashfrog-secrets
       secretKeys:
         adminPasswordKey: postgres-password

   prometheus:
     enabled: true
     persistence:
       enabled: true
       size: 50Gi
   ```

3. **Install with custom values:**
   ```bash
   helm install dashfrog oci://ghcr.io/towlabs/dashfrog \
     --version 0.1.0 \
     -n dashfrog \
     -f values.yaml
   ```

### Using External Services

To use managed PostgreSQL or Prometheus:

```yaml
postgresql:
  enabled: false  # Don't deploy PostgreSQL

externalPostgresql:
  host: postgres.example.com
  port: 5432
  database: dashfrog
  username: dashfrog
  existingSecret: external-postgres-secret
  existingSecretPasswordKey: password

prometheus:
  enabled: false  # Don't deploy Prometheus

externalPrometheus:
  endpoint: http://prometheus.example.com:9090
```

### Upgrading

```bash
helm repo update
helm upgrade dashfrog oci://ghcr.io/towlabs/dashfrog \
  --version 0.2.0 \
  -n dashfrog \
  -f values.yaml
```

## Configuring Your Application

After deploying DashFrog, configure your application to send telemetry.

### Required Environment Variables

Set these where your app runs:

```bash
# Telemetry
DASHFROG_OTLP_ENDPOINT=grpc://localhost:4317  # Or your DashFrog host
DASHFROG_OTLP_AUTH_TOKEN=pwd                   # Match deployment

# Database (for metadata registration)
DASHFROG_POSTGRES_HOST=localhost              # Or your DashFrog host
DASHFROG_POSTGRES_PASSWORD=postgres           # Match deployment
```

> **Important:** `DASHFROG_OTLP_AUTH_TOKEN` and `DASHFROG_POSTGRES_PASSWORD` must match the values from your DashFrog deployment.

### SDK Setup

```python
from dashfrog import setup

setup()  # Reads from environment variables
```

By default, `setup()` uses the same credentials from the deployment. If you customized the deployment, set matching environment variables in your application.

## Monitoring & Troubleshooting

### Health Checks

Check if services are running:
```bash
# Docker Compose
docker compose ps

# API health endpoint
curl http://localhost:8000/api/health

# Kubernetes
kubectl get pods -n dashfrog
```

### Logs

**Docker Compose:**
```bash
docker compose logs -f                 # All services
docker compose logs -f dashfrog-api    # Just API
```

**Kubernetes:**
```bash
kubectl logs -n dashfrog -l app=dashfrog -f
```

### Common Issues

**Connection refused on localhost:5432:**
- Make sure Postgres port is mapped in docker-compose.yml
- Check `DASHFROG_POSTGRES_HOST` is set correctly in your app

**OTLP authentication fails:**
- Verify `DASHFROG_OTLP_AUTH_TOKEN` matches between deployment and app
- Check collector logs: `docker compose logs otel-collector`

**Data not appearing in UI:**
- Check if metrics are reaching Prometheus: `curl http://localhost:9090/api/v1/label/__name__/values`
- Verify OTLP collector is receiving data: `docker compose logs otel-collector`

## Ports Reference

DashFrog uses these fixed ports:

- `8000` - API/UI
- `4317` - OTLP gRPC
- `4318` - OTLP HTTP
- `5432` - PostgreSQL (for SDK metadata registration)
- `9090` - Prometheus

To change ports, edit `docker-compose.yml` directly.
