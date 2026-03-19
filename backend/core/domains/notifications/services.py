# backend/core/domains/notifications/services.py
import logging
from datetime import datetime, timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.template import Context, Template
from django.utils import timezone

from .exceptions import (
    InvalidNotificationDataException,
    NotificationNotFoundException,
    NotificationPreferenceNotFoundException,
    NotificationTypeNotFoundException,
)
from .models import (
    Notification,
    NotificationDigest,
    NotificationPreference,
    NotificationType,
)
from .security import (
    NotificationContentValidator,
    NotificationRateLimiter,
    NotificationSecurityService,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationService:
    """Enhanced service for handling notification operations"""

    @staticmethod
    def get_notifications(
        user,
        is_read: bool | None = None,
        notification_type: str | None = None,
        category: str | None = None,
        limit: int | None = None,
    ):
        """Get notifications for a user with filtering"""
        from .selectors import get_notifications

        return get_notifications(
            user=user,
            is_read=is_read,
            notification_type=notification_type,
            category=category,
            limit=limit,
        )

    @staticmethod
    def get_notification_by_id(notification_id: int, user=None):
        """Get a notification by ID, optionally filtered by user"""
        from .selectors import get_notification_by_id

        return get_notification_by_id(notification_id=notification_id, user=user)

    @staticmethod
    def mark_as_read(notification_id: int, user=None):
        """Mark a notification as read"""
        with transaction.atomic():
            notification = NotificationService.get_notification_by_id(notification_id, user)
            notification.mark_as_read()
            return notification

    @staticmethod
    def mark_as_unread(notification_id: int, user=None):
        """Mark a notification as unread"""
        with transaction.atomic():
            notification = NotificationService.get_notification_by_id(notification_id, user)
            if notification.is_read:
                notification.is_read = False
                notification.read_at = None
                notification.save(update_fields=["is_read", "read_at", "updated_at"])
            return notification

    @staticmethod
    def mark_all_as_read(user):
        """Mark all notifications as read for a user"""
        with transaction.atomic():
            now = timezone.now()
            updated = Notification.objects.filter(recipient=user, is_read=False).update(
                is_read=True, read_at=now, updated_at=now
            )
            return updated

    @staticmethod
    def delete_notification(notification_id: int, user=None):
        """Delete a notification"""
        notification = NotificationService.get_notification_by_id(notification_id, user)
        notification.delete()
        return True

    @staticmethod
    def create_notification(
        recipient,
        notification_type_code: str,
        context: dict[str, Any] | None = None,
        delivery_methods: list[str] | None = None,
        event=None,
        client=None,
        use_async: bool = True,
    ):
        """
        Create and deliver a new notification

        Args:
            recipient: User to receive the notification
            notification_type_code: Code of the notification type
            context: Dictionary of context variables for templates
            delivery_methods: List of delivery methods to force (overrides preferences)
            event: Related event object
            client: Related client object
            use_async: Whether to process asynchronously (default True)

        Returns:
            Created notification object or async task result if use_async=True
        """
        if not context:
            context = {}

        # Security: Rate limiting check
        can_create, limit_message = NotificationRateLimiter.check_creation_limit(
            user_id=recipient.id, notification_type_code=notification_type_code
        )

        if not can_create:
            logger.warning(f"Rate limit exceeded for user {recipient.id}: {limit_message}")
            raise InvalidNotificationDataException(f"Rate limit exceeded: {limit_message}")

        # If async processing is enabled and we're not in testing mode
        if use_async and not getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            try:
                # Import tasks here to avoid circular imports
                from .tasks import create_notification_async

                # Queue async task
                task_result = create_notification_async.delay(
                    recipient_id=recipient.id,
                    notification_type_code=notification_type_code,
                    context=context,
                    delivery_methods=delivery_methods,
                    event_id=event.id if event else None,
                    client_id=client.id if client else None,
                )

                logger.info(f"Queued async notification creation: task_id={task_result.id}")
                return task_result

            except ImportError:
                logger.warning("Celery not available, falling back to synchronous processing")
            except Exception as e:
                logger.warning(f"Async task failed, falling back to sync: {e!s}")

        # Get notification type
        try:
            notification_type = NotificationType.objects.get(code=notification_type_code, is_active=True)
        except NotificationType.DoesNotExist:
            raise NotificationTypeNotFoundException(f"Notification type with code {notification_type_code} not found")

        # Get or create user notification preferences
        preferences = NotificationService.get_or_create_user_preferences(recipient.id)

        # Determine delivery methods
        if delivery_methods:
            # Use forced delivery methods
            enabled_methods = delivery_methods
        else:
            # Check user preferences for each method
            enabled_methods = []

            if preferences.is_notification_enabled(notification_type, "in_app"):
                enabled_methods.append("in_app")

            if preferences.is_notification_enabled(notification_type, "email"):
                enabled_methods.append("email")

            if preferences.is_notification_enabled(notification_type, "sms"):
                enabled_methods.append("sms")

            if preferences.is_notification_enabled(notification_type, "push"):
                enabled_methods.append("push")

        # If no delivery methods are enabled and it's not a system notification, skip
        if not enabled_methods and not notification_type.is_system:
            logger.info(
                f"Skipping notification {notification_type_code} for {recipient.email} - no enabled delivery methods"
            )
            return None

        # Security: Sanitize context data
        sanitized_context = NotificationSecurityService.validate_context_data(context)

        # Prepare context with additional data
        enhanced_context = {
            **sanitized_context,
            "recipient_name": recipient.get_display_name(),
            "recipient_first_name": recipient.first_name,
            "recipient_last_name": recipient.last_name,
            "site_name": getattr(settings, "SITE_NAME", "LifePlace"),
        }

        # Add event context if provided
        if event:
            enhanced_context.update(
                {
                    "event_id": event.id,
                    "event_name": event.name or f"{event.event_type} Event",
                    "event_start_date": event.start_date.isoformat() if event.start_date else None,
                }
            )

        # Add client context if provided
        if client:
            enhanced_context.update(
                {
                    "client_id": client.id,
                    "client_name": client.get_display_name(),
                    "client_email": client.email,
                }
            )

        # Render templates with context
        template_context = Context(enhanced_context)

        try:
            raw_title = Template(notification_type.default_title_template).render(template_context)
            raw_content = Template(notification_type.default_content_template).render(template_context)

            # Security: Sanitize rendered content
            title = NotificationSecurityService.sanitize_title(raw_title)
            content = NotificationSecurityService.sanitize_content(raw_content)
            action_url = NotificationSecurityService.validate_action_url(context.get("action_url", ""))

            # Security: Validate final notification data
            notification_data = {"title": title, "content": content, "action_url": action_url or ""}

            is_valid, validation_errors = NotificationContentValidator.validate_notification_data(notification_data)
            if not is_valid:
                logger.warning(f"Notification validation failed: {validation_errors}")
                raise InvalidNotificationDataException(f"Content validation failed: {'; '.join(validation_errors)}")

        except Exception as e:
            logger.error(f"Error rendering notification template: {e!s}")
            raise InvalidNotificationDataException(f"Template rendering error: {e!s}")

        # Create the notification
        with transaction.atomic():
            notification = Notification.objects.create(
                recipient=recipient,
                notification_type=notification_type,
                title=title,
                content=content,
                action_url=action_url or "",
                context_data=enhanced_context,
                event=event,
                client=client,
                expires_at=context.get("expires_at"),
            )

            # Deliver via enabled methods
            for method in enabled_methods:
                try:
                    if method == "in_app":
                        # In-app notification is already created
                        notification.add_delivery_method("in_app", success=True)

                    elif method == "email":
                        NotificationService._send_email_notification(notification, notification_type, enhanced_context)

                    elif method == "sms":
                        NotificationService._send_sms_notification(notification, notification_type, enhanced_context)

                    elif method == "push":
                        NotificationService._send_push_notification(notification, notification_type, enhanced_context)

                except Exception as e:
                    logger.error(f"Failed to deliver notification via {method}: {e!s}")
                    notification.add_delivery_method(method, success=False, error=str(e))

            # Security: Record creation for rate limiting
            NotificationRateLimiter.record_creation(
                user_id=recipient.id, notification_type_code=notification_type_code, title=title
            )

            logger.info(f"Created notification {notification_type_code} for {recipient.email}")
            return notification

    @staticmethod
    def _send_email_notification(notification, notification_type, context):
        """Send email notification using the communication service"""
        try:
            from core.domains.communications.context_service import CommunicationContextService, ContextType
            from core.domains.communications.services import CommunicationService

            communication_service = CommunicationService()

            # Render email template
            if notification_type.default_email_template:
                email_body = Template(notification_type.default_email_template).render(Context(context))
            else:
                # Fallback to content with basic HTML wrapper
                email_body = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>{notification.title}</h2>
                    <div style="margin: 20px 0;">
                        {notification.content.replace("\n", "<br>")}
                    </div>
                    {f'<p><a href="{context.get("action_url", "")}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Details</a></p>' if context.get("action_url") else ""}
                </div>
                """

            # Send via communication service using config
            from core.domains.communications.config import communication_config

            try:
                email_template_name = communication_config.get_template_name("EMAIL_LAYOUT")
            except ValueError:
                # Fallback to notification-specific template
                email_template_name = communication_config.get_template_name("NOTIFICATION_EMAIL")

            # Generate base context using the unified context service
            base_context = CommunicationContextService.generate_context(
                context_type=ContextType.NOTIFICATION,
                user=notification.recipient,
                notification=notification,
            )

            # Merge with caller context and add custom fields
            context_data = {
                **base_context,
                **context,
                "custom_subject": notification.title,
                "custom_body": email_body,
            }

            record = communication_service.send_communication(
                template_name=email_template_name,
                recipient=notification.recipient.email,
                context_data=context_data,
                sent_by=None,  # System notification
            )

            if record:
                notification.add_delivery_method("email", success=True)
                logger.info(f"Email notification sent successfully to {notification.recipient.email}")
            else:
                raise Exception("Communication service returned None")

        except ImportError:
            logger.warning("Communication service not available for email notifications")
            raise Exception("Email service not available")
        except Exception as e:
            logger.error(f"Failed to send email notification: {e!s}")
            raise e

    @staticmethod
    def _send_sms_notification(notification, notification_type, context):
        """Send SMS notification using the communication service"""
        try:
            from core.domains.communications.context_service import CommunicationContextService, ContextType
            from core.domains.communications.services import CommunicationService

            communication_service = CommunicationService()

            # Render SMS template (limited to 160 characters)
            if notification_type.default_sms_template:
                sms_content = Template(notification_type.default_sms_template).render(Context(context))
            else:
                # Fallback to truncated title
                sms_content = f"{notification.title[:140]}... - LifePlace"

            # Get user's phone number from profile
            phone_number = (
                getattr(notification.recipient.profile, "phone", None)
                if hasattr(notification.recipient, "profile")
                else None
            )

            if not phone_number:
                raise Exception("Recipient has no phone number configured")

            # Send via communication service using config
            from core.domains.communications.config import communication_config

            try:
                sms_template_name = communication_config.get_template_name("SMS_LAYOUT")
            except ValueError:
                # Fallback to notification-specific template
                sms_template_name = communication_config.get_template_name("NOTIFICATION_SMS")

            # Generate base context using the unified context service
            base_context = CommunicationContextService.generate_context(
                context_type=ContextType.NOTIFICATION,
                user=notification.recipient,
                notification=notification,
            )

            # Merge with caller context and add custom fields
            context_data = {
                **base_context,
                **context,
                "custom_body": sms_content,
            }

            record = communication_service.send_communication(
                template_name=sms_template_name,
                recipient=phone_number,
                context_data=context_data,
                sent_by=None,  # System notification
            )

            if record:
                notification.add_delivery_method("sms", success=True)
                logger.info(f"SMS notification sent successfully to {phone_number}")
            else:
                raise Exception("Communication service returned None")

        except ImportError:
            logger.warning("Communication service not available for SMS notifications")
            raise Exception("SMS service not available")
        except Exception as e:
            logger.error(f"Failed to send SMS notification: {e!s}")
            raise e

    @staticmethod
    def _send_push_notification(notification, notification_type, context):
        """Send push notification via Expo Push service"""
        try:
            from .models import DevicePushToken

            # Get active push tokens for the recipient
            push_tokens = DevicePushToken.objects.filter(user=notification.recipient, is_active=True)

            if not push_tokens.exists():
                logger.debug(f"No active push tokens for user {notification.recipient.id}")
                return

            # Prepare push data
            push_data = {
                "notification_id": str(notification.id),
                "notification_type": notification_type.code,
                "category": notification_type.category,
            }

            if notification.action_url:
                push_data["action_url"] = notification.action_url
            if notification.event_id:
                push_data["event_id"] = str(notification.event_id)
            if notification.client_id:
                push_data["client_id"] = str(notification.client_id)

            # Calculate unread badge count
            unread_count = notification.recipient.notifications.filter(is_read=False).count()

            # Send to all active devices
            success_count = 0
            for token in push_tokens:
                try:
                    result = PushNotificationService.send_push_notification(
                        push_token=token.token,
                        title=notification.title,
                        body=notification.content[:200] if len(notification.content) > 200 else notification.content,
                        data=push_data,
                        badge=unread_count,
                        priority=notification_type.priority.lower()
                        if notification_type.priority in ["HIGH", "URGENT"]
                        else "default",
                        category_id=notification_type.category,
                    )

                    if result.get("success"):
                        token.record_success()
                        success_count += 1
                    else:
                        error = result.get("error", "Unknown error")
                        if result.get("permanent_failure"):
                            token.record_failure(permanent=True)
                        else:
                            token.record_failure(permanent=False)
                        logger.warning(f"Push failed for token {token.id}: {error}")

                except Exception as e:
                    logger.error(f"Error sending push to token {token.id}: {e!s}")
                    token.record_failure(permanent=False)

            if success_count > 0:
                notification.add_delivery_method("push", success=True)
                logger.info(f"Push notification sent to {success_count} devices for user {notification.recipient.id}")
            else:
                notification.add_delivery_method("push", success=False, error="Failed to deliver to any device")

        except ImportError as e:
            logger.warning(f"Push notification dependencies not available: {e!s}")
            raise Exception("Push service not available")
        except Exception as e:
            logger.error(f"Failed to send push notification: {e!s}")
            raise e

    @staticmethod
    def bulk_action(user_id: int, notification_ids: list[int], action: str):
        """Perform bulk actions on multiple notifications"""
        if not notification_ids:
            raise InvalidNotificationDataException("No notification IDs provided")

        notifications = Notification.objects.filter(recipient_id=user_id, id__in=notification_ids)

        if not notifications.exists():
            raise NotificationNotFoundException("No matching notifications found")

        with transaction.atomic():
            if action == "mark_read":
                now = timezone.now()
                return notifications.filter(is_read=False).update(is_read=True, read_at=now, updated_at=now)
            elif action == "mark_unread":
                now = timezone.now()
                return notifications.filter(is_read=True).update(is_read=False, read_at=None, updated_at=now)
            elif action == "delete":
                count = notifications.count()
                notifications.delete()
                return count

    @staticmethod
    def get_notification_counts(user_id: int):
        """Get detailed notification counts for a user"""
        from .selectors import get_notification_counts

        return get_notification_counts(user_id=user_id)

    @staticmethod
    def get_or_create_user_preferences(user_id: int):
        """Get or create notification preferences for a user"""
        try:
            return NotificationPreference.objects.get(user_id=user_id)
        except NotificationPreference.DoesNotExist:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
                return NotificationPreference.objects.create(user=user)
            except User.DoesNotExist:
                raise NotificationPreferenceNotFoundException("User not found")

    @staticmethod
    def update_user_preferences(user_id: int, preference_data: dict[str, Any]):
        """Update notification preferences for a user"""
        with transaction.atomic():
            preferences = NotificationService.get_or_create_user_preferences(user_id)

            # Update boolean fields
            boolean_fields = [
                "email_enabled",
                "sms_enabled",
                "in_app_enabled",
                "push_enabled",
                "system_email",
                "system_sms",
                "system_in_app",
                "system_push",
                "event_email",
                "event_sms",
                "event_in_app",
                "event_push",
                "task_email",
                "task_sms",
                "task_in_app",
                "task_push",
                "payment_email",
                "payment_sms",
                "payment_in_app",
                "payment_push",
                "client_email",
                "client_sms",
                "client_in_app",
                "client_push",
                "contract_email",
                "contract_sms",
                "contract_in_app",
                "contract_push",
                "workflow_email",
                "workflow_sms",
                "workflow_in_app",
                "workflow_push",
                "communication_email",
                "communication_sms",
                "communication_in_app",
                "communication_push",
                "marketing_email",
                "marketing_sms",
                "marketing_in_app",
                "marketing_push",
                "quiet_hours_enabled",
            ]

            for field in boolean_fields:
                if field in preference_data:
                    setattr(preferences, field, preference_data[field])

            # Update time fields
            if "quiet_hours_start" in preference_data:
                preferences.quiet_hours_start = preference_data["quiet_hours_start"]
            if "quiet_hours_end" in preference_data:
                preferences.quiet_hours_end = preference_data["quiet_hours_end"]

            # Update digest frequency
            if "digest_frequency" in preference_data:
                preferences.digest_frequency = preference_data["digest_frequency"]

            # Update disabled types
            if "disabled_types" in preference_data:
                preferences.disabled_types.clear()
                if preference_data["disabled_types"]:
                    notification_types = NotificationType.objects.filter(
                        id__in=preference_data["disabled_types"], is_active=True
                    )
                    preferences.disabled_types.add(*notification_types)

            preferences.save()
            return preferences

    @staticmethod
    def cleanup_old_notifications(days: int = 90):
        """Clean up old read notifications"""
        cutoff_date = timezone.now() - timedelta(days=days)

        deleted_count = Notification.objects.filter(created_at__lt=cutoff_date, is_read=True).delete()[0]

        logger.info(f"Cleaned up {deleted_count} old notifications")
        return deleted_count

    @staticmethod
    def auto_expire_notifications():
        """Mark expired notifications as expired"""
        now = timezone.now()

        updated_count = Notification.objects.filter(expires_at__lt=now, is_expired=False).update(
            is_expired=True, updated_at=now
        )

        logger.info(f"Marked {updated_count} notifications as expired")
        return updated_count


class NotificationTypeService:
    """Service for managing notification types"""

    @staticmethod
    def get_all_notification_types(category: str | None = None, is_active: bool | None = None):
        """Get all notification types with optional filtering"""
        from .selectors import get_all_notification_types

        return get_all_notification_types(category=category, is_active=is_active)

    @staticmethod
    def get_notification_type_by_code(code: str):
        """Get notification type by code"""
        from .selectors import get_notification_type_by_code

        return get_notification_type_by_code(code=code)

    @staticmethod
    def create_notification_type(type_data: dict[str, Any]):
        """Create a new notification type"""
        return NotificationType.objects.create(**type_data)

    @staticmethod
    def update_notification_type(type_id: int, type_data: dict[str, Any]):
        """Update an existing notification type"""
        try:
            notification_type = NotificationType.objects.get(id=type_id)
        except NotificationType.DoesNotExist:
            raise NotificationTypeNotFoundException()

        for key, value in type_data.items():
            setattr(notification_type, key, value)

        notification_type.save()
        return notification_type


class NotificationStatsService:
    """Service for notification analytics and statistics"""

    @staticmethod
    def get_user_stats(user_id: int, days: int = 30):
        """Get notification statistics for a user"""
        from .selectors import get_user_stats

        return get_user_stats(user_id=user_id, days=days)

    @staticmethod
    def get_system_stats(days: int = 30):
        """Get system-wide notification statistics"""
        from .selectors import get_system_stats

        return get_system_stats(days=days)


class NotificationDigestService:
    """Service for handling notification digests"""

    @staticmethod
    def create_digest(user, frequency: str, period_start: datetime, period_end: datetime):
        """Create a notification digest for a user"""
        # Get notifications for the period
        notifications = Notification.objects.filter(
            recipient=user, created_at__gte=period_start, created_at__lt=period_end, is_read=False
        ).order_by("-created_at")

        if not notifications.exists():
            return None

        # Create digest
        digest = NotificationDigest.objects.create(
            user=user,
            frequency=frequency,
            period_start=period_start,
            period_end=period_end,
            notification_count=notifications.count(),
        )

        # Add notifications to digest
        digest.notifications.add(*notifications)

        return digest

    @staticmethod
    def send_digest(digest_id: int):
        """Send a notification digest"""
        try:
            digest = NotificationDigest.objects.get(id=digest_id)
        except NotificationDigest.DoesNotExist:
            raise Exception("Digest not found")

        if digest.is_sent:
            return digest

        # Get user preferences
        preferences = NotificationService.get_or_create_user_preferences(digest.user.id)

        # Determine delivery methods
        delivery_methods = []
        if preferences.email_enabled:
            delivery_methods.append("email")
        if preferences.sms_enabled:
            delivery_methods.append("sms")

        # Send digest via enabled methods
        for method in delivery_methods:
            try:
                if method == "email":
                    NotificationDigestService._send_email_digest(digest)
                elif method == "sms":
                    NotificationDigestService._send_sms_digest(digest)
            except Exception as e:
                logger.error(f"Failed to send digest via {method}: {e!s}")

        # Mark as sent
        digest.is_sent = True
        digest.sent_at = timezone.now()
        digest.delivery_methods = delivery_methods
        digest.save()

        return digest

    @staticmethod
    def _send_email_digest(digest):
        """Send email digest"""
        try:
            from core.domains.communications.context_service import CommunicationContextService, ContextType
            from core.domains.communications.services import CommunicationService

            communication_service = CommunicationService()

            # Prepare digest content
            notifications_list = []
            for notification in digest.notifications.all()[:10]:  # Limit to 10 for email
                notifications_list.append(
                    {
                        "title": notification.title,
                        "content": notification.content[:100] + "..."
                        if len(notification.content) > 100
                        else notification.content,
                        "action_url": notification.action_url,
                    }
                )

            # Create email content
            email_content = f"""
            <h2>Your {digest.get_frequency_display()} Notification Digest</h2>
            <p>You have {digest.notification_count} unread notifications:</p>
            <ul>
            """

            for notif in notifications_list:
                email_content += f"""
                <li>
                    <strong>{notif["title"]}</strong><br>
                    {notif["content"]}
                    {f'<br><a href="{notif["action_url"]}">View Details</a>' if notif["action_url"] else ""}
                </li>
                """

            email_content += "</ul>"

            if digest.notification_count > 10:
                email_content += f"<p>And {digest.notification_count - 10} more notifications...</p>"

            # Send via communication service using config
            from core.domains.communications.config import communication_config

            try:
                digest_template_name = communication_config.get_template_name("DIGEST_EMAIL")
            except ValueError:
                # Fallback to manual layout
                digest_template_name = communication_config.get_template_name("EMAIL_LAYOUT")

            # Generate base context using the unified context service
            # For digests, we skip validation since we don't have a single notification object
            base_context = CommunicationContextService.generate_context(
                context_type=ContextType.NOTIFICATION,
                user=digest.user,
                validate=False,  # No single notification for digest
            )

            # Merge with digest-specific context
            context_data = {
                **base_context,
                "custom_subject": f"Your {digest.get_frequency_display()} Notification Digest",
                "custom_body": email_content,
                "first_name": digest.user.first_name,
                "last_name": digest.user.last_name,
                "title": f"Your {digest.get_frequency_display()} Notification Digest",
                "content": f"You have {digest.notification_count} unread notifications",
            }

            record = communication_service.send_communication(
                template_name=digest_template_name, recipient=digest.user.email, context_data=context_data, sent_by=None
            )

            if not record:
                raise Exception("Failed to send digest email")

        except Exception as e:
            logger.error(f"Failed to send email digest: {e!s}")
            raise e

    @staticmethod
    def _send_sms_digest(digest):
        """Send SMS digest summary"""
        try:
            from core.domains.communications.config import communication_config
            from core.domains.communications.context_service import CommunicationContextService, ContextType
            from core.domains.communications.services import CommunicationService

            communication_service = CommunicationService()

            # Get user's phone number
            phone_number = getattr(digest.user.profile, "phone", None) if hasattr(digest.user, "profile") else None

            if not phone_number:
                raise Exception("User has no phone number configured")

            # Create SMS content (limited)
            sms_content = (
                f"You have {digest.notification_count} unread notifications. Check your portal for details. - LifePlace"
            )

            # Send via communication service using config
            try:
                sms_template_name = communication_config.get_template_name("SMS_LAYOUT")
            except ValueError:
                # Fallback to notification SMS template
                sms_template_name = communication_config.get_template_name("NOTIFICATION_SMS")

            # Generate base context using the unified context service
            # For digests, we skip validation since we don't have a single notification object
            base_context = CommunicationContextService.generate_context(
                context_type=ContextType.NOTIFICATION,
                user=digest.user,
                validate=False,  # No single notification for digest
            )

            # Merge with digest-specific context
            context_data = {
                **base_context,
                "custom_body": sms_content,
                "first_name": digest.user.first_name,
                "title": "Notification Digest",
                "content": f"You have {digest.notification_count} unread notifications",
            }

            record = communication_service.send_communication(
                template_name=sms_template_name, recipient=phone_number, context_data=context_data, sent_by=None
            )

            if not record:
                raise Exception("Failed to send digest SMS")

        except Exception as e:
            logger.error(f"Failed to send SMS digest: {e!s}")
            raise e


class PushNotificationService:
    """Service for handling Expo push notifications"""

    _client = None

    @classmethod
    def get_push_client(cls):
        """Get or create Expo PushClient (connection pooled)"""
        if cls._client is None:
            try:
                from exponent_server_sdk import PushClient

                cls._client = PushClient()
            except ImportError:
                logger.error("exponent-server-sdk not installed")
                raise ImportError("exponent-server-sdk package is required for push notifications")
        return cls._client

    @staticmethod
    def is_valid_expo_token(token: str) -> bool:
        """Validate Expo push token format"""
        from .selectors import is_valid_expo_token

        return is_valid_expo_token(token=token)

    @staticmethod
    def get_user_push_tokens(user_id: int):
        """Get all active push tokens for a user"""
        from .selectors import get_user_push_tokens

        return get_user_push_tokens(user_id=user_id)

    @staticmethod
    def register_token(
        user, token: str, device_type: str = "ios", device_id: str = "", device_name: str = "", app_version: str = ""
    ):
        """Register or update a push token for a user"""
        from .models import DevicePushToken

        if not PushNotificationService.is_valid_expo_token(token):
            raise ValueError(f"Invalid Expo push token format: {token}")

        # Try to find existing token
        existing = DevicePushToken.objects.filter(user=user, token=token).first()

        if existing:
            # Reactivate and update existing token
            existing.is_active = True
            existing.device_type = device_type
            existing.device_id = device_id or existing.device_id
            existing.device_name = device_name or existing.device_name
            existing.app_version = app_version or existing.app_version
            existing.failure_count = 0
            existing.save()
            logger.info(f"Reactivated push token for user {user.id}")
            return existing

        # If same device_id exists with different token, deactivate old one
        if device_id:
            DevicePushToken.objects.filter(user=user, device_id=device_id).exclude(token=token).update(is_active=False)

        # Create new token
        push_token = DevicePushToken.objects.create(
            user=user,
            token=token,
            device_type=device_type,
            device_id=device_id,
            device_name=device_name,
            app_version=app_version,
        )
        logger.info(f"Registered new push token for user {user.id}")
        return push_token

    @staticmethod
    def unregister_token(user, token: str = None, device_id: str = None):
        """Unregister a push token by token value or device_id"""
        from .models import DevicePushToken

        if not token and not device_id:
            raise ValueError("Either token or device_id must be provided")

        query = DevicePushToken.objects.filter(user=user)

        if token:
            query = query.filter(token=token)
        elif device_id:
            query = query.filter(device_id=device_id)

        count = query.update(is_active=False)
        logger.info(f"Deactivated {count} push token(s) for user {user.id}")
        return count

    @classmethod
    def send_push_notification(
        cls,
        push_token: str,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
        badge: int | None = None,
        sound: str = "default",
        priority: str = "default",
        channel_id: str = "default",
        category_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Send a push notification to a single device

        Args:
            push_token: Expo push token
            title: Notification title
            body: Notification body
            data: Custom data payload
            badge: Badge count (iOS)
            sound: Sound to play
            priority: 'default', 'normal', or 'high'
            channel_id: Android notification channel
            category_id: iOS category identifier

        Returns:
            Dict with 'success', 'ticket_id', 'error', 'permanent_failure' keys
        """
        try:
            from exponent_server_sdk import (
                DeviceNotRegisteredError,
                PushClient,  # noqa: F401
                PushMessage,
                PushServerError,
            )

            if not cls.is_valid_expo_token(push_token):
                return {"success": False, "error": "Invalid token format", "permanent_failure": True}

            client = cls.get_push_client()

            message = PushMessage(
                to=push_token,
                title=title,
                body=body,
                data=data or {},
                badge=badge,
                sound=sound,
                priority=priority,
                channel_id=channel_id,
                category_id=category_id,
            )

            try:
                response = client.publish(message)
                response.validate_response()

                # Cache ticket ID for receipt checking
                if response.push_message and hasattr(response, "id"):
                    cls._cache_ticket(response.id, push_token)

                return {
                    "success": True,
                    "ticket_id": getattr(response, "id", None),
                    "error": None,
                    "permanent_failure": False,
                }

            except DeviceNotRegisteredError:
                logger.warning(f"Device not registered: {push_token[:30]}...")
                return {"success": False, "error": "Device not registered", "permanent_failure": True}

            except PushServerError as e:
                logger.error(f"Push server error: {e!s}")
                return {"success": False, "error": str(e), "permanent_failure": False}

        except ImportError:
            logger.error("exponent-server-sdk not installed")
            return {"success": False, "error": "Push service not configured", "permanent_failure": False}
        except Exception as e:
            logger.error(f"Unexpected error sending push: {e!s}")
            return {"success": False, "error": str(e), "permanent_failure": False}

    @classmethod
    def send_push_to_user(
        cls,
        user_id: int,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
        badge: int | None = None,
        **kwargs,
    ) -> dict[str, Any]:
        """
        Send push notification to all of a user's active devices

        Returns:
            Dict with 'total_devices', 'successful', 'failed', 'results' keys
        """
        tokens = cls.get_user_push_tokens(user_id)

        results = {"total_devices": tokens.count(), "successful": 0, "failed": 0, "results": []}

        for token in tokens:
            result = cls.send_push_notification(
                push_token=token.token, title=title, body=body, data=data, badge=badge, **kwargs
            )

            results["results"].append({"device_id": token.device_id, "device_type": token.device_type, **result})

            if result["success"]:
                results["successful"] += 1
                token.record_success()
            else:
                results["failed"] += 1
                token.record_failure(permanent=result.get("permanent_failure", False))

        return results

    @staticmethod
    def _cache_ticket(ticket_id: str, push_token: str):
        """Cache push ticket for later receipt checking"""
        try:
            from django.core.cache import cache

            cache_key = f"push_ticket:{ticket_id}"
            cache.set(cache_key, push_token, timeout=86400)  # 24 hours
        except Exception as e:
            logger.warning(f"Failed to cache push ticket: {e!s}")

    @classmethod
    def check_receipts(cls, ticket_ids: list[str]) -> dict[str, Any]:
        """
        Check push notification receipts for delivery status

        Args:
            ticket_ids: List of ticket IDs to check

        Returns:
            Dict mapping ticket_id to receipt status
        """
        try:
            from django.core.cache import cache

            from exponent_server_sdk import PushClient  # noqa: F401

            client = cls.get_push_client()
            results = {}

            # Batch check receipts
            try:
                receipts = client.get_receipts(ticket_ids)

                for ticket_id, receipt in receipts.items():
                    # Get cached token for this ticket
                    cache_key = f"push_ticket:{ticket_id}"
                    push_token = cache.get(cache_key)

                    if receipt.status == "ok":
                        results[ticket_id] = {"status": "delivered", "push_token": push_token}
                    elif receipt.status == "error":
                        results[ticket_id] = {
                            "status": "failed",
                            "error": receipt.message,
                            "details": getattr(receipt, "details", None),
                            "push_token": push_token,
                        }

                        # Handle DeviceNotRegistered error
                        if receipt.details and receipt.details.get("error") == "DeviceNotRegistered":
                            if push_token:
                                cls._deactivate_token_by_value(push_token)

                    # Clean up cache
                    cache.delete(cache_key)

            except Exception as e:
                logger.error(f"Error checking receipts: {e!s}")

            return results

        except ImportError:
            logger.error("exponent-server-sdk not installed")
            return {}

    @staticmethod
    def _deactivate_token_by_value(token: str):
        """Deactivate a push token by its value"""
        from .models import DevicePushToken

        count = DevicePushToken.objects.filter(token=token, is_active=True).update(is_active=False)
        if count > 0:
            logger.info(f"Deactivated unregistered push token: {token[:30]}...")

    @staticmethod
    def cleanup_inactive_tokens(days: int = 90) -> int:
        """
        Clean up inactive or stale push tokens

        Args:
            days: Number of days of inactivity before cleanup

        Returns:
            Number of tokens deleted
        """
        from .models import DevicePushToken

        cutoff_date = timezone.now() - timedelta(days=days)

        # Delete tokens that are:
        # 1. Inactive (deactivated)
        # 2. OR haven't been used in X days
        deleted_count, _ = DevicePushToken.objects.filter(
            Q(is_active=False, updated_at__lt=cutoff_date)
            | Q(last_used_at__lt=cutoff_date)
            | Q(last_used_at__isnull=True, created_at__lt=cutoff_date)
        ).delete()

        logger.info(f"Cleaned up {deleted_count} stale push tokens")
        return deleted_count
