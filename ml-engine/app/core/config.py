from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017/tracex"
    gemini_api_key: str = ""
    # No default — startup fails loudly if SECRET_KEY is not provided in the environment.
    secret_key: str
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    max_upload_size_mb: int = 500
    session_ttl_hours: int = 24
    env: str = "development"

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        known_weak = {"change_this_secret", "change_this", "secret", "changeme"}
        if not v or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if v.lower() in known_weak:
            raise ValueError(
                f"SECRET_KEY is set to a known placeholder value '{v}'. "
                "Set a strong random value in ml-engine/.env."
            )
        return v

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
