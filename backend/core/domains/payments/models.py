# backend/core/domains/payments/models.py
from datetime import timedelta
from decimal import Decimal
import logging

from core.utils.models import BaseModel
from core.utils.encryption import EncryptedJSONField
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class PaymentSettings(BaseModel):
    """Global payment settings with singleton pattern"""

    # BALANCE DUE SETTINGS
    balance_due_days = models.PositiveIntegerField(
        default=30,
        help_text="Default number of days before event when balance is due"
    )

    # GRACE PERIOD SETTINGS
    grace_period_days = models.PositiveIntegerField(
        default=7,
        help_text="Default grace period days before marking payments overdue"
    )

    # INSTALLMENT DEFAULTS
    default_installments = models.PositiveIntegerField(
        default=2,
        help_text="Default number of installments for payment plans"
    )

    default_installment_frequency = models.CharField(
        max_length=20,
        choices=[
            ('WEEKLY', 'Weekly'),
            ('BIWEEKLY', 'Bi-weekly'),
            ('MONTHLY', 'Monthly')
        ],
        default='MONTHLY',
        help_text="Default frequency for payment installments"
    )

    # LATE FEE SETTINGS
    late_fee_enabled = models.BooleanField(
        default=True,
        help_text="Enable automatic late fee application"
    )

    default_late_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('25.00'),
        help_text="Default late fee amount to apply to overdue payments"
    )

    # DEPOSIT SETTINGS
    default_deposit_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Default deposit percentage (0-100)"
    )

    # CURRENCY SETTINGS
    default_currency = models.CharField(
        max_length=3,
        default='PHP',
        help_text="Default currency (ISO 4217 code)"
    )

    # AUTO PAYMENT RETRY SETTINGS
    auto_payment_retry_attempts = models.PositiveIntegerField(
        default=3,
        help_text="Number of automatic retry attempts for failed payments"
    )

    auto_payment_retry_delay_days = models.PositiveIntegerField(
        default=2,
        help_text="Days to wait between automatic payment retry attempts"
    )

    class Meta:
        verbose_name = "Payment Settings"
        verbose_name_plural = "Payment Settings"

    def clean(self):
        """Validate that only one settings instance exists"""
        if not self.pk and PaymentSettings.objects.exists():
            raise ValidationError("Only one PaymentSettings instance is allowed.")

        # Validate percentage fields
        if not (0 <= self.default_deposit_percentage <= 100):
            raise ValidationError("Default deposit percentage must be between 0 and 100.")

    def save(self, *args, **kwargs):
        """Ensure singleton pattern"""
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_default_settings(cls):
        """Get the default payment settings (singleton)"""
        settings, created = cls.objects.get_or_create(
            defaults={
                'balance_due_days': 30,
                'grace_period_days': 7,
                'default_installments': 2,
                'default_installment_frequency': 'MONTHLY',
                'late_fee_enabled': True,
                'default_late_fee_amount': Decimal('25.00'),
                'default_deposit_percentage': Decimal('50.00'),
                'default_currency': 'PHP',
                'auto_payment_retry_attempts': 3,
                'auto_payment_retry_delay_days': 2,
            }
        )
        return settings

    def __str__(self):
        return "Global Payment Settings"


class Payment(BaseModel):
    """Records of payments for events"""
    # Updated to include all state machine states
    PAYMENT_STATUS_CHOICES = [
        ('CREATED', 'Created'),
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
        ('REFUNDED', 'Refunded'),
    ]

    # Changed from invoice_id to payment_number to avoid conflict with invoice ForeignKey
    payment_number = models.CharField(max_length=50, unique=True)
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='PHP', help_text="Payment currency (ISO 4217 code)")
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='CREATED')
    due_date = models.DateField()
    paid_on = models.DateField(null=True, blank=True)
    payment_method = models.ForeignKey('PaymentMethod', on_delete=models.SET_NULL, null=True, related_name='payments')
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    is_manual = models.BooleanField(default=False)
    processed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='processed_payments')
    
    # Receipt fields (from PaymentReceipt)
    receipt_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    receipt_generated_on = models.DateTimeField(null=True, blank=True)
    receipt_sent = models.BooleanField(default=False)
    receipt_sent_on = models.DateTimeField(null=True, blank=True)
    receipt_pdf = models.FileField(upload_to='receipts/', null=True, blank=True)
    
    # Link to quote and invoice 
    quote = models.ForeignKey('sales.EventQuote', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    invoice = models.ForeignKey('Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='related_payments')
    
    # For installment payments
    installment = models.ForeignKey('PaymentInstallment', on_delete=models.SET_NULL, null=True, blank=True, related_name='payment')

    def save(self, *args, **kwargs):
        # Use the new atomic payment number service for generation
        if not self.payment_number:
            from .services.payment_number_service import PaymentNumberService
            self.payment_number = PaymentNumberService.generate_unique_payment_number(
                event_id=self.event_id if self.event_id else None
            )

        super().save(*args, **kwargs)
        # Update event payment status
        self.event.update_payment_status()

        # Update workflow if applicable - trigger PAYMENT_RECEIVED event
        if self.status == 'COMPLETED' and hasattr(self.event, 'workflow_template') and self.event.workflow_template:
            from core.domains.workflows.models import WorkflowTrigger

            # Create the trigger record
            WorkflowTrigger.objects.create(
                event=self.event,
                stage=self.event.current_stage,
                trigger_type='PAYMENT_RECEIVED',
                details=f"Payment of {self.format_amount_with_currency()} received",
                result_data={
                    'payment_id': self.id,
                    'amount': str(self.amount),
                    'payment_method': self.payment_method.type if self.payment_method else 'Unknown'
                }
            )

            # Check for stages triggered by payment
            next_stages = self.event.workflow_template.stages.filter(
                trigger_on_payment_received=True
            ).order_by('stage', 'order')

            if next_stages.exists():
                next_stage = next_stages.first()
                # Check if the event meets all criteria for this stage
                if next_stage.check_advancement_criteria(self.event):
                    next_stage.apply_to_event(self.event)

    def complete_payment(self):
        """Mark payment as complete and handle related processes"""
        self.status = 'COMPLETED'
        self.paid_on = timezone.now().date()
        self.save()
        
        # Generate receipt if payment completed
        if not self.receipt_number:
            self.generate_receipt()
        
        # Record in event timeline
        from core.domains.events.models import EventTimeline
        EventTimeline.objects.create(
            event=self.event,
            action_type='PAYMENT_RECEIVED',
            description=f"Payment of {self.format_amount_with_currency()} received",
            is_public=True,
            action_data={
                'payment_id': self.id,
                'amount': str(self.amount),
                'payment_method': self.payment_method.type if self.payment_method else 'Unknown'
            }
        )
        
        # If this is an installment payment, update installment
        if self.installment:
            self.installment.status = 'PAID'
            self.installment.save()
        
        # Send payment notification
        self.send_receipt_notification()

        # Auto-create payment plan for deposit payments
        self._create_payment_plan_for_deposit()

        
    def generate_receipt(self):
        """Generate receipt number and update receipt fields"""
        if not self.receipt_number and self.status == 'COMPLETED':
            self.receipt_number = f"REC-{timezone.now().strftime('%Y%m%d')}-{self.id}"
            self.receipt_generated_on = timezone.now()
            self.save(update_fields=['receipt_number', 'receipt_generated_on'])
            
            # Create PDF receipt (implementation depends on your PDF generation solution)
            # self.generate_receipt_pdf()
            
        return self.receipt_number
    
    def send_receipt_notification(self):
        """Send receipt notification to the client"""
        if self.status == 'COMPLETED' and not self.receipt_sent:
            # Create notification record
            PaymentNotification.objects.create(
                payment=self,
                notification_type='PAYMENT_RECEIVED',
                sent_at=timezone.now(),
                sent_to=self.event.client.email,
                is_successful=True
            )
            
            # Update receipt sent status
            self.receipt_sent = True
            self.receipt_sent_on = timezone.now()
            self.save(update_fields=['receipt_sent', 'receipt_sent_on'])
            
            return True
        return False
    
    def format_amount_with_currency(self, user=None):
        """
        Format the payment amount with appropriate currency symbol and formatting
        Uses the centralized currency settings from the settings domain
        """
        try:
            # Import CurrencySettings from settings domain
            from core.domains.settings.models import CurrencySettings
            
            # Get currency settings (user-specific or system-wide)
            if user:
                settings = CurrencySettings.get_user_settings(user)
            else:
                settings = CurrencySettings.get_system_settings()
            
            # Use the centralized format_amount method
            return settings.format_amount(self.amount, self.currency)
            
        except ImportError as e:
            # CurrencySettings not available
            logger.debug(f"CurrencySettings not available for payment {self.id}: {e}")
        except Exception as e:
            # Any other error
            logger.warning(f"Failed to format currency for payment {self.id}: {e}")
        
        # Fallback formatting if settings domain is not available
        currency_symbols = {
            'PHP': '₱',
            'USD': '$',
            'EUR': '€',
            'SGD': 'S$',
            'HKD': 'HK$',
        }
        
        symbol = currency_symbols.get(self.currency, f'{self.currency} ')
        
        # Use appropriate decimal places
        if self.currency == 'PHP':
            return f"{symbol}{int(self.amount):,}"
        else:
            return f"{symbol}{float(self.amount):,.2f}"
    
    def _create_payment_plan_for_deposit(self):
        """Create payment plan for remaining balance if this is a deposit payment"""
        # Only create payment plan for deposit payments
        if 'deposit' not in self.description.lower():
            return

        # Check if event already has a payment plan
        if hasattr(self.event, 'payment_plan'):
            return

        # Calculate remaining balance
        total_amount = self.event.total_amount_due or Decimal('0.00')
        if total_amount <= self.amount:
            return  # Full payment, no need for payment plan

        remaining_amount = total_amount - self.amount

        # Only create payment plan if there's a significant remaining balance
        if remaining_amount < Decimal('100.00'):  # Minimum threshold
            return

        try:
            # Import here to avoid circular imports
            from core.domains.payments.services.payment_plan_service import PaymentPlanService

            # Try to find the booking session that created this payment
            booking_session = None
            try:
                from core.domains.bookingflow.models import BookingSession
                # Look for recent session associated with this event
                booking_session = BookingSession.objects.filter(
                    created_event=self.event
                ).order_by('-created_at').first()
            except:
                pass

            # Create payment plan for remaining balance
            payment_plan = PaymentPlanService.create_payment_plan_from_deposit(
                event=self.event,
                deposit_payment=self,
                remaining_amount=remaining_amount,
                booking_session=booking_session
            )

            # Log successful creation
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Auto-created payment plan {payment_plan.id} for event {self.event.id} after deposit payment")

        except Exception as e:
            # Log error but don't fail the payment completion
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to auto-create payment plan for deposit payment {self.id}: {e}")

    def __str__(self):
        return f"Payment {self.payment_number} for Event {self.event.id}"

    # State Machine Integration Methods
    def transition_to_state(self, new_state: str, reason: str, triggered_by: str = 'system', metadata: dict = None):
        """
        Transition payment to new state using PaymentStateMachine.

        This is the preferred method for changing payment status.
        It provides atomic transitions, validation, and audit logging.
        """
        from .services.payment_state_machine import PaymentStateMachine, PaymentState

        try:
            target_state = PaymentState(new_state)
            return PaymentStateMachine.transition_payment_state(
                payment=self,
                to_state=target_state,
                reason=reason,
                triggered_by=triggered_by,
                metadata=metadata
            )
        except ValueError as e:
            raise ValidationError(f"Invalid payment state: {new_state}")

    def can_transition_to(self, new_state: str) -> bool:
        """Check if payment can transition to the specified state"""
        from .services.payment_state_machine import PaymentStateMachine, PaymentState

        try:
            current_state = PaymentState(self.status)
            target_state = PaymentState(new_state)
            return target_state in PaymentStateMachine.get_valid_transitions(current_state)
        except ValueError:
            return False

    def get_valid_transitions(self) -> list:
        """Get list of valid state transitions from current state"""
        from .services.payment_state_machine import PaymentStateMachine, PaymentState

        try:
            current_state = PaymentState(self.status)
            valid_states = PaymentStateMachine.get_valid_transitions(current_state)
            return [state.value for state in valid_states]
        except ValueError:
            return []

    def is_terminal_state(self) -> bool:
        """Check if payment is in a terminal state (no further processing possible)"""
        from .services.payment_state_machine import PaymentStateMachine, PaymentState

        try:
            current_state = PaymentState(self.status)
            return PaymentStateMachine.is_terminal_state(current_state)
        except ValueError:
            return False

    def get_state_history(self) -> list:
        """Get complete state transition history"""
        from .services.payment_state_machine import PaymentStateMachine
        return PaymentStateMachine.get_payment_state_history(self)

    class Meta:
        ordering = ['-due_date']


class PaymentGateway(BaseModel):
    """Payment gateway configurations with encrypted sensitive data"""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    # Store configuration securely with encryption
    config = EncryptedJSONField(default=dict)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name} Gateway"
    
    def get_decrypted_config(self):
        """Get the decrypted configuration (for API usage)"""
        return self.config
    
    def set_config_safely(self, config_data):
        """Set configuration data with validation"""
        if not isinstance(config_data, dict):
            raise ValueError("Configuration must be a dictionary")
        
        # Validate required fields based on gateway type
        required_fields = {
            'stripe': ['secret_key', 'publishable_key'],
            'paypal': ['client_id', 'client_secret'],
            'square': ['access_token', 'application_id']
        }
        
        if self.code in required_fields:
            missing_fields = []
            for field in required_fields[self.code]:
                if field not in config_data:
                    missing_fields.append(field)
            
            if missing_fields:
                raise ValueError(f"Missing required fields for {self.code}: {missing_fields}")
        
        self.config = config_data
    
    class Meta:
        ordering = ['name']


class PaymentMethod(BaseModel):
    """Saved payment methods for clients"""
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='payment_methods')
    type = models.CharField(max_length=50, choices=[
        ('CREDIT_CARD', 'Credit Card'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CHECK', 'Check'),
        ('CASH', 'Cash'),
        ('DIGITAL_WALLET', 'Digital Wallet')
    ])
    is_default = models.BooleanField(default=False)
    nickname = models.CharField(max_length=100, blank=True)
    instructions = models.TextField(blank=True)
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.SET_NULL, null=True, blank=True)
    token_reference = models.CharField(max_length=255, blank=True)
    last_four = models.CharField(max_length=4, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.get_type_display()} ({self.nickname or 'Unnamed'})"
    
    def save(self, *args, **kwargs):
        # If this method is set as default, unset other defaults for this user
        if self.is_default:
            PaymentMethod.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-is_default', '-created_at']


class PaymentTransaction(BaseModel):
    """Detailed payment transaction records with gateway info"""
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='transactions')
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.PROTECT)
    transaction_id = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='PHP', help_text="Transaction currency (ISO 4217 code)")
    status = models.CharField(max_length=50, choices=[
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled')
    ])
    response_data = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    is_test = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Transaction {self.transaction_id} - {self.status}"
    
    def save(self, *args, **kwargs):
        from django.db import transaction

        super().save(*args, **kwargs)

        # Update payment status based on transaction status
        if self.status == 'COMPLETED' and self.payment.status != 'COMPLETED':
            # Defer payment completion until after the atomic transaction completes
            # This prevents nested transaction issues
            transaction.on_commit(lambda: self.payment.complete_payment())
        elif self.status == 'FAILED' and self.payment.status == 'PENDING':
            self.payment.status = 'FAILED'
            self.payment.save(update_fields=['status'])
    
    class Meta:
        ordering = ['-created_at']


class PaymentPlan(BaseModel):
    """Payment plan with installments for an event"""
    event = models.OneToOneField('events.Event', on_delete=models.CASCADE, related_name='payment_plan')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    down_payment_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='PHP', help_text="Payment plan currency (ISO 4217 code)")
    down_payment_due_date = models.DateField()
    number_of_installments = models.PositiveIntegerField()
    frequency = models.CharField(max_length=20, choices=[
        ('WEEKLY', 'Weekly'),
        ('BIWEEKLY', 'Bi-weekly'),
        ('MONTHLY', 'Monthly')
    ])
    notes = models.TextField(blank=True)

    # Link to quote that originated the plan
    quote = models.ForeignKey('sales.EventQuote', on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_plans')

    # STATUS TRACKING - DRY compliant with existing patterns
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending Setup'),
            ('ACTIVE', 'Active'),
            ('COMPLETED', 'Completed'),
            ('SUSPENDED', 'Suspended'),
            ('DEFAULTED', 'Defaulted'),
            ('CANCELLED', 'Cancelled')
        ],
        default='PENDING',
        help_text="Current status of the payment plan"
    )

    # SCHEDULE MANAGEMENT
    next_payment_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of next scheduled payment"
    )

    final_payment_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of final installment"
    )

    # GRACE PERIOD AND DEFAULT HANDLING
    grace_period_days = models.PositiveIntegerField(
        default=7,
        help_text="Days after due date before marking overdue"
    )

    # TERMS AND CONDITIONS
    terms_accepted = models.BooleanField(
        default=False,
        help_text="Client accepted payment plan terms"
    )

    terms_accepted_at = models.DateTimeField(
        null=True,
        blank=True
    )

    terms_accepted_ip = models.GenericIPAddressField(
        null=True,
        blank=True
    )

    # AUTOMATIC PAYMENT SETTINGS
    auto_payment_enabled = models.BooleanField(
        default=False,
        help_text="Automatically charge saved payment method"
    )

    auto_payment_method = models.ForeignKey(
        'PaymentMethod',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='auto_payment_plans'
    )

    # INTEGRATION FIELDS
    created_from_booking_session = models.ForeignKey(
        'bookingflow.BookingSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Booking session that created this plan"
    )
    
    def __str__(self):
        return f"Payment Plan for Event {self.event.id}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Create installments if this is a new payment plan
        if is_new:
            self.create_installments()
    
    def create_installments(self):
        """Generate installment records based on plan configuration"""
        # First create down payment
        PaymentInstallment.objects.create(
            payment_plan=self,
            amount=self.down_payment_amount,
            due_date=self.down_payment_due_date,
            status='PENDING',
            installment_number=0,
            description="Down payment"
        )
        
        # Calculate remaining amount
        remaining_amount = self.total_amount - self.down_payment_amount
        installment_amount = remaining_amount / self.number_of_installments
        
        # Set frequency in days
        if self.frequency == 'WEEKLY':
            days = 7
        elif self.frequency == 'BIWEEKLY':
            days = 14
        else:  # MONTHLY
            days = 30
        
        # Create regular installments
        last_date = self.down_payment_due_date
        for i in range(1, self.number_of_installments + 1):
            last_date = last_date + timedelta(days=days)
            
            PaymentInstallment.objects.create(
                payment_plan=self,
                amount=installment_amount.quantize(Decimal('0.01')),
                due_date=last_date,
                status='PENDING',
                installment_number=i,
                description=f"Installment {i} of {self.number_of_installments}"
            )

    @property
    def paid_amount(self):
        """Calculate total paid from related payments - NO DB FIELD"""
        from django.db.models import Sum
        total = self.event.payments.filter(
            status='COMPLETED'
        ).aggregate(
            total=Sum('amount')
        )['total']
        return total or Decimal('0.00')

    @property
    def remaining_balance(self):
        """Calculate remaining balance - NO DB FIELD"""
        return self.total_amount - self.paid_amount

    @property
    def is_overdue(self):
        """Check if any installments are overdue - NO DB FIELD"""
        return self.installments.filter(status='OVERDUE').exists()

    @property
    def completion_percentage(self):
        """Calculate completion percentage"""
        if self.total_amount == 0:
            return 0
        return (self.paid_amount / self.total_amount) * 100

    def calculate_remaining_balance(self):
        """Calculate and update remaining balance"""
        return self.remaining_balance

    def update_next_payment_date(self):
        """Update next payment date based on pending installments"""
        next_installment = self.installments.filter(
            status='PENDING'
        ).order_by('due_date').first()

        self.next_payment_date = next_installment.due_date if next_installment else None
        return self.next_payment_date

    def update_status(self):
        """Update payment plan status based on installment statuses"""
        installments = self.installments.all()

        if not installments.exists():
            return

        paid_installments = installments.filter(status='PAID').count()
        total_installments = installments.count()
        overdue_installments = installments.filter(status='OVERDUE').exists()

        if paid_installments == total_installments:
            self.status = 'COMPLETED'
        elif overdue_installments:
            # Check if overdue for more than grace period
            from django.utils import timezone
            overdue_beyond_grace = installments.filter(
                status='OVERDUE',
                due_date__lt=timezone.now().date() - timedelta(days=self.grace_period_days)
            ).exists()

            if overdue_beyond_grace:
                self.status = 'DEFAULTED'
            else:
                self.status = 'ACTIVE'  # Still within grace period
        elif paid_installments > 0:
            self.status = 'ACTIVE'
        else:
            self.status = 'PENDING'

        self.save(update_fields=['status'])


class PaymentInstallment(BaseModel):
    """Individual installment for a payment plan"""
    payment_plan = models.ForeignKey(PaymentPlan, on_delete=models.CASCADE, related_name='installments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending'),
            ('PAID', 'Paid'),
            ('OVERDUE', 'Overdue'),
            ('PARTIAL', 'Partially Paid'),
            ('WAIVED', 'Waived'),
            ('CANCELLED', 'Cancelled')
        ],
        default='PENDING'
    )
    installment_number = models.PositiveIntegerField()
    description = models.CharField(max_length=255, blank=True)

    # REMINDER AND NOTIFICATION TRACKING
    last_reminder_sent = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date when last reminder was sent"
    )

    reminder_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of reminders sent for this installment"
    )

    # LATE FEES AND PENALTIES
    late_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Late fee amount applied to this installment"
    )

    late_fee_applied_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when late fee was applied"
    )
    
    def __str__(self):
        return f"Installment {self.installment_number} - {self.status}"
    
    def check_status(self):
        """Check if installment is overdue and update status"""
        if self.status == 'PENDING' and self.due_date < timezone.now().date():
            self.status = 'OVERDUE'
            self.save(update_fields=['status'])
            
            # Create a notification
            PaymentNotification.objects.create(
                payment=None,  # No direct payment yet
                notification_type='PAYMENT_OVERDUE',
                sent_at=timezone.now(),
                sent_to=self.payment_plan.event.client.email,
                is_successful=True,
                reference=f"installment_{self.id}"
            )
            
            return True
        return False
    
    def create_payment(self):
        """Create a payment record for this installment"""
        # Check if payment already exists
        if hasattr(self, 'payment') and self.payment.exists():
            return self.payment.first()

        # Create payment for this installment using PaymentOrchestrator
        from .services.payment_orchestrator import PaymentOrchestrator, PaymentRequest

        request = PaymentRequest(
            event_id=self.payment_plan.event.id,
            amount=self.amount,
            currency=getattr(self.payment_plan, 'currency', 'PHP'),
            due_date=self.due_date,
            description=f"Payment for {self.description}",
            payment_type='INSTALLMENT',
            installment_id=self.id,
            created_by='installment_model'
        )

        response = PaymentOrchestrator.create_payment(request)
        if not response.success:
            raise ValueError(f"Failed to create payment for installment: {response.message}")

        return Payment.objects.get(id=response.payment_id)

    @property
    def paid_amount(self):
        """Get paid amount from related payment - NO DB FIELD"""
        if hasattr(self, 'payment') and self.payment.exists():
            payment = self.payment.first()
            if payment.status == 'COMPLETED':
                return payment.amount
        return Decimal('0.00')

    @property
    def remaining_amount(self):
        """Calculate remaining amount for this installment"""
        return self.amount + self.late_fee_amount - self.paid_amount

    @property
    def is_fully_paid(self):
        """Check if installment is fully paid"""
        return self.paid_amount >= (self.amount + self.late_fee_amount)

    @property
    def days_overdue_count(self):
        """Calculate days overdue"""
        if self.status != 'OVERDUE':
            return 0
        return (timezone.now().date() - self.due_date).days

    def apply_late_fee(self, fee_amount):
        """Apply late fee to this installment"""
        if self.late_fee_amount == 0:  # Only apply once
            self.late_fee_amount = fee_amount
            self.late_fee_applied_date = timezone.now().date()
            self.save(update_fields=['late_fee_amount', 'late_fee_applied_date'])

    def mark_as_paid(self, payment_amount=None):
        """Mark installment as paid and update status"""
        if payment_amount is None:
            payment_amount = self.amount + self.late_fee_amount

        if payment_amount >= (self.amount + self.late_fee_amount):
            self.status = 'PAID'
        elif payment_amount > 0:
            self.status = 'PARTIAL'

        self.save(update_fields=['status'])

        # Update parent payment plan status
        self.payment_plan.update_status()
        self.payment_plan.update_next_payment_date()
        self.payment_plan.save(update_fields=['next_payment_date'])

    def send_reminder(self):
        """Send payment reminder and update tracking"""
        self.reminder_count += 1
        self.last_reminder_sent = timezone.now()
        self.save(update_fields=['reminder_count', 'last_reminder_sent'])

        # Create notification record
        PaymentNotification.objects.create(
            payment=None,
            notification_type='PAYMENT_REMINDER',
            sent_at=timezone.now(),
            sent_to=self.payment_plan.event.client.email,
            is_successful=True,
            reference=f"installment_{self.id}"
        )

    class Meta:
        ordering = ['installment_number']


class TaxRate(BaseModel):
    """Tax rates for different regions or product types"""
    name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=5, decimal_places=2)
    region = models.CharField(max_length=100, blank=True)
    is_default = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.name} ({self.rate}%)"
    
    def save(self, *args, **kwargs):
        # If this rate is set as default, unset other defaults
        if self.is_default:
            TaxRate.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Refund(BaseModel):
    """Refund records for payments"""
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refunds')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='PHP', help_text="Refund currency (ISO 4217 code)")
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REJECTED', 'Rejected')
    ])
    refunded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    refund_transaction_id = models.CharField(max_length=255, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"Refund for Payment {self.payment.payment_number} - {self.status}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Add to event timeline
        if self.status == 'COMPLETED':
            from core.domains.events.models import EventTimeline
            EventTimeline.objects.create(
                event=self.payment.event,
                action_type='PAYMENT_RECEIVED',  # We could add a specific REFUND type
                description=f"Refund of ${self.amount} processed",
                actor=self.refunded_by,
                is_public=True,
                action_data={
                    'refund_id': self.id,
                    'payment_id': self.payment.id,
                    'amount': str(self.amount),
                    'reason': self.reason
                }
            )
    
    class Meta:
        ordering = ['-created_at']


class Invoice(BaseModel):
    """Invoice records for clients"""
    invoice_id = models.CharField(max_length=50, unique=True)
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='invoices')
    client = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='invoices')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='PHP', help_text="Invoice currency (ISO 4217 code)")
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=[
        ('DRAFT', 'Draft'),
        ('ISSUED', 'Issued'), 
        ('PAID', 'Paid'),
        ('VOID', 'Void'),
        ('CANCELLED', 'Cancelled')
    ])
    notes = models.TextField(blank=True)
    payment_terms = models.TextField(blank=True)
    
    # Link to quote that originated the invoice
    quote = models.ForeignKey('sales.EventQuote', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    
    # PDF file
    invoice_pdf = models.FileField(upload_to='invoices/', null=True, blank=True)
    
    def __str__(self):
        return f"Invoice {self.invoice_id}"
    
    def calculate_totals(self):
        """Calculate invoice totals using EXACT SAME method as BookingSession"""
        from core.domains.sales.pricing_service import PricingCalculationService
        from decimal import Decimal

        if not self.line_items.exists():
            # No line items
            self.subtotal = Decimal('0.00')
            self.tax_amount = Decimal('0.00')
            self.total_amount = Decimal('0.00')
        else:
            # Reconstruct booking data from line items
            booking_data = self.reconstruct_booking_data()

            # Get event duration
            event_duration_hours = self.get_event_duration_hours()

            # Use EXACT SAME method as BookingSession
            breakdown = PricingCalculationService.calculate_from_booking_data(
                booking_data,
                event_duration_hours
            )

            self.subtotal = breakdown.subtotal
            self.tax_amount = breakdown.tax_amount
            self.total_amount = breakdown.total_amount

        self.save(update_fields=['subtotal', 'tax_amount', 'total_amount'])
    
    def mark_as_paid(self):
        """Mark invoice as paid"""
        self.status = 'PAID'
        self.save(update_fields=['status'])
        
        # Update event's payment status
        self.event.update_payment_status()
    
    def issue(self):
        """Issue the invoice to the client"""
        self.status = 'ISSUED'
        self.issue_date = timezone.now().date()
        self.save(update_fields=['status', 'issue_date'])
        
        # Create payment notification
        PaymentNotification.objects.create(
            notification_type='INVOICE_ISSUED',
            sent_at=timezone.now(),
            sent_to=self.client.email,
            is_successful=True,
            reference=f"invoice_{self.id}"
        )
        
        # Generate PDF if not already generated
        # self.generate_pdf()
        
        # Add to event timeline
        from core.domains.events.models import EventTimeline
        EventTimeline.objects.create(
            event=self.event,
            action_type='SYSTEM_UPDATE',
            description=f"Invoice {self.invoice_id} issued to client",
            is_public=True,
            action_data={'invoice_id': self.id}
        )
    
    @classmethod
    def create_from_quote(cls, quote, due_days=14):
        """Create an invoice from an accepted quote"""
        if not quote or not quote.event:
            return None
        
        # Create invoice
        invoice = cls.objects.create(
            invoice_id=f"INV-{timezone.now().strftime('%Y%m%d')}-{quote.event.id}-{quote.id}",
            event=quote.event,
            client=quote.event.client,
            subtotal=quote.subtotal,
            tax_amount=quote.tax_amount,
            total_amount=quote.total_amount,
            issue_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=due_days),
            status='DRAFT',
            notes=f"Invoice generated from quote #{quote.id}",
            quote=quote
        )
        
        # Create line items from quote
        for quote_item in quote.line_items.all():
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=quote_item.description,
                quantity=quote_item.quantity,
                unit_price=quote_item.unit_price,
                tax_rate=quote_item.tax_rate,
                total=quote_item.total
            )
        
        return invoice

    def reconstruct_booking_data(self):
        """Convert line items back to booking_data format for centralized calculation"""
        booking_data = {
            'selected_packages': [],
            'selected_addons': []
        }

        for item in self.line_items.all():
            if not item.product:
                continue

            item_data = {
                'product_id': item.product.id,
                'name': item.description,
                'price': item.unit_price,
                'quantity': item.quantity
            }

            # Determine if package or addon based on product category
            if self._is_package_product(item.product):
                booking_data['selected_packages'].append(item_data)
            else:
                booking_data['selected_addons'].append(item_data)

        return booking_data

    def _is_package_product(self, product):
        """Determine if product is a package based on product type and category"""
        # Primary check: Use the authoritative product.type field
        if hasattr(product, 'type') and product.type:
            return product.type == 'PACKAGE'

        # Fallback check: Category-based logic for backwards compatibility
        if not product.category:
            return False

        package_categories = ['Packages', 'Wedding Packages', 'Event Packages', 'Package']
        return product.category.name in package_categories

    def get_event_duration_hours(self):
        """Get event duration for pricing calculations"""
        if not self.event:
            return None

        return self.event.get_duration_hours()


class InvoiceLineItem(BaseModel):
    """Line items on an invoice"""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey('products.ProductOption', on_delete=models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        # Auto-calculate total if not set
        if not self.total:
            self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        
        # Update invoice totals
        self.invoice.calculate_totals()

    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_id}"


class InvoiceTax(BaseModel):
    """Applied tax on an invoice"""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='taxes')
    tax_rate = models.ForeignKey(TaxRate, on_delete=models.PROTECT)
    taxable_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"Tax {self.tax_rate.name} on Invoice {self.invoice.invoice_id}"


class PaymentNotification(BaseModel):
    """Records of payment-related notifications sent to clients"""
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=[
        ('INVOICE_ISSUED', 'Invoice Issued'),
        ('PAYMENT_REMINDER', 'Payment Reminder'),
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('PAYMENT_OVERDUE', 'Payment Overdue'),
        ('RECEIPT_SENT', 'Receipt Sent')
    ])
    sent_at = models.DateTimeField()
    sent_to = models.EmailField()
    # FIX: Change from 'communications.EmailTemplate' to 'communications.CommunicationTemplate'
    template_used = models.ForeignKey('communications.CommunicationTemplate', null=True, blank=True, on_delete=models.SET_NULL)
    is_successful = models.BooleanField(default=True)
    reference = models.CharField(max_length=255, blank=True, help_text="Reference to related object, e.g., invoice_123")
    
    def __str__(self):
        return f"{self.get_notification_type_display()} sent to {self.sent_to} on {self.sent_at.strftime('%Y-%m-%d')}"
    
    class Meta:
        ordering = ['-sent_at']


class PaymentNumberSequence(BaseModel):
    """
    Atomic sequence counter for generating unique payment numbers.

    This model ensures payment numbers are globally unique by maintaining
    a per-year counter that's incremented atomically using select_for_update.
    """
    year = models.PositiveIntegerField(
        unique=True,
        help_text="Year for which this sequence applies"
    )
    next_number = models.PositiveIntegerField(
        default=1,
        help_text="Next sequence number to use for this year"
    )

    def __str__(self):
        return f"Payment sequence for {self.year}: next number {self.next_number}"

    class Meta:
        verbose_name = "Payment Number Sequence"
        verbose_name_plural = "Payment Number Sequences"
        ordering = ['-year']


class PaymentStateHistory(BaseModel):
    """
    State transition history for payments.

    Provides audit trail and rollback capability for payment state changes.
    Part of the PaymentStateMachine service architecture.
    """
    payment = models.ForeignKey(
        'Payment',
        on_delete=models.CASCADE,
        related_name='state_history'
    )
    from_state = models.CharField(
        max_length=20,
        help_text="Previous payment state"
    )
    to_state = models.CharField(
        max_length=20,
        help_text="New payment state"
    )
    reason = models.CharField(
        max_length=255,
        help_text="Reason for state transition"
    )
    triggered_by = models.CharField(
        max_length=100,
        default='system',
        help_text="Who or what triggered the state change"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context data for the transition"
    )
    timestamp = models.DateTimeField(
        default=timezone.now,
        help_text="When the state transition occurred"
    )

    def __str__(self):
        return f"Payment {self.payment.payment_number}: {self.from_state} → {self.to_state}"

    class Meta:
        verbose_name = "Payment State History"
        verbose_name_plural = "Payment State Histories"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['payment', '-timestamp']),
            models.Index(fields=['to_state', '-timestamp']),
        ]


class PaymentEventStore(BaseModel):
    """
    Persistent storage for payment domain events.

    Provides event sourcing capabilities including event replay,
    audit trails, and cross-system integration support.
    """
    # Event identification
    event_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Unique identifier for this domain event"
    )
    event_type = models.CharField(
        max_length=100,
        help_text="Type of domain event (PaymentCompletedEvent, etc.)"
    )

    # Payment context
    payment = models.ForeignKey(
        'Payment',
        on_delete=models.CASCADE,
        related_name='stored_events'
    )
    payment_number = models.CharField(
        max_length=50,
        help_text="Payment number for easy lookup"
    )

    # Event payload
    event_data = models.JSONField(
        help_text="Complete event data including transition details"
    )

    # State transition context
    from_state = models.CharField(
        max_length=20,
        help_text="Previous payment state"
    )
    to_state = models.CharField(
        max_length=20,
        help_text="New payment state"
    )
    transition_reason = models.CharField(
        max_length=255,
        help_text="Reason for state transition"
    )
    triggered_by = models.CharField(
        max_length=100,
        help_text="Who or what triggered the state change"
    )

    # Event processing status
    processed = models.BooleanField(
        default=False,
        help_text="Whether this event has been processed by all handlers"
    )
    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When event processing started"
    )
    processing_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When event processing completed"
    )

    # Cross-system integration
    external_system_refs = models.JSONField(
        default=dict,
        blank=True,
        help_text="References to external systems that need to be notified"
    )

    # Error tracking
    processing_errors = models.JSONField(
        default=list,
        blank=True,
        help_text="Any errors encountered during event processing"
    )
    retry_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of processing retry attempts"
    )

    def __str__(self):
        return f"Event {self.event_type} for Payment {self.payment_number}"

    def mark_processing_started(self):
        """Mark event as starting processing"""
        self.processing_started_at = timezone.now()
        self.save(update_fields=['processing_started_at'])

    def mark_processing_completed(self):
        """Mark event as fully processed"""
        self.processed = True
        self.processing_completed_at = timezone.now()
        self.save(update_fields=['processed', 'processing_completed_at'])

    def add_processing_error(self, error_message: str, error_details: dict = None):
        """Add processing error to the event"""
        error_entry = {
            'message': error_message,
            'details': error_details or {},
            'timestamp': timezone.now().isoformat(),
            'retry_attempt': self.retry_count + 1
        }

        self.processing_errors.append(error_entry)
        self.retry_count += 1
        self.save(update_fields=['processing_errors', 'retry_count'])

    def can_retry(self, max_retries: int = 3) -> bool:
        """Check if event processing can be retried"""
        return self.retry_count < max_retries and not self.processed

    class Meta:
        verbose_name = "Payment Event Store"
        verbose_name_plural = "Payment Event Store"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment', '-created_at']),
            models.Index(fields=['event_type', '-created_at']),
            models.Index(fields=['processed', '-created_at']),
            models.Index(fields=['to_state', '-created_at']),
        ]


class PaymentWebhookLog(BaseModel):
    """
    Log of payment webhook events received from gateways.

    This model tracks all webhook events for monitoring,
    debugging, and ensuring proper processing.
    """
    # Gateway and event identification
    gateway_code = models.CharField(
        max_length=50,
        help_text="Payment gateway code (stripe, paypal, etc.)"
    )
    event_type = models.CharField(
        max_length=100,
        help_text="Gateway-specific event type"
    )
    event_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Unique event identifier from gateway"
    )

    # Transaction context
    transaction_id = models.CharField(
        max_length=255,
        help_text="Gateway transaction identifier"
    )

    # Webhook payload
    raw_data = models.JSONField(
        help_text="Complete webhook payload from gateway"
    )

    # Processing status
    received_at = models.DateTimeField(
        default=timezone.now,
        help_text="When webhook was received"
    )
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When webhook was processed"
    )
    processed_successfully = models.BooleanField(
        default=False,
        help_text="Whether webhook was processed successfully"
    )

    # Processing details
    action_taken = models.CharField(
        max_length=100,
        blank=True,
        help_text="Action taken during processing"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if processing failed"
    )

    # Retry tracking
    retry_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of processing retry attempts"
    )

    def __str__(self):
        return f"{self.gateway_code} {self.event_type} - {self.event_id}"

    def mark_processed(self, success: bool, action: str = None, error: str = None):
        """Mark webhook as processed"""
        self.processed_at = timezone.now()
        self.processed_successfully = success
        if action:
            self.action_taken = action
        if error:
            self.error_message = error
        self.save()

    def increment_retry(self):
        """Increment retry count"""
        self.retry_count += 1
        self.save(update_fields=['retry_count'])

    class Meta:
        verbose_name = "Payment Webhook Log"
        verbose_name_plural = "Payment Webhook Logs"
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['gateway_code', '-received_at']),
            models.Index(fields=['event_type', '-received_at']),
            models.Index(fields=['processed_successfully', '-received_at']),
            models.Index(fields=['transaction_id']),
        ]