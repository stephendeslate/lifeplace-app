# Cancellations and Rebooking

## Cancelling an Event

When cancelling an event, you must select a cancellation reason:

| Reason          | Description                              |
| --------------- | ---------------------------------------- |
| Client Request  | The client asked to cancel               |
| Payment Timeout | The downpayment deadline expired         |
| Date Taken      | Another booking took the same date       |
| Admin           | Cancelled by an administrator            |

## What Happens After Cancellation

- The event status changes to **CANCELLED**.
- A cancellation timestamp and reason are recorded on the event.
- If **can_rebook** is true, a new event can be created as a rebook. The new event is linked back to the original cancelled event for reference.
