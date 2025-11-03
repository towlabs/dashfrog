# Use Microsoft's Python devcontainer base image
FROM mcr.microsoft.com/devcontainers/python:3.12

# Install system dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set working directory
WORKDIR /workspaces/dashfrog_python_sdk

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_CACHE_DIR=/home/vscode/.cache/uv

# Copy project files
COPY --chown=vscode:vscode pyproject.toml ./

# Switch to non-root user
USER vscode

# Install Python dependencies using uv
RUN uv sync --all-extras || true

# Default command
CMD ["/bin/bash"]
