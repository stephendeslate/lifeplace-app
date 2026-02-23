"""
Performance monitoring utilities for tracking database queries and API performance
"""

import logging
import time
from functools import wraps

from django.conf import settings
from django.core.cache import cache
from django.db import connection, reset_queries

logger = logging.getLogger(__name__)


class QueryCounter:
    """Context manager to count database queries"""

    def __init__(self, label="Query Block"):
        self.label = label
        self.initial_queries = 0
        self.final_queries = 0

    def __enter__(self):
        reset_queries()
        self.initial_queries = len(connection.queries)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.final_queries = len(connection.queries)
        query_count = self.final_queries - self.initial_queries

        if query_count > 10:  # Warning threshold
            logger.warning(f"[PERFORMANCE] {self.label}: {query_count} queries executed (threshold: 10)")
            if settings.DEBUG:
                for query in connection.queries[self.initial_queries : self.final_queries]:
                    logger.debug(f"  Query: {query['sql'][:100]}... Time: {query['time']}ms")
        else:
            logger.info(f"[PERFORMANCE] {self.label}: {query_count} queries executed")

        return query_count


def measure_queries(func):
    """Decorator to measure database queries in a function"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        if not settings.DEBUG:
            return func(*args, **kwargs)

        with QueryCounter(f"{func.__module__}.{func.__name__}"):
            result = func(*args, **kwargs)

        return result

    return wrapper


def log_slow_queries(threshold_ms=100):
    """Log queries slower than threshold"""
    if not settings.DEBUG:
        return

    slow_queries = [q for q in connection.queries if float(q["time"]) > threshold_ms / 1000]

    for query in slow_queries:
        logger.warning(f"[SLOW QUERY] {query['time']}s: {query['sql'][:200]}...")


class PerformanceMiddleware:
    """Middleware to track request performance"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not settings.DEBUG:
            return self.get_response(request)

        # Start timing
        start_time = time.time()
        reset_queries()

        # Process request
        response = self.get_response(request)

        # Calculate metrics
        duration = (time.time() - start_time) * 1000  # Convert to ms
        query_count = len(connection.queries)

        # Log performance metrics
        if duration > 500:  # Slow request threshold
            logger.warning(f"[SLOW REQUEST] {request.method} {request.path}: {duration:.2f}ms, {query_count} queries")

        # Add headers in debug mode
        if settings.DEBUG:
            response["X-DB-Query-Count"] = str(query_count)
            response["X-Response-Time-ms"] = f"{duration:.2f}"

        # Log slow queries
        log_slow_queries()

        return response


def cached_property(timeout=300):
    """
    Decorator to cache property values for a specified timeout
    Similar to @property but with caching
    """

    def decorator(func):
        @wraps(func)
        def wrapper(self):
            cache_key = f"{self.__class__.__name__}_{self.id}_{func.__name__}"

            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result

            # Calculate and cache
            with QueryCounter(f"cached_property.{func.__name__}"):
                result = func(self)

            cache.set(cache_key, result, timeout)
            return result

        return property(wrapper)

    return decorator


def invalidate_model_cache(model_instance, *property_names):
    """Invalidate cached properties for a model instance"""
    for prop_name in property_names:
        cache_key = f"{model_instance.__class__.__name__}_{model_instance.id}_{prop_name}"
        cache.delete(cache_key)


# Usage example for ViewSets
def optimize_queryset(queryset, serializer_class):
    """
    Automatically optimize a queryset based on serializer fields
    This is a helper to prevent N+1 queries
    """
    select_related_fields = []
    prefetch_related_fields = []

    # Analyze serializer fields
    for field_name, field in serializer_class._declared_fields.items():
        if hasattr(field, "queryset"):
            # It's a related field
            if field.__class__.__name__ in ["PrimaryKeyRelatedField", "SlugRelatedField"]:
                select_related_fields.append(field_name)
            elif field.many:
                prefetch_related_fields.append(field_name)

    # Apply optimizations
    if select_related_fields:
        queryset = queryset.select_related(*select_related_fields)
    if prefetch_related_fields:
        queryset = queryset.prefetch_related(*prefetch_related_fields)

    return queryset
