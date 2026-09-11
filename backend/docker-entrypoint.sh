#!/bin/sh
# ============================================================
# Whisper Mart backend entrypoint.
# Applies Alembic migrations before starting the app server, so a fresh
# deploy or a schema change never requires a manual migration step.
# ============================================================
set -e

echo "==> Waiting for database..."
python -c "
import time, sys
from sqlalchemy import create_engine, text
from app.core.config import settings

for attempt in range(30):
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        print('Database is ready.')
        sys.exit(0)
    except Exception as e:
        print(f'  ...database not ready yet (attempt {attempt+1}/30): {e}')
        time.sleep(2)
sys.exit('Database never became ready.')
"

echo "==> Running Alembic migrations..."
alembic upgrade head

echo "==> Starting server..."
exec "$@"
