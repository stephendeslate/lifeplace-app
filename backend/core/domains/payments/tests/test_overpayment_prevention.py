# backend/core/domains/payments/tests/test_overpayment_prevention.py

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch, Mock

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentMethod, PaymentPlan, Invoice, PaymentSettings
)
from core.domains.payments.services.invoice_service import InvoiceService
from core.domains.payments.services.payment_plan_service import PaymentPlanService
from core.domains.payments.services.payment_orchestrator import PaymentOrchestrator, PaymentRequest
from core.domains.events.models import Event, EventType
from core.domains.sales.models import EventQuote

User = get_user_model()


class OverPaymentPreventionTestCase(TestCase):
    """Test cases for over-payment prevention safeguards"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='overpayment@test.com',
            first_name='Test',
            last_name='User',
            role='CLIENT'
        )

        self.admin = User.objects.create_user(
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            role='ADMIN'
        )

        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Over-Payment Test Event',
            start_date=timezone.now() + timedelta(days=60)
        )

        self.gateway = PaymentGateway.objects.create(
            name='Stripe Test',
            code='stripe',
            is_active=True,
            config={'test_mode': True}
        )

        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            type='CREDIT_CARD',
            token_reference='pm_test_overpayment'
        )

        # Create payment settings
        self.settings = PaymentSettings.get_default_settings()

    def test_invoice_service_prevents_overpayment(self):
        """Test InvoiceService correctly calculates payment amount for FULL payment type"""
        # Create invoice with $10,000 total
        invoice = Invoice.objects.create(
            invoice_id='INV-OVER-001',
            event=self.event,
            client=self.user,
            subtotal=Decimal('10000.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('10000.00'),
            currency='PHP',
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            status='ISSUED'
        )

        # Pay $6,000
        payment1 = Payment.objects.create(
            event=self.event,
            amount=Decimal('6000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today(),
            invoice=invoice
        )
        invoice.mark_as_paid()

        # Verify remaining balance
        self.assertEqual(invoice.remaining_amount, Decimal('4000.00'))

        # When payment_type='FULL', InvoiceService auto-calculates remaining balance
        # This ensures clients can't overpay via the normal payment flow
        payment_data = {
            'payment_type': 'FULL',
            'gateway_code': 'stripe',
            'is_manual': True
        }

        result = InvoiceService.process_invoice_payment(invoice, payment_data, self.admin)

        # Payment should succeed with correct amount (remaining balance)
        self.assertTrue(result['success'])
        payment = result['payment']
        self.assertEqual(payment.amount, Decimal('4000.00'))  # Correct remaining amount

    def test_payment_orchestrator_validates_overpayment(self):
        """Test PaymentOrchestrator rejects over-payment at creation time"""
        # Create invoice with $8,000 total
        invoice = Invoice.objects.create(
            invoice_id='INV-OVER-002',
            event=self.event,
            client=self.user,
            subtotal=Decimal('8000.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('8000.00'),
            currency='PHP',
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            status='ISSUED'
        )

        # Pay $3,000
        payment1 = Payment.objects.create(
            event=self.event,
            amount=Decimal('3000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today(),
            invoice=invoice
        )
        invoice.mark_as_paid()

        # Remaining: $5,000
        self.assertEqual(invoice.remaining_amount, Decimal('5000.00'))

        # Try to create payment for $6,000 via orchestrator
        request = PaymentRequest(
            event_id=self.event.id,
            amount=Decimal('6000.00'),
            currency='PHP',
            due_date=date.today() + timedelta(days=30),
            invoice_id=invoice.id,
            is_manual=True
        )

        response = PaymentOrchestrator.create_payment(request, self.admin)

        # Assert payment was rejected
        self.assertFalse(response.success)
        self.assertEqual(response.error_code, 'EXCEEDS_BALANCE')
        self.assertIn('exceeds invoice remaining balance', response.message)

    def test_auto_payment_adjusts_to_remaining_balance(self):
        """Test auto-payment charges only remaining balance when less than installment"""
        # Create invoice with $10,000 total
        invoice = Invoice.objects.create(
            invoice_id='INV-AUTO-001',
            event=self.event,
            client=self.user,
            subtotal=Decimal('10000.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('10000.00'),
            currency='PHP',
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            status='ISSUED'
        )

        # Set event total amount due
        self.event.total_amount_due = Decimal('10000.00')
        self.event.total_amount_paid = Decimal('0.00')
        self.event.save()

        # Create payment plan: $2,000 × 5 installments
        # Don't auto-create installments, we'll create them manually to control due dates
        payment_plan = PaymentPlan.objects.create(
            event=self.event,
            total_amount=Decimal('10000.00'),
            down_payment_amount=Decimal('0.00'),
            down_payment_due_date=date.today(),
            number_of_installments=5,
            frequency='MONTHLY',
            auto_payment_enabled=True,
            auto_payment_method=self.payment_method,
            status='ACTIVE'
        )

        # Create installment with due date of today so it will be processed
        from core.domains.payments.models import PaymentInstallment
        installment = PaymentInstallment.objects.create(
            payment_plan=payment_plan,
            amount=Decimal('2000.00'),
            due_date=date.today(),  # Due today, will be processed
            status='PENDING',
            installment_number=1,
            description='Installment 1 of 5'
        )

        # Client makes manual payment of $9,000
        manual_payment = Payment.objects.create(
            event=self.event,
            amount=Decimal('9000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today(),
            invoice=invoice
        )

        # Update event paid amount
        self.event.total_amount_paid = Decimal('9000.00')
        self.event.save()

        # Remaining: $1,000
        remaining = self.event.total_amount_due - self.event.total_amount_paid
        self.assertEqual(remaining, Decimal('1000.00'))

        # Mock the payment completion to avoid actual gateway calls
        with patch.object(Payment, 'complete_payment'):
            # Run auto-payment processing
            processed_count = PaymentPlanService.process_auto_payments()

            # Should have processed one payment
            self.assertEqual(processed_count, 1)

            # Check that a payment was created
            auto_payment = Payment.objects.filter(installment=installment).first()
            self.assertIsNotNone(auto_payment)

            # Payment amount should be adjusted to $1,000 (remaining balance)
            self.assertEqual(auto_payment.amount, Decimal('1000.00'))
            self.assertIn('adjusted to remaining balance', auto_payment.description)

    def test_auto_payment_completes_plan_when_balance_paid(self):
        """Test payment plan auto-completes when balance is fully paid"""
        # Create event with total amount
        self.event.total_amount_due = Decimal('10000.00')
        self.event.total_amount_paid = Decimal('10000.00')  # Fully paid
        self.event.payment_status = 'PAID'
        self.event.save()

        # Create active payment plan
        payment_plan = PaymentPlan.objects.create(
            event=self.event,
            total_amount=Decimal('10000.00'),
            down_payment_amount=Decimal('0.00'),
            down_payment_due_date=date.today(),
            number_of_installments=5,
            frequency='MONTHLY',
            auto_payment_enabled=True,
            auto_payment_method=self.payment_method,
            status='ACTIVE'
        )

        # Run auto-payment processing
        processed_count = PaymentPlanService.process_auto_payments()

        # Verify plan was auto-completed
        payment_plan.refresh_from_db()
        self.assertEqual(payment_plan.status, 'COMPLETED')
        self.assertIn('event balance already paid', payment_plan.notes)

    def test_manual_payment_triggers_plan_completion(self):
        """Test manual payment completing balance triggers payment plan completion"""
        # Create invoice with $10,000 total
        invoice = Invoice.objects.create(
            invoice_id='INV-COMP-001',
            event=self.event,
            client=self.user,
            subtotal=Decimal('10000.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('10000.00'),
            currency='PHP',
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            status='ISSUED'
        )

        # Set event totals
        self.event.total_amount_due = Decimal('10000.00')
        self.event.total_amount_paid = Decimal('3000.00')
        self.event.payment_status = 'PARTIALLY_PAID'
        self.event.save()

        # Create active payment plan
        payment_plan = PaymentPlan.objects.create(
            event=self.event,
            total_amount=Decimal('10000.00'),
            down_payment_amount=Decimal('0.00'),
            down_payment_due_date=date.today(),
            number_of_installments=3,
            frequency='MONTHLY',
            auto_payment_enabled=True,
            auto_payment_method=self.payment_method,
            status='ACTIVE'
        )

        # Client makes final payment of $7,000
        final_payment = Payment.objects.create(
            event=self.event,
            amount=Decimal('7000.00'),
            currency='PHP',
            status='CREATED',
            due_date=date.today(),
            invoice=invoice
        )

        # Update event totals
        self.event.total_amount_paid = Decimal('10000.00')
        self.event.payment_status = 'PAID'
        self.event.save()

        # Mark invoice as paid
        invoice.mark_as_paid()

        # Complete the payment (this should trigger auto-completion)
        final_payment.complete_payment()

        # Verify payment plan was auto-completed
        payment_plan.refresh_from_db()
        self.assertEqual(payment_plan.status, 'COMPLETED')

    def test_deposit_payment_overpayment_prevention(self):
        """Test deposit payment is validated against remaining balance"""
        # Create invoice with $5,000 total
        invoice = Invoice.objects.create(
            invoice_id='INV-DEP-001',
            event=self.event,
            client=self.user,
            subtotal=Decimal('5000.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('5000.00'),
            currency='PHP',
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            status='ISSUED'
        )

        # Pay $4,500 (leaving $500 remaining)
        payment1 = Payment.objects.create(
            event=self.event,
            amount=Decimal('4500.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today(),
            invoice=invoice
        )
        invoice.mark_as_paid()

        # Remaining: $500
        self.assertEqual(invoice.remaining_amount, Decimal('500.00'))

        # Try to pay 50% deposit (50% of $5,000 = $2,500) - exceeds $500 remaining
        payment_data = {
            'payment_type': 'DEPOSIT',  # This calculates 50% of total
            'gateway_code': 'stripe',
            'is_manual': True
        }

        result = InvoiceService.process_invoice_payment(invoice, payment_data, self.admin)

        # Assert payment was rejected
        self.assertFalse(result['success'])
        self.assertEqual(result['error_code'], 'EXCEEDS_BALANCE')

    def test_complete_plan_if_balance_paid_method(self):
        """Test complete_plan_if_balance_paid() method directly"""
        # Create event with full payment
        self.event.total_amount_due = Decimal('8000.00')
        self.event.total_amount_paid = Decimal('8000.00')
        self.event.payment_status = 'PAID'
        self.event.save()

        # Create active payment plan
        payment_plan = PaymentPlan.objects.create(
            event=self.event,
            total_amount=Decimal('8000.00'),
            down_payment_amount=Decimal('0.00'),
            down_payment_due_date=date.today(),
            number_of_installments=4,
            frequency='MONTHLY',
            status='ACTIVE'
        )

        # Call the method directly
        result = PaymentPlanService.complete_plan_if_balance_paid(payment_plan.id)

        # Assert plan was completed
        self.assertTrue(result)
        payment_plan.refresh_from_db()
        self.assertEqual(payment_plan.status, 'COMPLETED')
        self.assertIn('Auto-completed', payment_plan.notes)

    def test_complete_plan_if_balance_paid_ignores_non_active(self):
        """Test complete_plan_if_balance_paid() ignores non-active plans"""
        # Create event with full payment
        self.event.total_amount_due = Decimal('6000.00')
        self.event.total_amount_paid = Decimal('6000.00')
        self.event.payment_status = 'PAID'
        self.event.save()

        # Create suspended payment plan
        payment_plan = PaymentPlan.objects.create(
            event=self.event,
            total_amount=Decimal('6000.00'),
            down_payment_amount=Decimal('0.00'),
            down_payment_due_date=date.today(),
            number_of_installments=3,
            frequency='MONTHLY',
            status='SUSPENDED'
        )

        # Call the method
        result = PaymentPlanService.complete_plan_if_balance_paid(payment_plan.id)

        # Assert plan was NOT completed (because it's suspended)
        self.assertFalse(result)
        payment_plan.refresh_from_db()
        self.assertEqual(payment_plan.status, 'SUSPENDED')
