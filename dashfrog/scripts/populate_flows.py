import random
import time

from dashfrog import flow, setup, step


def sleep(seconds: int):
    time.sleep(random.uniform(seconds - 1, seconds + 1))


def run():
    try:
        with flow.start("promotion", tenant="acme-corp", region="us"):
            with step.start("validate"):
                sleep(1)
            with step.start("process"):
                sleep(2)
                1 / 0
            with step.start("complete"):
                sleep(3)
    except Exception:
        pass

    with flow.start("purchase", tenant="acme-corp", region="us"):
        with step.start("validate"):
            sleep(1)
            flow.event("order_placed")
        with step.start("process"):
            sleep(2)
        with step.start("complete"):
            sleep(3)

    with flow.start("purchase", tenant="acme-corp", region="eu"):
        with step.start("validate"):
            sleep(4)
        with step.start("process"):
            sleep(1)

    with flow.start("cancel", tenant="acme-corp", region="eu"):
        with step.start("complete"):
            sleep(3)

    with flow.start("purchase", tenant="fintech-app", region="us"):
        with step.start("validate"):
            sleep(2)


if __name__ == "__main__":
    setup()
    while True:
        run()
        time.sleep(10)
