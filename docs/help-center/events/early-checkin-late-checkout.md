# Early Check-in and Late Checkout

LifePlace tracks guest arrivals and departures for every confirmed event. Staff can record check-ins, mark checkouts, and apply late fees when guests stay beyond their reserved time.

## Check-in Status Flow

Every event follows a standard check-in lifecycle:

| Status | Meaning |
|---|---|
| Pending | Event is confirmed but the guest has not yet arrived |
| Checked In | Staff recorded the guest's arrival at the venue |
| Checked Out | Guest has departed; the event moves to Completed |
| No-Show | Guest did not arrive; marked by staff after the event window passes |

## Early Check-in Requests

Clients or staff can request an early check-in before the scheduled arrival time. The system tracks:

| Field | Description |
|-------|-------------|
| Early check-in requested | Whether an early arrival has been requested |
| Early check-in fee | Any additional fee charged for early arrival |
| Earliest check-in time | The earliest time the guest is permitted to arrive (configured as a venue-level setting in VenueOperatingRules, not on the event itself) |

## Recording a Check-in

1. Open the event from the calendar or event list. The event must meet these requirements:
   - Event status must be **CONFIRMED** (the backend enforces this requirement)
   - Check-in status must be **Pending**
   - The event date must be today or in the past
2. Click **Check In Guest** on the event detail page.
3. The system records the current time as the arrival time.
4. The check-in status updates to **Checked In** automatically.

## Checkout and Completion

1. Open the checked-in event and click **Checkout Guest**.
2. If the guest is departing after the reserved end time, a late checkout fee may be calculated based on the overstay duration.
3. Confirm the checkout to complete the process — the event status moves to **Completed**.

## Marking a No-Show

If a guest does not arrive, open the event and select **Mark No Show**. This records the non-arrival and closes the event without triggering checkout fees.

## Late Checkout Fees

When a guest stays beyond the reserved time, a late checkout fee may apply. Three fee calculation methods are available:

| Fee Type | How It Works |
|---|---|
| Fixed | A flat fee regardless of how long the guest stays past the reserved time |
| Hourly | A per-hour charge for each additional hour beyond the reservation |
| Percentage | A percentage of the total event cost applied as the late fee |

A **grace period** (default: 15 minutes) allows a short buffer before fees begin. A **maximum hours cap** (default: 4 hours) limits the total chargeable overstay time.

## Configuration

Configure late checkout fees globally at **Settings > Commerce > Payments**. You can also set per-venue overrides for **fee_per_hour** and **max_hours** in **VenueOperatingRules** — venue-specific settings for those fields take precedence over the global PaymentSettings defaults. Note that venue overrides always use the **Hourly** fee type with a fixed 15-minute grace period. This is useful when different venues have different pricing or maximum overstay limits.

## Related Articles

- [Creating and Managing Events](creating-and-managing-events.md)
- [Payment Terms and Scheduling](../payments/payment-terms-and-scheduling.md)
- [Understanding Venues](understanding-venues.md)
