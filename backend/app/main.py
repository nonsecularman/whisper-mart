import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.database.db import Base, engine
import app.models  # noqa: F401  (ensures all models are registered on Base.metadata)

from app.api import (
    auth, users, categories, products, cart, wishlist, orders, reviews,
    sellers, coupons, admin, payments,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("whisper_mart")

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title=settings.APP_NAME,
    description="Whisper Mart — multi-vendor e-commerce marketplace API",
    version="1.0.0",
    # Hide interactive API docs in production to reduce attack surface / avoid
    # leaking the full schema of internal-only routes to anonymous visitors.
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.allowed_hosts_list != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    # Standard defensive headers. HSTS is only meaningful (and only sent)
    # once the site is actually served over HTTPS, which in this stack is
    # terminated at the Nginx reverse proxy — see deployment/nginx.conf.
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "message": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"success": False, "message": "Validation error", "errors": exc.errors()})


@app.on_event("startup")
def on_startup():
    # For quick local/dev bring-up only. In production, use Alembic
    # migrations (backend/alembic/) instead of create_all — see README §6.
    if not settings.is_production:
        Base.metadata.create_all(bind=engine)
    logger.info(
        "Whisper Mart API started. env=%s payment_provider=%s docs_enabled=%s",
        settings.ENV, settings.PAYMENT_PROVIDER, not settings.is_production,
    )


@app.get("/")
def root():
    return {"name": settings.APP_NAME, "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(wishlist.router)
app.include_router(orders.router)
app.include_router(reviews.router)
app.include_router(sellers.router)
app.include_router(coupons.router)
app.include_router(admin.router)
app.include_router(payments.router)
