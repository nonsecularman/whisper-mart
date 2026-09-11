FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

RUN mkdir -p /app/uploads/products /app/uploads/sellers \
    && chmod +x /app/docker-entrypoint.sh

# Run as a non-root user — a compromised worker process should not have
# write access to anything outside its own upload directory.
RUN groupadd --system whisper && useradd --system --gid whisper --home /app whisper \
    && chown -R whisper:whisper /app
USER whisper

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# GUNICORN_WORKERS defaults to 4; override via env for larger/smaller boxes.
# gunicorn with the uvicorn worker class is the recommended production
# process manager for FastAPI (handles worker restarts, graceful reloads,
# and multi-core usage — a bare `uvicorn` process is single-process).
ENV GUNICORN_WORKERS=4
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["sh", "-c", "gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w ${GUNICORN_WORKERS} -b 0.0.0.0:8000 --access-logfile - --error-logfile - --timeout 60"]
