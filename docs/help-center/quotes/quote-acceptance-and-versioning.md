# Quote Acceptance and Versioning

This article explains what happens when a client accepts a quote and how to handle revision requests through versioning.

## When a Client Accepts

A client can accept a quote through the client portal or an admin can record acceptance manually. When a quote is accepted, the following occurs automatically:

1. Quote status changes to **ACCEPTED**.
2. Event status changes to **CONFIRMED**.
3. The event's `accepted_quote` field is set to this quote.
4. A **contract is auto-generated** (if configured in the event's workflow).
5. An **invoice is auto-generated**.
6. The activity is logged on the event timeline.

## Quote Versioning

If a client requests changes to a sent quote, you do not edit the existing quote. Instead, create a new version:

- From the existing quote, create a **new version**. The system copies all line items and options to the new version automatically.
- Each version receives a unique **version number**.
- Only **one version** can be in SENT status at a time. Sending a new version supersedes the previous one.

This preserves a complete history of what was proposed and when, which is useful for audit trails and client communication.
