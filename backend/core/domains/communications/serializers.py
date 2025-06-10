# backend/core/domains/communications/serializers.py

from rest_framework import serializers
from django.template import Template, TemplateSyntaxError

from .models import CommunicationTemplate, CommunicationRecord


class CommunicationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for communication templates"""
    class Meta:
        model = CommunicationTemplate
        fields = [
            'id', 'name', 'channel', 'category', 'subject_template', 
            'body_template', 'is_system', 'variables_schema', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        """Check that the template name is unique (case insensitive)"""
        if CommunicationTemplate.objects.filter(
            name__iexact=value
        ).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("A template with this name already exists.")
        return value

    def validate(self, data):
        """Validate template syntax and channel-specific requirements"""
        # Validate Django template syntax
        try:
            if 'subject_template' in data and data['subject_template']:
                Template(data['subject_template'])
            if 'body_template' in data:
                Template(data['body_template'])
        except TemplateSyntaxError as e:
            raise serializers.ValidationError(f"Template syntax error: {str(e)}")
        
        # Email channel requires subject
        if data.get('channel') == 'EMAIL' and not data.get('subject_template'):
            raise serializers.ValidationError("Email templates must have a subject.")
        
        # SMS channel doesn't need subject
        if data.get('channel') == 'SMS' and data.get('subject_template'):
            data['subject_template'] = None
        
        return data


class CommunicationRecordSerializer(serializers.ModelSerializer):
    """Serializer for communication records"""
    client_email = serializers.EmailField(source='client.email', read_only=True)
    client_name = serializers.CharField(source='client.get_display_name', read_only=True)
    sent_by_name = serializers.CharField(source='sent_by.get_display_name', read_only=True)
    
    class Meta:
        model = CommunicationRecord
        fields = [
            'id', 'template_name', 'channel', 'category', 'recipient',
            'subject', 'body', 'client', 'client_email', 'client_name',
            'sent_by', 'sent_by_name', 'external_message_id',
            'delivery_status', 'sent_at', 'delivered_at', 'opened_at',
            'is_opened', 'context_data', 'created_at'
        ]
        read_only_fields = [
            'id', 'external_message_id', 'delivery_status', 'sent_at',
            'delivered_at', 'opened_at', 'is_opened', 'created_at'
        ]


class SendCommunicationSerializer(serializers.Serializer):
    """Serializer for sending communications - Enhanced for manual messages"""
    template_id = serializers.IntegerField()
    recipient = serializers.CharField()  # Email or phone
    client_id = serializers.IntegerField(required=False, allow_null=True)
    context_data = serializers.JSONField(required=False, default=dict)
    
    # Fields for manual message customization
    custom_subject = serializers.CharField(required=False, allow_blank=True)
    custom_body = serializers.CharField(required=False, allow_blank=True)
    
    def validate_template_id(self, value):
        """Validate template exists"""
        try:
            template = CommunicationTemplate.objects.get(id=value)
            # Store template for later validation
            self._template = template
            return value
        except CommunicationTemplate.DoesNotExist:
            raise serializers.ValidationError("Template does not exist.")
    
    def validate(self, data):
        """Enhanced validation for manual messages"""
        template = getattr(self, '_template', None)
        if not template:
            return data
        
        # For manual templates, require custom subject and body
        if template.category == 'MANUAL':
            custom_subject = data.get('custom_subject')
            custom_body = data.get('custom_body')
            
            if template.channel == 'EMAIL' and not custom_subject:
                raise serializers.ValidationError({
                    'custom_subject': 'Subject is required for manual email messages.'
                })
            
            if not custom_body:
                raise serializers.ValidationError({
                    'custom_body': 'Message body is required for manual messages.'
                })
            
            # Add custom content to context_data
            context_data = data.get('context_data', {})
            context_data.update({
                'custom_subject': custom_subject,
                'custom_body': custom_body,
                'message': custom_body,  # Common template variable
                'content': custom_body,  # Alternative template variable
            })
            data['context_data'] = context_data
        
        return data


class PreviewCommunicationSerializer(serializers.Serializer):
    """Serializer for previewing communications - Enhanced for manual messages"""
    template_id = serializers.IntegerField()
    context_data = serializers.JSONField(required=False, default=dict)
    
    # Fields for manual message preview
    custom_subject = serializers.CharField(required=False, allow_blank=True)
    custom_body = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Enhanced validation for manual message previews"""
        # If custom content is provided, add it to context_data
        custom_subject = data.get('custom_subject')
        custom_body = data.get('custom_body')
        
        if custom_subject or custom_body:
            context_data = data.get('context_data', {})
            if custom_subject:
                context_data['custom_subject'] = custom_subject
            if custom_body:
                context_data.update({
                    'custom_body': custom_body,
                    'message': custom_body,
                    'content': custom_body,
                })
            data['context_data'] = context_data
        
        return data


class BulkSendSerializer(serializers.Serializer):
    """Serializer for bulk sending communications"""
    template_id = serializers.IntegerField()
    recipients = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of recipient objects with recipient and context_data"
    )
    
    def validate_recipients(self, value):
        """Validate recipients format"""
        for recipient_data in value:
            if 'recipient' not in recipient_data:
                raise serializers.ValidationError("Each recipient must have a 'recipient' field.")
        return value
    
    def validate_template_id(self, value):
        """Validate template exists and is not manual category"""
        try:
            template = CommunicationTemplate.objects.get(id=value)
            # Prevent bulk sending with manual templates
            if template.category == 'MANUAL':
                raise serializers.ValidationError(
                    "Bulk sending is not allowed with manual templates. "
                    "Use individual sending for personalized messages."
                )
            return value
        except CommunicationTemplate.DoesNotExist:
            raise serializers.ValidationError("Template does not exist.")