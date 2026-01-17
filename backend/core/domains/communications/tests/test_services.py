"""
Unit tests for communications domain services.

Tests:
- CommunicationTemplateService (template CRUD operations)
- CommunicationService (sending communications with resilience)
- AnalyticsService (statistics and metrics)
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from decimal import Decimal
from django.utils import timezone
from django.core.exceptions import ValidationError
from freezegun import freeze_time
from datetime import timedelta

from core.domains.communications.models import (
    CommunicationTemplate,
    CommunicationRecord,
)
from core.domains.communications.services import (
    CommunicationTemplateService,
    CommunicationService,
    AnalyticsService,
)
from core.domains.communications.exceptions import (
    TemplateNotFound,
    TemplateNameExists,
    InvalidTemplateFormat,
    CommunicationProviderError,
)
from core.domains.communications.context_service import ContextType


@pytest.mark.django_db
class TestCommunicationTemplateService:
    """Unit tests for CommunicationTemplateService."""

    def test_get_all_templates_returns_ordered_by_updated_at(self):
        """Test get_all_templates returns templates ordered by updated_at descending."""
        template1 = CommunicationTemplate.objects.create(
            name='Template 1',
            body_template='Body 1',
        )
        template2 = CommunicationTemplate.objects.create(
            name='Template 2',
            body_template='Body 2',
        )

        templates = CommunicationTemplateService.get_all_templates()
        template_names = [t.name for t in templates]

        # Most recently updated first
        assert template_names[0] == 'Template 2'
        assert template_names[1] == 'Template 1'

    def test_get_all_templates_filter_by_category(self):
        """Test get_all_templates filters by category."""
        CommunicationTemplate.objects.create(
            name='System Template',
            category='SYSTEM',
            body_template='Body',
        )
        CommunicationTemplate.objects.create(
            name='Manual Template',
            category='MANUAL',
            body_template='Body',
        )

        templates = CommunicationTemplateService.get_all_templates(category='SYSTEM')

        assert templates.count() == 1
        assert templates.first().category == 'SYSTEM'

    def test_get_all_templates_filter_by_channel(self):
        """Test get_all_templates filters by channel."""
        CommunicationTemplate.objects.create(
            name='Email Template',
            channel='EMAIL',
            body_template='Body',
        )
        CommunicationTemplate.objects.create(
            name='SMS Template',
            channel='SMS',
            body_template='Body',
        )

        templates = CommunicationTemplateService.get_all_templates(channel='SMS')

        assert templates.count() == 1
        assert templates.first().channel == 'SMS'

    def test_get_all_templates_filter_by_both(self):
        """Test get_all_templates filters by both category and channel."""
        CommunicationTemplate.objects.create(
            name='System Email',
            category='SYSTEM',
            channel='EMAIL',
            body_template='Body',
        )
        CommunicationTemplate.objects.create(
            name='System SMS',
            category='SYSTEM',
            channel='SMS',
            body_template='Body',
        )
        CommunicationTemplate.objects.create(
            name='Manual Email',
            category='MANUAL',
            channel='EMAIL',
            body_template='Body',
        )

        templates = CommunicationTemplateService.get_all_templates(
            category='SYSTEM', channel='EMAIL'
        )

        assert templates.count() == 1
        assert templates.first().name == 'System Email'

    def test_get_template_by_id_returns_template(self):
        """Test get_template_by_id returns correct template."""
        template = CommunicationTemplate.objects.create(
            name='Test Template',
            body_template='Body',
        )

        result = CommunicationTemplateService.get_template_by_id(template.id)

        assert result.id == template.id
        assert result.name == 'Test Template'

    def test_get_template_by_id_raises_not_found(self):
        """Test get_template_by_id raises TemplateNotFound for invalid ID."""
        with pytest.raises(TemplateNotFound):
            CommunicationTemplateService.get_template_by_id(99999)

    def test_get_template_by_name_returns_template(self):
        """Test get_template_by_name returns correct template."""
        CommunicationTemplate.objects.create(
            name='Named Template',
            body_template='Body',
        )

        result = CommunicationTemplateService.get_template_by_name('Named Template')

        assert result.name == 'Named Template'

    def test_get_template_by_name_raises_not_found(self):
        """Test get_template_by_name raises TemplateNotFound for invalid name."""
        with pytest.raises(TemplateNotFound):
            CommunicationTemplateService.get_template_by_name('Nonexistent Template')

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_create_template_success(self, mock_validate):
        """Test create_template creates template successfully."""
        mock_validate.return_value = (True, [])

        template_data = {
            'name': 'New Template',
            'channel': 'EMAIL',
            'category': 'MANUAL',
            'subject_template': 'Hello {{name}}',
            'body_template': '<p>Hello {{name}}!</p>',
        }

        template = CommunicationTemplateService.create_template(template_data)

        assert template.id is not None
        assert template.name == 'New Template'
        assert template.channel == 'EMAIL'

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_create_template_duplicate_name_raises_error(self, mock_validate):
        """Test create_template raises TemplateNameExists for duplicate name."""
        mock_validate.return_value = (True, [])
        CommunicationTemplate.objects.create(
            name='Existing Template',
            body_template='Body',
        )

        template_data = {
            'name': 'Existing Template',
            'body_template': 'New body',
        }

        with pytest.raises(TemplateNameExists):
            CommunicationTemplateService.create_template(template_data)

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_create_template_case_insensitive_duplicate_check(self, mock_validate):
        """Test create_template checks name case-insensitively."""
        mock_validate.return_value = (True, [])
        CommunicationTemplate.objects.create(
            name='My Template',
            body_template='Body',
        )

        template_data = {
            'name': 'MY TEMPLATE',  # Different case
            'body_template': 'New body',
        }

        with pytest.raises(TemplateNameExists):
            CommunicationTemplateService.create_template(template_data)

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_create_template_validates_syntax(self, mock_validate):
        """Test create_template validates template syntax."""
        mock_validate.return_value = (False, ['Invalid syntax error'])

        template_data = {
            'name': 'Invalid Template',
            'body_template': '{% invalid %}',
        }

        with pytest.raises(InvalidTemplateFormat):
            CommunicationTemplateService.create_template(template_data)

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_update_template_success(self, mock_validate):
        """Test update_template updates template successfully."""
        mock_validate.return_value = (True, [])
        template = CommunicationTemplate.objects.create(
            name='Original Name',
            body_template='Original body',
        )

        update_data = {
            'body_template': 'Updated body',
        }

        updated = CommunicationTemplateService.update_template(template.id, update_data)

        assert updated.body_template == 'Updated body'
        assert updated.name == 'Original Name'

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_update_template_name_conflict_raises_error(self, mock_validate):
        """Test update_template raises error when changing to existing name."""
        mock_validate.return_value = (True, [])
        CommunicationTemplate.objects.create(
            name='Existing Name',
            body_template='Body',
        )
        template = CommunicationTemplate.objects.create(
            name='Other Name',
            body_template='Body',
        )

        update_data = {
            'name': 'Existing Name',
        }

        with pytest.raises(TemplateNameExists):
            CommunicationTemplateService.update_template(template.id, update_data)

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_update_template_same_name_allowed(self, mock_validate):
        """Test update_template allows keeping the same name."""
        mock_validate.return_value = (True, [])
        template = CommunicationTemplate.objects.create(
            name='My Template',
            body_template='Body',
        )

        update_data = {
            'name': 'My Template',  # Same name
            'body_template': 'Updated body',
        }

        updated = CommunicationTemplateService.update_template(template.id, update_data)

        assert updated.name == 'My Template'
        assert updated.body_template == 'Updated body'

    def test_delete_template_success(self):
        """Test delete_template deletes non-system template."""
        template = CommunicationTemplate.objects.create(
            name='Deletable Template',
            body_template='Body',
            is_system=False,
        )

        result = CommunicationTemplateService.delete_template(template.id)

        assert result is True
        assert not CommunicationTemplate.objects.filter(id=template.id).exists()

    def test_delete_template_system_raises_error(self):
        """Test delete_template raises error for system templates."""
        template = CommunicationTemplate.objects.create(
            name='System Template',
            body_template='Body',
            is_system=True,
        )

        with pytest.raises(InvalidTemplateFormat):
            CommunicationTemplateService.delete_template(template.id)

    def test_delete_template_not_found_raises_error(self):
        """Test delete_template raises error for nonexistent template."""
        with pytest.raises(TemplateNotFound):
            CommunicationTemplateService.delete_template(99999)

    @patch('core.domains.communications.services.sandboxed_template_engine')
    def test_preview_template_renders_correctly(self, mock_engine):
        """Test preview_template renders template with context."""
        mock_engine.render.return_value = 'Rendered content'
        template = CommunicationTemplate.objects.create(
            name='Preview Template',
            subject_template='Hello {{name}}',
            body_template='<p>Hello {{name}}!</p>',
        )

        result = CommunicationTemplateService.preview_template(
            template.id, {'name': 'John'}
        )

        assert 'subject' in result
        assert 'body' in result

    @patch('core.domains.communications.services.sandboxed_template_engine')
    def test_preview_template_with_custom_body_for_manual(self, mock_engine):
        """Test preview_template handles custom body for manual templates."""
        mock_engine.render.return_value = 'Rendered with custom content'
        template = CommunicationTemplate.objects.create(
            name='Manual Template',
            category='MANUAL',
            subject_template='Subject',
            body_template='<div>{{content}}</div>',
        )

        result = CommunicationTemplateService.preview_template(
            template.id,
            {'custom_subject': 'Custom Subject', 'custom_body': 'Custom body content'}
        )

        assert 'subject' in result
        assert 'body' in result


@pytest.mark.django_db
class TestCommunicationService:
    """Unit tests for CommunicationService."""

    @patch('core.domains.communications.services.provider_manager')
    @patch('core.domains.communications.services.communication_metrics')
    def test_send_communication_success(self, mock_metrics, mock_provider_manager):
        """Test send_communication sends successfully."""
        mock_provider_manager.send_with_fallback.return_value = ('msg_123', 'MOCK')

        template = CommunicationTemplate.objects.create(
            name='Test Template',
            channel='EMAIL',
            subject_template='Subject',
            body_template='<p>Body</p>',
        )

        service = CommunicationService()
        record = service.send_communication(
            template_name='Test Template',
            recipient='test@example.com',
        )

        assert record is not None
        assert record.template_name == 'Test Template'
        assert record.recipient == 'test@example.com'
        assert record.delivery_status == 'SENT'
        assert record.external_message_id == 'msg_123'

    @patch('core.domains.communications.services.provider_manager')
    def test_send_communication_template_not_found(self, mock_provider_manager):
        """Test send_communication returns None when template not found."""
        service = CommunicationService()
        result = service.send_communication(
            template_name='Nonexistent Template',
            recipient='test@example.com',
        )

        assert result is None

    @patch('core.domains.communications.services.provider_manager')
    @patch('core.domains.communications.services.communication_metrics')
    @patch('core.domains.communications.services.delivery_queue')
    def test_send_communication_failure_records_error(
        self, mock_queue, mock_metrics, mock_provider_manager
    ):
        """Test send_communication records failure and adds to retry queue."""
        mock_provider_manager.send_with_fallback.side_effect = Exception('Provider error')

        template = CommunicationTemplate.objects.create(
            name='Failing Template',
            channel='EMAIL',
            subject_template='Subject',
            body_template='<p>Body</p>',
        )

        service = CommunicationService()
        record = service.send_communication(
            template_name='Failing Template',
            recipient='test@example.com',
        )

        assert record is not None
        assert record.delivery_status == 'FAILED'
        assert 'error' in record.context_data
        mock_queue.add_failed_delivery.assert_called_once()

    @patch('core.domains.communications.services.provider_manager')
    def test_send_communication_by_template_with_client(self, mock_provider_manager, user_factory):
        """Test send_communication_by_template includes client info."""
        mock_provider_manager.send_with_fallback.return_value = ('msg_123', 'MOCK')

        client = user_factory(email='client@example.com')
        sender = user_factory(admin=True)

        template = CommunicationTemplate.objects.create(
            name='Client Template',
            channel='EMAIL',
            subject_template='Hello {{client_name}}',
            body_template='<p>Hello!</p>',
        )

        service = CommunicationService()
        record = service.send_communication_by_template(
            template=template,
            recipient='client@example.com',
            client=client,
            sent_by=sender,
        )

        assert record.client == client
        assert record.sent_by == sender

    @patch('core.domains.communications.services.provider_manager')
    @patch('core.domains.notifications.models.NotificationPreference')
    def test_send_communication_respects_user_preferences(
        self, mock_pref_model, mock_provider_manager, user_factory, mocker
    ):
        """Test send_communication respects user notification preferences."""
        # Mock the NotificationPreference to block the communication
        mock_preferences = Mock()
        mock_preferences.email_enabled = False  # User disabled email

        mocker.patch(
            'core.domains.communications.services.NotificationPreference.objects.get',
            return_value=mock_preferences
        )

        client = user_factory()
        template = CommunicationTemplate.objects.create(
            name='Blocked Template',
            channel='EMAIL',
            category='MANUAL',
            subject_template='Subject',
            body_template='Body',
        )

        service = CommunicationService()
        result = service.send_communication_by_template(
            template=template,
            recipient='test@example.com',
            client=client,
        )

        # Should return None when blocked by preference
        assert result is None
        mock_provider_manager.send_with_fallback.assert_not_called()

    @patch('core.domains.communications.services.provider_manager')
    def test_send_communication_skip_preference_check(self, mock_provider_manager, user_factory, mocker):
        """Test skip_preference_check bypasses user preferences."""
        mock_provider_manager.send_with_fallback.return_value = ('msg_123', 'MOCK')

        # Mock preferences to block
        mock_preferences = Mock()
        mock_preferences.email_enabled = False
        mocker.patch(
            'core.domains.communications.services.NotificationPreference.objects.get',
            return_value=mock_preferences
        )

        client = user_factory()
        template = CommunicationTemplate.objects.create(
            name='Critical Template',
            channel='EMAIL',
            subject_template='Subject',
            body_template='Body',
        )

        service = CommunicationService()
        result = service.send_communication_by_template(
            template=template,
            recipient='test@example.com',
            client=client,
            skip_preference_check=True,
        )

        assert result is not None
        mock_provider_manager.send_with_fallback.assert_called_once()

    @patch('core.domains.communications.services.provider_manager')
    def test_send_bulk_communications(self, mock_provider_manager, user_factory):
        """Test send_bulk_communications sends to multiple recipients."""
        mock_provider_manager.send_with_fallback.return_value = ('msg_123', 'MOCK')

        template = CommunicationTemplate.objects.create(
            name='Bulk Template',
            channel='EMAIL',
            subject_template='Subject',
            body_template='Body',
        )

        recipients = [
            {'recipient': 'user1@example.com', 'context_data': {'name': 'User 1'}},
            {'recipient': 'user2@example.com', 'context_data': {'name': 'User 2'}},
            {'recipient': 'user3@example.com', 'context_data': {'name': 'User 3'}},
        ]

        service = CommunicationService()
        records = service.send_bulk_communications(
            template=template,
            recipients=recipients,
            use_async=False,
        )

        assert len(records) == 3
        assert mock_provider_manager.send_with_fallback.call_count == 3

    @patch('core.domains.communications.services.provider_manager')
    def test_get_communication_records_filters_correctly(self, mock_provider_manager):
        """Test get_communication_records applies filters."""
        CommunicationRecord.objects.create(
            template_name='Template A',
            recipient='a@example.com',
            body='Body A',
            delivery_status='SENT',
        )
        CommunicationRecord.objects.create(
            template_name='Template B',
            recipient='b@example.com',
            body='Body B',
            delivery_status='FAILED',
        )

        service = CommunicationService()
        records = service.get_communication_records(status='SENT')

        assert len(records) == 1
        assert records[0].delivery_status == 'SENT'

    @patch('core.domains.communications.services.provider_manager')
    def test_get_communication_records_limits_results(self, mock_provider_manager):
        """Test get_communication_records respects limit."""
        for i in range(10):
            CommunicationRecord.objects.create(
                template_name=f'Template {i}',
                recipient=f'user{i}@example.com',
                body='Body',
            )

        service = CommunicationService()
        records = service.get_communication_records(limit=5)

        assert len(records) == 5

    @patch('core.domains.communications.services.provider_manager')
    def test_get_provider_health_returns_status(self, mock_provider_manager):
        """Test get_provider_health returns provider status."""
        mock_provider_manager.get_provider_health.return_value = {
            'MOCK': {'state': 'closed', 'failures': 0, 'healthy': True}
        }

        service = CommunicationService()
        health = service.get_provider_health()

        assert 'MOCK' in health
        assert health['MOCK']['healthy'] is True

    @patch('core.domains.communications.services.provider_manager')
    def test_update_delivery_status_success(self, mock_provider_manager):
        """Test update_delivery_status updates record correctly."""
        record = CommunicationRecord.objects.create(
            template_name='Status Test',
            recipient='test@example.com',
            body='Body',
            external_message_id='ext_msg_123',
            delivery_status='SENT',
        )

        service = CommunicationService()
        updated = service.update_delivery_status(
            external_message_id='ext_msg_123',
            status='DELIVERED',
        )

        assert updated is not None
        assert updated.delivery_status == 'DELIVERED'
        assert updated.delivered_at is not None

    @patch('core.domains.communications.services.provider_manager')
    def test_update_delivery_status_with_opened(self, mock_provider_manager):
        """Test update_delivery_status handles opened status."""
        record = CommunicationRecord.objects.create(
            template_name='Opened Test',
            recipient='test@example.com',
            body='Body',
            external_message_id='ext_msg_456',
            delivery_status='DELIVERED',
        )

        service = CommunicationService()
        opened_at = timezone.now()
        updated = service.update_delivery_status(
            external_message_id='ext_msg_456',
            status='DELIVERED',
            opened_at=opened_at,
        )

        assert updated.is_opened is True
        assert updated.opened_at is not None

    @patch('core.domains.communications.services.provider_manager')
    def test_update_delivery_status_not_found(self, mock_provider_manager):
        """Test update_delivery_status returns None for unknown message."""
        service = CommunicationService()
        result = service.update_delivery_status(
            external_message_id='nonexistent_msg',
            status='DELIVERED',
        )

        assert result is None


@pytest.mark.django_db
class TestAnalyticsService:
    """Unit tests for AnalyticsService."""

    def test_get_template_stats_returns_aggregated_data(self):
        """Test get_template_stats returns correct aggregations."""
        CommunicationRecord.objects.create(
            template_name='Stats Template',
            recipient='test@example.com',
            body='Body',
            delivery_status='DELIVERED',
            is_opened=True,
        )
        CommunicationRecord.objects.create(
            template_name='Stats Template',
            recipient='test2@example.com',
            body='Body',
            delivery_status='DELIVERED',
            is_opened=False,
        )
        CommunicationRecord.objects.create(
            template_name='Stats Template',
            recipient='test3@example.com',
            body='Body',
            delivery_status='FAILED',
        )

        stats = AnalyticsService.get_template_stats(template_name='Stats Template')

        assert stats['total_sent'] == 3
        assert stats['delivered'] == 2
        assert stats['opened'] == 1
        assert stats['failed'] == 1
        assert 'delivery_rate' in stats
        assert 'open_rate' in stats
        assert 'failure_rate' in stats

    def test_get_template_stats_filters_by_date_range(self):
        """Test get_template_stats filters by date range."""
        # Create old record
        old_record = CommunicationRecord.objects.create(
            template_name='Date Test',
            recipient='old@example.com',
            body='Body',
            delivery_status='DELIVERED',
        )
        # Manually set created_at to be older
        CommunicationRecord.objects.filter(id=old_record.id).update(
            created_at=timezone.now() - timedelta(days=60)
        )

        # Create recent record
        CommunicationRecord.objects.create(
            template_name='Date Test',
            recipient='new@example.com',
            body='Body',
            delivery_status='DELIVERED',
        )

        stats = AnalyticsService.get_template_stats(template_name='Date Test', days=30)

        assert stats['total_sent'] == 1  # Only the recent one

    def test_get_template_stats_no_template_filter(self):
        """Test get_template_stats without template filter returns all."""
        CommunicationRecord.objects.create(
            template_name='Template A',
            recipient='a@example.com',
            body='Body A',
            delivery_status='DELIVERED',
        )
        CommunicationRecord.objects.create(
            template_name='Template B',
            recipient='b@example.com',
            body='Body B',
            delivery_status='SENT',
        )

        stats = AnalyticsService.get_template_stats()

        assert stats['total_sent'] == 2

    def test_get_template_stats_handles_zero_records(self):
        """Test get_template_stats handles zero records gracefully."""
        stats = AnalyticsService.get_template_stats(template_name='Nonexistent')

        assert stats['total_sent'] == 0
        assert stats['delivery_rate'] == 0
        assert stats['open_rate'] == 0
        assert stats['failure_rate'] == 0
