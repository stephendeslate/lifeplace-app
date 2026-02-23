# backend/core/management/commands/rotate_encryption_key.py

import logging

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.utils.encryption import EncryptionService, decrypt_data, encrypt_data

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Rotate encryption keys for encrypted fields"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be re-encrypted without making changes",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of records to process in each batch (default: 100)",
        )
        parser.add_argument(
            "--app",
            type=str,
            help="Specific app to rotate keys for (default: all apps)",
        )
        parser.add_argument(
            "--model",
            type=str,
            help="Specific model to rotate keys for (requires --app)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]
        app_name = options["app"]
        model_name = options["model"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE: No changes will be made"))

        # Validate that we have both old and new encryption keys
        encryption_service = EncryptionService()
        if not hasattr(encryption_service, "_old_fernet") or not encryption_service._old_fernet:
            raise CommandError(
                "No old encryption key found. Set OLD_FIELD_ENCRYPTION_KEY environment variable "
                "with the previous encryption key before running key rotation."
            )

        self.stdout.write("🔄 Starting encryption key rotation...")

        # Find all models with encrypted fields
        encrypted_models = self._find_encrypted_models(app_name, model_name)

        if not encrypted_models:
            self.stdout.write(self.style.WARNING("No models with encrypted fields found."))
            return

        total_rotated = 0

        for model_info in encrypted_models:
            model_class = model_info["model"]
            encrypted_fields = model_info["fields"]

            self.stdout.write(f"\n📝 Processing {model_class._meta.label}...")

            rotated_count = self._rotate_model_keys(model_class, encrypted_fields, batch_size, dry_run)

            total_rotated += rotated_count

            self.stdout.write(self.style.SUCCESS(f"✅ Rotated {rotated_count} records in {model_class._meta.label}"))

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n🔍 DRY RUN COMPLETE: Would rotate {total_rotated} records across {len(encrypted_models)} models"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✅ KEY ROTATION COMPLETE: Successfully rotated {total_rotated} "
                    f"records across {len(encrypted_models)} models"
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠️  IMPORTANT: After verifying the rotation, you can remove "
                    "OLD_FIELD_ENCRYPTION_KEY from your environment variables."
                )
            )

    def _find_encrypted_models(self, app_name: str = None, model_name: str = None) -> list[dict]:
        """Find all models that have encrypted fields"""
        from core.utils.encryption import EncryptedJSONField

        encrypted_models = []

        # Get all apps or specific app
        if app_name:
            try:
                apps_to_check = [apps.get_app_config(app_name)]
            except LookupError:
                raise CommandError(f"App '{app_name}' not found")
        else:
            apps_to_check = apps.get_app_configs()

        for app_config in apps_to_check:
            for model in app_config.get_models():
                # Skip if specific model requested and this isn't it
                if model_name and model._meta.model_name != model_name.lower():
                    continue

                # Find encrypted fields in this model
                encrypted_fields = []
                for field in model._meta.fields:
                    if isinstance(field, EncryptedJSONField):
                        encrypted_fields.append(field.name)

                if encrypted_fields:
                    encrypted_models.append({"model": model, "fields": encrypted_fields})

        return encrypted_models

    def _rotate_model_keys(self, model_class: type, encrypted_fields: list[str], batch_size: int, dry_run: bool) -> int:
        """Rotate encryption keys for a specific model"""

        rotated_count = 0
        total_count = model_class.objects.count()

        if total_count == 0:
            return 0

        self.stdout.write(f"  Found {total_count} records with encrypted fields: {encrypted_fields}")

        # Process in batches to avoid memory issues
        for offset in range(0, total_count, batch_size):
            batch = model_class.objects.all()[offset : offset + batch_size]

            if dry_run:
                # In dry run, just count records that would be rotated
                rotated_count += len(batch)
                continue

            # Process each record in the batch
            with transaction.atomic():
                for record in batch:
                    try:
                        record_updated = False

                        for field_name in encrypted_fields:
                            # Get the current encrypted value from database
                            encrypted_value = getattr(record, field_name + "_encrypted", "")

                            if encrypted_value:
                                # Try to decrypt with old key and re-encrypt with new key
                                try:
                                    # This will use old key if current key fails
                                    decrypted_data = decrypt_data(encrypted_value)

                                    # Re-encrypt with current (new) key
                                    new_encrypted_value = encrypt_data(decrypted_data)

                                    # Update the field
                                    setattr(record, field_name + "_encrypted", new_encrypted_value)
                                    record_updated = True

                                except Exception as e:
                                    logger.error(
                                        f"Failed to rotate key for {model_class._meta.label} "
                                        f"record {record.pk}, field {field_name}: {e}"
                                    )
                                    continue

                        if record_updated:
                            record.save(update_fields=[f + "_encrypted" for f in encrypted_fields])
                            rotated_count += 1

                    except Exception as e:
                        logger.error(f"Failed to process {model_class._meta.label} record {record.pk}: {e}")
                        continue

            # Show progress
            progress = min(offset + batch_size, total_count)
            self.stdout.write(f"  Progress: {progress}/{total_count} records processed")

        return rotated_count
