# Communication Templates

Communication templates let you define reusable email and SMS content with dynamic placeholders that are filled in automatically when a message is sent. Templates ensure consistent messaging across your team and save time on routine communications.

## Creating and Editing Templates

1. Navigate to **Settings > Template Management > Communication Templates**.
2. Click **+ New Template** to create a new template, or click an existing template to edit it.
3. Choose the **channel** (Email or SMS).
4. Select a **category** and **context type** (see tables below).
5. Write your content using variable placeholders where needed.
6. Click **Save**.

## Channel Types

Templates support two delivery channels: **Email** for rich formatted messages with layouts and branding, and **SMS** for short text-based notifications.

## Category Types

Each template belongs to a category that controls how it is used:

| Category | Purpose |
|---|---|
| System | Platform-generated messages (e.g., password resets, account confirmations) |
| Manual | Templates sent by staff on demand from within the platform |
| Auto | Triggered automatically by workflows or scheduled events |
| Marketing | Promotional content and campaign messages (not available in the UI category dropdown — used internally only) |

## Context Types

The context type determines the communication's purpose and which variable groups are available. The platform defines these context types:

| Context Type | Purpose |
|---|---|
| CLIENT | Client-related communications |
| EVENT | Event-related communications |
| BOOKING | Booking flow communications |
| QUOTE | Quote-related communications |
| CONTRACT | Contract-related communications |
| ADMIN | Admin notifications |
| NOTIFICATION | System notifications |
| MANUAL | Manually triggered communications |
| PAYMENT | Payment-related communications |
| INVOICE | Invoice-related communications |

## Template Variables

Variables are organized into **variable groups**. Each context type automatically receives the relevant groups, so you do not need to manage variable availability manually.

| Variable Group | Example Variables |
|---|---|
| client | Client name, email, phone |
| event | Event name, date, time, venue, guest count |
| financial | Totals, balances, line items |
| payment | Payment amount, method, date |
| invoice | Invoice number, due date, balance |
| booking | Booking reference, step details |
| quote | Quote total, expiration date, line items |
| contract | Contract terms, signing deadline |
| admin | Invitee name, email, invitation link, invited by, expiry date |
| notification | Notification type, message |
| system | Platform name, current date |
| company | Company name, address, contact info |
| urls | Portal links, action URLs |

Each context type maps to one or more variable groups via an `available_in` configuration. For example, the EVENT context receives the client, event, system, company, and urls groups automatically (the financial group is available in BOOKING, QUOTE, CONTRACT, PAYMENT, and INVOICE contexts — not EVENT).

## Preview and Send Test

Before sending, use the **Preview** feature to render your template with sample data. This lets you verify that variables are replaced correctly and the formatting looks right — without sending a real message.

You can also use the **Send Test** feature to deliver an actual test communication (email or SMS) to a specified recipient. This confirms end-to-end delivery, including layout rendering and variable substitution, in a real inbox.

## Email Layout Pairing

Each email template is linked to an **email layout** that wraps your content in consistent branding, including headers, footers, and styles. See [Email Layouts](email-layouts.md) for details on configuring layouts.

## Workflow Integration

Templates are used by workflow automation — when a workflow stage includes an email or questionnaire action, it pulls content from a linked communication template. This keeps your automated messages centrally managed and easy to update.

## Related Articles

- [Email Layouts](email-layouts.md)
- [Communication Records](communication-records.md)
- [Workflow Templates and Stages](../workflows/workflow-templates-and-stages.md)
