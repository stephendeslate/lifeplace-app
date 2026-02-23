"""
Circuit Breaker Pattern Implementation

Provides resilience for third-party API calls (Stripe, Brevo, Expo, etc.)
with configurable thresholds and recovery behavior.
"""

import functools
import logging
from collections.abc import Callable
from contextlib import contextmanager

from django.core.cache import cache

logger = logging.getLogger(__name__)


class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open and request is blocked"""

    def __init__(self, service_name: str, message: str = None):
        self.service_name = service_name
        self.message = message or f"Circuit breaker is open for {service_name}"
        super().__init__(self.message)


class CircuitBreaker:
    """
    Circuit breaker implementation with database and cache backing.

    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Failing fast, requests blocked
    - HALF_OPEN: Testing recovery, limited requests allowed

    Usage:
        cb = CircuitBreaker('stripe')

        # As context manager
        with cb.call():
            result = stripe.PaymentIntent.create(...)

        # As decorator
        @cb.protect
        def call_stripe_api():
            return stripe.PaymentIntent.create(...)
    """

    # Cache key prefix for fast state lookups
    CACHE_PREFIX = "circuit_breaker:"
    CACHE_TTL = 300  # 5 minutes

    def __init__(
        self,
        service_name: str,
        failure_threshold: int = 5,
        success_threshold: int = 3,
        recovery_timeout: int = 60,
        excluded_exceptions: tuple = None,
    ):
        """
        Initialize circuit breaker.

        Args:
            service_name: Name of the service (e.g., 'stripe', 'brevo')
            failure_threshold: Failures before opening circuit
            success_threshold: Successes in half-open to close circuit
            recovery_timeout: Seconds before trying half-open
            excluded_exceptions: Exception types that don't count as failures
        """
        self.service_name = service_name
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.recovery_timeout = recovery_timeout
        self.excluded_exceptions = excluded_exceptions or ()

    def _get_cache_key(self, key_type: str) -> str:
        """Get cache key for circuit breaker state"""
        return f"{self.CACHE_PREFIX}{self.service_name}:{key_type}"

    def _get_db_state(self):
        """Get or create circuit breaker state from database"""
        from .models import CircuitBreakerState

        return CircuitBreakerState.get_or_create_for_service(
            self.service_name,
            failure_threshold=self.failure_threshold,
            success_threshold=self.success_threshold,
            recovery_timeout_seconds=self.recovery_timeout,
        )

    def _get_cached_state(self) -> str | None:
        """Get circuit state from cache for fast lookups"""
        return cache.get(self._get_cache_key("state"))

    def _set_cached_state(self, state: str):
        """Cache circuit state for fast lookups"""
        cache.set(self._get_cache_key("state"), state, self.CACHE_TTL)

    def get_state(self) -> str:
        """Get current circuit state"""
        # Try cache first
        cached = self._get_cached_state()
        if cached:
            return cached

        # Fall back to database
        db_state = self._get_db_state()
        self._set_cached_state(db_state.state)
        return db_state.state

    def can_execute(self) -> bool:
        """Check if a request can be executed"""
        db_state = self._get_db_state()
        can_exec = db_state.can_execute()
        self._set_cached_state(db_state.state)
        return can_exec

    def record_success(self):
        """Record a successful call"""
        db_state = self._get_db_state()
        db_state.record_success()
        self._set_cached_state(db_state.state)

        logger.debug(f"Circuit breaker {self.service_name}: success recorded, state={db_state.state}")

    def record_failure(self, exception: Exception = None):
        """Record a failed call"""
        db_state = self._get_db_state()
        previous_state = db_state.state
        db_state.record_failure()
        self._set_cached_state(db_state.state)

        if db_state.state != previous_state:
            logger.warning(f"Circuit breaker {self.service_name}: state changed {previous_state} -> {db_state.state}")

        logger.debug(
            f"Circuit breaker {self.service_name}: failure recorded "
            f"({db_state.failure_count}/{db_state.failure_threshold}), "
            f"state={db_state.state}"
        )

    @contextmanager
    def call(self):
        """
        Context manager for circuit breaker protected calls.

        Usage:
            with circuit_breaker.call():
                result = api.call()
        """
        if not self.can_execute():
            raise CircuitBreakerError(self.service_name)

        try:
            yield
            self.record_success()
        except Exception as e:
            # Don't count excluded exceptions as failures
            if isinstance(e, self.excluded_exceptions):
                raise

            self.record_failure(e)
            raise

    def protect(self, func: Callable) -> Callable:
        """
        Decorator to protect a function with circuit breaker.

        Usage:
            @circuit_breaker.protect
            def call_api():
                return api.call()
        """

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not self.can_execute():
                raise CircuitBreakerError(self.service_name)

            try:
                result = func(*args, **kwargs)
                self.record_success()
                return result
            except Exception as e:
                if isinstance(e, self.excluded_exceptions):
                    raise

                self.record_failure(e)
                raise

        return wrapper

    def reset(self):
        """Manually reset circuit breaker to closed state"""
        db_state = self._get_db_state()
        db_state.state = "CLOSED"
        db_state.failure_count = 0
        db_state.half_open_successes = 0
        db_state.opened_at = None
        db_state.save()
        self._set_cached_state("CLOSED")

        logger.info(f"Circuit breaker {self.service_name}: manually reset to CLOSED")


# =============================================================================
# Pre-configured Circuit Breakers for Common Services
# =============================================================================

# Stripe circuit breaker with appropriate settings
stripe_circuit_breaker = CircuitBreaker(
    service_name="stripe",
    failure_threshold=5,
    success_threshold=3,
    recovery_timeout=60,
    # Don't count client errors (4xx) as failures, only server/network errors
    excluded_exceptions=(),  # Will be set in usage
)


# Brevo (email) circuit breaker
brevo_circuit_breaker = CircuitBreaker(
    service_name="brevo",
    failure_threshold=5,
    success_threshold=3,
    recovery_timeout=120,
)


# Expo (push notifications) circuit breaker
expo_circuit_breaker = CircuitBreaker(
    service_name="expo",
    failure_threshold=5,
    success_threshold=3,
    recovery_timeout=60,
)


# Storage (R2) circuit breaker
storage_circuit_breaker = CircuitBreaker(
    service_name="storage",
    failure_threshold=5,
    success_threshold=3,
    recovery_timeout=30,
)


def with_circuit_breaker(
    service_name: str,
    failure_threshold: int = 5,
    fallback: Callable = None,
):
    """
    Decorator factory for circuit breaker protection.

    Usage:
        @with_circuit_breaker('stripe', failure_threshold=5)
        def process_payment():
            return stripe.PaymentIntent.create(...)

        # With fallback
        @with_circuit_breaker('stripe', fallback=lambda: {'status': 'unavailable'})
        def check_status():
            return stripe.Account.retrieve()
    """
    cb = CircuitBreaker(service_name, failure_threshold=failure_threshold)

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not cb.can_execute():
                if fallback:
                    logger.warning(f"Circuit breaker {service_name} open, using fallback")
                    return fallback(*args, **kwargs) if callable(fallback) else fallback
                raise CircuitBreakerError(service_name)

            try:
                result = func(*args, **kwargs)
                cb.record_success()
                return result
            except Exception as e:
                cb.record_failure(e)
                if fallback:
                    logger.warning(f"Service {service_name} failed, using fallback: {e}")
                    return fallback(*args, **kwargs) if callable(fallback) else fallback
                raise

        return wrapper

    return decorator
