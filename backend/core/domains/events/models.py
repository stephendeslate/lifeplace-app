# backend/core/domains/events/models.py
from core.utils.models import BaseModel
from django.contrib.contenttypes.models import ContentType
from django.core.validators import (
    FileExtensionValidator,
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models
from django.db.models import Sum
from django.utils import timezone


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

    def update_payment_status(self):
        """Update payment status based on completed payments"""
        payments = self.payments.filter(status='COMPLETED')
        self.total_amount_paid = payments.aggregate(Sum('amount'))['amount__sum'] or 0
        
        if self.total_amount_paid >= self.total_amount_due:
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
        Calculate workflow progress percentage based on current stage position
        """
        if not self.workflow_template or not self.current_stage:
            return 0
            
        try:
            # Get all stages for this template
            stages = self.workflow_template.stages.all().order_by('stage', 'order')
            total_stages = stages.count()
            
            if total_stages == 0:
                return 0
                
            # Find the position of the current stage
            all_stages = list(stages)
            current_position = 0
            
            for i, stage in enumerate(all_stages):
                if stage.id == self.current_stage.id:
                    current_position = i + 1
                    break
                    
            # Calculate progress percentage
            return (current_position / total_stages) * 100
        except Exception:
            return 0
        
    @property
    def next_task(self):
        """Get the next pending task for this event"""
        try:
            return self.tasks.filter(
                status__in=['PENDING', 'IN_PROGRESS']
            ).order_by('due_date', 'priority').first()
        except Exception:
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
            try:
                import magic
                self.mime_type = magic.from_buffer(self.file.read(1024), mime=True)
            except (ImportError, AttributeError):
                self.mime_type = self.file.content_type
            
        super().save(*args, **kwargs)