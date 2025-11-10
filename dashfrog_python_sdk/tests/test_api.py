"""Tests for DashFrog API."""

from uuid import uuid4

from fastapi.testclient import TestClient

from dashfrog_python_sdk import flow, get_dashfrog_instance, timeline
from dashfrog_python_sdk.api import app
from dashfrog_python_sdk.metric import Counter

from tests.utils import wait_for_metric_in_prometheus


class TestMetricAPI:
    """Tests for Metric API endpoints."""

    def test_get_all_labels(self, setup_dashfrog):
        """Test that get_all_labels returns the correct label values from metrics."""

        uuid = str(uuid4()).replace("-", "_")
        counter_name = f"test_api_labels_counter_{uuid}"

        # Create a counter with unique labels for this test
        counter = Counter(
            name=counter_name,
            labels=["api_test_label"],
            pretty_name="API Labels Test Counter",
            unit="count",
            default_aggregation="sum",
        )

        # Record data with a unique label value
        counter.add(1, tenant="api_test_tenant", api_test_label="unique_value_123")
        counter.add(1, tenant="api_test_tenant", api_test_label="unique_value_456")
        counter.add(1, tenant="api_test_tenant_2", api_test_label="unique_value_789")

        # Wait for metrics to appear in Prometheus
        wait_for_metric_in_prometheus(f"dashfrog_{counter_name}")

        # Call the API endpoint
        client = TestClient(app)
        response = client.get("/metrics/labels")

        assert response.status_code == 200
        data = response.json()

        assert sorted(data, key=lambda x: x["label"]) == [
            {"label": "api_test_label", "values": ["unique_value_123", "unique_value_456", "unique_value_789"]},
            {"label": "tenant", "values": ["api_test_tenant", "api_test_tenant_2"]},
        ]


class TestFlowAPI:
    """Tests for Flow API endpoints."""

    def test_list_flows(self, setup_dashfrog):
        """Test that list_flows returns the correct flow statistics with multiple runs per flow."""
        from datetime import datetime, timedelta

        from sqlalchemy import insert

        from dashfrog_python_sdk.constants import EVENT_FLOW_FAIL, EVENT_FLOW_START, EVENT_FLOW_SUCCESS
        from dashfrog_python_sdk.models import FlowEvent

        dashfrog = get_dashfrog_instance()
        now = datetime.now()

        # Flow 1: Failed flow - had previous successes but latest is FAILED
        # This tests that we correctly pick the latest status
        failed_flow_name = "test_failed_flow"
        failed_runs = [
            # Run 1 (4 days ago) - success
            {"flow_id": "111", "event_dt": now - timedelta(days=4), "status": "success"},
            # Run 2 (3 days ago) - success
            {"flow_id": "112", "event_dt": now - timedelta(days=3), "status": "success"},
            # Run 3 (2 days ago) - failed
            {"flow_id": "113", "event_dt": now - timedelta(days=2), "status": "failed"},
            # Run 4 (1 day ago) - success
            {"flow_id": "114", "event_dt": now - timedelta(days=1), "status": "success"},
            # Run 5 (2 hours ago) - FAILED (most recent - should be returned)
            {"flow_id": "115", "event_dt": now - timedelta(hours=2), "status": "failed"},
        ]

        # Flow 2: Success flow - had previous failures but latest is SUCCESS
        # This tests that we correctly pick the latest status
        success_flow_name = "test_success_flow"
        success_runs = [
            # Run 1 (5 days ago) - failed
            {"flow_id": "221", "event_dt": now - timedelta(days=5), "status": "failed"},
            # Run 2 (4 days ago) - success
            {"flow_id": "222", "event_dt": now - timedelta(days=4), "status": "success"},
            # Run 3 (3 days ago) - failed
            {"flow_id": "223", "event_dt": now - timedelta(days=3), "status": "failed"},
            # Run 4 (2 days ago) - failed
            {"flow_id": "224", "event_dt": now - timedelta(days=2), "status": "failed"},
            # Run 5 (1 hour ago) - SUCCESS (most recent - should be returned)
            {"flow_id": "225", "event_dt": now - timedelta(hours=1), "status": "success"},
        ]

        # Flow 3: Running flow - had mixed history but latest is RUNNING
        # This tests that we correctly identify running flows
        running_flow_name = "test_running_flow"
        running_runs = [
            # Run 1 (6 days ago) - success
            {"flow_id": "331", "event_dt": now - timedelta(days=6), "status": "success"},
            # Run 2 (5 days ago) - failed
            {"flow_id": "332", "event_dt": now - timedelta(days=5), "status": "failed"},
            # Run 3 (4 days ago) - success
            {"flow_id": "333", "event_dt": now - timedelta(days=4), "status": "success"},
            # Run 4 (30 minutes ago) - RUNNING (most recent - should be returned)
            {"flow_id": "334", "event_dt": now - timedelta(minutes=30), "status": "running"},
        ]

        # Insert events for all flows
        with dashfrog.db_engine.begin() as conn:
            for run in failed_runs:
                # START event
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=run["flow_id"],
                        event_name=EVENT_FLOW_START,
                        event_dt=run["event_dt"],
                        labels={"flow_name": failed_flow_name, "tenant": "test_tenant", "environment": "production"},
                    )
                )
                # END event based on status
                if run["status"] == "success":
                    conn.execute(
                        insert(FlowEvent).values(
                            flow_id=run["flow_id"],
                            event_name=EVENT_FLOW_SUCCESS,
                            event_dt=run["event_dt"] + timedelta(seconds=45),
                            labels={
                                "flow_name": failed_flow_name,
                                "tenant": "test_tenant",
                                "environment": "production",
                            },
                        )
                    )
                elif run["status"] == "failed":
                    conn.execute(
                        insert(FlowEvent).values(
                            flow_id=run["flow_id"],
                            event_name=EVENT_FLOW_FAIL,
                            event_dt=run["event_dt"] + timedelta(seconds=30),
                            labels={
                                "flow_name": failed_flow_name,
                                "tenant": "test_tenant",
                                "environment": "production",
                            },
                        )
                    )

            # Insert events for success flow
            for run in success_runs:
                # START event
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=run["flow_id"],
                        event_name=EVENT_FLOW_START,
                        event_dt=run["event_dt"],
                        labels={"flow_name": success_flow_name, "tenant": "test_tenant", "environment": "staging"},
                    )
                )
                # END event (SUCCESS or FAIL)
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

            # Insert events for running flow
            for run in running_runs:
                # START event
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=run["flow_id"],
                        event_name=EVENT_FLOW_START,
                        event_dt=run["event_dt"],
                        labels={"flow_name": running_flow_name, "tenant": "test_tenant", "environment": "dev"},
                    )
                )
                # END event only for completed runs
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

        # Call the API endpoint with time range
        client = TestClient(app)
        start_dt = (now - timedelta(days=7)).isoformat()
        end_dt = (now + timedelta(hours=1)).isoformat()

        response = client.post(
            "/flows/search",
            json={"start_dt": start_dt, "end_dt": end_dt, "labels": []},
        )

        assert response.status_code == 200
        data = response.json()

        # Sort by name for consistent comparison
        flows_by_name = {f["name"]: f for f in data}

        # Verify failed flow (5 runs: 3 success, 2 failed, LATEST is FAILED)
        # This proves we're picking the latest status correctly
        assert failed_flow_name in flows_by_name
        failed_flow = flows_by_name[failed_flow_name]
        assert failed_flow["lastRunStatus"] == "failure", "Should return 'failure' as the most recent run failed"
        assert failed_flow["runCount"] == 5
        assert failed_flow["successCount"] == 3
        assert failed_flow["failedCount"] == 2
        assert failed_flow["pendingCount"] == 0
        assert failed_flow["labels"]["environment"] == "production"
        assert failed_flow["lastRunEndedAt"] is not None

        # Verify success flow (5 runs: 2 success, 3 failed, LATEST is SUCCESS)
        # This proves we're picking the latest status correctly
        assert success_flow_name in flows_by_name
        success_flow = flows_by_name[success_flow_name]
        assert success_flow["lastRunStatus"] == "success", "Should return 'success' as the most recent run succeeded"
        assert success_flow["runCount"] == 5
        assert success_flow["successCount"] == 2
        assert success_flow["failedCount"] == 3
        assert success_flow["pendingCount"] == 0
        assert success_flow["labels"]["environment"] == "staging"
        assert success_flow["lastRunEndedAt"] is not None

        # Verify running flow (4 runs: 2 success, 1 failed, 1 LATEST is RUNNING)
        # This proves we're correctly identifying running flows
        assert running_flow_name in flows_by_name
        running_flow = flows_by_name[running_flow_name]
        assert running_flow["lastRunStatus"] == "running", (
            "Should return 'running' as the most recent run is still running"
        )
        assert running_flow["runCount"] == 4
        assert running_flow["successCount"] == 2
        assert running_flow["failedCount"] == 1
        assert running_flow["pendingCount"] == 1
        assert running_flow["labels"]["environment"] == "dev"
        assert running_flow["lastRunEndedAt"] is None

    def test_list_flows_with_label_filters(self, setup_dashfrog):
        """Test that list_flows correctly filters by labels."""
        from datetime import datetime, timedelta, timezone

        from sqlalchemy import insert

        from dashfrog_python_sdk.constants import EVENT_FLOW_START, EVENT_FLOW_SUCCESS
        from dashfrog_python_sdk.models import FlowEvent

        uuid = str(uuid4()).replace("-", "_")
        dashfrog = get_dashfrog_instance()
        now = datetime.now(timezone.utc)

        # Create flows with different label combinations
        flows_data = [
            # Production tenant flows
            {"name": f"flow_prod_1_{uuid}", "tenant": "prod_tenant", "environment": "production", "flow_id": "p1"},
            {"name": f"flow_prod_2_{uuid}", "tenant": "prod_tenant", "environment": "production", "flow_id": "p2"},
            # Staging tenant flows
            {"name": f"flow_staging_{uuid}", "tenant": "staging_tenant", "environment": "staging", "flow_id": "s1"},
            # Dev tenant flows
            {"name": f"flow_dev_{uuid}", "tenant": "dev_tenant", "environment": "dev", "flow_id": "d1"},
        ]

        # Insert flow events
        with dashfrog.db_engine.begin() as conn:
            for flow_data in flows_data:
                # START event
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
                # SUCCESS event
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

        # Test 1: No filters - should return all flows
        response = client.post(
            "/flows/search",
            json={"start_dt": start_dt, "end_dt": end_dt, "labels": []},
        )
        assert response.status_code == 200
        all_flows = response.json()
        assert len([f for f in all_flows if uuid in f["name"]]) == 4

        # Test 2: Filter by tenant=prod_tenant - should return 2 flows
        response = client.post(
            "/flows/search",
            json={
                "start_dt": start_dt,
                "end_dt": end_dt,
                "labels": [{"key": "tenant", "value": "prod_tenant"}],
            },
        )
        assert response.status_code == 200
        prod_flows = response.json()
        prod_flow_names = [f["name"] for f in prod_flows if uuid in f["name"]]
        assert len(prod_flow_names) == 2
        assert all("prod_1" in name or "prod_2" in name for name in prod_flow_names)
        assert all(f["labels"]["tenant"] == "prod_tenant" for f in prod_flows if uuid in f["name"])

        # Test 3: Filter by environment=staging - should return 1 flow
        response = client.post(
            "/flows/search",
            json={
                "start_dt": start_dt,
                "end_dt": end_dt,
                "labels": [{"key": "environment", "value": "staging"}],
            },
        )
        assert response.status_code == 200
        staging_flows = response.json()
        staging_flow_names = [f["name"] for f in staging_flows if uuid in f["name"]]
        assert len(staging_flow_names) == 1
        assert "staging" in staging_flow_names[0]

        # Test 4: Filter by multiple labels - should return 2 flows
        response = client.post(
            "/flows/search",
            json={
                "start_dt": start_dt,
                "end_dt": end_dt,
                "labels": [
                    {"key": "tenant", "value": "prod_tenant"},
                    {"key": "environment", "value": "production"},
                ],
            },
        )
        assert response.status_code == 200
        filtered_flows = response.json()
        filtered_names = [f["name"] for f in filtered_flows if uuid in f["name"]]
        assert len(filtered_names) == 2
        assert all(f["labels"]["tenant"] == "prod_tenant" for f in filtered_flows if uuid in f["name"])
        assert all(f["labels"]["environment"] == "production" for f in filtered_flows if uuid in f["name"])

    def test_get_flow_details(self, setup_dashfrog):
        """Test that get_flow_details returns flow history with events and steps."""
        from datetime import datetime, timedelta

        from sqlalchemy import insert

        from dashfrog_python_sdk.constants import (
            EVENT_FLOW_FAIL,
            EVENT_FLOW_START,
            EVENT_FLOW_SUCCESS,
            EVENT_STEP_FAIL,
            EVENT_STEP_START,
            EVENT_STEP_SUCCESS,
        )
        from dashfrog_python_sdk.models import FlowEvent

        uuid = str(uuid4()).replace("-", "_")
        flow_name = f"test_detail_flow_{uuid}"
        dashfrog = get_dashfrog_instance()
        now = datetime.now()

        # Create 2 flow runs with events and steps
        # Run 1: Completed successfully with 2 steps
        flow_id_1 = "detail_flow_1"
        run1_start = now - timedelta(hours=2)

        # Run 2: Failed with 1 step
        flow_id_2 = "detail_flow_2"
        run2_start = now - timedelta(hours=1)

        with dashfrog.db_engine.begin() as conn:
            # Run 1 events
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_1,
                    event_name=EVENT_FLOW_START,
                    event_dt=run1_start,
                    labels={"flow_name": flow_name, "tenant": "test_tenant"},
                )
            )
            # Step 1 in Run 1
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
            # Step 2 in Run 1
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
            # Flow success
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_1,
                    event_name=EVENT_FLOW_SUCCESS,
                    event_dt=run1_start + timedelta(seconds=30),
                    labels={"flow_name": flow_name, "tenant": "test_tenant"},
                )
            )

            # Run 2 events (failed)
            conn.execute(
                insert(FlowEvent).values(
                    flow_id=flow_id_2,
                    event_name=EVENT_FLOW_START,
                    event_dt=run2_start,
                    labels={"flow_name": flow_name, "tenant": "test_tenant"},
                )
            )
            # Step 1 in Run 2 (failed)
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
            # Flow failed
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
            json={
                "flow_name": flow_name,
                "start_dt": start_dt,
                "end_dt": end_dt,
                "labels": [],
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Verify summary stats
        assert data["name"] == flow_name
        assert data["runCount"] == 2
        assert data["successCount"] == 1
        assert data["failedCount"] == 1
        assert data["lastRunStatus"] == "failure"  # Most recent is failed

        # Verify history
        assert len(data["history"]) == 2

        # Find run 1 (successful)
        run1 = next(h for h in data["history"] if h["flowId"] == flow_id_1)
        assert run1 is not None
        assert run1["status"] == "success"
        assert run1["endTime"] is not None
        assert len(run1["events"]) == 6  # 1 start + 2 step starts + 2 step success + 1 flow success
        assert len(run1["steps"]) == 2

        # Verify step details in run 1
        validate_step = next(s for s in run1["steps"] if s["name"] == "validate")
        assert validate_step is not None
        assert validate_step["status"] == "success"
        assert validate_step["startTime"] == (run1_start + timedelta(seconds=5)).isoformat()
        assert validate_step["endTime"] == (run1_start + timedelta(seconds=10)).isoformat()

        process_step = next(s for s in run1["steps"] if s["name"] == "process")
        assert process_step is not None
        assert process_step["status"] == "success"
        assert process_step["startTime"] == (run1_start + timedelta(seconds=15)).isoformat()
        assert process_step["endTime"] == (run1_start + timedelta(seconds=25)).isoformat()

        # Find run 2 (failed)
        run2 = next(h for h in data["history"] if h["flowId"] == flow_id_2)
        assert run2 is not None
        assert run2["status"] == "failure"
        assert run2["endTime"] is not None
        assert len(run2["events"]) == 4  # 1 start + 1 step start + 1 step fail + 1 flow fail
        assert len(run2["steps"]) == 1

        # Verify failed step in run 2
        failed_step = run2["steps"][0]
        assert failed_step["name"] == "validate"
        assert failed_step["status"] == "failure"

    def test_get_all_flow_labels(self, setup_dashfrog):
        """Test that get_all_flow_labels returns the correct label values from flow events."""
        from datetime import datetime, timedelta, timezone

        uuid = str(uuid4()).replace("-", "_")
        flow_name = f"test_api_flow_{uuid}"

        # Start flows with different label values
        with flow.start(name=flow_name, tenant="flow_tenant_1", region="us-east-1", environment="production"):
            pass
        with flow.start(name=flow_name, tenant="flow_tenant_2", region="us-west-2", environment="staging"):
            pass
        with flow.start(name=flow_name, tenant="flow_tenant_3", region="us-east-1", environment="production"):
            pass

        # Call the API endpoint with time range
        client = TestClient(app)
        now = datetime.now(timezone.utc)
        start_dt = (now - timedelta(minutes=5)).isoformat()
        end_dt = (now + timedelta(minutes=5)).isoformat()

        response = client.get(
            "/flows/labels",
            params={"start_dt": start_dt, "end_dt": end_dt},
        )

        assert response.status_code == 200
        data = response.json()

        assert sorted(data, key=lambda x: x["label"]) == [
            {"label": "environment", "values": ["production", "staging"]},
            {"label": "flow_name", "values": [flow_name]},
            {"label": "region", "values": ["us-east-1", "us-west-2"]},
            {"label": "tenant", "values": ["flow_tenant_1", "flow_tenant_2", "flow_tenant_3"]},
        ]


class TestTimelineAPI:
    """Tests for Timeline API endpoints."""

    def test_get_all_timeline_labels(self, setup_dashfrog):
        """Test that get_all_timeline_labels returns the correct label values from timeline events."""
        from datetime import datetime, timedelta, timezone

        # Add timeline events with different label values
        timeline.add(
            "order_placed",
            "🛒",
            tenant="timeline_tenant_1",
            customer_id="alice",
            order_status="pending",
        )
        timeline.add(
            "order_shipped",
            "🚚",
            tenant="timeline_tenant_2",
            customer_id="bob",
            order_status="shipped",
        )
        timeline.add(
            "order_delivered",
            "✅",
            tenant="timeline_tenant_1",
            customer_id="alice",
            order_status="delivered",
        )

        # Call the API endpoint with time range
        client = TestClient(app)
        now = datetime.now(timezone.utc)
        start_dt = (now - timedelta(minutes=5)).isoformat()
        end_dt = (now + timedelta(minutes=5)).isoformat()

        response = client.get(
            "/timelines/labels",
            params={"start_dt": start_dt, "end_dt": end_dt},
        )

        assert response.status_code == 200
        data = response.json()

        assert sorted(data, key=lambda x: x["label"]) == [
            {"label": "customer_id", "values": ["alice", "bob"]},
            {"label": "order_status", "values": ["delivered", "pending", "shipped"]},
            {"label": "tenant", "values": ["timeline_tenant_1", "timeline_tenant_2"]},
        ]
