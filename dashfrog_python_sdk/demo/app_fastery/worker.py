import time

from celery import Celery
from celery.signals import worker_process_init

from dashfrog_python_sdk import DashFrog

celery = Celery("demo.app_fastery.worker", broker="redis://0.0.0.0:6379")
dashfrog = DashFrog("demo.fastery.celery")


@celery.task(name="hello_world_celery_nOOb")
def hello_world():
    with dashfrog.step("hello-world") as process:
        process.event("say_hello")
        time.sleep(1)
        process.event("say_goodbye")
        return {"message": "Hello World"}


@worker_process_init.connect(weak=False)
def init_worker(sender, **kwargs):
    dashfrog.with_celery()
