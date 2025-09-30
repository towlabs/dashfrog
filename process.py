
class Process:
    name: str
    __web_provider: str
    __web_app: object
    def __init__(self, name: str, web_provider: str, web_app: object):
        self.name = name
        self.__web_provider = web_provider
        self.__web_app = web_app

