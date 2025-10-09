# Dashfrog Kubernetes Helm Chart

This Helm chart deploys the Dashfrog observability stack to Kubernetes, including:

- **ClickHouse**: Colomnar database for storing flows & steps from dashfrog project
- **Prometheus**: Metrics collection and alerting
- **Collector**: OpenTelemetry collector for data ingestion

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- Persistent volume support (if using persistent storage)

## Installation

### Basic Installation

```bash
# Add your Helm repository (if applicable)
helm repo add your-repo <repository-url>
helm repo update

# Install with default values
helm install dashfrog ./dashfrog_kube

# Or install with custom values
helm install dashfrog ./dashfrog_kube -f custom-values.yaml
```

### Production Installation

For production deployment, you **MUST** customize the following values:

```yaml
# values.yaml or custom-values.yaml
clickhouse:
  config:
    user: "your-clickhouse-user"
    password: "your-secure-password"  # CHANGE THIS!
    database: "dashfrog"

collector:
  image:
    repository: "your-registry/dashfrog-collector"  # REQUIRED!
    tag: "v1.0.0"  # Use specific version tag

# Optional: Configure persistent storage
clickhouse:
  persistence:
    enabled: true
    size: 50Gi
    storageClass: "fast-ssd"

prometheus:
  persistence:
    enabled: true
    size: 20Gi
    storageClass: "fast-ssd"
```

## Configuration

### ClickHouse Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `clickhouse.enabled` | Enable ClickHouse deployment | `true` |
| `clickhouse.config.user` | ClickHouse username | `"clickhouse"` |
| `clickhouse.config.password` | ClickHouse password | `"change-me-password"` |
| `clickhouse.config.database` | Database name | `"dashfrog"` |
| `clickhouse.persistence.enabled` | Enable persistent storage | `true` |
| `clickhouse.persistence.size` | Storage size | `"10Gi"` |

**Database Migrations**: ClickHouse automatically runs database migrations on startup using an init container. The migrations create the necessary tables for flow tracking:
- `flow_events` - Individual flow events
- `step_events` - Individual step events within flows  
- `flows` - Aggregated flow data
- `flows_mv` - Materialized view for real-time flow aggregation

### Prometheus Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `prometheus.enabled` | Enable Prometheus deployment | `true` |
| `prometheus.config.scrapeInterval` | Scrape interval | `"15s"` |
| `prometheus.config.retention` | Data retention period | `"15d"` |
| `prometheus.persistence.enabled` | Enable persistent storage | `true` |
| `prometheus.persistence.size` | Storage size | `"5Gi"` |

### Collector Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `collector.enabled` | Enable Collector deployment | `true` |
| `collector.image.repository` | Collector image repository | `""` (REQUIRED) |
| `collector.image.tag` | Collector image tag | `"latest"` |
| `collector.config.otlpGrpcPort` | OTLP gRPC port | `4317` |
| `collector.config.otlpHttpPort` | OTLP HTTP port | `4318` |

## Security Considerations

### Secrets Management

The chart uses Kubernetes Secrets for sensitive data like passwords. In production:

1. **Change default passwords** - The default ClickHouse password is `change-me-password`
2. **Use external secret management** - Consider using tools like:
   - HashiCorp Vault
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager

### Network Policies

Consider implementing Kubernetes Network Policies to restrict traffic between components:

```yaml
# Example network policy (not included in chart)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dashfrog-network-policy
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: dashfrog-kube
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: dashfrog-kube
```

## Scaling

### Horizontal Pod Autoscaling

You can enable HPA for the collector:

```yaml
collector:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
```

### Resource Limits

Configure resource limits for production:

```yaml
clickhouse:
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi

prometheus:
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 500m
      memory: 1Gi

collector:
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 500m
      memory: 1Gi
```

## Monitoring

### Accessing Services

The services are exposed as ClusterIP by default. To access them:

1. **Port-forward for testing**:
   ```bash
   # Prometheus UI
   kubectl port-forward svc/dashfrog-prometheus 9090:9090
   
   # ClickHouse HTTP
   kubectl port-forward svc/dashfrog-clickhouse 8123:8123
   ```

2. **Ingress for production**:
   ```yaml
   # Add to values.yaml
   ingress:
     enabled: true
     hosts:
       - host: prometheus.yourdomain.com
         paths:
           - path: /
             pathType: Prefix
             service:
               name: dashfrog-prometheus
               port: 9090
   ```

### Health Checks

All deployments include liveness and readiness probes:

- **ClickHouse**: HTTP GET `/ping`
- **Prometheus**: HTTP GET `/-/healthy` and `/-/ready`
- **Collector**: HTTP GET `/` on debug port

## Troubleshooting

### Common Issues

1. **Collector image not found**:
   - Ensure `collector.image.repository` is set
   - Verify image exists and is accessible

2. **Storage issues**:
   - Check if PVCs are bound: `kubectl get pvc`
   - Verify storage class exists: `kubectl get storageclass`

3. **Service connectivity**:
   - Check service endpoints: `kubectl get endpoints`
   - Verify DNS resolution within cluster

### Logs

View component logs:

```bash
# ClickHouse logs
kubectl logs -l component=clickhouse

# Prometheus logs
kubectl logs -l component=prometheus

# Collector logs
kubectl logs -l component=collector
```

## Upgrading

```bash
# Upgrade with new values
helm upgrade dashfrog ./dashfrog_kube -f new-values.yaml

# Check upgrade status
helm status dashfrog
```

## Uninstalling

```bash
# Uninstall the release
helm uninstall dashfrog

# Clean up PVCs (if desired)
kubectl delete pvc -l app.kubernetes.io/name=dashfrog-kube
```

## Contributing

When modifying this chart:

1. Update version in `Chart.yaml`
2. Test with `helm lint`
3. Validate templates with `helm template`
4. Update this README if configuration changes
