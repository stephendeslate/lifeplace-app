# backend/core/domains/events/serializers/event_serializers.py
from django.db import transaction
from rest_framework import serializers

from core.domains.products.serializers import ProductOptionSerializer
from core.domains.users.serializers import UserSerializer
from core.domains.workflows.basic_serializers import (
    WorkflowStageSerializer,
    WorkflowTemplateSerializer,
)

from ..basic_serializers import EventTypeSerializer
from ..models import (
    Event,
    EventFeedback,
    EventFile,
    EventProductOption,
    EventTask,
    EventTimeline,
)


class EventTaskSerializer(serializers.ModelSerializer):
    """Serializer for the EventTask model"""

    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = EventTask
        fields = [
            "id",
            "event",
            "title",
            "description",
            "due_date",
            "priority",
            "status",
            "assigned_to",
            "assigned_to_name",
            "workflow_stage",
            "completion_notes",
            "completed_at",
            "completed_by",
            "is_visible_to_client",
            "requires_client_input",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
        return None


class EventTaskDetailSerializer(EventTaskSerializer):
    """Detailed serializer for the EventTask model"""

    assigned_to = UserSerializer(read_only=True)
    completed_by = UserSerializer(read_only=True)
    workflow_stage = WorkflowStageSerializer(read_only=True)
    dependencies = EventTaskSerializer(many=True, read_only=True)

    class Meta(EventTaskSerializer.Meta):
        fields = [*EventTaskSerializer.Meta.fields, "dependencies"]


class EventProductOptionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product_option.name", read_only=True)
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all(), required=False, allow_null=True)

    class Meta:
        model = EventProductOption
        fields = [
            "id",
            "event",
            "product_option",
            "product_name",
            "quantity",
            "final_price",
            "num_participants",
            "num_nights",
            "excess_hours",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EventProductOptionDetailSerializer(EventProductOptionSerializer):
    """Detailed serializer for the EventProductOption model"""

    product_option = ProductOptionSerializer(read_only=True)


class EventTimelineSerializer(serializers.ModelSerializer):
    """Serializer for the EventTimeline model"""

    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = EventTimeline
        fields = [
            "id",
            "event",
            "action_type",
            "description",
            "actor",
            "actor_name",
            "action_data",
            "is_public",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_actor_name(self, obj):
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name}"
        return None


class EventFileSerializer(serializers.ModelSerializer):
    """Serializer for the EventFile model"""

    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = EventFile
        fields = [
            "id",
            "event",
            "category",
            "file",
            "file_url",
            "name",
            "description",
            "mime_type",
            "size",
            "uploaded_by",
            "uploaded_by_name",
            "version",
            "is_public",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "mime_type", "size", "created_at", "updated_at", "file_url"]

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}"
        return None

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class EventFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for the EventFeedback model"""

    submitted_by_name = serializers.SerializerMethodField()
    response_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EventFeedback
        fields = [
            "id",
            "event",
            "submitted_by",
            "submitted_by_name",
            "overall_rating",
            "categories",
            "comments",
            "testimonial",
            "is_public",
            "response",
            "response_by",
            "response_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return f"{obj.submitted_by.first_name} {obj.submitted_by.last_name}"
        return None

    def get_response_by_name(self, obj):
        if obj.response_by:
            return f"{obj.response_by.first_name} {obj.response_by.last_name}"
        return None


class EventSerializer(serializers.ModelSerializer):
    """Serializer for the Event model"""

    event_type_name = serializers.CharField(source="event_type.name", read_only=True)
    client_name = serializers.SerializerMethodField()
    workflow_progress = serializers.FloatField(read_only=True)
    next_task = serializers.SerializerMethodField()
    current_stage_name = serializers.CharField(source="current_stage.name", read_only=True)
    workflow_template_name = serializers.CharField(source="workflow_template.name", read_only=True)

    # Add pricing fields from quotes/invoices (single source of truth)
    current_total_amount = serializers.SerializerMethodField()
    current_quote = serializers.SerializerMethodField()
    current_invoice = serializers.SerializerMethodField()

    # Check-in/out staff names
    checked_in_by_name = serializers.SerializerMethodField()
    checked_out_by_name = serializers.SerializerMethodField()

    # Timezone metadata (all datetime fields are in Philippine Time)
    timezone = serializers.SerializerMethodField()
    timezone_offset = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "client",
            "client_name",
            "event_type",
            "event_type_name",
            "name",
            "status",
            "start_date",
            "end_date",
            "workflow_template",
            "workflow_template_name",
            "current_stage",
            "current_stage_name",
            "lead_source",
            "last_contacted",
            "total_price",
            "payment_status",
            "total_amount_due",
            "total_amount_paid",
            "workflow_progress",
            "next_task",
            "preferences",
            "num_participants",
            "created_at",
            "updated_at",
            "current_total_amount",
            "current_quote",
            "current_invoice",
            # Date blocking fields
            "date_blocked",
            "date_blocked_at",
            # Date holding fields
            "date_hold_status",
            "date_hold_expires_at",
            "date_held_at",
            "date_hold_extended_count",
            # Rescheduling tracking
            "original_start_date",
            "reschedule_count",
            "last_rescheduled_at",
            # Check-in/out tracking
            "check_in_status",
            "scheduled_check_in_time",
            "scheduled_checkout_time",
            "actual_check_in_time",
            "actual_checkout_time",
            "checked_in_by",
            "checked_in_by_name",
            "checked_out_by",
            "checked_out_by_name",
            "check_in_notes",
            "checkout_notes",
            # Late checkout
            "late_checkout_fee_applied",
            "late_checkout_fee_amount",
            # Cancellation
            "cancelled_reason",
            "cancelled_at",
            "can_rebook",
            # Timezone metadata
            "timezone",
            "timezone_offset",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "workflow_progress",
            "next_task",
            "current_total_amount",
            "current_quote",
            "current_invoice",
            "date_blocked_at",
            "date_held_at",
            "actual_check_in_time",
            "actual_checkout_time",
            "cancelled_at",
            # Prevent mass assignment of status/financial fields
            "status",
            "payment_status",
            "date_blocked",
            "total_price",
            "total_amount_due",
            "total_amount_paid",
        ]

    def get_client_name(self, obj):
        if obj.client:
            return f"{obj.client.first_name} {obj.client.last_name}"
        return None

    def get_next_task(self, obj):
        next_task = obj.next_task
        if next_task:
            return {
                "id": next_task.id,
                "title": next_task.title,
                "description": next_task.description,
                "due_date": next_task.due_date,
                "status": next_task.status,
                "priority": next_task.priority,
            }
        return None

    def get_current_total_amount(self, obj):
        """Get current total amount from invoice or quote (single source of truth)

        Returns the final total amount including tax that the client should pay.
        Priority: Invoice total → Quote total → Legacy event.total_price

        OPTIMIZATION: Uses prefetched data when available to avoid N+1 queries.
        """
        try:
            # Priority 1: Most recent invoice (includes tax)
            # Use prefetched data if available (set by EventViewSet)
            if hasattr(obj, "_prefetched_invoices"):
                invoices = obj._prefetched_invoices
            else:
                invoices = list(obj.invoices.filter(status__in=["DRAFT", "SENT", "PAID"]).order_by("-created_at")[:1])

            if invoices:
                return str(invoices[0].total_amount)

            # Priority 2: Most recent accepted quote (includes tax)
            if hasattr(obj, "_prefetched_quotes"):
                quotes = obj._prefetched_quotes
            else:
                quotes = list(obj.quotes.filter(status="ACCEPTED").order_by("-created_at")[:1])

            if quotes:
                return str(quotes[0].total_amount)

            # Fallback: event.total_price (legacy)
            return str(obj.total_price) if obj.total_price else None

        except Exception:
            return str(obj.total_price) if obj.total_price else None

    def get_current_quote(self, obj):
        """Get current quote summary

        OPTIMIZATION: Uses prefetched data when available to avoid N+1 queries.
        """
        try:
            # Use prefetched data if available (set by EventViewSet)
            if hasattr(obj, "_prefetched_quotes"):
                quotes = obj._prefetched_quotes
            else:
                quotes = list(obj.quotes.filter(status="ACCEPTED").order_by("-created_at")[:1])

            if quotes:
                latest_quote = quotes[0]
                return {
                    "id": latest_quote.id,
                    "version": latest_quote.version,
                    "status": latest_quote.status,
                    "total_amount": str(latest_quote.total_amount),
                    "created_at": latest_quote.created_at.isoformat() if latest_quote.created_at else None,
                    "accepted_at": latest_quote.accepted_at.isoformat() if latest_quote.accepted_at else None,
                }
            return None
        except Exception:
            return None

    def get_current_invoice(self, obj):
        """Get current invoice summary

        OPTIMIZATION: Uses prefetched data when available to avoid N+1 queries.
        """
        try:
            # Use prefetched data if available (set by EventViewSet)
            if hasattr(obj, "_prefetched_invoices"):
                invoices = obj._prefetched_invoices
            else:
                invoices = list(obj.invoices.filter(status__in=["DRAFT", "SENT", "PAID"]).order_by("-created_at")[:1])

            if invoices:
                latest_invoice = invoices[0]
                return {
                    "id": latest_invoice.id,
                    "invoice_number": latest_invoice.invoice_number,
                    "status": latest_invoice.status,
                    "total_amount": str(latest_invoice.total_amount),
                    "created_at": latest_invoice.created_at.isoformat() if latest_invoice.created_at else None,
                    "due_date": latest_invoice.due_date.isoformat() if latest_invoice.due_date else None,
                }
            return None
        except Exception:
            return None

    def get_checked_in_by_name(self, obj):
        """Get name of staff who performed check-in"""
        if obj.checked_in_by:
            return f"{obj.checked_in_by.first_name} {obj.checked_in_by.last_name}"
        return None

    def get_checked_out_by_name(self, obj):
        """Get name of staff who performed checkout"""
        if obj.checked_out_by:
            return f"{obj.checked_out_by.first_name} {obj.checked_out_by.last_name}"
        return None

    def get_timezone(self, obj):
        """Get timezone for all datetime fields

        All event datetimes are in Philippine Time (Asia/Manila).
        The Philippines does not observe daylight saving time (constant UTC+8).
        """
        return "Asia/Manila"

    def get_timezone_offset(self, obj):
        """Get UTC offset for Philippine Time

        Philippines is UTC+8 year-round (no DST).
        """
        return "+08:00"

    def validate(self, data):
        """Validate event data"""
        # Ensure end_date is after start_date if both are provided
        start_date = data.get("start_date")
        end_date = data.get("end_date")

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})

        return data


class EventDetailSerializer(EventSerializer):
    """Detailed serializer for the Event model"""

    client = UserSerializer(read_only=True)
    event_type = EventTypeSerializer(read_only=True)
    workflow_template = WorkflowTemplateSerializer(read_only=True)
    current_stage = WorkflowStageSerializer(read_only=True)
    tasks = EventTaskSerializer(many=True, read_only=True)
    event_products = EventProductOptionSerializer(many=True, read_only=True)
    timeline = EventTimelineSerializer(many=True, read_only=True)
    files = EventFileSerializer(many=True, read_only=True)
    feedback = EventFeedbackSerializer(many=True, read_only=True)

    class Meta(EventSerializer.Meta):
        fields = [*EventSerializer.Meta.fields, "tasks", "event_products", "timeline", "files", "feedback"]


class EventCreateUpdateSerializer(EventSerializer):
    tasks = EventTaskSerializer(many=True, required=False)
    event_products = EventProductOptionSerializer(many=True, required=False)

    class Meta(EventSerializer.Meta):
        fields = [*EventSerializer.Meta.fields, "tasks", "event_products"]

    def create(self, validated_data):
        print("EventCreateUpdateSerializer validated data:", validated_data)  # Debug
        with transaction.atomic():
            tasks_data = validated_data.pop("tasks", [])
            event_products_data = validated_data.pop("event_products", [])
            print("Event products data:", event_products_data)  # Debug
            event = Event.objects.create(**validated_data)
            print("Event created with ID:", event.id)  # Debug
            for product_data in event_products_data:
                print("Creating EventProductOption with data:", product_data)  # Debug
                product_data["event"] = event
                EventProductOption.objects.create(**product_data)
            for task_data in tasks_data:
                task_data["event"] = event
                EventTask.objects.create(**task_data)
            EventTimeline.objects.create(
                event=event,
                action_type="SYSTEM_UPDATE",
                description="Event created",
                actor=self.context.get("request").user if self.context.get("request") else None,
                is_public=True,
            )
            return event

    def update(self, instance, validated_data):
        print(f"EventCreateUpdateSerializer update called for event {instance.id}")
        print("Validated data:", validated_data)

        tasks_data = validated_data.pop("tasks", None)
        event_products_data = validated_data.pop("event_products", None)

        # Track changes to create timeline entries
        changes = []

        # Check for status change
        if "status" in validated_data and validated_data["status"] != instance.status:
            old_status = instance.get_status_display()
            new_status = dict(Event.EVENT_STATUSES)[validated_data["status"]]
            changes.append(f"Status changed from {old_status} to {new_status}")

        # Check for workflow stage change
        if "current_stage" in validated_data and validated_data["current_stage"] != instance.current_stage:
            changes.append("Workflow stage updated")

        # Update event fields
        for key, value in validated_data.items():
            old_value = getattr(instance, key)
            if old_value != value:
                print(f"Updating {key}: {old_value} -> {value}")
                setattr(instance, key, value)

        instance.save()
        print(f"Event {instance.id} saved successfully")

        # Handle tasks updates if provided
        if tasks_data is not None:
            # Clear existing tasks and create new ones
            instance.tasks.all().delete()
            for task_data in tasks_data:
                task_data["event"] = instance
                EventTask.objects.create(**task_data)

        # Handle event products updates if provided
        if event_products_data is not None:
            # Clear existing products and create new ones
            instance.event_products.all().delete()
            for product_data in event_products_data:
                product_data["event"] = instance
                EventProductOption.objects.create(**product_data)

        # Create timeline entries for significant changes
        for change in changes:
            EventTimeline.objects.create(
                event=instance,
                action_type="SYSTEM_UPDATE",
                description=change,
                actor=self.context.get("request").user if self.context.get("request") else None,
                is_public=True,
            )

        return instance
