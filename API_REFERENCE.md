# API Reference - Payment Method Management System

## Overview

This document provides comprehensive API reference for the Payment Method Management System endpoints. All client-facing endpoints are prefixed with `/payments/client/` and require authentication.

## Authentication

All endpoints require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Base URL
```
https://api.lifeplacealfonso.com/api/v1/payments/client/
```

## Common Response Formats

### Success Response
```json
{
  "data": { ... },
  "success": true,
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  },
  "success": false
}
```

### Paginated Response
```json
{
  "count": 100,
  "next": "https://api.example.com/api/v1/payments/client/payments/?page=3",
  "previous": "https://api.example.com/api/v1/payments/client/payments/?page=1",
  "results": [ ... ]
}
```

## Endpoints

### Payment Methods

#### List Payment Methods
```
GET /payment-methods/
```

**Description**: Retrieve all payment methods for the authenticated user

**Query Parameters**:
- `page` (integer): Page number for pagination
- `page_size` (integer): Number of results per page (default: 20, max: 100)
- `ordering` (string): Sort by field (`-created_at`, `is_default`, `nickname`)

**Response**:
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "type": "CREDIT_CARD",
      "nickname": "Primary Visa",
      "last_four": "4242",
      "is_default": true,
      "gateway": {
        "id": 1,
        "name": "Stripe Production",
        "code": "stripe"
      },
      "exp_month": 12,
      "exp_year": 2025,
      "metadata": {
        "card_brand": "visa",
        "stripe_payment_method_type": "card"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:22:00Z"
    }
  ]
}
```

#### Get Payment Method
```
GET /payment-methods/{id}/
```

**Description**: Retrieve a specific payment method

**Path Parameters**:
- `id` (integer): Payment method ID

**Response**:
```json
{
  "id": 1,
  "type": "CREDIT_CARD",
  "nickname": "Primary Visa",
  "last_four": "4242",
  "is_default": true,
  "gateway": {
    "id": 1,
    "name": "Stripe Production",
    "code": "stripe",
    "is_active": true
  },
  "exp_month": 12,
  "exp_year": 2025,
  "metadata": {
    "card_brand": "visa",
    "exp_month": 12,
    "exp_year": 2025,
    "stripe_payment_method_type": "card"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:22:00Z"
}
```

#### Create Payment Method
```
POST /payment-methods/
```

**Description**: Create a new payment method using Stripe setup intent

**Request Body**:
```json
{
  "type": "CREDIT_CARD",
  "nickname": "My Visa Card",
  "gateway": 1,
  "token_reference": "pm_1234567890abcdef",
  "last_four": "4242",
  "is_default": false,
  "exp_month": 12,
  "exp_year": 2025,
  "metadata": {
    "card_brand": "visa",
    "stripe_payment_method_type": "card"
  }
}
```

**Response**: Returns the created payment method object (same format as GET)

#### Update Payment Method
```
PUT /payment-methods/{id}/
PATCH /payment-methods/{id}/
```

**Description**: Update payment method details (nickname, default status)

**Path Parameters**:
- `id` (integer): Payment method ID

**Request Body** (PATCH example):
```json
{
  "nickname": "Updated Card Name",
  "is_default": true
}
```

**Response**: Returns the updated payment method object

#### Delete Payment Method
```
DELETE /payment-methods/{id}/
```

**Description**: Delete a payment method

**Path Parameters**:
- `id` (integer): Payment method ID

**Response**: `204 No Content` on success

#### Create Setup Intent
```
POST /payment-methods/setup_intent/
```

**Description**: Create a Stripe setup intent for saving payment methods

**Request Body**:
```json
{
  "gateway_code": "stripe"
}
```

**Response**:
```json
{
  "setup_intent_id": "seti_1234567890abcdef",
  "client_secret": "seti_1234567890abcdef_secret_xyz",
  "status": "requires_payment_method",
  "gateway": "stripe"
}
```

### Payments

#### List Payments
```
GET /payments/
```

**Description**: Retrieve payment history for the authenticated user

**Query Parameters**:
- `page` (integer): Page number
- `page_size` (integer): Results per page
- `status` (string): Filter by status (`PENDING`, `COMPLETED`, `FAILED`)
- `event` (integer): Filter by event ID
- `start_date` (string): Filter by date range start (ISO format)
- `end_date` (string): Filter by date range end (ISO format)
- `search` (string): Search in payment number, description, reference number
- `ordering` (string): Sort by field (`-created_at`, `amount`, `due_date`, `paid_on`)

**Response**:
```json
{
  "count": 50,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": 1,
      "payment_number": "PAY-2024-001",
      "event": {
        "id": 1,
        "name": "Wedding Reception",
        "event_date": "2024-06-15",
        "client": {
          "id": 1,
          "full_name": "John Smith",
          "email": "john@example.com"
        }
      },
      "amount": "1500.00",
      "currency": "USD",
      "status": "COMPLETED",
      "status_display": "Completed",
      "due_date": "2024-01-20",
      "paid_on": "2024-01-18T14:30:00Z",
      "description": "Wedding venue deposit",
      "reference_number": "REF-2024-001",
      "receipt_number": "RCP-2024-001",
      "payment_method": {
        "id": 1,
        "nickname": "Primary Visa",
        "last_four": "4242",
        "type": "CREDIT_CARD"
      },
      "is_manual": false,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-18T14:30:00Z"
    }
  ]
}
```

#### Get Payment
```
GET /payments/{id}/
```

**Description**: Retrieve a specific payment

**Response**: Single payment object (same format as list item)

#### Download Payment Receipt
```
GET /payments/{id}/download_receipt/
```

**Description**: Download PDF receipt for a completed payment

**Response**: PDF file download

#### Get Payment Summary
```
GET /payments/summary/
```

**Description**: Get payment summary statistics for the user

**Response**:
```json
{
  "total_paid": "15000.00",
  "total_pending": "2500.00",
  "total_overdue": "500.00",
  "payment_count": 25,
  "completed_count": 20,
  "pending_count": 5
}
```

### Invoices

#### List Invoices
```
GET /invoices/
```

**Description**: Retrieve invoices for the authenticated user

**Query Parameters**:
- `page` (integer): Page number
- `page_size` (integer): Results per page
- `status` (string): Filter by status (`DRAFT`, `ISSUED`, `PAID`, `OVERDUE`, `CANCELLED`)
- `event` (integer): Filter by event ID
- `search` (string): Search in invoice ID or notes
- `ordering` (string): Sort by field (`-created_at`, `issue_date`, `due_date`, `total_amount`)

**Response**:
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "invoice_id": "INV-2024-001",
      "event": {
        "id": 1,
        "name": "Wedding Reception",
        "event_date": "2024-06-15"
      },
      "client": {
        "id": 1,
        "full_name": "John Smith",
        "email": "john@example.com"
      },
      "issue_date": "2024-01-15",
      "due_date": "2024-02-15",
      "total_amount": "5000.00",
      "paid_amount": "0.00",
      "currency": "USD",
      "status": "ISSUED",
      "status_display": "Issued",
      "notes": "Wedding venue and catering invoice",
      "line_items": [
        {
          "id": 1,
          "description": "Venue rental",
          "quantity": "1.00",
          "unit_price": "3000.00",
          "total": "3000.00",
          "product": {
            "id": 1,
            "name": "Main Hall Rental",
            "description": "Full day venue rental"
          }
        }
      ],
      "taxes": [
        {
          "id": 1,
          "tax_rate_details": {
            "name": "Sales Tax",
            "rate": "8.25"
          },
          "taxable_amount": "4500.00",
          "tax_amount": "371.25"
        }
      ],
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

#### Get Invoice
```
GET /invoices/{id}/
```

**Description**: Retrieve a specific invoice

**Response**: Single invoice object (same format as list item)

#### Download Invoice PDF
```
GET /invoices/{id}/download_pdf/
```

**Description**: Download PDF copy of the invoice

**Response**: PDF file download

#### Pay Invoice
```
POST /invoices/{id}/pay/
```

**Description**: Process full payment for an invoice

**Request Body**:
```json
{
  "payment_method_id": "pm_1234567890abcdef",
  "payment_method": 1,
  "gateway_id": 1,
  "save_payment_method": true,
  "payment_method_nickname": "Primary Card"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "payment": {
    "id": 25,
    "payment_number": "PAY-2024-025",
    "amount": "5000.00",
    "status": "COMPLETED",
    "paid_on": "2024-01-20T15:45:00Z"
  },
  "invoice": {
    "id": 1,
    "status": "PAID",
    "paid_amount": "5000.00"
  }
}
```

#### Create Payment Intent for Invoice
```
POST /invoices/{id}/create_payment_intent/
```

**Description**: Create a Stripe payment intent for invoice payment

**Request Body**:
```json
{
  "gateway_code": "stripe"
}
```

**Response**:
```json
{
  "client_secret": "pi_1234567890abcdef_secret_xyz",
  "payment_intent_id": "pi_1234567890abcdef",
  "status": "requires_payment_method",
  "requires_action": false,
  "next_action": null,
  "payment_id": 25,
  "transaction_id": 1
}
```

#### Setup Payment Plan for Invoice
```
POST /invoices/{id}/setup_payment_plan/
```

**Description**: Create a payment plan for an invoice

**Request Body**:
```json
{
  "down_payment_amount": "1000.00",
  "number_of_installments": 4,
  "installment_frequency": "MONTHLY",
  "first_installment_date": "2024-02-15"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment plan created successfully",
  "payment_plan": {
    "id": 1,
    "total_amount": "5000.00",
    "down_payment_amount": "1000.00",
    "number_of_installments": 4,
    "installments": [
      {
        "id": 1,
        "amount": "1000.00",
        "due_date": "2024-02-15",
        "status": "PENDING",
        "installment_number": 1
      }
    ]
  }
}
```

### Payment Plans

#### List Payment Plans
```
GET /payment-plans/
```

**Description**: Retrieve payment plans for the authenticated user

**Response**:
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "event": {
        "id": 1,
        "name": "Wedding Reception",
        "event_date": "2024-06-15",
        "client": {
          "id": 1,
          "full_name": "John Smith"
        }
      },
      "total_amount": "5000.00",
      "down_payment_amount": "1000.00",
      "down_payment_due_date": "2024-01-20",
      "number_of_installments": 4,
      "installment_frequency": "MONTHLY",
      "currency": "USD",
      "status": "ACTIVE",
      "installments": [
        {
          "id": 1,
          "amount": "1000.00",
          "due_date": "2024-02-15",
          "status": "PENDING",
          "installment_number": 1,
          "description": "Payment plan installment 1 of 4"
        }
      ],
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

#### Get Payment Plan
```
GET /payment-plans/{id}/
```

**Description**: Retrieve a specific payment plan

#### Pay Installment
```
POST /payment-plans/{id}/pay_installment/
```

**Description**: Pay a specific installment of a payment plan

**Request Body**:
```json
{
  "installment_id": 1,
  "payment_method": 1,
  "gateway_id": 1
}
```

**Response**:
```json
{
  "id": 26,
  "payment_number": "PAY-2024-026",
  "amount": "1000.00",
  "status": "COMPLETED",
  "installment": {
    "id": 1,
    "status": "PAID",
    "paid_on": "2024-01-20T16:30:00Z"
  }
}
```

### Payment Installments

#### List Installments
```
GET /installments/
```

**Description**: Retrieve all installments for the authenticated user's payment plans

**Query Parameters**:
- `status` (string): Filter by status (`PENDING`, `PAID`, `OVERDUE`)
- `due_date_start` (string): Filter by due date range start
- `due_date_end` (string): Filter by due date range end

**Response**:
```json
{
  "count": 15,
  "results": [
    {
      "id": 1,
      "payment_plan": {
        "id": 1,
        "event": {
          "id": 1,
          "name": "Wedding Reception"
        },
        "total_amount": "5000.00"
      },
      "amount": "1000.00",
      "due_date": "2024-02-15",
      "status": "PENDING",
      "installment_number": 1,
      "description": "Payment plan installment 1 of 4",
      "payment_details": null,
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

#### Create Payment for Installment
```
POST /installments/{id}/create_payment/
```

**Description**: Create a payment for a specific installment

**Request Body**:
```json
{
  "payment_method": 1,
  "gateway_id": 1
}
```

**Response**: Returns created payment object

### Refunds

#### List Refunds
```
GET /refunds/
```

**Description**: Retrieve refunds for the authenticated user's payments

**Query Parameters**:
- `status` (string): Filter by refund status
- `payment` (integer): Filter by payment ID

**Response**:
```json
{
  "count": 2,
  "results": [
    {
      "id": 1,
      "payment": {
        "id": 1,
        "payment_number": "PAY-2024-001",
        "amount": "1500.00"
      },
      "amount": "500.00",
      "currency": "USD",
      "reason": "Partial cancellation",
      "status": "COMPLETED",
      "processed_on": "2024-01-25T10:15:00Z",
      "gateway_reference": "re_1234567890abcdef",
      "created_at": "2024-01-25T09:00:00Z"
    }
  ]
}
```

## Error Codes

### Authentication Errors
- `AUTHENTICATION_FAILED`: Invalid or missing authentication token
- `PERMISSION_DENIED`: User lacks permission for requested resource
- `SESSION_EXPIRED`: Authentication session has expired

### Validation Errors
- `VALIDATION_ERROR`: Request data validation failed
- `REQUIRED_FIELD`: Required field is missing
- `INVALID_FORMAT`: Field format is invalid
- `DUPLICATE_ENTRY`: Resource already exists

### Payment Errors
- `PAYMENT_FAILED`: Payment processing failed
- `INSUFFICIENT_FUNDS`: Card has insufficient funds
- `CARD_DECLINED`: Card was declined by issuer
- `EXPIRED_CARD`: Payment method has expired
- `INVALID_PAYMENT_METHOD`: Payment method is invalid or not found

### Business Logic Errors
- `INVOICE_ALREADY_PAID`: Invoice has already been paid
- `PAYMENT_PLAN_EXISTS`: Payment plan already exists for this invoice
- `INSTALLMENT_ALREADY_PAID`: Installment has already been paid
- `GATEWAY_UNAVAILABLE`: Payment gateway is temporarily unavailable

### System Errors
- `INTERNAL_ERROR`: Unexpected system error occurred
- `SERVICE_UNAVAILABLE`: Service is temporarily unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests in time period

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- **Payment operations**: 10 requests per minute per user
- **Data retrieval**: 100 requests per minute per user
- **Setup intents**: 5 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when current window resets

## Webhooks

### Setup
Webhooks can be configured to receive notifications about payment events:
```
POST /webhooks/
```

### Events
- `payment.completed`: Payment successfully processed
- `payment.failed`: Payment processing failed
- `payment_method.saved`: New payment method saved
- `invoice.paid`: Invoice marked as paid
- `installment.paid`: Payment plan installment paid

### Webhook Payload Example
```json
{
  "event": "payment.completed",
  "timestamp": "2024-01-20T15:45:00Z",
  "data": {
    "payment_id": 25,
    "amount": "1500.00",
    "currency": "USD",
    "user_id": 1
  }
}
```

## Testing

### Test Mode
All endpoints support test mode using test API keys. Test mode allows:
- Safe testing without real charges
- Simulated payment scenarios
- Test payment methods and cards

### Test Cards
When using test mode, these test card numbers can be used:
- `4242424242424242`: Successful payments
- `4000000000000002`: Card declined
- `4000000000009995`: Insufficient funds
- `4000000000009987`: Lost card
- `4000000002000056`: Expired card

## SDK Examples

### JavaScript/TypeScript
```typescript
// Create setup intent
const response = await fetch('/api/v1/payments/client/payment-methods/setup_intent/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ gateway_code: 'stripe' })
});

const { client_secret } = await response.json();

// Use with Stripe Elements
const { error } = await stripe.confirmSetup({
  elements,
  confirmParams: {
    return_url: 'https://your-site.com/payment-success'
  }
});
```

### Python
```python
import requests

# List payment methods
response = requests.get(
    'https://api.lifeplacealfonso.com/api/v1/payments/client/payment-methods/',
    headers={'Authorization': f'Bearer {token}'}
)

payment_methods = response.json()['results']
```

This API reference provides comprehensive documentation for integrating with the Payment Method Management System, enabling developers to build robust payment experiences.