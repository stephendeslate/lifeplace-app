# backend/core/views.py
"""
Core application views including health checks
"""

import time

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET


@csrf_exempt
@require_GET
def health_check(request):
    """
    Basic health check endpoint for uptime monitoring
    Returns 200 OK if application is running

    No authentication required
    Response time should be < 100ms
    """
    return JsonResponse(
        {
            "status": "healthy",
            "service": "lifeplace-backend",
        }
    )


@csrf_exempt
@require_GET
def readiness_check(request):
    """
    Readiness check endpoint for deployment systems
    Verifies database and cache connectivity

    Returns:
        200 OK if all systems operational
        503 Service Unavailable if dependencies are down
    """
    checks = {
        "database": False,
        "cache": False,
    }

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            checks["database"] = True
    except Exception:
        pass

    # Check Redis cache
    try:
        cache_key = f"health_check_{int(time.time())}"
        cache.set(cache_key, "ok", timeout=10)
        checks["cache"] = cache.get(cache_key) == "ok"
        cache.delete(cache_key)
    except Exception:
        pass

    # Return 503 if any check failed
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503

    return JsonResponse(
        {
            "status": "ready" if all_healthy else "not_ready",
            "checks": checks,
        },
        status=status_code,
    )
