# Roles and Permissions

This article covers the permission system for admin users, including the full permission list, presets, special roles, and the process for inviting new admins.

## Permission List

| Permission | What It Controls |
|---|---|
| Manage Company Settings | Company profile, branding, contact information |
| Manage Admin Users | Invite new admins, edit other admin permissions |
| Manage Financial Settings | Currency, tax rates, payment terms |
| Manage Payment Gateways | Stripe and other payment gateway setup |
| Manage Workflows | Workflow templates and automation rules |
| Manage Booking Flows | Booking flow steps and settings |
| Manage Templates | Contract, email, and SMS templates |
| Export Data | Bulk CSV exports and reports |
| Delete Records | Permanent deletion of clients, events, and other records |

## Permission Presets

| Preset | Permissions |
|---|---|
| Full Admin | All permissions enabled |
| Limited Admin | All permissions disabled (view-only for settings, basic operations) |

## Special Roles

- **Superuser** -- automatically has all permissions regardless of the permissions JSON. Created via `python manage.py createsuperuser`.
- **Full Admin** -- regular admin with all permissions enabled.
- **Limited Admin** -- admin with no special permissions. Can still access the CRM, manage events, clients, quotes, and other day-to-day operations -- just cannot change system settings.

## Inviting a New Admin

1. Go to **Settings > Account Management > Admin Users**.
2. Click **Invite Admin**.
3. Enter: Email, First name, Last name, Permissions (select a preset or customize).
4. Click **Send Invitation**.
5. The invitee receives an email with a link to accept and set up their account.
6. The invitation expires in 7 days.
