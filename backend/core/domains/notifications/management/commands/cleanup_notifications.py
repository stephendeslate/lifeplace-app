# backend/core/domains/notifications/management/commands/cleanup_notifications.py

import logging
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from core.domains.notifications.services import NotificationService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Clean up old read notifications and manage notification lifecycle"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=getattr(settings, "NOTIFICATION_CLEANUP_DAYS", 90),
            help="Number of days after which read notifications should be deleted",
        )
        parser.add_argument(
            "--auto-read-days",
            type=int,
            default=getattr(settings, "NOTIFICATION_AUTO_READ_DAYS", 30),
            help="Number of days after which unread notifications should be auto-marked as read",
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Show what would be cleaned up without actually doing it"
        )
        parser.add_argument(
            "--batch-size", type=int, default=1000, help="Number of notifications to process in each batch"
        )
        parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    def handle(self, *args, **options):
        verbosity = options["verbosity"]
        dry_run = options["dry_run"]
        days = options["days"]
        auto_read_days = options["auto_read_days"]
        batch_size = options["batch_size"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE: No changes will be made"))

        try:
            # Step 1: Auto-mark old unread notifications as read
            if verbosity >= 1:
                self.stdout.write(f"Checking for unread notifications older than {auto_read_days} days...")

            auto_read_count = self._auto_mark_old_as_read(auto_read_days, dry_run, batch_size)

            if auto_read_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{'Would auto-mark' if dry_run else 'Auto-marked'} {auto_read_count} old notifications as read"
                    )
                )

            # Step 2: Auto-expire notifications
            if verbosity >= 1:
                self.stdout.write("Checking for expired notifications...")

            expired_count = self._auto_expire_notifications(dry_run)

            if expired_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{'Would mark' if dry_run else 'Marked'} {expired_count} notifications as expired"
                    )
                )

            # Step 3: Clean up old read notifications
            if verbosity >= 1:
                self.stdout.write(f"Cleaning up read notifications older than {days} days...")

            cleanup_count = self._cleanup_old_notifications(days, dry_run, batch_size)

            if cleanup_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(f"{'Would delete' if dry_run else 'Deleted'} {cleanup_count} old notifications")
                )

            # Step 4: Clean up empty digests
            digest_cleanup_count = self._cleanup_empty_digests(dry_run)

            if digest_cleanup_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{'Would delete' if dry_run else 'Deleted'} {digest_cleanup_count} empty notification digests"
                    )
                )

            # Summary
            total_actions = auto_read_count + expired_count + cleanup_count + digest_cleanup_count

            if total_actions == 0:
                self.stdout.write(self.style.SUCCESS("No notifications needed cleanup."))
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Cleanup completed. Total actions: {total_actions} "
                        f"(auto-read: {auto_read_count}, expired: {expired_count}, "
                        f"deleted: {cleanup_count}, digests: {digest_cleanup_count})"
                    )
                )

        except Exception as e:
            logger.error(f"Notification cleanup command failed: {e!s}", exc_info=True)
            raise CommandError(f"Cleanup failed: {e!s}")

    def _auto_mark_old_as_read(self, days, dry_run, batch_size):
        """Auto-mark old unread notifications as read"""
        from django.db import transaction

        from core.domains.notifications.models import Notification

        cutoff_date = timezone.now() - timedelta(days=days)

        if dry_run:
            return Notification.objects.filter(created_at__lt=cutoff_date, is_read=False, is_expired=False).count()

        count = 0
        while True:
            with transaction.atomic():
                notifications = list(
                    Notification.objects.filter(created_at__lt=cutoff_date, is_read=False, is_expired=False)[
                        :batch_size
                    ]
                )

                if not notifications:
                    break

                batch_count = Notification.objects.filter(id__in=[n.id for n in notifications]).update(
                    is_read=True, read_at=timezone.now(), updated_at=timezone.now()
                )

                count += batch_count

                if len(notifications) < batch_size:
                    break

        return count

    def _auto_expire_notifications(self, dry_run):
        """Auto-expire notifications based on their expiry settings"""
        if dry_run:
            return NotificationService.auto_expire_notifications()

        return NotificationService.auto_expire_notifications()

    def _cleanup_old_notifications(self, days, dry_run, batch_size):
        """Clean up old read notifications"""
        from django.db import transaction

        from core.domains.notifications.models import Notification

        cutoff_date = timezone.now() - timedelta(days=days)

        if dry_run:
            return Notification.objects.filter(created_at__lt=cutoff_date, is_read=True).count()

        count = 0
        while True:
            with transaction.atomic():
                notification_ids = list(
                    Notification.objects.filter(created_at__lt=cutoff_date, is_read=True).values_list("id", flat=True)[
                        :batch_size
                    ]
                )

                if not notification_ids:
                    break

                batch_count, _ = Notification.objects.filter(id__in=notification_ids).delete()

                count += batch_count

                if len(notification_ids) < batch_size:
                    break

        return count

    def _cleanup_empty_digests(self, dry_run):
        """Clean up notification digests that have no notifications"""
        from core.domains.notifications.models import NotificationDigest

        # Find digests older than 7 days with no notifications
        cutoff_date = timezone.now() - timedelta(days=7)

        empty_digests = NotificationDigest.objects.filter(created_at__lt=cutoff_date, notification_count=0)

        if dry_run:
            return empty_digests.count()

        count, _ = empty_digests.delete()
        return count
