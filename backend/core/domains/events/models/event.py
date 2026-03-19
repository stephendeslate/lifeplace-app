from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from core.utils.models import BaseModel

from .event_type import EventType


class OptimizedEventManager(models.Manager):
    """Optimized manager with common query patterns pre-configured"""

    def get_queryset(self):
        """Always include basic related data"""
        return (
            super()
            .get_queryset()
            .select_related(
                "client", "event_type", "venue", "venue__venue_operating_rules", "workflow_template", "current_stage"
            )
        )

    def with_details(self):
        """Include all details for detail views"""
        return self.get_queryset().prefetch_related(
            "tasks__assigned_to",
            "tasks__workflow_stage",
            "event_products__product_option",
            "timeline__actor",
            "files__uploaded_by",
            "feedback__submitted_by",
            "feedback__response_by",
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
                "invoices",
                queryset=Invoice.objects.filter(status__in=["DRAFT", "SENT", "PAID"]).order_by("-created_at"),
                to_attr="_prefetched_invoices",
            ),
            Prefetch(
                "quotes",
                queryset=EventQuote.objects.filter(status="ACCEPTED").order_by("-created_at"),
                to_attr="_prefetched_quotes",
            ),
        )

    def active(self):
        """Get only active (non-cancelled) events"""
        return self.get_queryset().exclude(status="CANCELLED")

    def for_client(self, client_id):
        """Get events for a specific client"""
        return self.get_queryset().filter(client_id=client_id)

    def upcoming(self):
        """Get upcoming events"""
        return self.get_queryset().filter(start_date__gte=timezone.now()).order_by("start_date")


class Event(BaseModel):
    """Core event model tracking client events"""

    EVENT_STATUSES = (
        ("LEAD", "Lead"),
        ("CONFIRMED", "Confirmed"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )
    PAYMENT_STATUS_CHOICES = [
        ("UNPAID", "Unpaid"),
        ("PARTIALLY_PAID", "Partially Paid"),
        ("PAID", "Paid"),
    ]
    COMPLETION_TYPE_CHOICES = [
        ("payment", "Payment Completion"),
        ("quote", "Quote Request"),
    ]
    LEAD_SOURCE_CHOICES = [
        ("FACEBOOK", "Facebook"),
        ("REFERRAL", "Referral"),
        ("WALKIN", "Walk-in"),
        ("CLIENT_PORTAL", "Client Portal"),
        ("OTHER", "Other"),
    ]

    client = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="events")
    event_type = models.ForeignKey(EventType, on_delete=models.PROTECT, null=True, blank=True)
    status = models.CharField(max_length=20, choices=EVENT_STATUSES, default="LEAD")
    completion_type = models.CharField(
        max_length=20,
        choices=COMPLETION_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="How this event was completed in the booking flow",
    )
    name = models.CharField(max_length=255, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    workflow_template = models.ForeignKey("workflows.WorkflowTemplate", on_delete=models.SET_NULL, null=True)
    current_stage = models.ForeignKey("workflows.WorkflowStage", on_delete=models.SET_NULL, null=True)
    lead_source = models.CharField(max_length=50, blank=True, choices=LEAD_SOURCE_CHOICES)
    last_contacted = models.DateTimeField(null=True, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    product_options = models.ManyToManyField("products.ProductOption", through="EventProductOption")

    # VENUE FIELDS
    venue = models.ForeignKey(
        "venues.Venue",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
        help_text="Primary venue for this event",
    )

    # PROGRAM TIMING (client's actual program/event)
    program_start_time = models.DateTimeField(null=True, blank=True, help_text="Client's program start time")
    program_end_time = models.DateTimeField(null=True, blank=True, help_text="Client's program end time")
    program_duration_hours = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True, help_text="Program duration in hours"
    )

    # VENUE ACCESS (calculated from venue operating rules)
    ingress_start_time = models.DateTimeField(null=True, blank=True, help_text="Calculated ingress (setup) start time")
    egress_end_time = models.DateTimeField(null=True, blank=True, help_text="Calculated egress (teardown) end time")

    # EARLY CHECK-IN (optional, with fee)
    early_checkin_requested = models.BooleanField(default=False, help_text="Whether early check-in was requested")
    early_checkin_time = models.DateTimeField(null=True, blank=True, help_text="Requested early check-in time")
    early_checkin_hours = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True, help_text="Hours early for check-in"
    )
    early_checkin_fee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Early check-in fee amount"
    )

    # LATE CHECKOUT (requested, tracking actual is in late_checkout_fee_* fields)
    late_checkout_requested = models.BooleanField(default=False, help_text="Whether late checkout was requested")
    late_checkout_time = models.DateTimeField(null=True, blank=True, help_text="Requested late checkout time")
    late_checkout_hours = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True, help_text="Hours late for checkout"
    )

    # Accepted quote reference
    accepted_quote = models.ForeignKey(
        "sales.EventQuote",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_for_event",
        help_text="The accepted quote for this event",
    )

    # Payment status fields (moved from EventPaymentStatus)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="UNPAID")
    total_amount_due = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    preferences = models.JSONField(default=dict, blank=True, help_text="Client preferences")

    # GUEST COUNT
    num_participants = models.PositiveIntegerField(
        null=True, blank=True, help_text="Total number of guests/participants for this event"
    )

    # DATE BLOCKING FIELDS
    date_blocked = models.BooleanField(default=False, help_text="Whether this event's date is officially blocked")
    date_blocked_at = models.DateTimeField(null=True, blank=True, help_text="When the date was officially blocked")

    # DEADLINE TRACKING
    downpayment_deadline = models.DateTimeField(
        null=True, blank=True, help_text="Deadline for downpayment before auto-cancellation"
    )

    # CANCELLATION TRACKING
    CANCELLED_REASON_CHOICES = [
        ("CLIENT_REQUEST", "Client Requested"),
        ("PAYMENT_TIMEOUT", "Payment Deadline Expired"),
        ("DATE_TAKEN", "Date Taken by Another Booking"),
        ("ADMIN", "Admin Cancelled"),
    ]

    cancelled_reason = models.CharField(
        max_length=20, choices=CANCELLED_REASON_CHOICES, null=True, blank=True, help_text="Reason for cancellation"
    )
    cancelled_at = models.DateTimeField(null=True, blank=True, help_text="When the event was cancelled")

    # REBOOK SUPPORT
    original_event = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="rebooked_events",
        help_text="If this is a rebooked event, reference to original",
    )
    can_rebook = models.BooleanField(default=True, help_text="Whether this cancelled event can be rebooked")

    # DATE HOLD FIELDS (temporary holds that expire - extends permanent blocking)
    DATE_HOLD_STATUS_CHOICES = [
        ("NONE", "No Hold"),
        ("TEMPORARY_HOLD", "Temporary Hold"),
        ("PERMANENT_BLOCK", "Permanently Blocked"),
    ]
    date_hold_status = models.CharField(
        max_length=20,
        choices=DATE_HOLD_STATUS_CHOICES,
        default="NONE",
        help_text="Current hold status for this event's date",
    )
    date_hold_expires_at = models.DateTimeField(
        null=True, blank=True, help_text="When the temporary hold expires (null for permanent blocks)"
    )
    date_held_at = models.DateTimeField(null=True, blank=True, help_text="When the date was first held")
    date_hold_extended_count = models.PositiveIntegerField(
        default=0, help_text="Number of times the hold has been extended"
    )

    # CLIENT CANCELLATION REQUEST
    cancellation_requested = models.BooleanField(
        default=False, help_text="Whether the client has requested cancellation"
    )
    cancellation_requested_at = models.DateTimeField(
        null=True, blank=True, help_text="When the client requested cancellation"
    )
    cancellation_request_reason = models.TextField(blank=True, help_text="Client's reason for requesting cancellation")

    # RESCHEDULING TRACKING
    original_start_date = models.DateTimeField(
        null=True, blank=True, help_text="Original start date before any rescheduling"
    )
    reschedule_count = models.PositiveIntegerField(
        default=0, help_text="Number of times this event has been rescheduled"
    )
    last_rescheduled_at = models.DateTimeField(null=True, blank=True, help_text="When the event was last rescheduled")

    # CHECK-IN/OUT TRACKING
    CHECK_IN_STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("CHECKED_IN", "Checked In"),
        ("CHECKED_OUT", "Checked Out"),
        ("NO_SHOW", "No Show"),
    ]
    check_in_status = models.CharField(
        max_length=20, choices=CHECK_IN_STATUS_CHOICES, default="PENDING", help_text="Current check-in/out status"
    )
    scheduled_check_in_time = models.DateTimeField(
        null=True, blank=True, help_text="Scheduled check-in time (defaults to start_date)"
    )
    scheduled_checkout_time = models.DateTimeField(
        null=True, blank=True, help_text="Scheduled checkout time (defaults to end_date)"
    )
    actual_check_in_time = models.DateTimeField(null=True, blank=True, help_text="Actual check-in time")
    actual_checkout_time = models.DateTimeField(null=True, blank=True, help_text="Actual checkout time")
    checked_in_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events_checked_in",
        help_text="Staff who performed check-in",
    )
    checked_out_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events_checked_out",
        help_text="Staff who performed checkout",
    )
    check_in_notes = models.TextField(blank=True, help_text="Notes from check-in (condition, issues, etc.)")
    checkout_notes = models.TextField(blank=True, help_text="Notes from checkout (condition, damages, etc.)")

    # LATE CHECKOUT TRACKING
    late_checkout_fee_applied = models.BooleanField(
        default=False, help_text="Whether late checkout fee has been applied"
    )
    late_checkout_fee_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Late checkout fee amount applied"
    )

    # Use optimized manager by default
    objects = OptimizedEventManager()
    all_objects = models.Manager()  # Fallback to unoptimized if needed

    class Meta:
        indexes = [
            models.Index(fields=["client", "status", "-start_date"]),
            models.Index(fields=["event_type", "status"]),
            models.Index(fields=["payment_status", "-start_date"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["date_blocked", "start_date"]),  # For availability queries
            models.Index(fields=["downpayment_deadline", "payment_status"]),  # For deadline checks
            models.Index(fields=["date_hold_status", "date_hold_expires_at"]),  # For hold expiration queries
            models.Index(fields=["check_in_status", "start_date"]),  # For check-in tracking queries
            models.Index(fields=["venue", "start_date"]),  # For venue-based queries
            # Performance optimization indexes
            models.Index(fields=["workflow_template"]),  # For workflow-based queries
            models.Index(fields=["current_stage"]),  # For stage-based queries
            models.Index(fields=["accepted_quote"]),  # For quote lookup queries
        ]

    def update_payment_status(self):
        """Update payment status based on invoices and completed payments"""
        from decimal import Decimal

        # Get all issued/paid invoices for this event
        invoices = self.invoices.filter(status__in=["ISSUED", "PAID"])

        # Calculate total amount due from invoices (source of truth)
        total_invoiced = invoices.aggregate(Sum("total_amount"))["total_amount__sum"] or Decimal("0")

        # Calculate total amount paid from completed payments
        completed_payments = self.payments.filter(status="COMPLETED")
        total_paid = completed_payments.aggregate(Sum("amount"))["amount__sum"] or Decimal("0")

        # Update the total_amount_paid field (for backwards compatibility)
        self.total_amount_paid = total_paid

        # Update payment status based on invoice-payment relationship
        if total_invoiced == 0:
            # No invoices yet - treat as unpaid
            self.payment_status = "UNPAID"
        elif total_paid >= total_invoiced:
            # Fully paid - amount paid covers all invoiced amounts
            self.payment_status = "PAID"
        elif total_paid > 0:
            # Partially paid - some payment received but not covering full invoice total
            self.payment_status = "PARTIALLY_PAID"
        else:
            # No payments received for issued invoices
            self.payment_status = "UNPAID"

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

        invoices = self.invoices.filter(status__in=["ISSUED", "PAID"])
        return invoices.aggregate(Sum("total_amount"))["total_amount__sum"] or Decimal("0")

    @property
    def computed_total_amount_paid(self):
        """
        Computed property that calculates total amount paid from completed payments.
        This replaces reliance on the cached total_amount_paid field.
        """
        from decimal import Decimal

        completed_payments = self.payments.filter(status="COMPLETED")
        return completed_payments.aggregate(Sum("amount"))["amount__sum"] or Decimal("0")

    @property
    def notes(self):
        """Get all notes for this event"""
        from core.domains.notes.models import Note

        event_ct = ContentType.objects.get_for_model(self)
        return Note.objects.filter(content_type=event_ct, object_id=self.id)

    @property
    def workflow_progress(self):
        """
        Calculate workflow progress percentage - REDIS CACHED for performance
        Returns percentage of COMPLETED stages (not including current in-progress stage)
        """
        if not self.workflow_template_id or not self.current_stage_id:
            return 0

        # Use Redis cache service
        from ..cache_service import EventCacheService

        cached_progress = EventCacheService.get_workflow_progress(self.id)
        if cached_progress is not None:
            return cached_progress

        try:
            # More efficient query using values_list
            stage_ids = list(self.workflow_template.stages.values_list("id", flat=True).order_by("stage", "order"))

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
        if hasattr(self, "_prefetched_objects_cache") and "tasks" in self._prefetched_objects_cache:
            pending_tasks = [t for t in self.tasks.all() if t.status in ["PENDING", "IN_PROGRESS"]]
            if pending_tasks:
                return min(pending_tasks, key=lambda t: (t.due_date, t.priority))
            return None

        # Otherwise do a database query
        return self.tasks.filter(status__in=["PENDING", "IN_PROGRESS"]).order_by("due_date", "priority").first()

    @property
    def next_task(self):
        """Backward compatibility property"""
        return self.get_next_task()

    def get_duration_hours(self):
        """Get event duration in hours for pricing calculations"""
        # Method 1: If duration is explicitly stored
        if hasattr(self, "duration_hours") and self.duration_hours:
            return self.duration_hours

        # Method 2: Calculate from start/end dates
        if self.start_date and self.end_date:
            delta = self.end_date - self.start_date
            return int(delta.total_seconds() // 3600)

        # Method 3: Try to get from original booking session
        try:
            from core.domains.bookingflow.models import BookingSession

            latest_session = (
                BookingSession.objects.filter(booking_data__contains={"event_id": self.id})
                .order_by("-created_at")
                .first()
            )

            if latest_session:
                return latest_session._get_event_duration()
        except Exception:
            pass

        return None

    def __str__(self):
        event_name = self.name or f"{self.event_type} for {self.client}"
        return f"{event_name} on {self.start_date}"
