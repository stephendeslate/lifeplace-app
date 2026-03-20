# Settings Reference

Navigate to **Settings** to access the full configuration panel. Settings are organized into six groups. Some settings require specific admin permissions, noted in the descriptions below.

## Account Management

| Setting | Path | What It Does |
|---|---|---|
| Account Settings | `/settings/account/account-settings` | Personal profile, password, and timezone preferences |
| Admin Users | `/settings/account/admin-users` | Invite and manage admin accounts, set permissions (requires `can_manage_admins`) |
| Notifications | `/settings/account/notifications` | Configure notification preferences by category and delivery channel |
| Company Settings | `/settings/account/company-settings` | Company name, branding, contact info, and PDF letterhead (requires `can_manage_company_settings`) |
| Guided Tours | `/settings/account/guided-tours` | Restart interactive walkthroughs for platform features |
| Push Devices | `/settings/account/push-devices` | Manage devices registered for push notifications |

## Booking Configuration

| Setting | Path | What It Does |
|---|---|---|
| Booking Flow | `/settings/booking/booking-flow` | Configure the client-facing booking wizard -- steps, fields, and validation. Preview before publishing. (requires `can_manage_booking_flows`) |
| Event Types | `/settings/booking/event-types` | Create and manage event types with colors, images, and display order |

### Booking Flow Details

- Each booking flow has an ID and a configurable set of steps
- Steps control what information clients provide during the booking process
- Preview any flow at `/settings/booking/booking-flow/preview/<id>` before publishing
- Booking sessions are tracked with Redis for in-progress bookings

## Content

| Setting | Path | What It Does |
|---|---|---|
| Gallery | `/settings/content/gallery` | Upload and manage photos for the public website |

## Template Management

| Setting | Path | What It Does |
|---|---|---|
| Contract Templates | `/settings/templates/contract-templates` | Legal contract templates with variable placeholders and signature fields (requires `can_manage_templates`) |
| Questionnaire Templates | `/settings/templates/questionnaire-templates` | Client intake forms supporting text, number, date, time, yes/no, select, multi-select, email, phone, file upload, and guest count fields. Supports conditional display logic. (requires `can_manage_templates`) |
| Workflow Templates | `/settings/templates/workflow-templates` | Workflow automations with stages, triggers, and actions (requires `can_manage_workflows`) |
| Communication Templates | `/settings/templates/communication-templates` | Email and SMS templates with dynamic variable placeholders (requires `can_manage_templates`) |
| Email Layouts | `/settings/templates/email-layouts` | Branded email wrappers with headers, footers, theme colors, and logos (requires `can_manage_templates`) |
| Notification Types | `/settings/templates/notification-types` | Notification types with templates, priorities, and delivery channel configuration |

## Commerce

| Setting | Path | What It Does |
|---|---|---|
| Products & Packages | `/settings/commerce/products-packages` | Sellable items with flexible pricing models (FIXED, HOURLY, TIERED, CUSTOM) and units (PER_EVENT, PER_PERSON, PER_HOUR). Organized by categories. (requires `can_manage_financial_settings`) |
| Currency & Taxes | `/settings/commerce/currency-taxes` | Currency display format and tax rate configuration (e.g., 12% VAT). Set a default tax rate applied to new items. (requires `can_manage_financial_settings`) |
| Payments | `/settings/commerce/payments` | Stripe integration and payment gateway configuration. Manage accepted payment methods. (requires `can_manage_payment_gateways`) |
| Discount Codes | `/settings/commerce/discount-codes` | Promotional discount codes with percentage, fixed, or free hours types. Configure application modes (automatic, code-required, admin-only), validity dates, and usage limits. (requires `can_manage_financial_settings`) |
| Sales | `/settings/commerce/sales` | Quote templates, default terms, and sales pipeline settings |
| VIP & Loyalty | `/settings/commerce/vip-loyalty` | VIP program configuration -- tiers, earning methods (automatic, points, or manual), expiration rules, and client-facing visibility |

## Legal & Compliance

| Setting | Path | What It Does |
|---|---|---|
| Legal Documents | `/settings/legal/legal-documents` | Terms of Service and Privacy Policy displayed in the client portal |
