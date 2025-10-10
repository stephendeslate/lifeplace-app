#!/bin/bash
# Simple start script for Railway - runs all processes
# This runs web, worker, and beat in a single service

# Start Celery worker in background
celery -A core worker --loglevel=info --queues=celery,communications,notifications,analytics &

# Start Celery beat in background
celery -A core beat --loglevel=info &

# Start Daphne in foreground (keeps container running)
daphne -p $PORT core.asgi:application
