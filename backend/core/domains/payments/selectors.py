"""
Read-only query logic for the payments domain.

Selectors contain all read operations (queries, lookups, filtering).
They never mutate data. All functions use keyword-only arguments (*)
for clarity at call sites.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.utils import timezone

logger = logging.getLogger(__name__)


def get_gateway_metrics(
    *,
    gateway_code: str | None = None,
    hours: int = 24,
) -> dict[str, Any]:
    """Get performance metrics for payment gateways.

    Args:
        gateway_code: Specific gateway code (None for all).
        hours: Time window for metrics.
    """
    try:
        from .models import PaymentTransaction, PaymentWebhookLog

        cutoff_time = timezone.now() - timedelta(hours=hours)

        transaction_queryset = PaymentTransaction.objects.filter(created_at__gte=cutoff_time)

        if gateway_code:
            transaction_queryset = transaction_queryset.filter(gateway__code=gateway_code)

        total_transactions = transaction_queryset.count()
        successful_transactions = transaction_queryset.filter(status="COMPLETED").count()

        success_rate = (successful_transactions / total_transactions * 100) if total_transactions > 0 else 0

        webhook_queryset = PaymentWebhookLog.objects.filter(received_at__gte=cutoff_time)

        if gateway_code:
            webhook_queryset = webhook_queryset.filter(gateway_code=gateway_code)

        webhook_stats = {
            "total_webhooks": webhook_queryset.count(),
            "successful_webhooks": webhook_queryset.filter(processed_successfully=True).count(),
            "failed_webhooks": webhook_queryset.filter(processed_successfully=False).count(),
        }

        return {
            "time_window_hours": hours,
            "transaction_metrics": {
                "total_transactions": total_transactions,
                "successful_transactions": successful_transactions,
                "success_rate_percent": success_rate,
            },
            "webhook_metrics": webhook_stats,
        }

    except Exception as e:
        logger.error(f"Error getting gateway metrics: {e}")
        return {"error": str(e)}
