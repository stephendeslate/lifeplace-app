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

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Change ownership of app directory to non-root user
RUN chown -R appuser:appuser /app

# Collect static files with dummy environment variables for build time
# These are only used during build - real values come from Fly.io secrets at runtime
ENV SECRET_KEY=dummy-build-key-replaced-at-runtime
ENV DATABASE_URL=postgres://dummy:dummy@dummy:5432/dummy
RUN python manage.py collectstatic --noinput

# Switch to non-root user
USER appuser

# Start server using Daphne (ASGI) for WebSocket support
# Daphne is the official ASGI server for Django Channels
CMD daphne -b 0.0.0.0 -p $PORT core.asgi:application