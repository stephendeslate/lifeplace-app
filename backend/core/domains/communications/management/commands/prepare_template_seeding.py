# backend/core/domains/communications/management/commands/prepare_template_seeding.py

from django.core.management.base import BaseCommand
from core.domains.communications.models import CommunicationTemplate


class Command(BaseCommand):
    help = 'Prepare for communication template seeding by cleaning up existing templates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion without confirmation',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        force = options['force']
        dry_run = options['dry_run']

        self.stdout.write("=" * 70)
        self.stdout.write(self.style.NOTICE('🧹 COMMUNICATION TEMPLATES CLEANUP'))
        self.stdout.write("=" * 70)
        self.stdout.write("")

        # Count existing templates
        existing_count = CommunicationTemplate.objects.count()

        if existing_count == 0:
            self.stdout.write(self.style.SUCCESS('✅ No templates to clean up'))
            self.stdout.write(self.style.NOTICE('   Ready for fresh seeding!'))
            self.stdout.write("")
            return

        # Expected count
        EXPECTED_COUNT = 21

        # Show current state
        self.stdout.write(self.style.WARNING(f'📊 Current state:'))
        self.stdout.write(f'   - Existing templates: {existing_count}')
        self.stdout.write(f'   - Expected templates: {EXPECTED_COUNT}')
        self.stdout.write("")

        if existing_count < EXPECTED_COUNT:
            self.stdout.write(self.style.WARNING(f'⚠️  Partial seeding detected!'))
            self.stdout.write(f'   Missing {EXPECTED_COUNT - existing_count} templates')
        elif existing_count == EXPECTED_COUNT:
            self.stdout.write(self.style.SUCCESS(f'✅ Template count matches expected'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️  More templates than expected'))
            self.stdout.write(f'   Extra {existing_count - EXPECTED_COUNT} templates')

        self.stdout.write("")

        # Show templates that will be deleted
        self.stdout.write(self.style.WARNING('📋 Templates to be deleted:'))
        for template in CommunicationTemplate.objects.all().order_by('channel', 'name'):
            self.stdout.write(f'   - {template.name} ({template.channel}/{template.category})')
        self.stdout.write("")

        # Dry run mode
        if dry_run:
            self.stdout.write(self.style.NOTICE('🔍 DRY RUN MODE - No changes made'))
            self.stdout.write(f'   Would delete {existing_count} templates')
            self.stdout.write("")
            self.stdout.write(self.style.NOTICE('To actually delete, run without --dry-run'))
            return

        # Confirmation prompt
        if not force:
            self.stdout.write(self.style.WARNING('⚠️  WARNING: This will DELETE all existing communication templates!'))
            self.stdout.write("")
            confirm = input('Type "yes" to confirm deletion: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('❌ Deletion cancelled'))
                return

        # Delete templates
        self.stdout.write(self.style.NOTICE('🗑️  Deleting templates...'))
        try:
            deleted_count, _ = CommunicationTemplate.objects.all().delete()
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f'✅ Successfully deleted {deleted_count} templates'))
            self.stdout.write("")
            self.stdout.write(self.style.NOTICE('📦 Next steps:'))
            self.stdout.write('   1. Run migrations to trigger template seeding:')
            self.stdout.write('      python manage.py migrate --no-input')
            self.stdout.write('')
            self.stdout.write('   OR manually load templates:')
            self.stdout.write('      python manage.py loaddata core/domains/communications/fixtures/default_templates.json')
            self.stdout.write("")
            self.stdout.write("=" * 70)
        except Exception as e:
            self.stdout.write("")
            self.stdout.write(self.style.ERROR(f'❌ Error deleting templates: {e}'))
            self.stdout.write("")
