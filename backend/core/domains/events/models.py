# backend/core/domains/events/models.py
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
    
    client = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='events')
    event_type = models.ForeignKey(EventType, on_delete=models.PROTECT, null=True, blank=True)
    status = models.CharField(max_length=20, choices=EVENT_STATUSES, default='LEAD')
    name = models.CharField(max_length=255, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    workflow_template = models.ForeignKey('workflows.WorkflowTemplate', on_delete=models.SET_NULL, null=True)
    current_stage = models.ForeignKey('workflows.WorkflowStage', on_delete=models.SET_NULL, null=True)
    lead_source = models.CharField(max_length=50, blank=True)
    last_contacted = models.DateTimeField(null=True, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    product_options = models.ManyToManyField('products.ProductOption', through='EventProductOption')
    
    # Payment status fields (moved from EventPaymentStatus)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='UNPAID')
    total_amount_due = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    preferences = models.JSONField(default=dict, blank=True, help_text="Client preferences")
    
    # Use optimized manager by default
    objects = OptimizedEventManager()
    all_objects = models.Manager()  # Fallback to unoptimized if needed
    
    class Meta:
        indexes = [
            models.Index(fields=['client', 'status', '-start_date']),
            models.Index(fields=['event_type', 'status']),
            models.Index(fields=['payment_status', '-start_date']),
            models.Index(fields=['status', '-created_at']),
        ]

    def update_payment_status(self):
        """Update payment status based on completed payments"""
        from decimal import Decimal
        payments = self.payments.filter(status='COMPLETED')
        self.total_amount_paid = payments.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
        
        # Handle case where total_amount_due is None
        total_due = self.total_amount_due or Decimal('0')
        
        if self.total_amount_paid >= total_due and total_due > 0:
            self.payment_status = 'PAID'
        elif self.total_amount_paid > 0:
            self.payment_status = 'PARTIALLY_PAID'
        else:
            self.payment_status = 'UNPAID'
        self.save()

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
            
            # Find position without loading all objects
            try:
                current_position = stage_ids.index(self.current_stage_id) + 1
            except ValueError:
                current_position = 0
            
            # Calculate progress percentage
            progress = (current_position / len(stage_ids)) * 100 if stage_ids else 0
            
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