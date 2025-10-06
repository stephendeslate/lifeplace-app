# backend/core/domains/payments/tests/test_payment_plan_integration.py

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
    PaymentPlan,
    PaymentInstallment
)

User = get_user_model()


class PaymentPlanIntegrationTestCase(TestCase):
    """Test payment plan integration functionality"""

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

        # Create payment plan
        self.payment_plan = PaymentPlan.objects.create(
            event=self.event,
            quote=self.quote,
            total_amount=Decimal('11200.00'),
            currency='PHP',
            installment_count=3,
            installment_frequency='MONTHLY',
            start_date='2025-11-01'
        )

        # Create installments
        self.installment1 = PaymentInstallment.objects.create(
            payment_plan=self.payment_plan,
            installment_number=1,
            amount=Decimal('3733.33'),
            due_date='2025-11-01',
            status='PENDING',
            description='First installment'
        )

        self.installment2 = PaymentInstallment.objects.create(
            payment_plan=self.payment_plan,
            installment_number=2,
            amount=Decimal('3733.33'),
            due_date='2025-12-01',
            status='PENDING',
            description='Second installment'
        )

        self.installment3 = PaymentInstallment.objects.create(
            payment_plan=self.payment_plan,
            installment_number=3,
            amount=Decimal('3733.34'),
            due_date='2026-01-01',
            status='PENDING',
            description='Third installment'
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

    def test_list_client_payment_plans(self):
        """Test listing client payment plans"""
        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.payment_plan.id)

    def test_client_cannot_see_other_client_payment_plans(self):
        """Test that clients can only see their own payment plans"""
        # Create another client and payment plan
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

        PaymentPlan.objects.create(
            event=other_event,
            total_amount=Decimal('5000.00'),
            currency='PHP',
            installment_count=2,
            installment_frequency='MONTHLY'
        )

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)  # Only own payment plan

    def test_list_client_installments(self):
        """Test listing client installments"""
        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-installment-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)  # Three installments

    @patch('core.domains.payments.services.PaymentService.create_payment')
    def test_pay_installment_via_payment_plan(self, mock_create_payment):
        """Test paying an installment via payment plan endpoint"""
        mock_payment = Payment.objects.create(
            event=self.event,
            amount=self.installment1.amount,
            currency='PHP',
            status='COMPLETED',
            description='Installment payment',
            installment=self.installment1
        )
        mock_create_payment.return_value = mock_payment

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-pay-installment', kwargs={'pk': self.payment_plan.id})
        data = {
            'installment_id': self.installment1.id,
            'gateway_code': 'stripe',
            'payment_method_id': self.payment_method.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['installment'], self.installment1.id)

    def test_pay_installment_invalid_installment_id(self):
        """Test paying installment with invalid installment ID"""
        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-pay-installment', kwargs={'pk': self.payment_plan.id})
        data = {
            'installment_id': 99999,  # Non-existent ID
            'gateway_code': 'stripe',
            'payment_method_id': self.payment_method.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Installment not found', response.data['detail'])

    def test_pay_installment_missing_installment_id(self):
        """Test paying installment without installment ID"""
        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-pay-installment', kwargs={'pk': self.payment_plan.id})
        data = {
            'gateway_code': 'stripe',
            'payment_method_id': self.payment_method.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('installment_id is required', response.data['detail'])

    def test_pay_installment_already_paid(self):
        """Test paying an already paid installment"""
        # Mark installment as paid
        self.installment1.status = 'PAID'
        self.installment1.save()

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-pay-installment', kwargs={'pk': self.payment_plan.id})
        data = {
            'installment_id': self.installment1.id,
            'gateway_code': 'stripe',
            'payment_method_id': self.payment_method.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already paid', response.data['detail'])

    @patch('core.domains.payments.services.PaymentService.create_payment')
    def test_pay_installment_via_installment_endpoint(self, mock_create_payment):
        """Test paying an installment via installment endpoint"""
        mock_payment = Payment.objects.create(
            event=self.event,
            amount=self.installment1.amount,
            currency='PHP',
            status='COMPLETED',
            description='Installment payment',
            installment=self.installment1
        )
        mock_create_payment.return_value = mock_payment

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-installment-create-payment', kwargs={'pk': self.installment1.id})
        data = {
            'gateway_code': 'stripe',
            'payment_method_id': self.payment_method.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['installment'], self.installment1.id)

    def test_installment_create_payment_already_paid(self):
        """Test creating payment for already paid installment"""
        # Mark installment as paid
        self.installment1.status = 'PAID'
        self.installment1.save()

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-installment-create-payment', kwargs={'pk': self.installment1.id})
        data = {
            'gateway_code': 'stripe',
            'payment_method_id': self.payment_method.id
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already paid', response.data['detail'])

    def test_payment_plan_installment_relationship(self):
        """Test that installments are properly related to payment plan"""
        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-detail', kwargs={'pk': self.payment_plan.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['installments']), 3)

        # Check installment amounts add up to total
        total_installments = sum(
            Decimal(str(installment['amount']))
            for installment in response.data['installments']
        )
        self.assertEqual(total_installments, self.payment_plan.total_amount)

    def test_installment_due_date_ordering(self):
        """Test that installments are ordered by due date"""
        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-installment-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that installments are ordered by due date
        installment_dates = [
            installment['due_date'] for installment in response.data['results']
        ]
        self.assertEqual(installment_dates, sorted(installment_dates))

    def test_payment_plan_progress_calculation(self):
        """Test payment plan progress calculation"""
        # Pay first installment
        Payment.objects.create(
            event=self.event,
            amount=self.installment1.amount,
            currency='PHP',
            status='COMPLETED',
            description='First installment payment',
            installment=self.installment1
        )

        # Update installment status
        self.installment1.status = 'PAID'
        self.installment1.save()

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-detail', kwargs={'pk': self.payment_plan.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that progress reflects paid installment
        paid_installments = [
            installment for installment in response.data['installments']
            if installment['status'] == 'PAID'
        ]
        self.assertEqual(len(paid_installments), 1)

    def test_payment_plan_completion_status(self):
        """Test payment plan completion when all installments are paid"""
        # Pay all installments
        for installment in [self.installment1, self.installment2, self.installment3]:
            Payment.objects.create(
                event=self.event,
                amount=installment.amount,
                currency='PHP',
                status='COMPLETED',
                description=f'Installment payment {installment.installment_number}',
                installment=installment
            )
            installment.status = 'PAID'
            installment.save()

        # Update payment plan status
        self.payment_plan.status = 'COMPLETED'
        self.payment_plan.save()

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-payment-plan-detail', kwargs={'pk': self.payment_plan.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'COMPLETED')

        # Check that all installments are paid
        paid_installments = [
            installment for installment in response.data['installments']
            if installment['status'] == 'PAID'
        ]
        self.assertEqual(len(paid_installments), 3)

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access payment plan endpoints"""
        urls = [
            reverse('client-payment-plan-list'),
            reverse('client-installment-list'),
            reverse('client-payment-plan-detail', kwargs={'pk': self.payment_plan.id}),
            reverse('client-installment-detail', kwargs={'pk': self.installment1.id})
        ]

        for url in urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_payment_plan_filtering_by_event(self):
        """Test payment plan filtering by event"""
        # Create another event and payment plan
        other_event = Event.objects.create(
            client=self.client_user,
            name='Other Wedding',
            event_type=self.event_type,
            start_date=timezone.make_aware(datetime(2025, 12, 15, 10, 0, 0)),
            end_date=timezone.make_aware(datetime(2025, 12, 15, 18, 0, 0)),
            status='CONFIRMED'
        )

        PaymentPlan.objects.create(
            event=other_event,
            total_amount=Decimal('8000.00'),
            currency='PHP',
            installment_count=2,
            installment_frequency='MONTHLY'
        )

        self.client.force_authenticate(user=self.client_user)

        # Test that both payment plans are returned without filter
        url = reverse('client-payment-plan-list')
        response = self.client.get(url)
        self.assertEqual(response.data['count'], 2)

        # Test filtering by specific event
        # Note: This would require implementing event filtering in the view
        # Currently not implemented in the view, but would be a good enhancement

    def test_payment_method_management(self):
        """Test payment method management for clients"""
        self.client.force_authenticate(user=self.client_user)

        # Test listing payment methods
        url = reverse('client-payment-method-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.payment_method.id)

    def test_client_refund_access(self):
        """Test client access to their refunds"""
        # Create a payment and refund
        payment = Payment.objects.create(
            event=self.event,
            amount=Decimal('5000.00'),
            currency='PHP',
            status='COMPLETED',
            description='Test payment'
        )

        from core.domains.payments.models import Refund
        refund = Refund.objects.create(
            payment=payment,
            amount=Decimal('1000.00'),
            currency='PHP',
            status='COMPLETED',
            reason='Customer request',
            refunded_by=self.client_user
        )

        self.client.force_authenticate(user=self.client_user)

        url = reverse('client-refund-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], refund.id)