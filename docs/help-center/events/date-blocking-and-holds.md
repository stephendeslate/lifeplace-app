# Date Blocking and Holds

## Event-Level Date Blocking

When an event is created, you can control date availability using these mechanisms:

- **Temporary Hold** -- reserves the date for a limited time while waiting for a deposit from the client.
- **Permanent Block** -- confirms the date is taken after a deposit has been received.
- **Downpayment Deadline** -- an optional deadline attached to a hold. If the deadline passes without payment, the event is auto-cancelled.
- **Hold Extension** -- if a client needs more time, you can extend the hold deadline. Each event has a maximum number of extensions allowed and a configurable number of extension days per request.

## Venue-Level Blocked Dates

Independently of events, you can block dates or time ranges on specific venues for administrative purposes:

- Block entire days or specific time ranges for maintenance, private events, or closures.
- Blocked dates are checked during the booking process -- clients cannot book on a blocked date.
- Partial-day blocks are supported (e.g., block only 8:00-12:00 for morning maintenance).

## How Facility-Wide Blocking Works

Date blocking is facility-wide. When an event's date is permanently blocked (after deposit), it blocks that date for the entire property, not just one venue. This follows a **first-to-pay-wins** model: the first client to submit their deposit secures the date for the whole facility.
