# Creating and Sending Quotes

This article covers the full process of building a quote and delivering it to a client.

## Quote Lifecycle

Every quote moves through a defined set of statuses:

| Status | Meaning |
|---|---|
| DRAFT | Being prepared, not yet sent |
| SENT | Sent to client for review |
| ACCEPTED | Client accepted -- event moves to CONFIRMED |
| REJECTED | Client declined |
| EXPIRED | Validity period passed |

## Creating a Quote

From the event detail page:

1. Click **Create Quote** (or a quote may be auto-generated if a template is associated with the event).
2. Fill in the quote details:
   - **Line items** -- products, packages, and add-ons with quantities and unit prices
   - **Subtotal**, **Tax amount**, **Service charge** (if configured), **Discounts**, and **Total amount**
   - **Terms and conditions**
   - **Valid until** -- the expiration date for the quote (auto-capped to at least 1 day before the event date)
   - **Notes**
3. Click **Save** to save the quote as DRAFT.

## Quote Line Items

Each line item on a quote contains the following fields:

| Field | Description |
|---|---|
| Description | Product or package name |
| Quantity | Number of units |
| Unit Price | Price per unit |
| Tax Rate | Applicable tax percentage |
| Total | Calculated automatically (quantity x unit price) |
| Item Type | PACKAGE or ADDON |
| Excess Hours | If the booking exceeds included hours, tracks the overage |
| Excess Hour Price | Rate charged per excess hour |
| Venue Hours Breakdown | Per-venue detail of included vs. additional hours |

## Quote Options

When you want to present multiple package choices to a client, use quote options:

- Each **Quote Option** has a name, description, and total price.
- Each option contains its own set of **Option Items** with individual line-item detail.
- When the client accepts the quote, they select their preferred option.

This is useful when offering tiered packages (e.g., Standard vs. Premium) within a single quote.

## Sending a Quote

Once the quote is ready:

1. From the quote detail page, click **Send to Client**.
2. The system will:
   - Change the quote status to **SENT**
   - Send an email notification to the client with the quote details
   - Auto-schedule a **3-day follow-up reminder**
   - Log the activity on the event timeline
