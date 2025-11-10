"""Tests for Flow API endpoints."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import insert

from dashfrog_python_sdk import flow, get_dashfrog_instance
from dashfrog_python_sdk.api import app
from dashfrog_python_sdk.constants import (
    EVENT_FLOW_FAIL,
    EVENT_FLOW_START,
    EVENT_FLOW_SUCCESS,
    EVENT_STEP_FAIL,
    EVENT_STEP_START,
    EVENT_STEP_SUCCESS,
)
from dashfrog_python_sdk.models import FlowEvent


class TestFlowAPI:
    """Tests for Flow API endpoints."""

    def test_list_flows(self, setup_dashfrog):
        """Test that list_flows returns the correct flow statistics with multiple runs per flow."""

        dashfrog = get_dashfrog_instance()
        now = datetime.now()

        # Flow 1: Failed flow - had previous successes but latest is FAILED
        failed_flow_name = "test_failed_flow"
        failed_runs = [
            {"flow_id": "111", "event_dt": now - timedelta(days=4), "status": "success"},
            {"flow_id": "112", "event_dt": now - timedelta(days=3), "status": "success"},
            {"flow_id": "113", "event_dt": now - timedelta(days=2), "status": "failed"},
            {"flow_id": "114", "event_dt": now - timedelta(days=1), "status": "success"},
            {"flow_id": "115", "event_dt": now - timedelta(hours=2), "status": "failed"},
        ]

        # Flow 2: Success flow - had previous failures but latest is SUCCESS
        success_flow_name = "test_success_flow"
        success_runs = [
            {"flow_id": "221", "event_dt": now - timedelta(days=5), "status": "failed"},
            {"flow_id": "222", "event_dt": now - timedelta(days=4), "status": "success"},
            {"flow_id": "223", "event_dt": now - timedelta(days=3), "status": "failed"},
            {"flow_id": "224", "event_dt": now - timedelta(days=2), "status": "failed"},
            {"flow_id": "225", "event_dt": now - timedelta(hours=1), "status": "success"},
        ]

        # Flow 3: Running flow - had mixed history but latest is RUNNING
        running_flow_name = "test_running_flow"
        running_runs = [
            {"flow_id": "331", "event_dt": now - timedelta(days=6), "status": "success"},
            {"flow_id": "332", "event_dt": now - timedelta(days=5), "status": "failed"},
            {"flow_id": "333", "event_dt": now - timedelta(days=4), "status": "success"},
            {"flow_id": "334", "event_dt": now - timedelta(minutes=30), "status": "running"},
        ]

        # Insert events for all flows
        with dashfrog.db_engine.begin() as conn:
            for run in failed_runs:
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=run["flow_id"],
                        event_name=EVENT_FLOW_START,
                        event_dt=run["event_dt"],
                        labels={"flow_name": failed_flow_name, "tenant": "test_tenant", "environment": "production"},
                    )
                )
                if run["status"] == "success":
                    conn.execute(
                        insert(FlowEvent).values(
                            flow_id=run["flow_id"],
                            event_name=EVENT_FLOW_SUCCESS,
                            event_dt=run["event_dt"] + timedelta(seconds=45),
                            labels={"flow_name": failed_flow_name, "tenant": "test_tenant", "environment": "production"},
                        )
                    )
                elif run["status"] == "failed":
                    conn.execute(
                        insert(FlowEvent).values(
                            flow_id=run["flow_id"],
                            event_name=EVENT_FLOW_FAIL,
                            event_dt=run["event_dt"] + timedelta(seconds=30),
                            labels={"flow_name": failed_flow_name, "tenant": "test_tenant", "environment": "production"},
                        )
                    )

            for run in success_runs:
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=run["flow_id"],
                        event_name=EVENT_FLOW_START,
                        event_dt=run["event_dt"],
                        labels={"flow_name": success_flow_name, "tenant": "test_tenant", "environment": "staging"},
                    )
                )
                if run["status"] == "success":
                    conn.execute(
                        insert(FlowEvent).values(
                            flow_id=run["flow_id"],
                            event_name=EVENT_FLOW_SUCCESS,
                            event_dt=run["event_dt"] + timedelta(seconds=45),
                            labels={"flow_name": success_flow_name, "tenant": "test_tenant", "environment": "staging"},
                        )
                    )
                elif run["status"] == "failed":
                    conn.execute(
                        insert(FlowEvent).values(
                            flow_id=run["flow_id"],
                            event_name=EVENT_FLOW_FAIL,
                            event_dt=run["event_dt"] + timedelta(seconds=20),
                            labels={"flow_name": success_flow_name, "tenant": "test_tenant", "environment": "staging"},
                        )
                    )

            for run in running_runs:
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=run["flow_id"],
                        event_name=EVENT_FLOW_START,
                        event_dt=run["event_dt"],
                        labels={"flow_name": running_flow_name, "tenant": "test_tenant", "environment": "dev"},
                    )
                )
                if run["status"] == "success":
                    conn.execute(
                        insert(FlowEvent).values(
                            flow_id=run["flow_id"],
                            event_name=EVENT_FLOW_SUCCESS,
                            event_dt=run["event_dt"] + timedelta(seconds=60),
                            labels={"flow_name": running_flow_name, "tenant": "test_tenant", "environment": "dev"},
                        )
                    )
                elif run["status"] == "failed":
                    conn.execute(
                        insert(FlowEvent).values(
                            flow_id=run["flow_id"],
                            event_name=EVENT_FLOW_FAIL,
                            event_dt=run["event_dt"] + timedelta(seconds=30),
                            labels={"flow_name": running_flow_name, "tenant": "test_tenant", "environment": "dev"},
                        )
                    )

        # Call the API endpoint
        client = TestClient(app)
        start_dt = (now - timedelta(days=7)).isoformat()
        end_dt = (now + timedelta(hours=1)).isoformat()

        response = client.post(
            "/flows/search",
            json={"start_dt": start_dt, "end_dt": end_dt, "labels": []},
        )

        assert response.status_code == 200
        data = response.json()

        flows_by_name = {f["name"]: f for f in data}

        # Verify failed flow
        assert failed_flow_name in flows_by_name
        failed_flow = flows_by_name[failed_flow_name]
        assert failed_flow["lastRunStatus"] == "failure"
        assert failed_flow["runCount"] == 5
        assert failed_flow["successCount"] == 3
        assert failed_flow["failedCount"] == 2
        assert failed_flow["pendingCount"] == 0
        assert failed_flow["labels"]["environment"] == "production"
        assert failed_flow["lastRunEndedAt"] is not None

        # Verify success flow
        assert success_flow_name in flows_by_name
        success_flow = flows_by_name[success_flow_name]
        assert success_flow["lastRunStatus"] == "success"
        assert success_flow["runCount"] == 5
        assert success_flow["successCount"] == 2
        assert success_flow["failedCount"] == 3
        assert success_flow["pendingCount"] == 0
        assert success_flow["labels"]["environment"] == "staging"
        assert success_flow["lastRunEndedAt"] is not None

        # Verify running flow
        assert running_flow_name in flows_by_name
        running_flow = flows_by_name[running_flow_name]
        assert running_flow["lastRunStatus"] == "running"
        assert running_flow["runCount"] == 4
        assert running_flow["successCount"] == 2
        assert running_flow["failedCount"] == 1
        assert running_flow["pendingCount"] == 1
        assert running_flow["labels"]["environment"] == "dev"
        assert running_flow["lastRunEndedAt"] is None

    def test_list_flows_with_label_filters(self, setup_dashfrog):
        """Test that list_flows correctly filters by labels."""

        uuid = str(uuid4()).replace("-", "_")
        dashfrog = get_dashfrog_instance()
        now = datetime.now(timezone.utc)

        flows_data = [
            {"name": f"flow_prod_1_{uuid}", "tenant": "prod_tenant", "environment": "production", "flow_id": "p1"},
            {"name": f"flow_prod_2_{uuid}", "tenant": "prod_tenant", "environment": "production", "flow_id": "p2"},
            {"name": f"flow_staging_{uuid}", "tenant": "staging_tenant", "environment": "staging", "flow_id": "s1"},
            {"name": f"flow_dev_{uuid}", "tenant": "dev_tenant", "environment": "dev", "flow_id": "d1"},
        ]

        with dashfrog.db_engine.begin() as conn:
            for flow_data in flows_data:
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=flow_data["flow_id"],
                        event_name=EVENT_FLOW_START,
                        event_dt=now - timedelta(hours=1),
                        labels={
                            "flow_name": flow_data["name"],
                            "tenant": flow_data["tenant"],
                            "environment": flow_data["environment"],
                        },
                    )
                )
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=flow_data["flow_id"],
                        event_name=EVENT_FLOW_SUCCESS,
                        event_dt=now - timedelta(minutes=30),
                        labels={
                            "flow_name": flow_data["name"],
                            "tenant": flow_data["tenant"],
                            "environment": flow_data["environment"],
                        },
                    )
                )

        client = TestClient(app)
        start_dt = (now - timedelta(days=1)).isoformat()
        end_dt = (now + timedelta(hours=1)).isoformat()

        # Test 1: No filters
        response = client.post("/flows/search", json={"start_dt": start_dt, "end_dt": end_dt, "labels": []})
        assert response.status_code == 200
        all_flows = response.json()
        assert len([f for f in all_flows if uuid in f["name"]]) == 4

        # Test 2: Filter by tenant
        response = client.post(
            "/flows/search",
            json={"start_dt": start_dt, "end_dt": end_dt, "labels": [{"key": "tenant", "value": "prod_tenant"}]},
        )
        assert response.status_code == 200
        prod_flows = response.json()
        prod_flow_names = [f["name"] for f in prod_flows if uuid in f["name"]]
        assert len(prod_flow_names) == 2

        # Test 3: Filter by environment
        response = client.post(
            "/flows/search",
            json={"start_dt": start_dt, "end_dt": end_dt, "labels": [{"key": "environment", "value": "staging"}]},
        )
        assert response.status_code == 200
        staging_flows = response.json()
        staging_flow_names = [f["name"] for f in staging_flows if uuid in f["name"]]
        assert len(staging_flow_names) == 1

    def test_get_flow_details(self, setup_dashfrog):
        """Test that get_flow_details returns flow history with events and steps."""

        uuid = str(uuid4()).replace("-", "_")
        flow_name = f"test_detail_flow_{uuid}"
        dashfrog = get_dashfrog_instance()
        now = datetime.now()

        flow_id_1 = "detail_flow_1"
        run1_start = now - timedelta(hours=2)

        flow_id_2 = "detail_flow_2"
        run2_start = now - timedelta(hours=1)

        with dashfrog.db_engine.begin() as conn:
            # Run 1 - successful with 2 steps
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_1,
                    event_name=EVENT_FLOW_START,
                    event_dt=run1_start,
                    labels={"flow_name": flow_name, "tenant": "test_tenant"},
                )
            )
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_1,
                    event_name=EVENT_STEP_START,
                    event_dt=run1_start + timedelta(seconds=5),
                    labels={"flow_name": flow_name, "tenant": "test_tenant", "step_name": "validate"},
                )
            )
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_1,
                    event_name=EVENT_STEP_SUCCESS,
                    event_dt=run1_start + timedelta(seconds=10),
                    labels={"flow_name": flow_name, "tenant": "test_tenant", "step_name": "validate"},
                )
            )
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_1,
                    event_name=EVENT_STEP_START,
                    event_dt=run1_start + timedelta(seconds=15),
                    labels={"flow_name": flow_name, "tenant": "test_tenant", "step_name": "process"},
                )
            )
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_1,
                    event_name=EVENT_STEP_SUCCESS,
                    event_dt=run1_start + timedelta(seconds=25),
                    labels={"flow_name": flow_name, "tenant": "test_tenant", "step_name": "process"},
                )
            )
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_1,
                    event_name=EVENT_FLOW_SUCCESS,
                    event_dt=run1_start + timedelta(seconds=30),
                    labels={"flow_name": flow_name, "tenant": "test_tenant"},
                )
            )

            # Run 2 - failed
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_2,
                    event_name=EVENT_FLOW_START,
                    event_dt=run2_start,
                    labels={"flow_name": flow_name, "tenant": "test_tenant"},
                )
            )
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_2,
                    event_name=EVENT_STEP_START,
                    event_dt=run2_start + timedelta(seconds=5),
                    labels={"flow_name": flow_name, "tenant": "test_tenant", "step_name": "validate"},
                )
            )
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_2,
                    event_name=EVENT_STEP_FAIL,
                    event_dt=run2_start + timedelta(seconds=8),
                    labels={"flow_name": flow_name, "tenant": "test_tenant", "step_name": "validate"},
                )
            )
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_2,
                    event_name=EVENT_FLOW_FAIL,
                    event_dt=run2_start + timedelta(seconds=10),
                    labels={"flow_name": flow_name, "tenant": "test_tenant"},
                )
            )

        # Call the API endpoint
        client = TestClient(app)
        start_dt = (now - timedelta(days=1)).isoformat()
        end_dt = (now + timedelta(hours=1)).isoformat()

        response = client.post(
            "/flows/details",
            json={"flow_name": flow_name, "start_dt": start_dt, "end_dt": end_dt, "labels": []},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify summary
        assert data["name"] == flow_name
        assert data["runCount"] == 2
        assert data["successCount"] == 1
        assert data["failedCount"] == 1
        assert data["lastRunStatus"] == "failure"

        # Verify history
        assert len(data["history"]) == 2

        run1 = next(h for h in data["history"] if h["flowId"] == flow_id_1)
        assert run1["status"] == "success"
        assert len(run1["steps"]) == 2

        run2 = next(h for h in data["history"] if h["flowId"] == flow_id_2)
        assert run2["status"] == "failure"
        assert len(run2["steps"]) == 1

    def test_get_all_flow_labels(self, setup_dashfrog):
        """Test that get_all_flow_labels returns the correct label values from flow events."""

        uuid = str(uuid4()).replace("-", "_")
        flow_name = f"test_api_flow_{uuid}"

        with flow.start(name=flow_name, tenant="flow_tenant_1", region="us-east-1", environment="production"):
            pass
        with flow.start(name=flow_name, tenant="flow_tenant_2", region="us-west-2", environment="staging"):
            pass
        with flow.start(name=flow_name, tenant="flow_tenant_3", region="us-east-1", environment="production"):
            pass

        client = TestClient(app)
        now = datetime.now(timezone.utc)
        start_dt = (now - timedelta(minutes=5)).isoformat()
        end_dt = (now + timedelta(minutes=5)).isoformat()

        response = client.get("/flows/labels", params={"start_dt": start_dt, "end_dt": end_dt})

        assert response.status_code == 200
        data = response.json()

        assert sorted(data, key=lambda x: x["label"]) == [
            {"label": "environment", "values": ["production", "staging"]},
            {"label": "flow_name", "values": [flow_name]},
            {"label": "region", "values": ["us-east-1", "us-west-2"]},
            {"label": "tenant", "values": ["flow_tenant_1", "flow_tenant_2", "flow_tenant_3"]},
        ]
