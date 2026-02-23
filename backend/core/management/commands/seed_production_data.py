"""
Consolidated seed data management command for production deployment.

This command loads all seed data from fixture files in the correct dependency order.
It is idempotent - safe to run multiple times without creating duplicates.

Usage:
    python manage.py seed_production_data           # Idempotent seed (skip existing)
    python manage.py seed_production_data --force   # Overwrite existing data
    python manage.py seed_production_data --dry-run # Show what would be seeded
    python manage.py seed_production_data --only=communications  # Seed specific group
    python manage.py seed_production_data --skip=booking         # Skip specific group
"""

import json
import os

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed production data from fixtures (idempotent)"

    # Ordered fixture groups respecting dependencies
    # Each group: (group_name, [(fixture_file, model_path), ...])
    FIXTURE_GROUPS = [
        (
            "base",
            [
                ("00_base/001_currency_settings.json", "settings.CurrencySettings"),
                ("00_base/002_company_settings.json", "settings.CompanySettings"),
                ("00_base/003_payment_settings.json", "payments.PaymentSettings"),
                ("00_base/004_payment_gateways.json", "payments.PaymentGateway"),
                ("00_base/005_tax_rates.json", "payments.TaxRate"),
            ],
        ),
        (
            "catalog",
            [
                ("10_catalog/010_event_types.json", "events.EventType"),
                ("10_catalog/011_venues.json", "venues.Venue"),
                ("10_catalog/012_venue_operating_rules.json", "venues.VenueOperatingRules"),
                ("10_catalog/013_venue_event_configs.json", "venues.VenueEventTypeConfiguration"),
                ("10_catalog/014_vip_settings.json", "vip.VIPSettings"),
                ("10_catalog/015_vip_tiers.json", "vip.VIPTier"),
            ],
        ),
        (
            "products",
            [
                ("20_products/020_product_categories.json", "products.ProductCategory"),
                ("20_products/021_products_packages.json", "products.ProductOption"),
                ("20_products/022_discounts.json", "products.Discount"),
            ],
        ),
        (
            "communications",
            [
                ("30_communications/030_email_layouts.json", "communications.EmailLayout"),
                ("30_communications/031_communication_templates.json", "communications.CommunicationTemplate"),
            ],
        ),
        (
            "contracts",
            [
                ("40_contracts/040_contract_templates.json", "contracts.ContractTemplate"),
            ],
        ),
        (
            "workflows",
            [
                ("50_workflows/050_workflow_templates.json", "workflows.WorkflowTemplate"),
                ("50_workflows/051_workflow_stages.json", "workflows.WorkflowStage"),
            ],
        ),
        (
            "booking",
            [
                ("60_booking/060_booking_flows.json", "bookingflow.BookingFlow"),
                ("60_booking/061_booking_flow_steps.json", "bookingflow.BookingFlowStep"),
                ("60_booking/062_introduction_step_configs.json", "bookingflow.IntroductionStepConfiguration"),
                ("60_booking/063_venue_selection_step_configs.json", "bookingflow.VenueSelectionStepConfiguration"),
                ("60_booking/064_datetime_step_configs.json", "bookingflow.DateTimeStepConfiguration"),
                ("60_booking/065_package_selection_step_configs.json", "bookingflow.PackageSelectionStepConfiguration"),
                ("60_booking/066_addon_selection_step_configs.json", "bookingflow.AddonSelectionStepConfiguration"),
                ("60_booking/067_pricing_summary_step_configs.json", "bookingflow.PricingSummaryStepConfiguration"),
                ("60_booking/068_contact_info_step_configs.json", "bookingflow.ContactInfoStepConfiguration"),
                ("60_booking/069_payment_info_step_configs.json", "bookingflow.PaymentInfoStepConfiguration"),
                ("60_booking/070_payment_terms_configs.json", "bookingflow.PaymentTermsConfiguration"),
                ("60_booking/071_confirmation_step_configs.json", "bookingflow.ConfirmationStepConfiguration"),
            ],
        ),
        (
            "settings",
            [
                ("90_settings/090_legal_documents.json", "settings.LegalDocument"),
            ],
        ),
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true", help="Force overwrite existing data (deletes and re-creates)"
        )
        parser.add_argument("--dry-run", action="store_true", help="Show what would be seeded without making changes")
        parser.add_argument(
            "--only",
            type=str,
            help="Only seed specific group (base, catalog, products, communications, contracts, workflows, booking, settings)",
        )
        parser.add_argument("--skip", type=str, help="Skip specific groups (comma-separated)")
        parser.add_argument(
            "--fixtures-dir",
            type=str,
            default="core/fixtures",
            help="Directory containing fixture files (relative to backend/)",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        dry_run = options.get("dry_run", False)
        only = options.get("only")
        skip = options.get("skip", "").split(",") if options.get("skip") else []
        fixtures_dir = options["fixtures_dir"]

        # Get absolute path to fixtures directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        self.fixtures_path = os.path.join(backend_dir, fixtures_dir)

        self.stdout.write(self.style.NOTICE("=" * 70))
        self.stdout.write(self.style.NOTICE("PRODUCTION SEED DATA"))
        self.stdout.write(self.style.NOTICE("=" * 70))
        self.stdout.write(f"Fixtures directory: {self.fixtures_path}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN MODE - No changes will be made\n"))
        elif force:
            self.stdout.write(self.style.WARNING("\nFORCE MODE - Existing data will be replaced\n"))

        total_loaded = 0
        total_skipped = 0

        for group_name, fixtures in self.FIXTURE_GROUPS:
            # Filter by --only
            if only and group_name != only:
                continue

            # Filter by --skip
            if group_name in skip:
                self.stdout.write(f"\nSkipping group: {group_name}")
                continue

            self.stdout.write(f"\n[{group_name.upper()}]")

            for fixture_file, model_path in fixtures:
                loaded, skipped = self._load_fixture(fixture_file, model_path, force, dry_run)
                total_loaded += loaded
                total_skipped += skipped

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 70))
        self.stdout.write(self.style.SUCCESS(f"Seed complete: {total_loaded} records loaded, {total_skipped} skipped"))
        self.stdout.write(self.style.SUCCESS("=" * 70))

    def _load_fixture(self, fixture_file, model_path, force, dry_run):
        """Load a single fixture file with idempotency check."""
        full_path = os.path.join(self.fixtures_path, fixture_file)

        # Check if fixture file exists
        if not os.path.exists(full_path):
            self.stdout.write(f"  Skipped (not found): {fixture_file}")
            return 0, 0

        # Read fixture to get record count and PKs
        try:
            with open(full_path) as f:
                fixture_data = json.load(f)
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f"  Error parsing {fixture_file}: {e}"))
            return 0, 0

        if not fixture_data:
            self.stdout.write(f"  Skipped (empty): {fixture_file}")
            return 0, 0

        record_count = len(fixture_data)

        # Check if data already exists
        app_label, model_name = model_path.split(".")
        try:
            Model = apps.get_model(app_label, model_name)
        except LookupError:
            self.stdout.write(self.style.WARNING(f"  Skipped (model not found): {model_path}"))
            return 0, 0

        existing_pks = set(Model.objects.values_list("pk", flat=True))
        fixture_pks = {record.get("pk") for record in fixture_data}

        # Determine what to load
        if force:
            # In force mode, delete existing and load all
            pks_to_load = fixture_pks
            if not dry_run:
                # Delete records that will be replaced
                Model.objects.filter(pk__in=fixture_pks).delete()
        else:
            # In normal mode, only load new records
            pks_to_load = fixture_pks - existing_pks

        if not pks_to_load:
            self.stdout.write(f"  Skipped (exists): {fixture_file} ({record_count} records)")
            return 0, record_count

        records_to_skip = len(fixture_pks) - len(pks_to_load)

        if dry_run:
            self.stdout.write(f"  Would load: {fixture_file} ({len(pks_to_load)} new, {records_to_skip} exist)")
            return len(pks_to_load), records_to_skip

        try:
            # Use loaddata to load the fixture
            # Note: loaddata handles the actual insertion
            call_command("loaddata", full_path, verbosity=0)

            self.stdout.write(self.style.SUCCESS(f"  Loaded: {fixture_file} ({record_count} records)"))
            return record_count, 0

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  Error loading {fixture_file}: {e}"))
            return 0, record_count
