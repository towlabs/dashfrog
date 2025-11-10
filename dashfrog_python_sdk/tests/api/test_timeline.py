"""Tests for Timeline API endpoints."""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from dashfrog_python_sdk import timeline
from dashfrog_python_sdk.api import app


class TestTimelineAPI:
    """Tests for Timeline API endpoints."""

    def test_get_all_timeline_labels(self, setup_dashfrog):
        """Test that get_all_timeline_labels returns the correct label values from timeline events."""

        timeline.add("order_placed", "🛒", tenant="timeline_tenant_1", customer_id="alice", order_status="pending")
        timeline.add("order_shipped", "🚚", tenant="timeline_tenant_2", customer_id="bob", order_status="shipped")
        timeline.add("order_delivered", "✅", tenant="timeline_tenant_1", customer_id="alice", order_status="delivered")

        client = TestClient(app)
        now = datetime.now(timezone.utc)
        start_dt = (now - timedelta(minutes=5)).isoformat()
        end_dt = (now + timedelta(minutes=5)).isoformat()

        response = client.get("/timelines/labels", params={"start_dt": start_dt, "end_dt": end_dt})

        assert response.status_code == 200
        data = response.json()

        assert sorted(data, key=lambda x: x["label"]) == [
            {"label": "customer_id", "values": ["alice", "bob"]},
            {"label": "order_status", "values": ["delivered", "pending", "shipped"]},
            {"label": "tenant", "values": ["timeline_tenant_1", "timeline_tenant_2"]},
        ]
