# backend/core/domains/communications/services.py
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

from django.conf import settings
from django.contrib.auth import get_user_model
from django.template import Template, Context
from django.utils import timezone
from django.db.models import Q

from .exceptions import (
    TemplateNotFound, TemplateNameExists, InvalidTemplateFormat,
    CommunicationProviderError, SendingFailed
)
from .models import CommunicationTemplate, CommunicationRecord

User = get_user_model()
logger = logging.getLogger(__name__)


class CommunicationProvider(ABC):
    """Abstract base class for communication providers"""
    
    @abstractmethod
    def send_email(self, recipient: str, subject: str, body: str, **kwargs) -> str:
        """Send email and return external message ID"""
        pass
    
    @abstractmethod
    def send_sms(self, recipient: str, body: str, **kwargs) -> str:
        """Send SMS and return external message ID"""
        pass
    
    @abstractmethod
    def get_delivery_status(self, message_id: str) -> str:
        """Get delivery status for a message"""
        pass


class BrevoProvider(CommunicationProvider):
    """Brevo communication provider implementation"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'BREVO_API_KEY', None)
        if not self.api_key:
            logger.warning("Brevo API key not configured")
    
    def send_email(self, recipient: str, subject: str, body: str, **kwargs) -> str:
        """Send email via Brevo"""
        # This would integrate with Brevo API
        # For now, return a mock message ID
        logger.info(f"Sending email to {recipient}: {subject}")
        return f"brevo_email_{timezone.now().timestamp()}"
    
    def send_sms(self, recipient: str, body: str, **kwargs) -> str:
        """Send SMS via Brevo"""
        # This would integrate with Brevo SMS API
        logger.info(f"Sending SMS to {recipient}: {body[:50]}...")
        return f"brevo_sms_{timezone.now().timestamp()}"
    
    def get_delivery_status(self, message_id: str) -> str:
        """Get delivery status from Brevo"""
        # This would query Brevo API
        return 'DELIVERED'


class MockProvider(CommunicationProvider):
    """Mock provider for development/testing"""
    
    def send_email(self, recipient: str, subject: str, body: str, **kwargs) -> str:
        # Print email details to console in a format similar to Django's console backend
        print("\n" + "="*70)
        print("MOCK EMAIL (via Communications Service)")
        print("="*70)
        print(f"Content-Type: text/html; charset=\"utf-8\"")
        print(f"MIME-Version: 1.0")
        print(f"Subject: {subject}")
        print(f"From: {getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@lifeplace.com')}")
        print(f"To: {recipient}")
        print(f"Date: {timezone.now().strftime('%a, %d %b %Y %H:%M:%S %z')}")
        print("")
        print(body)
        print("="*70)
        
        logger.info(f"MOCK EMAIL sent to {recipient}")
        return f"mock_email_{timezone.now().timestamp()}"
    
    def send_sms(self, recipient: str, body: str, **kwargs) -> str:
        # Print SMS details to console
        print("\n" + "="*70)
        print("MOCK SMS (via Communications Service)")
        print("="*70)
        print(f"To: {recipient}")
        print(f"Date: {timezone.now().strftime('%a, %d %b %Y %H:%M:%S %z')}")
        print("")
        print(body)
        print("="*70)
        
        logger.info(f"MOCK SMS sent to {recipient}")
        return f"mock_sms_{timezone.now().timestamp()}"
    
    def get_delivery_status(self, message_id: str) -> str:
        return 'DELIVERED'


class CommunicationTemplateService:
    """Service for managing communication templates"""
    
    @staticmethod
    def get_all_templates(category: Optional[str] = None, channel: Optional[str] = None):
        """Get all templates with optional filtering"""
        queryset = CommunicationTemplate.objects.all().order_by('-updated_at')
        
        if category:
            queryset = queryset.filter(category=category)
        if channel:
            queryset = queryset.filter(channel=channel)
            
        return queryset
    
    @staticmethod
    def get_template_by_id(template_id: int) -> CommunicationTemplate:
        """Get template by ID"""
        try:
            return CommunicationTemplate.objects.get(id=template_id)
        except CommunicationTemplate.DoesNotExist:
            raise TemplateNotFound()
    
    @staticmethod
    def get_template_by_name(name: str) -> CommunicationTemplate:
        """Get template by name"""
        try:
            return CommunicationTemplate.objects.get(name=name)
        except CommunicationTemplate.DoesNotExist:
            raise TemplateNotFound()
    
    @staticmethod
    def create_template(template_data: Dict[str, Any]) -> CommunicationTemplate:
        """Create a new template"""
        # Check if template with name already exists
        if CommunicationTemplate.objects.filter(name__iexact=template_data['name']).exists():
            raise TemplateNameExists()
        
        # Validate template syntax
        try:
            if template_data.get('subject_template'):
                Template(template_data['subject_template'])
            Template(template_data['body_template'])
        except Exception as e:
            raise InvalidTemplateFormat(detail=f"Template syntax error: {str(e)}")
        
        return CommunicationTemplate.objects.create(**template_data)
    
    @staticmethod
    def update_template(template_id: int, template_data: Dict[str, Any]) -> CommunicationTemplate:
        """Update an existing template"""
        template = CommunicationTemplateService.get_template_by_id(template_id)
        
        # Check if name is being changed and would conflict
        if 'name' in template_data and template_data['name'] != template.name:
            if CommunicationTemplate.objects.filter(name__iexact=template_data['name']).exists():
                raise TemplateNameExists()
        
        # Validate template syntax
        try:
            if 'subject_template' in template_data and template_data['subject_template']:
                Template(template_data['subject_template'])
            if 'body_template' in template_data:
                Template(template_data['body_template'])
        except Exception as e:
            raise InvalidTemplateFormat(detail=f"Template syntax error: {str(e)}")
        
        # Update template fields
        for key, value in template_data.items():
            setattr(template, key, value)
        
        template.save()
        return template
    
    @staticmethod
    def delete_template(template_id: int) -> bool:
        """Delete a template"""
        template = CommunicationTemplateService.get_template_by_id(template_id)
        
        if template.is_system:
            raise InvalidTemplateFormat(detail="Cannot delete system template.")
        
        template.delete()
        return True
    
    @staticmethod
    def preview_template(template_id: int, context_data: Dict[str, Any] = None) -> Dict[str, str]:
        """Preview a template with context data"""
        template = CommunicationTemplateService.get_template_by_id(template_id)
        
        if context_data is None:
            context_data = {}
        
        try:
            context = Context(context_data)
            
            subject = None
            if template.subject_template:
                subject_template = Template(template.subject_template)
                subject = subject_template.render(context)
            
            body_template = Template(template.body_template)
            body = body_template.render(context)
            
            return {
                'subject': subject,
                'body': body
            }
        except Exception as e:
            raise InvalidTemplateFormat(detail=f"Error rendering template: {str(e)}")


class CommunicationService:
    """Service for sending and managing communications"""
    
    def __init__(self):
        # Use mock provider in development, Brevo in production
        if getattr(settings, 'DEBUG', True):
            self.provider = MockProvider()
        else:
            self.provider = BrevoProvider()
    
    def send_communication(
        self,
        template_name: str,
        recipient: str,
        context_data: Dict[str, Any] = None,
        client: Optional[User] = None, # type: ignore
        sent_by: Optional[User] = None # type: ignore
    ) -> Optional[CommunicationRecord]:
        """Send a communication using a template"""
        
        try:
            template = CommunicationTemplateService.get_template_by_name(template_name)
        except TemplateNotFound:
            logger.error(f"Template '{template_name}' not found")
            return None
        
        return self.send_communication_by_template(
            template, recipient, context_data, client, sent_by
        )
    
    def send_communication_by_template(
        self,
        template: CommunicationTemplate,
        recipient: str,
        context_data: Dict[str, Any] = None,
        client: Optional[User] = None, # type: ignore
        sent_by: Optional[User] = None # type: ignore
    ) -> Optional[CommunicationRecord]:
        """Send communication using template object"""
        
        if context_data is None:
            context_data = {}
        
        # Render template
        try:
            rendered = CommunicationTemplateService.preview_template(
                template.id, context_data
            )
            subject = rendered.get('subject')
            body = rendered.get('body')
        except Exception as e:
            logger.error(f"Failed to render template: {str(e)}")
            return None
        
        # Create communication record
        record = CommunicationRecord.objects.create(
            template_name=template.name,
            channel=template.channel,
            category=template.category,
            recipient=recipient,
            subject=subject,
            body=body,
            client=client,
            sent_by=sent_by,
            context_data=context_data,
            delivery_status='PENDING'
        )
        
        # Send communication
        try:
            if template.channel == 'EMAIL':
                external_id = self.provider.send_email(recipient, subject, body)
            else:  # SMS
                external_id = self.provider.send_sms(recipient, body)
            
            # Update record with success
            record.external_message_id = external_id
            record.delivery_status = 'SENT'
            record.sent_at = timezone.now()
            record.save()
            
            return record
            
        except Exception as e:
            logger.error(f"Failed to send communication: {str(e)}")
            record.delivery_status = 'FAILED'
            record.save()
            return None
    
    def send_bulk_communications(
        self,
        template: CommunicationTemplate,
        recipients: List[Dict[str, Any]],
        sent_by: Optional[User] = None # type: ignore
    ) -> List[CommunicationRecord]:
        """Send bulk communications"""
        
        records = []
        for recipient_data in recipients:
            recipient = recipient_data['recipient']
            context_data = recipient_data.get('context_data', {})
            client_id = recipient_data.get('client_id')
            
            client = None
            if client_id:
                try:
                    client = User.objects.get(id=client_id)
                except User.DoesNotExist:
                    pass
            
            record = self.send_communication_by_template(
                template, recipient, context_data, client, sent_by
            )
            if record:
                records.append(record)
        
        return records
    
    def get_communication_records(
        self,
        client_id: Optional[int] = None,
        template_name: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[CommunicationRecord]:
        """Get communication records with filtering"""
        
        queryset = CommunicationRecord.objects.all()
        
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if template_name:
            queryset = queryset.filter(template_name=template_name)
        if status:
            queryset = queryset.filter(delivery_status=status)
        
        return queryset.order_by('-created_at')[:limit]
    
    def update_delivery_status(self, external_message_id: str, status: str, opened_at: Optional[timezone.datetime] = None):
        """Update delivery status from webhook"""
        try:
            record = CommunicationRecord.objects.get(external_message_id=external_message_id)
            record.delivery_status = status
            
            if status == 'DELIVERED' and not record.delivered_at:
                record.delivered_at = timezone.now()
            
            if opened_at and not record.opened_at:
                record.opened_at = opened_at
                record.is_opened = True
            
            record.save()
            return record
        except CommunicationRecord.DoesNotExist:
            logger.warning(f"Communication record not found for external ID: {external_message_id}")
            return None


class AnalyticsService:
    """Service for communication analytics"""
    
    @staticmethod
    def get_template_stats(template_name: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
        """Get communication statistics"""
        from django.db.models import Count
        from datetime import timedelta
        
        start_date = timezone.now() - timedelta(days=days)
        queryset = CommunicationRecord.objects.filter(created_at__gte=start_date)
        
        if template_name:
            queryset = queryset.filter(template_name=template_name)
        
        stats = queryset.aggregate(
            total_sent=Count('id'),
            delivered=Count('id', filter=Q(delivery_status='DELIVERED')),
            opened=Count('id', filter=Q(is_opened=True)),
            failed=Count('id', filter=Q(delivery_status='FAILED'))
        )
        
        # Calculate rates
        total = stats['total_sent'] or 1
        stats['delivery_rate'] = round((stats['delivered'] / total) * 100, 2)
        stats['open_rate'] = round((stats['opened'] / total) * 100, 2)
        stats['failure_rate'] = round((stats['failed'] / total) * 100, 2)
        
        return stats