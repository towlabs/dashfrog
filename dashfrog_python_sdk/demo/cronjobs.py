from random import randint
from time import sleep

from dashfrog_python_sdk import DashFrog, Flow

dash = DashFrog("demo.cronjobs")


def make_cronjobs():
    with dash.new_flow("demo") as process:
        sleep(1 * 10)
        process.event("slept_well")
        classification = classify()
        do_things(classification)
        sleep(1 * 10)
        fail()


def another_job():
    with dash.new_flow("job") as process:
        sleep(1)
        with process.flow("test"):
            sleep(10)


@dash.flow("classify")
def classify():
    l = [randint(0, 100000) for _ in range(10000)]
    l.sort()

    return l


@dash.flow("do_things", relevent=False, randomized=True)
def do_things(l: list[int]):
    return [i * randint(0, 100000) for i in l]


@dash.flow("fail")
def fail():
    raise Exception("Something went wrong")


if __name__ == "__main__":
    another_job()
    make_cronjobs()
