# backend/core/domains/payments/services/gateway_monitoring_service.py

import logging
from datetime import datetime, timedelta
from typing import Any

from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)


class GatewayHealthCheck:
    """Result of gateway health check"""

    def __init__(
        self,
        gateway_code: str,
        is_healthy: bool,
        response_time_ms: float = None,
        error_message: str = None,
        last_success: datetime = None,
        consecutive_failures: int = 0,
    ):
        self.gateway_code = gateway_code
        self.is_healthy = is_healthy
        self.response_time_ms = response_time_ms
        self.error_message = error_message
        self.last_success = last_success
        self.consecutive_failures = consecutive_failures
        self.checked_at = timezone.now()

    def to_dict(self) -> dict[str, Any]:
        return {
            "gateway_code": self.gateway_code,
            "is_healthy": self.is_healthy,
            "response_time_ms": self.response_time_ms,
            "error_message": self.error_message,
            "last_success": self.last_success.isoformat() if self.last_success else None,
            "consecutive_failures": self.consecutive_failures,
            "checked_at": self.checked_at.isoformat(),
        }


class GatewayFailoverRule:
    """Rules for gateway failover behavior"""

    def __init__(
        self,
        max_consecutive_failures: int = 3,
        health_check_interval_seconds: int = 300,
        recovery_check_interval_seconds: int = 600,
        max_response_time_ms: float = 5000.0,
    ):
        self.max_consecutive_failures = max_consecutive_failures
        self.health_check_interval_seconds = health_check_interval_seconds
        self.recovery_check_interval_seconds = recovery_check_interval_seconds
        self.max_response_time_ms = max_response_time_ms


class GatewayMonitoringService:
    """
    Service for monitoring payment gateway health and managing failover.

    Provides:
    - Real-time health monitoring
    - Automatic failover to backup gateways
    - Performance metrics tracking
    - Alert generation for gateway issues
    - Recovery monitoring
    """

    CACHE_PREFIX = "gateway_health"
    FAILOVER_CACHE_PREFIX = "gateway_failover"

    @classmethod
    def check_gateway_health(cls, gateway_code: str, force_check: bool = False) -> GatewayHealthCheck:
        """
        Check health of a specific payment gateway.

        Args:
            gateway_code: Gateway identifier
            force_check: Force fresh check, bypass cache

        Returns:
            GatewayHealthCheck with current status
        """
        cache_key = f"{cls.CACHE_PREFIX}_{gateway_code}"

        # Return cached result if not forcing check
        if not force_check:
            cached_result = cache.get(cache_key)
            if cached_result:
                return GatewayHealthCheck(**cached_result)

        try:
            # Perform actual health check
            health_check = cls._perform_health_check(gateway_code)

            # Cache the result
            cache.set(
                cache_key,
                health_check.to_dict(),
                timeout=300,  # 5 minutes
            )

            # Update failure tracking
            cls._update_failure_tracking(health_check)

            # Check if failover is needed
            cls._check_failover_needed(health_check)

            return health_check

        except Exception as e:
            logger.error(f"Error checking gateway health for {gateway_code}: {e}")
            return GatewayHealthCheck(gateway_code=gateway_code, is_healthy=False, error_message=str(e))

    @classmethod
    def check_all_gateways_health(cls) -> dict[str, GatewayHealthCheck]:
        """
        Check health of all available gateways.

        Returns:
            Dict mapping gateway codes to health check results
        """
        try:
            from .payment_gateway_factory import PaymentGatewayFactory

            available_gateways = PaymentGatewayFactory.get_available_gateways()
            health_results = {}

            for gateway_code in available_gateways:
                health_results[gateway_code] = cls.check_gateway_health(gateway_code)

            return health_results

        except Exception as e:
            logger.error(f"Error checking all gateways health: {e}")
            return {}

    @classmethod
    def get_healthy_gateways(cls, exclude_failed: bool = True) -> list[str]:
        """
        Get list of currently healthy gateways.

        Args:
            exclude_failed: Whether to exclude gateways marked as failed

        Returns:
            List of healthy gateway codes
        """
        try:
            health_results = cls.check_all_gateways_health()
            healthy_gateways = []

            for gateway_code, health_check in health_results.items():
                if health_check.is_healthy:
                    if exclude_failed and cls._is_gateway_in_failover(gateway_code):
                        continue
                    healthy_gateways.append(gateway_code)

            return healthy_gateways

        except Exception as e:
            logger.error(f"Error getting healthy gateways: {e}")
            return []

    @classmethod
    def get_primary_gateway(cls, exclude_failed: bool = True) -> str | None:
        """
        Get the primary (best available) payment gateway.

        Args:
            exclude_failed: Whether to exclude gateways in failover state

        Returns:
            Primary gateway code or None if none available
        """
        try:
            healthy_gateways = cls.get_healthy_gateways(exclude_failed)

            if not healthy_gateways:
                return None

            # Get gateway priorities and performance metrics
            gateway_scores = cls._score_gateways(healthy_gateways)

            # Return highest scoring gateway
            return max(gateway_scores.items(), key=lambda x: x[1])[0]

        except Exception as e:
            logger.error(f"Error getting primary gateway: {e}")
            return None

    @classmethod
    def handle_gateway_failure(cls, gateway_code: str, error_message: str = None) -> bool:
        """
        Handle gateway failure event.

        Args:
            gateway_code: Failed gateway
            error_message: Failure description

        Returns:
            bool: True if failover was successful
        """
        try:
            logger.warning(f"Handling gateway failure for {gateway_code}: {error_message}")

            # Mark gateway as failed
            cls._mark_gateway_failed(gateway_code, error_message)

            # Update health status
            health_check = GatewayHealthCheck(
                gateway_code=gateway_code,
                is_healthy=False,
                error_message=error_message,
                consecutive_failures=cls._get_consecutive_failures(gateway_code) + 1,
            )
            cls._update_failure_tracking(health_check)

            # Find alternative gateway
            alternative_gateway = cls.get_primary_gateway(exclude_failed=True)

            if alternative_gateway:
                cls._log_failover(gateway_code, alternative_gateway, error_message)
                cls._notify_admin_failover(gateway_code, alternative_gateway, error_message)
                return True
            else:
                # No healthy alternatives available
                cls._notify_admin_critical(gateway_code, "No healthy gateway alternatives available")
                return False

        except Exception as e:
            logger.error(f"Error handling gateway failure: {e}")
            return False

    @classmethod
    def recover_gateway(cls, gateway_code: str) -> bool:
        """
        Attempt to recover a failed gateway.

        Args:
            gateway_code: Gateway to recover

        Returns:
            bool: True if recovery was successful
        """
        try:
            logger.info(f"Attempting to recover gateway {gateway_code}")

            # Perform health check
            health_check = cls.check_gateway_health(gateway_code, force_check=True)

            if health_check.is_healthy:
                # Clear failover status
                cls._clear_gateway_failover(gateway_code)

                # Reset failure count
                cls._reset_failure_tracking(gateway_code)

                logger.info(f"Successfully recovered gateway {gateway_code}")
                cls._notify_admin_recovery(gateway_code)
                return True
            else:
                logger.warning(f"Gateway {gateway_code} still unhealthy: {health_check.error_message}")
                return False

        except Exception as e:
            logger.error(f"Error recovering gateway {gateway_code}: {e}")
            return False

    @classmethod
    def get_gateway_metrics(cls, gateway_code: str = None, hours: int = 24) -> dict[str, Any]:
        """Get performance metrics for gateways — delegates query to selectors."""
        from ..selectors import get_gateway_metrics

        metrics = get_gateway_metrics(gateway_code=gateway_code, hours=hours)
        # Add health status (requires cls method, not a pure read)
        if gateway_code and "error" not in metrics:
            metrics["health_status"] = cls.check_gateway_health(gateway_code).to_dict()
        return metrics

    @classmethod
    def get_monitoring_dashboard_data(cls) -> dict[str, Any]:
        """
        Get comprehensive monitoring data for dashboard.

        Returns:
            Dictionary with all monitoring information
        """
        try:
            # Get health status for all gateways
            health_results = cls.check_all_gateways_health()

            # Get current failover status
            failover_status = {}
            for gateway_code in health_results:
                failover_status[gateway_code] = cls._is_gateway_in_failover(gateway_code)

            # Get primary gateway
            primary_gateway = cls.get_primary_gateway()

            # Get recent metrics
            recent_metrics = {}
            for gateway_code in health_results:
                recent_metrics[gateway_code] = cls.get_gateway_metrics(gateway_code, hours=1)

            return {
                "timestamp": timezone.now().isoformat(),
                "health_status": {code: check.to_dict() for code, check in health_results.items()},
                "failover_status": failover_status,
                "primary_gateway": primary_gateway,
                "recent_metrics": recent_metrics,
                "alerts": cls._get_active_alerts(),
            }

        except Exception as e:
            logger.error(f"Error getting monitoring dashboard data: {e}")
            return {"error": str(e)}

    @classmethod
    def _perform_health_check(cls, gateway_code: str) -> GatewayHealthCheck:
        """Perform actual health check on gateway"""
        try:
            import time

            from .payment_gateway_factory import PaymentGatewayFactory

            # Get gateway instance
            gateway = PaymentGatewayFactory.create_gateway(gateway_code)

            # Check basic connectivity and response time
            start_time = time.time()

            # Use gateway's built-in health check if available
            is_healthy = gateway.is_healthy()

            response_time_ms = (time.time() - start_time) * 1000

            # Get failure tracking info
            consecutive_failures = cls._get_consecutive_failures(gateway_code)
            last_success = cls._get_last_success(gateway_code)

            return GatewayHealthCheck(
                gateway_code=gateway_code,
                is_healthy=is_healthy,
                response_time_ms=response_time_ms,
                consecutive_failures=consecutive_failures,
                last_success=last_success,
            )

        except Exception as e:
            return GatewayHealthCheck(
                gateway_code=gateway_code,
                is_healthy=False,
                error_message=str(e),
                consecutive_failures=cls._get_consecutive_failures(gateway_code) + 1,
            )

    @classmethod
    def _update_failure_tracking(cls, health_check: GatewayHealthCheck):
        """Update failure tracking for gateway"""
        gateway_code = health_check.gateway_code

        if health_check.is_healthy:
            # Reset failure count and update last success
            cache.set(f"gateway_consecutive_failures_{gateway_code}", 0, timeout=86400)
            cache.set(f"gateway_last_success_{gateway_code}", timezone.now(), timeout=86400)
        else:
            # Increment failure count
            current_failures = cache.get(f"gateway_consecutive_failures_{gateway_code}", 0)
            cache.set(f"gateway_consecutive_failures_{gateway_code}", current_failures + 1, timeout=86400)

    @classmethod
    def _check_failover_needed(cls, health_check: GatewayHealthCheck):
        """Check if failover should be triggered"""
        if not health_check.is_healthy:
            failover_rules = GatewayFailoverRule()

            if health_check.consecutive_failures >= failover_rules.max_consecutive_failures:
                if not cls._is_gateway_in_failover(health_check.gateway_code):
                    cls.handle_gateway_failure(
                        health_check.gateway_code, f"Consecutive failures: {health_check.consecutive_failures}"
                    )

    @classmethod
    def _score_gateways(cls, gateway_codes: list[str]) -> dict[str, float]:
        """Score gateways based on performance metrics"""
        scores = {}

        for gateway_code in gateway_codes:
            try:
                # Get recent metrics
                metrics = cls.get_gateway_metrics(gateway_code, hours=1)

                # Calculate score based on various factors
                base_score = 100.0

                # Success rate factor
                success_rate = metrics.get("transaction_metrics", {}).get("success_rate_percent", 0)
                success_factor = success_rate / 100.0

                # Response time factor (lower is better)
                health_check = cls.check_gateway_health(gateway_code)
                response_time_ms = health_check.response_time_ms or 1000.0
                response_factor = max(0.1, 1.0 - (response_time_ms / 5000.0))  # Normalize to 5s max

                # Calculate final score
                final_score = base_score * success_factor * response_factor

                scores[gateway_code] = final_score

            except Exception as e:
                logger.warning(f"Error scoring gateway {gateway_code}: {e}")
                scores[gateway_code] = 0.0

        return scores

    @classmethod
    def _mark_gateway_failed(cls, gateway_code: str, error_message: str = None):
        """Mark gateway as failed"""
        cache.set(
            f"{cls.FAILOVER_CACHE_PREFIX}_{gateway_code}",
            {"failed_at": timezone.now().isoformat(), "error_message": error_message, "in_failover": True},
            timeout=3600,  # 1 hour
        )

    @classmethod
    def _is_gateway_in_failover(cls, gateway_code: str) -> bool:
        """Check if gateway is currently in failover state"""
        failover_data = cache.get(f"{cls.FAILOVER_CACHE_PREFIX}_{gateway_code}")
        return failover_data and failover_data.get("in_failover", False)

    @classmethod
    def _clear_gateway_failover(cls, gateway_code: str):
        """Clear failover status for gateway"""
        cache.delete(f"{cls.FAILOVER_CACHE_PREFIX}_{gateway_code}")

    @classmethod
    def _get_consecutive_failures(cls, gateway_code: str) -> int:
        """Get current consecutive failure count"""
        return cache.get(f"gateway_consecutive_failures_{gateway_code}", 0)

    @classmethod
    def _get_last_success(cls, gateway_code: str) -> datetime | None:
        """Get last successful health check time"""
        return cache.get(f"gateway_last_success_{gateway_code}")

    @classmethod
    def _reset_failure_tracking(cls, gateway_code: str):
        """Reset failure tracking for recovered gateway"""
        cache.delete(f"gateway_consecutive_failures_{gateway_code}")
        cache.set(f"gateway_last_success_{gateway_code}", timezone.now(), timeout=86400)

    @classmethod
    def _log_failover(cls, failed_gateway: str, backup_gateway: str, reason: str):
        """Log failover event"""
        logger.critical(
            f"Gateway failover: {failed_gateway} -> {backup_gateway}",
            extra={
                "failed_gateway": failed_gateway,
                "backup_gateway": backup_gateway,
                "reason": reason,
                "event_type": "gateway_failover",
            },
        )

    @classmethod
    def _notify_admin_failover(cls, failed_gateway: str, backup_gateway: str, reason: str):
        """Notify administrators of gateway failover"""
        try:
            # TODO: Integrate with notification system
            logger.critical(
                f"ADMIN ALERT: Payment gateway failover - {failed_gateway} failed, "
                f"switched to {backup_gateway}. Reason: {reason}"
            )

        except Exception as e:
            logger.error(f"Failed to send failover notification: {e}")

    @classmethod
    def _notify_admin_critical(cls, gateway_code: str, message: str):
        """Notify administrators of critical gateway issue"""
        try:
            logger.critical(f"CRITICAL ALERT: Payment gateway {gateway_code} - {message}")

        except Exception as e:
            logger.error(f"Failed to send critical notification: {e}")

    @classmethod
    def _notify_admin_recovery(cls, gateway_code: str):
        """Notify administrators of gateway recovery"""
        try:
            logger.info(f"RECOVERY: Payment gateway {gateway_code} has recovered and is back online")

        except Exception as e:
            logger.error(f"Failed to send recovery notification: {e}")

    @classmethod
    def _get_active_alerts(cls) -> list[dict[str, Any]]:
        """Get list of active alerts"""
        alerts = []

        try:
            # Check for gateways in failover
            from .payment_gateway_factory import PaymentGatewayFactory

            available_gateways = PaymentGatewayFactory.get_available_gateways()

            for gateway_code in available_gateways:
                if cls._is_gateway_in_failover(gateway_code):
                    failover_data = cache.get(f"{cls.FAILOVER_CACHE_PREFIX}_{gateway_code}")
                    alerts.append(
                        {
                            "type": "gateway_failover",
                            "severity": "high",
                            "gateway_code": gateway_code,
                            "message": f"Gateway {gateway_code} is in failover state",
                            "error_message": failover_data.get("error_message"),
                            "failed_at": failover_data.get("failed_at"),
                        }
                    )

                # Check for high failure rates
                consecutive_failures = cls._get_consecutive_failures(gateway_code)
                if consecutive_failures >= 2:  # Warning threshold
                    alerts.append(
                        {
                            "type": "high_failure_rate",
                            "severity": "medium",
                            "gateway_code": gateway_code,
                            "message": f"Gateway {gateway_code} has {consecutive_failures} consecutive failures",
                            "consecutive_failures": consecutive_failures,
                        }
                    )

        except Exception as e:
            logger.error(f"Error getting active alerts: {e}")

        return alerts
