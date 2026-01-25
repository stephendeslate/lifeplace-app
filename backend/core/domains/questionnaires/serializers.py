# backend/core/domains/questionnaires/serializers.py
from core.domains.events.basic_serializers import EventTypeSerializer
from rest_framework import serializers

from .exceptions import InvalidFieldType, OptionsRequired
from .models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireResponse,
    EventQuestionnaire,
    EventQuestionnaireActivity,
)


class QuestionnaireFieldSerializer(serializers.ModelSerializer):
    """Serializer for the QuestionnaireField model"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = QuestionnaireField
        fields = [
            'id', 'questionnaire', 'name', 'type', 'type_display',
            'required', 'order', 'options',
            # Phase 1.1: Description and placeholder
            'description', 'placeholder',
            # Phase 1.3: Guest count (deprecated but kept for compatibility)
            'is_guest_count',
            # Phase 2.1: Conditional display
            'show_conditions',
            # Phase 4.1: File upload settings
            'max_file_size_mb', 'allowed_file_types', 'max_files',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate field data based on field type"""
        field_type = data.get('type')
        options = data.get('options')

        # Make sure select and multi-select have options
        if field_type in ['select', 'multi-select'] and (not options or len(options) == 0):
            raise OptionsRequired()

        # For 'guests' type, options define guest categories (optional)
        # Example: ["Adults", "Children (5-12)", "Infants (0-4)"]

        # Make sure field type is valid
        valid_types = [choice[0] for choice in QuestionnaireField.FIELD_TYPES]
        if field_type not in valid_types:
            raise InvalidFieldType(detail=f"Field type must be one of: {', '.join(valid_types)}")

        return data


class QuestionnaireSerializer(serializers.ModelSerializer):
    """Serializer for the Questionnaire model"""
    fields_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Questionnaire
        fields = [
            'id', 'name', 'event_type', 'is_active', 
            'order', 'created_at', 'updated_at', 'fields_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'fields_count']
    
    def get_fields_count(self, obj):
        """Get the number of fields for this questionnaire"""
        return obj.fields.count()


class QuestionnaireDetailSerializer(QuestionnaireSerializer):
    """Detailed serializer for Questionnaire including related fields"""
    fields = QuestionnaireFieldSerializer(many=True, read_only=True)
    event_type = EventTypeSerializer(read_only=True)
    
    class Meta(QuestionnaireSerializer.Meta):
        fields = QuestionnaireSerializer.Meta.fields + ['fields']


# Modified serializer class to fix the issue
class QuestionnaireFieldCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questionnaire fields - without requiring questionnaire"""
    class Meta:
        model = QuestionnaireField
        fields = [
            'name', 'type', 'required', 'order', 'options',
            # Phase 1.1: Description and placeholder
            'description', 'placeholder',
            # Phase 1.3: Guest count (deprecated)
            'is_guest_count',
            # Phase 2.1: Conditional display
            'show_conditions',
            # Phase 4.1: File upload settings
            'max_file_size_mb', 'allowed_file_types', 'max_files',
        ]

    def validate(self, data):
        """Validate field data based on field type"""
        field_type = data.get('type')
        options = data.get('options')

        # Make sure select and multi-select have options
        if field_type in ['select', 'multi-select'] and (not options or len(options) == 0):
            raise OptionsRequired()

        # Make sure field type is valid
        valid_types = [choice[0] for choice in QuestionnaireField.FIELD_TYPES]
        if field_type not in valid_types:
            raise InvalidFieldType(detail=f"Field type must be one of: {', '.join(valid_types)}")

        return data


class QuestionnaireWithFieldsSerializer(QuestionnaireSerializer):
    """Serializer for creating/updating Questionnaire with nested fields"""
    fields = QuestionnaireFieldCreateSerializer(many=True, required=False)
    
    class Meta(QuestionnaireSerializer.Meta):
        fields = QuestionnaireSerializer.Meta.fields + ['fields']
    
    def create(self, validated_data):
        fields_data = validated_data.pop('fields', [])
        questionnaire = Questionnaire.objects.create(**validated_data)
        
        # Create nested fields
        for field_data in fields_data:
            # Don't need to add questionnaire here - will be done in create
            QuestionnaireField.objects.create(questionnaire=questionnaire, **field_data)
        
        return questionnaire
    
    def update(self, instance, validated_data):
        fields_data = validated_data.pop('fields', None)
        
        # Update questionnaire fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update fields if provided
        if fields_data is not None:
            # Clear existing fields and create new ones
            instance.fields.all().delete()
            for field_data in fields_data:
                QuestionnaireField.objects.create(questionnaire=instance, **field_data)
        
        return instance


class QuestionnaireResponseSerializer(serializers.ModelSerializer):
    """Serializer for the QuestionnaireResponse model"""
    field_name = serializers.CharField(source='field.name', read_only=True)
    field_type = serializers.CharField(source='field.type', read_only=True)
    
    class Meta:
        model = QuestionnaireResponse
        fields = [
            'id', 'event', 'field', 'field_name', 'field_type',
            'value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate response value against field type"""
        field = data.get('field')
        value = data.get('value')
        
        # Implement validation logic based on field type
        # This would check that the value matches expected format for the field type
        # For example: dates are valid dates, emails are valid emails, etc.
        # For simplicity, omitting detailed validation here
        
        return data


class EventQuestionnaireResponsesSerializer(serializers.Serializer):
    """Serializer for submitting multiple responses for an event"""
    event = serializers.IntegerField()
    responses = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )


# ============================================================================
# EventQuestionnaire Serializers
# ============================================================================

class EventQuestionnaireActivitySerializer(serializers.ModelSerializer):
    """Serializer for questionnaire activity tracking"""
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    action_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EventQuestionnaireActivity
        fields = [
            'id', 'action', 'action_display', 'action_by',
            'action_by_name', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_action_by_name(self, obj):
        if obj.action_by:
            return obj.action_by.get_full_name() or obj.action_by.email
        return None


class EventQuestionnaireSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for EventQuestionnaire list views"""
    questionnaire_name = serializers.CharField(
        source='questionnaire.name',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    completion_stats = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = EventQuestionnaire
        fields = [
            'id', 'event', 'questionnaire', 'questionnaire_name',
            'status', 'status_display', 'sent_at',
            'completed_at', 'due_date', 'is_overdue',
            'completion_stats', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class EventQuestionnaireSerializer(serializers.ModelSerializer):
    """Full serializer for EventQuestionnaire with all details"""
    questionnaire_name = serializers.CharField(
        source='questionnaire.name',
        read_only=True
    )
    questionnaire_fields_count = serializers.SerializerMethodField()
    event_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    assigned_by_name = serializers.SerializerMethodField()
    sent_by_name = serializers.SerializerMethodField()
    completion_stats = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_until_due = serializers.ReadOnlyField()
    activities = EventQuestionnaireActivitySerializer(
        many=True,
        read_only=True
    )
    # Include questionnaire details for rendering the form
    questionnaire_detail = QuestionnaireDetailSerializer(
        source='questionnaire',
        read_only=True
    )

    class Meta:
        model = EventQuestionnaire
        fields = [
            'id', 'event', 'event_name', 'questionnaire',
            'questionnaire_name', 'questionnaire_fields_count',
            'questionnaire_detail',
            'client_name', 'client_email', 'status', 'status_display',
            'assigned_by', 'assigned_by_name',
            'sent_at', 'sent_by', 'sent_by_name',
            'completed_at', 'due_date', 'notes',
            'workflow_stage', 'completion_stats',
            'is_overdue', 'days_until_due',
            'activities', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sent_at', 'completed_at',
            'created_at', 'updated_at'
        ]

    def get_questionnaire_fields_count(self, obj):
        return obj.questionnaire.fields.count()

    def get_event_name(self, obj):
        if obj.event:
            return obj.event.name or f"Event #{obj.event.id}"
        return None

    def get_client_name(self, obj):
        if obj.event and obj.event.client:
            return obj.event.client.get_full_name() or obj.event.client.email
        return None

    def get_client_email(self, obj):
        if obj.event and obj.event.client:
            return obj.event.client.email
        return None

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name() or obj.assigned_by.email
        return None

    def get_sent_by_name(self, obj):
        if obj.sent_by:
            return obj.sent_by.get_full_name() or obj.sent_by.email
        return None


class EventQuestionnaireCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating EventQuestionnaire assignments"""
    class Meta:
        model = EventQuestionnaire
        fields = ['event', 'questionnaire', 'due_date', 'notes']

    def validate(self, data):
        # Check if assignment already exists
        if EventQuestionnaire.objects.filter(
            event=data['event'],
            questionnaire=data['questionnaire']
        ).exists():
            raise serializers.ValidationError(
                "This questionnaire is already assigned to this event."
            )

        # Validate questionnaire is active
        if not data['questionnaire'].is_active:
            raise serializers.ValidationError(
                "Cannot assign an inactive questionnaire."
            )

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request else None

        validated_data['assigned_by'] = user

        instance = super().create(validated_data)

        # Create activity record
        EventQuestionnaireActivity.objects.create(
            event_questionnaire=instance,
            action='CREATED',
            action_by=user,
            notes=f"Questionnaire assigned by {user.get_full_name() if user else 'system'}"
        )

        return instance


class EventQuestionnaireUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating EventQuestionnaire"""
    class Meta:
        model = EventQuestionnaire
        fields = ['due_date', 'notes']