# Understanding the Booking Lifecycle

The complete end-to-end flow of a typical booking, from initial inquiry through post-event follow-up.

## Lifecycle Overview

```
CLIENT INQUIRY
     |
     v
+-----------------------------------------------------+
|  Event Status: LEAD  |  Workflow Phase: LEAD        |
|                                                     |
|  - Event created (manual or via client portal)      |
|  - Workflow starts: auto-emails, tasks assigned     |
|  - Admin creates & sends quote                      |
|  - 3-day follow-up reminder auto-scheduled          |
+----------------------+------------------------------+
                       |  Client accepts quote
                       v
+-----------------------------------------------------+
|  Event Status: CONFIRMED  |  Workflow: PRODUCTION   |
|                                                     |
|  - LEAD automations auto-cancelled (if auto-stop on) |
|  - Contract auto-generated (if quote template has    |
|  -   linked contract templates)                      |
|  - Invoice auto-generated                           |
|  - Date is blocked on calendar                      |
|  - Pre-event tasks and reminders fire               |
|  - Questionnaires sent to client                    |
+----------------------+------------------------------+
                       |  Event day passes
                       |  Admin marks complete
                       v
+-----------------------------------------------------+
|  Event Status: COMPLETED  |  Workflow: POST_PROD    |
|                                                     |
|  - Final payments collected                         |
|  - Post-event tasks (feedback, thank you email)     |
+-----------------------------------------------------+
```

**Note:** There is no separate "PRODUCTION" event status in the CRM. A CONFIRMED event is in the PRODUCTION workflow phase. See the [Event Status to Workflow Phase Mapping](../workflows/event-status-workflow-mapping.md) article in the Workflows collection for details.

**Note:** The "Lead Stage Auto-Stop" behavior (cancelling LEAD automations when entering PRODUCTION) is configurable per workflow template. If disabled, LEAD-stage automations will continue to run alongside PRODUCTION-stage automations.

## Key Automation Touchpoints

- **Quote acceptance triggers:** event confirmation, contract generation (if quote template has linked contract templates), invoice creation
- **Workflow stages trigger:** emails, tasks, reminders, questionnaires at configured times
- **Payment completion triggers:** event payment status update, receipt generation
