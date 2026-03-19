# backend/core/domains/communications/services.py

import logging
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from .exceptions import InvalidTemplateFormat, TemplateNameExists, TemplateNotFound
from .layout_service import LayoutCompositionService
from .models import CommunicationRecord, CommunicationTemplate
from .monitoring import communication_metrics
from .resilience import delivery_queue, provider_manager
from .template_sandbox import TemplateSandboxError, sandboxed_template_engine, validate_template_for_save

User = get_user_model()
logger = logging.getLogger(__name__)


class CommunicationTemplateService:
    """Service for managing communication templates"""

    @staticmethod
    def get_all_templates(category: str | None = None, channel: str | None = None):
        """Get all templates with optional filtering"""
        from .selectors import get_all_templates
        return get_all_templates(category=category, channel=channel)

    @staticmethod
    def get_template_by_id(template_id: int) -> CommunicationTemplate:
        """Get template by ID"""
        from .selectors import get_template_by_id
        return get_template_by_id(template_id=template_id)

    @staticmethod
    def get_template_by_name(name: str) -> CommunicationTemplate:
        """Get template by name"""
        from .selectors import get_template_by_name
        return get_template_by_name(name=name)

    @staticmethod
    def create_template(template_data: dict[str, Any]) -> CommunicationTemplate:
        """Create a new template"""
        # Check if template with name already exists
        if CommunicationTemplate.objects.filter(name__iexact=template_data["name"]).exists():
            raise TemplateNameExists()

        # Validate template syntax and security using sandboxed engine
        all_errors = []

        if template_data.get("subject_template"):
            is_valid, errors = validate_template_for_save(template_data["subject_template"])
            if not is_valid:
                all_errors.extend([f"Subject: {e}" for e in errors])

        if template_data.get("body_template"):
            is_valid, errors = validate_template_for_save(template_data["body_template"])
            if not is_valid:
                all_errors.extend([f"Body: {e}" for e in errors])

        if all_errors:
            raise InvalidTemplateFormat(detail=f"Template validation failed: {'; '.join(all_errors)}")

        return CommunicationTemplate.objects.create(**template_data)

    @staticmethod
    def update_template(template_id: int, template_data: dict[str, Any]) -> CommunicationTemplate:
        """Update an existing template"""
        template = CommunicationTemplateService.get_template_by_id(template_id)

        # Check if name is being changed and would conflict
        if "name" in template_data and template_data["name"] != template.name:
            if CommunicationTemplate.objects.filter(name__iexact=template_data["name"]).exists():
                raise TemplateNameExists()

        # Validate template syntax and security using sandboxed engine
        all_errors = []

        if template_data.get("subject_template"):
            is_valid, errors = validate_template_for_save(template_data["subject_template"])
            if not is_valid:
                all_errors.extend([f"Subject: {e}" for e in errors])

        if "body_template" in template_data:
            is_valid, errors = validate_template_for_save(template_data["body_template"])
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
    def preview_template(
        template_id: int,
        context_data: dict[str, Any] = None,
        body_template_override: str | None = None,
        subject_template_override: str | None = None,
        layout_id_override: int | None = None,
    ) -> dict[str, str]:
        """Preview a template with context data — delegates to selectors."""
        from .selectors import preview_template
        return preview_template(
            template_id=template_id,
            context_data=context_data,
            body_template_override=body_template_override,
            subject_template_override=subject_template_override,
            layout_id_override=layout_id_override,
        )


class CommunicationService:
    """Service for sending and managing communications with resilience features"""

    # Categories that map to NotificationPreference fields
    CATEGORY_PREFERENCE_MAP = {
        "SYSTEM": "system",
        "MANUAL": "communication",
        "AUTO": "communication",
        "MARKETING": "marketing",
    }

    def __init__(self):
        # Use provider manager for resilience
        self.provider_manager = provider_manager
        logger.debug(
            f"CommunicationService initialized with ProviderManager ({len(self.provider_manager.providers)} providers)"
        )

    def _check_user_preferences(
        self,
        client: User | None,  # type: ignore
        channel: str,
        category: str,
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
            method = "email" if channel == "EMAIL" else "sms"

            # Check global channel toggle first
            if not getattr(preferences, f"{method}_enabled", True):
                return False, f"User has disabled all {method} communications"

            # Map category to preference field
            preference_category = self.CATEGORY_PREFERENCE_MAP.get(category, "communication")

            # Check category-specific preference
            preference_field = f"{preference_category}_{method}"
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

                if in_quiet_hours and method == "sms":
                    # Only block SMS during quiet hours (email can wait)
                    return False, "User is in quiet hours - SMS blocked"

            return True, ""

        except Exception as e:
            logger.error(f"Error checking user preferences: {e}", exc_info=True)
            # Fail closed: block non-critical communications when preferences can't be verified
            # System/transactional messages (e.g., password resets) use skip_preference_check=True
            # and never reach this code path, so blocking here is safe.
            return False, f"Unable to verify user communication preferences: {e}"

    def send_communication(
        self,
        template_name: str,
        recipient: str,
        context_data: dict[str, Any] = None,
        client: User | None = None,  # type: ignore
        sent_by: User | None = None,  # type: ignore
        use_async: bool = False,
        event=None,  # Optional Event instance
        payment=None,  # Optional Payment instance for payment-related communications
        invoice=None,  # Optional Invoice instance for invoice-related communications
        skip_preference_check: bool = False,  # Skip user preference check for critical messages
    ) -> CommunicationRecord | None:
        """Send a communication using a template with optional async processing"""

        # If async is requested and Celery is available (not in eager/sync mode)
        # Note: CELERY_TASK_ALWAYS_EAGER=True means tasks run synchronously (for testing)
        if use_async and not getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            try:
                from .tasks import send_communication_async

                task_result = send_communication_async.delay(
                    template_name=template_name,
                    recipient=recipient,
                    context_data=context_data,
                    client_id=client.id if client else None,
                    sent_by_id=sent_by.id if sent_by else None,
                    event_id=event.id if event else None,
                    payment_id=payment.id if payment else None,
                    invoice_id=invoice.id if invoice else None,
                    skip_preference_check=skip_preference_check,
                )

                logger.info(f"Queued async communication: task_id={task_result.id}")

                # Return a placeholder record (actual record will be created by task)
                return None  # Async tasks don't return records immediately

            except ImportError:
                logger.warning("Celery not available, falling back to synchronous sending")
            except Exception as e:
                logger.warning(f"Async task failed, falling back to sync: {e!s}")

        # Synchronous sending (default behavior)
        try:
            template = CommunicationTemplateService.get_template_by_name(template_name)
        except TemplateNotFound:
            logger.error(f"Template '{template_name}' not found")
            return None

        return self.send_communication_by_template(
            template,
            recipient,
            context_data,
            client,
            sent_by,
            event,
            payment=payment,
            invoice=invoice,
            skip_preference_check=skip_preference_check,
        )

    def send_communication_by_template(
        self,
        template: CommunicationTemplate,
        recipient: str,
        context_data: dict[str, Any] = None,
        client: User | None = None,  # type: ignore
        sent_by: User | None = None,  # type: ignore
        event=None,  # Optional Event instance
        payment=None,  # Optional Payment instance for payment-related communications
        invoice=None,  # Optional Invoice instance for invoice-related communications
        skip_preference_check: bool = False,  # Skip user preference check for critical messages
    ) -> CommunicationRecord | None:
        """Send communication using template object - Enhanced for manual messages and payments"""

        if context_data is None:
            context_data = {}

        # Auto-generate payment/invoice context if provided
        if payment or invoice:
            try:
                from .context_service import CommunicationContextService, ContextType

                # Determine context type
                if payment:
                    ctx_type = ContextType.PAYMENT
                elif invoice:
                    ctx_type = ContextType.INVOICE
                else:
                    ctx_type = template.context_type

                # Generate context with payment/invoice data
                generated_context = CommunicationContextService.generate_context(
                    context_type=ctx_type,
                    client=client,
                    event=event,
                    payment=payment,
                    invoice=invoice,
                    validate=False,  # Don't validate, we're providing what we have
                )

                # Merge generated context with provided context (provided takes precedence)
                generated_context.update(context_data)
                context_data = generated_context

            except Exception as e:
                logger.warning(f"Failed to generate payment/invoice context: {e}")

        # Check user preferences before sending (GDPR/CAN-SPAM compliance)
        if not skip_preference_check and client is not None:
            is_allowed, reason = self._check_user_preferences(
                client=client, channel=template.channel, category=template.category
            )
            if not is_allowed:
                logger.info(
                    f"Communication blocked by user preference: {template.name} to {recipient}. Reason: {reason}"
                )
                # Raise exception with details instead of returning None
                from .exceptions import SendingFailed

                raise SendingFailed(f"Communication blocked by user preference: {reason}")

        logger.info(f"Sending communication: {template.name} to {recipient}")

        # Check if this is a manual message with custom content
        is_manual_message = template.category == "MANUAL" and (
            "custom_subject" in context_data or "custom_body" in context_data
        )

        # Render template with enhanced support for manual messages
        try:
            if is_manual_message:
                # For manual messages, handle custom subject and body
                custom_subject = context_data.get("custom_subject", "")
                custom_body = context_data.get("custom_body", "")

                if custom_subject and custom_body:
                    # Create enhanced context for manual template rendering
                    enhanced_context = {**context_data, "custom_subject": custom_subject, "custom_body": custom_body}

                    rendered = CommunicationTemplateService.preview_template(template.id, enhanced_context)

                    # Override with custom subject for manual messages
                    subject = custom_subject
                    body = rendered.get("body")
                else:
                    # Fallback to standard rendering
                    rendered = CommunicationTemplateService.preview_template(template.id, context_data)
                    subject = rendered.get("subject")
                    body = rendered.get("body")
            else:
                # Standard template rendering for non-manual messages
                rendered = CommunicationTemplateService.preview_template(template.id, context_data)
                subject = rendered.get("subject")
                body = rendered.get("body")

        except Exception as e:
            logger.error(f"Failed to render template: {e!s}")
            # Raise exception with details instead of returning None
            from .exceptions import SendingFailed

            raise SendingFailed(f"Failed to render template: {e!s}")

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
            delivery_status="PENDING",
        )

        logger.info(f"Created communication record: {record.id}")

        # Send communication with resilience and metrics
        start_time = timezone.now()
        try:
            if template.channel == "EMAIL":
                external_id, provider_used = self.provider_manager.send_with_fallback(
                    "send_email", recipient, subject, body
                )
            else:  # SMS
                external_id, provider_used = self.provider_manager.send_with_fallback("send_sms", recipient, body)

            # Calculate response time
            response_time_ms = (timezone.now() - start_time).total_seconds() * 1000

            # Update record with success
            record.external_message_id = external_id
            record.delivery_status = "SENT"
            record.sent_at = timezone.now()
            record.context_data["provider_used"] = provider_used
            record.context_data["response_time_ms"] = response_time_ms
            record.save()

            # Record success metrics
            communication_metrics.record_communication_sent(
                template_name=template.name,
                channel=template.channel,
                provider=provider_used,
                success=True,
                response_time_ms=response_time_ms,
            )

            logger.info(f"Communication sent successfully via {provider_used}. External ID: {external_id}")
            return record

        except Exception as e:
            logger.error(f"Failed to send communication: {e!s}")

            # Calculate response time even for failures
            response_time_ms = (timezone.now() - start_time).total_seconds() * 1000

            # Update record with failure
            record.delivery_status = "FAILED"
            record.context_data["error"] = str(e)
            record.context_data["response_time_ms"] = response_time_ms
            record.save()

            # Record failure metrics
            communication_metrics.record_communication_sent(
                template_name=template.name,
                channel=template.channel,
                provider="unknown",  # Provider might not be available on failure
                success=False,
                response_time_ms=response_time_ms,
            )

            # Add to retry queue for later processing
            delivery_queue.add_failed_delivery(
                {
                    "record_id": str(record.id),
                    "template_channel": template.channel,
                    "recipient": recipient,
                    "subject": subject,
                    "body": body,
                    "template_name": template.name,
                    "context_data": record.context_data,
                }
            )

            return record  # Return record even on failure for tracking

    def send_bulk_communications(
        self,
        template: CommunicationTemplate,
        recipients: list[dict[str, Any]],
        sent_by: User | None = None,  # type: ignore
        use_async: bool = True,
    ) -> list[CommunicationRecord]:
        """Send bulk communications with optional async processing"""

        # For large batches, prefer async processing (not in eager/sync mode)
        if use_async and len(recipients) > 5 and not getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            try:
                from .tasks import send_bulk_communications_async

                task_result = send_bulk_communications_async.delay(
                    template_id=template.id,
                    recipients=recipients,
                    sent_by_id=sent_by.id if sent_by else None,
                    batch_size=10,
                )

                logger.info(f"Queued bulk communication: task_id={task_result.id}, {len(recipients)} recipients")

                # Return empty list for async operations
                return []

            except ImportError:
                logger.warning("Celery not available, falling back to synchronous bulk sending")
            except Exception as e:
                logger.warning(f"Async bulk task failed, falling back to sync: {e!s}")

        # Synchronous sending (default for small batches or when async unavailable)
        records = []
        for recipient_data in recipients:
            recipient = recipient_data["recipient"]
            context_data = recipient_data.get("context_data", {})
            client_id = recipient_data.get("client_id")

            client = None
            if client_id:
                try:
                    client = User.objects.get(id=client_id)
                except User.DoesNotExist:
                    pass

            record = self.send_communication_by_template(template, recipient, context_data, client, sent_by)
            if record:
                records.append(record)

        return records

    def get_communication_records(
        self,
        client_id: int | None = None,
        template_name: str | None = None,
        status: str | None = None,
        limit: int = 100,
    ) -> list[CommunicationRecord]:
        """Get communication records with filtering"""
        from .selectors import get_communication_records
        return get_communication_records(
            client_id=client_id,
            template_name=template_name,
            status=status,
            limit=limit,
        )

    def get_provider_health(self) -> dict[str, dict]:
        """Get health status of communication providers"""
        return self.provider_manager.get_provider_health()

    def reset_provider(self, provider_name: str):
        """Reset circuit breaker for a provider"""
        return self.provider_manager.reset_provider(provider_name)

    def process_retry_queue(self) -> dict[str, int]:
        """Process failed deliveries from retry queue"""
        ready_deliveries = delivery_queue.get_ready_deliveries()
        results = {"processed": 0, "succeeded": 0, "failed": 0, "requeued": 0}

        for delivery in ready_deliveries:
            results["processed"] += 1

            try:
                # Find the original record
                record = CommunicationRecord.objects.get(id=delivery["record_id"])

                # Attempt resend
                if delivery["template_channel"] == "EMAIL":
                    external_id, provider_used = self.provider_manager.send_with_fallback(
                        "send_email", delivery["recipient"], delivery["subject"], delivery["body"]
                    )
                else:  # SMS
                    external_id, provider_used = self.provider_manager.send_with_fallback(
                        "send_sms", delivery["recipient"], delivery["body"]
                    )

                # Update record with success
                record.external_message_id = external_id
                record.delivery_status = "SENT"
                record.sent_at = timezone.now()
                record.context_data["provider_used"] = provider_used
                record.context_data["retry_successful"] = True
                record.save()

                results["succeeded"] += 1
                logger.info(f"Retry successful for record {record.id}")

            except Exception as e:
                # Increment retry count and requeue if under limit
                delivery["retry_count"] += 1
                delivery["last_error"] = str(e)

                if delivery["retry_count"] < 5:  # Max retries
                    delivery_queue.add_failed_delivery(delivery)
                    results["requeued"] += 1
                    logger.warning(
                        f"Retry {delivery['retry_count']} failed for record {delivery['record_id']}, requeued"
                    )
                else:
                    results["failed"] += 1
                    logger.error(f"Max retries exceeded for record {delivery['record_id']}")

        return results

    def update_delivery_status(self, external_message_id: str, status: str, opened_at: timezone.datetime | None = None):
        """Update delivery status from webhook"""
        try:
            record = CommunicationRecord.objects.get(external_message_id=external_message_id)
            record.delivery_status = status

            if status == "DELIVERED" and not record.delivered_at:
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
    def get_template_stats(
        template_name: str | None = None,
        days: int = 30,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, Any]:
        """Get communication statistics for a date range."""
        from .selectors import get_template_stats
        return get_template_stats(
            template_name=template_name,
            days=days,
            start_date=start_date,
            end_date=end_date,
        )
