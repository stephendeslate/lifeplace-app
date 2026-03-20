# Invoices

Invoices are formal billing documents that track what a client owes and record payment progress over time. They are generated automatically when a quote is accepted, carrying over all line items from the approved quote.

## Invoice Fields

| Field | Description |
|---|---|
| Invoice ID | Auto-generated unique identifier |
| Event | Associated event |
| Client | Billed client |
| Subtotal | Sum of line items before tax |
| Tax Amount | Calculated tax |
| Total Amount | Final amount due |
| Issue Date | When the invoice was created |
| Due Date | Payment deadline |
| Status | Current lifecycle status (see table below) |
| Line Items | Detailed breakdown (mirrors the accepted quote's line items) |

## Invoice Status Lifecycle

An invoice moves through the following statuses as it progresses:

| Status | Meaning | Next Steps |
|---|---|---|
| Draft | Invoice created but not yet sent to the client | Review and issue |
| Issued | Sent to the client and awaiting payment | Client pays in full or in part |
| Partially Paid | One or more payments received, balance still outstanding | Continue collecting payments |
| Paid | Full amount received — no further action needed | Complete |
| Void | Nullified due to an error (e.g., incorrect amount or duplicate) | Create a corrected invoice if needed |
| Cancelled | Legitimately reversed (e.g., event cancelled by the client) | Process refunds if applicable |

## Auto-Generation

Invoices are created automatically when a client accepts a quote. The invoice inherits the quote's line items, totals, and tax calculations — no manual data entry required.

## Payment Tracking

The invoice automatically tracks payment progress:

- **Paid Amount** updates as each payment is recorded and completed.
- **Remaining Amount** recalculates to show the outstanding balance.
- When the remaining amount reaches zero, the status advances to **Paid**.

## Voiding vs. Cancelling

Use **Void** when an invoice was created in error — this removes it from active records while preserving audit history. Use **Cancel** when the underlying event or agreement was legitimately reversed, such as a client-requested cancellation that may involve refund processing.

## Related Articles

- [Creating and Sending Quotes](../quotes/)
- [Recording and Tracking Payments](recording-and-tracking-payments.md)
- [Stripe and Receipts](stripe-and-receipts.md)
