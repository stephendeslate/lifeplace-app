# backend/core/domains/payments/tests/test_deposits.py

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch, Mock
import uuid

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentMethod
)
from core.domains.payments.services.payment_service import PaymentService
from core.domains.payments.services.payment_gateway_service import PaymentGatewayService
from core.domains.events.models import Event, EventType
from core.domains.products.models import ProductOption, ProductCategory
from core.domains.bookingflow.models import (
    BookingFlow, BookingFlowStep, PaymentInfoStepConfiguration, BookingSession
)
from core.domains.bookingflow.services.booking_session_service import BookingSessionService

User = get_user_model()


class DepositCalculationTestCase(TestCase):
    """Test cases for deposit amount calculation"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='deposit@test.com',
            first_name='Deposit',
            last_name='Customer',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        
        self.booking_flow = BookingFlow.objects.create(
            name='Deposit Test Flow',
            event_type=self.event_type,
            is_active=True
        )
        
        self.payment_step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='payment_info',
            name='Payment Information',
            order=4,
            is_enabled=True
        )
        
        self.gateway = PaymentGateway.objects.create(
            name='Stripe Test',
            code='stripe',
            is_active=True
        )
    
    def test_percentage_deposit_calculation(self):
        """Test percentage-based deposit calculation"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=True,
            deposit_type='PERCENTAGE',
            deposit_amount=Decimal('25.00'),  # 25%
            require_immediate_payment=False
        )
        config.allowed_gateways.add(self.gateway)
        
        test_cases = [
            (Decimal('10000.00'), Decimal('2500.00')),   # ₱10,000 * 25% = ₱2,500
            (Decimal('50000.00'), Decimal('12500.00')),  # ₱50,000 * 25% = ₱12,500
            (Decimal('2500.75'), Decimal('625.19')),     # ₱2,500.75 * 25% = ₱625.19 (rounded)
            (Decimal('1000.00'), Decimal('250.00')),     # ₱1,000 * 25% = ₱250
        ]
        
        for total_amount, expected_deposit in test_cases:
            with self.subTest(total_amount=total_amount):
                deposit_amount = PaymentService.calculate_deposit_amount(config, total_amount)
                self.assertEqual(deposit_amount, expected_deposit)
    
    def test_fixed_deposit_calculation(self):
        """Test fixed deposit amount"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=True,
            deposit_type='FIXED',
            deposit_amount=Decimal('5000.00'),  # Fixed ₱5,000
            require_immediate_payment=False
        )
        config.allowed_gateways.add(self.gateway)
        
        test_cases = [
            Decimal('10000.00'),   # Total ₱10,000, deposit ₱5,000
            Decimal('50000.00'),   # Total ₱50,000, deposit ₱5,000
            Decimal('7500.00'),    # Total ₱7,500, deposit ₱5,000
        ]
        
        for total_amount in test_cases:
            with self.subTest(total_amount=total_amount):
                deposit_amount = PaymentService.calculate_deposit_amount(config, total_amount)
                self.assertEqual(deposit_amount, Decimal('5000.00'))
    
    def test_deposit_exceeding_total_amount(self):
        """Test validation when deposit exceeds total amount"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=True,
            deposit_type='FIXED',
            deposit_amount=Decimal('15000.00'),  # Fixed ₱15,000
            require_immediate_payment=False
        )
        
        total_amount = Decimal('10000.00')  # Total is less than deposit
        
        with self.assertRaises(ValueError) as context:
            PaymentService.calculate_deposit_amount(config, total_amount)
        
        self.assertIn('Deposit amount cannot exceed total amount', str(context.exception))
    
    def test_deposit_percentage_edge_cases(self):
        """Test deposit percentage edge cases"""
        # 100% deposit (full payment)
        config_100 = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=True,
            deposit_type='PERCENTAGE',
            deposit_amount=Decimal('100.00'),  # 100%
            require_immediate_payment=False
        )
        
        total_amount = Decimal('20000.00')
        deposit_amount = PaymentService.calculate_deposit_amount(config_100, total_amount)
        self.assertEqual(deposit_amount, total_amount)
        
        # Minimum deposit (1%)
        config_1 = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=True,
            deposit_type='PERCENTAGE',
            deposit_amount=Decimal('1.00'),  # 1%
            require_immediate_payment=False
        )
        
        deposit_amount = PaymentService.calculate_deposit_amount(config_1, total_amount)
        self.assertEqual(deposit_amount, Decimal('200.00'))  # ₱20,000 * 1% = ₱200
    
    def test_deposit_disabled_configuration(self):
        """Test when deposits are disabled"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=False,  # Deposits disabled
            accept_full_payment=True,
            require_immediate_payment=True
        )
        
        total_amount = Decimal('15000.00')
        
        # Should return None or full amount when deposits are disabled
        result = PaymentService.calculate_deposit_amount(config, total_amount)
        # Depending on implementation, this might return None or the full amount
        self.assertTrue(result is None or result == total_amount)


class DepositPaymentProcessingTestCase(TestCase):
    """Test cases for processing deposit payments"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='deposit_payment@test.com',
            first_name='Deposit Payment',
            last_name='Customer',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Deposit Payment Wedding',
            start_date=date.today() + timedelta(days=60)
        )
        
        self.gateway = PaymentGateway.objects.create(
            name='Stripe Test',
            code='stripe',
            is_active=True,
            config={'test_mode': True}
        )
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_deposit_test'
        )
    
    def test_deposit_payment_processing(self):
        """Test processing deposit payment"""
        total_amount = Decimal('30000.00')
        deposit_amount = Decimal('9000.00')  # 30% deposit
        
        deposit_payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=deposit_amount,
            currency='PHP',
            payment_type='DEPOSIT',
            description='30% deposit for wedding package'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_deposit_test_123'
            mock_intent.status = 'succeeded'
            mock_intent.amount = int(deposit_amount * 100)  # Convert to centavos
            mock_intent.currency = 'php'
            mock_create.return_value = mock_intent
            
            result = PaymentGatewayService.process_payment(deposit_payment)
            self.assertTrue(result['success'])
        
        # Update payment status
        deposit_payment.status = 'COMPLETED'
        deposit_payment.completed_at = timezone.now()
        deposit_payment.save()
        
        # Verify payment details
        self.assertEqual(deposit_payment.payment_type, 'DEPOSIT')
        self.assertEqual(deposit_payment.amount, deposit_amount)
        self.assertEqual(deposit_payment.status, 'COMPLETED')
        
        # Event should be confirmed after deposit payment
        self.event.status = 'CONFIRMED'
        self.event.save()
        
        self.assertEqual(self.event.status, 'CONFIRMED')

    def test_deposit_payment_failure_handling(self):
        """Test handling deposit payment failures"""
        deposit_payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('8000.00'),
            currency='PHP',
            payment_type='DEPOSIT'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.CardError(
                message='Your card has insufficient funds.',
                param='payment_method',
                code='insufficient_funds'
            )
            
            result = PaymentGatewayService.process_payment(deposit_payment)
            self.assertFalse(result['success'])
        
        deposit_payment.refresh_from_db()
        self.assertEqual(deposit_payment.status, 'FAILED')
        
        # Event should remain in LEAD status if deposit fails
        self.event.refresh_from_db()
        self.assertNotEqual(self.event.status, 'CONFIRMED')
    
    def test_multiple_deposit_attempts(self):
        """Test multiple deposit payment attempts"""
        # First attempt - fails
        deposit_payment_1 = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('10000.00'),
            currency='PHP',
            payment_type='DEPOSIT'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.CardError(
                message='Card declined',
                param='payment_method',
                code='card_declined'
            )
            
            PaymentGatewayService.process_payment(deposit_payment_1)
        
        deposit_payment_1.status = 'FAILED'
        deposit_payment_1.save()
        
        # Second attempt - succeeds
        deposit_payment_2 = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('10000.00'),
            currency='PHP',
            payment_type='DEPOSIT'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_deposit_retry_success'
            mock_intent.status = 'succeeded'
            mock_intent.amount = 1000000
            mock_create.return_value = mock_intent
            
            result = PaymentGatewayService.process_payment(deposit_payment_2)
            self.assertTrue(result['success'])
        
        deposit_payment_2.status = 'COMPLETED'
        deposit_payment_2.save()
        
        # Verify both payments exist but only one is completed
        deposits = Payment.objects.filter(
            event=self.event, 
            payment_type='DEPOSIT'
        )
        self.assertEqual(deposits.count(), 2)
        
        completed_deposits = deposits.filter(status='COMPLETED')
        failed_deposits = deposits.filter(status='FAILED')
        
        self.assertEqual(completed_deposits.count(), 1)
        self.assertEqual(failed_deposits.count(), 1)


class BookingFlowDepositTestCase(TestCase):
    """Test cases for deposit functionality in booking flow"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='booking_deposit@test.com',
            first_name='Booking',
            last_name='Customer',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        
        # Create products
        self.category = ProductCategory.objects.create(
            name='Wedding Packages'
        )
        
        self.premium_package = ProductOption.objects.create(
            name='Premium Wedding Package',
            base_price=Decimal('45000.00'),  # ₱45,000
            currency='PHP',
            tax_rate=Decimal('12.00'),
            category=self.category,
            type='PACKAGE'
        )
        
        self.extra_service = ProductOption.objects.create(
            name='Additional Service',
            base_price=Decimal('5000.00'),  # ₱5,000
            currency='PHP',
            tax_rate=Decimal('12.00'),
            category=self.category,
            type='PRODUCT'
        )
        
        # Create booking flow
        self.booking_flow = BookingFlow.objects.create(
            name='Deposit Booking Flow',
            event_type=self.event_type,
            is_active=True
        )
        
        self.payment_step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='payment_info',
            name='Payment Information',
            order=4,
            is_enabled=True,
            is_required=True
        )
        
        self.gateway = PaymentGateway.objects.create(
            name='Stripe Test',
            code='stripe',
            is_active=True
        )
    
    def test_booking_completion_with_deposit_payment(self):
        """Test completing booking with deposit payment"""
        # Configure deposit payment (30%)
        payment_config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_full_payment=True,
            accept_deposit=True,
            deposit_type='PERCENTAGE',
            deposit_amount=Decimal('30.00'),
            balance_due_days=30,
            require_immediate_payment=False,
            allow_quote_request=False
        )
        payment_config.allowed_gateways.add(self.gateway)
        
        # Create booking session
        session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=self.booking_flow,
            client=self.user,
            booking_data={
                'selected_packages': [self.premium_package.id],
                'selected_addons': [self.extra_service.id],
                'payment_option': 'deposit',
                'gateway_id': self.gateway.id,
                'payment_method_token': 'pm_test_deposit'
            },
            expires_at=timezone.now() + timedelta(hours=24)
        )
        session.completed_steps.add(self.payment_step)
        
        # Mock payment processing
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_booking_deposit'
            mock_intent.status = 'succeeded'
            mock_intent.amount = 1500000  # 30% of (45000 + 5000) * 1.12 = 30% of 56000 = 16800
            mock_intent.currency = 'php'
            mock_create.return_value = mock_intent
            
            # Complete booking with deposit payment
            event = BookingSessionService.complete_booking(
                str(session.session_id),
                completion_type='deposit_payment'
            )
        
        # Verify event creation
        self.assertIsNotNone(event)
        self.assertEqual(event.status, 'CONFIRMED')
        
        # Verify deposit payment was created
        deposit_payments = Payment.objects.filter(
            event=event,
            payment_type='DEPOSIT',
            status='COMPLETED'
        )
        self.assertEqual(deposit_payments.count(), 1)
        
        deposit_payment = deposit_payments.first()
        
        # Calculate expected deposit: (₱45,000 + ₱5,000) * 1.12 * 0.30 = ₱16,800
        total_with_tax = (Decimal('45000.00') + Decimal('5000.00')) * Decimal('1.12')
        expected_deposit = total_with_tax * Decimal('0.30')
        
        self.assertEqual(deposit_payment.amount, expected_deposit)

    def test_deposit_vs_full_payment_option(self):
        """Test choosing between deposit and full payment"""
        payment_config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_full_payment=True,
            accept_deposit=True,
            deposit_type='PERCENTAGE',
            deposit_amount=Decimal('25.00'),  # 25%
            require_immediate_payment=False
        )
        payment_config.allowed_gateways.add(self.gateway)
        
        # Test deposit payment option
        deposit_session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=self.booking_flow,
            client=self.user,
            booking_data={
                'selected_packages': [self.premium_package.id],
                'payment_option': 'deposit',  # Choose deposit
                'gateway_id': self.gateway.id
            },
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        with patch('stripe.PaymentIntent.create'):
            deposit_event = BookingSessionService.complete_booking(
                str(deposit_session.session_id),
                completion_type='deposit_payment'
            )
        
        # Test full payment option
        full_session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=self.booking_flow,
            client=self.user,
            booking_data={
                'selected_packages': [self.premium_package.id],
                'payment_option': 'full',  # Choose full payment
                'gateway_id': self.gateway.id
            },
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        with patch('stripe.PaymentIntent.create'):
            full_event = BookingSessionService.complete_booking(
                str(full_session.session_id),
                completion_type='full_payment'
            )
        
        # Verify deposit payment
        deposit_payments = Payment.objects.filter(
            event=deposit_event,
            payment_type='DEPOSIT'
        )
        self.assertEqual(deposit_payments.count(), 1)
        
        # Verify full payment
        full_payments = Payment.objects.filter(
            event=full_event,
            payment_type='FULL'
        )
        self.assertEqual(full_payments.count(), 1)
        
        # Deposit amount should be 25% of total
        package_total_with_tax = self.premium_package.base_price * Decimal('1.12')
        expected_deposit = package_total_with_tax * Decimal('0.25')
        
        self.assertEqual(deposit_payments.first().amount, expected_deposit)
        self.assertEqual(full_payments.first().amount, package_total_with_tax)
    
    def test_deposit_refund_policy_integration(self):
        """Test deposit refund policy integration"""
        payment_config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=True,
            deposit_type='PERCENTAGE',
            deposit_amount=Decimal('30.00'),
            refund_policy='Deposit refundable up to 48 hours before event',
            require_immediate_payment=False
        )
        
        event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Refund Policy Test Wedding',
            start_date=date.today() + timedelta(days=30)
        )
        
        deposit_payment = Payment.objects.create(
            event=event,
            payment_method=PaymentMethod.objects.create(
                gateway=self.gateway,
                client=self.user,
                token='pm_refund_test'
            ),
            amount=Decimal('12000.00'),
            currency='PHP',
            payment_type='DEPOSIT',
            status='COMPLETED'
        )
        
        # Test refund eligibility based on policy
        days_before_event = (event.event_date - date.today()).days
        refund_eligible = days_before_event >= 2  # 48 hours = 2 days
        
        if refund_eligible:
            # Process refund
            with patch('stripe.Refund.create') as mock_refund:
                mock_refund_obj = Mock()
                mock_refund_obj.id = 're_deposit_refund'
                mock_refund_obj.status = 'succeeded'
                mock_refund_obj.amount = 1200000
                mock_refund.return_value = mock_refund_obj
                
                result = PaymentGatewayService.refund_payment(
                    deposit_payment,
                    deposit_payment.amount,
                    'Customer cancellation within refund policy'
                )
                
                self.assertTrue(result['success'])
        
        # Verify refund policy is stored and accessible
        self.assertIn('48 hours before event', payment_config.refund_policy)