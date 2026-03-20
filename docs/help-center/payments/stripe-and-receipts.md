# Stripe and Receipts

This article covers online payment processing through Stripe and how receipts are generated.

## Stripe Integration

LifePlace integrates with Stripe for online payments:

- **Payment gateways** are configured in **Settings > Commerce > Payments**.
- **Stripe webhooks** are automatically processed to update payment statuses in real time.
- Online payments go through Stripe's secure payment flow -- clients are redirected to Stripe's hosted checkout and returned to LifePlace upon completion.
- **Reconciliation tasks** run daily to ensure payment records in LifePlace stay consistent with Stripe.

## Receipts

When a payment is completed, LifePlace generates a receipt:

- A **receipt number** is auto-generated.
- A **PDF receipt** can be generated and downloaded.
- The receipt can be **sent to the client via email** directly from the payment detail page.
