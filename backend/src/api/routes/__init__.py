from src import router


class API:
    def __init__(self, *args):
        for route in args:
            router.include_router(route.ep)
