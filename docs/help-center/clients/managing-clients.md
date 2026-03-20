# Managing Clients

The Clients section is your central hub for managing all client information, from initial contact details to full event and payment history.

## Viewing All Clients

Navigate to **Clients** in the top navigation bar to see a list of all clients in the system.

The client list displays:

- Name
- Email
- Company
- Phone
- Status
- Registration
- Joined

Use the search bar to find clients by name or email. Filters are available to narrow the list further.

## Creating a New Client

1. Click **Add Client** from the client list.
2. Fill in the following fields:
   - **First Name** (required)
   - **Last Name** (required)
   - **Email** (required, must be unique) — this becomes the client's login credential
   - **Phone** (optional) — stored on the user's profile
   - **Company** (optional) — stored on the user's profile
3. Click **Save**.

Phone and Company are profile-level fields displayed as flat fields in the client form for convenience.

You also have the option to **Create Account Immediately** for the client at this stage, which provisions portal login credentials immediately.

A new account is created and the email address becomes the client's username for portal access.

## Editing and Deleting Clients

To **edit** a client, open their profile page and click **Edit**. Update any fields as needed and click **Save**.

To **delete** a client, open their profile and select **Delete** from the action menu. You will be asked to confirm before the record is removed. **Warning:** deleting a client will cascade-delete all associated events and related records (payments, contracts, etc.) due to the database relationship. This action cannot be undone. To retain history, use the **Active toggle** to deactivate the client instead of deleting them.

## Client Profile

Click any client in the list to open their profile. The profile page organizes information into the following tabs:

- **Activity** — recent activity related to the client
- **Events** — event history and upcoming events
- **Communications** — log of all messages sent to the client
- **Quotes** — quotes issued to the client
- **Contracts** — contracts associated with the client
- **Invoices** — invoice and payment history
- **Notes** — internal notes about the client

The client may also have VIP information visible on their profile if they are part of a VIP collection.

### Active Toggle

Each client has an **Active** toggle on their profile. Deactivating a client hides them from default list views without deleting their record.

### Import and Export

You can **import** clients in bulk from a file or **export** the client list for use in external tools. Look for the Import/Export options on the client list page.

## Client Portal Invitation

After creating a client, you can send them an invitation to access the **Client Portal**. The invitation email contains a secure link for the client to set their password and log in. From the portal, clients can view their upcoming events, download documents, and make online payments. You can resend the invitation at any time from the client's profile page.

## Lead Sources

Lead sources are set on **Events** during event creation (not on the Client record itself). They track how clients found your venue for each event. The available lead sources are:

| Lead Source | Description |
|---|---|
| Facebook | Found via Facebook marketing or ads |
| Referral | Referred by an existing client or partner |
| Walk-in | Visited the venue in person |
| Client Portal | Submitted a booking through the website |
| Other | Any other source |

## Related Articles

- [VIP & Loyalty Overview](../vip-loyalty/vip-loyalty-overview.md)
- [Client Portal](../client-portal/what-clients-see.md)
- [Notes](../events/notes.md)
