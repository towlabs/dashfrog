"""DashFrog CLI entry point."""

import argparse
import sys


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="dashfrog",
        description="DashFrog - Business Observability on OpenTelemetry",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Server command
    server_parser = subparsers.add_parser("serve", help="Start the DashFrog API server")
    server_parser.add_argument("--host", default="0.0.0.0", help="Host to bind to (default: 0.0.0.0)")
    server_parser.add_argument("--port", type=int, default=8000, help="Port to bind to (default: 8000)")
    server_parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")

    # Version command
    subparsers.add_parser("version", help="Show version information")

    args = parser.parse_args()

    if args.command == "serve":
        run_server(args.host, args.port, args.reload)
    elif args.command == "version":
        show_version()
    else:
        parser.print_help()
        sys.exit(1)


def run_server(host: str, port: int, reload: bool):
    """Start the API server."""
    try:
        import uvicorn

        from dashfrog import Config, setup
    except ImportError:
        print("Error: API dependencies not installed. Install with: pip install dashfrog[api]")
        sys.exit(1)

    setup(Config())
    print(f"Starting DashFrog API server on {host}:{port}")
    uvicorn.run("dashfrog.api:app", host=host, port=port, reload=reload)


def show_version():
    """Show version information."""
    from importlib.metadata import version

    try:
        v = version("dashfrog")
    except Exception:
        v = "0.1.0"
    print(f"dashfrog version {v}")


if __name__ == "__main__":
    main()
