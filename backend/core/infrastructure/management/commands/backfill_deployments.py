# backend/core/infrastructure/management/commands/backfill_deployments.py
"""
Management command to backfill deployment records from git log.
"""
import subprocess
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Backfill deployment records from git log'

    def add_arguments(self, parser):
        parser.add_argument('--since', default='30 days ago', help='Git log --since value')
        parser.add_argument('--service', default='backend', choices=['backend', 'admin-crm', 'client-portal'])
        parser.add_argument('--environment', default='production')
        parser.add_argument('--dry-run', action='store_true', help='Preview without creating records')

    def handle(self, *args, **options):
        from core.infrastructure.models import Deployment

        try:
            result = subprocess.run(
                ['git', 'log', f'--since={options["since"]}', '--format=%H|%s|%aI', '--first-parent', 'main'],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                self.stderr.write(f"Git log failed: {result.stderr}")
                return
        except FileNotFoundError:
            self.stderr.write("Git not found. Run this from within the git repository.")
            return

        lines = result.stdout.strip().split('\n')
        lines = [l for l in lines if l.strip()]

        created_count = 0
        skipped_count = 0

        for line in lines:
            parts = line.split('|', 2)
            if len(parts) < 3:
                continue

            sha, message, timestamp = parts

            # Skip if already recorded
            if Deployment.objects.filter(git_sha=sha, service=options['service']).exists():
                skipped_count += 1
                continue

            if options['dry_run']:
                self.stdout.write(f"  [DRY RUN] Would create: {sha[:8]} - {message[:60]}")
                created_count += 1
                continue

            try:
                commit_ts = timezone.datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                commit_ts = None

            Deployment.objects.create(
                git_sha=sha,
                commit_message=message[:500],
                commit_timestamp=commit_ts,
                service=options['service'],
                environment=options['environment'],
                triggered_by='backfill',
                deploy_finished_at=commit_ts or timezone.now(),
                status='SUCCESS',
            )
            created_count += 1

        action = "Would create" if options['dry_run'] else "Created"
        self.stdout.write(self.style.SUCCESS(
            f"{action} {created_count} deployment(s), skipped {skipped_count} existing"
        ))
