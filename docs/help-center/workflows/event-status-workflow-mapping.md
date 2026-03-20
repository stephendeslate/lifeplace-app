# Event Status to Workflow Phase Mapping

Event statuses and workflow phases are related but different concepts. Event statuses are what you see in the CRM UI (LEAD, CONFIRMED, COMPLETED). Workflow phases are internal categories that group automation stages.

## Mapping Table

| Event Status | Workflow Phase | What Triggers the Transition |
|---|---|---|
| LEAD | LEAD | Event created -- LEAD automations begin immediately |
| CONFIRMED | PRODUCTION | Client accepts quote, event moves to CONFIRMED, workflow advances to PRODUCTION. Remaining LEAD automations are cancelled if Lead Stage Auto-Stop is enabled. |
| COMPLETED | POST_PRODUCTION | Event marked complete, workflow advances to POST_PRODUCTION |
| CANCELLED | (workflow stops) | Workflow does not advance; pending automations may be cancelled. Note: CANCELLATION_REQUESTED is not an event status -- it is a timeline action type (EventTimeline.ACTION_CHOICES) that logs when a cancellation has been requested but not yet confirmed. |

## Key Point

There is no "PRODUCTION" event status visible in the CRM. When you see an event listed as "CONFIRMED," its workflow is running PRODUCTION-phase automations (pre-event tasks, questionnaires, reminders). The PRODUCTION phase is purely a workflow concept, not a status you will encounter in the interface.

## Cross-Phase Transitions

The LEAD to CONFIRMED status transition is triggered by **quote acceptance** -- specifically, `EventQuote.accept()` changes the event status to CONFIRMED. Payment received and contract signed events trigger **workflow stage progression** (advancing to the next stage within the current phase), not direct event status changes. The specific payment or contract conditions that advance stages are configurable per workflow template.
