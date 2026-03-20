# Questionnaires Overview

Questionnaires let you collect structured information from clients at key points during the booking process. Whether you need dietary preferences for a wedding reception, technical requirements for a corporate event, or guest lists for seating arrangements, questionnaires ensure you gather the right details at the right time.

## How Questionnaires Work

Each questionnaire is tied to a booking and can be sent manually or triggered automatically through a workflow stage. Clients receive a link to complete the questionnaire from their portal. You can set due dates to keep things on track, and the system will flag overdue responses so nothing slips through the cracks.

## Field Types

Questionnaires support a range of field types to capture different kinds of information.

| Field Type | Description |
|------------|-------------|
| Text | Free-form short or long text |
| Number | Numeric values |
| Date | Calendar date picker |
| Time | Time of day picker |
| Boolean | Yes/No toggle |
| Select | Single choice from a dropdown |
| Multi-Select | Multiple choices from a list |
| Email | Email address with validation |
| Phone | Phone number with validation |
| File | File upload (documents, images) |
| Guests | Structured guest count with category breakdown |

## Status Flow

Questionnaires move through a clear progression as clients interact with them.

| Status | Meaning |
|--------|---------|
| Pending | Created but not yet delivered to the client |
| Sent | Delivered to the client, awaiting response |
| Partial | Client has started but not finished |
| Complete | All required fields have been submitted |

## Conditional Display Logic

Fields can be shown or hidden based on previous answers. For example, a "Dietary Restrictions" text field can appear only when a client selects "Yes" for "Any dietary needs?" This keeps questionnaires focused and avoids overwhelming clients with irrelevant questions.

## Due Dates and Overdue Tracking

Set a due date on any questionnaire to establish a deadline. The system automatically marks questionnaires as overdue when the deadline passes without completion, giving your team clear visibility into outstanding items.

## Activity Audit Trail

Every questionnaire maintains a full history of interactions. The system records seven action types: **CREATED**, **SENT**, **VIEWED**, **RESPONSE_ADDED**, **STATUS_CHANGED**, **REMINDER_SENT**, and **COMPLETED**. This trail helps your team understand exactly where things stand and when each step occurred.

## Related Articles

- [Questionnaire Templates](questionnaire-templates.md)
- [Workflow Templates and Stages](../workflows/workflow-templates-and-stages.md)
- [Booking Lifecycle](../booking-lifecycle/understanding-the-booking-lifecycle.md)
