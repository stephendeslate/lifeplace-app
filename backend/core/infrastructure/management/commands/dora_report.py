# backend/core/infrastructure/management/commands/dora_report.py
"""
Management command to print DORA metrics report.
"""

import json

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Print DORA metrics report"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=30, help="Number of days to analyze")
        parser.add_argument("--service", default=None, help="Filter by service")
        parser.add_argument("--json", action="store_true", help="Output as JSON")

    def handle(self, *args, **options):
        from core.infrastructure.services import DORAMetricsService

        report = DORAMetricsService.full_report(
            days=options["days"],
            service=options["service"],
        )

        if options["json"]:
            self.stdout.write(json.dumps(report, indent=2, default=str))
            return

        self.stdout.write(
            self.style.HTTP_INFO(
                f"\n{'=' * 60}\n"
                f"  DORA Metrics Report ({report['period_days']} days)\n"
                f"  Service: {report['service']}\n"
                f"  Overall: {report['overall_classification']}\n"
                f"{'=' * 60}\n"
            )
        )

        freq = report["deployment_frequency"]
        self.stdout.write(self.style.HTTP_INFO("\n  Deployment Frequency"))
        self.stdout.write(f"    Total deploys: {freq['total_deploys']}")
        self.stdout.write(f"    Daily avg: {freq['daily_average']}")
        self.stdout.write(f"    Weekly avg: {freq['weekly_average']}")
        self.stdout.write(f"    Classification: {freq['classification']}")

        lead = report["lead_time_for_changes"]
        self.stdout.write(self.style.HTTP_INFO("\n  Lead Time for Changes"))
        self.stdout.write(f"    Average: {lead['avg_human']}")
        self.stdout.write(f"    Sample size: {lead['sample_size']}")
        self.stdout.write(f"    Classification: {lead['classification']}")

        cfr = report["change_failure_rate"]
        self.stdout.write(self.style.HTTP_INFO("\n  Change Failure Rate"))
        self.stdout.write(f"    Rate: {cfr['rate_pct']}%")
        self.stdout.write(f"    Failed: {cfr['failed_deploys']}/{cfr['total_deploys']}")
        self.stdout.write(f"    Classification: {cfr['classification']}")

        mttr = report["mean_time_to_recovery"]
        self.stdout.write(self.style.HTTP_INFO("\n  Mean Time to Recovery"))
        self.stdout.write(f"    Average: {mttr['avg_human']}")
        self.stdout.write(f"    Incidents: {mttr['incident_count']}")
        self.stdout.write(f"    Classification: {mttr['classification']}")

        self.stdout.write(f"\n{'=' * 60}\n")
