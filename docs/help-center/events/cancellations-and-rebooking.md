# Cancellations and Rebooking

When an event can no longer proceed, LifePlace provides a structured cancellation process that preserves the full history and supports rebooking when the client wants to reschedule.

## Cancelling an Event

There is no dedicated "Cancel Event" button. Events can be cancelled in the following ways:

1. **Edit Event dialog** -- Open the event, click **Edit**, and change the status to **CANCELLED**. Save the changes.
2. **Delete Event** -- Select **Delete Event** from the action menu. This removes the event entirely.
3. **Automatic cancellation** -- The backend automatically cancels events in certain situations (e.g., payment deadline expiration, date taken by another booking).

Cancellation reasons are assigned programmatically by the system -- there is no admin UI for selecting a reason. The possible reasons are:

| Reason | Display Label |
|---|---|
| Client Requested | Client Requested |
| Payment Deadline Expired | Payment Deadline Expired |
| Date Taken by Another Booking | Date Taken by Another Booking |
| Admin Cancelled | Admin Cancelled |

## What Happens After Cancellation

- The event status changes to **Cancelled** with a timestamp and reason recorded.
- The client receives an **automatic cancellation notification** via their preferred channel.
- Any existing **payments remain on file** for reference and potential refund processing.
- Related **contracts are marked accordingly** to reflect the cancelled status.
- A **cancellation admin fee** may be applied based on your configured percentage — set this at **Settings > Commerce > Payments**.

## Rebooking a Cancelled Event

If the client wants to reschedule rather than cancel outright, you can create a new event and link it to the original cancelled event to preserve booking history.

> **Note:** A dedicated **Rebook** button is planned but not yet available in the UI. For now, create a new event manually and reference the original event in the notes.

**Important:** Events cancelled with the **Admin** reason cannot be rebooked.

## Related Articles

- [Refunds and Disputes](../payments/refunds-and-disputes.md)
- [Payment Terms and Scheduling](../payments/payment-terms-and-scheduling.md)
- [Date Blocking and Holds](date-blocking-and-holds.md)
