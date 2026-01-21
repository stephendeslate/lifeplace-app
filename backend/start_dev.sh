#!/bin/bash
# Start all backend services for local development
# Usage: cd backend && ./start_dev.sh

set -e  # Exit on error

cd "$(dirname "$0")"
source ../venv/bin/activate

echo "🚀 Starting LifePlace Backend Services..."
echo "=========================================="

# Start Celery worker in background
echo "📨 Starting Celery worker..."
celery -A core worker --loglevel=info --queues=celery,communications,notifications,analytics,events,payments,contracts,sales &
CELERY_WORKER_PID=$!
echo "✅ Celery worker started (PID: $CELERY_WORKER_PID)"
echo "   Listening on queues: celery, communications, notifications, analytics, events, payments, contracts, sales"

# Start Celery beat for periodic tasks in background
echo "⏰ Starting Celery beat..."
celery -A core beat --loglevel=info &
CELERY_BEAT_PID=$!
echo "✅ Celery beat started (PID: $CELERY_BEAT_PID)"

# Give Celery a moment to initialize
sleep 2

# Start Django with Daphne (for WebSocket support)
echo "🌐 Starting Django with Daphne..."
echo "=========================================="
echo "📍 Server will be available at: http://localhost:8000"
echo "🛑 Press Ctrl+C to stop all services"
echo "=========================================="

# Start Daphne in foreground
daphne -b 0.0.0.0 -p 8000 core.asgi:application

# Cleanup function - runs on script exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $CELERY_WORKER_PID $CELERY_BEAT_PID 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

# Register cleanup function to run on EXIT signal
trap cleanup EXIT INT TERM
