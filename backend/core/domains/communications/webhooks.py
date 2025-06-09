# backend/core/domains/communications/webhooks.py
import json
import logging
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.utils import timezone
from .services import CommunicationService

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def brevo_webhook(request):
    """
    Handle webhooks from Brevo for email delivery status updates
    
    Brevo sends webhooks for various events:
    - delivered: Email was delivered
    - opened: Email was opened
    - clicked: Link in email was clicked
    - bounced: Email bounced
    - spam: Email marked as spam
    - unsubscribed: User unsubscribed
    """
    
    try:
        # Parse the webhook payload
        payload = json.loads(request.body.decode('utf-8'))
        
        # Extract event information
        event_type = payload.get('event')
        message_id = payload.get('message_id') or payload.get('id')
        email = payload.get('email')
        timestamp = payload.get('date') or payload.get('ts')
        
        if not message_id:
            logger.warning("Brevo webhook missing message_id")
            return HttpResponse(status=400)
        
        # Convert timestamp if provided
        occurred_at = None
        if timestamp:
            try:
                occurred_at = timezone.datetime.fromtimestamp(timestamp, tz=timezone.utc)
            except (ValueError, TypeError):
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
        
        if event_type == 'opened':
            # Handle email opens specially
            communication_service.update_delivery_status(
                external_message_id=str(message_id),
                status=new_status,
                opened_at=occurred_at
            )
        else:
            # Handle other delivery events
            communication_service.update_delivery_status(
                external_message_id=str(message_id),
                status=new_status
            )
        
        logger.info(f"Processed Brevo webhook: {event_type} for message {message_id}")
        return HttpResponse(status=200)
        
    except json.JSONDecodeError:
        logger.error("Invalid JSON in Brevo webhook")
        return HttpResponse(status=400)
    
    except Exception as e:
        logger.error(f"Error processing Brevo webhook: {str(e)}")
        return HttpResponse(status=500)