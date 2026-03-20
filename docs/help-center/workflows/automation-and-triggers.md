# Automation Types and Triggers

Each workflow stage performs an action at a specified time. This article covers the available automation types, trigger timing options, stage chaining, and workflow webhooks.

## Automation Types

| Type | What It Does |
|---|---|
| EMAIL | Sends an email using the linked communication template |
| TASK | Creates a task assigned to staff |
| QUOTE | Generates a quote from a template |
| CONTRACT | Generates a contract from the linked contract template |
| QUESTIONNAIRE | Sends a questionnaire to the client |
| REMINDER | Sends a reminder notification |
| NOTIFICATION | Sends an in-app notification |

## Trigger Timing

| Format | Meaning | Example |
|---|---|---|
| ON_CREATION | Immediately when the stage starts | Welcome email on booking |
| AFTER_X_DAYS | X days after stage start (or after trigger_after_stage) | AFTER_3_DAYS -- follow up 3 days later |
| AFTER_X_HOURS | X hours after | AFTER_2_HOURS |
| AFTER_X_WEEKS | X weeks after | AFTER_1_WEEKS |
| X_DAYS_BEFORE_EVENT | X days before the event date | 30_DAYS_BEFORE_EVENT -- reminder 30 days out |

## Chaining Stages

Use **trigger_after_stage** to create dependencies between stages. This lets you sequence automations so that one stage waits for another to complete before firing.

**Example:** "Send contract 5 days after quote is accepted"

- **Stage A:** "Quote Accepted" (triggers on quote acceptance)
- **Stage B:** "Send Contract" with trigger_after_stage = Stage A and trigger_time = AFTER_5_DAYS

## Workflow Webhooks

In **Settings > Templates > Workflow Webhooks**, you can configure external webhook calls triggered by workflow events. This enables integration with external systems such as calendar services, accounting tools, or custom applications.
