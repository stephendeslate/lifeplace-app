# Pre-Launch Checklist

Use this checklist to configure LifePlace before your venue goes live. Work through the essential items first, then the recommended items, and finally verify everything is working.

---

## Essential Setup (Must Do)

Complete all of these before accepting real bookings.

- [ ] **Create the first superuser** -- a developer or DevOps team member runs `python manage.py createsuperuser` on the backend server. This is a technical step that requires server access.
- [ ] **Invite all admin staff** -- Settings > Account Management > Admin Users > Invite
- [ ] **Configure company settings** -- Settings > Account Management > Company Settings (name, logo, contact info)
- [ ] **Set up event types** -- Settings > Booking Configuration > Event Types
- [ ] **Configure venues** -- go to Settings > Commerce > Products & Packages to set up venues with operating rules (check-in/out times, capacity, ingress/egress)
- [ ] **Create products and packages** -- Settings > Commerce > Products & Packages
- [ ] **Set up tax rates** -- Settings > Commerce > Currency & Taxes (e.g., 12% VAT)
- [ ] **Configure payment gateways** -- Settings > Commerce > Payments (connect Stripe)
- [ ] **Create at least one contract template** -- Settings > Template Management > Contract Templates
- [ ] **Create communication templates** -- Settings > Template Management > Communication Templates
- [ ] **Set up at least one email layout** -- Settings > Template Management > Email Layouts
- [ ] **Create a default booking flow** -- Settings > Booking Configuration > Booking Flow
- [ ] **Set up notification types** -- Settings > Template Management > Notification Types

---

## Recommended Setup

These are not strictly required but will improve your team's workflow.

- [ ] **Create workflow templates** -- Settings > Template Management > Workflow Templates
- [ ] **Create quote templates** -- Settings > Commerce > Sales
- [ ] **Create questionnaire templates** -- Settings > Template Management > Questionnaire Templates
- [ ] **Configure VIP program** -- Settings > Commerce > VIP & Loyalty
- [ ] **Upload gallery photos** -- Settings > Content > Gallery
- [ ] **Review legal documents** -- Settings > Legal & Compliance > Legal Documents
- [ ] **Test the booking flow** -- go through the client portal booking flow end-to-end
- [ ] **Set notification preferences** -- each admin should configure their own preferences
- [ ] **Run guided tours** -- Settings > Account Management > Guided Tours

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
