# Communication Records

Communication Records provide a complete history of all outbound messages sent through LifePlace, covering both email and SMS channels. Use this view to audit what was sent, troubleshoot delivery issues, or confirm that a client received a specific message.

## Viewing Communication History

Access the communication records page at `/records` to see every communication sent from the platform. Each record shows:

- **Recipient** — the client or contact who received the message
- **Channel** — whether the message was sent via email or SMS
- **Template used** — which communication template generated the message
- **Associated event and client** — links back to the relevant event and client for quick context
- **Delivery status** — the current state of the message (see below)

## Delivery Status

Every message moves through a delivery lifecycle:

| Status | Meaning |
|---|---|
| Pending | Message is queued and waiting to be sent |
| Sent | Message handed off to the delivery provider |
| Delivered | Confirmed received by the recipient's server |
| Failed | Delivery attempted but unsuccessful |
| Bounced | Recipient address was invalid or rejected |

When a message **fails**, LifePlace automatically retries delivery — up to **5 retries** in the delivery queue and **3 retries** at the Celery task level — before marking it as permanently failed.

## Statistics Cards

At the top of the records view, three statistics cards give you a quick overview of your communication health:

- **Total Communications** — the total number of communications sent
- **Delivered Today** — how many messages were successfully delivered today
- **Email Open Rate** — the percentage of delivered emails that have been opened

## Filtering and Search

Use the filters at the top of the records list to narrow results:

- **Template name** — search by the name of the communication template used
- **Channel** — filter by Email or SMS
- **Status** — filter by any delivery status (Pending, Sent, Delivered, Failed, Bounced)

## Bulk Send

You can send a communication to multiple clients at once using the **Bulk Send** feature. Select the recipients and template, and LifePlace queues individual messages for each client.

## Export

Export your communication records for external reporting or auditing. Use the **Export** option to download a file of the currently filtered records.

## Unsubscribe Tracking

LifePlace tracks client unsubscribe requests for compliance. When a client opts out of communications, their preference is recorded and future automated messages to that client are suppressed.

## Related Articles

- [Communication Templates](communication-templates.md)
- [Workflow Templates and Stages](../workflows/workflow-templates-and-stages.md)
- [Managing Notifications](../notifications/managing-notifications.md)
