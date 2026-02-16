import json
import logging

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

logger = logging.getLogger(__name__)

LOADTEST_EMAIL_PREFIX = "loadtest+"
LOADTEST_ACCOUNT_EMAILS = [
    "loadtest-admin@example.com",
    "loadtest-client@example.com",
]


class Command(BaseCommand):
    help = "Clean up load test data from the database (booking sessions and test accounts)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )
        parser.add_argument(
            "--include-accounts",
            action="store_true",
            help="Also delete the load test user accounts",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        include_accounts = options["include_accounts"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE: No changes will be made"))

        try:
            sessions_count = self._cleanup_booking_sessions(dry_run)
            accounts_count = 0
            if include_accounts:
                accounts_count = self._cleanup_test_accounts(dry_run)

            self.stdout.write(
                self.style.SUCCESS(
                    f'{"Would delete" if dry_run else "Deleted"} '
                    f"{sessions_count} booking sessions"
                    + (f", {accounts_count} test accounts" if include_accounts else "")
                )
            )
        except Exception as e:
            logger.error(f"Load test cleanup failed: {e}", exc_info=True)
            raise CommandError(f"Cleanup failed: {e}")

    def _cleanup_booking_sessions(self, dry_run):
        from core.domains.bookingflow.models import BookingSession

        # JSONField nested lookups use step IDs (e.g. step_52) not step type names,
        # so we scan booking_data as text to find loadtest patterns reliably.
        loadtest_ids = []
        for session in BookingSession.objects.all().iterator():
            data_str = json.dumps(session.booking_data)
            if LOADTEST_EMAIL_PREFIX in data_str.lower():
                loadtest_ids.append(session.id)

        count = len(loadtest_ids)
        self.stdout.write(f"Found {count} load test booking sessions")

        if count > 0 and not dry_run:
            with transaction.atomic():
                deleted, _ = BookingSession.objects.filter(id__in=loadtest_ids).delete()
                count = deleted

        return count

    def _cleanup_test_accounts(self, dry_run):
        from core.domains.users.models import User

        # Match both the named test accounts and any auto-created loadtest+ accounts
        users = User.objects.filter(email__startswith=LOADTEST_EMAIL_PREFIX) | User.objects.filter(
            email__in=LOADTEST_ACCOUNT_EMAILS
        )
        count = users.count()
        self.stdout.write(f"Found {count} load test user accounts")

        if count > 0 and not dry_run:
            with transaction.atomic():
                deleted, _ = users.delete()
                count = deleted

        return count
