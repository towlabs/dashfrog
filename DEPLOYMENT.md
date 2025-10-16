# Dashfrog Deployment Guide

This guide explains how to build and deploy the Dashfrog application stack to Kubernetes using the Helm chart.

## Architecture Overview

The Dashfrog stack consists of:
- **Backend**: FastAPI application (Python with UV package manager)
- **Frontend**: React application (Vite + npm)
- **PostgreSQL**: Relational database
- **ClickHouse**: Analytics database
- **Prometheus**: Metrics collection
- **Collector**: OpenTelemetry collector

## Building Docker Images

### Backend

```bash
cd backend
docker build -t ghcr.io/towlabs/dashfrog/backend:latest .
docker push ghcr.io/towlabs/dashfrog/backend:latest
```

### Frontend

```bash
cd frontend
docker build -t ghcr.io/towlabs/dashfrog/frontend:latest .
docker push ghcr.io/towlabs/dashfrog/frontend:latest
```

### Collector (if needed)

```bash
cd collector
docker build -t ghcr.io/towlabs/dashfrog/collector:latest .
docker push ghcr.io/towlabs/dashfrog/collector:latest
```

## Deploying with Helm

### Development Deployment

```bash
cd dashfrog_kube

# Install the chart
helm install dashfrog . \
  --namespace dashfrog \
  --create-namespace

# Or upgrade if already installed
helm upgrade --install dashfrog . \
  --namespace dashfrog
```

### Production Deployment

1. **Update production values**: Edit `values-production.yaml` and change:
   - Database passwords (ClickHouse, PostgreSQL)
   - Image tags to specific versions
   - Resource limits based on your needs
   - Storage classes and sizes

2. **Deploy**:

```bash
cd dashfrog_kube

# Install with production values
helm install dashfrog . \
  --namespace dashfrog \
  --create-namespace \
  --values values-production.yaml

# Or upgrade
helm upgrade --install dashfrog . \
  --namespace dashfrog \
  --values values-production.yaml
```

## Configuration

### Backend Configuration

The backend reads configuration from:
1. **ConfigMap**: `/app/config/config.yaml` - Contains database connections and logging settings
2. **Secrets**: Environment variables for sensitive data (passwords)

Key environment variables:
- `CLICKHOUSE_PASSWORD`: ClickHouse database password
- `POSTGRESQL_PASSWORD`: PostgreSQL database password
- `PORT`: HTTP server port (default: 8080)
- `RELEASE`: Application version

### Frontend Configuration

The frontend configuration is simple:
- `BACKEND_URL`: URL to reach the backend API (default: `http://dashfrog-backend:8080`)

### Database Access

The backend can access:
- **ClickHouse**: `dashfrog-clickhouse:9000` (native) or `:8123` (HTTP)
- **PostgreSQL**: `dashfrog-postgresql:5432`

Passwords are automatically injected via Kubernetes secrets.

## Accessing the Application

### Port Forwarding (Development)

```bash
# Frontend
kubectl port-forward -n dashfrog svc/dashfrog-frontend 8080:8080

# Backend API
kubectl port-forward -n dashfrog svc/dashfrog-backend 8080:8080

# Prometheus
kubectl port-forward -n dashfrog svc/dashfrog-prometheus 9090:9090
```

### Ingress (Production)

Configure the ingress in `values.yaml` or `values-production.yaml`:

```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: dashfrog.example.com
      paths:
        - path: /
          pathType: Prefix
          service:
            name: dashfrog-frontend
            port: 8080
        - path: /api
          pathType: Prefix
          service:
            name: dashfrog-backend
            port: 8080
  tls:
    - secretName: dashfrog-tls
      hosts:
        - dashfrog.example.com
```

## Health Checks

All services include health checks:

- **Backend**: `GET /api/health`
- **Frontend**: `GET /health`
- **PostgreSQL**: `pg_isready`
- **ClickHouse**: `GET /ping`

## Monitoring

The stack includes Prometheus for metrics collection. Access the Prometheus UI:

```bash
kubectl port-forward -n dashfrog svc/dashfrog-prometheus 9090:9090
```

Then open http://localhost:9090

## Scaling

### Backend & Frontend

Scale the application services:

```bash
# Scale backend
kubectl scale deployment dashfrog-backend -n dashfrog --replicas=3

# Scale frontend
kubectl scale deployment dashfrog-frontend -n dashfrog --replicas=3
```

Or update the `replicaCount` in values files:

```yaml
backend:
  replicaCount: 3

frontend:
  replicaCount: 3
```

### Databases

For production, consider using managed database services or setting up proper replication.

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n dashfrog
```

### View Logs

```bash
# Backend logs
kubectl logs -n dashfrog -l component=backend -f

# Frontend logs
kubectl logs -n dashfrog -l component=frontend -f

# PostgreSQL logs
kubectl logs -n dashfrog -l component=postgresql -f
```

### Check Configuration

```bash
# View ConfigMap
kubectl get configmap dashfrog-backend-config -n dashfrog -o yaml

# View Secret (base64 encoded)
kubectl get secret dashfrog-secret -n dashfrog -o yaml
```

### Common Issues

1. **Backend can't connect to databases**:
   - Check that database pods are running
   - Verify service names in ConfigMap
   - Check password secrets

2. **Frontend can't reach backend**:
   - Verify `BACKEND_URL` environment variable
   - Check backend service is running
   - Verify network policies if any

3. **Persistent volume issues**:
   - Check PVC status: `kubectl get pvc -n dashfrog`
   - Verify storage class exists: `kubectl get storageclass`

## Uninstalling

```bash
# Uninstall the Helm release
helm uninstall dashfrog -n dashfrog

# Delete the namespace (optional)
kubectl delete namespace dashfrog
```

Note: This will delete all data in persistent volumes unless you have configured volume reclaim policies.
