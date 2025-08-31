# backend/core/domains/communications/providers.py

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

from django.conf import settings
from django.utils import timezone

from .exceptions import CommunicationProviderError

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


class MockProvider(CommunicationProvider):
    """Mock provider for development/testing - Enhanced with console output"""
    
    def send_email(self, recipient: str, subject: str, body: str, **kwargs) -> str:
        # Use both logging AND print for immediate console visibility
        message = f"MOCK EMAIL - To: {recipient}, Subject: {subject}"
        logger.info(message)
        print(f"📧 {message}")  # Direct console output
        
        # Also use Django's email backend if configured for console
        if getattr(settings, 'EMAIL_BACKEND', '') == 'django.core.mail.backends.console.EmailBackend':
            try:
                from django.core.mail import send_mail
                send_mail(
                    subject=subject,
                    message=self._html_to_text(body),
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@lifeplace.com'),
                    recipient_list=[recipient],
                    html_message=body,
                    fail_silently=True,
                )
            except Exception as e:
                print(f"⚠️  Django email backend failed: {e}")
        
        return f"mock_email_{timezone.now().timestamp()}"
    
    def send_sms(self, recipient: str, body: str, **kwargs) -> str:
        message = f"MOCK SMS - To: {recipient}, Body: {body[:50]}..."
        logger.info(message)
        print(f"📱 {message}")  # Direct console output
        return f"mock_sms_{timezone.now().timestamp()}"
    
    def get_delivery_status(self, message_id: str) -> str:
        return 'DELIVERED'
    
    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML to plain text"""
        try:
            from html import unescape
            import re
            text = re.sub(r'<[^>]+>', '', html_content)
            text = unescape(text)
            text = re.sub(r'\s+', ' ', text).strip()
            return text
        except Exception:
            return html_content


class BrevoProvider(CommunicationProvider):
    """Brevo communication provider implementation"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'BREVO_API_KEY', None)
        self.api_url = 'https://api.brevo.com/v3'
        if not self.api_key:
            logger.warning("Brevo API key not configured")
    
    def _make_request(self, endpoint: str, method: str = 'POST', data: dict = None):
        """Make HTTP request to Brevo API"""
        import requests
        
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': self.api_key
        }
        
        url = f"{self.api_url}/{endpoint}"
        
        try:
            if method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == 'GET':
                response = requests.get(url, headers=headers, params=data, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Debug logging
            logger.info(f"Brevo API request to {url}")
            logger.info(f"Request data: {data}")
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response body: {response.text}")
            
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Brevo API request failed: {str(e)}")
            logger.error(f"Request URL: {url}")
            logger.error(f"Request data: {data}")
            logger.error(f"Response text: {getattr(e.response, 'text', 'No response text')}")
            raise CommunicationProviderError(f"Brevo API error: {str(e)}")
    
    def send_email(self, recipient: str, subject: str, body: str, **kwargs) -> str:
        """Send email via Brevo"""
        sender_email = kwargs.get('sender_email', getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com'))
        sender_name = kwargs.get('sender_name', 'LifePlace')
        
        # Get recipient name or use email as fallback
        recipient_name = kwargs.get('recipient_name', '')
        if not recipient_name or recipient_name.strip() == '':
            # If no name provided, use the part before @ from email
            recipient_name = recipient.split('@')[0].title()
        
        # Prepare email data for Brevo API
        email_data = {
            'sender': {
                'name': sender_name,
                'email': sender_email
            },
            'to': [
                {
                    'email': recipient,
                    'name': recipient_name
                }
            ],
            'subject': subject,
            'htmlContent': body,
            'textContent': self._html_to_text(body),
        }
        
        # Add optional fields only if they exist
        reply_to = kwargs.get('reply_to')
        if reply_to:
            email_data['replyTo'] = {'email': reply_to}
        
        # Add tags for better organization
        email_data['tags'] = kwargs.get('tags', ['transactional', 'lifeplace'])
        
        try:
            response = self._make_request('smtp/email', 'POST', email_data)
            message_id = response.get('messageId')
            
            if message_id:
                logger.info(f"Email sent successfully via Brevo to {recipient}, ID: {message_id}")
                return str(message_id)
            else:
                logger.error(f"Brevo response missing messageId: {response}")
                raise CommunicationProviderError("Invalid response from Brevo")
                
        except Exception as e:
            logger.error(f"Failed to send email via Brevo to {recipient}: {str(e)}")
            raise CommunicationProviderError(f"Email sending failed: {str(e)}")
    
    def send_sms(self, recipient: str, body: str, **kwargs) -> str:
        """Send SMS via Brevo"""
        sender = kwargs.get('sender', 'LifePlace')
        
        # Prepare SMS data for Brevo API
        sms_data = {
            'sender': sender[:11],  # SMS sender ID max 11 characters
            'recipient': recipient,
            'content': body,
            'type': 'transactional',
            'tag': 'lifeplace'
        }
        
        try:
            response = self._make_request('transactionalSMS/sms', 'POST', sms_data)
            reference = response.get('reference')
            
            if reference:
                logger.info(f"SMS sent successfully via Brevo to {recipient}, Reference: {reference}")
                return str(reference)
            else:
                logger.error(f"Brevo SMS response missing reference: {response}")
                raise CommunicationProviderError("Invalid SMS response from Brevo")
                
        except Exception as e:
            logger.error(f"Failed to send SMS via Brevo to {recipient}: {str(e)}")
            raise CommunicationProviderError(f"SMS sending failed: {str(e)}")
    
    def get_delivery_status(self, message_id: str) -> str:
        """Get delivery status for a message from Brevo"""
        try:
            # For email messages
            if message_id.startswith('<') and message_id.endswith('>'):
                # This is an email message ID, we can't easily check status
                # Return a default status for now
                return 'SENT'
            
            # For SMS messages with reference
            response = self._make_request(f'transactionalSMS/report/{message_id}', 'GET')
            # Brevo SMS status mapping
            brevo_status = response.get('status', 'unknown').lower()
            status_mapping = {
                'sent': 'SENT',
                'delivered': 'DELIVERED',
                'failed': 'FAILED',
                'rejected': 'FAILED',
                'pending': 'PENDING'
            }
            return status_mapping.get(brevo_status, 'PENDING')
                
        except Exception as e:
            logger.error(f"Failed to get delivery status from Brevo for {message_id}: {str(e)}")
            return 'PENDING'
    
    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML to plain text for email fallback"""
        try:
            from html import unescape
            import re
            
            # Remove HTML tags
            text = re.sub(r'<[^>]+>', '', html_content)
            # Unescape HTML entities
            text = unescape(text)
            # Clean up whitespace
            text = re.sub(r'\s+', ' ', text).strip()
            
            return text
        except Exception:
            # Fallback if HTML processing fails
            return html_content
    
    def verify_domain(self, domain: str) -> dict:
        """Verify domain status in Brevo (utility method)"""
        try:
            response = self._make_request('senders/domains', 'GET')
            domains = response.get('domains', [])
            
            for domain_info in domains:
                if domain_info.get('domain') == domain:
                    return {
                        'domain': domain,
                        'verified': domain_info.get('verified', False),
                        'dkim_status': domain_info.get('dkim', {}),
                        'spf_status': domain_info.get('spf', {})
                    }
            
            return {'domain': domain, 'verified': False, 'message': 'Domain not found'}
            
        except Exception as e:
            logger.error(f"Failed to verify domain {domain}: {str(e)}")
            return {'domain': domain, 'verified': False, 'error': str(e)}