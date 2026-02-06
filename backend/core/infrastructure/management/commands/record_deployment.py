# backend/core/infrastructure/management/commands/record_deployment.py
"""
Management command to record a deployment.
Called from CI/CD pipeline or manually.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Record a deployment to the database'

    def add_arguments(self, parser):
        parser.add_argument('--git-sha', required=True, help='Git commit SHA')
        parser.add_argument('--commit-message', default='', help='Commit message')
        parser.add_argument('--commit-timestamp', default='', help='Commit timestamp (ISO format)')
        parser.add_argument('--service', default='backend', choices=['backend', 'admin-crm', 'client-portal'])
        parser.add_argument('--environment', default='production')
        parser.add_argument('--github-run-id', default='')
        parser.add_argument('--github-run-url', default='')
        parser.add_argument('--triggered-by', default='manual')
        parser.add_argument('--deploy-started-at', default='', help='Deploy start time (ISO format)')
        parser.add_argument('--status', default='SUCCESS', choices=['SUCCESS', 'FAILURE', 'ROLLBACK'])

    def handle(self, *args, **options):
        from core.infrastructure.models import Deployment

        commit_ts = None
        if options['commit_timestamp']:
            try:
                commit_ts = timezone.datetime.fromisoformat(
                    options['commit_timestamp'].replace('Z', '+00:00')
                )
            except ValueError:
                self.stderr.write(f"Invalid commit timestamp: {options['commit_timestamp']}")

        deploy_started = None
        if options['deploy_started_at']:
            try:
                deploy_started = timezone.datetime.fromisoformat(
                    options['deploy_started_at'].replace('Z', '+00:00')
                )
            except ValueError:
                self.stderr.write(f"Invalid deploy start time: {options['deploy_started_at']}")

        deployment = Deployment.objects.create(
            git_sha=options['git_sha'],
            commit_message=options['commit_message'][:500],
            commit_timestamp=commit_ts,
            service=options['service'],
            environment=options['environment'],
            github_run_id=options['github_run_id'],
            github_run_url=options['github_run_url'],
            triggered_by=options['triggered_by'],
            deploy_started_at=deploy_started,
            deploy_finished_at=timezone.now(),
            status=options['status'],
        )

        self.stdout.write(self.style.SUCCESS(
            f"Recorded deployment: {deployment.service} {deployment.git_sha_short} "
            f"({deployment.status})"
        ))
