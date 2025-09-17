"""
Django Management Command: Backfill Thread Cache Data

This command backfills missing cache data for MessageThread instances that have
messages but null cache fields (last_message_at, last_message_content, last_message_sender_name).

Usage:
    python manage.py backfill_thread_cache [options]

Options:
    --dry-run: Show what would be updated without making changes
    --verbose: Show detailed progress information
    --threads ID1,ID2: Only process specific thread IDs (comma-separated)
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from core.domains.messaging.models import MessageThread, Message
from django.utils import timezone


class Command(BaseCommand):
    help = 'Backfill missing cache data for message threads'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed progress information',
        )
        parser.add_argument(
            '--threads',
            type=str,
            help='Comma-separated list of thread IDs to process (optional)',
        )

    def handle(self, *args, **options):
        """Main command handler"""
        self.dry_run = options['dry_run']
        self.verbose = options['verbose']
        specific_threads = options.get('threads')

        self.stdout.write(
            self.style.SUCCESS('🔧 Starting MessageThread cache backfill process')
        )

        if self.dry_run:
            self.stdout.write(
                self.style.WARNING('📋 DRY RUN MODE - No changes will be made')
            )

        try:
            # Get threads that need backfill
            threads_to_process = self._get_threads_needing_backfill(specific_threads)

            if not threads_to_process:
                self.stdout.write(
                    self.style.SUCCESS('✅ No threads need cache backfill - all cache data is current!')
                )
                return

            # Show summary
            self._show_summary(threads_to_process)

            # Process threads
            if not self.dry_run:
                self._process_threads(threads_to_process)
            else:
                self._show_dry_run_details(threads_to_process)

        except Exception as e:
            raise CommandError(f'Failed to backfill thread cache: {str(e)}')

    def _get_threads_needing_backfill(self, specific_threads=None):
        """Get threads that have messages but null cache fields"""

        if specific_threads:
            # Process specific threads
            thread_ids = [tid.strip() for tid in specific_threads.split(',')]
            threads = MessageThread.objects.filter(
                id__in=thread_ids,
                messages__isnull=False
            ).distinct()

            if self.verbose:
                self.stdout.write(f'🎯 Processing specific threads: {thread_ids}')

        else:
            # Find threads with messages but null cache
            threads = MessageThread.objects.filter(
                messages__isnull=False,
                last_message_at__isnull=True
            ).distinct()

        # Also check for threads with inconsistent cache data
        inconsistent_threads = []
        for thread in MessageThread.objects.filter(messages__isnull=False).distinct():
            if self._has_cache_inconsistency(thread):
                inconsistent_threads.append(thread)

        # Combine both sets
        all_threads = list(threads) + [t for t in inconsistent_threads if t not in threads]

        return all_threads

    def _has_cache_inconsistency(self, thread):
        """Check if thread has inconsistent cache data"""
        if not thread.last_message_at:
            return False  # Already handled by null check

        latest_message = thread.messages.order_by('-created_at').first()
        if not latest_message:
            return False

        # Check for inconsistencies
        if thread.last_message_at != latest_message.created_at:
            return True

        if thread.last_message_sender_name != latest_message.sender.get_display_name():
            return True

        if thread.last_message_content != latest_message.content[:200]:
            return True

        return False

    def _show_summary(self, threads):
        """Show summary of threads to be processed"""
        self.stdout.write(
            self.style.HTTP_INFO(f'📊 Found {len(threads)} threads needing cache backfill')
        )

        if self.verbose and threads:
            self.stdout.write('\n📋 Threads to process:')
            for thread in threads[:10]:  # Show first 10
                message_count = thread.messages.count()
                latest_message = thread.messages.order_by('-created_at').first()
                self.stdout.write(
                    f'  • Thread {thread.id}: {message_count} messages, '
                    f'latest at {latest_message.created_at if latest_message else "None"}'
                )

            if len(threads) > 10:
                self.stdout.write(f'  ... and {len(threads) - 10} more threads')

    def _show_dry_run_details(self, threads):
        """Show what would be updated in dry run mode"""
        self.stdout.write('\n📝 DRY RUN - Changes that would be made:')

        for i, thread in enumerate(threads, 1):
            latest_message = thread.messages.order_by('-created_at').first()
            if latest_message:
                self.stdout.write(
                    f'\n{i}. Thread {thread.id}:'
                )
                self.stdout.write(
                    f'   Current cache: {thread.last_message_at or "NULL"}'
                )
                self.stdout.write(
                    f'   Would set to: {latest_message.created_at}'
                )
                self.stdout.write(
                    f'   Sender: {latest_message.sender.get_display_name()}'
                )
                self.stdout.write(
                    f'   Content: {latest_message.content[:50]}...'
                )

    def _process_threads(self, threads):
        """Process threads and update their cache data"""
        self.stdout.write('\n🔄 Processing threads...')

        updated_count = 0
        error_count = 0

        for i, thread in enumerate(threads, 1):
            try:
                with transaction.atomic():
                    latest_message = thread.messages.order_by('-created_at').first()

                    if not latest_message:
                        if self.verbose:
                            self.stdout.write(
                                f'⚠️  Thread {thread.id} has no messages, skipping'
                            )
                        continue

                    # Store old values for comparison
                    old_timestamp = thread.last_message_at
                    old_sender = thread.last_message_sender_name
                    old_content = thread.last_message_content

                    # Update cache using the model's method
                    thread.update_last_message_cache(latest_message)

                    updated_count += 1

                    if self.verbose:
                        self.stdout.write(
                            f'✅ Updated thread {thread.id} ({i}/{len(threads)})'
                        )
                        if old_timestamp != latest_message.created_at:
                            self.stdout.write(
                                f'   Timestamp: {old_timestamp} → {latest_message.created_at}'
                            )
                        if old_sender != latest_message.sender.get_display_name():
                            self.stdout.write(
                                f'   Sender: {old_sender} → {latest_message.sender.get_display_name()}'
                            )

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'❌ Failed to update thread {thread.id}: {str(e)}')
                )
                if self.verbose:
                    import traceback
                    self.stdout.write(traceback.format_exc())

        # Show final results
        self.stdout.write('\n📈 Backfill Results:')
        self.stdout.write(
            self.style.SUCCESS(f'✅ Successfully updated: {updated_count} threads')
        )

        if error_count > 0:
            self.stdout.write(
                self.style.ERROR(f'❌ Errors encountered: {error_count} threads')
            )
        else:
            self.stdout.write('🎉 No errors encountered!')

        # Verify the results
        self._verify_backfill()

    def _verify_backfill(self):
        """Verify the backfill was successful"""
        self.stdout.write('\n🔍 Verifying backfill results...')

        # Count threads still needing backfill
        remaining_null = MessageThread.objects.filter(
            messages__isnull=False,
            last_message_at__isnull=True
        ).distinct().count()

        # Count inconsistent threads
        inconsistent_count = 0
        for thread in MessageThread.objects.filter(messages__isnull=False).distinct():
            if self._has_cache_inconsistency(thread):
                inconsistent_count += 1

        if remaining_null == 0 and inconsistent_count == 0:
            self.stdout.write(
                self.style.SUCCESS('✅ All thread cache data is now consistent!')
            )
        else:
            if remaining_null > 0:
                self.stdout.write(
                    self.style.ERROR(f'❌ {remaining_null} threads still have null cache')
                )
            if inconsistent_count > 0:
                self.stdout.write(
                    self.style.ERROR(f'❌ {inconsistent_count} threads have inconsistent cache')
                )