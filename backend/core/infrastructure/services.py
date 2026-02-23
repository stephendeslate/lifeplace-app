# backend/core/infrastructure/services.py
"""
DORA Metrics Service.
Calculates the four DORA metrics from Deployment records.
"""

import logging
from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


class DORAMetricsService:
    """
    Calculates the four key DORA metrics:
    1. Deployment Frequency
    2. Lead Time for Changes
    3. Change Failure Rate
    4. Mean Time to Recovery (MTTR)
    """

    # DORA classification thresholds (2023 State of DevOps Report)
    FREQUENCY_THRESHOLDS = {
        "elite": 1.0,  # Multiple deploys per day (>=1/day)
        "high": 1 / 7,  # Between once per day and once per week
        "medium": 1 / 30,  # Between once per week and once per month
    }

    LEAD_TIME_THRESHOLDS = {
        "elite": 24 * 3600,  # Less than one day
        "high": 7 * 24 * 3600,  # Between one day and one week
        "medium": 30 * 24 * 3600,  # Between one week and one month
    }

    CFR_THRESHOLDS = {
        "elite": 5,  # 0-5%
        "high": 10,  # 5-10%
        "medium": 15,  # 10-15%
    }

    MTTR_THRESHOLDS = {
        "elite": 3600,  # Less than one hour
        "high": 24 * 3600,  # Less than one day
        "medium": 7 * 24 * 3600,  # Less than one week
    }

    @staticmethod
    def _classify(value, thresholds, lower_is_better=True):
        """Classify a metric value into Elite/High/Medium/Low."""
        if value is None:
            return "N/A"
        if lower_is_better:
            if value <= thresholds["elite"]:
                return "Elite"
            elif value <= thresholds["high"]:
                return "High"
            elif value <= thresholds["medium"]:
                return "Medium"
            return "Low"
        else:
            # Higher is better (e.g., deployment frequency)
            if value >= thresholds["elite"]:
                return "Elite"
            elif value >= thresholds["high"]:
                return "High"
            elif value >= thresholds["medium"]:
                return "Medium"
            return "Low"

    @staticmethod
    def deployment_frequency(days=30, service=None):
        """
        Calculate deployment frequency.

        Returns:
            dict with count, daily_average, classification
        """
        from .models import Deployment

        cutoff = timezone.now() - timedelta(days=days)
        qs = Deployment.objects.filter(
            created_at__gte=cutoff,
            status="SUCCESS",
            environment="production",
        )
        if service:
            qs = qs.filter(service=service)

        count = qs.count()
        daily_avg = count / days if days > 0 else 0

        classification = DORAMetricsService._classify(
            daily_avg,
            DORAMetricsService.FREQUENCY_THRESHOLDS,
            lower_is_better=False,
        )

        return {
            "total_deploys": count,
            "days": days,
            "daily_average": round(daily_avg, 2),
            "weekly_average": round(daily_avg * 7, 2),
            "classification": classification,
        }

    @staticmethod
    def lead_time_for_changes(days=30, service=None):
        """
        Calculate lead time for changes (commit to deploy).

        Returns:
            dict with avg/min/max seconds and classification
        """
        from .models import Deployment

        cutoff = timezone.now() - timedelta(days=days)
        qs = Deployment.objects.filter(
            created_at__gte=cutoff,
            status="SUCCESS",
            environment="production",
            lead_time_seconds__isnull=False,
        )
        if service:
            qs = qs.filter(service=service)

        stats = qs.aggregate(
            avg_seconds=Avg("lead_time_seconds"),
            count=Count("id"),
        )

        avg_seconds = stats["avg_seconds"]
        if avg_seconds is not None:
            avg_seconds = int(avg_seconds)

        # Get min/max manually for more detail
        if stats["count"] > 0:
            min_val = qs.order_by("lead_time_seconds").first().lead_time_seconds
            max_val = qs.order_by("-lead_time_seconds").first().lead_time_seconds
        else:
            min_val = None
            max_val = None

        classification = DORAMetricsService._classify(
            avg_seconds,
            DORAMetricsService.LEAD_TIME_THRESHOLDS,
            lower_is_better=True,
        )

        return {
            "avg_seconds": avg_seconds,
            "avg_human": DORAMetricsService._humanize_seconds(avg_seconds),
            "min_seconds": min_val,
            "max_seconds": max_val,
            "sample_size": stats["count"],
            "days": days,
            "classification": classification,
        }

    @staticmethod
    def change_failure_rate(days=30, service=None):
        """
        Calculate change failure rate (% of deploys causing incidents).

        Returns:
            dict with rate percentage and classification
        """
        from .models import Deployment

        cutoff = timezone.now() - timedelta(days=days)
        qs = Deployment.objects.filter(
            created_at__gte=cutoff,
            environment="production",
        )
        if service:
            qs = qs.filter(service=service)

        total = qs.count()
        failures = qs.filter(Q(caused_incident=True) | Q(status="FAILURE")).count()

        rate = (failures / total * 100) if total > 0 else 0

        classification = DORAMetricsService._classify(
            rate,
            DORAMetricsService.CFR_THRESHOLDS,
            lower_is_better=True,
        )

        return {
            "total_deploys": total,
            "failed_deploys": failures,
            "rate_pct": round(rate, 2),
            "days": days,
            "classification": classification,
        }

    @staticmethod
    def mean_time_to_recovery(days=30, service=None):
        """
        Calculate mean time to recovery for incidents.

        Returns:
            dict with avg MTTR seconds and classification
        """
        from .models import Deployment

        cutoff = timezone.now() - timedelta(days=days)
        qs = Deployment.objects.filter(
            created_at__gte=cutoff,
            caused_incident=True,
            mttr_seconds__isnull=False,
            environment="production",
        )
        if service:
            qs = qs.filter(service=service)

        stats = qs.aggregate(
            avg_seconds=Avg("mttr_seconds"),
            count=Count("id"),
        )

        avg_seconds = stats["avg_seconds"]
        if avg_seconds is not None:
            avg_seconds = int(avg_seconds)

        classification = DORAMetricsService._classify(
            avg_seconds,
            DORAMetricsService.MTTR_THRESHOLDS,
            lower_is_better=True,
        )

        return {
            "avg_seconds": avg_seconds,
            "avg_human": DORAMetricsService._humanize_seconds(avg_seconds),
            "incident_count": stats["count"],
            "days": days,
            "classification": classification,
        }

    @staticmethod
    def full_report(days=30, service=None):
        """Generate complete DORA metrics report."""
        freq = DORAMetricsService.deployment_frequency(days, service)
        lead = DORAMetricsService.lead_time_for_changes(days, service)
        cfr = DORAMetricsService.change_failure_rate(days, service)
        mttr = DORAMetricsService.mean_time_to_recovery(days, service)

        # Determine overall classification (lowest of the four)
        classifications = [
            freq["classification"],
            lead["classification"],
            cfr["classification"],
            mttr["classification"],
        ]
        ranking = {"Elite": 4, "High": 3, "Medium": 2, "Low": 1, "N/A": 0}
        valid = [c for c in classifications if c != "N/A"]
        if valid:
            overall = min(valid, key=lambda x: ranking.get(x, 0))
        else:
            overall = "N/A"

        return {
            "period_days": days,
            "service": service or "all",
            "overall_classification": overall,
            "deployment_frequency": freq,
            "lead_time_for_changes": lead,
            "change_failure_rate": cfr,
            "mean_time_to_recovery": mttr,
        }

    @staticmethod
    def _humanize_seconds(seconds):
        """Convert seconds to human-readable duration."""
        if seconds is None:
            return "N/A"
        if seconds < 60:
            return f"{seconds}s"
        if seconds < 3600:
            return f"{seconds // 60}m {seconds % 60}s"
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        if hours < 24:
            return f"{hours}h {minutes}m"
        days = hours // 24
        remaining_hours = hours % 24
        return f"{days}d {remaining_hours}h"
