# backend/core/domains/communications/services.py

import logging
from typing import Dict, Any, Optional, List

from django.conf import settings
from django.contrib.auth import get_user_model
from django.template import Template, Context
from django.utils import timezone
from django.db.models import Q

from .exceptions import (
    TemplateNotFound, TemplateNameExists, InvalidTemplateFormat,
    CommunicationProviderError
)
from .models import CommunicationTemplate, CommunicationRecord
from .config import communication_config
from .resilience import provider_manager, delivery_queue
from .monitoring import communication_metrics
from .template_sandbox import (
    sandboxed_template_engine,
    validate_template_for_save,
    TemplateSandboxError
)

User = get_user_model()
logger = logging.getLogger(__name__)



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

        # Validate template syntax and security using sandboxed engine
        all_errors = []

        if template_data.get('subject_template'):
            is_valid, errors = validate_template_for_save(template_data['subject_template'])
            if not is_valid:
                all_errors.extend([f"Subject: {e}" for e in errors])

        if template_data.get('body_template'):
            is_valid, errors = validate_template_for_save(template_data['body_template'])
            if not is_valid:
                all_errors.extend([f"Body: {e}" for e in errors])

        if all_errors:
            raise InvalidTemplateFormat(detail=f"Template validation failed: {'; '.join(all_errors)}")

        return CommunicationTemplate.objects.create(**template_data)
    
    @staticmethod
    def update_template(template_id: int, template_data: Dict[str, Any]) -> CommunicationTemplate:
        """Update an existing template"""
        template = CommunicationTemplateService.get_template_by_id(template_id)

        # Check if name is being changed and would conflict
        if 'name' in template_data and template_data['name'] != template.name:
            if CommunicationTemplate.objects.filter(name__iexact=template_data['name']).exists():
                raise TemplateNameExists()

        # Validate template syntax and security using sandboxed engine
        all_errors = []

        if 'subject_template' in template_data and template_data['subject_template']:
            is_valid, errors = validate_template_for_save(template_data['subject_template'])
            if not is_valid:
                all_errors.extend([f"Subject: {e}" for e in errors])

        if 'body_template' in template_data:
            is_valid, errors = validate_template_for_save(template_data['body_template'])
            if not is_valid:
                all_errors.extend([f"Body: {e}" for e in errors])

        if all_errors:
            raise InvalidTemplateFormat(detail=f"Template validation failed: {'; '.join(all_errors)}")

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
        """Preview a template with context data - Enhanced for manual messages"""
        template = CommunicationTemplateService.get_template_by_id(template_id)

        if context_data is None:
            context_data = {}

        try:
            # Check if this is a custom/manual message with overrides
            custom_subject = context_data.get('custom_subject')
            custom_body = context_data.get('custom_body')

            # Handle subject
            if custom_subject:
                # Use custom subject for manual messages (render it for variable substitution)
                try:
                    subject = sandboxed_template_engine.render(
                        custom_subject, context_data, validate_first=True
                    )
                except TemplateSandboxError:
                    # If custom subject fails validation, use it as-is
                    subject = custom_subject
            elif template.subject_template:
                # Use template subject with sandboxed rendering
                subject = sandboxed_template_engine.render(
                    template.subject_template, context_data, validate_first=True
                )
            else:
                subject = None

            # Handle body
            if custom_body and template.category == 'MANUAL':
                # For manual templates, create a combined template that includes the custom content
                base_template = template.body_template

                # Look for content placeholders in the template
                content_placeholders = [
                    '{{content}}',
                    '{{message}}',
                    '{{body}}',
                    '{{ content }}',
                    '{{ message }}',
                    '{{ body }}'
                ]

                # Replace placeholder with custom content
                combined_template = base_template
                placeholder_found = False

                for placeholder in content_placeholders:
                    if placeholder in combined_template:
                        # Replace placeholder with user's custom content
                        combined_template = combined_template.replace(placeholder, custom_body)
                        placeholder_found = True
                        break

                # If no placeholder found, inject content into template structure
                if not placeholder_found:
                    # Try to insert before closing body/content div
                    if '</div>' in combined_template:
                        # Find the main content area and insert before the last closing div
                        parts = combined_template.rsplit('</div>', 1)
                        if len(parts) == 2:
                            combined_template = f"{parts[0]}<div style=\"margin: 16px 0;\">{custom_body}</div></div>{parts[1]}"
                    else:
                        # Fallback: append to template
                        combined_template += f'<div style="margin: 16px 0;">{custom_body}</div>'

                # Now render the combined template with sandboxed engine
                body = sandboxed_template_engine.render(
                    combined_template, context_data, validate_first=True
                )
            else:
                # Use standard sandboxed template rendering
                body = sandboxed_template_engine.render(
                    template.body_template, context_data, validate_first=True
                )

            return {
                'subject': subject,
                'body': body
            }
        except TemplateSandboxError as e:
            raise InvalidTemplateFormat(detail=f"Template security error: {str(e)}")
        except Exception as e:
            raise InvalidTemplateFormat(detail=f"Error rendering template: {str(e)}")


class CommunicationService:
    """Service for sending and managing communications with resilience features"""

    # Categories that map to NotificationPreference fields
    CATEGORY_PREFERENCE_MAP = {
        'SYSTEM': 'system',
        'MANUAL': 'communication',
        'AUTO': 'communication',
        'MARKETING': 'marketing',
    }

    def __init__(self):
        # Use provider manager for resilience
        self.provider_manager = provider_manager
        print(f"🔧 CommunicationService initialized with ProviderManager ({len(self.provider_manager.providers)} providers)")

    def _check_user_preferences(
        self,
        client: Optional[User],  # type: ignore
        channel: str,
        category: str
    ) -> tuple[bool, str]:
        """
        Check if a user has opted in to receive communications of this type.

        Returns:
            tuple: (is_allowed: bool, reason: str)
        """
        # If no client, we can't check preferences - allow the send
        if client is None:
            return True, ""

        try:
            # Get user's notification preferences
            from core.domains.notifications.models import NotificationPreference

            try:
                preferences = NotificationPreference.objects.get(user=client)
            except NotificationPreference.DoesNotExist:
                # No preferences set - use defaults (allow)
                return True, ""

            # Determine the method based on channel
            method = 'email' if channel == 'EMAIL' else 'sms'

            # Check global channel toggle first
            if not getattr(preferences, f'{method}_enabled', True):
                return False, f"User has disabled all {method} communications"

            # Map category to preference field
            preference_category = self.CATEGORY_PREFERENCE_MAP.get(category, 'communication')

            # Check category-specific preference
            preference_field = f'{preference_category}_{method}'
            if not getattr(preferences, preference_field, True):
                return False, f"User has disabled {preference_category} {method} communications"

            # Check quiet hours if enabled
            if preferences.quiet_hours_enabled and preferences.quiet_hours_start and preferences.quiet_hours_end:
                from django.utils import timezone
                current_time = timezone.now().time()
                start = preferences.quiet_hours_start
                end = preferences.quiet_hours_end

                # Handle overnight quiet hours (e.g., 22:00 to 06:00)
                if start <= end:
                    in_quiet_hours = start <= current_time <= end
                else:
                    in_quiet_hours = current_time >= start or current_time <= end

                if in_quiet_hours and method == 'sms':
                    # Only block SMS during quiet hours (email can wait)
                    return False, "User is in quiet hours - SMS blocked"

            return True, ""

        except Exception as e:
            logger.warning(f"Error checking user preferences: {e}")
            # On error, allow the send (fail open for communications)
            return True, ""
    
    def send_communication(
        self,
        template_name: str,
        recipient: str,
        context_data: Dict[str, Any] = None,
        client: Optional[User] = None,  # type: ignore
        sent_by: Optional[User] = None,  # type: ignore
        use_async: bool = False,
        event=None,  # Optional Event instance
        skip_preference_check: bool = False  # Skip user preference check for critical messages
    ) -> Optional[CommunicationRecord]:
        """Send a communication using a template with optional async processing"""

        # If async is requested and Celery is available (not in eager/sync mode)
        # Note: CELERY_TASK_ALWAYS_EAGER=True means tasks run synchronously (for testing)
        if use_async and not getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                from .tasks import send_communication_async

                task_result = send_communication_async.delay(
                    template_name=template_name,
                    recipient=recipient,
                    context_data=context_data,
                    client_id=client.id if client else None,
                    sent_by_id=sent_by.id if sent_by else None,
                    event_id=event.id if event else None,
                    skip_preference_check=skip_preference_check
                )

                logger.info(f"Queued async communication: task_id={task_result.id}")
                print(f"🚀 Queued async communication: {task_result.id}")

                # Return a placeholder record (actual record will be created by task)
                return None  # Async tasks don't return records immediately

            except ImportError:
                logger.warning("Celery not available, falling back to synchronous sending")
            except Exception as e:
                logger.warning(f"Async task failed, falling back to sync: {str(e)}")

        # Synchronous sending (default behavior)
        try:
            template = CommunicationTemplateService.get_template_by_name(template_name)
        except TemplateNotFound:
            logger.error(f"Template '{template_name}' not found")
            print(f"❌ Template '{template_name}' not found")
            return None

        return self.send_communication_by_template(
            template, recipient, context_data, client, sent_by, event,
            skip_preference_check=skip_preference_check
        )
    
    def send_communication_by_template(
        self,
        template: CommunicationTemplate,
        recipient: str,
        context_data: Dict[str, Any] = None,
        client: Optional[User] = None,  # type: ignore
        sent_by: Optional[User] = None,  # type: ignore
        event=None,  # Optional Event instance
        skip_preference_check: bool = False  # Skip user preference check for critical messages
    ) -> Optional[CommunicationRecord]:
        """Send communication using template object - Enhanced for manual messages"""

        if context_data is None:
            context_data = {}

        # Check user preferences before sending (GDPR/CAN-SPAM compliance)
        if not skip_preference_check and client is not None:
            is_allowed, reason = self._check_user_preferences(
                client=client,
                channel=template.channel,
                category=template.category
            )
            if not is_allowed:
                logger.info(
                    f"Communication blocked by user preference: {template.name} to {recipient}. "
                    f"Reason: {reason}"
                )
                print(f"⏹️ Communication blocked by user preference: {reason}")
                # Return None but don't create a failed record - user opted out
                return None

        print(f"🚀 Sending communication: {template.name} to {recipient}")
        
        # Check if this is a manual message with custom content
        is_manual_message = (
            template.category == 'MANUAL' and 
            ('custom_subject' in context_data or 'custom_body' in context_data)
        )
        
        # Render template with enhanced support for manual messages
        try:
            if is_manual_message:
                # For manual messages, handle custom subject and body
                custom_subject = context_data.get('custom_subject', '')
                custom_body = context_data.get('custom_body', '')
                
                if custom_subject and custom_body:
                    # Create enhanced context for manual template rendering
                    enhanced_context = {
                        **context_data,
                        'custom_subject': custom_subject,
                        'custom_body': custom_body
                    }
                    
                    rendered = CommunicationTemplateService.preview_template(
                        template.id, enhanced_context
                    )
                    
                    # Override with custom subject for manual messages
                    subject = custom_subject
                    body = rendered.get('body')
                else:
                    # Fallback to standard rendering
                    rendered = CommunicationTemplateService.preview_template(
                        template.id, context_data
                    )
                    subject = rendered.get('subject')
                    body = rendered.get('body')
            else:
                # Standard template rendering for non-manual messages
                rendered = CommunicationTemplateService.preview_template(
                    template.id, context_data
                )
                subject = rendered.get('subject')
                body = rendered.get('body')
                
        except Exception as e:
            logger.error(f"Failed to render template: {str(e)}")
            print(f"❌ Failed to render template: {str(e)}")
            return None
        
        # Create communication record with proper subject/body
        record = CommunicationRecord.objects.create(
            template_name=template.name,
            channel=template.channel,
            category=template.category,
            recipient=recipient,
            subject=subject,
            body=body,
            client=client,
            sent_by=sent_by,
            event=event,
            context_data=context_data,
            delivery_status='PENDING'
        )
        
        print(f"📝 Created communication record: {record.id}")
        
        # Send communication with resilience and metrics
        start_time = timezone.now()
        try:
            if template.channel == 'EMAIL':
                external_id, provider_used = self.provider_manager.send_with_fallback(
                    'send_email', recipient, subject, body
                )
            else:  # SMS
                external_id, provider_used = self.provider_manager.send_with_fallback(
                    'send_sms', recipient, body
                )
            
            # Calculate response time
            response_time_ms = (timezone.now() - start_time).total_seconds() * 1000
            
            # Update record with success
            record.external_message_id = external_id
            record.delivery_status = 'SENT'
            record.sent_at = timezone.now()
            record.context_data['provider_used'] = provider_used
            record.context_data['response_time_ms'] = response_time_ms
            record.save()
            
            # Record success metrics
            communication_metrics.record_communication_sent(
                template_name=template.name,
                channel=template.channel,
                provider=provider_used,
                success=True,
                response_time_ms=response_time_ms
            )
            
            print(f"✅ Communication sent successfully via {provider_used}. External ID: {external_id}")
            return record
            
        except Exception as e:
            logger.error(f"Failed to send communication: {str(e)}")
            print(f"❌ Failed to send communication: {str(e)}")
            
            # Calculate response time even for failures
            response_time_ms = (timezone.now() - start_time).total_seconds() * 1000
            
            # Update record with failure
            record.delivery_status = 'FAILED'
            record.context_data['error'] = str(e)
            record.context_data['response_time_ms'] = response_time_ms
            record.save()
            
            # Record failure metrics
            communication_metrics.record_communication_sent(
                template_name=template.name,
                channel=template.channel,
                provider='unknown',  # Provider might not be available on failure
                success=False,
                response_time_ms=response_time_ms
            )
            
            # Add to retry queue for later processing
            delivery_queue.add_failed_delivery({
                'record_id': str(record.id),
                'template_channel': template.channel,
                'recipient': recipient,
                'subject': subject,
                'body': body,
                'template_name': template.name,
                'context_data': record.context_data
            })
            
            return record  # Return record even on failure for tracking
    
    def send_bulk_communications(
        self,
        template: CommunicationTemplate,
        recipients: List[Dict[str, Any]],
        sent_by: Optional[User] = None, # type: ignore
        use_async: bool = True
    ) -> List[CommunicationRecord]:
        """Send bulk communications with optional async processing"""
        
        # For large batches, prefer async processing (not in eager/sync mode)
        if use_async and len(recipients) > 5 and not getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                from .tasks import send_bulk_communications_async
                
                task_result = send_bulk_communications_async.delay(
                    template_id=template.id,
                    recipients=recipients,
                    sent_by_id=sent_by.id if sent_by else None,
                    batch_size=10
                )
                
                logger.info(f"Queued bulk communication: task_id={task_result.id}, {len(recipients)} recipients")
                print(f"🚀 Queued bulk communication: {task_result.id} ({len(recipients)} recipients)")
                
                # Return empty list for async operations
                return []
                
            except ImportError:
                logger.warning("Celery not available, falling back to synchronous bulk sending")
            except Exception as e:
                logger.warning(f"Async bulk task failed, falling back to sync: {str(e)}")
        
        # Synchronous sending (default for small batches or when async unavailable)
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
    
    def get_provider_health(self) -> Dict[str, Dict]:
        """Get health status of communication providers"""
        return self.provider_manager.get_provider_health()
    
    def reset_provider(self, provider_name: str):
        """Reset circuit breaker for a provider"""
        return self.provider_manager.reset_provider(provider_name)
    
    def process_retry_queue(self) -> Dict[str, int]:
        """Process failed deliveries from retry queue"""
        ready_deliveries = delivery_queue.get_ready_deliveries()
        results = {'processed': 0, 'succeeded': 0, 'failed': 0, 'requeued': 0}
        
        for delivery in ready_deliveries:
            results['processed'] += 1
            
            try:
                # Find the original record
                record = CommunicationRecord.objects.get(id=delivery['record_id'])
                
                # Attempt resend
                if delivery['template_channel'] == 'EMAIL':
                    external_id, provider_used = self.provider_manager.send_with_fallback(
                        'send_email', delivery['recipient'], delivery['subject'], delivery['body']
                    )
                else:  # SMS
                    external_id, provider_used = self.provider_manager.send_with_fallback(
                        'send_sms', delivery['recipient'], delivery['body']
                    )
                
                # Update record with success
                record.external_message_id = external_id
                record.delivery_status = 'SENT'
                record.sent_at = timezone.now()
                record.context_data['provider_used'] = provider_used
                record.context_data['retry_successful'] = True
                record.save()
                
                results['succeeded'] += 1
                logger.info(f"Retry successful for record {record.id}")
                
            except Exception as e:
                # Increment retry count and requeue if under limit
                delivery['retry_count'] += 1
                delivery['last_error'] = str(e)
                
                if delivery['retry_count'] < 5:  # Max retries
                    delivery_queue.add_failed_delivery(delivery)
                    results['requeued'] += 1
                    logger.warning(f"Retry {delivery['retry_count']} failed for record {delivery['record_id']}, requeued")
                else:
                    results['failed'] += 1
                    logger.error(f"Max retries exceeded for record {delivery['record_id']}")
        
        return results
    
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