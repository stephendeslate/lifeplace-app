# backend/core/domains/payments/tests/test_invoice_payments.py

import json
from datetime import datetime, date
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from core.domains.events.models import Event, EventType
from core.domains.sales.models import EventQuote
from core.domains.payments.models import (
    Invoice,
    Payment,
    PaymentGateway,
    PaymentMethod,
    PaymentPlan
)

User = get_user_model()


class InvoicePaymentTestCase(TestCase):
    """Test invoice payment functionality"""

    def setUp(self):
        """Set up test data"""
        # Create users
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            first_name='Test',
            last_name='Client',
            role='CLIENT'
        )

        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            first_name='Test',
            last_name='Admin',
            role='ADMIN'
        )

        # Create event type
        self.event_type = EventType.objects.create(
            name='Wedding',
            description='Wedding events'
        )

        # Create event
        self.event = Event.objects.create(
            client=self.client_user,
            name='Test Wedding',
            event_type=self.event_type,
            start_date=timezone.make_aware(datetime(2025, 12, 1, 10, 0, 0)),
            end_date=timezone.make_aware(datetime(2025, 12, 1, 18, 0, 0)),
            status='CONFIRMED'
        )

        # Create quote
        self.quote = EventQuote.objects.create(
            event=self.event,
            version=1,
            status='ACCEPTED',
            subtotal=Decimal('10000.00'),
            tax_amount=Decimal('1200.00'),
            total_amount=Decimal('11200.00'),
            valid_until=date(2025, 12, 31)
        )

        # Create invoice
        self.invoice = Invoice.objects.create(
            invoice_id='INV-TEST-001',
            event=self.event,
            client=self.client_user,
            quote=self.quote,
            subtotal=Decimal('10000.00'),
            tax_amount=Decimal('1200.00'),
            total_amount=Decimal('11200.00'),
            currency='PHP',
            status='ISSUED',
            issue_date=date(2025, 10, 1),
            due_date=date(2025, 11, 1)
        )

        # Create payment gateway
        self.gateway = PaymentGateway.objects.create(
            name='Test Stripe',
            code='stripe',
            is_active=True,
            config={'test_mode': True}
        )

        # Create payment method
        self.payment_method = PaymentMethod.objects.create(
            user=self.client_user,
            type='CREDIT_CARD',
            nickname='Test Card',
            gateway=self.gateway,
            token_reference='test_token_123',
            last_four='4242',
            is_default=True
        )

        # Set up API client
        self.client = APIClient()

    def test_list_client_invoices(self):
        """Test listing client invoices"""
        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.invoice.id)

    def test_client_cannot_see_other_client_invoices(self):
        """Test that clients can only see their own invoices"""
        # Create another client and invoice
        other_client = User.objects.create_user(
            email='other@test.com',
            password='testpass123',
            role='CLIENT'
        )

        other_event = Event.objects.create(
            client=other_client,
            name='Other Wedding',
            event_type=self.event_type,
            start_date=timezone.make_aware(datetime(2025, 12, 1, 10, 0, 0)),
            end_date=timezone.make_aware(datetime(2025, 12, 1, 18, 0, 0)),
            status='CONFIRMED'
        )

        Invoice.objects.create(
            invoice_id='INV-TEST-002',
            event=other_event,
            client=other_client,
            subtotal=Decimal('5000.00'),
            tax_amount=Decimal('600.00'),
            total_amount=Decimal('5600.00'),
            currency='PHP',
            status='ISSUED',
            issue_date=date(2025, 10, 1),
            due_date=date(2025, 11, 1)
        )

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)  # Only own invoice

    def test_admin_can_see_all_invoices(self):
        """Test that admins can see all invoices"""
        # Create another client and invoice
        other_client = User.objects.create_user(
            email='other@test.com',
            password='testpass123',
            role='CLIENT'
        )

        other_event = Event.objects.create(
            client=other_client,
            name='Other Wedding',
            event_type=self.event_type,
            start_date=timezone.make_aware(datetime(2025, 12, 1, 10, 0, 0)),
            end_date=timezone.make_aware(datetime(2025, 12, 1, 18, 0, 0)),
            status='CONFIRMED'
        )

        Invoice.objects.create(
            invoice_id='INV-TEST-003',
            event=other_event,
            client=other_client,
            subtotal=Decimal('5000.00'),
            tax_amount=Decimal('600.00'),
            total_amount=Decimal('5600.00'),
            currency='PHP',
            status='ISSUED',
            issue_date=date(2025, 10, 1),
            due_date=date(2025, 11, 1)
        )

        self.client.force_authenticate(user=self.admin_user)

        url = reverse('client-invoice-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)  # Both invoices

    def test_invoice_download_pdf(self):
        """Test invoice PDF download"""
        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-download-pdf', kwargs={'pk': self.invoice.id})

        with patch('core.domains.payments.pdf_service.PaymentReceiptPDFService.generate_invoice_receipt_pdf') as mock_pdf:
            mock_buffer = MagicMock()
            mock_buffer.getvalue.return_value = b'fake_pdf_content'
            mock_pdf.return_value = mock_buffer

            response = self.client.get(url)

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response['Content-Type'], 'application/pdf')
            self.assertIn('attachment', response['Content-Disposition'])

    @patch('core.domains.payments.services.invoice_service.InvoiceService.process_invoice_payment')
    def test_pay_invoice_success(self, mock_process_payment):
        """Test successful invoice payment"""
        mock_process_payment.return_value = {
            'success': True,
            'payment': Payment.objects.create(
                event=self.event,
                amount=self.invoice.total_amount,
                currency='PHP',
                status='COMPLETED',
                description='Test payment'
            )
        }

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-pay', kwargs={'pk': self.invoice.id})
        data = {
            'gateway_code': 'stripe',
            'payment_method_id': self.payment_method.id,
            'notes': 'Test payment'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('payment', response.data)

    def test_pay_invoice_invalid_status(self):
        """Test payment fails for non-issued invoice"""
        self.invoice.status = 'PAID'
        self.invoice.save()

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-pay', kwargs={'pk': self.invoice.id})
        data = {
            'gateway_code': 'stripe',
            'payment_method_id': self.payment_method.id,
            'notes': 'Test payment'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot pay invoice', response.data['detail'])

    @patch('core.domains.payments.services.invoice_service.InvoiceService.create_payment_intent_for_invoice')
    def test_create_payment_intent_success(self, mock_create_intent):
        """Test successful payment intent creation"""
        mock_create_intent.return_value = {
            'success': True,
            'client_secret': 'pi_test_123_secret_456',
            'payment_intent_id': 'pi_test_123',
            'status': 'requires_payment_method',
            'requires_action': False,
            'payment_id': 1,
            'transaction_id': 1
        }

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-create-payment-intent', kwargs={'pk': self.invoice.id})
        data = {'gateway_code': 'stripe'}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('client_secret', response.data)
        self.assertIn('payment_intent_id', response.data)

    def test_create_payment_intent_invalid_status(self):
        """Test payment intent creation fails for non-issued invoice"""
        self.invoice.status = 'PAID'
        self.invoice.save()

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-create-payment-intent', kwargs={'pk': self.invoice.id})
        data = {'gateway_code': 'stripe'}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot create payment intent', response.data['detail'])

    @patch('core.domains.payments.services.invoice_service.InvoiceService.setup_payment_plan_for_invoice')
    def test_setup_payment_plan_success(self, mock_setup_plan):
        """Test successful payment plan setup"""
        mock_payment_plan = PaymentPlan.objects.create(
            event=self.event,
            quote=self.quote,
            total_amount=self.invoice.total_amount,
            currency='PHP',
            installment_count=3,
            installment_frequency='MONTHLY'
        )
        mock_setup_plan.return_value = mock_payment_plan

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-setup-payment-plan', kwargs={'pk': self.invoice.id})
        data = {
            'installment_count': 3,
            'installment_frequency': 'MONTHLY',
            'first_installment_percentage': 33.33,
            'start_date': '2025-11-01'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('payment_plan', response.data)

    def test_setup_payment_plan_invalid_status(self):
        """Test payment plan setup fails for non-issued invoice"""
        self.invoice.status = 'PAID'
        self.invoice.save()

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-invoice-setup-payment-plan', kwargs={'pk': self.invoice.id})
        data = {
            'installment_count': 3,
            'installment_frequency': 'MONTHLY',
            'first_installment_percentage': 33.33,
            'start_date': '2025-11-01'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot create payment plan', response.data['detail'])

    def test_list_client_payments(self):
        """Test listing client payments"""
        # Create a payment
        Payment.objects.create(
            event=self.event,
            invoice=self.invoice,
            amount=Decimal('5000.00'),
            currency='PHP',
            status='COMPLETED',
            description='Test payment'
        )

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_payment_summary(self):
        """Test payment summary endpoint"""
        # Create payments with different statuses
        Payment.objects.create(
            event=self.event,
            amount=Decimal('5000.00'),
            currency='PHP',
            status='COMPLETED',
            description='Completed payment'
        )

        Payment.objects.create(
            event=self.event,
            amount=Decimal('3000.00'),
            currency='PHP',
            status='PENDING',
            description='Pending payment',
            due_date='2025-09-15'  # Past due
        )

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-summary')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['payment_count'], 2)
        self.assertEqual(response.data['completed_count'], 1)
        self.assertEqual(response.data['pending_count'], 1)
        self.assertEqual(float(response.data['total_paid']), 5000.00)
        self.assertEqual(float(response.data['total_pending']), 3000.00)
        self.assertEqual(float(response.data['total_overdue']), 3000.00)

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access client endpoints"""
        url = reverse('client-invoice-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invoice_filtering(self):
        """Test invoice filtering by status and event"""
        # Create another invoice with different status
        Invoice.objects.create(
            invoice_id='INV-TEST-004',
            event=self.event,
            client=self.client_user,
            subtotal=Decimal('5000.00'),
            tax_amount=Decimal('600.00'),
            total_amount=Decimal('5600.00'),
            currency='PHP',
            status='DRAFT',
            issue_date=date(2025, 10, 1),
            due_date=date(2025, 11, 1)
        )

        self.client.force_authenticate(user=self.client_user)

        # Test status filtering
        url = reverse('client-invoice-list')
        response = self.client.get(url, {'status': 'ISSUED'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

        # Test event filtering
        response = self.client.get(url, {'event': self.event.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_payment_filtering(self):
        """Test payment filtering by status and event"""
        # Create payments with different statuses
        Payment.objects.create(
            event=self.event,
            amount=Decimal('5000.00'),
            currency='PHP',
            status='COMPLETED',
            description='Completed payment'
        )

        Payment.objects.create(
            event=self.event,
            amount=Decimal('3000.00'),
            currency='PHP',
            status='PENDING',
            description='Pending payment'
        )

        self.client.force_authenticate(user=self.client_user)

        # Test status filtering
        url = reverse('client-payment-list')
        response = self.client.get(url, {'status': 'COMPLETED'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

        # Test event filtering
        response = self.client.get(url, {'event': self.event.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_payment_receipt_download(self):
        """Test payment receipt download"""
        payment = Payment.objects.create(
            event=self.event,
            amount=Decimal('5000.00'),
            currency='PHP',
            status='COMPLETED',
            description='Test payment'
        )

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-download-receipt', kwargs={'pk': payment.id})

        with patch('core.domains.payments.pdf_service.PaymentReceiptPDFService.generate_receipt_pdf') as mock_pdf:
            mock_buffer = MagicMock()
            mock_buffer.getvalue.return_value = b'fake_pdf_content'
            mock_pdf.return_value = mock_buffer

            response = self.client.get(url)

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response['Content-Type'], 'application/pdf')
            self.assertIn('attachment', response['Content-Disposition'])

    def test_payment_receipt_download_not_completed(self):
        """Test payment receipt download fails for non-completed payment"""
        payment = Payment.objects.create(
            event=self.event,
            amount=Decimal('5000.00'),
            currency='PHP',
            status='PENDING',
            description='Test payment'
        )

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-download-receipt', kwargs={'pk': payment.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('only available for completed payments', response.data['detail'])