# backend/core/domains/communications/management/commands/migrate_to_layouts.py
"""
Management command to migrate existing email templates to use layouts.

Usage:
    python manage.py migrate_to_layouts --dry-run    # Preview changes without applying
    python manage.py migrate_to_layouts              # Apply migration
    python manage.py migrate_to_layouts --layout-id=1  # Assign specific layout
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.domains.communications.models import CommunicationTemplate, EmailLayout


class Command(BaseCommand):
    help = 'Migrate existing email templates to use email layouts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without applying them'
        )
        parser.add_argument(
            '--layout-id',
            type=int,
            help='Specific layout ID to assign (defaults to default layout)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Override existing layout assignments'
        )
        parser.add_argument(
            '--category',
            type=str,
            choices=['SYSTEM', 'MANUAL', 'AUTO'],
            help='Only migrate templates of this category'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        layout_id = options.get('layout_id')
        force = options['force']
        category = options.get('category')

        # Get the target layout
        if layout_id:
            try:
                layout = EmailLayout.objects.get(id=layout_id)
            except EmailLayout.DoesNotExist:
                raise CommandError(f'Layout with ID {layout_id} not found')
        else:
            layout = EmailLayout.get_default_layout()
            if not layout:
                # Create default layout if none exists
                self.stdout.write(self.style.WARNING(
                    'No default layout found. Creating default layout...'
                ))
                if not dry_run:
                    layout = self._create_default_layout()
                else:
                    self.stdout.write(self.style.NOTICE(
                        '[DRY RUN] Would create default layout'
                    ))
                    return

        self.stdout.write(f'Using layout: {layout.name} (ID: {layout.id})')

        # Get templates to migrate
        queryset = CommunicationTemplate.objects.filter(channel='EMAIL')

        if category:
            queryset = queryset.filter(category=category)

        if not force:
            queryset = queryset.filter(layout__isnull=True)

        templates = list(queryset)
        count = len(templates)

        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                'No templates to migrate.'
            ))
            return

        self.stdout.write(f'Found {count} email templates to migrate')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN MODE - No changes will be made]\n'))
            for template in templates:
                self.stdout.write(f'  Would assign layout to: {template.name}')
            self.stdout.write(self.style.WARNING(
                f'\n[DRY RUN] Would update {count} templates'
            ))
            return

        # Apply migration
        with transaction.atomic():
            updated = 0
            for template in templates:
                old_layout = template.layout
                template.layout = layout
                template.save(update_fields=['layout'])
                updated += 1
                self.stdout.write(
                    f'  Updated: {template.name} '
                    f'(layout: {old_layout.name if old_layout else "None"} -> {layout.name})'
                )

        self.stdout.write(self.style.SUCCESS(
            f'\nSuccessfully migrated {updated} templates to layout "{layout.name}"'
        ))

    def _create_default_layout(self):
        """Create the default email layout."""
        return EmailLayout.objects.create(
            name='Standard',
            description='Default layout for all email communications.',
            header_template='''<div style="background-color: {{ primary_color }}; color: white; padding: 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">{{ header_title|default:site_name }}</h1>
    {% if header_subtitle %}<p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">{{ header_subtitle }}</p>{% endif %}
</div>''',
            footer_template='''<div style="padding: 24px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e0e0e0;">
    <p style="margin: 5px 0; color: #666; font-size: 14px;">{{ site_name }}</p>
    <p style="margin: 5px 0; color: #999; font-size: 12px;">&copy; {{ current_year }} {{ site_name }}. All rights reserved.</p>
    {% if unsubscribe_link %}<p style="margin: 15px 0 0 0;"><a href="{{ unsubscribe_link }}" style="color: #999; font-size: 11px;">Unsubscribe</a></p>{% endif %}
</div>''',
            wrapper_template='''<div style="padding: 32px; background-color: #f5f5f5;">
    <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        {{ content }}
    </div>
</div>''',
            base_styles='',
            primary_color='#1976d2',
            secondary_color='#1565c0',
            logo_url='',
            is_default=True,
            is_active=True,
        )
