# DashFrog Installation Scripts

## deploy

One-line installer for DashFrog.

### Usage

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/towlabs/dashfrog/main/bin/deploy)"
```

### What it does

1. Checks for Docker and Docker Compose
2. Creates a `dashfrog/` directory
3. Downloads `docker-compose.yml` and config files
4. Generates `.env` with random secrets
5. Pulls Docker images
6. Starts the stack
7. Waits for health check
8. Prints access information

### Generated files

```
dashfrog/
├── .env                              # Generated with random secrets
├── docker-compose.yml                # Downloaded from GitHub
└── deploy/
    └── docker/
        ├── otel-collector-config.yml
        └── prometheus.yml
```

### Customizing

After installation, edit `dashfrog/.env` and restart:

```bash
cd dashfrog
# Edit .env
docker compose restart
```

### Requirements

- Docker
- Docker Compose
- curl
- openssl (for secret generation)

### Development

To test locally:

```bash
cd /path/to/dashfrog
./bin/deploy
```

The script will use the local repository instead of downloading from GitHub if you run it from the repo root.
