# backend/core/domains/events/serializers/client_serializers.py
from rest_framework import serializers
from ..models import Event, EventTimeline, EventFile, EventTask
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
        return obj.files.filter(is_client_visible=True).count()
    
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
            'id', 'name', 'file_type', 'size', 'created_at', 'download_url'
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