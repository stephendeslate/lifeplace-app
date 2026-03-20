# Email Layouts

Email layouts provide branded wrappers for outbound emails. Each layout defines the visual structure that surrounds your email content, ensuring consistent branding across all communications.

## Managing Layouts

Navigate to **Settings > Templates > Email Layouts** to create and manage layouts.

## Layout Components

Each layout includes the following configurable sections:

| Component | Description |
|---|---|
| Header template | Branded header HTML displayed at the top of every email |
| Footer template | Footer with company information and unsubscribe link |
| Wrapper template | Content area wrapper -- must include the `{{ content }}` placeholder where the email body is inserted |
| Base styles | CSS applied to the entire email |
| Theme colors | Primary and secondary brand colors used throughout the layout |
| Logo URL | Company logo displayed in the header |

## Default Layout

One layout can be designated as the **default**. The default layout is automatically applied to any communication template that does not have a layout explicitly assigned. This ensures all emails have consistent branding even if a template author does not select a layout manually.
