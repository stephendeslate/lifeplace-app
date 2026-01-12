# Payments Domain Enhancement Plan

## Status: PENDING

## Executive Summary

This plan addresses all identified gaps in the payments domain to create a cohesive, professional payment experience. The enhancements are organized into 6 phases with clear dependencies and implementation steps.

---

## Verified Gaps Summary

| # | Gap | Severity | Phase |
|---|-----|----------|-------|
| 1 | No PAYMENT/INVOICE context type in CommunicationContextService | Critical | 1 |
| 2 | No CompanySettings model for branding | Critical | 2 |
| 3 | Hardcoded PDF branding (logo, colors, address) | High | 3 |
| 4 | No autopay scheduler for installments | High | 4 |
| 5 | Workflow trigger flags not exposed in UI | Medium | 5 |
| 6 | No receipt email automation | Medium | 1 |
| 7 | No gateway health monitoring UI | Low | 6 |
| 8 | Invoice PDF missing detailed line items | Low | 3 |
| 9 | Currency hardcoding in PDFs | Low | 3 |

---

## Phase 1: Payment Communication Context

**Goal**: Enable payment-specific email templates with dynamic variables

**Dependencies**: None (foundational)

### 1.1 Add PAYMENT and INVOICE Context Types

**File**: `backend/core/domains/communications/context_service.py`

```python
# Add to ContextType class (after line 28)
class ContextType:
    CLIENT = 'CLIENT'
    EVENT = 'EVENT'
    BOOKING = 'BOOKING'
    QUOTE = 'QUOTE'
    CONTRACT = 'CONTRACT'
    ADMIN = 'ADMIN'
    NOTIFICATION = 'NOTIFICATION'
    MANUAL = 'MANUAL'
    PAYMENT = 'PAYMENT'      # NEW
    INVOICE = 'INVOICE'      # NEW

    CHOICES = [
        (CLIENT, 'Client'),
        (EVENT, 'Event'),
        (BOOKING, 'Booking'),
        (QUOTE, 'Quote'),
        (CONTRACT, 'Contract'),
        (ADMIN, 'Admin'),
        (NOTIFICATION, 'Notification'),
        (MANUAL, 'Manual'),
        (PAYMENT, 'Payment'),      # NEW
        (INVOICE, 'Invoice'),      # NEW
    ]
```

### 1.2 Add Required Objects for New Context Types

**File**: `backend/core/domains/communications/context_service.py`

```python
# Update REQUIRED_OBJECTS dict (after line 52)
REQUIRED_OBJECTS = {
    ContextType.CLIENT: ['client'],
    ContextType.EVENT: ['client', 'event'],
    ContextType.BOOKING: ['client', 'event', 'booking_session'],
    ContextType.QUOTE: ['client', 'event', 'quote'],
    ContextType.CONTRACT: ['client', 'event', 'contract'],
    ContextType.ADMIN: ['user', 'admin_invitation'],
    ContextType.NOTIFICATION: ['user', 'notification'],
    ContextType.MANUAL: [],
    ContextType.PAYMENT: ['client', 'event', 'payment'],      # NEW
    ContextType.INVOICE: ['client', 'event', 'invoice'],      # NEW
}
```

### 1.3 Add Payment Variable Group

**File**: `backend/core/domains/communications/context_service.py`

```python
# Add new variable group in VARIABLE_GROUPS dict (after "financial" group ~line 110)
"payment": {
    "label": "Payment",
    "icon": "payment",
    "available_in": [ContextType.PAYMENT],
    "variables": {
        "payment_number": {"description": "Unique payment reference number", "required": True},
        "payment_amount": {"description": "Payment amount (numeric)", "required": True},
        "payment_amount_formatted": {"description": "Payment amount (formatted with currency)", "required": True},
        "payment_status": {"description": "Payment status (Completed, Pending, etc.)", "required": True},
        "payment_date": {"description": "Date payment was made", "required": False},
        "payment_due_date": {"description": "Payment due date", "required": True},
        "payment_method": {"description": "Payment method used (Credit Card, Bank Transfer, etc.)", "required": False},
        "payment_method_last_four": {"description": "Last 4 digits of card/account", "required": False},
        "receipt_number": {"description": "Receipt reference number", "required": False},
        "receipt_link": {"description": "Link to download receipt PDF", "required": False},
        "transaction_id": {"description": "Gateway transaction ID", "required": False},
        "is_deposit": {"description": "Whether this is a deposit payment", "required": False},
        "is_installment": {"description": "Whether this is an installment payment", "required": False},
        "installment_number": {"description": "Installment number (e.g., 1 of 4)", "required": False},
        "remaining_balance": {"description": "Remaining balance after this payment", "required": False},
        "remaining_balance_formatted": {"description": "Remaining balance formatted", "required": False},
    }
},
"invoice": {
    "label": "Invoice",
    "icon": "receipt",
    "available_in": [ContextType.INVOICE, ContextType.PAYMENT],
    "variables": {
        "invoice_number": {"description": "Invoice ID/number", "required": True},
        "invoice_issue_date": {"description": "Invoice issue date", "required": True},
        "invoice_due_date": {"description": "Invoice due date", "required": True},
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
    }
},
"payment_plan": {
    "label": "Payment Plan",
    "icon": "calendar_month",
    "available_in": [ContextType.PAYMENT],
    "variables": {
        "plan_total_amount": {"description": "Total payment plan amount", "required": False},
        "plan_down_payment": {"description": "Down payment amount", "required": False},
        "plan_installments_count": {"description": "Number of installments", "required": False},
        "plan_frequency": {"description": "Payment frequency (Weekly, Monthly, etc.)", "required": False},
        "plan_next_payment_date": {"description": "Next payment due date", "required": False},
        "plan_next_payment_amount": {"description": "Next payment amount", "required": False},
        "plan_completion_percentage": {"description": "Percentage of plan completed", "required": False},
        "plan_remaining_installments": {"description": "Number of remaining installments", "required": False},
    }
},
```

### 1.4 Update available_in for Financial Group

**File**: `backend/core/domains/communications/context_service.py`

```python
# Update "financial" group available_in to include PAYMENT and INVOICE
"financial": {
    "label": "Financial",
    "icon": "payments",
    "available_in": [ContextType.BOOKING, ContextType.QUOTE, ContextType.CONTRACT,
                     ContextType.PAYMENT, ContextType.INVOICE],  # Added PAYMENT, INVOICE
    # ... rest unchanged
},
```

### 1.5 Add Payment Context Generation Method

**File**: `backend/core/domains/communications/context_service.py`

```python
# Add method to CommunicationContextService class (after _get_financial_context)

@staticmethod
def _get_payment_context(payment) -> Dict[str, Any]:
    """Get payment-related context variables."""
    from django.conf import settings

    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://lifeplacealfonso.com')

    # Format amount
    try:
        amount_formatted = payment.format_amount_with_currency()
    except Exception:
        currency_symbol = '₱' if payment.currency == 'PHP' else '$'
        amount_formatted = f"{currency_symbol}{payment.amount:,.2f}"

    # Payment method info
    method_name = ''
    method_last_four = ''
    if payment.payment_method:
        method_name = payment.payment_method.get_type_display()
        method_last_four = payment.payment_method.last_four or ''

    # Check if deposit/installment
    is_deposit = bool(payment.description and 'deposit' in payment.description.lower())
    is_installment = payment.installment is not None
    installment_info = ''
    if is_installment and payment.installment:
        installment_info = f"{payment.installment.installment_number} of {payment.installment.payment_plan.number_of_installments}"

    # Calculate remaining balance
    remaining_balance = Decimal('0')
    if payment.event:
        remaining_balance = (payment.event.total_amount_due or Decimal('0')) - (payment.event.total_amount_paid or Decimal('0'))

    # Receipt link
    receipt_link = ''
    if payment.status == 'COMPLETED' and payment.receipt_number:
        receipt_link = f"{frontend_url}/portal/payments/{payment.id}/receipt"

    # Transaction ID
    transaction_id = ''
    latest_transaction = payment.transactions.order_by('-created_at').first()
    if latest_transaction:
        transaction_id = latest_transaction.transaction_id or ''

    return {
        'payment_number': payment.payment_number,
        'payment_amount': str(payment.amount),
        'payment_amount_formatted': amount_formatted,
        'payment_status': payment.get_status_display(),
        'payment_date': payment.paid_on.strftime('%B %d, %Y') if payment.paid_on else '',
        'payment_due_date': payment.due_date.strftime('%B %d, %Y') if payment.due_date else '',
        'payment_method': method_name,
        'payment_method_last_four': method_last_four,
        'receipt_number': payment.receipt_number or '',
        'receipt_link': receipt_link,
        'transaction_id': transaction_id,
        'is_deposit': is_deposit,
        'is_installment': is_installment,
        'installment_number': installment_info,
        'remaining_balance': str(remaining_balance),
        'remaining_balance_formatted': f"₱{remaining_balance:,.0f}" if payment.currency == 'PHP' else f"${remaining_balance:,.2f}",
    }

@staticmethod
def _get_invoice_context(invoice) -> Dict[str, Any]:
    """Get invoice-related context variables."""
    from django.conf import settings

    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://lifeplacealfonso.com')
    currency_symbol = '₱' if invoice.currency == 'PHP' else '$'

    # Line items summary
    line_items = []
    for item in invoice.line_items.all():
        line_items.append(f"- {item.description}: {currency_symbol}{item.total:,.0f}")
    line_items_summary = '\n'.join(line_items) if line_items else 'No items'

    # Paid and remaining
    paid_amount = invoice.paid_amount or Decimal('0')
    remaining = invoice.remaining_amount or invoice.total_amount

    return {
        'invoice_number': invoice.invoice_id,
        'invoice_issue_date': invoice.issue_date.strftime('%B %d, %Y') if invoice.issue_date else '',
        'invoice_due_date': invoice.due_date.strftime('%B %d, %Y') if invoice.due_date else '',
        'invoice_status': invoice.get_status_display(),
        'invoice_subtotal': str(invoice.subtotal),
        'invoice_tax_amount': str(invoice.tax_amount),
        'invoice_total': str(invoice.total_amount),
        'invoice_total_formatted': f"{currency_symbol}{invoice.total_amount:,.0f}",
        'invoice_paid_amount': str(paid_amount),
        'invoice_remaining': str(remaining),
        'invoice_remaining_formatted': f"{currency_symbol}{remaining:,.0f}",
        'invoice_link': f"{frontend_url}/portal/invoices/{invoice.id}",
        'invoice_pdf_link': f"{frontend_url}/api/payments/client/invoices/{invoice.id}/download_pdf/",
        'line_items_summary': line_items_summary,
        'payment_terms': invoice.payment_terms or '',
    }

@staticmethod
def _get_payment_plan_context(payment) -> Dict[str, Any]:
    """Get payment plan context if payment is part of a plan."""
    if not payment.installment or not payment.installment.payment_plan:
        return {}

    plan = payment.installment.payment_plan
    currency_symbol = '₱' if plan.currency == 'PHP' else '$'

    # Get next pending installment
    next_installment = plan.installments.filter(status='PENDING').order_by('due_date').first()

    # Completion percentage
    paid_installments = plan.installments.filter(status='PAID').count()
    total_installments = plan.number_of_installments
    completion_pct = int((paid_installments / total_installments) * 100) if total_installments > 0 else 0

    return {
        'plan_total_amount': f"{currency_symbol}{plan.total_amount:,.0f}",
        'plan_down_payment': f"{currency_symbol}{plan.down_payment_amount:,.0f}",
        'plan_installments_count': str(plan.number_of_installments),
        'plan_frequency': plan.get_frequency_display(),
        'plan_next_payment_date': next_installment.due_date.strftime('%B %d, %Y') if next_installment else 'N/A',
        'plan_next_payment_amount': f"{currency_symbol}{next_installment.amount:,.0f}" if next_installment else 'N/A',
        'plan_completion_percentage': f"{completion_pct}%",
        'plan_remaining_installments': str(total_installments - paid_installments),
    }
```

### 1.6 Update generate_context Method

**File**: `backend/core/domains/communications/context_service.py`

```python
# Update generate_context method signature and body to accept payment and invoice
@classmethod
def generate_context(
    cls,
    context_type: str,
    client=None,
    event=None,
    booking_session=None,
    quote=None,
    contract=None,
    user=None,
    admin_invitation=None,
    notification=None,
    payment=None,        # NEW
    invoice=None,        # NEW
    validate: bool = True,
) -> Dict[str, Any]:
    # ... existing validation code ...

    # Add after contract context generation (~line 320):
    if payment:
        context.update(cls._get_payment_context(payment))
        context.update(cls._get_payment_plan_context(payment))

    if invoice:
        context.update(cls._get_invoice_context(invoice))

    # ... rest unchanged
```

### 1.7 Update validate_required_objects Method

**File**: `backend/core/domains/communications/context_service.py`

```python
# Update validate_required_objects to include payment and invoice parameters
@classmethod
def validate_required_objects(
    cls,
    context_type: str,
    client=None,
    event=None,
    booking_session=None,
    quote=None,
    contract=None,
    user=None,
    admin_invitation=None,
    notification=None,
    payment=None,        # NEW
    invoice=None,        # NEW
) -> None:
    required = cls.get_required_objects(context_type)
    provided = {
        'client': client,
        'event': event,
        'booking_session': booking_session,
        'quote': quote,
        'contract': contract,
        'user': user,
        'admin_invitation': admin_invitation,
        'notification': notification,
        'payment': payment,        # NEW
        'invoice': invoice,        # NEW
    }
    # ... rest unchanged
```

### 1.8 Create Default Payment Communication Templates

**File**: `backend/core/domains/communications/fixtures/payment_templates.json` (NEW FILE)

```json
[
  {
    "model": "communications.communicationtemplate",
    "fields": {
      "name": "Payment Received Confirmation",
      "channel": "EMAIL",
      "category": "AUTO",
      "context_type": "PAYMENT",
      "subject_template": "Payment Received - {{payment_number}} | LifePlace",
      "body_template": "Dear {{client_name}},\n\nThank you for your payment!\n\n**Payment Details:**\n- Payment Number: {{payment_number}}\n- Amount: {{payment_amount_formatted}}\n- Date: {{payment_date}}\n- Method: {{payment_method}}\n\n**Event Details:**\n- Event: {{event_name}}\n- Date: {{event_date}}\n- Venue: {{venue_name}}\n\n{% if remaining_balance and remaining_balance != '0' %}\n**Remaining Balance:** {{remaining_balance_formatted}}\n{% endif %}\n\n{% if receipt_link %}\nDownload your receipt: {{receipt_link}}\n{% endif %}\n\nThank you for choosing LifePlace!\n\nBest regards,\nThe LifePlace Team",
      "is_system": false
    }
  },
  {
    "model": "communications.communicationtemplate",
    "fields": {
      "name": "Payment Reminder",
      "channel": "EMAIL",
      "category": "AUTO",
      "context_type": "INVOICE",
      "subject_template": "Payment Reminder - Invoice {{invoice_number}} | LifePlace",
      "body_template": "Dear {{client_name}},\n\nThis is a friendly reminder that your payment is due.\n\n**Invoice Details:**\n- Invoice Number: {{invoice_number}}\n- Total Amount: {{invoice_total_formatted}}\n- Amount Paid: {{invoice_paid_amount}}\n- **Remaining Due: {{invoice_remaining_formatted}}**\n- Due Date: {{invoice_due_date}}\n\n**Event Details:**\n- Event: {{event_name}}\n- Date: {{event_date}}\n\nPay online: {{invoice_link}}\n\nIf you have already made this payment, please disregard this message.\n\nBest regards,\nThe LifePlace Team",
      "is_system": false
    }
  },
  {
    "model": "communications.communicationtemplate",
    "fields": {
      "name": "Payment Overdue Notice",
      "channel": "EMAIL",
      "category": "AUTO",
      "context_type": "INVOICE",
      "subject_template": "OVERDUE: Invoice {{invoice_number}} | LifePlace",
      "body_template": "Dear {{client_name}},\n\nYour payment is now overdue. Please make your payment as soon as possible to avoid any service interruptions.\n\n**Invoice Details:**\n- Invoice Number: {{invoice_number}}\n- Amount Due: {{invoice_remaining_formatted}}\n- Original Due Date: {{invoice_due_date}}\n\n**Event Details:**\n- Event: {{event_name}}\n- Date: {{event_date}}\n\nPay online now: {{invoice_link}}\n\nIf you have questions about this invoice, please contact us at {{support_email}}.\n\nBest regards,\nThe LifePlace Team",
      "is_system": false
    }
  },
  {
    "model": "communications.communicationtemplate",
    "fields": {
      "name": "Invoice Issued",
      "channel": "EMAIL",
      "category": "AUTO",
      "context_type": "INVOICE",
      "subject_template": "Invoice {{invoice_number}} - {{event_name}} | LifePlace",
      "body_template": "Dear {{client_name}},\n\nPlease find your invoice below.\n\n**Invoice Details:**\n- Invoice Number: {{invoice_number}}\n- Issue Date: {{invoice_issue_date}}\n- Due Date: {{invoice_due_date}}\n- Total Amount: {{invoice_total_formatted}}\n\n**Line Items:**\n{{line_items_summary}}\n\n**Event Details:**\n- Event: {{event_name}}\n- Date: {{event_date}}\n- Venue: {{venue_name}}\n\nView and pay online: {{invoice_link}}\nDownload PDF: {{invoice_pdf_link}}\n\n{{payment_terms}}\n\nThank you for choosing LifePlace!\n\nBest regards,\nThe LifePlace Team",
      "is_system": false
    }
  },
  {
    "model": "communications.communicationtemplate",
    "fields": {
      "name": "Installment Payment Reminder",
      "channel": "EMAIL",
      "category": "AUTO",
      "context_type": "PAYMENT",
      "subject_template": "Upcoming Installment Payment - {{event_name}} | LifePlace",
      "body_template": "Dear {{client_name}},\n\nThis is a reminder about your upcoming installment payment.\n\n**Payment Plan Status:**\n- Plan Progress: {{plan_completion_percentage}} complete\n- Remaining Installments: {{plan_remaining_installments}}\n\n**Next Payment:**\n- Amount: {{plan_next_payment_amount}}\n- Due Date: {{plan_next_payment_date}}\n\n**Event Details:**\n- Event: {{event_name}}\n- Date: {{event_date}}\n\nMake your payment: {{dashboard_url}}\n\nThank you for choosing LifePlace!\n\nBest regards,\nThe LifePlace Team",
      "is_system": false
    }
  },
  {
    "model": "communications.communicationtemplate",
    "fields": {
      "name": "Receipt Sent",
      "channel": "EMAIL",
      "category": "AUTO",
      "context_type": "PAYMENT",
      "subject_template": "Your Receipt - {{receipt_number}} | LifePlace",
      "body_template": "Dear {{client_name}},\n\nThank you for your payment. Your official receipt is attached.\n\n**Receipt Details:**\n- Receipt Number: {{receipt_number}}\n- Payment Number: {{payment_number}}\n- Amount: {{payment_amount_formatted}}\n- Date: {{payment_date}}\n\n**Event Details:**\n- Event: {{event_name}}\n- Date: {{event_date}}\n\nDownload receipt: {{receipt_link}}\n\nThank you for choosing LifePlace!\n\nBest regards,\nThe LifePlace Team",
      "is_system": false
    }
  }
]
```

### 1.9 Update CommunicationService to Use Payment Context

**File**: `backend/core/domains/communications/services/communication_service.py`

```python
# Update send_communication_by_template method to accept payment and invoice
@classmethod
def send_communication_by_template(
    cls,
    template_name: str,
    recipient_email: str,
    client=None,
    event=None,
    booking_session=None,
    quote=None,
    contract=None,
    user=None,
    admin_invitation=None,
    notification=None,
    payment=None,        # NEW
    invoice=None,        # NEW
    extra_context: Dict[str, Any] = None,
    sent_by=None,
    async_send: bool = False,
) -> Optional['CommunicationRecord']:
    """Send communication using a named template with appropriate context."""
    # ... existing code to get template ...

    # Generate context based on template's context_type
    context = CommunicationContextService.generate_context(
        context_type=template.context_type,
        client=client,
        event=event,
        booking_session=booking_session,
        quote=quote,
        contract=contract,
        user=user,
        admin_invitation=admin_invitation,
        notification=notification,
        payment=payment,        # NEW
        invoice=invoice,        # NEW
        validate=False,  # We'll handle missing context gracefully
    )

    # ... rest unchanged
```

### 1.10 Wire Up Payment Notifications

**File**: `backend/core/domains/payments/models.py`

Update the `complete_payment` method to send receipt email:

```python
# In Payment.complete_payment method, after receipt generation (~line 628)
def complete_payment(self, user=None):
    # ... existing code ...

    # After receipt generation, send receipt email
    if self.receipt_number and self.event and self.event.client:
        try:
            from core.domains.communications.services import CommunicationService
            CommunicationService.send_communication_by_template(
                template_name='Receipt Sent',
                recipient_email=self.event.client.email,
                client=self.event.client,
                event=self.event,
                payment=self,
                sent_by=user,
                async_send=True,
            )
        except Exception as e:
            logger.warning(f"Failed to send receipt email for payment {self.id}: {e}")
```

---

## Phase 2: Company Settings Model

**Goal**: Centralize company branding and business information

**Dependencies**: None

### 2.1 Create CompanySettings Model

**File**: `backend/core/domains/settings/models.py`

```python
# Add after MobileAppVersion class

class CompanySettings(BaseModel):
    """
    Centralized company/business information for branding and documents.
    Follows singleton pattern - only one instance allowed.
    """

    # Basic Information
    company_name = models.CharField(
        max_length=255,
        default='LifePlace Retreat & Events Center',
        help_text="Official company name"
    )
    company_tagline = models.CharField(
        max_length=255,
        blank=True,
        help_text="Company tagline or slogan"
    )

    # Logo and Branding
    logo = models.ImageField(
        upload_to='company/logos/',
        null=True,
        blank=True,
        help_text="Company logo (recommended: PNG, 300x100px)"
    )
    logo_dark = models.ImageField(
        upload_to='company/logos/',
        null=True,
        blank=True,
        help_text="Logo for dark backgrounds"
    )
    favicon = models.ImageField(
        upload_to='company/icons/',
        null=True,
        blank=True,
        help_text="Favicon (recommended: 32x32px PNG)"
    )

    # Brand Colors
    primary_color = models.CharField(
        max_length=7,
        default='#2c5aa0',
        help_text="Primary brand color (hex code)"
    )
    secondary_color = models.CharField(
        max_length=7,
        default='#1a365d',
        help_text="Secondary brand color (hex code)"
    )
    accent_color = models.CharField(
        max_length=7,
        default='#38a169',
        help_text="Accent color for highlights (hex code)"
    )

    # Contact Information
    email = models.EmailField(
        default='info@lifeplacealfonso.com',
        help_text="Primary contact email"
    )
    support_email = models.EmailField(
        default='support@lifeplacealfonso.com',
        help_text="Support email address"
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        help_text="Primary phone number"
    )
    phone_secondary = models.CharField(
        max_length=20,
        blank=True,
        help_text="Secondary phone number"
    )

    # Address
    address_line1 = models.CharField(
        max_length=255,
        blank=True,
        help_text="Street address line 1"
    )
    address_line2 = models.CharField(
        max_length=255,
        blank=True,
        help_text="Street address line 2"
    )
    city = models.CharField(
        max_length=100,
        default='Alfonso',
        help_text="City"
    )
    province = models.CharField(
        max_length=100,
        default='Cavite',
        help_text="Province/State"
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        help_text="Postal/ZIP code"
    )
    country = models.CharField(
        max_length=100,
        default='Philippines',
        help_text="Country"
    )

    # Business Registration
    business_registration_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Business registration/TIN number"
    )
    vat_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="VAT registration number"
    )

    # Online Presence
    website = models.URLField(
        default='https://lifeplacealfonso.com',
        help_text="Company website URL"
    )
    facebook_url = models.URLField(
        blank=True,
        help_text="Facebook page URL"
    )
    instagram_url = models.URLField(
        blank=True,
        help_text="Instagram profile URL"
    )

    # PDF/Document Settings
    pdf_footer_text = models.TextField(
        blank=True,
        default='Thank you for choosing LifePlace Retreat & Events Center!',
        help_text="Footer text for PDF documents"
    )
    invoice_terms = models.TextField(
        blank=True,
        help_text="Default invoice payment terms"
    )
    receipt_terms = models.TextField(
        blank=True,
        help_text="Terms printed on receipts"
    )

    # Bank Details (for invoices)
    bank_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Bank name for wire transfers"
    )
    bank_account_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Account holder name"
    )
    bank_account_number = models.CharField(
        max_length=50,
        blank=True,
        help_text="Bank account number"
    )
    bank_branch = models.CharField(
        max_length=100,
        blank=True,
        help_text="Bank branch"
    )
    bank_swift_code = models.CharField(
        max_length=20,
        blank=True,
        help_text="SWIFT/BIC code for international transfers"
    )

    class Meta:
        verbose_name = "Company Settings"
        verbose_name_plural = "Company Settings"

    def __str__(self):
        return f"Company Settings - {self.company_name}"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and CompanySettings.objects.exists():
            raise ValueError("Only one CompanySettings instance is allowed")
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton company settings instance."""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings

    def get_full_address(self):
        """Return formatted full address."""
        parts = [self.address_line1]
        if self.address_line2:
            parts.append(self.address_line2)
        parts.append(f"{self.city}, {self.province} {self.postal_code}".strip())
        parts.append(self.country)
        return '\n'.join(filter(None, parts))

    def get_logo_url(self):
        """Get the logo URL or None."""
        if self.logo:
            return self.logo.url
        return None

    def to_pdf_context(self):
        """Return context dict for PDF generation."""
        return {
            'company_name': self.company_name,
            'company_tagline': self.company_tagline,
            'logo_path': self.logo.path if self.logo else None,
            'primary_color': self.primary_color,
            'secondary_color': self.secondary_color,
            'email': self.email,
            'phone': self.phone,
            'website': self.website,
            'full_address': self.get_full_address(),
            'business_registration_number': self.business_registration_number,
            'vat_number': self.vat_number,
            'bank_name': self.bank_name,
            'bank_account_name': self.bank_account_name,
            'bank_account_number': self.bank_account_number,
            'bank_branch': self.bank_branch,
            'pdf_footer_text': self.pdf_footer_text,
            'invoice_terms': self.invoice_terms,
        }
```

### 2.2 Create Migration

```bash
cd backend
python manage.py makemigrations settings --name add_company_settings
python manage.py migrate
```

### 2.3 Create Serializer

**File**: `backend/core/domains/settings/serializers.py`

```python
# Add CompanySettingsSerializer

class CompanySettingsSerializer(serializers.ModelSerializer):
    full_address = serializers.CharField(source='get_full_address', read_only=True)
    logo_url = serializers.CharField(source='get_logo_url', read_only=True)

    class Meta:
        model = CompanySettings
        fields = [
            'id',
            'company_name',
            'company_tagline',
            'logo',
            'logo_url',
            'logo_dark',
            'favicon',
            'primary_color',
            'secondary_color',
            'accent_color',
            'email',
            'support_email',
            'phone',
            'phone_secondary',
            'address_line1',
            'address_line2',
            'city',
            'province',
            'postal_code',
            'country',
            'full_address',
            'business_registration_number',
            'vat_number',
            'website',
            'facebook_url',
            'instagram_url',
            'pdf_footer_text',
            'invoice_terms',
            'receipt_terms',
            'bank_name',
            'bank_account_name',
            'bank_account_number',
            'bank_branch',
            'bank_swift_code',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_address', 'logo_url']


class PublicCompanySettingsSerializer(serializers.ModelSerializer):
    """Public-facing company settings (excludes sensitive info)."""
    full_address = serializers.CharField(source='get_full_address', read_only=True)
    logo_url = serializers.CharField(source='get_logo_url', read_only=True)

    class Meta:
        model = CompanySettings
        fields = [
            'company_name',
            'company_tagline',
            'logo_url',
            'primary_color',
            'secondary_color',
            'accent_color',
            'email',
            'phone',
            'full_address',
            'website',
            'facebook_url',
            'instagram_url',
        ]
```

### 2.4 Create ViewSet

**File**: `backend/core/domains/settings/views.py`

```python
# Add CompanySettingsViewSet

class CompanySettingsViewSet(viewsets.ViewSet):
    """
    Singleton ViewSet for company settings.
    Only GET and PUT/PATCH operations (no create/delete).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def list(self, request):
        """Get company settings."""
        settings = CompanySettings.get_settings()
        serializer = CompanySettingsSerializer(settings)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        """Update company settings."""
        settings = CompanySettings.get_settings()
        serializer = CompanySettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PublicCompanySettingsViewSet(viewsets.ViewSet):
    """Public company settings for client-facing apps."""
    permission_classes = [AllowAny]

    def list(self, request):
        """Get public company settings."""
        settings = CompanySettings.get_settings()
        serializer = PublicCompanySettingsSerializer(settings)
        return Response(serializer.data)
```

### 2.5 Add URL Routes

**File**: `backend/core/domains/settings/urls.py`

```python
# Add routes
router.register(r'company', CompanySettingsViewSet, basename='company-settings')
router.register(r'public/company', PublicCompanySettingsViewSet, basename='public-company-settings')
```

### 2.6 Frontend: Add Types

**File**: `frontend/admin-crm/src/types/settings.types.ts`

```typescript
export interface CompanySettings {
  id: number;
  company_name: string;
  company_tagline: string;
  logo: string | null;
  logo_url: string | null;
  logo_dark: string | null;
  favicon: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  email: string;
  support_email: string;
  phone: string;
  phone_secondary: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  full_address: string;
  business_registration_number: string;
  vat_number: string;
  website: string;
  facebook_url: string;
  instagram_url: string;
  pdf_footer_text: string;
  invoice_terms: string;
  receipt_terms: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  bank_swift_code: string;
  created_at: string;
  updated_at: string;
}
```

### 2.7 Frontend: Add API Functions

**File**: `frontend/admin-crm/src/apis/settings.api.ts`

```typescript
export const fetchCompanySettings = async (): Promise<CompanySettings> => {
  const response = await apiClient.get('/settings/company/');
  return response.data;
};

export const updateCompanySettings = async (
  data: Partial<CompanySettings>
): Promise<CompanySettings> => {
  const response = await apiClient.patch('/settings/company/1/', data);
  return response.data;
};

export const uploadCompanyLogo = async (file: File): Promise<CompanySettings> => {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await apiClient.patch('/settings/company/1/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
```

### 2.8 Frontend: Create Company Settings Page

**File**: `frontend/admin-crm/src/pages/settings/company/CompanySettings.tsx` (NEW)

Create a new settings page with sections for:
- Company Information (name, tagline)
- Branding (logo upload, colors with color picker)
- Contact Information (email, phone)
- Address
- Business Registration
- Social Media Links
- PDF/Document Settings (footer text, terms)
- Bank Details

---

## Phase 3: Dynamic PDF Branding

**Goal**: Generate PDFs with configurable company branding

**Dependencies**: Phase 2 (CompanySettings model)

### 3.1 Create Shared PDF Branding Utility

**File**: `backend/core/utils/pdf_branding.py` (NEW)

```python
"""
Shared PDF branding utilities.
Pulls branding from CompanySettings and provides consistent styling across all PDFs.
"""

import io
import logging
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.units import inch
from reportlab.platypus import Image, Paragraph, Spacer, Table, TableStyle

logger = logging.getLogger(__name__)


class PDFBrandingService:
    """Service for generating branded PDF elements."""

    _cached_settings = None

    @classmethod
    def get_company_settings(cls):
        """Get company settings with caching."""
        if cls._cached_settings is None:
            from core.domains.settings.models import CompanySettings
            cls._cached_settings = CompanySettings.get_settings()
        return cls._cached_settings

    @classmethod
    def invalidate_cache(cls):
        """Invalidate cached settings (call when settings are updated)."""
        cls._cached_settings = None

    @classmethod
    def get_brand_colors(cls):
        """Get brand colors from settings."""
        settings = cls.get_company_settings()
        return {
            'primary': colors.HexColor(settings.primary_color),
            'secondary': colors.HexColor(settings.secondary_color),
            'accent': colors.HexColor(settings.accent_color),
        }

    @classmethod
    def get_styles(cls):
        """Get branded paragraph styles."""
        brand = cls.get_brand_colors()
        base_styles = getSampleStyleSheet()

        return {
            'title': ParagraphStyle(
                'BrandedTitle',
                parent=base_styles['Heading1'],
                fontSize=20,
                spaceAfter=30,
                alignment=TA_CENTER,
                textColor=brand['primary']
            ),
            'subtitle': ParagraphStyle(
                'BrandedSubtitle',
                parent=base_styles['Heading2'],
                fontSize=14,
                spaceAfter=20,
                textColor=brand['primary']
            ),
            'body': ParagraphStyle(
                'BrandedBody',
                parent=base_styles['Normal'],
                fontSize=10,
                spaceAfter=12,
                alignment=TA_JUSTIFY,
            ),
            'small': ParagraphStyle(
                'BrandedSmall',
                parent=base_styles['Normal'],
                fontSize=8,
                textColor=colors.grey,
                alignment=TA_LEFT
            ),
            'header_right': ParagraphStyle(
                'BrandedHeaderRight',
                parent=base_styles['Normal'],
                fontSize=12,
                textColor=brand['primary'],
                alignment=TA_RIGHT
            ),
        }

    @classmethod
    def get_table_style(cls, has_header=True):
        """Get branded table style."""
        brand = cls.get_brand_colors()

        style_commands = [
            # Data rows
            ('FONTNAME', (0, 1 if has_header else 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1 if has_header else 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
        ]

        if has_header:
            style_commands.extend([
                ('BACKGROUND', (0, 0), (-1, 0), brand['primary']),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ])

        return TableStyle(style_commands)

    @classmethod
    def create_header(cls, title: str) -> list:
        """Create branded document header with logo and title."""
        settings = cls.get_company_settings()
        styles = cls.get_styles()
        elements = []

        # Logo (if available)
        if settings.logo and hasattr(settings.logo, 'path'):
            try:
                logo = Image(settings.logo.path, width=2*inch, height=0.75*inch)
                logo.hAlign = 'CENTER'
                elements.append(logo)
                elements.append(Spacer(1, 10))
            except Exception as e:
                logger.warning(f"Failed to load logo: {e}")

        # Company name
        elements.append(Paragraph(settings.company_name, styles['title']))

        # Document title
        elements.append(Paragraph(title, styles['subtitle']))
        elements.append(Spacer(1, 20))

        return elements

    @classmethod
    def create_footer(cls) -> list:
        """Create branded document footer."""
        settings = cls.get_company_settings()
        styles = cls.get_styles()
        elements = []

        elements.append(Spacer(1, 40))

        # Footer text
        if settings.pdf_footer_text:
            elements.append(Paragraph(settings.pdf_footer_text, styles['header_right']))

        # Contact info
        contact_parts = []
        if settings.email:
            contact_parts.append(settings.email)
        if settings.phone:
            contact_parts.append(settings.phone)
        if settings.website:
            contact_parts.append(settings.website)

        if contact_parts:
            elements.append(Paragraph(' | '.join(contact_parts), styles['small']))

        # Address
        if settings.get_full_address():
            elements.append(Paragraph(settings.get_full_address().replace('\n', ' | '), styles['small']))

        return elements

    @classmethod
    def create_bank_details_section(cls) -> list:
        """Create bank details section for invoices."""
        settings = cls.get_company_settings()
        styles = cls.get_styles()

        if not settings.bank_name:
            return []

        elements = []
        elements.append(Paragraph("Bank Details for Wire Transfer", styles['subtitle']))

        bank_data = [
            ['Bank Name:', settings.bank_name],
            ['Account Name:', settings.bank_account_name],
            ['Account Number:', settings.bank_account_number],
        ]

        if settings.bank_branch:
            bank_data.append(['Branch:', settings.bank_branch])

        if settings.bank_swift_code:
            bank_data.append(['SWIFT Code:', settings.bank_swift_code])

        bank_table = Table(bank_data, colWidths=[2*inch, 4*inch])
        bank_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), cls.get_brand_colors()['primary']),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        elements.append(bank_table)
        elements.append(Spacer(1, 20))

        return elements

    @classmethod
    def format_currency(cls, amount, currency='PHP'):
        """Format currency amount using CurrencySettings."""
        try:
            from core.domains.settings.models import CurrencySettings
            settings = CurrencySettings.get_system_settings()
            return settings.format_amount(amount, currency)
        except Exception:
            # Fallback
            symbol = '₱' if currency == 'PHP' else '$'
            return f"{symbol}{amount:,.2f}"
```

### 3.2 Update Payment Receipt PDF Service

**File**: `backend/core/domains/payments/pdf_service.py`

Refactor to use `PDFBrandingService`:

```python
# Replace hardcoded styles with:
from core.utils.pdf_branding import PDFBrandingService

class PaymentReceiptPDFService:
    @staticmethod
    def generate_receipt_pdf(payment):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, ...)

        story = []

        # Use branded header
        story.extend(PDFBrandingService.create_header("PAYMENT RECEIPT"))

        # ... existing receipt content using PDFBrandingService.get_styles() ...

        # Use branded footer
        story.extend(PDFBrandingService.create_footer())

        doc.build(story)
        buffer.seek(0)
        return buffer
```

### 3.3 Update Invoice PDF Service

Same pattern as 3.2, also add bank details section for invoices.

### 3.4 Update Contract PDF Service

Same pattern as 3.2.

### 3.5 Update Quote PDF Service

Same pattern as 3.2.

### 3.6 Add Cache Invalidation Signal

**File**: `backend/core/domains/settings/signals.py`

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CompanySettings

@receiver(post_save, sender=CompanySettings)
def invalidate_pdf_branding_cache(sender, instance, **kwargs):
    """Invalidate PDF branding cache when company settings change."""
    from core.utils.pdf_branding import PDFBrandingService
    PDFBrandingService.invalidate_cache()
```

---

## Phase 4: Autopay Scheduler for Installments

**Goal**: Automatically charge saved payment methods for installment due dates

**Dependencies**: None (uses existing PaymentPlan infrastructure)

### 4.1 Create Autopay Service

**File**: `backend/core/domains/payments/services/autopay_service.py` (NEW)

```python
"""
Autopay service for automatic installment payment processing.
"""

import logging
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from core.domains.payments.models import (
    PaymentPlan, PaymentInstallment, Payment, PaymentSettings
)
from core.domains.payments.services.payment_gateway_service import PaymentGatewayService
from core.domains.payments.services.payment_orchestrator import PaymentOrchestrator, PaymentRequest

logger = logging.getLogger(__name__)


class AutopayService:
    """Service for processing automatic installment payments."""

    @classmethod
    def get_due_autopay_installments(cls, days_ahead: int = 0):
        """
        Get installments due for autopay processing.

        Args:
            days_ahead: Number of days ahead to include (0 = today only)

        Returns:
            QuerySet of PaymentInstallment objects eligible for autopay
        """
        today = timezone.now().date()
        due_date_cutoff = today + timedelta(days=days_ahead)

        return PaymentInstallment.objects.filter(
            status='PENDING',
            due_date__lte=due_date_cutoff,
            payment_plan__auto_payment_enabled=True,
            payment_plan__auto_payment_method__isnull=False,
            payment_plan__status='ACTIVE',
        ).select_related(
            'payment_plan',
            'payment_plan__event',
            'payment_plan__event__client',
            'payment_plan__auto_payment_method',
            'payment_plan__auto_payment_method__gateway',
        )

    @classmethod
    @transaction.atomic
    def process_autopay_installment(cls, installment: PaymentInstallment) -> dict:
        """
        Process a single autopay installment.

        Args:
            installment: PaymentInstallment to process

        Returns:
            dict with 'success', 'payment_id', 'error' keys
        """
        plan = installment.payment_plan
        payment_method = plan.auto_payment_method
        event = plan.event

        logger.info(f"Processing autopay for installment {installment.id} "
                   f"(plan {plan.id}, event {event.id})")

        if not payment_method:
            return {
                'success': False,
                'payment_id': None,
                'error': 'No payment method configured for autopay'
            }

        if not payment_method.gateway:
            return {
                'success': False,
                'payment_id': None,
                'error': 'Payment method has no associated gateway'
            }

        try:
            # Create payment request
            payment_request = PaymentRequest(
                event_id=event.id,
                amount=installment.amount,
                currency=plan.currency,
                due_date=installment.due_date,
                payment_type='INSTALLMENT',
                installment_id=installment.id,
                auto_process=True,
                gateway_code=payment_method.gateway.code,
                payment_method_id=payment_method.id,
                metadata={
                    'autopay': True,
                    'installment_number': installment.installment_number,
                    'plan_id': plan.id,
                }
            )

            # Create and process payment
            response = PaymentOrchestrator.create_payment(payment_request)

            if response.success:
                # Update installment status
                installment.status = 'PAID'
                installment.save()

                # Check if plan is complete
                from core.domains.payments.services.payment_plan_service import PaymentPlanService
                PaymentPlanService.complete_plan_if_balance_paid(plan.id)

                logger.info(f"Autopay successful for installment {installment.id}, "
                           f"payment {response.payment_id}")

                return {
                    'success': True,
                    'payment_id': response.payment_id,
                    'error': None
                }
            else:
                # Handle failure
                cls._handle_autopay_failure(installment, response.error_details)

                return {
                    'success': False,
                    'payment_id': None,
                    'error': response.error_details
                }

        except Exception as e:
            logger.error(f"Autopay error for installment {installment.id}: {str(e)}")
            cls._handle_autopay_failure(installment, str(e))

            return {
                'success': False,
                'payment_id': None,
                'error': str(e)
            }

    @classmethod
    def _handle_autopay_failure(cls, installment: PaymentInstallment, error: str):
        """Handle autopay failure with retry logic."""
        settings = PaymentSettings.get_default_settings()
        max_retries = settings.auto_payment_retry_attempts

        # Track retry in installment metadata or separate model
        current_retries = installment.metadata.get('autopay_retries', 0) if installment.metadata else 0

        if current_retries >= max_retries:
            # Max retries reached - mark installment as overdue and disable autopay
            installment.status = 'OVERDUE'
            logger.warning(f"Autopay max retries reached for installment {installment.id}")

            # Send notification to client
            cls._send_autopay_failure_notification(installment, error, final=True)
        else:
            # Schedule retry
            if installment.metadata is None:
                installment.metadata = {}
            installment.metadata['autopay_retries'] = current_retries + 1
            installment.metadata['last_autopay_error'] = error
            installment.metadata['last_autopay_attempt'] = timezone.now().isoformat()

            # Send retry notification
            cls._send_autopay_failure_notification(installment, error, final=False)

        installment.save()

    @classmethod
    def _send_autopay_failure_notification(cls, installment, error: str, final: bool):
        """Send notification about autopay failure."""
        try:
            from core.domains.communications.services import CommunicationService

            template_name = 'Autopay Failed - Final Notice' if final else 'Autopay Failed - Retry Scheduled'

            plan = installment.payment_plan
            event = plan.event
            client = event.client

            # For now, log since we don't have the template yet
            logger.info(f"Would send {template_name} notification to {client.email}")

            # TODO: Uncomment when template is created
            # CommunicationService.send_communication_by_template(
            #     template_name=template_name,
            #     recipient_email=client.email,
            #     client=client,
            #     event=event,
            #     payment=None,  # No payment created
            #     extra_context={
            #         'error': error,
            #         'installment_number': installment.installment_number,
            #         'amount': str(installment.amount),
            #     },
            #     async_send=True,
            # )
        except Exception as e:
            logger.error(f"Failed to send autopay failure notification: {e}")

    @classmethod
    def process_all_due_autopay(cls, days_ahead: int = 0) -> dict:
        """
        Process all due autopay installments.

        Args:
            days_ahead: Include installments due within X days

        Returns:
            dict with 'processed', 'successful', 'failed', 'errors' keys
        """
        installments = cls.get_due_autopay_installments(days_ahead)

        results = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }

        for installment in installments:
            results['processed'] += 1
            result = cls.process_autopay_installment(installment)

            if result['success']:
                results['successful'] += 1
            else:
                results['failed'] += 1
                results['errors'].append({
                    'installment_id': installment.id,
                    'error': result['error']
                })

        logger.info(f"Autopay batch complete: {results['processed']} processed, "
                   f"{results['successful']} successful, {results['failed']} failed")

        return results
```

### 4.2 Create Celery Task for Autopay

**File**: `backend/core/domains/payments/tasks.py`

```python
# Add autopay tasks

from celery import shared_task

@shared_task(name='payments.process_autopay')
def process_autopay_task():
    """
    Daily task to process autopay installments.
    Should be scheduled to run early morning (e.g., 6 AM).
    """
    from core.domains.payments.services.autopay_service import AutopayService

    # Process today's due payments
    results = AutopayService.process_all_due_autopay(days_ahead=0)

    return results


@shared_task(name='payments.process_autopay_retry')
def process_autopay_retry_task():
    """
    Task to retry failed autopay attempts.
    Should be scheduled to run multiple times per day.
    """
    from core.domains.payments.services.autopay_service import AutopayService
    from core.domains.payments.models import PaymentSettings, PaymentInstallment
    from django.utils import timezone
    from datetime import timedelta

    settings = PaymentSettings.get_default_settings()
    retry_delay_days = settings.auto_payment_retry_delay_days

    # Find installments that failed but are eligible for retry
    retry_cutoff = timezone.now() - timedelta(days=retry_delay_days)

    installments = PaymentInstallment.objects.filter(
        status='PENDING',
        payment_plan__auto_payment_enabled=True,
        payment_plan__auto_payment_method__isnull=False,
        metadata__autopay_retries__gt=0,
        metadata__last_autopay_attempt__lte=retry_cutoff.isoformat(),
    )

    results = {
        'processed': 0,
        'successful': 0,
        'failed': 0,
    }

    for installment in installments:
        results['processed'] += 1
        result = AutopayService.process_autopay_installment(installment)

        if result['success']:
            results['successful'] += 1
        else:
            results['failed'] += 1

    return results
```

### 4.3 Add Celery Beat Schedule

**File**: `backend/core/celery.py` (or celery config)

```python
# Add to CELERY_BEAT_SCHEDULE

CELERY_BEAT_SCHEDULE = {
    # ... existing schedules ...

    'process-autopay-daily': {
        'task': 'payments.process_autopay',
        'schedule': crontab(hour=6, minute=0),  # 6:00 AM daily
    },
    'process-autopay-retry': {
        'task': 'payments.process_autopay_retry',
        'schedule': crontab(hour='*/6'),  # Every 6 hours
    },
}
```

### 4.4 Add Autopay Admin Monitoring

**File**: `backend/core/domains/payments/views.py`

```python
# Add admin endpoint for autopay monitoring

class AutopayMonitorViewSet(viewsets.ViewSet):
    """Admin monitoring for autopay system."""
    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending autopay installments."""
        from core.domains.payments.services.autopay_service import AutopayService

        days_ahead = int(request.query_params.get('days_ahead', 7))
        installments = AutopayService.get_due_autopay_installments(days_ahead)

        serializer = PaymentInstallmentSerializer(installments, many=True)
        return Response({
            'count': installments.count(),
            'installments': serializer.data
        })

    @action(detail=False, methods=['post'])
    def trigger(self, request):
        """Manually trigger autopay processing (admin only)."""
        from core.domains.payments.services.autopay_service import AutopayService

        days_ahead = int(request.data.get('days_ahead', 0))
        results = AutopayService.process_all_due_autopay(days_ahead)

        return Response(results)
```

---

## Phase 5: Expose Workflow Trigger Flags in UI

**Goal**: Allow admins to configure payment-triggered workflow automations

**Dependencies**: None (extends existing workflow system)

### 5.1 Update Backend Serializer

**File**: `backend/core/domains/workflows/basic_serializers.py`

```python
# Add trigger flags to WorkflowStageSerializer.Meta.fields

class WorkflowStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowStage
        fields = [
            # ... existing fields ...
            'trigger_on_payment_received',
            'trigger_on_quote_accepted',
            'trigger_on_contract_signed',
            'trigger_on_event_created',
            'trigger_on_quote_sent',
        ]
```

### 5.2 Update Frontend Types

**File**: `frontend/admin-crm/src/types/workflows.types.ts`

```typescript
export interface WorkflowStage {
  // ... existing fields ...
  trigger_on_payment_received: boolean;
  trigger_on_quote_accepted: boolean;
  trigger_on_contract_signed: boolean;
  trigger_on_event_created: boolean;
  trigger_on_quote_sent: boolean;
}
```

### 5.3 Update WorkflowStageFormDialog

**File**: `frontend/admin-crm/src/components/workflows/WorkflowStageFormDialog.tsx`

Add a "Conditional Triggers" section with toggle switches:

```tsx
{/* Conditional Triggers Section */}
<ModernCard variant="glass" title="Conditional Triggers" sx={{ mt: 3 }}>
  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
    Execute this stage's automation when specific events occur (without advancing the workflow)
  </Typography>

  <Stack spacing={2}>
    <FormControlLabel
      control={
        <Switch
          checked={formData.trigger_on_payment_received}
          onChange={(e) => setFormData({...formData, trigger_on_payment_received: e.target.checked})}
        />
      }
      label={
        <Box>
          <Typography variant="body2" fontWeight={600}>On Payment Received</Typography>
          <Typography variant="caption" color="text.secondary">
            Trigger when any payment is completed for this event
          </Typography>
        </Box>
      }
    />

    <FormControlLabel
      control={
        <Switch
          checked={formData.trigger_on_quote_accepted}
          onChange={(e) => setFormData({...formData, trigger_on_quote_accepted: e.target.checked})}
        />
      }
      label={
        <Box>
          <Typography variant="body2" fontWeight={600}>On Quote Accepted</Typography>
          <Typography variant="caption" color="text.secondary">
            Trigger when the client accepts a quote
          </Typography>
        </Box>
      }
    />

    <FormControlLabel
      control={
        <Switch
          checked={formData.trigger_on_contract_signed}
          onChange={(e) => setFormData({...formData, trigger_on_contract_signed: e.target.checked})}
        />
      }
      label={
        <Box>
          <Typography variant="body2" fontWeight={600}>On Contract Signed</Typography>
          <Typography variant="caption" color="text.secondary">
            Trigger when the client signs the contract
          </Typography>
        </Box>
      }
    />

    <FormControlLabel
      control={
        <Switch
          checked={formData.trigger_on_event_created}
          onChange={(e) => setFormData({...formData, trigger_on_event_created: e.target.checked})}
        />
      }
      label={
        <Box>
          <Typography variant="body2" fontWeight={600}>On Event Created</Typography>
          <Typography variant="caption" color="text.secondary">
            Trigger when the event is first created (in addition to first stage)
          </Typography>
        </Box>
      }
    />

    <FormControlLabel
      control={
        <Switch
          checked={formData.trigger_on_quote_sent}
          onChange={(e) => setFormData({...formData, trigger_on_quote_sent: e.target.checked})}
        />
      }
      label={
        <Box>
          <Typography variant="body2" fontWeight={600}>On Quote Sent</Typography>
          <Typography variant="caption" color="text.secondary">
            Trigger when a quote is sent to the client
          </Typography>
        </Box>
      }
    />
  </Stack>
</ModernCard>
```

---

## Phase 6: Gateway Health Monitoring UI

**Goal**: Provide visibility into payment gateway status and performance

**Dependencies**: None

### 6.1 Create Gateway Metrics Service

**File**: `backend/core/domains/payments/services/gateway_metrics_service.py` (NEW)

```python
"""
Service for tracking and reporting payment gateway metrics.
"""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Q
from core.domains.payments.models import PaymentTransaction, PaymentWebhookLog


class GatewayMetricsService:
    """Service for gateway health and metrics reporting."""

    @classmethod
    def get_gateway_health(cls, gateway_code: str, hours: int = 24) -> dict:
        """
        Get health metrics for a specific gateway.

        Returns:
            dict with success_rate, avg_response_time, transaction_count, error_rate
        """
        since = timezone.now() - timedelta(hours=hours)

        transactions = PaymentTransaction.objects.filter(
            gateway__code=gateway_code,
            created_at__gte=since,
        )

        total_count = transactions.count()
        if total_count == 0:
            return {
                'gateway_code': gateway_code,
                'period_hours': hours,
                'transaction_count': 0,
                'success_rate': None,
                'failure_rate': None,
                'avg_response_time_ms': None,
                'status': 'NO_DATA',
            }

        successful = transactions.filter(status='COMPLETED').count()
        failed = transactions.filter(status='FAILED').count()

        success_rate = (successful / total_count) * 100
        failure_rate = (failed / total_count) * 100

        # Determine status
        if success_rate >= 99:
            status = 'HEALTHY'
        elif success_rate >= 95:
            status = 'DEGRADED'
        else:
            status = 'UNHEALTHY'

        return {
            'gateway_code': gateway_code,
            'period_hours': hours,
            'transaction_count': total_count,
            'successful_count': successful,
            'failed_count': failed,
            'success_rate': round(success_rate, 2),
            'failure_rate': round(failure_rate, 2),
            'status': status,
        }

    @classmethod
    def get_all_gateways_health(cls, hours: int = 24) -> list:
        """Get health metrics for all active gateways."""
        from core.domains.payments.models import PaymentGateway

        gateways = PaymentGateway.objects.filter(is_active=True)
        return [cls.get_gateway_health(g.code, hours) for g in gateways]

    @classmethod
    def get_recent_errors(cls, gateway_code: str = None, limit: int = 10) -> list:
        """Get recent transaction errors."""
        queryset = PaymentTransaction.objects.filter(
            status='FAILED',
            error_message__isnull=False,
        ).order_by('-created_at')[:limit]

        if gateway_code:
            queryset = queryset.filter(gateway__code=gateway_code)

        return [
            {
                'id': t.id,
                'gateway': t.gateway.code,
                'transaction_id': t.transaction_id,
                'error_message': t.error_message,
                'amount': str(t.amount),
                'created_at': t.created_at.isoformat(),
            }
            for t in queryset
        ]

    @classmethod
    def get_webhook_stats(cls, gateway_code: str = None, hours: int = 24) -> dict:
        """Get webhook processing statistics."""
        since = timezone.now() - timedelta(hours=hours)

        queryset = PaymentWebhookLog.objects.filter(received_at__gte=since)
        if gateway_code:
            queryset = queryset.filter(gateway_code=gateway_code)

        total = queryset.count()
        successful = queryset.filter(processed_successfully=True).count()
        failed = queryset.filter(processed_successfully=False).count()
        pending = queryset.filter(processed_at__isnull=True).count()

        return {
            'period_hours': hours,
            'total_webhooks': total,
            'processed_successfully': successful,
            'processing_failed': failed,
            'pending': pending,
            'success_rate': round((successful / total) * 100, 2) if total > 0 else None,
        }
```

### 6.2 Create Gateway Metrics ViewSet

**File**: `backend/core/domains/payments/views.py`

```python
class GatewayMetricsViewSet(viewsets.ViewSet):
    """Gateway health and metrics endpoints."""
    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=False, methods=['get'])
    def health(self, request):
        """Get health status for all gateways."""
        from core.domains.payments.services.gateway_metrics_service import GatewayMetricsService

        hours = int(request.query_params.get('hours', 24))
        metrics = GatewayMetricsService.get_all_gateways_health(hours)

        return Response({
            'period_hours': hours,
            'gateways': metrics,
            'timestamp': timezone.now().isoformat(),
        })

    @action(detail=False, methods=['get'])
    def errors(self, request):
        """Get recent transaction errors."""
        from core.domains.payments.services.gateway_metrics_service import GatewayMetricsService

        gateway_code = request.query_params.get('gateway')
        limit = int(request.query_params.get('limit', 10))

        errors = GatewayMetricsService.get_recent_errors(gateway_code, limit)

        return Response({'errors': errors})

    @action(detail=False, methods=['get'])
    def webhooks(self, request):
        """Get webhook processing statistics."""
        from core.domains.payments.services.gateway_metrics_service import GatewayMetricsService

        gateway_code = request.query_params.get('gateway')
        hours = int(request.query_params.get('hours', 24))

        stats = GatewayMetricsService.get_webhook_stats(gateway_code, hours)

        return Response(stats)
```

### 6.3 Add URL Route

**File**: `backend/core/domains/payments/urls.py`

```python
router.register(r'gateway-metrics', GatewayMetricsViewSet, basename='gateway-metrics')
```

### 6.4 Frontend: Create Gateway Health Dashboard

**File**: `frontend/admin-crm/src/components/payments/GatewayHealthDashboard.tsx` (NEW)

Create a dashboard component showing:
- Health status cards for each gateway (green/yellow/red indicator)
- Transaction success rate chart
- Recent errors table
- Webhook processing stats

This can be added to the Payment Settings page as a third tab or as a section in the Payment Gateways tab.

---

## Implementation Order & Dependencies

```
Phase 1: Payment Communication Context (FOUNDATIONAL)
    └── No dependencies

Phase 2: Company Settings Model (FOUNDATIONAL)
    └── No dependencies

Phase 3: Dynamic PDF Branding
    └── Depends on: Phase 2 (CompanySettings)

Phase 4: Autopay Scheduler
    └── No dependencies (uses existing infrastructure)

Phase 5: Workflow Trigger Flags UI
    └── No dependencies (extends existing workflow)

Phase 6: Gateway Health Monitoring
    └── No dependencies
```

**Recommended Implementation Sequence:**

1. **Week 1**: Phase 1 + Phase 2 (foundational models)
2. **Week 2**: Phase 3 (PDF branding, depends on Phase 2)
3. **Week 3**: Phase 4 (autopay - independent)
4. **Week 4**: Phase 5 + Phase 6 (smaller enhancements)

---

## Testing Requirements

### Phase 1 Tests
- [ ] Test PAYMENT context variable generation
- [ ] Test INVOICE context variable generation
- [ ] Test payment template rendering
- [ ] Test receipt email sending on payment completion

### Phase 2 Tests
- [ ] Test CompanySettings singleton behavior
- [ ] Test logo upload and URL generation
- [ ] Test full address formatting
- [ ] Test PDF context generation

### Phase 3 Tests
- [ ] Test PDF header generation with logo
- [ ] Test PDF footer with company info
- [ ] Test bank details section
- [ ] Test cache invalidation on settings change

### Phase 4 Tests
- [ ] Test autopay eligibility filtering
- [ ] Test successful autopay processing
- [ ] Test autopay failure handling and retry logic
- [ ] Test max retry limit behavior
- [ ] Test Celery task scheduling

### Phase 5 Tests
- [ ] Test trigger flags serialization
- [ ] Test workflow stage creation with triggers
- [ ] Test trigger execution on payment received

### Phase 6 Tests
- [ ] Test gateway health calculation
- [ ] Test error aggregation
- [ ] Test webhook stats

---

## Files Changed Summary

### New Files
- `backend/core/utils/pdf_branding.py`
- `backend/core/domains/payments/services/autopay_service.py`
- `backend/core/domains/payments/services/gateway_metrics_service.py`
- `backend/core/domains/communications/fixtures/payment_templates.json`
- `frontend/admin-crm/src/pages/settings/company/CompanySettings.tsx`
- `frontend/admin-crm/src/components/payments/GatewayHealthDashboard.tsx`

### Modified Files (Backend)
- `backend/core/domains/communications/context_service.py`
- `backend/core/domains/communications/services/communication_service.py`
- `backend/core/domains/settings/models.py`
- `backend/core/domains/settings/serializers.py`
- `backend/core/domains/settings/views.py`
- `backend/core/domains/settings/urls.py`
- `backend/core/domains/settings/signals.py`
- `backend/core/domains/payments/pdf_service.py`
- `backend/core/domains/payments/models.py`
- `backend/core/domains/payments/views.py`
- `backend/core/domains/payments/urls.py`
- `backend/core/domains/payments/tasks.py`
- `backend/core/domains/contracts/pdf_service.py`
- `backend/core/domains/sales/pdf_service.py`
- `backend/core/domains/workflows/basic_serializers.py`
- `backend/core/celery.py`

### Modified Files (Frontend)
- `frontend/admin-crm/src/types/settings.types.ts`
- `frontend/admin-crm/src/types/workflows.types.ts`
- `frontend/admin-crm/src/apis/settings.api.ts`
- `frontend/admin-crm/src/components/workflows/WorkflowStageFormDialog.tsx`

---

## Success Criteria

1. **Payment emails work**: Admins can create payment notification templates with dynamic variables
2. **PDFs are branded**: All generated PDFs show company logo, colors, and contact info
3. **Autopay functions**: Installments with saved payment methods are automatically charged
4. **Workflow triggers visible**: Admins can enable payment-triggered automations in UI
5. **Gateway monitoring available**: Admins can see gateway health status and recent errors
