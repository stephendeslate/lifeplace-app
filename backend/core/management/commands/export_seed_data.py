"""
Export current database data to organized fixture files.

Usage:
    python manage.py export_seed_data
    python manage.py export_seed_data --output=core/fixtures
    python manage.py export_seed_data --dry-run
"""

import json
import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.core import serializers
from django.apps import apps


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Decimal types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


class Command(BaseCommand):
    help = 'Export current database data to fixture files for seeding'

    # Export configuration: (output_file, app_label.model_name, queryset_filter)
    EXPORT_CONFIG = [
        # 00_base - Core settings with no dependencies
        ('00_base/001_currency_settings.json', 'settings.CurrencySettings', {'user__isnull': True}),
        ('00_base/002_company_settings.json', 'settings.CompanySettings', {}),
        ('00_base/003_payment_settings.json', 'payments.PaymentSettings', {}),
        ('00_base/004_payment_gateways.json', 'payments.PaymentGateway', {}),
        ('00_base/005_tax_rates.json', 'payments.TaxRate', {}),

        # 10_catalog - Event types, venues
        ('10_catalog/010_event_types.json', 'events.EventType', {}),
        ('10_catalog/011_venues.json', 'venues.Venue', {}),
        ('10_catalog/012_venue_operating_rules.json', 'venues.VenueOperatingRules', {}),
        ('10_catalog/013_venue_event_configs.json', 'venues.VenueEventTypeConfiguration', {}),
        ('10_catalog/014_vip_settings.json', 'vip.VIPSettings', {}),
        ('10_catalog/015_vip_tiers.json', 'vip.VIPTier', {}),

        # 20_products - Categories, products, packages
        ('20_products/020_product_categories.json', 'products.ProductCategory', {}),
        ('20_products/021_products_packages.json', 'products.ProductOption', {}),
        ('20_products/022_discounts.json', 'products.Discount', {}),

        # 30_communications - Email layouts and templates
        ('30_communications/030_email_layouts.json', 'communications.EmailLayout', {}),
        ('30_communications/031_communication_templates.json', 'communications.CommunicationTemplate', {}),

        # 40_contracts - Contract templates
        ('40_contracts/040_contract_templates.json', 'contracts.ContractTemplate', {}),

        # 50_workflows - Workflow templates and stages
        ('50_workflows/050_workflow_templates.json', 'workflows.WorkflowTemplate', {}),
        ('50_workflows/051_workflow_stages.json', 'workflows.WorkflowStage', {}),

        # 60_booking - Booking flows and configurations
        ('60_booking/060_booking_flows.json', 'bookingflow.BookingFlow', {}),
        ('60_booking/061_booking_flow_steps.json', 'bookingflow.BookingFlowStep', {}),
        ('60_booking/062_introduction_step_configs.json', 'bookingflow.IntroductionStepConfiguration', {}),
        ('60_booking/063_venue_selection_step_configs.json', 'bookingflow.VenueSelectionStepConfiguration', {}),
        ('60_booking/064_datetime_step_configs.json', 'bookingflow.DateTimeStepConfiguration', {}),
        ('60_booking/065_package_selection_step_configs.json', 'bookingflow.PackageSelectionStepConfiguration', {}),
        ('60_booking/066_addon_selection_step_configs.json', 'bookingflow.AddonSelectionStepConfiguration', {}),
        ('60_booking/067_pricing_summary_step_configs.json', 'bookingflow.PricingSummaryStepConfiguration', {}),
        ('60_booking/068_contact_info_step_configs.json', 'bookingflow.ContactInfoStepConfiguration', {}),
        ('60_booking/069_payment_info_step_configs.json', 'bookingflow.PaymentInfoStepConfiguration', {}),
        ('60_booking/070_payment_terms_configs.json', 'bookingflow.PaymentTermsConfiguration', {}),
        ('60_booking/071_confirmation_step_configs.json', 'bookingflow.ConfirmationStepConfiguration', {}),

        # 90_settings - Legal documents
        ('90_settings/090_legal_documents.json', 'settings.LegalDocument', {}),
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='core/fixtures',
            help='Output directory for fixtures (relative to backend/)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be exported without writing files'
        )

    def handle(self, *args, **options):
        output_dir = options['output']
        dry_run = options['dry_run']

        # Get absolute path
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        base_output_path = os.path.join(backend_dir, output_dir)

        self.stdout.write(self.style.NOTICE('=' * 70))
        self.stdout.write(self.style.NOTICE('EXPORTING SEED DATA'))
        self.stdout.write(self.style.NOTICE('=' * 70))
        self.stdout.write(f'Output directory: {base_output_path}')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No files will be written'))

        self.stdout.write('')

        total_records = 0
        exported_files = 0

        for output_file, model_path, filters in self.EXPORT_CONFIG:
            try:
                records = self._export_model(
                    base_output_path,
                    output_file,
                    model_path,
                    filters,
                    dry_run
                )
                total_records += records
                if records > 0:
                    exported_files += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  Error exporting {model_path}: {e}')
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS(f'Export complete: {total_records} records in {exported_files} files'))
        self.stdout.write(self.style.SUCCESS('=' * 70))

    def _export_model(self, base_path, output_file, model_path, filters, dry_run):
        """Export a single model to a fixture file."""
        app_label, model_name = model_path.split('.')

        try:
            Model = apps.get_model(app_label, model_name)
        except LookupError:
            self.stdout.write(
                self.style.WARNING(f'  Skipped {model_path}: Model not found')
            )
            return 0

        # Get queryset with filters
        queryset = Model.objects.filter(**filters).order_by('pk')
        count = queryset.count()

        if count == 0:
            self.stdout.write(f'  Skipped {output_file}: No records')
            return 0

        # Serialize to JSON
        data = serializers.serialize('json', queryset, indent=2)

        # Parse and re-serialize with custom encoder for Decimal handling
        parsed_data = json.loads(data)
        formatted_data = json.dumps(parsed_data, indent=2, cls=DecimalEncoder)

        if dry_run:
            self.stdout.write(f'  Would export {count} records to {output_file}')
        else:
            # Ensure directory exists
            full_path = os.path.join(base_path, output_file)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            # Write fixture file
            with open(full_path, 'w') as f:
                f.write(formatted_data)

            self.stdout.write(
                self.style.SUCCESS(f'  Exported {count} records to {output_file}')
            )

        return count
