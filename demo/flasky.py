import time

from flask import Flask, request
from pydantic import BaseModel
import requests

from dashfrog import DashFrog

dashfrog = DashFrog("demo.flask")

api = Flask(__name__)
dashfrog = dashfrog.with_flask(api)


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
def hello():
    body = request.get_json()
    with dashfrog.start_process("say_hello", user_name=body["name"], body=body):
        return {"message": f"Hello {body['name']}", **body}


@api.get("/error")
def with_error():
    with dashfrog.start_process("hello-world") as process:
        process.event("say_hello")
        raise Exception("Something went wrong")


@api.get("/recall")
def recall():
    callback = request.args.get("callback")
    if not callback:
        raise ValueError("Missing callback")

    with dashfrog.start_process("callback", recall=callback):
        res = requests.get(callback)
        if res.status_code != 200:
            return {"error": res.text}

        return res.json()
