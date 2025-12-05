import random
import time

from dashfrog import flow, setup, step

# Initialize DashFrog
setup()

# Simple customer list
CUSTOMERS = ["acme-corp", "techcorp", "startup-inc"]


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

        print(f"✅ {customer_id}: Import successful")


def run():
    """Run the continuous simulation."""
    print("🚀 Starting Data Import Simulator")
    print("=" * 50)

    iteration = 0
    while True:
        iteration += 1
        print(f"\n--- Iteration {iteration} ---")

        # Run import
        for customer in CUSTOMERS:
            for env in ("prod", "staging"):
                try:
                    import_csv(customer, env)
                except Exception as e:
                    print(f"❌ {customer}: Import failed - {e}")

        # Wait 2-5 seconds
        time.sleep(random.uniform(2, 5))


if __name__ == "__main__":
    run()
