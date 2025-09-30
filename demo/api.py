import time

from fastapi import FastAPI
import httpx
from pydantic import BaseModel
from starlette.responses import RedirectResponse

from dashfrog import DashFrog

dashfrog = DashFrog("demo.fastapi")

api = FastAPI(title="DashFrog demo")
dashfrog = dashfrog.with_fastapi(api)


class HelloBudy(BaseModel):
    name: str
    age: int
    level: str = "nOOb"


@api.get("/")
def index():
    with dashfrog.start_process("hello-world") as process:
        process.event("say_hello")
        time.sleep(1)
        process.event("say_goodbye")
        return {"message": "Hello World"}


@api.post("/you")
def hello(body: HelloBudy):
    with dashfrog.start_process("say_hello", user_name=body.name, body=body.model_dump_json()):
        return {"message": f"Hello {body.name}", **body.model_dump()}


@api.get("/error")
def with_error():
    with dashfrog.start_process("hello-world") as process:
        process.event("say_hello")
        raise Exception("Something went wrong")


@api.get("/recall")
def recall(callback: str):
    with dashfrog.start_process("callback", recall=callback):
        res = httpx.get(callback)
        if res.status_code != 200:
            return {"error": res.text}

        return res.json()


@api.get("/redirect")
def redirect(callback: str):
    with dashfrog.start_process("callback", recall=callback):
        return RedirectResponse(callback)
