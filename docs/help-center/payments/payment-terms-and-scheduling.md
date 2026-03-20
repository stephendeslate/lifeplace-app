# Payment Terms and Scheduling

Configure how and when clients pay for their bookings. The platform supports downpayments, deposits, and balance payments -- each with independent settings.

## Downpayments vs. Deposits

These are distinct concepts in LifePlace:

- **Downpayment** — a partial payment toward the total cost that secures the booking. The default is **30%** of the total.
- **Deposit** — a separate hold amount (e.g., security deposit or damage deposit) that may or may not be applied toward the total. The default is **50%** of the total.

Both are configured independently under **Settings > Commerce > Payments**.

## Default Payment Structure

Every booking is split into scheduled payments:

1. **Downpayment** — due shortly after booking to confirm and hold the date.
2. **Remaining balance** — due before the event takes place.

Navigate to **Settings > Commerce > Payments** to configure the global defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| Downpayment percentage | 30% | Portion of total cost required upfront |
| Downpayment due days | 7 days | How many days the client has to submit the downpayment |
| Balance due before event | 30 days | How many days before the event the remaining balance is due |

## Date Blocking Policies

You can control when a date is blocked on the calendar after a booking is submitted:

- **Immediate** — the date is blocked as soon as the booking is created, even before payment.
- **On downpayment** — the date is only blocked once the downpayment has been received.

Additionally, you can enable **date holds** (date_hold_enabled) to temporarily block a date for a configurable duration (date_hold_duration_days, default 7 days) while a booking is being finalized, without requiring payment first.

Choose the policy that fits your venue's workflow under **Settings > Commerce > Payments**.

## Auto-Cancellation

Auto-cancellation applies only when the date-blocking policy is set to **On Downpayment**. In that case, if a client does not submit their downpayment within the deadline (7 days by default), the booking is automatically canceled and the date is released. This prevents unpaid bookings from holding calendar space indefinitely.

If the date-blocking policy is set to **Immediate**, auto-cancellation does not apply because the date is blocked as soon as the booking is created.

## Deposit Settings

Deposits (default: 50%) can be configured independently from the downpayment:

| Setting | Options |
|---------|---------|
| Deposit type | Percentage of total or fixed amount |
| Refundable | Whether the deposit is returned after the event |
| Deductible | Whether the deposit is applied toward the total cost |

## Additional Payment Settings

The following settings are also available under **Settings > Commerce > Payments**:

| Setting | Description |
|---------|-------------|
| Late fees | Penalty amount or percentage charged for overdue payments |
| Grace period | Number of days after the due date before late fees are applied |
| Service charges | Additional service fees applied to bookings |
| Security deposits | Refundable hold amount for venue protection (separate from booking deposits) |
| Child/youth pricing | Discounted rate configuration for children or youth attendees |
| Rescheduling fee enabled | Whether a fee is charged when an event is rescheduled |
| Rescheduling fee type | Percentage of total or fixed amount |
| Rescheduling fee percentage | Percentage charged if type is percentage |
| Rescheduling fee fixed amount | Fixed amount charged if type is fixed |
| Late checkout fee enabled | Whether a fee is charged for late checkouts |
| Late checkout fee type | Percentage, fixed amount, or hourly rate |
| Late checkout fee amount | Fixed amount charged for late checkout |
| Late checkout fee percentage | Percentage charged for late checkout |
| Late checkout grace minutes | Number of minutes after scheduled end before late fees apply |
| Late checkout max hours | Maximum hours of late checkout allowed |

## Per-Booking Overrides

Each booking flow can override the global defaults. When a setting is left blank on a specific booking flow, the system falls back to the global configuration. This allows you to offer different payment terms for different event types or packages.

## Related Articles

- [Recording and Tracking Payments](recording-and-tracking-payments.md)
- [Invoices](invoices.md)
- [Date Blocking and Holds](../events/date-blocking-and-holds.md)
