# Stripe, PayMongo, and Receipts

LifePlace integrates with Stripe and PayMongo for secure online payment processing and automatically generates receipts when payments are completed.

## Stripe Configuration

Set up your Stripe connection at **Settings > Commerce > Payments**. Once configured, your account links LifePlace to your Stripe dashboard so that all online transactions are processed through your Stripe account.

## PayMongo (Alternative Gateway)

PayMongo is available as an alternative payment gateway, providing access to popular Philippine payment methods:

- **GCash**
- **GrabPay**
- **Maya**
- **Bank transfers**

Configure PayMongo under **Settings > Commerce > Payments** alongside or instead of Stripe.

## Online Payment Flow

When a client pays online, the process follows these steps:

1. The client clicks a payment link (from an invoice, quote, or the Client Portal).
2. An **embedded payment form** (Stripe PaymentIntent) is displayed directly on the LifePlace page -- the client stays on your site throughout the process.
3. The client enters their payment details and completes the transaction without leaving LifePlace.
4. LifePlace receives a **webhook notification** from the payment provider and updates the payment status automatically.

## Webhooks and Reliability

Stripe sends real-time payment confirmations to LifePlace via webhooks. The system includes several reliability features:

| Feature | Details |
|---|---|
| Real-time confirmations | Payment status updates as soon as Stripe processes the charge |
| Automatic retry | The system scans for failed webhook deliveries every 5 minutes. Actual retries use exponential backoff starting at 60 seconds, doubling each attempt, capped at 1 hour with jitter to avoid thundering-herd effects |
| Daily reconciliation | An automated check ensures LifePlace records match Stripe |
| Health monitoring | Connection status for all active payment gateways (Stripe, PayMongo, etc.) is verified every 15 minutes |

## Failed Payments

When a payment attempt fails, LifePlace can automatically retry:

- **Retry attempts** — configure how many times the system should retry a failed charge (default: 3 attempts).
- **Delay between retries** — set the number of days between each retry attempt (default: 2 days).

Adjust these settings at **Settings > Commerce > Payments** under the failed payment retry section.

## Receipts

When a payment is completed, LifePlace automatically generates a receipt:

1. A unique **receipt number** is assigned.
2. A **PDF receipt** is created and available for download from the payment detail page.
3. The receipt is **emailed to the client** automatically (an **SMS receipt** can also be sent if the client has a phone number on file).
4. Staff can also resend receipts manually from the payment detail page at any time.

## Related Articles

- [Recording and Tracking Payments](recording-and-tracking-payments.md)
- [Payment Terms and Scheduling](payment-terms-and-scheduling.md)
- [Refunds and Disputes](refunds-and-disputes.md)
