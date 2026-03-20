# Pre-Launch Checklist

Use this checklist to configure LifePlace before your venue goes live. Work through the essential items first, then the recommended items, and finally verify everything is working.

---

## Essential Setup (Must Do)

Complete all of these before accepting real bookings.

- [ ] **Create the first superuser** -- run `python manage.py createsuperuser` on the backend server
- [ ] **Invite all admin staff** -- Settings > Admin Users > Invite
- [ ] **Configure company settings** -- Settings > Company Settings (name, logo, contact info)
- [ ] **Set up event types** -- Settings > Booking > Event Types
- [ ] **Configure venues** -- ensure all venues are set up with operating rules (check-in/out times, capacity, ingress/egress)
- [ ] **Create products and packages** -- Settings > Commerce > Products & Packages
- [ ] **Set up tax rates** -- Settings > Commerce > Currency & Taxes (e.g., 12% VAT)
- [ ] **Configure payment gateways** -- Settings > Commerce > Payments (connect Stripe)
- [ ] **Create at least one contract template** -- Settings > Templates > Contract Templates
- [ ] **Create communication templates** -- Settings > Templates > Communication Templates
- [ ] **Set up at least one email layout** -- Settings > Templates > Email Layouts
- [ ] **Create a default booking flow** -- Settings > Booking > Booking Flow
- [ ] **Set up notification types** -- Settings > Templates > Notification Types

---

## Recommended Setup

These are not strictly required but will improve your team's workflow.

- [ ] **Create workflow templates** -- Settings > Templates > Workflow Templates
- [ ] **Create quote templates** -- Settings > Commerce > Sales
- [ ] **Create questionnaire templates** -- Settings > Templates > Questionnaire Templates
- [ ] **Configure VIP program** -- Settings > Commerce > VIP & Loyalty
- [ ] **Upload gallery photos** -- Settings > Content > Gallery
- [ ] **Review legal documents** -- Settings > Legal > Legal Documents
- [ ] **Test the booking flow** -- go through the client portal booking flow end-to-end
- [ ] **Set notification preferences** -- each admin should configure their own preferences
- [ ] **Run guided tours** -- Settings > Guided Tours

---

## Verify Before Going Live

Run through these checks to make sure everything is working correctly.

- [ ] **Send a test quote** -- create a test event, generate a quote, and send it to a test email address
- [ ] **Accept a test quote** -- verify that a contract and invoice are auto-generated when the quote is accepted
- [ ] **Process a test payment** -- if using Stripe, process a test payment to confirm the integration works
- [ ] **Verify email delivery** -- check that emails are received (check spam folders)
- [ ] **Test the client portal** -- navigate all public pages and submit a test booking request
- [ ] **Review admin permissions** -- ensure each staff member has the appropriate level of access

---

## After Going Live

Once you have verified everything:

1. Remove or archive any test events, clients, and payments created during verification.
2. Confirm that all staff have logged in and completed their account setup.
3. Monitor the Dashboard daily for the first week to catch any issues early.

---

## Related Articles

- [Setting Up Your Account](setting-up-your-account.md) -- account setup for individual staff members
- [Platform Overview](platform-overview.md) -- navigation reference for the admin CRM
