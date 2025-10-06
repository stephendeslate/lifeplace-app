# backend/core/domains/payments/tests/__init__.py

"""
Payment domain test suite

This test suite provides comprehensive coverage for the payment system including:

1. Unit Tests (test_models.py, test_services.py)
   - Payment model functionality and validation
   - Payment service business logic
   - Invoice and payment plan operations
   - Currency formatting and calculations

2. Integration Tests (test_integration.py)
   - Complete booking flow to payment completion
   - Event → Quote → Invoice → Payment workflows
   - Cross-domain interactions and data flow

3. Stripe Integration Tests (test_stripe_integration.py)
   - Real Stripe API testing with test keys
   - Payment processing, refunds, webhooks
   - 3D Secure authentication handling
   - Multi-currency support

4. Payment Scenario Tests (test_payment_scenarios.py)
   - Refund processing (full and partial)
   - Payment failure handling and retries
   - Installment payment plans
   - Concurrent payment processing

5. Webhook Tests (test_webhooks.py)
   - Stripe webhook event processing
   - Signature verification and security
   - Event handling for various payment states
   - Duplicate event protection

6. Deposit Tests (test_deposits.py)
   - Deposit calculation (percentage and fixed)
   - Booking flow with deposits
   - Payment plan creation with deposits
   - Deposit refund policies

7. Security & Performance Tests (test_security_performance.py)
   - PCI compliance validation
   - Payment data security and encryption
   - Performance under load
   - Concurrent processing optimization

To run all payment tests:
    python manage.py test core.domains.payments.tests

To run specific test modules:
    python manage.py test core.domains.payments.tests.test_models
    python manage.py test core.domains.payments.tests.test_stripe_integration

For production readiness verification:
    python manage.py test core.domains.payments.tests.test_integration
    python manage.py test core.domains.payments.tests.test_security_performance
"""