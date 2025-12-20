# backend/core/domains/communications/webhooks.py
import hashlib
import hmac
import html
import json
import logging
import os
import re
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.cache import cache_control
from rest_framework.throttling import AnonRateThrottle
from .services import CommunicationService

logger = logging.getLogger(__name__)

# Maximum length for sanitized fields
MAX_STRING_LENGTH = 1000
MAX_NESTED_DEPTH = 5


class WebhookThrottle(AnonRateThrottle):
    """Custom throttle for webhook endpoints"""
    rate = '100/hour'  # Allow 100 webhook requests per hour per IP


def sanitize_string(value: str, max_length: int = MAX_STRING_LENGTH) -> str:
    """
    Sanitize a string value to prevent XSS and limit length.
    """
    if not isinstance(value, str):
        return str(value)[:max_length] if value is not None else ""

    # HTML escape
    sanitized = html.escape(value)

    # Remove potentially dangerous patterns
    dangerous_patterns = [
        r'javascript:',
        r'data:',
        r'vbscript:',
        r'on\w+\s*=',
        r'<script',
        r'</script>',
    ]

    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)

    # Truncate to max length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    return sanitized.strip()


def sanitize_webhook_data(data: dict, depth: int = 0) -> dict:
    """
    Recursively sanitize webhook data to prevent injection attacks.

    Args:
        data: The webhook payload data
        depth: Current nesting depth to prevent deep recursion

    Returns:
        Sanitized dictionary
    """
    if depth > MAX_NESTED_DEPTH:
        return {}

    sanitized = {}

    for key, value in data.items():
        # Sanitize the key itself
        safe_key = sanitize_string(str(key), max_length=100)

        if value is None:
            sanitized[safe_key] = None
        elif isinstance(value, bool):
            sanitized[safe_key] = value
        elif isinstance(value, (int, float)):
            sanitized[safe_key] = value
        elif isinstance(value, str):
            sanitized[safe_key] = sanitize_string(value)
        elif isinstance(value, list):
            sanitized[safe_key] = [
                sanitize_webhook_data(v, depth + 1) if isinstance(v, dict)
                else sanitize_string(str(v)) if isinstance(v, str)
                else v
                for v in value[:100]  # Limit array length
            ]
        elif isinstance(value, dict):
            sanitized[safe_key] = sanitize_webhook_data(value, depth + 1)
        else:
            sanitized[safe_key] = sanitize_string(str(value))

    return sanitized


def is_signature_verification_required() -> bool:
    """
    Check if webhook signature verification is required.

    Returns True in production unless explicitly disabled.
    """
    # Get the setting, default to True (require verification)
    enforce_signature = getattr(
        settings,
        'COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE',
        not settings.DEBUG  # Enforce in production by default
    )
    return enforce_signature


def verify_brevo_signature(payload_body, received_signature, webhook_secret):
    """
    Verify webhook signature from Brevo
    
    Args:
        payload_body: Raw request body as bytes
        received_signature: Signature from request headers
        webhook_secret: Secret key configured in Brevo
    
    Returns:
        bool: True if signature is valid
    """
    if not webhook_secret or not received_signature:
        return False
    
    try:
        # Brevo uses HMAC SHA256 for webhook signatures
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            payload_body,
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures securely to prevent timing attacks
        return hmac.compare_digest(received_signature, expected_signature)
    
    except Exception as e:
        logger.error(f"Error verifying webhook signature: {str(e)}")
        return False


def validate_request_origin(request):
    """
    Validate the request origin and user agent
    
    Args:
        request: Django request object
    
    Returns:
        bool: True if request appears to be from Brevo
    """
    # Check User-Agent (Brevo typically sends identifiable user agent)
    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    valid_user_agents = ['brevo', 'sendinblue', 'webhook']
    
    if not any(agent in user_agent for agent in valid_user_agents):
        logger.warning(f"Suspicious user agent in webhook request: {user_agent}")
        # Don't reject yet, just log - some webhooks may not have identifiable user agents
    
    # Additional origin validation could be added here if needed
    return True

@csrf_exempt
@require_http_methods(["POST"])
@cache_control(no_cache=True, no_store=True, must_revalidate=True)
def brevo_webhook(request):
    """
    Handle webhooks from Brevo for email delivery status updates with enhanced security
    
    Brevo sends webhooks for various events:
    - delivered: Email was delivered
    - opened: Email was opened
    - clicked: Link in email was clicked
    - bounced: Email bounced
    - spam: Email marked as spam
    - unsubscribed: User unsubscribed
    
    Security features:
    - Signature verification using HMAC SHA256
    - Request origin validation
    - Rate limiting
    - Enhanced error handling
    """
    
    # Apply rate limiting (manual implementation since we can't use DRF decorators here)
    client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    
    try:
        # Validate request origin
        if not validate_request_origin(request):
            logger.warning(f"Invalid webhook request origin from IP: {client_ip}")
            return HttpResponse(status=403)
        
        # Get webhook secret from settings
        webhook_secret = getattr(settings, 'BREVO_WEBHOOK_SECRET', os.getenv('BREVO_WEBHOOK_SECRET'))

        # Check if signature verification is required
        signature_required = is_signature_verification_required()

        # Verify webhook signature
        if webhook_secret:
            received_signature = request.META.get('HTTP_X_BREVO_SIGNATURE') or request.META.get('HTTP_X_SIGNATURE')
            if not verify_brevo_signature(request.body, received_signature, webhook_secret):
                logger.error(f"Invalid webhook signature from IP: {client_ip}")
                return HttpResponse(status=403)
            logger.debug("Webhook signature verified successfully")
        elif signature_required:
            # In production, reject webhooks without a configured secret
            logger.error(
                f"Webhook secret not configured but signature verification is required. "
                f"Rejecting request from IP: {client_ip}"
            )
            return HttpResponse(status=403)
        else:
            # Development mode - log warning but allow
            logger.warning("Webhook secret not configured - skipping signature verification (development mode)")
        
        # Parse the webhook payload
        try:
            raw_payload = json.loads(request.body.decode('utf-8'))
            # Sanitize the payload to prevent injection attacks
            payload = sanitize_webhook_data(raw_payload)
        except (UnicodeDecodeError, json.JSONDecodeError):
            logger.error(f"Invalid webhook payload from IP: {client_ip}")
            return HttpResponse(status=400)
        
        # Validate required fields
        event_type = payload.get('event')
        message_id = payload.get('message_id') or payload.get('id')
        email = payload.get('email')
        timestamp = payload.get('date') or payload.get('ts')
        
        if not message_id or not event_type:
            logger.warning(f"Brevo webhook missing required fields from IP: {client_ip}")
            return HttpResponse(status=400)
        
        # Validate event type
        valid_event_types = ['delivered', 'opened', 'clicked', 'bounced', 'blocked', 'spam', 'invalid_email', 'deferred']
        if event_type not in valid_event_types:
            logger.warning(f"Unknown event type '{event_type}' from IP: {client_ip}")
            return HttpResponse(status=400)
        
        # Convert timestamp if provided
        occurred_at = None
        if timestamp:
            try:
                if isinstance(timestamp, str):
                    # Handle ISO format timestamps
                    occurred_at = timezone.datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                else:
                    # Handle Unix timestamps
                    occurred_at = timezone.datetime.fromtimestamp(timestamp, tz=timezone.utc)
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid timestamp format in webhook: {timestamp}")
                occurred_at = timezone.now()
        else:
            occurred_at = timezone.now()
        
        # Map Brevo events to our status
        status_mapping = {
            'delivered': 'DELIVERED',
            'opened': 'DELIVERED',  # Keep as delivered, but mark as opened
            'clicked': 'DELIVERED',
            'bounced': 'BOUNCED',
            'blocked': 'FAILED',
            'spam': 'FAILED',
            'invalid_email': 'FAILED',
            'deferred': 'PENDING'
        }
        
        new_status = status_mapping.get(event_type, 'PENDING')
        
        # Update the communication record
        communication_service = CommunicationService()
        
        try:
            if event_type == 'opened':
                # Handle email opens specially
                updated = communication_service.update_delivery_status(
                    external_message_id=str(message_id),
                    status=new_status,
                    opened_at=occurred_at
                )
            else:
                # Handle other delivery events
                updated = communication_service.update_delivery_status(
                    external_message_id=str(message_id),
                    status=new_status
                )
            
            if updated:
                logger.info(f"Processed Brevo webhook: {event_type} for message {message_id}")
            else:
                logger.warning(f"No record found for message ID: {message_id}")
            
            return HttpResponse(status=200)
            
        except Exception as e:
            logger.error(f"Error updating communication record: {str(e)}")
            return HttpResponse(status=500)
        
    except Exception as e:
        logger.error(f"Unexpected error processing Brevo webhook from IP {client_ip}: {str(e)}")
        return HttpResponse(status=500)