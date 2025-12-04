import random
import threading
import time

from fastapi import FastAPI
import requests

from dashfrog import Config, flow, setup, step, with_fastapi, with_requests

# Initialize DashFrog
setup(Config())
with_requests()

# Simple customer list
CUSTOMERS = ["acme-corp", "techcorp", "startup-inc"]

app = FastAPI()
with_fastapi(app)


@app.get("/import/{customer_id}")
async def import_csv_route(customer_id: str):
    with step.start("validate"):
        validate_csv()

    # Step 3: Process
    with step.start("process"):
        process_csv()


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
    """Simulate a data import."""

    # Start flow
    with flow.start(name="data_import_async", tenant=customer_id, env=env):
        # Step 1: Read
        with step.start("read"):
            read_csv()

        response = requests.get(f"http://localhost:5000/import/{customer_id}")
        if response.status_code != 200:
            raise ValueError("Import failed")

        print(f"✅ {customer_id}: Import successful")


def run():
    """Run the continuous simulation."""
    print("🚀 Starting Data Import Simulator")
    print("=" * 50)

    iteration = 0
    while True:
        iteration += 1
        print(f"\n--- Iteration {iteration} ---")

        # Pick random customer
        customer = random.choice(CUSTOMERS)

        # Run import
        for env in ("prod", "staging"):
            try:
                import_csv(customer, env)
            except Exception as e:
                print(f"❌ {customer}: Import failed - {e}")

        # Wait 2-5 seconds
        time.sleep(random.uniform(2, 5))


def run_api_in_thread():
    import uvicorn

    thread = threading.Thread(target=uvicorn.run, args=(app,), kwargs={"host": "0.0.0.0", "port": 5000})
    thread.start()
    return thread


if __name__ == "__main__":
    run_api_in_thread()
    run()
