# backend/core/domains/notifications/management/commands/notification_health_check.py

import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.domains.notifications.monitoring import NotificationAlerts, NotificationMetrics

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Perform health check on notification system and report issues"

    def add_arguments(self, parser):
        parser.add_argument("--hours", type=int, default=1, help="Number of hours to check for recent activity")
        parser.add_argument("--detailed", action="store_true", help="Show detailed metrics and statistics")
        parser.add_argument("--alerts-only", action="store_true", help="Only show alerts and issues")

    def handle(self, *args, **options):
        hours = options["hours"]
        detailed = options["detailed"]
        alerts_only = options["alerts_only"]

        self.stdout.write(
            self.style.HTTP_INFO(
                f"🔍 Notification System Health Check ({timezone.now().strftime('%Y-%m-%d %H:%M:%S')})"
            )
        )
        self.stdout.write("=" * 70)

        try:
            # Get system health
            health = NotificationMetrics.get_system_health()

            # Display health status
            if health["status"] == "excellent":
                status_style = self.style.SUCCESS
                status_icon = "✅"
            elif health["status"] == "good":
                status_style = self.style.SUCCESS
                status_icon = "👍"
            elif health["status"] == "warning":
                status_style = self.style.WARNING
                status_icon = "⚠️"
            elif health["status"] == "critical":
                status_style = self.style.ERROR
                status_icon = "🚨"
            else:
                status_style = self.style.ERROR
                status_icon = "❓"

            self.stdout.write(
                status_style(
                    f"{status_icon} Overall Health: {health['status'].upper()} (Score: {health['health_score']}/100)"
                )
            )

            if not alerts_only:
                self.stdout.write(f"📊 Recent Activity ({hours}h):")
                self.stdout.write(f"   • Notifications Created: {health.get('recent_notifications', 0)}")
                self.stdout.write(f"   • Failed Deliveries: {health.get('failed_deliveries', 0)}")
                self.stdout.write(f"   • Stuck Notifications: {health.get('stuck_notifications', 0)}")
                self.stdout.write(
                    f"   • Active Types: {health.get('active_notification_types', 0)}/{health.get('total_notification_types', 0)}"
                )

                if health.get("failure_rate", 0) > 0:
                    self.stdout.write(self.style.WARNING(f"   • Failure Rate: {health['failure_rate']:.1f}%"))

            # Show recommendations
            recommendations = health.get("recommendations", [])
            if recommendations:
                self.stdout.write("\n💡 Recommendations:")
                for rec in recommendations:
                    if rec.startswith("🚨") or rec.startswith("⚠️"):
                        self.stdout.write(self.style.ERROR(f"   {rec}"))
                    elif rec.startswith("🔧") or rec.startswith("📧"):
                        self.stdout.write(self.style.WARNING(f"   {rec}"))
                    else:
                        self.stdout.write(f"   {rec}")

            # Get and display alerts
            alerts = NotificationAlerts.get_all_alerts()

            if alerts:
                self.stdout.write("\n🔔 Active Alerts:")
                for alert in alerts:
                    severity = alert.get("severity", "info")
                    message = alert.get("message", "Unknown alert")

                    if severity == "critical":
                        alert_style = self.style.ERROR
                        alert_icon = "🚨"
                    elif severity == "warning":
                        alert_style = self.style.WARNING
                        alert_icon = "⚠️"
                    else:
                        alert_style = self.style.NOTICE
                        alert_icon = "ℹ️"

                    self.stdout.write(alert_style(f"   {alert_icon} {message}"))

                    if "threshold" in alert and "actual" in alert:
                        self.stdout.write(f"      Threshold: {alert['threshold']}, Actual: {alert['actual']}")
            elif not alerts_only:
                self.stdout.write("\n✅ No active alerts")

            # Detailed metrics if requested
            if detailed and not alerts_only:
                self._show_detailed_metrics(hours)

        except Exception as e:
            logger.error(f"Health check failed: {e!s}", exc_info=True)
            self.stdout.write(self.style.ERROR(f"❌ Health check failed: {e!s}"))
            return

        # Final status
        self.stdout.write("\n" + "=" * 70)

        if health["status"] in ["excellent", "good"] and not alerts:
            self.stdout.write(self.style.SUCCESS("✅ Notification system is healthy"))
        elif health["status"] == "warning" or (alerts and not any(a.get("severity") == "critical" for a in alerts)):
            self.stdout.write(self.style.WARNING("⚠️ Notification system needs attention"))
        else:
            self.stdout.write(self.style.ERROR("🚨 Notification system requires immediate attention"))

    def _show_detailed_metrics(self, hours):
        """Show detailed system metrics"""
        try:
            self.stdout.write("\n📈 Detailed Metrics:")

            # Delivery stats
            delivery_stats = NotificationMetrics.get_delivery_stats(hours)
            self.stdout.write("   📬 Delivery Statistics:")
            self.stdout.write(f"      • Success Rate: {delivery_stats['success_rate']:.1f}%")
            self.stdout.write(f"      • Total Sent: {delivery_stats['total_notifications']}")
            self.stdout.write(f"      • Successful: {delivery_stats['successful_deliveries']}")

            if delivery_stats.get("avg_delivery_time_seconds"):
                avg_time = delivery_stats["avg_delivery_time_seconds"]
                self.stdout.write(f"      • Avg Delivery Time: {avg_time:.1f}s")

            # Method breakdown
            for method, rates in delivery_stats.get("delivery_rates", {}).items():
                if rates["attempted"] > 0:
                    self.stdout.write(
                        f"      • {method.upper()}: {rates['rate']:.1f}% ({rates['successful']}/{rates['attempted']})"
                    )

            # Category breakdown
            category_stats = NotificationMetrics.get_category_breakdown(hours)
            if category_stats.get("categories"):
                self.stdout.write("   📂 By Category:")
                for category, data in category_stats["categories"].items():
                    self.stdout.write(f"      • {category}: {data['total']} total, {data['read_rate']:.1f}% read")

            # User engagement
            engagement_stats = NotificationMetrics.get_user_engagement_stats(hours)
            self.stdout.write("   👥 User Engagement:")
            self.stdout.write(f"      • Active Recipients: {engagement_stats['total_recipients']}")
            self.stdout.write(f"      • Overall Read Rate: {engagement_stats['overall_read_rate']:.1f}%")
            self.stdout.write(f"      • Avg per User: {engagement_stats['avg_notifications_per_user']:.1f}")

            if engagement_stats.get("avg_time_to_read_seconds"):
                avg_read_time = engagement_stats["avg_time_to_read_seconds"]
                if avg_read_time < 3600:
                    self.stdout.write(f"      • Avg Time to Read: {avg_read_time / 60:.1f} minutes")
                else:
                    self.stdout.write(f"      • Avg Time to Read: {avg_read_time / 3600:.1f} hours")

        except Exception as e:
            self.stdout.write(self.style.WARNING(f"   ⚠️ Could not load detailed metrics: {e!s}"))
