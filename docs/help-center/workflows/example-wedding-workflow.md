# Example: Standard Wedding Workflow

This example shows a complete workflow configuration for a standard wedding event. It covers all three phases -- LEAD, PRODUCTION, and POST_PRODUCTION -- with a mix of automation types.

## Workflow Stages

| Order | Stage | Phase | Automation | Timing |
|---|---|---|---|---|
| 1 | Welcome Email | LEAD | EMAIL | ON_CREATION |
| 2 | Follow-up Call Task | LEAD | TASK | AFTER_1_DAYS |
| 3 | Send Quote | LEAD | QUOTE | AFTER_3_DAYS |
| 4 | Quote Reminder | LEAD | REMINDER | AFTER_7_DAYS |
| 5 | Generate Contract | PRODUCTION | CONTRACT | ON_CREATION |
| 6 | Send Questionnaire | PRODUCTION | QUESTIONNAIRE | AFTER_1_DAYS |
| 7 | Pre-event Checklist | PRODUCTION | TASK | 7_DAYS_BEFORE_EVENT |
| 8 | Event Day Reminder | PRODUCTION | REMINDER | 1_DAYS_BEFORE_EVENT |
| 9 | Thank You Email | POST_PRODUCTION | EMAIL | AFTER_1_DAYS |
| 10 | Feedback Request | POST_PRODUCTION | QUESTIONNAIRE | AFTER_3_DAYS |

## How It Works

1. When a wedding inquiry comes in, the event is created in LEAD status. The workflow immediately sends a welcome email (stage 1) and assigns a follow-up call task for the next day (stage 2).
2. Three days after creation, a quote is automatically generated (stage 3). If the client has not responded after seven days, a reminder is sent (stage 4).
3. When the client accepts the quote, the event moves to CONFIRMED and the workflow advances to PRODUCTION. If Lead Stage Auto-Stop is enabled, any remaining LEAD automations (such as the quote reminder) are cancelled. A contract is generated immediately (stage 5), and a questionnaire is sent the following day (stage 6).
4. As the event date approaches, a pre-event checklist task is created seven days before (stage 7) and a reminder is sent one day before (stage 8).
5. After the event is marked complete, the workflow advances to POST_PRODUCTION. A thank-you email goes out the next day (stage 9), followed by a feedback questionnaire three days later (stage 10).
