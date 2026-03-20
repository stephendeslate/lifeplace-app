# Workflow Templates and Stages

Workflow templates define the automated sequence of actions that run throughout an event's lifecycle. Each template contains an ordered list of stages, and each stage defines a single automation step.

## Workflow Templates

Workflow templates are configured in **Settings > Templates > Workflow Templates**. Each template has:

- **Name** -- a descriptive label (e.g., "Standard Wedding Workflow")
- **Event Type** -- which event type this template applies to
- **Lead Stage Auto-Stop** -- when enabled, cancels remaining LEAD-stage automations when the event moves to PRODUCTION (prevents nurturing emails from being sent after a booking is confirmed)
- **Stages** -- an ordered list of automation steps

## Workflow Stages

Each stage defines one automation step within the workflow.

| Field | Description |
|---|---|
| Name | Descriptive name (e.g., "Send Welcome Email") |
| Stage | Pipeline phase: LEAD, PRODUCTION, or POST_PRODUCTION |
| Order | Execution order within the phase |
| Is Automated | Whether the stage runs automatically or requires manual action |
| Automation Type | What action to take |
| Trigger Time | When to execute |
| Trigger After Stage | Optional: wait for another stage to complete first |
