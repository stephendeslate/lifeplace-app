# backend/core/domains/notifications/monitoring.py

import logging
from datetime import datetime, timedelta
from typing import Any

from django.core.cache import cache
from django.db.models import Count, Q
from django.utils import timezone

from .models import Notification, NotificationType

logger = logging.getLogger(__name__)


class NotificationMetrics:
    """Comprehensive metrics collection for notifications system"""

    CACHE_PREFIX = "notification_metrics"
    DEFAULT_CACHE_TIMEOUT = 3600  # 1 hour

    @classmethod
    def get_delivery_stats(cls, hours: int = 24) -> dict[str, Any]:
        """Get delivery statistics for the specified time period"""
        cache_key = f"{cls.CACHE_PREFIX}:delivery_stats:{hours}h"
        stats = cache.get(cache_key)

        if stats is None:
            start_time = timezone.now() - timedelta(hours=hours)
            notifications = Notification.objects.filter(created_at__gte=start_time)

            total_notifications = notifications.count()
            successful_deliveries = notifications.exclude(delivered_via=[]).count()

            # Calculate delivery rates by method
            delivery_rates = {}
            for method in ["in_app", "email", "sms"]:
                successful = notifications.filter(delivered_via__contains=[method]).count()
                attempted = notifications.filter(delivery_attempts__has_key=method).count()

                delivery_rates[method] = {
                    "attempted": attempted,
                    "successful": successful,
                    "rate": (successful / attempted * 100) if attempted > 0 else 0,
                }

            # Average delivery time (for successful deliveries)
            avg_delivery_time = None
            try:
                successful_notifications = notifications.exclude(delivered_via=[])
                if successful_notifications.exists():
                    times = []
                    for notif in successful_notifications[:100]:  # Sample to avoid memory issues
                        for method_attempts in notif.delivery_attempts.values():
                            if method_attempts:
                                first_attempt = method_attempts[0]
                                attempt_time = datetime.fromisoformat(first_attempt["timestamp"])
                                delivery_delta = (attempt_time - notif.created_at.replace(tzinfo=None)).total_seconds()
                                if delivery_delta >= 0:  # Valid timing
                                    times.append(delivery_delta)

                    if times:
                        avg_delivery_time = sum(times) / len(times)
            except Exception as e:
                logger.warning(f"Could not calculate average delivery time: {e!s}")

            stats = {
                "total_notifications": total_notifications,
                "successful_deliveries": successful_deliveries,
                "success_rate": (successful_deliveries / total_notifications * 100) if total_notifications > 0 else 0,
                "delivery_rates": delivery_rates,
                "avg_delivery_time_seconds": avg_delivery_time,
                "period_hours": hours,
                "calculated_at": timezone.now().isoformat(),
            }

            cache.set(cache_key, stats, timeout=cls.DEFAULT_CACHE_TIMEOUT)

        return stats

    @classmethod
    def get_category_breakdown(cls, hours: int = 24) -> dict[str, Any]:
        """Get notification breakdown by category"""
        cache_key = f"{cls.CACHE_PREFIX}:category_breakdown:{hours}h"
        breakdown = cache.get(cache_key)

        if breakdown is None:
            start_time = timezone.now() - timedelta(hours=hours)

            # Get counts by category
            category_data = (
                Notification.objects.filter(created_at__gte=start_time)
                .values("notification_type__category")
                .annotate(
                    total=Count("id"),
                    read=Count("id", filter=Q(is_read=True)),
                    unread=Count("id", filter=Q(is_read=False)),
                )
                .order_by("-total")
            )

            categories = {}
            for item in category_data:
                category = item["notification_type__category"] or "UNKNOWN"
                categories[category] = {
                    "total": item["total"],
                    "read": item["read"],
                    "unread": item["unread"],
                    "read_rate": (item["read"] / item["total"] * 100) if item["total"] > 0 else 0,
                }

            breakdown = {"categories": categories, "period_hours": hours, "calculated_at": timezone.now().isoformat()}

            cache.set(cache_key, breakdown, timeout=cls.DEFAULT_CACHE_TIMEOUT)

        return breakdown

    @classmethod
    def get_user_engagement_stats(cls, hours: int = 24) -> dict[str, Any]:
        """Get user engagement statistics"""
        cache_key = f"{cls.CACHE_PREFIX}:user_engagement:{hours}h"
        stats = cache.get(cache_key)

        if stats is None:
            start_time = timezone.now() - timedelta(hours=hours)

            # Basic engagement metrics
            notifications = Notification.objects.filter(created_at__gte=start_time)

            total_recipients = notifications.values("recipient").distinct().count()
            total_notifications = notifications.count()
            read_notifications = notifications.filter(is_read=True).count()

            # Average notifications per user
            avg_per_user = total_notifications / total_recipients if total_recipients > 0 else 0

            # Read rates by priority
            priority_stats = {}
            for priority in ["LOW", "NORMAL", "HIGH", "URGENT"]:
                priority_notifications = notifications.filter(notification_type__priority=priority)
                total_priority = priority_notifications.count()
                read_priority = priority_notifications.filter(is_read=True).count()

                if total_priority > 0:
                    priority_stats[priority] = {
                        "total": total_priority,
                        "read": read_priority,
                        "read_rate": (read_priority / total_priority * 100),
                    }

            # Time to read analysis (for read notifications)
            avg_time_to_read = None
            try:
                read_notifications = notifications.filter(is_read=True, read_at__isnull=False)
                if read_notifications.exists():
                    time_deltas = []
                    for notif in read_notifications[:200]:  # Sample for performance
                        if notif.read_at and notif.created_at:
                            delta = (notif.read_at - notif.created_at).total_seconds()
                            if delta >= 0:  # Valid timing
                                time_deltas.append(delta)

                    if time_deltas:
                        avg_time_to_read = sum(time_deltas) / len(time_deltas)
            except Exception as e:
                logger.warning(f"Could not calculate average time to read: {e!s}")

            stats = {
                "total_recipients": total_recipients,
                "total_notifications": total_notifications,
                "read_notifications": read_notifications,
                "overall_read_rate": (read_notifications / total_notifications * 100) if total_notifications > 0 else 0,
                "avg_notifications_per_user": avg_per_user,
                "priority_breakdown": priority_stats,
                "avg_time_to_read_seconds": avg_time_to_read,
                "period_hours": hours,
                "calculated_at": timezone.now().isoformat(),
            }

            cache.set(cache_key, stats, timeout=cls.DEFAULT_CACHE_TIMEOUT)

        return stats

    @classmethod
    def get_system_health(cls) -> dict[str, Any]:
        """Get overall system health metrics"""
        cache_key = f"{cls.CACHE_PREFIX}:system_health"
        health = cache.get(cache_key)

        if health is None:
            try:
                # Check recent activity (last hour)
                one_hour_ago = timezone.now() - timedelta(hours=1)
                recent_notifications = Notification.objects.filter(created_at__gte=one_hour_ago)

                # Check for delivery failures
                failed_deliveries = recent_notifications.filter(delivered_via=[]).count()
                total_recent = recent_notifications.count()

                # Check notification types health
                active_types = NotificationType.objects.filter(is_active=True).count()
                total_types = NotificationType.objects.count()

                # Check for stuck notifications (created but no delivery attempts)
                stuck_notifications = recent_notifications.filter(delivery_attempts={}).count()

                # Calculate health score (0-100)
                health_score = 100

                if total_recent > 0:
                    failure_rate = failed_deliveries / total_recent
                    stuck_rate = stuck_notifications / total_recent

                    # Reduce score based on failures and stuck notifications
                    health_score -= failure_rate * 30  # Up to 30 points for failures
                    health_score -= stuck_rate * 20  # Up to 20 points for stuck

                health_score = max(0, min(100, health_score))

                # Determine status
                if health_score >= 90:
                    status = "excellent"
                elif health_score >= 75:
                    status = "good"
                elif health_score >= 50:
                    status = "warning"
                else:
                    status = "critical"

                health = {
                    "status": status,
                    "health_score": round(health_score, 2),
                    "recent_notifications": total_recent,
                    "failed_deliveries": failed_deliveries,
                    "stuck_notifications": stuck_notifications,
                    "active_notification_types": active_types,
                    "total_notification_types": total_types,
                    "failure_rate": (failed_deliveries / total_recent * 100) if total_recent > 0 else 0,
                    "last_check": timezone.now().isoformat(),
                    "recommendations": cls._get_health_recommendations(
                        health_score, failed_deliveries, stuck_notifications, total_recent
                    ),
                }

                # Cache for 5 minutes only (health should be fresh)
                cache.set(cache_key, health, timeout=300)

            except Exception as e:
                logger.error(f"Failed to calculate system health: {e!s}")
                health = {
                    "status": "unknown",
                    "health_score": 0,
                    "error": str(e),
                    "last_check": timezone.now().isoformat(),
                }

        return health

    @classmethod
    def _get_health_recommendations(cls, score: float, failures: int, stuck: int, total: int) -> list[str]:
        """Generate health recommendations based on metrics"""
        recommendations = []

        if score < 50:
            recommendations.append("🚨 CRITICAL: Immediate attention required for notification system")
        elif score < 75:
            recommendations.append("⚠️ WARNING: Notification system needs monitoring")

        if total > 0:
            failure_rate = failures / total
            stuck_rate = stuck / total

            if failure_rate > 0.1:  # More than 10% failures
                recommendations.append(f"📧 High delivery failure rate ({failure_rate:.1%}) - check email/SMS services")

            if stuck_rate > 0.05:  # More than 5% stuck
                recommendations.append(f"⏸️ Notifications getting stuck ({stuck_rate:.1%}) - check Celery workers")

        if failures > 50:
            recommendations.append("🔧 Consider increasing retry limits or checking service configurations")

        if len(recommendations) == 0:
            if score >= 90:
                recommendations.append("✅ System operating optimally")
            else:
                recommendations.append("👍 System operating normally")

        return recommendations

    @classmethod
    def get_performance_metrics(cls, hours: int = 24) -> dict[str, Any]:
        """Get performance metrics"""
        cache_key = f"{cls.CACHE_PREFIX}:performance:{hours}h"
        metrics = cache.get(cache_key)

        if metrics is None:
            start_time = timezone.now() - timedelta(hours=hours)

            # Query performance metrics
            notifications = Notification.objects.filter(created_at__gte=start_time)

            # Volume metrics
            total_volume = notifications.count()
            hourly_average = total_volume / hours if hours > 0 else 0

            # Peak hour analysis
            hourly_counts = []
            for i in range(hours):
                hour_start = start_time + timedelta(hours=i)
                hour_end = hour_start + timedelta(hours=1)
                count = notifications.filter(created_at__gte=hour_start, created_at__lt=hour_end).count()
                hourly_counts.append(count)

            peak_hour_volume = max(hourly_counts) if hourly_counts else 0

            # Database query efficiency (approximate)
            try:
                from django.db import connection

                query_count = len(connection.queries)
            except Exception:
                query_count = None

            metrics = {
                "total_volume": total_volume,
                "hourly_average": round(hourly_average, 2),
                "peak_hour_volume": peak_hour_volume,
                "hourly_distribution": hourly_counts,
                "db_query_count": query_count,
                "period_hours": hours,
                "calculated_at": timezone.now().isoformat(),
            }

            cache.set(cache_key, metrics, timeout=cls.DEFAULT_CACHE_TIMEOUT)

        return metrics

    @classmethod
    def clear_cache(cls):
        """Clear all notification metrics cache"""
        try:
            # This is a simple approach - in production you might want more sophisticated cache invalidation
            cache_keys = [
                f"{cls.CACHE_PREFIX}:delivery_stats:24h",
                f"{cls.CACHE_PREFIX}:delivery_stats:1h",
                f"{cls.CACHE_PREFIX}:category_breakdown:24h",
                f"{cls.CACHE_PREFIX}:user_engagement:24h",
                f"{cls.CACHE_PREFIX}:system_health",
                f"{cls.CACHE_PREFIX}:performance:24h",
            ]

            cache.delete_many(cache_keys)
            logger.info("Cleared notification metrics cache")

        except Exception as e:
            logger.error(f"Failed to clear metrics cache: {e!s}")


class NotificationAlerts:
    """Alert system for notification issues"""

    @classmethod
    def check_delivery_failures(cls, threshold: float = 0.2) -> dict[str, Any] | None:
        """Check if delivery failure rate exceeds threshold"""
        try:
            stats = NotificationMetrics.get_delivery_stats(hours=1)

            if stats["total_notifications"] > 10:  # Only alert if we have meaningful volume
                failure_rate = 1 - (stats["success_rate"] / 100)

                if failure_rate > threshold:
                    return {
                        "type": "high_failure_rate",
                        "severity": "critical" if failure_rate > 0.5 else "warning",
                        "message": f"Notification delivery failure rate is {failure_rate:.1%}",
                        "threshold": threshold,
                        "actual": failure_rate,
                        "stats": stats,
                    }

        except Exception as e:
            logger.error(f"Failed to check delivery failures: {e!s}")

        return None

    @classmethod
    def check_stuck_notifications(cls, max_stuck: int = 50) -> dict[str, Any] | None:
        """Check for notifications that appear to be stuck"""
        try:
            # Notifications created more than 10 minutes ago but no delivery attempts
            ten_minutes_ago = timezone.now() - timedelta(minutes=10)

            stuck_count = Notification.objects.filter(created_at__lt=ten_minutes_ago, delivery_attempts={}).count()

            if stuck_count > max_stuck:
                return {
                    "type": "stuck_notifications",
                    "severity": "critical" if stuck_count > 100 else "warning",
                    "message": f"{stuck_count} notifications appear to be stuck in processing",
                    "threshold": max_stuck,
                    "actual": stuck_count,
                }

        except Exception as e:
            logger.error(f"Failed to check stuck notifications: {e!s}")

        return None

    @classmethod
    def get_all_alerts(cls) -> list[dict[str, Any]]:
        """Get all current alerts"""
        alerts = []

        # Check delivery failures
        failure_alert = cls.check_delivery_failures()
        if failure_alert:
            alerts.append(failure_alert)

        # Check stuck notifications
        stuck_alert = cls.check_stuck_notifications()
        if stuck_alert:
            alerts.append(stuck_alert)

        return alerts
