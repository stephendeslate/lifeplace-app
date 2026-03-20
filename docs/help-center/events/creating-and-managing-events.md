# Creating and Managing Events

## Event Statuses

Every event in LifePlace has a status that reflects where it is in the booking lifecycle.

| Status    | Meaning                                              | What Triggers It                                                              |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| LEAD      | Initial inquiry -- client is interested but has not committed | Event created (manually or via booking flow)                                  |
| CONFIRMED | Client accepted a quote -- booking is confirmed      | Client accepts a quote                                                        |
| COMPLETED | Event has taken place                                | Client checks out, admin marks as complete, or automated after the event date |
| CANCELLED | Booking was cancelled                                | Admin cancels, client request, payment deadline expired, or date taken        |

## Creating a New Event

1. Navigate to **Events** and click **Add Event**.
2. Fill in the event details:
   - **Client** -- select an existing client or create a new one
   - **Event Type**
   - **Event Name**
   - **Start Date/Time**
   - **End Date/Time**
   - **Scheduled Check-in / Checkout**
   - **Number of Guests**
   - **Lead Source**
   - **Workflow Template**
   - **Status** (defaults to LEAD)
   - **Total Price**
3. Click **Save**.

After creation:

- The event starts in **LEAD** status.
- The event appears on the calendar and in the events list.

> **Note:** Workflow templates are auto-attached only when events are created through booking flows, not when creating events manually. For manual events, select a workflow template in the form if needed.

## Event Detail Page

Click any event to open its detail page. The detail page provides a complete view of everything related to the event:

- **Event info header** -- status, client, date, event type

The event profile is organized into the following tabs:

- **Activity** -- chronological timeline of all activity on the event
- **Communications** -- record of messages sent to the client
- **Quotes** -- pricing proposals sent to the client
- **Contracts** -- agreements and signing status
- **Invoices** -- payment records and balances
- **Questionnaires** -- forms and questionnaires sent to or completed by the client
- **Files** -- uploaded documents and images
- **Notes** -- internal staff notes

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
