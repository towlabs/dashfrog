# DashFrog Helm Chart

This Helm chart deploys DashFrog on Kubernetes.

## Prerequisites

- Kubernetes 1.24+
- Helm 3.8+
- PV provisioner support (for PostgreSQL and Prometheus persistence)

## Installation

### Quick Start (Published Chart)

Install from OCI registry (includes PostgreSQL and Prometheus):

```bash
helm install dashfrog oci://registry-1.docker.io/dashfrog/dashfrog \
  --version 0.1.0 \
  -n dashfrog --create-namespace
```

### Local Development Install

Install from source:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add bitnami https://charts.bitnami.com/bitnami
helm dependency update

helm install dashfrog . -n dashfrog --create-namespace
```

### Production Installation

For production, create a secret with your credentials first:

```bash
kubectl create namespace dashfrog

kubectl create secret generic dashfrog-secrets \
  --namespace dashfrog \
  --from-literal=postgres-password=$(openssl rand -base64 32) \
  --from-literal=api-password=YOUR_SECURE_PASSWORD \
  --from-literal=api-secret-key=$(openssl rand -hex 32)
```

Install with custom values:

```bash
helm install dashfrog oci://registry-1.docker.io/dashfrog/dashfrog \
  --version 0.1.0 \
  -n dashfrog \
  --set api.secrets.existingSecret=dashfrog-secrets \
  --set api.ingress.enabled=true \
  --set api.ingress.hosts[0].host=dashfrog.yourdomain.com
```

Or use a values file:

```bash
cat > production-values.yaml <<EOF
api:
  replicaCount: 2
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
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 200m
      memory: 512Mi

postgresql:
  primary:
    persistence:
      size: 50Gi

prometheus:
  server:
    persistentVolume:
      size: 100Gi
    retention: "30d"
EOF

helm install dashfrog oci://registry-1.docker.io/dashfrog/dashfrog \
  --version 0.1.0 \
  -n dashfrog \
  -f production-values.yaml
```

## Accessing DashFrog

After installation, follow the instructions in the NOTES output to access DashFrog.

For quick access with port-forwarding:

```bash
export POD_NAME=$(kubectl get pods -n dashfrog -l "app.kubernetes.io/name=dashfrog" -o jsonpath="{.items[0].metadata.name}")
kubectl port-forward -n dashfrog $POD_NAME 8000:8000
```

Then visit http://localhost:8000

## Sending Telemetry

Point your OTLP exporter to the collector service:

```bash
# Get the collector service name
kubectl get svc -n dashfrog -l app.kubernetes.io/component=otel-collector

# From within the cluster:
# gRPC: dashfrog-otel-collector:4317
# HTTP: dashfrog-otel-collector:4318
```

For external access, use port-forwarding or configure an ingress for the collector.

## Configuration

See [values.yaml](values.yaml) for all configuration options.

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `api.replicaCount` | Number of API replicas | `1` |
| `api.image.repository` | DashFrog image repository | `dashfrog/dashfrog` |
| `api.image.tag` | DashFrog image tag | `""` (uses Chart.appVersion) |
| `api.secrets.existingSecret` | Use existing secret for credentials | `""` |
| `api.ingress.enabled` | Enable ingress | `false` |
| `otelCollector.enabled` | Deploy OpenTelemetry Collector | `true` |
| `postgresql.enabled` | Deploy PostgreSQL | `true` |
| `postgresql.primary.persistence.size` | PostgreSQL PVC size | `10Gi` |
| `prometheus.enabled` | Deploy Prometheus | `true` |
| `prometheus.server.persistentVolume.size` | Prometheus PVC size | `50Gi` |
| `prometheus.server.retention` | Metrics retention period | `15d` |

### Using External Services

To use external PostgreSQL, Prometheus, or OTLP collector instead of the bundled ones:

```yaml
api:
  config:
    postgresHost: "external-postgres.example.com"
    postgresPort: "5432"
    prometheusEndpoint: "http://external-prometheus:9090"

postgresql:
  enabled: false

prometheus:
  enabled: false

otelCollector:
  enabled: false
```

## Upgrading

```bash
helm upgrade dashfrog . -n dashfrog
```

## Uninstalling

```bash
helm uninstall dashfrog -n dashfrog
```

Note: PVCs are not automatically deleted. To remove them:

```bash
kubectl delete pvc -n dashfrog --all
```

## Publishing the Chart

To publish the Helm chart to an OCI registry:

```bash
# Package the chart
helm package .

# Login to Docker Hub (or your OCI registry)
helm registry login registry-1.docker.io -u YOUR_USERNAME

# Push to registry
helm push dashfrog-0.1.0.tgz oci://registry-1.docker.io/dashfrog
```

For GitHub Container Registry:

```bash
echo $GITHUB_TOKEN | helm registry login ghcr.io -u YOUR_USERNAME --password-stdin
helm push dashfrog-0.1.0.tgz oci://ghcr.io/YOUR_ORG
```

## Troubleshooting

### Check pod status

```bash
kubectl get pods -n dashfrog
```

### View logs

```bash
# DashFrog API logs
kubectl logs -n dashfrog -l app.kubernetes.io/name=dashfrog

# OTEL Collector logs
kubectl logs -n dashfrog -l app.kubernetes.io/component=otel-collector

# PostgreSQL logs
kubectl logs -n dashfrog -l app.kubernetes.io/name=postgresql

# Prometheus logs
kubectl logs -n dashfrog -l app.kubernetes.io/name=prometheus
```

### Common Issues

**Pods in CrashLoopBackOff**: Check logs for errors. Often caused by:
- Database connection issues
- Missing or incorrect secrets
- Resource limits too low

**Can't access the UI**: Ensure ingress is configured or use port-forwarding.

**No metrics appearing**: Check that:
- OTLP collector is running
- Prometheus is scraping the collector
- Your application is sending telemetry to the correct endpoint
