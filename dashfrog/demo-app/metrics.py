import random
import threading
import time

from fastapi import FastAPI
import requests

from dashfrog import metrics, setup

setup()

app = FastAPI()

CUSTOMERS = ["acme-corp", "techcorp", "startup-inc"]


def get_monthly_quota(*, timeout_seconds: int):
    yield from [
        metrics.GaugeValue(value=random.randint(0, 1000), tenant=customer_id, labels={"env": env})
        for customer_id in CUSTOMERS
        for env in ["prod", "staging"]
    ]


computation_duration = metrics.Histogram(
    "computation_duration", labels=["env"], pretty_name="Computation Duration", unit="s"
)
computation_count = metrics.Counter("computation_count", labels=["env"], pretty_name="Computations")
monthly_quota = metrics.Gauge(
    "monthly_quota", labels=["env"], pretty_name="Monthly Quota", unit="requests"
).set_periodically(300, get_monthly_quota)


def sleep(t: int):
    duration = random.uniform(t / 2, t * 2)
    time.sleep(duration)
    return duration


@app.get("/heavy-computation/{customer_id}/{env}")
async def heavy_computation(customer_id: str, env: str):
    duration = sleep(3)
    computation_duration.record(duration, tenant=customer_id, env=env)
    computation_count.add(1, tenant=customer_id, env=env)


def run_api_in_thread():
    import uvicorn

    thread = threading.Thread(target=uvicorn.run, args=(app,), kwargs={"host": "0.0.0.0", "port": 4999})
    thread.start()
    return thread


def run():
    while True:
        for customer_id in CUSTOMERS:
            for env in ["prod", "staging"]:
                requests.get(f"http://localhost:4999/heavy-computation/{customer_id}/{env}")
        time.sleep(1)


if __name__ == "__main__":
    run_api_in_thread()
    time.sleep(1)
    run()
