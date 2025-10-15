from datetime import UTC, datetime
from zoneinfo import ZoneInfo


class Converts:
    @staticmethod
    def to_utc(val: datetime) -> datetime:
        """Converts any datetime to utc"""
        if Utils.is_naive(val):
            return val.replace(tzinfo=UTC)

        return val.astimezone(UTC)

    @staticmethod
    def to_timezone(val: datetime, timezone: ZoneInfo) -> datetime:
        """Converts any datetime to provided timezone"""

        return Converts.to_utc(val).astimezone(timezone)


class Utils:
    @staticmethod
    def is_naive(val: datetime) -> bool:
        """Check if datetime is naive"""

        return val.tzinfo is None or val.tzinfo.utcoffset(val) is None
