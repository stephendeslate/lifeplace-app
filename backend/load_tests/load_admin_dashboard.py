"""
Admin Dashboard Smoke Test Behavior

Hits the analytics endpoints that the admin dashboard loads on page open.
Based on: frontend/admin-crm/src/apis/analytics.api.ts
"""

import logging
from typing import Dict, Any
from datetime import datetime, timedelta

from config import config
from utils import think_time

logger = logging.getLogger(__name__)


class AdminDashboardBehavior:
    """
    Calls the analytics endpoints the admin dashboard loads on page open.

    The dashboard triggers 14 analytics queries simultaneously.
    This is the heaviest single page load in the app.
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url

    def load_full_dashboard(self, headers: Dict[str, str], rate_tracker) -> Dict[str, Any]:
        """Load all admin dashboard analytics endpoints."""
        results = {
            "success_count": 0,
            "failure_count": 0,
            "endpoints_tested": [],
        }

        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        date_params = f"start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}"

        # All analytics endpoints the dashboard loads
        endpoints = [
            "/api/analytics/dashboard/",
            f"/api/analytics/sales/bookings/?{date_params}",
            f"/api/analytics/sales/pipeline/?{date_params}",
            f"/api/analytics/sales/revenue/?{date_params}",
            f"/api/analytics/sales/payments/?{date_params}",
            f"/api/analytics/events/attendance/?{date_params}",
            "/api/analytics/events/packages/",
            f"/api/analytics/events/feedback/?{date_params}",
            f"/api/analytics/events/types/?{date_params}",
            f"/api/analytics/customers/leads/?{date_params}",
            f"/api/analytics/customers/conversion/?{date_params}",
            f"/api/analytics/customers/growth/?{date_params}",
            f"/api/analytics/operations/venues/?{date_params}",
            f"/api/analytics/operations/calendar/?{date_params}",
        ]

        for endpoint in endpoints:
            # Group by category for Locust stats readability
            path = endpoint.split("?")[0]
            parts = path.strip("/").split("/")
            category = parts[2] if len(parts) > 2 else "dashboard"
            name = f"/api/analytics/{category}/"

            with self.client.get(
                endpoint,
                headers=headers,
                catch_response=True,
                name=name
            ) as response:
                rate_tracker.record_call()

                if response.status_code == 200:
                    response.success()
                    results["success_count"] += 1
                elif response.status_code == 401:
                    response.failure("Authentication required")
                    results["failure_count"] += 1
                else:
                    response.failure(f"Failed: {response.status_code}")
                    results["failure_count"] += 1

            results["endpoints_tested"].append(path)

        logger.info(
            f"Dashboard: {results['success_count']}/{len(results['endpoints_tested'])} endpoints ok"
        )

        return results
