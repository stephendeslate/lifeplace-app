# backend/core/domains/settings/management/commands/seed_default_settings.py

from django.core.management.base import BaseCommand
from django.apps import apps


class Command(BaseCommand):
    help = 'Manually seed default production settings (currency, payment, contracts, workflows)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-creation even if settings already exist',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('🚀 Starting manual seed of default production settings...'))

        # Import the signal handler
        from core.domains.settings.signals import create_production_default_settings

        # Get the settings app config
        settings_app_config = apps.get_app_config('settings')

        # Call the signal handler directly
        try:
            create_production_default_settings(sender=settings_app_config)
            self.stdout.write(self.style.SUCCESS('✅ Default settings seeding completed successfully!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error seeding default settings: {e}'))
            raise

        self.stdout.write(self.style.NOTICE('\n📋 Summary of seeded settings:'))
        self.stdout.write('  • CurrencySettings (PHP default with 5 currencies)')
        self.stdout.write('  • PaymentSettings (50% deposit, 7-day grace period)')
        self.stdout.write('  • PaymentGateway (Stripe - requires API key configuration)')
        self.stdout.write('  • ContractTemplate (Standard Event Contract)')
        self.stdout.write('  • WorkflowTemplate (Default Event Workflow with 8 stages)')
        self.stdout.write('  • CommunicationTemplates (already seeded by communications app)')

        self.stdout.write(self.style.WARNING('\n⚠️  Next steps:'))
        self.stdout.write('  1. Configure Stripe API keys in Django admin')
        self.stdout.write('  2. Review and customize contract template')
        self.stdout.write('  3. Adjust workflow stages as needed')
        self.stdout.write('  4. Review payment and currency settings')
