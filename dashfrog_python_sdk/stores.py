from clickhouse_connect.driver import Client
from domain import entities


class Flows:
    def __init__(self, client: Client):
        self.__client = client

    def insert(self, flow: entities.Flow):
        self.__client.insert(
            "flows",
            [list(flow.model_dump(exclude_none=False).values())],
            column_names=list(flow.model_dump(exclude_none=False).keys()),
        )

    def patch(self, name: str, modified: dict[str, Any]):
        query = "UPDATE flows SET "
        if "name" in modified:
            del modified["name"]  # name cannot be updated !

        params = {"name": name}
        for key, value in modified:
            params[key] = value
            query += f"{key} = {{{key}}}, "

        query = query.strip(", ").strip() + " WHERE name = {name}"

        self.__client.query(query, parameters=params)


class Steps:
    def __init__(self, client: Client):
        self.__client = client

    def insert(self, flow: entities.Flow):
        self.__client.insert(
            "steps",
            [list(flow.model_dump(exclude_none=False).values())],
            column_names=list(flow.model_dump(exclude_none=False).keys()),
        )

    def patch(self, id: str, modified: dict[str, Any]):
        query = "UPDATE steps SET "
        if "name" in modified:
            del modified["name"]  # name cannot be updated !
        if "id" in modified:
            del modified["id"]  # id cannot be updated !

        params = {"id": id}
        for key, value in modified:
            params[key] = value
            query += f"{key} = {{{key}}}, "

        query = query.strip(", ").strip() + " WHERE id = {id}"

        self.__client.query(query, parameters=params)
