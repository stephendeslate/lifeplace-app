# backend/core/domains/events/models.py
import uuid

from core.utils.models import BaseModel
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.core.validators import (
    FileExtensionValidator,
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models
from django.db.models import Count, F, Sum
from django.utils import timezone


class OptimizedEventManager(models.Manager):
    """Optimized manager with common query patterns pre-configured"""

    def get_queryset(self):
        """Always include basic related data"""
        return super().get_queryset().select_related(
            'client',
            'event_type',
            'venue',
            'venue__venue_operating_rules',
            'workflow_template',
            'current_stage'
        )

    def with_details(self):
        """Include all details for detail views"""
        return self.get_queryset().prefetch_related(
            'tasks__assigned_to',
            'tasks__workflow_stage',
            'event_products__product_option',
            'timeline__actor',
            'files__uploaded_by',
            'feedback__submitted_by',
            'feedback__response_by',
        )

    def with_financial_data(self):
        """Include filtered invoice and quote prefetching for list views.

        This version uses lazy imports to avoid circular dependencies.
        Prefetches only active invoices and accepted quotes.
        """
        from django.db.models import Prefetch
        # Lazy imports to avoid circular dependency
        from core.domains.payments.models import Invoice
        from core.domains.sales.models import EventQuote

        return self.get_queryset().prefetch_related(
            Prefetch(
                'invoices',
                queryset=Invoice.objects.filter(
                    status__in=['DRAFT', 'SENT', 'PAID']
                ).order_by('-created_at'),
                to_attr='_prefetched_invoices'
            ),
            Prefetch(
                'quotes',
                queryset=EventQuote.objects.filter(
                    status='ACCEPTED'
                ).order_by('-created_at'),
                to_attr='_prefetched_quotes'
            ),
        )

    def active(self):
        """Get only active (non-cancelled) events"""
        return self.get_queryset().exclude(status='CANCELLED')

    def for_client(self, client_id):
        """Get events for a specific client"""
        return self.get_queryset().filter(client_id=client_id)

    def upcoming(self):
        """Get upcoming events"""
        return self.get_queryset().filter(
            start_date__gte=timezone.now()
        ).order_by('start_date')


class EventType(BaseModel):
    """Event types offered by the company"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    color = models.CharField(
        max_length=7,
        blank=True,
        help_text="Hex color code for UI display (e.g., #2d5016)"
    )

    def __str__(self):
        return self.name


class Event(BaseModel):
    """Core event model tracking client events"""
    EVENT_STATUSES = (
        ('LEAD', 'Lead'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    PAYMENT_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('PAID', 'Paid'),
    ]
    COMPLETION_TYPE_CHOICES = [
        ('payment', 'Payment Completion'),
        ('quote', 'Quote Request'),
    ]
    LEAD_SOURCE_CHOICES = [
        ('FACEBOOK', 'Facebook'),
        ('REFERRAL', 'Referral'),
        ('WALKIN', 'Walk-in'),
        ('CLIENT_PORTAL', 'Client Portal'),
        ('OTHER', 'Other'),
    ]

    client = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='events')
    event_type = models.ForeignKey(EventType, on_delete=models.PROTECT, null=True, blank=True)
    status = models.CharField(max_length=20, choices=EVENT_STATUSES, default='LEAD')
    completion_type = models.CharField(
        max_length=20,
        choices=COMPLETION_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="How this event was completed in the booking flow"
    )
    name = models.CharField(max_length=255, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    workflow_template = models.ForeignKey('workflows.WorkflowTemplate', on_delete=models.SET_NULL, null=True)
    current_stage = models.ForeignKey('workflows.WorkflowStage', on_delete=models.SET_NULL, null=True)
    lead_source = models.CharField(max_length=50, blank=True, choices=LEAD_SOURCE_CHOICES)
    last_contacted = models.DateTimeField(null=True, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    product_options = models.ManyToManyField('products.ProductOption', through='EventProductOption')

    # VENUE FIELDS
    venue = models.ForeignKey(
        'venues.Venue',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
        help_text="Primary venue for this event"
    )

    # PROGRAM TIMING (client's actual program/event)
    program_start_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Client's program start time"
    )
    program_end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Client's program end time"
    )
    program_duration_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Program duration in hours"
    )

    # VENUE ACCESS (calculated from venue operating rules)
    ingress_start_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Calculated ingress (setup) start time"
    )
    egress_end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Calculated egress (teardown) end time"
    )

    # EARLY CHECK-IN (optional, with fee)
    early_checkin_requested = models.BooleanField(
        default=False,
        help_text="Whether early check-in was requested"
    )
    early_checkin_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Requested early check-in time"
    )
    early_checkin_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Hours early for check-in"
    )
    early_checkin_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Early check-in fee amount"
    )

    # LATE CHECKOUT (requested, tracking actual is in late_checkout_fee_* fields)
    late_checkout_requested = models.BooleanField(
        default=False,
        help_text="Whether late checkout was requested"
    )
    late_checkout_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Requested late checkout time"
    )
    late_checkout_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Hours late for checkout"
    )

    # Accepted quote reference
    accepted_quote = models.ForeignKey(
        'sales.EventQuote',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_for_event',
        help_text="The accepted quote for this event"
    )

    # Payment status fields (moved from EventPaymentStatus)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='UNPAID')
    total_amount_due = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    preferences = models.JSONField(default=dict, blank=True, help_text="Client preferences")

    # GUEST COUNT
    num_participants = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Total number of guests/participants for this event"
    )

    # DATE BLOCKING FIELDS
    date_blocked = models.BooleanField(
        default=False,
        help_text="Whether this event's date is officially blocked"
    )
    date_blocked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the date was officially blocked"
    )

    # DEADLINE TRACKING
    downpayment_deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Deadline for downpayment before auto-cancellation"
    )

    # CANCELLATION TRACKING
    CANCELLED_REASON_CHOICES = [
        ('CLIENT_REQUEST', 'Client Requested'),
        ('PAYMENT_TIMEOUT', 'Payment Deadline Expired'),
        ('DATE_TAKEN', 'Date Taken by Another Booking'),
        ('ADMIN', 'Admin Cancelled'),
    ]

    cancelled_reason = models.CharField(
        max_length=20,
        choices=CANCELLED_REASON_CHOICES,
        null=True,
        blank=True,
        help_text="Reason for cancellation"
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the event was cancelled"
    )

    # REBOOK SUPPORT
    original_event = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='rebooked_events',
        help_text="If this is a rebooked event, reference to original"
    )
    can_rebook = models.BooleanField(
        default=True,
        help_text="Whether this cancelled event can be rebooked"
    )

    # DATE HOLD FIELDS (temporary holds that expire - extends permanent blocking)
    DATE_HOLD_STATUS_CHOICES = [
        ('NONE', 'No Hold'),
        ('TEMPORARY_HOLD', 'Temporary Hold'),
        ('PERMANENT_BLOCK', 'Permanently Blocked'),
    ]
    date_hold_status = models.CharField(
        max_length=20,
        choices=DATE_HOLD_STATUS_CHOICES,
        default='NONE',
        help_text="Current hold status for this event's date"
    )
    date_hold_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the temporary hold expires (null for permanent blocks)"
    )
    date_held_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the date was first held"
    )
    date_hold_extended_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times the hold has been extended"
    )

    # RESCHEDULING TRACKING
    original_start_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Original start date before any rescheduling"
    )
    reschedule_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times this event has been rescheduled"
    )
    last_rescheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the event was last rescheduled"
    )

    # CHECK-IN/OUT TRACKING
    CHECK_IN_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CHECKED_IN', 'Checked In'),
        ('CHECKED_OUT', 'Checked Out'),
        ('NO_SHOW', 'No Show'),
    ]
    check_in_status = models.CharField(
        max_length=20,
        choices=CHECK_IN_STATUS_CHOICES,
        default='PENDING',
        help_text="Current check-in/out status"
    )
    scheduled_check_in_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Scheduled check-in time (defaults to start_date)"
    )
    scheduled_checkout_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Scheduled checkout time (defaults to end_date)"
    )
    actual_check_in_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Actual check-in time"
    )
    actual_checkout_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Actual checkout time"
    )
    checked_in_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events_checked_in',
        help_text="Staff who performed check-in"
    )
    checked_out_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events_checked_out',
        help_text="Staff who performed checkout"
    )
    check_in_notes = models.TextField(
        blank=True,
        help_text="Notes from check-in (condition, issues, etc.)"
    )
    checkout_notes = models.TextField(
        blank=True,
        help_text="Notes from checkout (condition, damages, etc.)"
    )

    # LATE CHECKOUT TRACKING
    late_checkout_fee_applied = models.BooleanField(
        default=False,
        help_text="Whether late checkout fee has been applied"
    )
    late_checkout_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Late checkout fee amount applied"
    )

    # Use optimized manager by default
    objects = OptimizedEventManager()
    all_objects = models.Manager()  # Fallback to unoptimized if needed
    
    class Meta:
        indexes = [
            models.Index(fields=['client', 'status', '-start_date']),
            models.Index(fields=['event_type', 'status']),
            models.Index(fields=['payment_status', '-start_date']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['date_blocked', 'start_date']),  # For availability queries
            models.Index(fields=['downpayment_deadline', 'payment_status']),  # For deadline checks
            models.Index(fields=['date_hold_status', 'date_hold_expires_at']),  # For hold expiration queries
            models.Index(fields=['check_in_status', 'start_date']),  # For check-in tracking queries
            models.Index(fields=['venue', 'start_date']),  # For venue-based queries
            # Performance optimization indexes
            models.Index(fields=['workflow_template']),  # For workflow-based queries
            models.Index(fields=['current_stage']),  # For stage-based queries
            models.Index(fields=['accepted_quote']),  # For quote lookup queries
        ]

    def update_payment_status(self):
        """Update payment status based on invoices and completed payments"""
        from decimal import Decimal

        # Get all issued/paid invoices for this event
        invoices = self.invoices.filter(status__in=['ISSUED', 'PAID'])

        # Calculate total amount due from invoices (source of truth)
        total_invoiced = invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0')

        # Calculate total amount paid from completed payments
        completed_payments = self.payments.filter(status='COMPLETED')
        total_paid = completed_payments.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

        # Update the total_amount_paid field (for backwards compatibility)
        self.total_amount_paid = total_paid

        # Update payment status based on invoice-payment relationship
        if total_invoiced == 0:
            # No invoices yet - treat as unpaid
            self.payment_status = 'UNPAID'
        elif total_paid >= total_invoiced:
            # Fully paid - amount paid covers all invoiced amounts
            self.payment_status = 'PAID'
        elif total_paid > 0:
            # Partially paid - some payment received but not covering full invoice total
            self.payment_status = 'PARTIALLY_PAID'
        else:
            # No payments received for issued invoices
            self.payment_status = 'UNPAID'

        # Sync total_amount_due with invoice totals (for backwards compatibility)
        if total_invoiced > 0:
            self.total_amount_due = total_invoiced

        self.save()

    @property
    def computed_total_amount_due(self):
        """
        Computed property that calculates total amount due from invoices.
        This is the new source of truth, replacing the manual total_amount_due field.
        """
        from decimal import Decimal
        invoices = self.invoices.filter(status__in=['ISSUED', 'PAID'])
        return invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0')

    @property
    def computed_total_amount_paid(self):
        """
        Computed property that calculates total amount paid from completed payments.
        This replaces reliance on the cached total_amount_paid field.
        """
        from decimal import Decimal
        completed_payments = self.payments.filter(status='COMPLETED')
        return completed_payments.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

    @property
    def notes(self):
        """Get all notes for this event"""
        Note = ContentType.objects.get(app_label='notes', model='note').model_class()
        return Note.objects.filter(
            content_type=ContentType.objects.get_for_model(self),
            object_id=self.id
        )
        
    @property
    def workflow_progress(self):
        """
        Calculate workflow progress percentage - REDIS CACHED for performance
        Returns percentage of COMPLETED stages (not including current in-progress stage)
        """
        if not self.workflow_template_id or not self.current_stage_id:
            return 0

        # Use Redis cache service
        from .cache_service import EventCacheService

        cached_progress = EventCacheService.get_workflow_progress(self.id)
        if cached_progress is not None:
            return cached_progress

        try:
            # More efficient query using values_list
            stage_ids = list(self.workflow_template.stages.values_list('id', flat=True).order_by('stage', 'order'))

            if not stage_ids:
                return 0

            # Find position of current stage (0-indexed)
            try:
                current_index = stage_ids.index(self.current_stage_id)
            except ValueError:
                current_index = 0

            # Calculate progress percentage based on COMPLETED stages
            # (stages before current, not including current)
            completed_count = current_index  # 0-indexed, so this is count of stages before current
            progress = (completed_count / len(stage_ids)) * 100 if stage_ids else 0

            # Cache in Redis
            EventCacheService.set_workflow_progress(self.id, progress)
            return progress
        except Exception:
            return 0
        
    def get_next_task(self):
        """Get the next pending task - Use prefetched data when available"""
        # If tasks are prefetched, use them to avoid a query
        if hasattr(self, '_prefetched_objects_cache') and 'tasks' in self._prefetched_objects_cache:
            pending_tasks = [t for t in self.tasks.all() if t.status in ['PENDING', 'IN_PROGRESS']]
            if pending_tasks:
                return min(pending_tasks, key=lambda t: (t.due_date, t.priority))
            return None
        
        # Otherwise do a database query
        return self.tasks.filter(
            status__in=['PENDING', 'IN_PROGRESS']
        ).order_by('due_date', 'priority').first()
    
    @property
    def next_task(self):
        """Backward compatibility property"""
        return self.get_next_task()

    def get_duration_hours(self):
        """Get event duration in hours for pricing calculations"""
        # Method 1: If duration is explicitly stored
        if hasattr(self, 'duration_hours') and self.duration_hours:
            return self.duration_hours

        # Method 2: Calculate from start/end dates
        if self.start_date and self.end_date:
            delta = self.end_date - self.start_date
            return int(delta.total_seconds() // 3600)

        # Method 3: Try to get from original booking session
        try:
            from core.domains.bookingflow.models import BookingSession
            latest_session = BookingSession.objects.filter(
                booking_data__contains={'event_id': self.id}
            ).order_by('-created_at').first()

            if latest_session:
                return latest_session._get_event_duration()
        except Exception:
            pass

        return None

    def __str__(self):
        event_name = self.name or f"{self.event_type} for {self.client}"
        return f"{event_name} on {self.start_date}"


class EventProductOption(BaseModel):
    """Junction model linking products to events with quantity and pricing"""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='event_products')
    product_option = models.ForeignKey('products.ProductOption', on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    num_participants = models.PositiveIntegerField(null=True, blank=True)
    num_nights = models.PositiveIntegerField(null=True, blank=True)
    excess_hours = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('event', 'product_option')

    def __str__(self):
        return f"{self.product_option.name} for {self.event}"


class EventTask(BaseModel):
    """Tasks associated with an event"""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    priority = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent')
    ])
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('BLOCKED', 'Blocked'),
        ('CANCELLED', 'Cancelled')
    ])
    assigned_to = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='assigned_tasks'
    )
    workflow_stage = models.ForeignKey(
        'workflows.WorkflowStage', 
        on_delete=models.SET_NULL, 
        null=True
    )
    dependencies = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='dependent_tasks',
        blank=True
    )
    completion_notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='completed_tasks'
    )
    is_visible_to_client = models.BooleanField(default=False)
    requires_client_input = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['due_date', 'priority']
        indexes = [
            models.Index(fields=['event', 'status', 'due_date'])
        ]

    def __str__(self):
        return f"{self.title} - Event {self.event.id} ({self.status})"

    def save(self, *args, **kwargs):
        if self.status == 'COMPLETED' and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)


class EventFeedback(BaseModel):
    """Client feedback and ratings for completed events"""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='feedback')
    submitted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    overall_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    categories = models.JSONField(default=dict)  # Store category-specific ratings
    comments = models.TextField(blank=True)
    testimonial = models.TextField(blank=True)  # Public testimonial text
    is_public = models.BooleanField(default=False)  # Whether can be used as testimonial
    response = models.TextField(blank=True)  # Admin response to feedback
    response_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='feedback_responses'
    )
    
    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['event', 'submitted_by'],
                name='unique_event_feedback_per_user'
            )
        ]

    def __str__(self):
        return f"Feedback for Event {self.event.id} - Rating: {self.overall_rating}"


class EventTimeline(BaseModel):
    """Tracks significant events in an event's lifecycle"""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='timeline')
    action_type = models.CharField(max_length=50, choices=[
        ('STATUS_CHANGE', 'Status Changed'),
        ('STAGE_CHANGE', 'Stage Changed'),
        ('QUOTE_CREATED', 'Quote Created'),
        ('QUOTE_UPDATED', 'Quote Updated'),
        ('QUOTE_ACCEPTED', 'Quote Accepted'),
        ('CONTRACT_SENT', 'Contract Sent'),
        ('CONTRACT_SIGNED', 'Contract Signed'),
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('NOTE_ADDED', 'Note Added'),
        ('FILE_UPLOADED', 'File Uploaded'),
        ('TASK_COMPLETED', 'Task Completed'),
        ('FEEDBACK_RECEIVED', 'Feedback Received'),
        ('CLIENT_MESSAGE', 'Client Message'),
        ('SYSTEM_UPDATE', 'System Update')
    ])
    description = models.TextField()
    actor = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='event_actions'
    )
    action_data = models.JSONField(null=True, blank=True)  # Store additional context
    is_public = models.BooleanField(default=False)  # Whether visible to client
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'action_type', '-created_at'])
        ]

    def __str__(self):
        return f"{self.action_type} - Event {self.event.id} - {self.created_at}"


class EventFile(BaseModel):
    """Files associated with an event (photos, documents, etc)"""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='files')
    category = models.CharField(max_length=50, choices=[
        ('CONTRACT', 'Contract Document'),
        ('QUOTE', 'Quote/Proposal'),
        ('PAYMENT', 'Payment Document'),
        ('REQUIREMENTS', 'Requirements Doc'),
        ('PHOTO', 'Photo'),
        ('OTHER', 'Other')
    ])
    file = models.FileField(
        upload_to='event_files/%Y/%m/',
        validators=[FileExtensionValidator(
            allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
        )]
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    mime_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()  # File size in bytes
    uploaded_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True
    )
    version = models.PositiveIntegerField(default=1)
    is_public = models.BooleanField(default=False)  # Whether client can view

    class Meta:
        ordering = ['-created_at', '-version']

    def __str__(self):
        return f"{self.name} ({self.category}) - Event {self.event.id}"

    def save(self, *args, **kwargs):
        # Set file size before saving
        if not self.size and self.file:
            self.size = self.file.size
            
        # Set mime type if available
        if not self.mime_type and self.file:
            import mimetypes
            mime_type, _ = mimetypes.guess_type(self.file.name)
            self.mime_type = mime_type or getattr(self.file, 'content_type', '')

        super().save(*args, **kwargs)


class EventDateReminder(BaseModel):
    """Tracks event date reminders sent to prevent duplicate reminders.

    Used by the schedule_event_date_reminders Celery task to record
    which reminders have been sent for each event at each interval
    (e.g., 7 days before, 3 days before, 1 day before).
    """
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='date_reminders',
        help_text="The event this reminder was sent for"
    )
    days_before = models.PositiveIntegerField(
        help_text="Number of days before event this reminder was sent"
    )
    sent_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this reminder was sent"
    )
    communication_record_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="UUID of the CommunicationRecord for tracking delivery status"
    )

    class Meta:
        verbose_name = 'Event Date Reminder'
        verbose_name_plural = 'Event Date Reminders'
        unique_together = [['event', 'days_before']]
        indexes = [
            models.Index(fields=['event', 'days_before']),
            models.Index(fields=['sent_at']),
        ]
        ordering = ['-sent_at']

    def __str__(self):
        return f"Reminder for Event {self.event_id} - {self.days_before} days before"


class DateReservation(BaseModel):
    """
    Temporary date reservation for payment processing window.

    Used to prevent race conditions during the booking completion flow.
    When a client clicks "Complete Booking", a reservation is created that
    temporarily holds the date for 5 minutes while payment is processed.

    This implements pessimistic locking to ensure only one client can
    successfully book a date, even if multiple clients are in the payment
    flow simultaneously.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('CONFIRMED', 'Confirmed'),
        ('RELEASED', 'Released'),
        ('EXPIRED', 'Expired'),
    ]

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        help_text="Unique token for identifying this reservation"
    )
    target_date = models.DateField(
        db_index=True,
        help_text="The date being reserved"
    )
    booking_session_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="The booking session that created this reservation"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text="Current status of the reservation"
    )
    expires_at = models.DateTimeField(
        help_text="When this reservation expires (5 minutes from creation)"
    )
    confirmed_event_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="The event ID if this reservation was confirmed"
    )

    class Meta:
        verbose_name = 'Date Reservation'
        verbose_name_plural = 'Date Reservations'
        indexes = [
            models.Index(fields=['target_date', 'status']),
            models.Index(fields=['booking_session_id']),
            models.Index(fields=['status', 'expires_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Reservation {self.token} for {self.target_date} ({self.status})"

    @property
    def is_expired(self):
        """Check if this reservation has expired"""
        return timezone.now() >= self.expires_at

    @property
    def is_active(self):
        """Check if this reservation is still active (pending and not expired)"""
        return self.status == 'PENDING' and not self.is_expired