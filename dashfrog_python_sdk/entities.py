from copy import copy
from datetime import datetime, timedelta
from typing import Any

from pydantic import BaseModel


class Entity(BaseModel):
    def __init__(self, **data: Any) -> None:
        super().__init__(**data)
        self.__initial_values = copy(data)

    def updated_fields(self) -> list[str]:
        def __check_value(val: Any, init_val: Any):
            if val == init_val:
                return

            if isinstance(val, dict) and init_val:
                checked_keys = []
                str_checked_keys = []
                for k, v in val.items():
                    if str(k) not in init_val or init_val[str(k)] != v:
                        modified_key.append(key)
                        break

                    checked_keys.append(k)
                    str_checked_keys.append(str(k))

                checked_keys.sort()

                if hasattr(init_val, "keys") and [
                    k
                    for k in init_val.keys()
                    if k not in checked_keys and k not in str_checked_keys
                ]:
                    modified_key.append(key)
            else:
                modified_key.append(key)

        modified_key: list[str] = []
        analysed_key: list[str] = []

        for key, value in self.model_dump(exclude_defaults=True).items():
            analysed_key.append(key)

            if key not in self.__initial_values:
                modified_key.append(key)
                continue

            initial_value = self.__initial_values[key]
            __check_value(value, initial_value)
        old_item = self.__class__(**self.__initial_values)
        for key, initial_value in old_item.model_dump(exclude_defaults=True).items():
            if key in analysed_key:
                continue

            value = getattr(self, key)
            __check_value(value, initial_value)

        return list(set(modified_key))

    def dump_updated_fields(self) -> dict[str, Any]:
        return {
            k: v
            for k, v in self.model_dump(exclude_defaults=False).items()
            if k in self.updated_fields()
        }


class Flow(BaseModel):
    name: str
    description: str | None = None
    labels: dict[str, str]
    service_name: str

    status: str
    status_reason: str | None = None

    trace_id: str
    created_at: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration: timedelta | None = None


class Step(BaseModel):
    id: str
    name: str
    description: str | None = None
    labels: dict[str, str]
    service_name: str

    status: str
    status_reason: str | None = None

    parent_id: str | None = None
    trace_id: str
    created_at: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration: timedelta | None = None
