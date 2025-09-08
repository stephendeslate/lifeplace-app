# backend/core/domains/events/serializers/client_serializers.py
from rest_framework import serializers
from ..models import Event, EventTimeline, EventFile, EventTask, EventFeedback
from core.domains.workflows.models import WorkflowStage


class ClientWorkflowStageSerializer(serializers.ModelSerializer):
    """Simplified workflow stage for client view"""
    description = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowStage
        fields = ['id', 'name', 'stage', 'description']
    
    def get_description(self, obj):
        """Return client-friendly description"""
        client_descriptions = {
            'LEAD': 'Initial planning and consultation phase',
            'PRODUCTION': 'Active preparation and coordination phase',
            'POST_PRODUCTION': 'Follow-up and completion phase'
        }
        stage_desc = client_descriptions.get(obj.stage, obj.name)
        return stage_desc


class ClientEventSerializer(serializers.ModelSerializer):
    """Basic event serializer for client list view"""
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)
    current_stage_name = serializers.CharField(source='current_stage.name', read_only=True)
    days_until_event = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'name', 'event_type_name', 'status', 'start_date', 'end_date',
            'current_stage_name', 'payment_status', 'days_until_event'
        ]
    
    def get_days_until_event(self, obj):
        from django.utils import timezone
        if obj.start_date and obj.start_date > timezone.now():
            delta = obj.start_date - timezone.now()
            return delta.days
        return None


class ClientEventDetailSerializer(ClientEventSerializer):
    """Detailed event serializer for client view"""
    current_stage = ClientWorkflowStageSerializer(read_only=True)
    upcoming_tasks = serializers.SerializerMethodField()
    recent_updates = serializers.SerializerMethodField()
    accessible_documents_count = serializers.SerializerMethodField()
    has_notes = serializers.SerializerMethodField()
    
    class Meta(ClientEventSerializer.Meta):
        fields = ClientEventSerializer.Meta.fields + [
            'current_stage', 'total_price', 'preferences',
            'upcoming_tasks', 'recent_updates', 'accessible_documents_count',
            'has_notes'
        ]
    
    def get_upcoming_tasks(self, obj):
        """Get upcoming visible tasks for the client"""
        tasks = obj.tasks.filter(
            is_visible_to_client=True,
            status__in=['PENDING', 'IN_PROGRESS']
        ).order_by('due_date')[:5]
        return [{
            'id': task.id,
            'title': task.title,
            'due_date': task.due_date,
            'priority': task.priority,
            'status': task.status
        } for task in tasks]
    
    def get_recent_updates(self, obj):
        """Get recent public timeline entries"""
        if hasattr(obj, 'public_timeline'):
            timeline = obj.public_timeline[:5]
        else:
            timeline = obj.timeline.filter(is_public=True).order_by('-created_at')[:5]
        
        return [{
            'id': entry.id,
            'action_type': entry.action_type,
            'description': entry.description,
            'created_at': entry.created_at
        } for entry in timeline]
    
    def get_accessible_documents_count(self, obj):
        """Count of documents accessible to the client"""
        if hasattr(obj, 'client_files'):
            return len(obj.client_files)
        return obj.files.filter(is_public=True).count()
    
    def get_has_notes(self, obj):
        """Check if there are any notes for this event"""
        from core.domains.notes.models import Note
        from django.contrib.contenttypes.models import ContentType
        
        event_ct = ContentType.objects.get_for_model(Event)
        return Note.objects.filter(
            content_type=event_ct,
            object_id=obj.id
        ).exists()


class ClientEventTimelineSerializer(serializers.ModelSerializer):
    """Timeline serializer for client view"""
    actor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EventTimeline
        fields = [
            'id', 'action_type', 'description', 'created_at', 'actor_name'
        ]
    
    def get_actor_name(self, obj):
        """Return appropriate actor name for client view"""
        if obj.actor:
            if obj.actor.role == 'CLIENT':
                return "You"
            return "Event Coordinator"
        return "System"


class ClientEventFileSerializer(serializers.ModelSerializer):
    """File serializer for client accessible documents"""
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = EventFile
        fields = [
            'id', 'name', 'category', 'size', 'created_at', 'download_url'
        ]
    
    def get_download_url(self, obj):
        """Generate secure download URL"""
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class ClientEventPreferencesSerializer(serializers.Serializer):
    """Serializer for updating client preferences"""
    preferences = serializers.JSONField(required=False)


class ClientEventTaskSerializer(serializers.ModelSerializer):
    """Task serializer for client view - shows visible tasks only"""
    can_update = serializers.SerializerMethodField()
    
    class Meta:
        model = EventTask
        fields = [
            'id', 'title', 'description', 'due_date', 'priority', 'status',
            'requires_client_input', 'can_update', 'completed_at'
        ]
        read_only_fields = ['id', 'title', 'description', 'due_date', 'priority', 
                           'requires_client_input', 'completed_at']
    
    def get_can_update(self, obj):
        """Check if client can update this task"""
        return obj.requires_client_input and obj.status in ['PENDING', 'IN_PROGRESS']


class ClientEventTaskUpdateSerializer(serializers.Serializer):
    """Serializer for client task updates"""
    status = serializers.ChoiceField(
        choices=['IN_PROGRESS', 'COMPLETED'],
        required=False
    )
    completion_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000
    )
    
    def validate(self, data):
        if data.get('status') == 'COMPLETED' and not data.get('completion_notes'):
            data['completion_notes'] = 'Completed by client'
        return data


class ClientEventFileUploadSerializer(serializers.ModelSerializer):
    """File upload serializer for clients"""
    file = serializers.FileField(required=True)
    
    class Meta:
        model = EventFile
        fields = ['name', 'category', 'description', 'file']
    
    def validate_file(self, value):
        """Validate file size and type"""
        # 10MB limit for client uploads
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 10MB")
        
        # Check file extension
        import os
        ext = os.path.splitext(value.name)[1].lower()
        allowed_extensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.rtf']
        
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        return value


class ClientEventFeedbackSerializer(serializers.ModelSerializer):
    """Feedback serializer for client submissions"""
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    response_by_name = serializers.CharField(source='response_by.get_full_name', read_only=True)
    has_response = serializers.SerializerMethodField()
    
    class Meta:
        model = EventFeedback
        fields = [
            'id', 'overall_rating', 'categories', 'comments', 'testimonial',
            'is_public', 'response', 'created_at', 'submitted_by_name',
            'response_by_name', 'has_response'
        ]
        read_only_fields = ['id', 'response', 'created_at', 'submitted_by_name', 
                           'response_by_name', 'has_response']
    
    def get_has_response(self, obj):
        """Check if admin has responded"""
        return bool(obj.response)
    
    def validate_overall_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate_categories(self, value):
        """Validate category ratings"""
        if value:
            for category, rating in value.items():
                if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
                    raise serializers.ValidationError(
                        f"Category '{category}' rating must be between 1 and 5"
                    )
        return value