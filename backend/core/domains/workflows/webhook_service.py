# backend/core/domains/workflows/webhook_service.py

import hashlib
import hmac
import json
import logging
from datetime import timedelta

import requests
from django.db import models, transaction
from django.utils import timezone

from .models import WorkflowWebhook, WorkflowWebhookDelivery

logger = logging.getLogger(__name__)


class WorkflowWebhookService:
    """
    Service for managing and delivering workflow webhooks.

    Handles:
    - Finding matching webhooks for events
    - Creating delivery records
    - Executing HTTP requests with HMAC signatures
    - Retry logic with exponential backoff
    """

    MAX_RETRIES = 3
    RETRY_DELAYS = [60, 300, 900]  # 1 min, 5 min, 15 min
    REQUEST_TIMEOUT = 30  # seconds

    @classmethod
    def trigger_webhooks(
        cls,
        event_type: str,
        event_data: dict,
        workflow_template_id: int = None,
    ) -> list[WorkflowWebhookDelivery]:
        """
        Find matching webhooks and queue deliveries.

        Args:
            event_type: Type of workflow event (e.g., 'STAGE_ENTERED')
            event_data: Data to include in the webhook payload
            workflow_template_id: Optional template ID to filter webhooks

        Returns:
            List of created delivery records
        """
        # Find matching active webhooks
        webhooks = WorkflowWebhook.objects.filter(
            is_active=True,
            events__contains=[event_type],
        )

        # Filter by workflow template if specified
        if workflow_template_id:
            webhooks = webhooks.filter(
                models.Q(workflow_template_id=workflow_template_id) |
                models.Q(workflow_template__isnull=True)
            )
        else:
            webhooks = webhooks.filter(workflow_template__isnull=True)

        deliveries = []
        for webhook in webhooks:
            delivery = cls._queue_delivery(webhook, event_type, event_data)
            if delivery:
                deliveries.append(delivery)

        return deliveries

    @classmethod
    def _queue_delivery(
        cls,
        webhook: WorkflowWebhook,
        event_type: str,
        event_data: dict,
    ) -> WorkflowWebhookDelivery:
        """
        Create a delivery record and attempt immediate delivery.

        Args:
            webhook: The webhook configuration
            event_type: Type of workflow event
            event_data: Data to include in the payload

        Returns:
            The created delivery record
        """
        # Build payload
        payload = {
            'event_type': event_type,
            'timestamp': timezone.now().isoformat(),
            'data': event_data,
        }

        # Create delivery record
        delivery = WorkflowWebhookDelivery.objects.create(
            webhook=webhook,
            event_type=event_type,
            payload=payload,
            status='PENDING',
            attempt_count=0,
        )

        # Attempt immediate delivery
        cls._deliver_webhook(delivery)

        return delivery

    @classmethod
    def _deliver_webhook(cls, delivery: WorkflowWebhookDelivery) -> bool:
        """
        Attempt to deliver a webhook.

        Args:
            delivery: The delivery record to process

        Returns:
            True if delivery was successful, False otherwise
        """
        webhook = delivery.webhook
        delivery.attempt_count += 1

        try:
            # Build payload JSON
            payload_json = json.dumps(delivery.payload, default=str)

            # Generate HMAC signature
            signature = cls._generate_signature(payload_json, webhook.secret)

            # Build headers
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': delivery.event_type,
                'X-Webhook-Delivery-ID': str(delivery.id),
                **webhook.headers,
            }

            # Make the request
            response = requests.post(
                webhook.url,
                data=payload_json,
                headers=headers,
                timeout=cls.REQUEST_TIMEOUT,
            )

            # Update delivery record
            delivery.response_status_code = response.status_code
            delivery.response_body = response.text[:5000]  # Limit stored response

            if 200 <= response.status_code < 300:
                # Success
                delivery.status = 'SUCCESS'
                delivery.error_message = ''
                delivery.save()

                # Update webhook success tracking
                webhook.last_triggered_at = timezone.now()
                webhook.failure_count = 0
                webhook.save(update_fields=['last_triggered_at', 'failure_count'])

                logger.info(
                    f"Webhook delivery {delivery.id} successful: "
                    f"{webhook.name} -> {webhook.url}"
                )
                return True
            else:
                # Non-2xx response - treat as failure
                cls._handle_failure(
                    delivery,
                    webhook,
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
                return False

        except requests.exceptions.Timeout:
            cls._handle_failure(delivery, webhook, "Request timed out")
            return False
        except requests.exceptions.ConnectionError as e:
            cls._handle_failure(delivery, webhook, f"Connection error: {str(e)}")
            return False
        except Exception as e:
            cls._handle_failure(delivery, webhook, f"Unexpected error: {str(e)}")
            logger.exception(f"Webhook delivery {delivery.id} failed with exception")
            return False

    @classmethod
    def _handle_failure(
        cls,
        delivery: WorkflowWebhookDelivery,
        webhook: WorkflowWebhook,
        error_message: str,
    ):
        """
        Handle a failed delivery attempt.

        Args:
            delivery: The delivery record
            webhook: The webhook configuration
            error_message: Description of the failure
        """
        delivery.error_message = error_message

        if delivery.attempt_count < cls.MAX_RETRIES:
            # Schedule retry
            retry_delay = cls.RETRY_DELAYS[min(
                delivery.attempt_count - 1,
                len(cls.RETRY_DELAYS) - 1
            )]
            delivery.status = 'RETRYING'
            delivery.next_retry_at = timezone.now() + timedelta(seconds=retry_delay)
            logger.warning(
                f"Webhook delivery {delivery.id} failed, retry scheduled in "
                f"{retry_delay}s: {error_message}"
            )
        else:
            # Max retries reached
            delivery.status = 'FAILED'
            delivery.next_retry_at = None
            logger.error(
                f"Webhook delivery {delivery.id} failed after "
                f"{cls.MAX_RETRIES} attempts: {error_message}"
            )

        delivery.save()

        # Update webhook failure tracking
        webhook.failure_count += 1
        webhook.save(update_fields=['failure_count'])

    @classmethod
    def _generate_signature(cls, payload: str, secret: str) -> str:
        """
        Generate HMAC-SHA256 signature for payload.

        Args:
            payload: The JSON payload string
            secret: The webhook secret key

        Returns:
            Hex-encoded HMAC signature
        """
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    @classmethod
    def retry_pending_deliveries(cls) -> int:
        """
        Retry all deliveries that are due for retry.

        Returns:
            Number of deliveries retried
        """
        now = timezone.now()
        pending_deliveries = WorkflowWebhookDelivery.objects.filter(
            status='RETRYING',
            next_retry_at__lte=now,
        ).select_related('webhook')

        retried_count = 0
        for delivery in pending_deliveries:
            if delivery.webhook.is_active:
                cls._deliver_webhook(delivery)
                retried_count += 1
            else:
                # Webhook was deactivated - mark as failed
                delivery.status = 'FAILED'
                delivery.error_message = 'Webhook deactivated'
                delivery.next_retry_at = None
                delivery.save()

        if retried_count > 0:
            logger.info(f"Retried {retried_count} webhook deliveries")

        return retried_count

    @classmethod
    def send_test_webhook(cls, webhook: WorkflowWebhook) -> WorkflowWebhookDelivery:
        """
        Send a test webhook to verify configuration.

        Args:
            webhook: The webhook to test

        Returns:
            The test delivery record
        """
        test_payload = {
            'event_type': 'TEST',
            'timestamp': timezone.now().isoformat(),
            'data': {
                'message': 'This is a test webhook from LifePlace',
                'webhook_id': webhook.id,
                'webhook_name': webhook.name,
            },
        }

        delivery = WorkflowWebhookDelivery.objects.create(
            webhook=webhook,
            event_type='TEST',
            payload=test_payload,
            status='PENDING',
            attempt_count=0,
        )

        cls._deliver_webhook(delivery)
        return delivery

    @classmethod
    def get_delivery_history(
        cls,
        webhook_id: int = None,
        limit: int = 50,
    ) -> list[WorkflowWebhookDelivery]:
        """
        Get delivery history for a webhook.

        Args:
            webhook_id: Optional webhook ID to filter by
            limit: Maximum number of records to return

        Returns:
            List of delivery records
        """
        queryset = WorkflowWebhookDelivery.objects.select_related('webhook')

        if webhook_id:
            queryset = queryset.filter(webhook_id=webhook_id)

        return list(queryset.order_by('-created_at')[:limit])
