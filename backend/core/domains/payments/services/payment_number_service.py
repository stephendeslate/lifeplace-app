# backend/core/domains/payments/services/payment_number_service.py

import logging
from typing import Optional
from django.db import transaction, connection
from django.utils import timezone

logger = logging.getLogger(__name__)


class PaymentNumberService:
    """
    Atomic payment number generation service to prevent duplicate payment numbers.

    This service replaces the problematic Payment.generate_payment_number() method
    that caused race conditions when self.pk was None during Payment creation.
    """

    # Payment number format: PAY-{year}-{sequence:06d}
    # Example: PAY-2025-000001, PAY-2025-000002

    @classmethod
    def generate_unique_payment_number(cls, event_id: Optional[int] = None) -> str:
        """
        Generate a globally unique payment number using database sequence.

        Args:
            event_id: Optional event ID for context (not used in generation for uniqueness)

        Returns:
            str: Unique payment number like "PAY-2025-000001"

        Raises:
            Exception: If unable to generate unique number after retries
        """
        current_year = timezone.now().year

        # Use database-level atomic counter to prevent race conditions
        max_retries = 5
        for attempt in range(max_retries):
            try:
                sequence_number = cls._get_next_sequence_number(current_year)
                payment_number = f"PAY-{current_year}-{sequence_number:06d}"

                # Verify uniqueness (should always be unique with proper sequence)
                if cls._is_payment_number_unique(payment_number):
                    logger.debug(f"Generated payment number: {payment_number}")
                    return payment_number
                else:
                    logger.warning(f"Payment number {payment_number} already exists, retrying...")

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} to generate payment number failed: {e}")
                if attempt == max_retries - 1:
                    raise

        raise Exception(f"Failed to generate unique payment number after {max_retries} attempts")

    @classmethod
    def _get_next_sequence_number(cls, year: int) -> int:
        """
        Get next sequence number for the given year using database-level atomicity.

        This creates or updates a sequence counter table to ensure unique numbers
        even under high concurrency.
        """
        from ..models import PaymentNumberSequence

        with transaction.atomic():
            # Use select_for_update to prevent race conditions
            sequence, created = PaymentNumberSequence.objects.select_for_update().get_or_create(
                year=year,
                defaults={'next_number': 1}
            )

            current_number = sequence.next_number
            sequence.next_number += 1
            sequence.save(update_fields=['next_number'])

            return current_number

    @classmethod
    def _is_payment_number_unique(cls, payment_number: str) -> bool:
        """
        Check if payment number is unique in the database.

        Args:
            payment_number: Payment number to check

        Returns:
            bool: True if unique, False if duplicate exists
        """
        from ..models import Payment

        return not Payment.objects.filter(payment_number=payment_number).exists()

    @classmethod
    def get_payment_number_info(cls, payment_number: str) -> dict:
        """
        Extract information from payment number format.

        Args:
            payment_number: Payment number to parse (e.g., "PAY-2025-000001")

        Returns:
            dict: Information about the payment number
        """
        try:
            parts = payment_number.split('-')
            if len(parts) == 3 and parts[0] == 'PAY':
                return {
                    'prefix': parts[0],
                    'year': int(parts[1]),
                    'sequence': int(parts[2]),
                    'is_valid_format': True
                }
        except (ValueError, IndexError):
            pass

        return {
            'prefix': None,
            'year': None,
            'sequence': None,
            'is_valid_format': False
        }

    @classmethod
    def validate_payment_number_format(cls, payment_number: str) -> bool:
        """
        Validate payment number follows expected format.

        Args:
            payment_number: Payment number to validate

        Returns:
            bool: True if valid format, False otherwise
        """
        info = cls.get_payment_number_info(payment_number)
        return info['is_valid_format']

    @classmethod
    def reset_sequence_for_year(cls, year: int) -> None:
        """
        Reset sequence counter for a given year (admin utility).

        WARNING: This should only be used for testing or data migration.

        Args:
            year: Year to reset sequence for
        """
        from ..models import PaymentNumberSequence

        with transaction.atomic():
            sequence, created = PaymentNumberSequence.objects.get_or_create(
                year=year,
                defaults={'next_number': 1}
            )
            if not created:
                sequence.next_number = 1
                sequence.save(update_fields=['next_number'])

        logger.warning(f"Payment number sequence reset for year {year}")


class PaymentNumberMigrationService:
    """
    Service for migrating existing payments to new payment number format.
    This handles the transition from old format to new atomic format.
    """

    @classmethod
    def migrate_existing_payment_numbers(cls, dry_run: bool = True) -> dict:
        """
        Migrate existing payments with duplicate or invalid payment numbers.

        Args:
            dry_run: If True, only report what would be changed without making changes

        Returns:
            dict: Migration report with counts and details
        """
        from ..models import Payment

        report = {
            'total_payments': 0,
            'duplicate_numbers': 0,
            'invalid_format': 0,
            'migrations_needed': 0,
            'duplicates_found': [],
            'invalid_formats': []
        }

        # Find all payments
        payments = Payment.objects.all().order_by('created_at')
        report['total_payments'] = payments.count()

        # Find duplicates
        duplicate_numbers = cls._find_duplicate_payment_numbers()
        report['duplicate_numbers'] = len(duplicate_numbers)
        report['duplicates_found'] = duplicate_numbers

        # Find invalid formats
        invalid_payments = []
        for payment in payments:
            if not PaymentNumberService.validate_payment_number_format(payment.payment_number):
                invalid_payments.append({
                    'id': payment.id,
                    'current_number': payment.payment_number,
                    'event_id': payment.event_id
                })

        report['invalid_format'] = len(invalid_payments)
        report['invalid_formats'] = invalid_payments
        report['migrations_needed'] = report['duplicate_numbers'] + report['invalid_format']

        if not dry_run and report['migrations_needed'] > 0:
            # Perform actual migration
            migrated_count = cls._perform_migration(duplicate_numbers, invalid_payments)
            report['migrated_count'] = migrated_count

        return report

    @classmethod
    def _find_duplicate_payment_numbers(cls) -> list:
        """Find all duplicate payment numbers in database."""
        from ..models import Payment
        from django.db.models import Count

        duplicates = (Payment.objects
                     .values('payment_number')
                     .annotate(count=Count('id'))
                     .filter(count__gt=1)
                     .values_list('payment_number', 'count'))

        return [{'payment_number': num, 'count': count} for num, count in duplicates]

    @classmethod
    def _perform_migration(cls, duplicate_numbers: list, invalid_payments: list) -> int:
        """
        Perform the actual migration of payment numbers.

        Returns:
            int: Number of payments migrated
        """
        from ..models import Payment

        migrated_count = 0

        with transaction.atomic():
            # Handle duplicates - keep the first one, reassign others
            for duplicate_info in duplicate_numbers:
                payment_number = duplicate_info['payment_number']
                duplicate_payments = Payment.objects.filter(
                    payment_number=payment_number
                ).order_by('created_at')

                # Skip the first payment (keep original number)
                for payment in duplicate_payments[1:]:
                    new_number = PaymentNumberService.generate_unique_payment_number()
                    payment.payment_number = new_number
                    payment.save(update_fields=['payment_number'])
                    migrated_count += 1
                    logger.info(f"Migrated payment {payment.id} from {payment_number} to {new_number}")

            # Handle invalid formats
            for invalid_payment in invalid_payments:
                try:
                    payment = Payment.objects.get(id=invalid_payment['id'])
                    new_number = PaymentNumberService.generate_unique_payment_number()
                    old_number = payment.payment_number
                    payment.payment_number = new_number
                    payment.save(update_fields=['payment_number'])
                    migrated_count += 1
                    logger.info(f"Migrated payment {payment.id} from {old_number} to {new_number}")
                except Payment.DoesNotExist:
                    logger.warning(f"Payment {invalid_payment['id']} not found during migration")

        return migrated_count