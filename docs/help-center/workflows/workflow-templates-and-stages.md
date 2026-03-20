# Workflow Templates and Stages

Workflow templates define the automated sequence of actions that run throughout an event's lifecycle. Each template contains an ordered list of stages, and each stage defines a single automation step.

## Workflow Templates

Workflow templates are configured in **Settings > Template Management > Workflow Templates**. Each template has:

- **Name** -- a descriptive label (e.g., "Standard Wedding Workflow")
- **Description** -- optional text describing when and how the template should be used
- **Event Type** -- which event type this template applies to
- **Is Active** -- toggle to enable or disable the template without deleting it
- **Lead Stage Auto-Stop** -- when enabled, cancels remaining LEAD-stage automations when the event moves to PRODUCTION (prevents nurturing emails from being sent after a booking is confirmed)
- **Stages** -- an ordered list of automation steps

## Per-Event Workflow Overrides

In some cases, an individual event may need to deviate from its assigned workflow template. The **EventWorkflowOverride** model lets you customize workflow behavior on a per-event basis without modifying the shared template. Override types are: **SKIP** (skip a stage entirely), **DISABLE_AUTOMATION** (keep the stage but turn off its automation), **CUSTOM_TIMING** (adjust when a stage triggers), and **ADD_STAGE** (add an extra stage for this event only). Note that per-event workflow override management currently has no frontend UI -- the backend model exists but must be managed via the API.

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
| Trigger On Payment Received | Fire when a payment is recorded for the event |
| Trigger On Quote Accepted | Fire when the client accepts a quote |
| Trigger On Contract Signed | Fire when all required contract signatures are collected |
| Trigger On Event Created | Fire when a new event is created |
| Trigger On Quote Sent | Fire when a quote is sent to the client |
| Progression Condition | A single optional condition (CharField) that can be attached to a stage for informational or custom logic purposes |
| Email Template | The communication template used for EMAIL automation |
| Contract Template | The contract template used for CONTRACT automation |
| Questionnaire Template | The questionnaire template used for QUESTIONNAIRE automation |
| Task Description | Description text for TASK automation (defines the task to be created) |
