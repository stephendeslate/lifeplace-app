# What Clients See

This article covers every page clients can access on the portal, the step-by-step booking flow, and what authenticated clients can do after logging in.

## Public Pages (No Login Required)

| Page | URL | Content |
|---|---|---|
| Home | / | Landing page with venue highlights |
| About | /about | About LifePlace |
| Services | /services | Services offered |
| Rates | /rates | Package pricing and rates |
| Facilities | /facilities | Venue details and amenities |
| Gallery | /gallery | Photo gallery (managed in Settings) |
| Reviews | /reviews | Client testimonials |
| Contact | /contact | Contact information and inquiry form |
| Partner | /partner | Partnership opportunities |
| Podcasts | /podcasts | Podcast content |
| Booking | /booking | Client booking wizard |
| Privacy | /privacy | Privacy policy |
| Terms | /terms | Terms of service |

## The Client Booking Flow

When a client starts a booking, they move through a series of configurable steps. Each booking flow can be customized to include or exclude steps and reorder them as needed. The 10 available step types are:

1. **Introduction** — welcome message and overview
2. **Venue Selection** — choose the venue
3. **Date & Time** — select date and time
4. **Questionnaire** — fill out questionnaire fields (guest count, preferences, etc.)
5. **Package Selection** — choose packages
6. **Add-on Selection** — select optional add-ons
7. **Pricing Summary** — review calculated price, apply discount codes, accept terms (header text is configurable per booking flow)
8. **Contact Info** — provide contact details
9. **Payment Info** — enter payment information
10. **Confirmation** — submit booking request

Steps are configurable per booking flow — administrators can enable, disable, or reorder them in the booking flow settings.

### What Happens After Completion

- A new Event is created in LEAD status with lead_source = CLIENT_PORTAL.
- A Client user is created (or linked to an existing account) with the CLIENT role.
- completion_type records whether the submission was a payment completion or a quote request.
- Workflow automation begins (if configured for the event type).
- Admin staff are notified.

## Authenticated Client Pages

Once logged in, clients can access the following pages:

- **Dashboard** (/dashboard) — main landing page after login with an overview of upcoming events, pending actions, and VIP status (if enabled)
- **My Events** (/events) — view their events and event status; quotes and contracts are accessible as tabs within individual event detail pages
- **Payments & Invoices** (/payments) — make payments and view invoice history
- **Documents** (/documents) — access and download event-related documents (the /contracts route redirects here; individual contract details are available at /contracts/:id)
- **Records** (/records) — view communication records sent to them
- **Action Center** (/actions) — see pending actions that require their attention
- **My Profile** (/profile) — manage their account and contact information
- **Help & Support** (/help) — access help resources and submit support requests (redirects to /support)
