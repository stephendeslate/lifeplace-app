"""
Unit tests for communications Celery tasks.

Tests:
- send_communication_async (single communication task)
- send_bulk_communications_async (bulk communication task)
- process_retry_queue_async (retry queue processing)
- cleanup_old_records_async (record cleanup task)
- warm_cache_async (cache warming task)
- health_check_providers_async (provider health check task)
"""

import uuid
from datetime import timedelta
from unittest.mock import Mock, patch

from django.utils import timezone

import pytest

from core.domains.communications.models import (
    CommunicationRecord,
    CommunicationTemplate,
)
from core.domains.communications.tasks import (
    cleanup_old_records_async,
    health_check_providers_async,
    process_retry_queue_async,
    send_bulk_communications_async,
    send_communication_async,
    warm_cache_async,
)


@pytest.mark.django_db
class TestSendCommunicationAsync:
    """Tests for send_communication_async task."""

    @patch("core.domains.communications.services.CommunicationService")
    def test_send_communication_success(self, mock_service_class, user_factory):
        """Test successful async communication sending."""
        client = user_factory()

        mock_record = Mock()
        mock_record.id = uuid.uuid4()
        mock_record.delivery_status = "SENT"
        mock_record.external_message_id = "msg_123"

        mock_service = Mock()
        mock_service.send_communication.return_value = mock_record
        mock_service_class.return_value = mock_service

        CommunicationTemplate.objects.create(
            name="Async Test Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        result = send_communication_async(
            template_name="Async Test Template",
            recipient="test@example.com",
            context_data={"key": "value"},
            client_id=client.id,
        )

        assert result["success"] is True
        assert result["record_id"] == str(mock_record.id)
        assert result["delivery_status"] == "SENT"

    @patch("core.domains.communications.services.CommunicationService")
    def test_send_communication_no_record_returned(self, mock_service_class):
        """Test async task when no record is returned (preference blocked)."""
        mock_service = Mock()
        mock_service.send_communication.return_value = None
        mock_service_class.return_value = mock_service

        CommunicationTemplate.objects.create(
            name="Blocked Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        result = send_communication_async(
            template_name="Blocked Template",
            recipient="test@example.com",
        )

        assert result["success"] is True
        assert result["record_id"] is None
        assert "skipped" in result["message"].lower() or "no record" in result["message"].lower()

    @patch("core.domains.communications.services.CommunicationService")
    def test_send_communication_with_event(self, mock_service_class, event_factory):
        """Test async task with event parameter."""
        event = event_factory()

        mock_record = Mock()
        mock_record.id = uuid.uuid4()
        mock_record.delivery_status = "SENT"
        mock_record.external_message_id = "msg_456"

        mock_service = Mock()
        mock_service.send_communication.return_value = mock_record
        mock_service_class.return_value = mock_service

        CommunicationTemplate.objects.create(
            name="Event Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        result = send_communication_async(
            template_name="Event Template",
            recipient="test@example.com",
            event_id=event.id,
        )

        assert result["success"] is True
        # Verify event was passed to service
        call_args = mock_service.send_communication.call_args
        assert call_args[1]["event"] == event

    @patch("core.domains.communications.services.CommunicationService")
    def test_send_communication_handles_missing_client(self, mock_service_class):
        """Test async task handles missing client gracefully."""
        mock_record = Mock()
        mock_record.id = uuid.uuid4()
        mock_record.delivery_status = "SENT"
        mock_record.external_message_id = "msg_789"

        mock_service = Mock()
        mock_service.send_communication.return_value = mock_record
        mock_service_class.return_value = mock_service

        CommunicationTemplate.objects.create(
            name="Missing Client Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        result = send_communication_async(
            template_name="Missing Client Template",
            recipient="test@example.com",
            client_id=99999,  # Nonexistent client
        )

        assert result["success"] is True

    @patch("core.domains.communications.services.CommunicationService")
    def test_send_communication_failure_triggers_retry(self, mock_service_class):
        """Test task failure triggers retry mechanism."""
        from celery.exceptions import Retry

        mock_service = Mock()
        mock_service.send_communication.side_effect = Exception("Provider error")
        mock_service_class.return_value = mock_service

        CommunicationTemplate.objects.create(
            name="Failing Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        # In eager mode, the task's self.request.retries starts at 0 which is < 3,
        # so the task will call self.retry() which raises a Retry exception.
        with pytest.raises(Retry):
            send_communication_async(
                template_name="Failing Template",
                recipient="test@example.com",
            )


@pytest.mark.django_db
class TestSendBulkCommunicationsAsync:
    """Tests for send_bulk_communications_async task."""

    @patch("core.domains.communications.tasks.send_communication_async")
    def test_bulk_send_success(self, mock_single_task):
        """Test successful bulk communication sending."""
        mock_single_task.delay.return_value = Mock(id="task_123")

        template = CommunicationTemplate.objects.create(
            name="Bulk Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        recipients = [
            {"recipient": "user1@example.com", "context_data": {"name": "User 1"}},
            {"recipient": "user2@example.com", "context_data": {"name": "User 2"}},
            {"recipient": "user3@example.com", "context_data": {"name": "User 3"}},
        ]

        result = send_bulk_communications_async(
            template_id=template.id,
            recipients=recipients,
        )

        assert result["success"] is True
        assert result["total_recipients"] == 3
        assert result["successful_queued"] == 3
        assert result["failed_queued"] == 0

    @patch("core.domains.communications.tasks.send_communication_async")
    def test_bulk_send_with_batching(self, mock_single_task):
        """Test bulk sending uses batching."""
        mock_single_task.delay.return_value = Mock(id="task_123")

        template = CommunicationTemplate.objects.create(
            name="Batch Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        # Create 15 recipients to test batching
        recipients = [{"recipient": f"user{i}@example.com"} for i in range(15)]

        result = send_bulk_communications_async(
            template_id=template.id,
            recipients=recipients,
            batch_size=5,
        )

        assert result["success"] is True
        assert result["total_recipients"] == 15

    def test_bulk_send_template_not_found(self):
        """Test bulk send handles missing template."""
        result = send_bulk_communications_async(
            template_id=99999,
            recipients=[{"recipient": "test@example.com"}],
        )

        assert result["success"] is False
        assert "not found" in result["error"].lower()

    @patch("core.domains.communications.tasks.send_communication_async")
    def test_bulk_send_with_sender(self, mock_single_task, user_factory):
        """Test bulk send includes sender information."""
        sender = user_factory(admin=True)
        mock_single_task.delay.return_value = Mock(id="task_456")

        template = CommunicationTemplate.objects.create(
            name="Sender Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        recipients = [{"recipient": "test@example.com"}]

        result = send_bulk_communications_async(
            template_id=template.id,
            recipients=recipients,
            sent_by_id=sender.id,
        )

        assert result["success"] is True
        # Verify sender ID was passed
        call_args = mock_single_task.delay.call_args
        assert call_args[1]["sent_by_id"] == sender.id

    @patch("core.domains.communications.tasks.send_communication_async")
    def test_bulk_send_partial_failure(self, mock_single_task):
        """Test bulk send handles partial failures."""
        call_count = [0]

        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 2:
                raise Exception("Queue error")
            return Mock(id="task_123")

        mock_single_task.delay.side_effect = side_effect

        template = CommunicationTemplate.objects.create(
            name="Partial Fail Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        recipients = [
            {"recipient": "user1@example.com"},
            {"recipient": "user2@example.com"},
            {"recipient": "user3@example.com"},
        ]

        result = send_bulk_communications_async(
            template_id=template.id,
            recipients=recipients,
        )

        assert result["success"] is True
        assert result["successful_queued"] == 2
        assert result["failed_queued"] == 1


@pytest.mark.django_db
class TestProcessRetryQueueAsync:
    """Tests for process_retry_queue_async task."""

    @patch("core.domains.communications.services.CommunicationService")
    def test_process_retry_queue_success(self, mock_service_class):
        """Test successful retry queue processing."""
        mock_service = Mock()
        mock_service.process_retry_queue.return_value = {
            "processed": 5,
            "succeeded": 3,
            "failed": 1,
            "requeued": 1,
        }
        mock_service_class.return_value = mock_service

        result = process_retry_queue_async()

        assert result["success"] is True
        assert result["results"]["processed"] == 5
        assert "timestamp" in result

    @patch("core.domains.communications.services.CommunicationService")
    def test_process_retry_queue_failure(self, mock_service_class):
        """Test retry queue processing failure."""
        mock_service = Mock()
        mock_service.process_retry_queue.side_effect = Exception("Processing error")
        mock_service_class.return_value = mock_service

        result = process_retry_queue_async()

        assert result["success"] is False
        assert "error" in result


@pytest.mark.django_db
class TestCleanupOldRecordsAsync:
    """Tests for cleanup_old_records_async task."""

    def test_cleanup_old_records(self):
        """Test old record cleanup."""
        # Create old record that should be deleted
        old_record = CommunicationRecord.objects.create(
            template_name="Old Record",
            recipient="old@example.com",
            body="Old body",
            delivery_status="DELIVERED",
            is_opened=True,
        )
        # Manually set created_at to be very old
        CommunicationRecord.objects.filter(id=old_record.id).update(created_at=timezone.now() - timedelta(days=365))

        # Create recent record that should NOT be deleted
        recent_record = CommunicationRecord.objects.create(
            template_name="Recent Record",
            recipient="recent@example.com",
            body="Recent body",
            delivery_status="DELIVERED",
            is_opened=True,
        )

        result = cleanup_old_records_async(days=30)

        assert result["success"] is True
        assert result["deleted_count"] >= 1
        assert CommunicationRecord.objects.filter(id=recent_record.id).exists()

    def test_cleanup_only_delivered_and_opened(self):
        """Test cleanup only removes delivered and opened records."""
        # Create old record that is delivered but not opened
        unread_record = CommunicationRecord.objects.create(
            template_name="Unread Record",
            recipient="unread@example.com",
            body="Body",
            delivery_status="DELIVERED",
            is_opened=False,
        )
        CommunicationRecord.objects.filter(id=unread_record.id).update(created_at=timezone.now() - timedelta(days=365))

        # Create old record that is opened and delivered (should be deleted)
        read_record = CommunicationRecord.objects.create(
            template_name="Read Record",
            recipient="read@example.com",
            body="Body",
            delivery_status="DELIVERED",
            is_opened=True,
        )
        CommunicationRecord.objects.filter(id=read_record.id).update(created_at=timezone.now() - timedelta(days=365))

        result = cleanup_old_records_async(days=30)

        assert result["success"] is True
        # Unread record should still exist
        assert CommunicationRecord.objects.filter(id=unread_record.id).exists()

    @patch("core.domains.communications.config.CommunicationConfig")
    def test_cleanup_uses_config_retention(self, mock_config):
        """Test cleanup uses configured retention period."""
        mock_config.get_retention_days.return_value = 60

        result = cleanup_old_records_async()  # No days specified

        assert result["success"] is True
        assert result["cutoff_days"] == 60


@pytest.mark.django_db
class TestWarmCacheAsync:
    """Tests for warm_cache_async task."""

    @patch("core.domains.communications.cache_service.communications_cache_service")
    def test_warm_cache_success(self, mock_cache_service):
        """Test successful cache warming."""
        result = warm_cache_async()

        assert result["success"] is True
        mock_cache_service.warm_cache_for_templates.assert_called_once_with(None)

    @patch("core.domains.communications.cache_service.communications_cache_service")
    def test_warm_cache_specific_templates(self, mock_cache_service):
        """Test cache warming for specific templates."""
        template_ids = [1, 2, 3]

        result = warm_cache_async(template_ids=template_ids)

        assert result["success"] is True
        assert result["template_ids"] == template_ids
        mock_cache_service.warm_cache_for_templates.assert_called_once_with(template_ids)

    @patch("core.domains.communications.cache_service.communications_cache_service")
    def test_warm_cache_failure(self, mock_cache_service):
        """Test cache warming failure handling."""
        mock_cache_service.warm_cache_for_templates.side_effect = Exception("Cache error")

        result = warm_cache_async()

        assert result["success"] is False
        assert "error" in result


@pytest.mark.django_db
class TestHealthCheckProvidersAsync:
    """Tests for health_check_providers_async task."""

    @patch("core.domains.communications.services.CommunicationService")
    def test_health_check_all_healthy(self, mock_service_class):
        """Test health check when all providers are healthy."""
        mock_service = Mock()
        mock_service.get_provider_health.return_value = {
            "MOCK": {"healthy": True, "failures": 0},
            "BREVO": {"healthy": True, "failures": 0},
        }
        mock_service_class.return_value = mock_service

        result = health_check_providers_async()

        assert result["success"] is True
        assert "health_status" in result
        assert len(result["unhealthy_providers"]) == 0

    @patch("core.domains.communications.services.CommunicationService")
    def test_health_check_unhealthy_provider(self, mock_service_class):
        """Test health check with unhealthy provider."""
        mock_service = Mock()
        mock_service.get_provider_health.return_value = {
            "MOCK": {"healthy": False, "failures": 15},
        }
        mock_service.reset_provider.side_effect = Exception("Reset failed")
        mock_service_class.return_value = mock_service

        result = health_check_providers_async()

        assert result["success"] is True
        assert "MOCK" in result["unhealthy_providers"]

    @patch("core.domains.communications.services.CommunicationService")
    def test_health_check_auto_reset(self, mock_service_class):
        """Test health check auto-resets providers with excessive failures."""
        mock_service = Mock()
        mock_service.get_provider_health.return_value = {
            "FAILING": {"healthy": False, "failures": 15},
        }
        mock_service.reset_provider.return_value = None  # Reset succeeds
        mock_service_class.return_value = mock_service

        result = health_check_providers_async()

        assert result["success"] is True
        mock_service.reset_provider.assert_called_with("FAILING")
        # Provider should be in auto_reset list, not unhealthy
        assert "FAILING" in result["auto_reset_providers"]

    @patch("core.domains.communications.services.CommunicationService")
    def test_health_check_failure(self, mock_service_class):
        """Test health check task failure."""
        mock_service = Mock()
        mock_service.get_provider_health.side_effect = Exception("Service error")
        mock_service_class.return_value = mock_service

        result = health_check_providers_async()

        assert result["success"] is False
        assert "error" in result


@pytest.mark.django_db
class TestTaskRetryBehavior:
    """Tests for task retry behavior."""

    @patch("core.domains.communications.services.CommunicationService")
    def test_send_communication_retries_on_failure(self, mock_service_class):
        """Test send_communication_async retries on failure."""
        from celery.exceptions import Retry

        mock_service = Mock()
        mock_service.send_communication.side_effect = Exception("Temporary error")
        mock_service_class.return_value = mock_service

        CommunicationTemplate.objects.create(
            name="Retry Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        # In eager mode, self.request.retries starts at 0 which is < 3,
        # so the task will call self.retry() which raises a Retry exception.
        with pytest.raises(Retry):
            send_communication_async(
                template_name="Retry Template",
                recipient="test@example.com",
            )

    @patch("core.domains.communications.tasks.send_communication_async.delay")
    def test_bulk_send_continues_on_individual_failure(self, mock_delay):
        """Test bulk send continues processing after individual failures."""
        call_count = [0]

        def delay_side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 2:
                raise Exception("Queue error")
            return Mock(id=f"task_{call_count[0]}")

        mock_delay.side_effect = delay_side_effect

        template = CommunicationTemplate.objects.create(
            name="Continue Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Body",
        )

        recipients = [{"recipient": f"user{i}@example.com"} for i in range(5)]

        result = send_bulk_communications_async(
            template_id=template.id,
            recipients=recipients,
        )

        # Task should continue after individual failure
        assert result["success"] is True
        assert result["successful_queued"] == 4
        assert result["failed_queued"] == 1
