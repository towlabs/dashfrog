import time

import requests

from dashfrog import get_dashfrog_instance


def wait_for_metric_in_prometheus(query: str, max_wait: int = 30):
    """Wait for a metric to appear in Prometheus."""
    start_time = time.time()
    last_error = None
    while True:
        try:
            response = requests.get(
                f"{get_dashfrog_instance().config.prometheus_endpoint}/api/v1/query",
                params={"query": query},
                timeout=5,
            )

            assert response.status_code == 200
            data = response.json()

            # Check that we got results
            assert data["status"] == "success"
            assert len(data["data"]["result"]) > 0
            return data["data"]["result"]
        except (AssertionError, Exception) as e:
            last_error = e
            if time.time() - start_time > max_wait:
                raise TimeoutError(
                    f"Metric {query} did not appear in Prometheus after {max_wait}s. Last error: {last_error}"
                )
            time.sleep(0.5)
