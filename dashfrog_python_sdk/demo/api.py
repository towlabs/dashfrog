import time

from fastapi import FastAPI
import httpx
from pydantic import BaseModel
from starlette.responses import RedirectResponse

from dashfrog_python_sdk import DashFrog

from .db import DemoUser, session

dashfrog = DashFrog("demo.fastapi")
dashfrog2 = DashFrog("demo.fastapi2")

obs = dashfrog.observable("test", "something to observe", "Km2", tenant="Tower")

api = FastAPI(title="DashFrog demo")
dashfrog = dashfrog.with_fastapi(api)
dashfrog2 = dashfrog2.with_httpx()


class HelloBudy(BaseModel):
    name: str
    age: int
    level: str = "nOOb"


@api.get("/")
def index():
    with dashfrog.step("hello-world") as process:
        obs.observe(1)
        process.event("say_hello")
        time.sleep(1)
        process.event("say_goodbye")
        return {"message": "Hello World"}


@api.post("/you")
def hello(body: HelloBudy):
    with dashfrog.flow("say_hello", user_name=body.name, body=body.model_dump_json()):
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
    with dashfrog.step("step4"):
        with dashfrog.flow("error"):
            with dashfrog.step("step5"):
                raise Exception("Something went wrong")


@api.get("/recall")
def recall(callback: str):
    with dashfrog.flow("bhou callback", recall=callback):
        pass

    with dashfrog2.flow("callback", recall=callback):
        with dashfrog.step("step1"):
            with dashfrog.step("step2"):
                with dashfrog.step("step3"):
                    res = httpx.get(callback)
                    if res.status_code != 200:
                        return {"error": res.text}

                    return res.json()


@api.get("/redirect")
def redirect(callback: str):
    with dashfrog.flow("callback", recall=callback):
        return RedirectResponse(callback)

# For development only
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:api", host="0.0.0.0", port=8080, reload=True)  # nosec
