import os
import sys
import secrets
from pydantic_settings import BaseSettings
from typing import List

DEFAULT_JWT_SECRET = "change-this-secret-in-production"


class Settings(BaseSettings):
    APP_NAME: str = "Whisper Mart API"
    ENV: str = os.getenv("ENV", "development")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://whisper:whisper@localhost:5432/whisper_mart",
    )

    JWT_SECRET: str = os.getenv("JWT_SECRET", DEFAULT_JWT_SECRET)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "5"))

    PAYMENT_PROVIDER: str = os.getenv("PAYMENT_PROVIDER", "mock")
    PAYMENT_KEY_ID: str = os.getenv("PAYMENT_KEY_ID", "")
    PAYMENT_KEY_SECRET: str = os.getenv("PAYMENT_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    ALLOWED_HOSTS: str = os.getenv("ALLOWED_HOSTS", "*")

    # Rate limits (requests per window) for brute-force-sensitive endpoints.
    RATE_LIMIT_AUTH: str = os.getenv("RATE_LIMIT_AUTH", "10/minute")
    RATE_LIMIT_CHECKOUT: str = os.getenv("RATE_LIMIT_CHECKOUT", "20/minute")
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "120/minute")

    FREE_DELIVERY_THRESHOLD: float = 499.0
    DELIVERY_FEE: float = 49.0

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_hosts_list(self) -> List[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    class Config:
        env_file = ".env"


settings = Settings()

# ---- Hard safety rail: refuse to boot in production with the default secret ----
# A leaked/known JWT signing secret lets anyone forge tokens for any user,
# including admins, so this is treated as a fatal startup error rather than
# a warning.
if settings.is_production and settings.JWT_SECRET == DEFAULT_JWT_SECRET:
    sys.exit(
        "FATAL: JWT_SECRET is still set to the default placeholder value while ENV=production. "
        "Set a long random secret (e.g. `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`) "
        "in your .env file before starting the API."
    )

if settings.is_production and settings.CORS_ORIGINS.strip() == "*":
    sys.exit(
        "FATAL: CORS_ORIGINS is set to '*' while ENV=production. "
        "Set it to your real frontend domain(s), comma-separated."
    )
