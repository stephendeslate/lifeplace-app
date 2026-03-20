# Creating and Managing Events

## Event Statuses

Every event in LifePlace has a status that reflects where it is in the booking lifecycle.

| Status    | Meaning                                              | What Triggers It                                                              |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| LEAD      | Initial inquiry -- client is interested but has not committed | Event created (manually or via booking flow)                                  |
| CONFIRMED | Client accepted a quote -- booking is confirmed      | Client accepts a quote                                                        |
| COMPLETED | Event has taken place                                | Admin marks as complete, or automated after the event date                    |
| CANCELLED | Booking was cancelled                                | Admin cancels, client request, payment deadline expired, or date taken        |

## Creating a New Event

1. Navigate to **Events** and click **+ New Event**.
2. Fill in the event details:
   - **Client** -- select an existing client or create a new one
   - **Event Type**
   - **Event Name**
   - **Venue**
   - **Start Date/Time**
   - **End Date/Time**
   - **Number of Guests**
   - **Lead Source**
   - **Program Timing**
3. Click **Save**.

After creation:

- The event starts in **LEAD** status.
- A workflow template is auto-attached if one is associated with the selected event type.
- The event appears on the calendar and in the events list.

## Event Detail Page

Click any event to open its detail page. The detail page provides a complete view of everything related to the event:

- **Event info header** -- status, client, date, venue, event type
- **Timeline** -- chronological history of all activity
- **Quotes** -- pricing proposals sent to the client
- **Contracts** -- agreements and signing status
- **Payments** -- payment records and balances
- **Tasks** -- action items for staff
- **Files** -- uploaded documents and images
- **Feedback** -- post-event feedback
- **Notes** -- internal staff notes
- **Products/Packages** -- items and packages selected for the event
- **Communication log** -- record of messages sent to the client

## Event Payment Tracking

Each event tracks its payment status automatically based on received payments.

| Payment Status | Meaning                                  |
| -------------- | ---------------------------------------- |
| UNPAID         | No payments received                     |
| PARTIALLY_PAID | Some payments received, balance remaining |
| PAID           | Fully paid                               |

The event detail page shows:

- Total amount due
- Total amount paid
- Balance remaining
