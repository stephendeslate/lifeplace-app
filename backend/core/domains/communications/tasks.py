# backend/core/domains/communications/tasks.py

import logging
from celery import shared_task
from typing import Dict, List, Optional, Any
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(bind=True, name='communications.send_communication_async')
def send_communication_async(
    self,
    template_name: str,
    recipient: str,
    context_data: Dict = None,
    client_id: int = None,
    sent_by_id: int = None,
    event_id: int = None,
    skip_preference_check: bool = False
):
    """
    Async task for sending single communications
    """
    from .services import CommunicationService
    from core.domains.events.models import Event

    try:
        # Get related objects
        client = None
        if client_id:
            try:
                client = User.objects.get(id=client_id)
            except User.DoesNotExist:
                logger.warning(f"Client {client_id} not found for async communication")

        sent_by = None
        if sent_by_id:
            try:
                sent_by = User.objects.get(id=sent_by_id)
            except User.DoesNotExist:
                logger.warning(f"Sender {sent_by_id} not found for async communication")

        event = None
        if event_id:
            try:
                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                logger.warning(f"Event {event_id} not found for async communication")

        # Send communication
        service = CommunicationService()
        record = service.send_communication(
            template_name=template_name,
            recipient=recipient,
            context_data=context_data or {},
            client=client,
            sent_by=sent_by,
            event=event,
            skip_preference_check=skip_preference_check
        )

        if record:
            logger.info(f"Async communication sent successfully: {record.id}")
            return {
                'success': True,
                'record_id': str(record.id),
                'delivery_status': record.delivery_status,
                'external_message_id': record.external_message_id
            }
        else:
            # Could be None due to user preference blocking - not necessarily an error
            logger.info("Async communication completed - no record returned (may be preference-blocked)")
            return {
                'success': True,
                'record_id': None,
                'message': 'Communication skipped (user preference) or no record created'
            }
            
    except Exception as e:
        logger.error(f"Async communication task failed: {str(e)}")
        # Retry with exponential backoff
        if self.request.retries < 3:
            raise self.retry(countdown=60 * (2 ** self.request.retries), max_retries=3)
        return {
            'success': False,
            'error': str(e),
            'retries_exhausted': True
        }


@shared_task(bind=True, name='communications.send_bulk_communications_async')
def send_bulk_communications_async(self, template_id: int, recipients: List[Dict],
                                  sent_by_id: int = None, batch_size: int = 10):
    """
    Async task for sending bulk communications with batching
    """
    from .services import CommunicationTemplateService
    from .models import CommunicationTemplate
    
    try:
        # Get template
        try:
            template = CommunicationTemplate.objects.get(id=template_id)
        except CommunicationTemplate.DoesNotExist:
            logger.error(f"Template {template_id} not found for bulk sending")
            return {
                'success': False,
                'error': f'Template {template_id} not found'
            }
        
        sent_by = None
        if sent_by_id:
            try:
                sent_by = User.objects.get(id=sent_by_id)
            except User.DoesNotExist:
                logger.warning(f"Sender {sent_by_id} not found for bulk communication")
        
        # Process recipients in batches
        total_recipients = len(recipients)
        successful_sends = 0
        failed_sends = 0
        
        for batch_start in range(0, total_recipients, batch_size):
            batch_end = min(batch_start + batch_size, total_recipients)
            batch_recipients = recipients[batch_start:batch_end]
            
            logger.info(f"Processing batch {batch_start//batch_size + 1}: recipients {batch_start+1}-{batch_end}")
            
            # Process batch
            for recipient_data in batch_recipients:
                try:
                    # Send individual communication asynchronously
                    task_result = send_communication_async.delay(
                        template_name=template.name,
                        recipient=recipient_data['recipient'],
                        context_data=recipient_data.get('context_data', {}),
                        client_id=recipient_data.get('client_id'),
                        sent_by_id=sent_by_id
                    )
                    successful_sends += 1
                    
                except Exception as e:
                    logger.error(f"Failed to queue communication for {recipient_data['recipient']}: {str(e)}")
                    failed_sends += 1
            
            # Small delay between batches to avoid overwhelming the system
            if batch_end < total_recipients:
                import time
                time.sleep(1)
        
        logger.info(f"Bulk communication queued: {successful_sends} successful, {failed_sends} failed")
        
        return {
            'success': True,
            'total_recipients': total_recipients,
            'successful_queued': successful_sends,
            'failed_queued': failed_sends,
            'template_name': template.name
        }
        
    except Exception as e:
        logger.error(f"Bulk communication task failed: {str(e)}")
        if self.request.retries < 2:
            raise self.retry(countdown=120, max_retries=2)
        return {
            'success': False,
            'error': str(e),
            'retries_exhausted': True
        }


@shared_task(bind=True, name='communications.process_retry_queue_async')
def process_retry_queue_async(self):
    """
    Periodic task to process failed communications retry queue
    """
    from .services import CommunicationService
    
    try:
        service = CommunicationService()
        results = service.process_retry_queue()
        
        logger.info(f"Retry queue processing completed: {results}")
        
        return {
            'success': True,
            'results': results,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Retry queue processing failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }


@shared_task(bind=True, name='communications.cleanup_old_records_async')
def cleanup_old_records_async(self, days: int = None):
    """
    Periodic task to cleanup old communication records.
    Uses configurable retention period from CommunicationConfig.
    """
    from .models import CommunicationRecord
    from .config import CommunicationConfig
    from datetime import timedelta

    try:
        # Use configured retention period if not specified
        if days is None:
            days = CommunicationConfig.get_retention_days('RECORD_RETENTION_DAYS')

        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Delete old records that are delivered and read
        deleted_count, _ = CommunicationRecord.objects.filter(
            created_at__lt=cutoff_date,
            delivery_status__in=['DELIVERED', 'SENT'],
            is_opened=True
        ).delete()
        
        logger.info(f"Cleaned up {deleted_count} old communication records")
        
        return {
            'success': True,
            'deleted_count': deleted_count,
            'cutoff_days': days,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cleanup task failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }


@shared_task(bind=True, name='communications.warm_cache_async')
def warm_cache_async(self, template_ids: List[int] = None):
    """
    Task to warm communication caches
    """
    from .cache_service import communications_cache_service
    
    try:
        communications_cache_service.warm_cache_for_templates(template_ids)
        
        logger.info(f"Cache warming completed for templates: {template_ids or 'all system templates'}")
        
        return {
            'success': True,
            'template_ids': template_ids,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache warming failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }


@shared_task(bind=True, name='communications.health_check_providers_async')
def health_check_providers_async(self):
    """
    Periodic task to check provider health and reset if needed
    """
    from .services import CommunicationService
    from .resilience import provider_manager
    
    try:
        service = CommunicationService()
        health_status = service.get_provider_health()
        
        # Check for providers that have been unhealthy for too long
        unhealthy_providers = []
        for provider_name, status in health_status.items():
            if not status['healthy'] and status['failures'] >= 10:
                # Auto-reset providers with excessive failures
                try:
                    service.reset_provider(provider_name)
                    logger.info(f"Auto-reset provider {provider_name} due to excessive failures")
                except Exception as e:
                    logger.error(f"Failed to auto-reset provider {provider_name}: {str(e)}")
                    unhealthy_providers.append(provider_name)
        
        return {
            'success': True,
            'health_status': health_status,
            'auto_reset_providers': [p for p in health_status.keys() if p not in unhealthy_providers],
            'unhealthy_providers': unhealthy_providers,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check task failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }