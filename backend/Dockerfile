# lifeplace-app/backend/Dockerfile
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        gcc \
        python3-dev \
        musl-dev \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files with dummy environment variables for build time
# These are only used during build - real values come from Fly.io secrets at runtime
ENV SECRET_KEY=dummy-build-key-replaced-at-runtime
ENV DATABASE_URL=postgres://dummy:dummy@dummy:5432/dummy
RUN python manage.py collectstatic --noinput

# Start server
# Gunicorn config: timeout=120s, 2 workers, graceful timeout, max requests for memory management
# For Fly.io deployment, this CMD runs the application
CMD gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --timeout 120 --workers 2 --worker-class sync --max-requests 1000 --max-requests-jitter 50 --graceful-timeout 30 --keep-alive 5 --log-level info