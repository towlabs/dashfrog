import time

from fastapi import FastAPI
import httpx
from pydantic import BaseModel
from starlette.responses import RedirectResponse

from dashfrog_python_sdk import DashFrog

from .db import DemoUser, engine, session

dashfrog = DashFrog("demo.fastapi")
obs = dashfrog.observable("test", "something to observe", "Km2", tenant="Tower")

api = FastAPI(title="DashFrog demo")
dashfrog = dashfrog.with_fastapi(api).with_httpx().with_sqlalchemy(engine)


class HelloBudy(BaseModel):
    name: str
    age: int
    level: str = "nOOb"


@api.get("/")
def index():
    with dashfrog.new_flow("hello-world") as process:
        obs.observe(1)
        process.event("say_hello")
        time.sleep(1)
        process.event("say_goodbye")
        return {"message": "Hello World"}


@api.post("/you")
def hello(body: HelloBudy):
    with dashfrog.new_flow(
        "say_hello", user_name=body.name, body=body.model_dump_json()
    ):
        obs.observe(10)
        try:
            with session() as ses:
                ses.add(DemoUser(name=body.name))
        except Exception:
            pass

        return {"message": f"Hello {body.name}", **body.model_dump()}


@api.get("/error")
def with_error():
    obs.observe(-5)
    with dashfrog.new_flow("error"):
        raise Exception("Something went wrong")


@api.get("/recall")
def recall(callback: str):
    with dashfrog.new_flow("callback", recall=callback):
        res = httpx.get(callback)
        if res.status_code != 200:
            return {"error": res.text}

        return res.json()


@api.get("/redirect")
def redirect(callback: str):
    with dashfrog.new_flow("callback", recall=callback):
        return RedirectResponse(callback)
