# backend/core/domains/vip/management/commands/expire_vip_points.py

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Expire VIP points older than the configured expiry period"

    def add_arguments(self, parser):
        parser.add_argument(
            "--sync",
            action="store_true",
            help="Run synchronously instead of dispatching to Celery",
        )

    def handle(self, *args, **options):
        from core.domains.vip.tasks import expire_vip_points

        if options["sync"]:
            self.stdout.write("Running point expiration synchronously...")
            count = expire_vip_points()
            self.stdout.write(self.style.SUCCESS(f"Done. Expired points for {count} clients."))
        else:
            self.stdout.write("Dispatching point expiration to Celery...")
            expire_vip_points.delay()
            self.stdout.write(self.style.SUCCESS("Task dispatched."))
