from contextvars import Context

from clickhouse_connect.driver import Client

from domain import entities
from domain.entities import StoreFilter


class Flows:
    def __init__(self, client: Client):
        self.__client = client

    def list(self, ctx: Context, *filters: StoreFilter) -> list[entities.Flow]:
        query = "SELECT * FROM dashfrog.flows WHERE"

        params = {}

        for filt in filters:
            params[filt.key] = filt.value

            query += f" {filt.key} {filt.op} {{{filt.key}}} AND"

        query = query.strip("WHERE").strip(" AND")
        results = self.__client.query(query, parameters=params)
        res = []
        for row in results.named_results():
            res.append(entities.Flow(**row))

        return res
