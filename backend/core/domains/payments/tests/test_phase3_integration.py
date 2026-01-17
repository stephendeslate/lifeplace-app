# backend/core/domains/payments/tests/test_phase3_integration.py

import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings
from django.utils import timezone
from django.core.cache import cache

from core.domains.events.models import Event
from core.domains.users.models import User
from ..models import (
    Payment, PaymentGateway, PaymentEventStore, PaymentWebhookLog,
    PaymentStateHistory
)
from ..services.payment_orchestrator import PaymentOrchestrator, PaymentRequest
from ..services.payment_event_store_service import PaymentEventStoreService
from ..services.payment_event_processor import PaymentEventProcessor
from ..services.payment_event_sourcing_service import PaymentEventSourcingService
from ..services.payment_gateway_factory import PaymentGatewayFactory
from ..services.unified_webhook_processor import UnifiedWebhookProcessor
from ..services.gateway_monitoring_service import GatewayMonitoringService


class Phase3IntegrationTestCase(TestCase):
    """
    Comprehensive integration tests for Phase 3: Integration & Enhancement

    Tests the complete payment workflow from initialization through completion
    with all Phase 3 enhancements including:
    - Domain Events Architecture
    - Gateway Abstraction Layer
    - Frontend Payment Flow Unification
    """

    def setUp(self):
        """Set up test data"""
        # Clear cache
        cache.clear()

        # Create test user and client
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )

        self.client_user = User.objects.create_user(
            email='client@example.com',
            password='clientpass123',
            first_name='Client',
            last_name='User'
        )

        # Create test event
        self.event = Event.objects.create(
            title='Test Wedding',
            client=self.client_user,
            event_date=timezone.now().date() + timedelta(days=30),
            venue='Test Venue',
            guest_count=100
        )

        # Create test gateway
        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Test Stripe',
                'is_active': True,
            }
        )
        # Always update config to ensure test settings are applied
        self.gateway.config = {
            'secret_key': 'sk_test_123',
            'publishable_key': 'pk_test_123',
            'webhook_secret': 'whsec_test_123',
            'test_mode': True
        }
        self.gateway.is_active = True
        self.gateway.save()

    def tearDown(self):
        """Clean up after tests"""
        # Clear gateway cache
        PaymentGatewayFactory.clear_cache()
        cache.clear()


class PaymentEventStoreIntegrationTests(Phase3IntegrationTestCase):
    """Test payment event store integration"""

    def test_complete_event_lifecycle(self):
        """Test complete payment event lifecycle with persistent storage"""
        # Create payment request
        request = PaymentRequest(
            event_id=self.event.id,
            amount=Decimal('1000.00'),
            currency='PHP',
            description='Test payment',
            payment_type='STANDARD',
            created_by='test_user'
        )

        # Create payment through orchestrator
        response = PaymentOrchestrator.create_payment(request, self.user)
        self.assertTrue(response.success)

        payment = Payment.objects.get(id=response.payment_id)

        # Verify payment was created in CREATED state
        self.assertEqual(payment.status, 'CREATED')

        # Transition to COMPLETED
        payment.transition_to_state(
            'COMPLETED',
            'Test completion',
            'test_user'
        )

        # Verify events were stored
        events = PaymentEventStoreService.get_payment_events(payment.id)
        self.assertGreater(events.count(), 0)

        # Verify event data
        stored_event = events.first()
        self.assertEqual(stored_event.payment_id, payment.id)
        self.assertIn('PaymentCompletedEvent', stored_event.event_type)
        self.assertEqual(stored_event.to_state, 'COMPLETED')

        # Test event replay
        replay_result = PaymentEventSourcingService.replay_payment_lifecycle(payment.id)
        self.assertTrue(replay_result['success'])
        self.assertGreater(replay_result['events_processed'], 0)

    def test_event_processing_with_errors(self):
        """Test event processing with error handling and retry"""
        # Create payment and transition
        request = PaymentRequest(
            event_id=self.event.id,
            amount=Decimal('500.00'),
            currency='PHP',
            description='Error test payment'
        )

        response = PaymentOrchestrator.create_payment(request, self.user)
        payment = Payment.objects.get(id=response.payment_id)

        # Get a stored event
        payment.transition_to_state('PENDING', 'Test transition')
        events = PaymentEventStoreService.get_payment_events(payment.id)
        event = events.first()

        # Simulate processing error
        PaymentEventStoreService.add_event_processing_error(
            event.event_id,
            'Test processing error',
            {'error_code': 'test_error'}
        )

        # Verify error was logged
        updated_event = PaymentEventStore.objects.get(event_id=event.event_id)
        self.assertGreater(len(updated_event.processing_errors), 0)
        self.assertEqual(updated_event.retry_count, 1)

        # Test retry logic
        can_retry = updated_event.can_retry(max_retries=3)
        self.assertTrue(can_retry)


class PaymentGatewayFactoryIntegrationTests(Phase3IntegrationTestCase):
    """Test payment gateway factory integration"""

    def test_gateway_creation_and_caching(self):
        """Test gateway instance creation and caching"""
        # Create gateway instance
        gateway = PaymentGatewayFactory.create_gateway('stripe')
        self.assertIsNotNone(gateway)
        self.assertEqual(gateway.gateway_code, 'stripe')

        # Test caching - should return same instance
        gateway2 = PaymentGatewayFactory.create_gateway('stripe')
        self.assertIs(gateway, gateway2)

        # Test force refresh
        gateway3 = PaymentGatewayFactory.create_gateway('stripe', force_refresh=True)
        self.assertIsNot(gateway, gateway3)

    @patch('stripe.Account.retrieve')
    def test_gateway_health_check(self, mock_stripe_account):
        """Test gateway health check"""
        # Mock successful Stripe connection
        mock_stripe_account.return_value = {'id': 'acct_test'}

        gateway = PaymentGatewayFactory.create_gateway('stripe')
        is_healthy = gateway.is_healthy()
        self.assertTrue(is_healthy)

        # Test failed connection
        mock_stripe_account.side_effect = Exception('Connection failed')

        gateway = PaymentGatewayFactory.create_gateway('stripe', force_refresh=True)
        is_healthy = gateway.is_healthy()
        self.assertFalse(is_healthy)

    def test_gateway_selection_logic(self):
        """Test optimal gateway selection"""
        available_gateways = PaymentGatewayFactory.get_available_gateways()
        self.assertIn('stripe', available_gateways)

        # Test primary gateway selection
        with patch.object(PaymentGatewayFactory, 'get_healthy_gateways', return_value=['stripe']):
            primary = PaymentGatewayFactory.get_primary_gateway()
            self.assertEqual(primary, 'stripe')


class WebhookProcessingIntegrationTests(Phase3IntegrationTestCase):
    """Test webhook processing integration"""

    def test_stripe_webhook_end_to_end(self):
        """Test complete Stripe webhook processing"""
        # Create payment and transaction
        payment = Payment.objects.create(
            event=self.event,
            amount=Decimal('1500.00'),
            currency='PHP',
            status='PROCESSING',
            due_date=timezone.now().date() + timedelta(days=1),
            payment_number='PAY-2025-000001'
        )

        from ..models import PaymentTransaction
        transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway=self.gateway,
            transaction_id='pi_test_123456',
            amount=payment.amount,
            currency=payment.currency,
            status='PROCESSING'
        )

        # Mock webhook payload
        webhook_payload = {
            'id': 'evt_test_webhook',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test_123456',
                    'status': 'succeeded',
                    'amount': 150000,  # in cents
                    'currency': 'php'
                }
            }
        }

        # Create mock request
        from django.test import RequestFactory
        from django.http import HttpRequest

        factory = RequestFactory()
        request = factory.post(
            '/webhooks/stripe/',
            data=json.dumps(webhook_payload),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        request._body = json.dumps(webhook_payload).encode()

        # Mock signature verification
        with patch('stripe.Webhook.construct_event', return_value=webhook_payload):
            result = UnifiedWebhookProcessor.process_webhook(request, 'stripe')

        self.assertTrue(result.success)
        self.assertEqual(result.action_taken, 'payment_completed')

        # Verify transaction was updated
        transaction.refresh_from_db()
        self.assertEqual(transaction.status, 'COMPLETED')

        # Verify webhook was logged
        webhook_logs = PaymentWebhookLog.objects.filter(event_id='evt_test_webhook')
        self.assertEqual(webhook_logs.count(), 1)

        webhook_log = webhook_logs.first()
        self.assertTrue(webhook_log.processed_successfully)

    def test_webhook_duplicate_handling(self):
        """Test webhook duplicate processing prevention"""
        # Create initial webhook log
        PaymentWebhookLog.objects.create(
            gateway_code='stripe',
            event_type='payment_intent.succeeded',
            event_id='evt_duplicate_test',
            transaction_id='pi_test_duplicate',
            raw_data={'test': 'data'},
            processed_successfully=True
        )

        # Mock duplicate webhook request
        webhook_payload = {
            'id': 'evt_duplicate_test',
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_test_duplicate'}}
        }

        from django.test import RequestFactory
        factory = RequestFactory()
        request = factory.post(
            '/webhooks/stripe/',
            data=json.dumps(webhook_payload),
            content_type='application/json'
        )
        request._body = json.dumps(webhook_payload).encode()

        with patch('stripe.Webhook.construct_event', return_value=webhook_payload):
            result = UnifiedWebhookProcessor.process_webhook(request, 'stripe')

        self.assertTrue(result.success)
        self.assertEqual(result.action_taken, 'duplicate_ignored')


class GatewayMonitoringIntegrationTests(Phase3IntegrationTestCase):
    """Test gateway monitoring integration"""

    @patch('stripe.Account.retrieve')
    def test_gateway_monitoring_workflow(self, mock_stripe_account):
        """Test complete gateway monitoring workflow"""
        # Mock healthy gateway
        mock_stripe_account.return_value = {'id': 'acct_test'}

        # Check initial health
        health_check = GatewayMonitoringService.check_gateway_health('stripe', force_check=True)
        self.assertTrue(health_check.is_healthy)
        self.assertEqual(health_check.consecutive_failures, 0)

        # Simulate gateway failure
        mock_stripe_account.side_effect = Exception('Gateway unavailable')

        # Force health check
        health_check = GatewayMonitoringService.check_gateway_health('stripe', force_check=True)
        self.assertFalse(health_check.is_healthy)

        # Test failure handling
        result = GatewayMonitoringService.handle_gateway_failure(
            'stripe',
            'Test failure for monitoring'
        )

        # Since we only have one gateway, failover should fail
        self.assertFalse(result)  # No alternative gateway available

        # Test recovery
        mock_stripe_account.side_effect = None
        mock_stripe_account.return_value = {'id': 'acct_test'}

        recovery_result = GatewayMonitoringService.recover_gateway('stripe')
        self.assertTrue(recovery_result)

    def test_gateway_metrics_collection(self):
        """Test gateway metrics collection"""
        # Create some test transactions
        from ..models import PaymentTransaction

        payment1 = Payment.objects.create(
            event=self.event,
            amount=Decimal('1000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=timezone.now().date(),
            payment_number='PAY-2025-000002'
        )

        PaymentTransaction.objects.create(
            payment=payment1,
            gateway=self.gateway,
            transaction_id='pi_success_1',
            amount=payment1.amount,
            currency=payment1.currency,
            status='COMPLETED'
        )

        payment2 = Payment.objects.create(
            event=self.event,
            amount=Decimal('500.00'),
            currency='PHP',
            status='FAILED',
            due_date=timezone.now().date(),
            payment_number='PAY-2025-000003'
        )

        PaymentTransaction.objects.create(
            payment=payment2,
            gateway=self.gateway,
            transaction_id='pi_failed_1',
            amount=payment2.amount,
            currency=payment2.currency,
            status='FAILED'
        )

        # Get metrics
        metrics = GatewayMonitoringService.get_gateway_metrics('stripe', hours=24)

        self.assertIn('transaction_metrics', metrics)
        self.assertEqual(metrics['transaction_metrics']['total_transactions'], 2)
        self.assertEqual(metrics['transaction_metrics']['successful_transactions'], 1)
        self.assertEqual(metrics['transaction_metrics']['success_rate_percent'], 50.0)


class PaymentOrchestrationIntegrationTests(Phase3IntegrationTestCase):
    """Test payment orchestration with all Phase 3 enhancements"""

    def test_complete_payment_workflow(self):
        """Test complete payment workflow with all enhancements"""
        # Step 1: Create payment through orchestrator
        request = PaymentRequest(
            event_id=self.event.id,
            amount=Decimal('2000.00'),
            currency='PHP',
            description='Complete workflow test',
            payment_type='STANDARD',
            auto_process=False,  # Don't auto-process for this test
            created_by='integration_test'
        )

        response = PaymentOrchestrator.create_payment(request, self.user)
        self.assertTrue(response.success)

        payment = Payment.objects.get(id=response.payment_id)
        self.assertEqual(payment.status, 'CREATED')

        # Step 2: Verify events were stored
        events = PaymentEventStoreService.get_payment_events(payment.id)
        self.assertGreater(events.count(), 0)

        # Step 3: Process payment through state machine
        payment.transition_to_state('PENDING', 'Ready for processing', 'test_user')
        payment.transition_to_state('PROCESSING', 'Gateway processing', 'stripe_gateway')
        payment.transition_to_state('COMPLETED', 'Payment completed', 'stripe_webhook')

        # Step 4: Verify state history
        state_history = payment.get_state_history()
        self.assertGreater(len(state_history), 0)

        # Verify all transitions are logged
        expected_states = ['CREATED', 'PENDING', 'PROCESSING', 'COMPLETED']
        actual_states = [h['to_state'] for h in state_history]
        for state in expected_states:
            self.assertIn(state, actual_states)

        # Step 5: Test event sourcing replay
        replay_result = PaymentEventSourcingService.replay_payment_lifecycle(payment.id)
        self.assertTrue(replay_result['success'])
        self.assertEqual(replay_result['payment_number'], payment.payment_number)

        # Step 6: Test analytics and insights
        analysis_result = PaymentEventSourcingService.analyze_payment_journey(payment.id)
        self.assertTrue(analysis_result['success'])
        self.assertIn('lifecycle_analysis', analysis_result['analysis'])
        self.assertIn('state_transitions', analysis_result['analysis'])

        # Step 7: Verify final payment status
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')
        self.assertTrue(payment.is_terminal_state())

    def test_payment_failure_and_recovery_workflow(self):
        """Test payment failure handling and recovery workflow"""
        # Create payment
        request = PaymentRequest(
            event_id=self.event.id,
            amount=Decimal('800.00'),
            currency='PHP',
            description='Failure recovery test',
            payment_type='STANDARD'
        )

        response = PaymentOrchestrator.create_payment(request, self.user)
        payment = Payment.objects.get(id=response.payment_id)

        # Simulate payment failure
        payment.transition_to_state('PENDING', 'Ready for processing')
        payment.transition_to_state('PROCESSING', 'Gateway processing')
        payment.transition_to_state('FAILED', 'Gateway timeout', 'stripe_error')

        # Verify failure was recorded
        events = PaymentEventStoreService.get_payment_events(payment.id)
        failed_events = [e for e in events if e.to_state == 'FAILED']
        self.assertGreater(len(failed_events), 0)

        # Test retry capability
        self.assertTrue(payment.can_transition_to('PENDING'))

        # Simulate retry and success
        payment.transition_to_state('PENDING', 'Retrying payment')
        payment.transition_to_state('PROCESSING', 'Retry processing')
        payment.transition_to_state('COMPLETED', 'Retry successful')

        # Verify recovery
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')

        # Analyze the journey
        analysis = PaymentEventSourcingService.analyze_payment_journey(payment.id)
        self.assertTrue(analysis['success'])

        # Should show the failure and recovery pattern
        transitions = analysis['analysis']['state_transitions']['transition_counts']
        self.assertIn('FAILED → PENDING', transitions)
        self.assertIn('PENDING → PROCESSING', transitions)

    @override_settings(
        CACHES={
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            }
        }
    )
    def test_performance_under_load(self):
        """Test payment system performance under load"""
        import concurrent.futures
        import time

        def create_test_payment(index):
            """Create a test payment"""
            try:
                request = PaymentRequest(
                    event_id=self.event.id,
                    amount=Decimal(f'{100 + index}.00'),
                    currency='PHP',
                    description=f'Load test payment {index}',
                    payment_type='STANDARD',
                    created_by=f'load_test_{index}'
                )

                response = PaymentOrchestrator.create_payment(request, self.user)
                return response.success, response.payment_id
            except Exception as e:
                return False, str(e)

        # Create multiple payments concurrently
        start_time = time.time()

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_test_payment, i) for i in range(20)]
            results = [future.result() for future in futures]

        end_time = time.time()

        # Verify all payments were created successfully
        successful_payments = [r for r in results if r[0]]
        self.assertEqual(len(successful_payments), 20)

        # Verify reasonable performance (should complete in under 10 seconds)
        total_time = end_time - start_time
        self.assertLess(total_time, 10.0)

        # Verify no duplicate payment numbers
        payment_ids = [r[1] for r in successful_payments]
        payments = Payment.objects.filter(id__in=payment_ids)
        payment_numbers = list(payments.values_list('payment_number', flat=True))
        self.assertEqual(len(payment_numbers), len(set(payment_numbers)))  # No duplicates

        print(f"✅ Created 20 payments in {total_time:.2f} seconds")


class EndToEndIntegrationTests(Phase3IntegrationTestCase):
    """End-to-end integration tests"""

    def test_complete_payment_ecosystem(self):
        """Test the complete payment ecosystem working together"""
        # This test exercises all major components together

        # 1. Check system health
        health_results = GatewayMonitoringService.check_all_gateways_health()
        self.assertIn('stripe', health_results)

        # 2. Create payment with full orchestration
        request = PaymentRequest(
            event_id=self.event.id,
            amount=Decimal('5000.00'),
            currency='PHP',
            description='End-to-end ecosystem test',
            payment_type='STANDARD',
            metadata={'test_type': 'e2e_integration'}
        )

        response = PaymentOrchestrator.create_payment(request, self.user)
        self.assertTrue(response.success)

        payment = Payment.objects.get(id=response.payment_id)

        # 3. Process through complete state machine
        payment.transition_to_state('PENDING', 'E2E test progression')
        payment.transition_to_state('PROCESSING', 'E2E gateway processing')
        payment.transition_to_state('COMPLETED', 'E2E completion')

        # 4. Verify event storage and processing
        events = PaymentEventStoreService.get_payment_events(payment.id)
        self.assertGreater(events.count(), 0)

        # 5. Test event sourcing capabilities
        replay_result = PaymentEventSourcingService.replay_payment_lifecycle(payment.id)
        self.assertTrue(replay_result['success'])

        # 6. Generate comprehensive analysis
        analysis = PaymentEventSourcingService.analyze_payment_journey(payment.id)
        self.assertTrue(analysis['success'])

        # 7. Test monitoring and metrics
        metrics = GatewayMonitoringService.get_gateway_metrics('stripe')
        self.assertIn('transaction_metrics', metrics)

        # 8. Verify system statistics
        event_stats = PaymentEventStoreService.get_event_statistics(days=1)
        self.assertGreater(event_stats['total_events'], 0)

        print("✅ Complete payment ecosystem test passed")
        print(f"   - Payment: {payment.payment_number}")
        print(f"   - Events: {events.count()}")
        print(f"   - Analysis: {analysis['analysis']['lifecycle_analysis']['total_events']}")
        print(f"   - Metrics: {metrics['transaction_metrics']['success_rate_percent']}% success rate")


if __name__ == '__main__':
    import django
    from django.conf import settings
    from django.test.utils import get_runner

    if not settings.configured:
        settings.configure(
            DEBUG=True,
            DATABASES={
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': ':memory:',
                }
            },
            INSTALLED_APPS=[
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'core.domains.payments',
                'core.domains.events',
                'core.domains.users',
            ],
        )

    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["__main__"])

    if failures:
        exit(1)