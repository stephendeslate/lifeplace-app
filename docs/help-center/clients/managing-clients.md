# Managing Clients

## Viewing All Clients

Navigate to **Clients** in the top navigation bar to see a list of all clients in the system.

The client list displays:

- Name
- Email
- Phone number
- Number of events
- Last contact date

Use the search bar to find clients by name or email. Filters are available to narrow the list further.

## Creating a New Client

1. Click **+ New Client** (or navigate directly to `/clients/new`).
2. Fill in the following fields:
   - **Email** (required, must be unique) -- this becomes the client's login credential
   - **First Name**
   - **Last Name**
   - **Phone** (optional)
   - **Company** (optional)
3. Click **Save**.

Behind the scenes:

- A new user account is created with the role `CLIENT`.
- The client can be sent an invitation to access the Client Portal (via ClientInvitation).
- The email address becomes the client's username.

## Client Profile

Click any client in the list to open their profile. The profile page shows:

- Contact information
- Event history
- Payment history
- Communication log
- Notes
- VIP status (if enabled)

## Lead Sources

When creating events, you can track how clients found your venue. The available lead sources are:

| Lead Source    | Description                              |
| -------------- | ---------------------------------------- |
| Facebook       | Found via Facebook marketing or ads      |
| Referral       | Referred by an existing client or partner |
| Walk-in        | Visited the venue in person              |
| Client Portal  | Submitted a booking through the website  |
| Other          | Any other source                         |
