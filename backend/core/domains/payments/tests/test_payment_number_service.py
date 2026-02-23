# backend/core/domains/payments/tests/test_payment_number_service.py

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from unittest.mock import patch

from django.db import transaction
from django.test import TestCase, TransactionTestCase

from core.domains.events.models import Event
from core.domains.payments.models import Payment, PaymentNumberSequence
from core.domains.payments.services.payment_number_service import PaymentNumberMigrationService, PaymentNumberService
from core.domains.users.models import User

# Get current year for dynamic testing
CURRENT_YEAR = datetime.now().year


class PaymentNumberServiceTest(TransactionTestCase):
    """
    Test PaymentNumberService for atomic payment number generation.
    Uses TransactionTestCase to test concurrent scenarios with real database transactions.
    """

    def setUp(self):
        """Create test user and event for payment creation"""
        self.user = User.objects.create_user(
            email="john.doe@gmail.com", password="test123", first_name="John", last_name="Doe", role="CLIENT"
        )

        self.event = Event.objects.create(
            name="Test Event", client=self.user, start_date="2025-12-25 10:00:00", status="LEAD"
        )

    def test_generate_unique_payment_number_basic(self):
        """Test basic payment number generation"""
        payment_number = PaymentNumberService.generate_unique_payment_number()

        self.assertTrue(payment_number.startswith(f"PAY-{CURRENT_YEAR}-"))
        self.assertEqual(len(payment_number), 15)  # PAY-YYYY-XXXXXX = 3+1+4+1+6 = 15

        # Verify format
        info = PaymentNumberService.get_payment_number_info(payment_number)
        self.assertTrue(info["is_valid_format"])
        self.assertEqual(info["year"], CURRENT_YEAR)
        self.assertEqual(info["sequence"], 1)

    def test_sequential_number_generation(self):
        """Test that sequential numbers are generated correctly"""
        numbers = []
        for _ in range(5):
            number = PaymentNumberService.generate_unique_payment_number()
            numbers.append(number)

        # Verify all numbers are unique
        self.assertEqual(len(set(numbers)), 5)

        # Verify sequence increments
        for i, number in enumerate(numbers):
            info = PaymentNumberService.get_payment_number_info(number)
            self.assertEqual(info["sequence"], i + 1)

    def test_concurrent_payment_number_generation(self):
        """Test concurrent payment number generation to ensure no duplicates"""
        num_threads = 10
        numbers = []
        errors = []

        def generate_number():
            try:
                return PaymentNumberService.generate_unique_payment_number()
            except Exception as e:
                errors.append(str(e))
                return None

        # Run concurrent number generation
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(generate_number) for _ in range(num_threads)]

            for future in as_completed(futures):
                result = future.result()
                if result:
                    numbers.append(result)

        # Verify no errors occurred
        self.assertEqual(len(errors), 0, f"Errors during concurrent generation: {errors}")

        # Verify all numbers are unique
        self.assertEqual(len(set(numbers)), num_threads)
        self.assertEqual(len(numbers), num_threads)

        print(f"Generated {len(numbers)} unique payment numbers concurrently")
        for number in sorted(numbers):
            print(f"  {number}")

    def test_concurrent_payment_creation(self):
        """Test concurrent Payment model creation to ensure no duplicate numbers"""
        num_threads = 8
        payments = []
        errors = []

        def create_payment():
            try:
                with transaction.atomic():
                    payment = Payment.objects.create(
                        event=self.event,
                        amount="100.00",
                        currency="PHP",
                        due_date="2025-12-31",
                        description="Concurrent test payment",
                        status="PENDING",
                    )
                    return payment
            except Exception as e:
                errors.append(str(e))
                return None

        # Run concurrent payment creation
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(create_payment) for _ in range(num_threads)]

            for future in as_completed(futures):
                result = future.result()
                if result:
                    payments.append(result)

        # Verify no errors occurred
        self.assertEqual(len(errors), 0, f"Errors during concurrent payment creation: {errors}")

        # Verify all payments have unique payment numbers
        payment_numbers = [p.payment_number for p in payments]
        self.assertEqual(len(set(payment_numbers)), num_threads)
        self.assertEqual(len(payments), num_threads)

        print(f"Created {len(payments)} payments with unique numbers concurrently")
        for payment in payments:
            print(f"  Payment {payment.id}: {payment.payment_number}")

    def test_payment_number_format_validation(self):
        """Test payment number format validation"""
        valid_numbers = ["PAY-2025-000001", "PAY-2024-123456", "PAY-2023-000999"]

        invalid_numbers = [
            "PAY-20250925-152-0",  # Old format
            "INV-2025-000001",  # Wrong prefix
            "PAY-2025",  # Missing sequence
            "PAY-2025-ABC123",  # Non-numeric sequence
            "",  # Empty
            "INVALID",  # Completely wrong
        ]

        for number in valid_numbers:
            self.assertTrue(
                PaymentNumberService.validate_payment_number_format(number), f"Expected {number} to be valid"
            )

        for number in invalid_numbers:
            self.assertFalse(
                PaymentNumberService.validate_payment_number_format(number), f"Expected {number} to be invalid"
            )

    def test_sequence_reset(self):
        """Test sequence reset functionality"""
        # Generate some numbers
        PaymentNumberService.generate_unique_payment_number()
        PaymentNumberService.generate_unique_payment_number()

        # Verify sequence is at 3
        sequence = PaymentNumberSequence.objects.get(year=CURRENT_YEAR)
        self.assertEqual(sequence.next_number, 3)

        # Reset sequence
        PaymentNumberService.reset_sequence_for_year(CURRENT_YEAR)

        # Verify sequence is back to 1
        sequence.refresh_from_db()
        self.assertEqual(sequence.next_number, 1)

        # Generate new number should be 000001 again
        number = PaymentNumberService.generate_unique_payment_number()
        info = PaymentNumberService.get_payment_number_info(number)
        self.assertEqual(info["sequence"], 1)


import unittest


class PaymentNumberMigrationServiceTest(TestCase):
    """Test payment number migration service"""

    def setUp(self):
        """Create test data with problematic payment numbers"""
        self.user = User.objects.create_user(
            email="john.doe@gmail.com", password="test123", first_name="John", last_name="Doe", role="CLIENT"
        )

        self.event = Event.objects.create(
            name="Test Event", client=self.user, start_date="2025-12-25 10:00:00", status="LEAD"
        )

    @unittest.skip("Cannot create duplicate payment_numbers due to unique constraint - migration already applied")
    def test_find_duplicate_payment_numbers(self):
        """Test finding duplicate payment numbers"""
        # Create payments with duplicate numbers (bypassing our new service)
        Payment.objects.bulk_create(
            [
                Payment(
                    event=self.event,
                    amount="100.00",
                    currency="PHP",
                    due_date="2025-12-31",
                    description="Duplicate 1",
                    status="PENDING",
                    payment_number="PAY-20250925-152-0",  # Old duplicate format
                ),
                Payment(
                    event=self.event,
                    amount="200.00",
                    currency="PHP",
                    due_date="2025-12-31",
                    description="Duplicate 2",
                    status="PENDING",
                    payment_number="PAY-20250925-152-0",  # Same duplicate
                ),
                Payment(
                    event=self.event,
                    amount="300.00",
                    currency="PHP",
                    due_date="2025-12-31",
                    description="Unique",
                    status="PENDING",
                    payment_number="PAY-2025-000001",  # Proper format
                ),
            ]
        )

        # Test migration report
        report = PaymentNumberMigrationService.migrate_existing_payment_numbers(dry_run=True)

        self.assertEqual(report["total_payments"], 3)
        self.assertEqual(report["duplicate_numbers"], 1)
        self.assertEqual(report["duplicates_found"][0]["payment_number"], "PAY-20250925-152-0")
        self.assertEqual(report["duplicates_found"][0]["count"], 2)

    def test_migration_dry_run(self):
        """Test migration in dry run mode"""
        # Create problematic payment
        Payment.objects.create(
            event=self.event,
            amount="100.00",
            currency="PHP",
            due_date="2025-12-31",
            description="Invalid format",
            status="PENDING",
            payment_number="INVALID-FORMAT",
        )

        report = PaymentNumberMigrationService.migrate_existing_payment_numbers(dry_run=True)

        self.assertEqual(report["invalid_format"], 1)
        self.assertEqual(len(report["invalid_formats"]), 1)
        self.assertEqual(report["invalid_formats"][0]["current_number"], "INVALID-FORMAT")

        # Verify nothing was actually changed
        payment = Payment.objects.first()
        self.assertEqual(payment.payment_number, "INVALID-FORMAT")

    @unittest.skip("Cannot create duplicate payment_numbers due to unique constraint - migration already applied")
    @patch("core.domains.payments.services.payment_number_service.PaymentNumberService.generate_unique_payment_number")
    def test_actual_migration(self, mock_generate):
        """Test actual migration execution"""
        mock_generate.side_effect = ["PAY-2025-000001", "PAY-2025-000002"]

        # Create payments with issues
        Payment.objects.bulk_create(
            [
                Payment(
                    event=self.event,
                    amount="100.00",
                    currency="PHP",
                    due_date="2025-12-31",
                    description="Duplicate 1",
                    status="PENDING",
                    payment_number="DUPLICATE",
                ),
                Payment(
                    event=self.event,
                    amount="200.00",
                    currency="PHP",
                    due_date="2025-12-31",
                    description="Duplicate 2",
                    status="PENDING",
                    payment_number="DUPLICATE",
                ),
            ]
        )

        # Run actual migration
        report = PaymentNumberMigrationService.migrate_existing_payment_numbers(dry_run=False)

        self.assertEqual(report["migrated_count"], 1)  # Only one duplicate gets new number

        # Verify payments were updated
        payments = Payment.objects.all().order_by("id")
        self.assertEqual(payments[0].payment_number, "DUPLICATE")  # First keeps original
        self.assertEqual(payments[1].payment_number, "PAY-2025-000001")  # Second gets new number
