# backend/core/domains/communications/context_service/constants.py
"""
Constants for the communication context service.

Contains ContextType, required objects mapping, variable groups
metadata, and timezone display constants.
"""

# Timezone display constant for email templates
# All event times are in Philippine Time (UTC+8, no DST)
PHILIPPINES_TZ_DISPLAY = "PHT"
PHILIPPINES_TZ_LONG = "Philippine Time (PHT)"
PHILIPPINES_TZ_OFFSET = "UTC+8"


class ContextType:
    """Context type constants for communication templates."""

    CLIENT = "CLIENT"
    EVENT = "EVENT"
    BOOKING = "BOOKING"
    QUOTE = "QUOTE"
    CONTRACT = "CONTRACT"
    ADMIN = "ADMIN"
    NOTIFICATION = "NOTIFICATION"
    MANUAL = "MANUAL"
    PAYMENT = "PAYMENT"
    INVOICE = "INVOICE"

    CHOICES = [
        (CLIENT, "Client"),
        (EVENT, "Event"),
        (BOOKING, "Booking"),
        (QUOTE, "Quote"),
        (CONTRACT, "Contract"),
        (ADMIN, "Admin"),
        (NOTIFICATION, "Notification"),
        (MANUAL, "Manual"),
        (PAYMENT, "Payment"),
        (INVOICE, "Invoice"),
    ]


# Required objects for each context type
REQUIRED_OBJECTS = {
    ContextType.CLIENT: ["client"],
    ContextType.EVENT: ["client", "event"],
    ContextType.BOOKING: ["client", "event", "booking_session"],
    ContextType.QUOTE: ["client", "event", "quote"],
    ContextType.CONTRACT: ["client", "event", "contract"],
    ContextType.ADMIN: ["user", "admin_invitation"],
    ContextType.NOTIFICATION: ["user", "notification"],
    ContextType.MANUAL: [],  # All optional
    ContextType.PAYMENT: ["client", "event", "payment"],
    ContextType.INVOICE: ["client", "event", "invoice"],
}


# Variable groups with metadata for UI organization
VARIABLE_GROUPS = {
    "client": {
        "label": "Client",
        "icon": "person",
        "available_in": [
            ContextType.CLIENT,
            ContextType.EVENT,
            ContextType.BOOKING,
            ContextType.QUOTE,
            ContextType.CONTRACT,
            ContextType.MANUAL,
            ContextType.PAYMENT,
            ContextType.INVOICE,
        ],
        "variables": {
            "client_name": {"description": "Full name of the client", "required": True},
            "client_first_name": {"description": "Client's first name", "required": True},
            "client_last_name": {"description": "Client's last name", "required": True},
            "client_email": {"description": "Client's email address", "required": True},
            "client_phone": {"description": "Client's phone number", "required": False},
            "client_company": {"description": "Client's company name", "required": False},
            "client_address": {"description": "Client's full address", "required": False},
        },
    },
    "event": {
        "label": "Event",
        "icon": "event",
        "available_in": [
            ContextType.EVENT,
            ContextType.BOOKING,
            ContextType.QUOTE,
            ContextType.CONTRACT,
            ContextType.MANUAL,
            ContextType.PAYMENT,
            ContextType.INVOICE,
        ],
        "variables": {
            "event_name": {"description": "Event name or title", "required": True},
            "event_type": {"description": "Type of event (Wedding, Corporate, etc.)", "required": True},
            "event_date": {"description": "Event date (Month Day, Year) in Philippine Time", "required": True},
            "event_date_short": {"description": "Event date (MM/DD/YYYY) in Philippine Time", "required": True},
            "event_time": {"description": "Event start time (HH:MM AM/PM PHT)", "required": True},
            "start_date": {"description": "Event start date", "required": True},
            "end_date": {"description": "Event end date", "required": False},
            "start_time": {"description": "Event start time", "required": True},
            "end_time": {"description": "Event end time", "required": False},
            "event_location": {"description": "Event venue or location", "required": False},
            "venue_name": {"description": "Venue name (alias for location)", "required": False},
            "guest_count": {"description": "Number of guests", "required": False},
            "days_until_event": {"description": "Days until event", "required": True},
            "event_duration": {"description": "Event duration in hours", "required": False},
        },
    },
    "financial": {
        "label": "Financial",
        "icon": "payments",
        "available_in": [
            ContextType.BOOKING,
            ContextType.QUOTE,
            ContextType.CONTRACT,
            ContextType.PAYMENT,
            ContextType.INVOICE,
        ],
        "variables": {
            "total_amount": {"description": "Total amount (numeric)", "required": True},
            "total_amount_formatted": {"description": "Total amount (currency formatted)", "required": True},
            "subtotal": {"description": "Subtotal before tax and discounts", "required": True},
            "tax_amount": {"description": "Tax amount", "required": False},
            "discount_amount": {"description": "Discount amount applied", "required": False},
            "deposit_percentage": {"description": "Deposit percentage required", "required": True},
            "deposit_amount": {"description": "Deposit amount", "required": True},
            "balance_amount": {"description": "Remaining balance after deposit", "required": True},
            "balance_due_date": {"description": "Date when balance is due", "required": False},
            "amount_paid": {"description": "Amount already paid", "required": True},
            "amount_due": {"description": "Amount currently due", "required": True},
        },
    },
    "payment": {
        "label": "Payment",
        "icon": "payment",
        "available_in": [ContextType.PAYMENT],
        "variables": {
            "payment_number": {"description": "Unique payment reference number", "required": True},
            "payment_amount": {"description": "Payment amount (numeric)", "required": True},
            "payment_amount_formatted": {"description": "Payment amount (formatted with currency)", "required": True},
            "payment_status": {"description": "Payment status (Completed, Pending, etc.)", "required": True},
            "payment_date": {"description": "Date payment was made (Philippine Time)", "required": False},
            "payment_due_date": {"description": "Payment due date (Philippine Time)", "required": True},
            "payment_method": {
                "description": "Payment method used (Credit Card, Bank Transfer, etc.)",
                "required": False,
            },
            "payment_method_last_four": {"description": "Last 4 digits of card/account", "required": False},
            "receipt_number": {"description": "Receipt reference number", "required": False},
            "receipt_link": {"description": "Link to download receipt PDF", "required": False},
            "transaction_id": {"description": "Gateway transaction ID", "required": False},
            "is_deposit": {"description": "Whether this is a deposit payment", "required": False},
            "remaining_balance": {"description": "Remaining balance after this payment", "required": False},
            "remaining_balance_formatted": {"description": "Remaining balance formatted", "required": False},
        },
    },
    "invoice": {
        "label": "Invoice",
        "icon": "receipt",
        "available_in": [ContextType.INVOICE, ContextType.PAYMENT],
        "variables": {
            "invoice_number": {"description": "Invoice ID/number", "required": True},
            "invoice_issue_date": {"description": "Invoice issue date (Philippine Time)", "required": True},
            "invoice_due_date": {"description": "Invoice due date (Philippine Time)", "required": True},
            "invoice_status": {"description": "Invoice status", "required": True},
            "invoice_subtotal": {"description": "Subtotal before tax", "required": True},
            "invoice_tax_amount": {"description": "Tax amount", "required": False},
            "invoice_total": {"description": "Total amount due", "required": True},
            "invoice_total_formatted": {"description": "Total formatted with currency", "required": True},
            "invoice_paid_amount": {"description": "Amount already paid", "required": True},
            "invoice_remaining": {"description": "Remaining amount due", "required": True},
            "invoice_remaining_formatted": {"description": "Remaining formatted", "required": True},
            "invoice_link": {"description": "Link to view/pay invoice online", "required": False},
            "invoice_pdf_link": {"description": "Link to download invoice PDF", "required": False},
            "line_items_summary": {"description": "Summary of invoice line items", "required": False},
            "payment_terms": {"description": "Payment terms text", "required": False},
        },
    },
    "booking": {
        "label": "Booking",
        "icon": "confirmation_number",
        "available_in": [ContextType.BOOKING],
        "variables": {
            "booking_reference": {"description": "Unique booking reference code", "required": True},
            "selected_packages": {"description": "List of selected packages", "required": True},
            "selected_addons": {"description": "List of selected add-ons", "required": False},
            "services_description": {"description": "Summary of booked services", "required": True},
        },
    },
    "quote": {
        "label": "Quote",
        "icon": "request_quote",
        "available_in": [ContextType.QUOTE],
        "variables": {
            "quote_id": {"description": "Quote ID number", "required": True},
            "quote_version": {"description": "Quote version number", "required": True},
            "quote_valid_until": {"description": "Quote expiration date", "required": True},
            "quote_link": {"description": "Link to view/accept quote", "required": False},
        },
    },
    "contract": {
        "label": "Contract",
        "icon": "description",
        "available_in": [ContextType.CONTRACT],
        "variables": {
            "contract_link": {"description": "Link to sign contract", "required": True},
            "signature_deadline": {"description": "Deadline to sign contract", "required": False},
            "contract_date": {"description": "Contract creation date", "required": True},
            "payment_terms": {"description": "Payment terms text", "required": True},
            "cancellation_policy": {"description": "Cancellation policy text", "required": True},
        },
    },
    "admin": {
        "label": "Admin",
        "icon": "admin_panel_settings",
        "available_in": [ContextType.ADMIN],
        "variables": {
            "first_name": {"description": "Invitee's first name", "required": True},
            "last_name": {"description": "Invitee's last name", "required": True},
            "email": {"description": "Invitee's email address", "required": True},
            "invitation_link": {"description": "Invitation acceptance URL", "required": True},
            "invited_by": {"description": "Name of person who sent invitation", "required": True},
            "expiry_date": {"description": "Invitation expiration date", "required": True},
        },
    },
    "notification": {
        "label": "Notification",
        "icon": "notifications",
        "available_in": [ContextType.NOTIFICATION],
        "variables": {
            "title": {"description": "Notification title", "required": True},
            "content": {"description": "Notification content/message", "required": True},
            "action_url": {"description": "Action link URL", "required": False},
            "notification_count": {"description": "Number of notifications (for digests)", "required": False},
            "frequency": {"description": "Digest frequency (Daily, Weekly)", "required": False},
        },
    },
    "system": {
        "label": "System",
        "icon": "settings",
        "available_in": [
            ContextType.CLIENT,
            ContextType.EVENT,
            ContextType.BOOKING,
            ContextType.QUOTE,
            ContextType.CONTRACT,
            ContextType.ADMIN,
            ContextType.NOTIFICATION,
            ContextType.MANUAL,
            ContextType.PAYMENT,
            ContextType.INVOICE,
        ],
        "variables": {
            "site_name": {"description": "Platform/site name", "required": True},
            "current_date": {"description": "Today's date", "required": True},
            "current_year": {"description": "Current year", "required": True},
            "support_email": {"description": "Support email address", "required": True},
            "reset_link": {"description": "Password reset URL (for password reset)", "required": False},
        },
    },
    "company": {
        "label": "Company",
        "icon": "business",
        "available_in": [
            ContextType.CLIENT,
            ContextType.EVENT,
            ContextType.BOOKING,
            ContextType.QUOTE,
            ContextType.CONTRACT,
            ContextType.ADMIN,
            ContextType.NOTIFICATION,
            ContextType.MANUAL,
            ContextType.PAYMENT,
            ContextType.INVOICE,
        ],
        "variables": {
            "company_name": {"description": "Official company name", "required": True},
            "company_tagline": {"description": "Company tagline/slogan", "required": False},
            "company_email": {"description": "Primary company email", "required": True},
            "company_phone": {"description": "Primary phone number", "required": False},
            "company_support_email": {"description": "Support email address", "required": True},
            "company_support_phone": {"description": "Support phone number", "required": False},
            "company_address": {"description": "Full formatted company address", "required": False},
            "company_city": {"description": "City", "required": False},
            "company_province": {"description": "Province/State", "required": False},
            "company_country": {"description": "Country", "required": False},
            "company_website": {"description": "Company website URL", "required": True},
            "company_facebook": {"description": "Facebook page URL", "required": False},
            "company_instagram": {"description": "Instagram profile URL", "required": False},
            "bank_name": {"description": "Bank name for payments", "required": False},
            "bank_account_name": {"description": "Bank account holder name", "required": False},
            "bank_account_number": {"description": "Bank account number", "required": False},
            "bank_branch": {"description": "Bank branch name", "required": False},
            "bank_swift_code": {"description": "SWIFT/BIC code", "required": False},
            "business_registration_number": {"description": "Business registration/TIN number", "required": False},
            "vat_number": {"description": "VAT registration number", "required": False},
            "invoice_terms": {"description": "Default invoice payment terms", "required": False},
        },
    },
    "urls": {
        "label": "Links",
        "icon": "link",
        "available_in": [
            ContextType.CLIENT,
            ContextType.EVENT,
            ContextType.BOOKING,
            ContextType.QUOTE,
            ContextType.CONTRACT,
            ContextType.ADMIN,
            ContextType.NOTIFICATION,
            ContextType.MANUAL,
            ContextType.PAYMENT,
            ContextType.INVOICE,
        ],
        "variables": {
            "dashboard_url": {"description": "Client dashboard URL", "required": True},
            "login_link": {"description": "Login page URL", "required": True},
            "support_link": {"description": "Support/help page URL", "required": True},
            "payments_link": {"description": "Payments portal URL", "required": True},
            "documents_link": {"description": "Documents page URL", "required": True},
            "profile_link": {"description": "Profile settings URL", "required": True},
            "terms_of_service_link": {"description": "Terms of Service URL", "required": True},
            "privacy_policy_link": {"description": "Privacy Policy URL", "required": True},
            "event_link": {"description": "Event detail page URL", "required": False},
            "event_timeline_link": {"description": "Event timeline tab URL", "required": False},
            "event_contracts_link": {"description": "Event contracts tab URL", "required": False},
            "event_quotes_link": {"description": "Event quotes tab URL", "required": False},
            "event_invoices_link": {"description": "Event invoices tab URL", "required": False},
            "event_questionnaires_link": {"description": "Event questionnaires tab URL", "required": False},
            "event_tasks_link": {"description": "Event tasks tab URL", "required": False},
        },
    },
}
