from pydantic import BaseModel
from pydantic_settings import (
    BaseSettings,
    JsonConfigSettingsSource,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    YamlConfigSettingsSource,
)


class Config(BaseSettings):
    class Database(BaseModel):
        host: str = "0.0.0.0"
        user: str = "dev"
        database: str = "dashfrog"
        port: int | None = None
        password: str

    class Prometheus(BaseModel):
        url: str = "http://localhost:9090"
        disable_ssl: bool = True  # insecured default

    class Logs(BaseModel):
        level: str = "INFO"
        activate_axiom: bool = False
        log_libs: bool = False

    url: str = "0.0.0.0:8080"
    env: str = "dev"
    release: str = "0.0.0"

    click_house: Database = Database(password="dev-pwd*")  # nosec default to local click password
    psql: Database = Database(password="dev-pwd*")  # nosec default to local click password
    logs: Logs = Logs()
    prometheus: Prometheus = Prometheus()

    model_config = SettingsConfigDict(
        env_ignore_empty=True,
        env_nested_delimiter=".",
        env_parse_enums=True,
        extra="ignore",
        env_file=".env",
        json_file="config.json",
        yaml_file="config.yaml",
    )

    @classmethod
    def settings_customise_sources(  # type: ignore[override] éze< &é²<passed as kwargs in underling code
        cls,
        settings_cls: type[BaseSettings],
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        **_,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            # Load env settings first so providing an env var at runtime
            # always overrides config from files.
            env_settings,
            JsonConfigSettingsSource(settings_cls),
            YamlConfigSettingsSource(settings_cls),
            # Load env settings last so any other way to configure overrides..
            dotenv_settings,
        )
