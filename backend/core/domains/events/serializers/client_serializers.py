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
    contracts = serializers.SerializerMethodField()
    pending_signature_required = serializers.SerializerMethodField()
    can_rebook = serializers.SerializerMethodField()
    # Venue info for display
    venue_name = serializers.SerializerMethodField()
    venue_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'name', 'event_type_name', 'status', 'start_date', 'end_date',
            'current_stage_name', 'payment_status', 'days_until_event',
            'contracts', 'pending_signature_required',
            # Date blocking and cancellation fields
            'date_blocked', 'date_blocked_at', 'downpayment_deadline',
            'cancelled_reason', 'cancelled_at', 'can_rebook',
            # Venue info
            'venue_name', 'venue_image_url'
        ]

    def get_can_rebook(self, obj):
        """Check if event can be rebooked"""
        from ..services.rebook_service import EventRebookService
        can_rebook, _ = EventRebookService.can_rebook(obj)
        return can_rebook

    def get_days_until_event(self, obj):
        from django.utils import timezone
        if obj.start_date and obj.start_date > timezone.now():
            delta = obj.start_date - timezone.now()
            return delta.days
        return None

    def get_contracts(self, obj):
        """Get contract summaries for contracts that need attention"""
        from core.domains.contracts.models import EventContract
        from datetime import datetime, timezone as dt_timezone

        # Get contracts that are relevant to the client
        contracts = obj.contracts.filter(
            status__in=['SENT', 'PARTIALLY_SIGNED', 'SIGNED']
        ).select_related('template').prefetch_related('signatures')

        contract_summaries = []
        for contract in contracts:
            # Calculate if client can sign (same logic as ClientContractViewSet._can_client_sign)
            can_client_sign = False
            if contract.status in ['SENT', 'PARTIALLY_SIGNED']:
                # Check if client signature already exists
                client_signature_exists = contract.signatures.filter(role='CLIENT').exists()
                # Check if CLIENT role is required
                required_roles = contract.template.get_signature_requirements()
                can_client_sign = not client_signature_exists and 'CLIENT' in required_roles

            # Calculate signature progress
            required_roles = contract.template.get_signature_requirements()
            signed_roles = list(contract.signatures.values_list('role', flat=True))

            signature_progress = {
                'total_required': len(required_roles),
                'signed_count': len(signed_roles),
                'percentage': (len(signed_roles) / len(required_roles)) * 100 if required_roles else 0
            }

            # Calculate days until expiry
            expires_at = contract.valid_until.isoformat() if contract.valid_until else None

            contract_summaries.append({
                'id': str(contract.id),
                'status': contract.status,
                'template_name': contract.template.name,
                'can_client_sign': can_client_sign,
                'expires_at': expires_at,
                'signature_progress': signature_progress
            })

        return contract_summaries

    def get_pending_signature_required(self, obj):
        """Check if any contracts require client signature"""
        from core.domains.contracts.models import EventContract

        # Check if there are any contracts where client can sign
        contracts = obj.contracts.filter(
            status__in=['SENT', 'PARTIALLY_SIGNED']
        ).select_related('template').prefetch_related('signatures')

        for contract in contracts:
            # Check if client signature already exists
            client_signature_exists = contract.signatures.filter(role='CLIENT').exists()
            # Check if CLIENT role is required
            required_roles = contract.template.get_signature_requirements()
            if not client_signature_exists and 'CLIENT' in required_roles:
                return True

        return False

    def get_venue_name(self, obj):
        """Get venue name if event has a venue assigned"""
        if obj.venue:
            return obj.venue.name
        return None

    def get_venue_image_url(self, obj):
        """
        Get image URL with cascade fallback:
        1. Event's venue featured image
        2. Event's package featured image (first PACKAGE type product)
        3. None (frontend shows placeholder)
        """
        request = self.context.get('request')

        # 1. Try venue featured image
        if obj.venue and obj.venue.featured_image:
            if request:
                return request.build_absolute_uri(obj.venue.featured_image.url)
            return obj.venue.featured_image.url

        # 2. Try package featured image (from event's product_options)
        # Look for the first PACKAGE type product that has an image
        event_products = obj.event_products.select_related(
            'product_option'
        ).filter(
            product_option__type='PACKAGE',
            product_option__is_active=True
        ).order_by('id')

        for event_product in event_products:
            product = event_product.product_option
            # Check product's own featured image first
            if product.featured_image:
                if request:
                    return request.build_absolute_uri(product.featured_image.url)
                return product.featured_image.url
            # For packages, try primary venue's image
            if hasattr(product, 'package_venues'):
                primary_venue = product.package_venues.filter(is_primary=True).first()
                if primary_venue and primary_venue.venue.featured_image:
                    if request:
                        return request.build_absolute_uri(primary_venue.venue.featured_image.url)
                    return primary_venue.venue.featured_image.url

        # 3. No image available
        return None


class ClientEventDetailSerializer(ClientEventSerializer):
    """Detailed event serializer for client view"""
    current_stage = ClientWorkflowStageSerializer(read_only=True)
    upcoming_tasks = serializers.SerializerMethodField()
    recent_updates = serializers.SerializerMethodField()
    accessible_documents_count = serializers.SerializerMethodField()
    has_notes = serializers.SerializerMethodField()

    # Check-in fields for client self-check-in
    check_in_status = serializers.CharField(read_only=True)
    scheduled_check_in_time = serializers.DateTimeField(read_only=True)
    actual_check_in_time = serializers.DateTimeField(read_only=True)
    can_self_check_in = serializers.SerializerMethodField()

    class Meta(ClientEventSerializer.Meta):
        fields = ClientEventSerializer.Meta.fields + [
            'current_stage', 'total_price', 'preferences',
            'upcoming_tasks', 'recent_updates', 'accessible_documents_count',
            'has_notes',
            # Check-in fields
            'check_in_status', 'scheduled_check_in_time', 'actual_check_in_time',
            'can_self_check_in'
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
        """Check if there are any client-visible notes for this event"""
        from core.domains.notes.models import Note
        from django.contrib.contenttypes.models import ContentType

        event_ct = ContentType.objects.get_for_model(Event)
        return Note.objects.filter(
            content_type=event_ct,
            object_id=obj.id,
            is_client_visible=True  # Only count client-visible notes
        ).exists()

    def get_can_self_check_in(self, obj):
        """
        Client can self-check-in if:
        - Event status is CONFIRMED
        - Check-in status is PENDING
        - Today is the event day (based on scheduled_check_in_time or start_date)
        """
        if obj.status != 'CONFIRMED' or obj.check_in_status != 'PENDING':
            return False

        from django.utils import timezone
        now = timezone.now()
        event_date = obj.scheduled_check_in_time or obj.start_date

        if not event_date:
            return False

        # Check if today matches event date (event day only)
        return now.date() == event_date.date()


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
    file_type = serializers.CharField(source='mime_type', read_only=True)

    class Meta:
        model = EventFile
        fields = [
            'id', 'name', 'category', 'size', 'created_at', 'download_url', 'file_type'
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