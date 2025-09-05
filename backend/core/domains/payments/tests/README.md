# Payment System Test Suite

## Overview

This comprehensive test suite ensures the payment system is production-ready for processing real transactions in the Philippine market. The tests cover all aspects of payment processing from event creation to payment completion, including edge cases, security, and performance.

## Test Coverage

### 1. Unit Tests (`test_models.py`, `test_services.py`)

**Models Testing:**
- Payment model creation and validation
- Payment number generation and uniqueness
- PHP currency formatting (₱2,500 without decimals)
- Payment status transitions and validation
- Invoice creation and line item calculations
- Payment plan and installment functionality
- Payment transaction logging and audit trails

**Services Testing:**
- Payment creation and processing workflows
- Gateway service integration (Stripe)
- Currency conversion to centavos/cents
- Refund processing (full and partial)
- Error handling and validation
- Deposit calculation (percentage and fixed)

### 2. Integration Tests (`test_integration.py`)

**Complete Workflows:**
- Booking session → Event → Quote → Invoice → Payment
- PHP pricing with 12% tax calculation
- 30% deposit payments with balance due scheduling
- Event status transitions (LEAD → CONFIRMED)
- Payment plan creation with installments
- Multi-step payment flows (deposit + balance)

**Business Scenarios:**
- Wedding package pricing (₱35,000 + ₱2,500 + ₱5,000)
- Tax calculations: ₱42,500 * 12% = ₱5,100
- Deposit: ₱47,600 * 30% = ₱14,280
- Balance: ₱33,320 due 30 days before event

### 3. Stripe Integration Tests (`test_stripe_integration.py`)

**Real API Testing:**
- Actual Stripe PaymentIntent creation
- PHP currency processing (250000 centavos = ₱2,500)
- 3D Secure authentication flows
- Payment failure handling (card_declined, insufficient_funds)
- Refund processing with real Stripe API
- Multi-currency support (PHP, USD, EUR)

**Authentication & Security:**
- API key validation and error handling
- Test vs production environment handling
- Payment method token security

### 4. Payment Scenarios (`test_payment_scenarios.py`)

**Refund Testing:**
- Full refunds: ₱15,000 → ₱15,000 refunded
- Partial refunds: ₱20,000 → ₱8,000 + ₱5,000 refunded
- Multiple refunds on single payment
- Refund validation and error handling

**Failure Scenarios:**
- Card declined (card_declined)
- Insufficient funds (insufficient_funds)
- Expired card (expired_card)
- Network errors (APIConnectionError)
- Payment retry logic

**Installment Plans:**
- Monthly installments: ₱60,000 → ₱15,000 down + 3×₱15,000
- Weekly installments: ₱20,000 → ₱5,000 down + 5×₱3,000
- Overdue detection and management
- Payment plan completion tracking

**Concurrent Processing:**
- Multiple simultaneous payments
- Race condition prevention
- Transaction isolation
- Duplicate payment prevention

### 5. Webhook Tests (`test_webhooks.py`)

**Stripe Webhook Events:**
- `payment_intent.succeeded` → Payment completion
- `payment_intent.payment_failed` → Payment failure
- `charge.dispute.created` → Chargeback handling
- `invoice.payment_succeeded` → Invoice payment confirmation

**Security Features:**
- HMAC-SHA256 signature verification
- Timestamp validation (prevents replay attacks)
- Payload tampering detection
- Duplicate event handling (idempotency)
- Unknown event type graceful handling

### 6. Deposit Tests (`test_deposits.py`)

**Calculation Methods:**
- Percentage deposits: 25%, 30%, up to 100%
- Fixed deposits: ₱5,000, ₱15,000
- Validation: deposit cannot exceed total amount

**Booking Flow Integration:**
- Deposit vs full payment options
- Payment plan creation after deposit
- Balance due date calculation (45 days before event)
- Event confirmation after deposit payment

**Refund Policies:**
- "Deposit refundable up to 48 hours before event"
- Refund eligibility validation
- Policy enforcement

### 7. Security & Performance Tests (`test_security_performance.py`)

**PCI Compliance:**
- No card numbers stored (only tokens)
- No CVV/CVC storage
- Only last 4 digits stored
- Sensitive data masking in logs
- Gateway config encryption

**Security Validations:**
- SQL injection prevention
- XSS prevention in payment data
- Payment amount validation
- Webhook signature verification
- Audit trail completeness

**Performance Testing:**
- Concurrent payment processing (10 payments simultaneously)
- Bulk payment queries (100+ payments)
- Database connection pooling
- Transaction logging efficiency
- Caching optimization

## Running the Tests

### Prerequisites

1. **Stripe Test API Keys** (for real API tests):
   ```bash
   export STRIPE_SECRET_KEY="sk_test_..."
   export STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

2. **Database Setup**:
   ```bash
   source venv/bin/activate
   python manage.py migrate
   ```

### Test Commands

```bash
# Run all payment tests
python manage.py test core.domains.payments.tests

# Run specific test modules
python manage.py test core.domains.payments.tests.test_models
python manage.py test core.domains.payments.tests.test_stripe_integration
python manage.py test core.domains.payments.tests.test_integration

# Run with verbose output
python manage.py test core.domains.payments.tests --verbosity=2

# Run specific test cases
python manage.py test core.domains.payments.tests.test_models.PaymentModelTestCase
python manage.py test core.domains.payments.tests.test_integration.CompletePaymentFlowTestCase
```

### Performance Tests

```bash
# Run performance and security tests
python manage.py test core.domains.payments.tests.test_security_performance

# Run concurrent payment tests
python manage.py test core.domains.payments.tests.test_payment_scenarios.ConcurrentPaymentTestCase
```

## Test Data Examples

### Philippine Pricing Structure
```python
# Wedding Package
premium_package = ₱35,000
extra_hour = ₱2,500  
album = ₱5,000
subtotal = ₱42,500

# Tax (12% Philippines VAT)
tax = ₱42,500 * 12% = ₱5,100
total = ₱47,600

# 30% Deposit
deposit = ₱47,600 * 30% = ₱14,280
balance = ₱33,320
```

### Stripe Integration
```python
# PHP amounts converted to centavos for Stripe
stripe_amount = 2500 * 100 = 250000  # ₱2,500 → 250000 centavos
currency = "php"

# Payment method tokens
pm_token = "pm_test_visa_card"  # Test card
pm_real = "pm_1234567890"       # Real tokenized card
```

## Production Readiness Checklist

✅ **Payment Processing:**
- [x] Stripe integration with real API
- [x] PHP currency handling
- [x] Tax calculations (12% Philippines)
- [x] Payment confirmation workflows
- [x] Receipt generation

✅ **Security:**
- [x] PCI compliance (no card data storage)
- [x] Webhook signature verification
- [x] Payment method tokenization
- [x] Sensitive data encryption
- [x] Audit trail logging

✅ **Business Logic:**
- [x] Deposit calculations (percentage/fixed)
- [x] Payment plans and installments
- [x] Event status management
- [x] Refund processing
- [x] Balance due scheduling

✅ **Error Handling:**
- [x] Payment failures (card issues)
- [x] Network errors and retries
- [x] Validation and edge cases
- [x] Graceful degradation

✅ **Performance:**
- [x] Concurrent payment processing
- [x] Database query optimization
- [x] Transaction logging efficiency
- [x] Caching strategies

## Monitoring & Alerting

The test suite includes scenarios for monitoring:
- Payment failure rates
- Processing times
- Refund requests
- Webhook delivery failures
- Security incidents

## Next Steps

1. **Configure Stripe Production Keys** when ready for live processing
2. **Set up monitoring** for payment metrics and alerts
3. **Test with real bank cards** in controlled environment
4. **Validate tax calculations** with Philippine tax authorities
5. **Review refund policies** with legal team

This comprehensive test suite ensures the payment system is ready for production use with real customer transactions and money handling.