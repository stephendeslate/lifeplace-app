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

When a client starts a booking, they move through these steps:

1. **Select Event Type**
2. **Choose Date & Venue**
3. **Select Packages**
4. **Provide Details** -- questionnaire fields (guest count, preferences, contact info)
5. **Pricing Summary** -- review calculated price, apply discount codes, accept terms. Header text is configurable per booking flow (defaults to "Pricing Summary").
6. **Complete** -- submit booking request

### What Happens After Completion

- A new Event is created in LEAD status with lead_source = CLIENT_PORTAL.
- A Client user is created (or linked to an existing account) with the CLIENT role.
- completion_type records whether the submission was a payment completion or a quote request.
- Workflow automation begins (if configured for the event type).
- Admin staff are notified.

## Authenticated Client Pages

Once logged in, clients can:

- View their events and event status
- Review and accept or reject quotes
- View and sign contracts
- Make payments
- View VIP status (if enabled)
- Access privacy settings and consent management
