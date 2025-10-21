from contextvars import Context
from datetime import datetime

from prometheus_api_client.prometheus_connect import PrometheusConnect
from structlog import BoundLogger

from src.adapters.stores import (
    Metrics as MetricsStore,
)
from src.core import AsyncSessionMaker, as_async


class Metrics:
    TIME_RANGE_PRECISION = dict(
        [
            (-1, 180),
            (3600, 240),  # range more than 1h
            (6 * 3600, 180),  #  range more than 6h
            (24 * 3600, 144),  # range more than 1d
            (7 * 24 * 3600, 168),  #  range more than 7d
            (30 * 24 * 3600, 180),  #  range more than a month
            (367 * 24 * 3600, 130),  #  range more than a year
        ]
    )

    def __init__(
        self,
        store: MetricsStore,
        session_maker: AsyncSessionMaker,
        prom: PrometheusConnect,
        logger: BoundLogger,
    ):
        self.__log = logger.bind(name="usecases.Metrics")
        self.__metrics = store
        self.__session_maker = session_maker
        self.__prom = prom

    async def list(self, _ctx: Context):
        log = self.__log.bind(action="list")

        async with self.__session_maker.begin():
            labels = await self.__metrics.list(True)

        log.debug("Success !")
        return labels

    def _calculate_nice_step(self, step_seconds: float) -> str:
        """
        Convert step in seconds to a nice human-readable format with appropriate time units.

        Rules:
        - < 60s: multiples of 5 seconds (5s, 10s, 15s, ...)
        - 60s - 3600s: multiples of 5 minutes (5m, 10m, 15m, ...)
        - 3600s - 86400s: multiples of 1 hour (1h, 2h, 3h, ...)
        - 86400s - ~60 days: 1 day or multiples of 7 days (1d, 7d, 14d, ...)
        - ~60 days - 365 days: multiples of 1 month (1mo, 2mo, 3mo, ...)
        - >= 365 days: years (1y, 2y, 5y, then multiples of 5: 10y, 15y, 20y, ...)
        """

        if step_seconds <= 0:
            return "5s"  # Default to 5 seconds for invalid inputs

        # Define time constants
        MINUTE = 60
        HOUR = 3600
        DAY = 86400
        MONTH = 30 * DAY  # Approximate month (30 days)
        YEAR = 365 * DAY  # Approximate year (365 days)

        # Determine the best unit based on the magnitude
        if step_seconds >= YEAR:  # >= 1 year
            years = step_seconds / YEAR
            if years < 3:
                return f"{years}y"
            elif years < 5:
                return "5y"
            else:
                # Round to nearest multiple of 5
                nice_years = int(max(5, round(years / 5) * 5))
                return f"{nice_years}y"
        elif step_seconds >= 2 * MONTH:  # >= ~60 days (2 months)
            months = step_seconds / MONTH
            nice_months = int(max(1, round(months)))
            return f"{nice_months}mo"
        elif step_seconds >= DAY:  # >= 1 day
            days = step_seconds / DAY
            if days < 7:
                return "1d"
            else:
                # Round to nearest multiple of 7
                nice_days = int(max(7, round(days / 7) * 7))
                return f"{nice_days}d"
        elif step_seconds >= HOUR:  # >= 1 hour
            hours = step_seconds / HOUR
            nice_hours = int(max(1, round(hours)))
            return f"{nice_hours}h"
        elif step_seconds >= MINUTE:  # >= 1 minute
            minutes = step_seconds / MINUTE
            nice_minutes = int(max(1, round(minutes / 5) * 5))
            return f"{nice_minutes}m"
        else:  # < 1 minute
            nice_seconds = int(max(5, round(step_seconds / 5) * 5))
            return f"{nice_seconds}s"

    def query(self, _ctx, query: str, from_date: datetime, to_date: datetime, steps: str | None = None):
        time_range = int((to_date - from_date).total_seconds())

        if not steps:
            last_born = None
            precision = 180
            for born, next_precision in self.TIME_RANGE_PRECISION.items():
                if not last_born:
                    last_born = born
                    precision = next_precision
                    continue

                if last_born < time_range <= born:
                    break

                last_born = born
                precision = next_precision

            steps = self._calculate_nice_step(time_range // precision)

        metrics_data = self.__prom.custom_query_range(query, from_date, to_date, steps)
        res = []
        for data in metrics_data:
            labels = data["metric"]
            if "__name__" in labels:
                del labels["__name__"]

            for val in data["values"]:
                res.append({"ts": val[0], "value": val[1], "labels": labels})

        res.sort(key=lambda x: x["ts"])
        return res

    async def scrape(self, _ctx: Context):
        log = self.__log.bind(action="scrape")

        async with self.__session_maker.begin():
            scrapped_metrics = await as_async(self.__metrics.scrape)

            await self.__metrics.upserts(scrapped_metrics)

        log.debug("Success !")
