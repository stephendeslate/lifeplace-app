# Invoices

Invoices are generated automatically when a quote is accepted. They provide a formal record of what the client owes and track payment progress.

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
| Status | DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID, or CANCELLED |
| Line Items | Detailed breakdown (mirrors the accepted quote's line items) |

## Payment Tracking

The invoice automatically tracks payment progress:

- **Paid Amount** -- the sum of all completed payments applied to this invoice.
- **Remaining Amount** -- the total amount minus the paid amount.

As payments are recorded and completed, these values update automatically.
