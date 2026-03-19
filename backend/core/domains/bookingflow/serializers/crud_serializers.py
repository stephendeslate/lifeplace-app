from rest_framework import serializers

from ..models import (
    BookingFlow,
    BookingFlowStep,
)


class BookingFlowCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating booking flows"""

    class Meta:
        model = BookingFlow
        fields = [
            "name",
            "description",
            "event_type",
            "workflow_template",
            "confirmation_email_template",
            "reminder_email_template",
            "is_active",
            "allow_guest_booking",
            "require_account_creation",
            "auto_approve_bookings",
            "enable_progress_saving",
            "max_advance_booking_days",
            "min_advance_booking_days",
            "allow_discounts",
            "available_discounts",
            "redirect_url",
            "success_message",
            "conversion_tracking_code",
        ]

    def validate_event_type(self, value):
        """Convert empty string to None for 'Any Event Type'"""
        if value in {"", "null"}:
            return None
        return value

    def validate(self, data):
        """Validate booking flow data"""
        # Ensure min advance booking is less than max
        min_days = data.get("min_advance_booking_days", 1)
        max_days = data.get("max_advance_booking_days", 365)

        if min_days >= max_days:
            raise serializers.ValidationError(
                {"max_advance_booking_days": "Maximum days must be greater than minimum days"}
            )

        # Check for active booking flows with same event type
        event_type = data.get("event_type")
        is_active = data.get("is_active", True)

        if is_active:
            # Check for existing active flows with same event type
            existing_flows = BookingFlow.objects.filter(event_type=event_type, is_active=True)

            if existing_flows.exists():
                if event_type:
                    # Get event type name for better error message
                    try:
                        from core.domains.events.models import EventType

                        event_type_obj = EventType.objects.get(id=event_type)
                        event_type_name = event_type_obj.name
                    except EventType.DoesNotExist:
                        event_type_name = f"Event Type ID {event_type}"

                    raise serializers.ValidationError(
                        {
                            "event_type": f"An active booking flow already exists for {event_type_name}. "
                            "Only one active flow per event type is allowed."
                        }
                    )
                else:
                    raise serializers.ValidationError(
                        {
                            "event_type": 'An active booking flow already exists for "Any Event Type". '
                            'Only one active flow for "Any Event Type" is allowed.'
                        }
                    )

        return data

    def create(self, validated_data):
        """Create booking flow with proper many-to-many handling"""
        # Extract many-to-many fields
        available_discounts = validated_data.pop("available_discounts", [])

        # Create the booking flow
        booking_flow = BookingFlow.objects.create(**validated_data)

        # Set many-to-many relationships
        if available_discounts:
            booking_flow.available_discounts.set(available_discounts)

        return booking_flow


class BookingFlowUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating booking flows"""

    class Meta:
        model = BookingFlow
        fields = [
            "name",
            "description",
            "event_type",
            "workflow_template",
            "confirmation_email_template",
            "reminder_email_template",
            "is_active",
            "allow_guest_booking",
            "require_account_creation",
            "auto_approve_bookings",
            "enable_progress_saving",
            "max_advance_booking_days",
            "min_advance_booking_days",
            "allow_discounts",
            "available_discounts",
            "redirect_url",
            "success_message",
            "conversion_tracking_code",
        ]

    def validate_event_type(self, value):
        """Convert empty string to None for 'Any Event Type'"""
        if value in {"", "null"}:
            return None
        return value

    def validate(self, data):
        """Validate booking flow update data"""
        # Get current instance for validation
        instance = getattr(self, "instance", None)

        if instance:
            # Merge current data with update data for validation
            current_data = {
                "min_advance_booking_days": instance.min_advance_booking_days,
                "max_advance_booking_days": instance.max_advance_booking_days,
                "event_type": instance.event_type_id,
                "is_active": instance.is_active,
            }
            current_data.update(data)

            min_days = current_data.get("min_advance_booking_days", 1)
            max_days = current_data.get("max_advance_booking_days", 365)

            if min_days >= max_days:
                raise serializers.ValidationError(
                    {"max_advance_booking_days": "Maximum days must be greater than minimum days"}
                )

            # Check for active booking flows with same event type
            event_type = current_data.get("event_type")
            is_active = current_data.get("is_active", True)

            if is_active:
                # Check for existing active flows with same event type (excluding current instance)
                existing_flows = BookingFlow.objects.filter(event_type=event_type, is_active=True).exclude(
                    pk=instance.pk
                )

                if existing_flows.exists():
                    if event_type:
                        # Get event type name for better error message
                        try:
                            from core.domains.events.models import EventType

                            event_type_obj = EventType.objects.get(id=event_type)
                            event_type_name = event_type_obj.name
                        except EventType.DoesNotExist:
                            event_type_name = f"Event Type ID {event_type}"

                        raise serializers.ValidationError(
                            {
                                "event_type": f"An active booking flow already exists for {event_type_name}. "
                                "Only one active flow per event type is allowed."
                            }
                        )
                    else:
                        raise serializers.ValidationError(
                            {
                                "event_type": 'An active booking flow already exists for "Any Event Type". '
                                'Only one active flow for "Any Event Type" is allowed.'
                            }
                        )

        return data

    def update(self, instance, validated_data):
        """Update booking flow with proper many-to-many handling"""
        # Extract many-to-many fields
        available_discounts = validated_data.pop("available_discounts", None)

        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update many-to-many relationships if provided
        if available_discounts is not None:
            instance.available_discounts.set(available_discounts)

        return instance


class BookingFlowStepCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating booking flow steps"""

    class Meta:
        model = BookingFlowStep
        fields = [
            "booking_flow",
            "step_type",
            "description",
            "order",
            "is_enabled",
            "is_required",
            "is_skippable",
            "display_conditions",
            "configuration",
            "validation_rules",
        ]

        extra_kwargs = {"order": {"required": False, "allow_null": True}}

    def validate_step_type(self, value):
        """Validate that availability_check step type is not being created"""
        if value == "availability_check":
            raise serializers.ValidationError(
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
        return value

    def validate(self, data):
        """Validate step data"""
        booking_flow = data.get("booking_flow")
        step_type = data.get("step_type")

        # Check for duplicate step type in the same flow
        if booking_flow and step_type:
            existing_step = BookingFlowStep.objects.filter(booking_flow=booking_flow, step_type=step_type).first()

            if existing_step:
                raise serializers.ValidationError(
                    {"step_type": f'A step with type "{step_type}" already exists in this booking flow'}
                )

        return data


class BookingFlowStepUpdateSerializer(serializers.ModelSerializer):
    """Simplified serializer for updating booking flow steps"""

    class Meta:
        model = BookingFlowStep
        fields = [
            "step_type",
            "description",
            "order",
            "is_enabled",
            "is_required",
            "is_skippable",
            "display_conditions",
            "configuration",
            "validation_rules",
        ]

    def validate_step_type(self, value):
        """Validate that availability_check step type is not being set"""
        if value == "availability_check":
            raise serializers.ValidationError(
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
        return value

    def validate(self, data):
        """Validate step update data"""
        instance = getattr(self, "instance", None)
        step_type = data.get("step_type")

        # Check for duplicate step type if changing
        if instance and step_type and step_type != instance.step_type:
            existing_step = (
                BookingFlowStep.objects.filter(booking_flow=instance.booking_flow, step_type=step_type)
                .exclude(id=instance.id)
                .first()
            )

            if existing_step:
                raise serializers.ValidationError(
                    {"step_type": f'A step with type "{step_type}" already exists in this booking flow'}
                )

        return data


class BookingSessionCreateSerializer(serializers.Serializer):
    """Serializer for creating a new booking session"""

    booking_flow = serializers.IntegerField()
    ip_address = serializers.IPAddressField(required=False)
    user_agent = serializers.CharField(required=False, allow_blank=True)
    referrer_url = serializers.URLField(required=False, allow_blank=True)


class BookingSessionUpdateSerializer(serializers.Serializer):
    """Serializer for updating booking session data"""

    session_id = serializers.UUIDField()
    step_id = serializers.IntegerField()
    step_data = serializers.DictField()
    mark_completed = serializers.BooleanField(default=False)


class ReorderStepsSerializer(serializers.Serializer):
    """Serializer for reordering steps"""

    flow_id = serializers.IntegerField()
    order_mapping = serializers.DictField(
        child=serializers.IntegerField(), help_text="Mapping of step IDs to their new order positions"
    )


class DuplicateFlowSerializer(serializers.Serializer):
    """Serializer for duplicating a booking flow"""

    name = serializers.CharField(max_length=255)
    copy_steps = serializers.BooleanField(default=True)
    copy_configuration = serializers.BooleanField(default=True)

    def validate_name(self, value):
        """Ensure the new name is unique"""
        if BookingFlow.objects.filter(name=value).exists():
            raise serializers.ValidationError("A booking flow with this name already exists.")
        return value
