from random import randint
from time import sleep

from dashfrog import DashFrog, step

dash = DashFrog("demo.cronjobs")


def make_cronjobs():
    with dash.start_process("demo") as process:
        sleep(1 * 10)
        process.event("slept_well")
        classification = classify()
        do_things(classification)
        sleep(1 * 10)
        fail()


def another_job():
    with dash.start_process("job") as process:
        sleep(1)
        with process.step("test"):
            sleep(10)


@step("classify")
def classify():
    l = [randint(0, 100000) for _ in range(10000)]
    l.sort()
    return l


@step("do_things", relevent=False, randomized=True)
def do_things(l: list[int]):
    return [i * randint(0, 100000) for i in l]


@step("fail")
def fail():
    raise Exception("Something went wrong")


if __name__ == "__main__":
    another_job()
    make_cronjobs()
