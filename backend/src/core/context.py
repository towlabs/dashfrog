"""Application context singleton for accessing the app instance globally."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app import Application

_app_instance: "Application | None" = None


def set_app(app: "Application") -> None:
    """
    Set the global app instance.

    Ignores new app instances if one is already set to prevent accidental overwrites.
    """
    global _app_instance

    _app_instance = app


def get_app() -> "Application":
    """Get the global app instance."""
    if _app_instance is None:
        raise RuntimeError("Application not initialized. Call set_app() first.")
    return _app_instance


def is_app_initialized() -> bool:
    """Check if an app instance is already initialized."""
    return _app_instance is not None
