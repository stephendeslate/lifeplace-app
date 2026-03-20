# Event Status to Workflow Phase Mapping

Event statuses and workflow phases are related but different concepts. Event statuses are what you see in the CRM UI (LEAD, CONFIRMED, COMPLETED). Workflow phases are internal categories that group automation stages.

## Mapping Table

| Event Status | Workflow Phase | What Triggers the Transition |
|---|---|---|
| LEAD | LEAD | Event created -- LEAD automations begin immediately |
| CONFIRMED | PRODUCTION | Client accepts quote, event moves to CONFIRMED, workflow advances to PRODUCTION. Remaining LEAD automations are cancelled if Lead Stage Auto-Stop is enabled. |
| COMPLETED | POST_PRODUCTION | Event marked complete, workflow advances to POST_PRODUCTION |
| CANCELLED | (workflow stops) | Workflow does not advance; pending automations may be cancelled |

## Key Point

There is no "PRODUCTION" event status visible in the CRM. When you see an event listed as "CONFIRMED," its workflow is running PRODUCTION-phase automations (pre-event tasks, questionnaires, reminders). The PRODUCTION phase is purely a workflow concept, not a status you will encounter in the interface.

## Cross-Phase Transitions

Status transitions can also be triggered by:

- **Payment received** -- if a LEAD event receives a payment, the workflow can advance to PRODUCTION. This supports direct-payment bookings that skip the quote acceptance step.
