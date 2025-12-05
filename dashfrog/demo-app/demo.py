import random
import time
import uuid

import requests

from dashfrog import flow, metrics, setup, step

# Initialize DashFrog
setup()

# Simple customer list
CUSTOMERS = ["acme-corp", "techcorp", "startup-inc"]

# Define metrics
computation_duration = metrics.Histogram(
    "computation_duration", labels=["env"], pretty_name="Computation Duration", unit="s"
)
computation_count = metrics.Counter("computation_count", labels=["env"], pretty_name="Computations")


def get_monthly_quota(**kwargs):
    yield from [
        metrics.GaugeValue(value=random.randint(0, 1000), tenant=customer_id, labels={"env": env})
        for customer_id in CUSTOMERS
        for env in ["prod", "staging"]
    ]


monthly_quota = metrics.Gauge(
    "monthly_quota", labels=["env"], pretty_name="Monthly Quota", unit="requests"
).set_periodically(300, get_monthly_quota)

# Track which customers have notebooks created
NOTEBOOKS_CREATED = set()


def sleep(t: int):
    duration = random.uniform(t / 2, t * 2)
    time.sleep(duration)
    return duration


def read_csv():
    """Read a CSV file."""
    sleep(1)


def validate_csv():
    sleep(1)
    # Random failures
    if random.random() < 0.4:  # 40% failure rate
        raise ValueError("Validation failed")


def process_csv():
    sleep(1)


def import_csv(customer_id: str, env: str):
    """Simulate a data import with flow tracking."""
    with flow.start(name="data_import", tenant=customer_id, env=env):
        # Step 1: Read
        with step.start("read"):
            read_csv()

        # Step 2: Validate
        with step.start("validate"):
            validate_csv()

        # Step 3: Process
        with step.start("process"):
            process_csv()


def heavy_computation(customer_id: str, env: str):
    """Simulate heavy computation with metrics."""
    duration = sleep(3)
    computation_duration.record(duration, tenant=customer_id, env=env)
    computation_count.add(1, tenant=customer_id, env=env)


def get_auth_token(api_url: str = "http://localhost:8000") -> str:
    """Login and get JWT token."""
    response = requests.post(
        f"{api_url}/api/auth/token",
        data={"username": "admin", "password": "admin"},
    )
    response.raise_for_status()
    return response.json()["access_token"]


def create_status_page_notebook(customer_id: str, api_url: str = "http://localhost:8000"):
    """Create a status page notebook for a customer."""
    if customer_id in NOTEBOOKS_CREATED:
        return

    try:
        token = get_auth_token(api_url)
        headers = {
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        }

        # Generate unique notebook ID
        notebook_id = str(uuid.uuid4())

        # Create notebook
        create_payload = {
            "tenant": customer_id,
            "notebook": {
                "id": notebook_id,
                "title": "Status Page",
                "description": "Quick overview of key indicators",
                "blocks": None,
                "timeWindow": {"type": "relative", "metadata": {"value": "24h"}},
                "filters": [],
                "flowBlocksFilters": None,
                "metricBlocksFilters": None,
                "isPublic": False,
            },
        }

        response = requests.post(f"{api_url}/api/notebooks/create", headers=headers, json=create_payload)
        response.raise_for_status()

        # Update notebook with blocks
        update_payload = {
            "id": notebook_id,
            "title": "Status Page",
            "description": "Quick overview of key indicators",
            "blocks": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "heading",
                    "props": {
                        "backgroundColor": "default",
                        "textColor": "default",
                        "textAlignment": "left",
                        "level": 2,
                    },
                    "content": [{"type": "text", "text": "Import KPIs", "styles": {}}],
                    "children": [],
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "columnList",
                    "props": {},
                    "children": [
                        {
                            "id": str(uuid.uuid4()),
                            "type": "column",
                            "props": {"width": 1},
                            "children": [
                                {
                                    "id": str(uuid.uuid4()),
                                    "type": "metric",
                                    "props": {
                                        "metricId": "computation_duration",
                                        "metricName": "computation_duration",
                                        "title": "Computation Duration",
                                        "transform": "p50",
                                        "timeAggregation": "last",
                                        "groupBy": "sum",
                                        "groupByFn": "sum",
                                        "blockFilters": "[]",
                                    },
                                    "children": [],
                                }
                            ],
                        },
                        {
                            "id": str(uuid.uuid4()),
                            "type": "column",
                            "props": {"width": 1},
                            "children": [
                                {
                                    "id": str(uuid.uuid4()),
                                    "type": "metric",
                                    "props": {
                                        "metricId": "computation_count",
                                        "metricName": "computation_count",
                                        "title": "Computations",
                                        "transform": "ratePerMinute",
                                        "timeAggregation": "avg",
                                        "groupBy": "sum",
                                        "groupByFn": "sum",
                                        "blockFilters": "[]",
                                    },
                                    "children": [],
                                }
                            ],
                        },
                        {
                            "id": str(uuid.uuid4()),
                            "type": "column",
                            "props": {"width": 1},
                            "children": [
                                {
                                    "id": str(uuid.uuid4()),
                                    "type": "metric",
                                    "props": {
                                        "metricId": "monthly_quota",
                                        "metricName": "monthly_quota",
                                        "title": "Monthly Quota",
                                        "transform": "",
                                        "timeAggregation": "last",
                                        "groupBy": "sum",
                                        "groupByFn": "sum",
                                        "blockFilters": "[]",
                                    },
                                    "children": [],
                                }
                            ],
                        },
                    ],
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "heading",
                    "props": {
                        "backgroundColor": "default",
                        "textColor": "default",
                        "textAlignment": "left",
                        "level": 2,
                    },
                    "content": [{"type": "text", "text": "Key Workflows", "styles": {}}],
                    "children": [],
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "flowStatus",
                    "props": {
                        "flowName": "data_import",
                        "title": "Night Batch Status",
                        "blockFilters": '[{"label":"env","value":"prod"}]',
                        "displayMode": "percent",
                    },
                    "children": [],
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "flowStatus",
                    "props": {
                        "flowName": "data_import",
                        "title": "Night Batch Duration",
                        "blockFilters": '[{"label":"env","value":"prod"}]',
                        "displayMode": "status",
                    },
                    "children": [],
                },
            ],
            "timeWindow": {"type": "relative", "metadata": {"value": "24h"}},
            "filters": [],
            "flowBlocksFilters": [
                {"names": ["data_import"], "filters": [{"label": "env", "value": "prod"}]},
                {"names": ["data_import"], "filters": [{"label": "env", "value": "prod"}]},
            ],
            "metricBlocksFilters": [],
            "isPublic": False,
        }

        response = requests.post(
            f"{api_url}/api/notebooks/{notebook_id}/update", headers=headers, json=update_payload
        )
        response.raise_for_status()

        NOTEBOOKS_CREATED.add(customer_id)
        print(f"   → {api_url}/tenants/{customer_id}/notebooks/{notebook_id}")
        return notebook_id

    except Exception as e:
        print(f"   ⚠️  Failed to create notebook for {customer_id}: {e}")
        return None


def run():
    """Run the continuous simulation."""
    print("🚀 Starting DashFrog Demo")
    print("\n⏳ Warming up (generating initial data)...")

    iteration = 0
    while True:
        iteration += 1

        # Run imports and computations for all customers
        for customer in CUSTOMERS:
            for env in ("prod", "staging"):
                # Try data import
                try:
                    import_csv(customer, env)
                except Exception:
                    pass  # Silently handle failures

                # Run computation
                heavy_computation(customer, env)

        # After first iteration, create notebooks
        if iteration == 1:
            print("\n📊 Creating demo notebooks...")
            for customer in CUSTOMERS:
                create_status_page_notebook(customer)
            print("\n✅ Demo ready! Open notebooks above to explore the data.")
            print("   (Demo will continue generating data in the background)\n")

        # Wait 2-5 seconds between iterations
        time.sleep(random.uniform(2, 5))


if __name__ == "__main__":
    run()
