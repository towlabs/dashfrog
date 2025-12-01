"""Tests for Notebook API endpoints."""

import uuid

from fastapi.testclient import TestClient

from dashfrog_python_sdk.api import app


class TestNotebookAPI:
    """Tests for Notebook API endpoints."""

    def test_create_notebook(self, setup_dashfrog):
        """Test creating a new notebook."""
        client = TestClient(app)
        notebook_id = uuid.uuid4()

        response = client.post(
            "/api/notebooks/create",
            json={
                "tenant": "test-tenant",
                "notebook": {
                    "id": str(notebook_id),
                    "title": "Test Notebook",
                    "description": "A test notebook",
                    "blocks": [{"type": "text", "content": "Hello World"}],
                },
            },
        )

        assert response.status_code == 200

    def test_list_notebooks(self, setup_dashfrog):
        """Test listing notebooks for a tenant."""
        client = TestClient(app)
        notebook_id = uuid.uuid4()

        # Create a notebook first
        client.post(
            "/api/notebooks/create",
            json={
                "tenant": "test-tenant",
                "notebook": {
                    "id": str(notebook_id),
                    "title": "Test Notebook",
                    "description": "A test notebook",
                    "blocks": [{"type": "text", "content": "Hello World"}],
                },
            },
        )

        # List notebooks
        response = client.get("/api/notebooks/list", params={"tenant": "test-tenant"})

        assert response.status_code == 200
        notebooks = response.json()
        assert len(notebooks) == 1
        assert notebooks[0]["title"] == "Test Notebook"
        assert notebooks[0]["description"] == "A test notebook"
        assert notebooks[0]["blocks"] == [{"type": "text", "content": "Hello World"}]

    def test_update_notebook(self, setup_dashfrog):
        """Test updating an existing notebook."""
        client = TestClient(app)
        notebook_id = uuid.uuid4()

        # Create a notebook first
        client.post(
            "/api/notebooks/create",
            json={
                "tenant": "test-tenant",
                "notebook": {
                    "id": str(notebook_id),
                    "title": "Original Title",
                    "description": "Original description",
                    "blocks": [{"type": "text", "content": "Original content"}],
                },
            },
        )

        # Update the notebook
        response = client.post(
            "/api/notebooks/update",
            json={
                "id": str(notebook_id),
                "title": "Updated Title",
                "description": "Updated description",
                "blocks": [{"type": "text", "content": "Updated content"}],
            },
        )

        assert response.status_code == 200

        # Verify the update
        list_response = client.get("/api/notebooks/list", params={"tenant": "test-tenant"})
        notebooks = list_response.json()
        assert len(notebooks) == 1
        assert notebooks[0]["title"] == "Updated Title"
        assert notebooks[0]["description"] == "Updated description"
        assert notebooks[0]["blocks"] == [{"type": "text", "content": "Updated content"}]

    def test_delete_notebook(self, setup_dashfrog):
        """Test deleting a notebook."""
        client = TestClient(app)
        notebook_id = uuid.uuid4()

        # Create a notebook first
        client.post(
            "/api/notebooks/create",
            json={
                "tenant": "test-tenant",
                "notebook": {
                    "id": str(notebook_id),
                    "title": "Test Notebook",
                    "description": "A test notebook",
                    "blocks": [{"type": "text", "content": "Hello World"}],
                },
            },
        )

        # Delete the notebook
        response = client.delete(f"/api/notebooks/{notebook_id}")

        assert response.status_code == 200

        # Verify the deletion
        list_response = client.get("/api/notebooks/list", params={"tenant": "test-tenant"})
        notebooks = list_response.json()
        assert len(notebooks) == 0
