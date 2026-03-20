# Refunds and Disputes

Manage refund requests and handle payment disputes directly from the admin dashboard. Refunds are processed automatically through Stripe when connected, and disputes can be tracked through their full lifecycle.

## Processing a Refund

To issue a refund from the admin dashboard:

1. Navigate to the payment detail page for the payment you want to refund (via **Payments** in the top navigation or from the event profile's **Invoices** tab).
2. On the payment detail page, click **Create Refund**.
3. Enter the refund amount (full or partial) and provide a reason in the text field.
4. Confirm the refund. If Stripe is connected, it will be processed automatically.

Each refund moves through a status lifecycle:

| Status | Meaning |
|--------|---------|
| Pending | Refund has been submitted and is awaiting processing |
| Processing | Refund is being handled by the payment provider |
| Completed | Funds have been returned to the client |
| Failed | The refund could not be processed — review and retry |
| Rejected | The refund was denied based on policy rules |

## Refund Settings

Navigate to **Settings > Commerce > Payments** to configure global refund rules:

- **Refunds enabled** — toggle refund capability on or off for the entire venue.
- **Refund deadline** — maximum number of hours before the event to allow refunds (default: 48 hours).
- **Maximum refund percentage** — cap on how much of a payment can be refunded (default: 100%).
- **Policy text** — custom refund policy displayed to clients during the booking process.

## Managing Disputes

When a client raises a dispute with their bank or card provider, it appears in your dashboard. Each dispute follows a status flow: **Open**, then **Under Review**, and finally resolves as **Won**, **Lost**, or **Closed**.

| Dispute Reason | Description |
|----------------|-------------|
| Fraudulent | Client claims they did not authorize the charge |
| Duplicate | Client was charged more than once |
| Product not received | Services were not delivered as expected |
| Product unacceptable | Services did not meet the agreed standard |
| Subscription canceled | Recurring charge continued after cancellation |
| Unrecognized | Client does not recognize the charge |
| Credit not processed | A promised credit or refund was not applied |
| General | Dispute does not fit a specific category |
| Other | Miscellaneous or uncategorized dispute |

For each dispute, you can assign a team member to manage the response and track the evidence submission deadline. Upload supporting documents before the deadline to strengthen your case.

## Related Articles

- [Recording and Tracking Payments](recording-and-tracking-payments.md)
- [Stripe and Receipts](stripe-and-receipts.md)
- [Cancellations and Rebooking](../events/cancellations-and-rebooking.md)
