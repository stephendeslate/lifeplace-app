"""
Unit tests for communications domain models.

Tests:
- CommunicationTemplate model (CRUD, channel choices, category choices)
- CommunicationTemplateHistory model (version control, snapshots)
- CommunicationRecord model (status transitions, soft delete)
"""

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from freezegun import freeze_time
from datetime import timedelta
import uuid

from core.domains.communications.models import (
    CommunicationTemplate,
    CommunicationTemplateHistory,
    CommunicationRecord,
)
from core.domains.communications.context_service import ContextType


@pytest.mark.django_db
class TestCommunicationTemplate:
    """Unit tests for the CommunicationTemplate model."""

    def test_create_email_template(self, user_factory):
        """Test creating an email template with all required fields."""
        template = CommunicationTemplate.objects.create(
            name='Welcome Email',
            channel='EMAIL',
            category='SYSTEM',
            context_type=ContextType.CLIENT,
            subject_template='Welcome {{client_name}}!',
            body_template='<p>Hello {{client_first_name}}, welcome to LifePlace!</p>',
        )

        assert template.name == 'Welcome Email'
        assert template.channel == 'EMAIL'
        assert template.category == 'SYSTEM'
        assert template.context_type == ContextType.CLIENT
        assert template.subject_template == 'Welcome {{client_name}}!'
        assert 'Hello' in template.body_template

    def test_create_sms_template(self):
        """Test creating an SMS template without subject."""
        template = CommunicationTemplate.objects.create(
            name='SMS Reminder',
            channel='SMS',
            category='AUTO',
            context_type=ContextType.EVENT,
            body_template='Your event is in {{days_until_event}} days!',
        )

        assert template.channel == 'SMS'
        assert template.subject_template is None
        assert 'days_until_event' in template.body_template

    def test_template_string_representation(self):
        """Test CommunicationTemplate __str__ returns name and channel."""
        template = CommunicationTemplate.objects.create(
            name='Test Template',
            channel='EMAIL',
            body_template='Test body',
        )

        assert str(template) == 'Test Template (Email)'

    def test_template_unique_name_constraint(self):
        """Test that template names must be unique."""
        CommunicationTemplate.objects.create(
            name='Unique Template',
            channel='EMAIL',
            body_template='Body content',
        )

        with pytest.raises(Exception):  # IntegrityError
            CommunicationTemplate.objects.create(
                name='Unique Template',
                channel='SMS',
                body_template='Different body',
            )

    def test_template_channel_choices(self):
        """Test valid channel choices."""
        email_template = CommunicationTemplate.objects.create(
            name='Email Template',
            channel='EMAIL',
            body_template='Test',
        )
        sms_template = CommunicationTemplate.objects.create(
            name='SMS Template',
            channel='SMS',
            body_template='Test',
        )

        assert email_template.get_channel_display() == 'Email'
        assert sms_template.get_channel_display() == 'SMS'

    def test_template_category_choices(self):
        """Test valid category choices."""
        system = CommunicationTemplate.objects.create(
            name='System Template',
            channel='EMAIL',
            category='SYSTEM',
            body_template='Test',
        )
        manual = CommunicationTemplate.objects.create(
            name='Manual Template',
            channel='EMAIL',
            category='MANUAL',
            body_template='Test',
        )
        auto = CommunicationTemplate.objects.create(
            name='Auto Template',
            channel='EMAIL',
            category='AUTO',
            body_template='Test',
        )
        marketing = CommunicationTemplate.objects.create(
            name='Marketing Template',
            channel='EMAIL',
            category='MARKETING',
            body_template='Test',
        )

        assert system.get_category_display() == 'System'
        assert manual.get_category_display() == 'Manual'
        assert auto.get_category_display() == 'Auto'
        assert marketing.get_category_display() == 'Marketing'

    def test_template_context_type_choices(self):
        """Test valid context type choices."""
        template = CommunicationTemplate.objects.create(
            name='Client Context Template',
            channel='EMAIL',
            context_type=ContextType.CLIENT,
            body_template='Hello {{client_name}}',
        )

        assert template.context_type == ContextType.CLIENT
        assert template.get_context_type_display() == 'Client'

    def test_template_include_client_context_flag(self):
        """Test include_client_context flag for MANUAL templates."""
        template = CommunicationTemplate.objects.create(
            name='Manual With Client',
            channel='EMAIL',
            category='MANUAL',
            context_type=ContextType.MANUAL,
            include_client_context=True,
            include_event_context=False,
            body_template='Custom message for {{client_name}}',
        )

        assert template.include_client_context is True
        assert template.include_event_context is False

    def test_template_is_system_flag(self):
        """Test is_system flag for protected templates."""
        system_template = CommunicationTemplate.objects.create(
            name='Protected System Template',
            channel='EMAIL',
            category='SYSTEM',
            is_system=True,
            body_template='System-generated content',
        )

        assert system_template.is_system is True

    def test_template_default_values(self):
        """Test default values for optional fields."""
        template = CommunicationTemplate.objects.create(
            name='Minimal Template',
            body_template='Just the body',
        )

        assert template.channel == 'EMAIL'  # Default
        assert template.category == 'MANUAL'  # Default
        assert template.context_type == ContextType.MANUAL  # Default
        assert template.include_client_context is False
        assert template.include_event_context is False
        assert template.is_system is False


@pytest.mark.django_db
class TestCommunicationTemplateHistory:
    """Unit tests for the CommunicationTemplateHistory model."""

    def test_create_snapshot(self, user_factory):
        """Test creating a history snapshot of a template."""
        admin = user_factory(admin=True)
        template = CommunicationTemplate.objects.create(
            name='Original Template',
            channel='EMAIL',
            category='MANUAL',
            subject_template='Original Subject',
            body_template='Original body content',
        )

        snapshot = CommunicationTemplateHistory.create_snapshot(
            template=template,
            reason='CREATE',
            changed_by=admin,
            notes='Initial template creation',
        )

        assert snapshot.template == template
        assert snapshot.version == 1
        assert snapshot.name == 'Original Template'
        assert snapshot.channel == 'EMAIL'
        assert snapshot.category == 'MANUAL'
        assert snapshot.subject_template == 'Original Subject'
        assert snapshot.body_template == 'Original body content'
        assert snapshot.reason == 'CREATE'
        assert snapshot.changed_by == admin
        assert snapshot.notes == 'Initial template creation'

    def test_version_increment(self, user_factory):
        """Test version increments with each snapshot."""
        admin = user_factory(admin=True)
        template = CommunicationTemplate.objects.create(
            name='Versioned Template',
            body_template='Version 1',
        )

        snapshot1 = CommunicationTemplateHistory.create_snapshot(
            template=template,
            reason='CREATE',
            changed_by=admin,
        )
        assert snapshot1.version == 1

        # Update template and create another snapshot
        template.body_template = 'Version 2'
        template.save()

        snapshot2 = CommunicationTemplateHistory.create_snapshot(
            template=template,
            reason='UPDATE',
            changed_by=admin,
        )
        assert snapshot2.version == 2

        # Third snapshot
        template.body_template = 'Version 3'
        template.save()

        snapshot3 = CommunicationTemplateHistory.create_snapshot(
            template=template,
            reason='UPDATE',
            changed_by=admin,
        )
        assert snapshot3.version == 3

    def test_snapshot_string_representation(self, user_factory):
        """Test CommunicationTemplateHistory __str__."""
        admin = user_factory(admin=True)
        template = CommunicationTemplate.objects.create(
            name='Test Template',
            body_template='Body',
        )

        snapshot = CommunicationTemplateHistory.create_snapshot(
            template=template,
            reason='UPDATE',
            changed_by=admin,
        )

        assert str(snapshot) == 'Test Template v1 (UPDATE)'

    def test_reason_choices(self, user_factory):
        """Test valid reason choices for history entries."""
        admin = user_factory(admin=True)
        template = CommunicationTemplate.objects.create(
            name='Reason Test Template',
            body_template='Body',
        )

        create_snapshot = CommunicationTemplateHistory.create_snapshot(
            template=template, reason='CREATE', changed_by=admin
        )
        update_snapshot = CommunicationTemplateHistory.create_snapshot(
            template=template, reason='UPDATE', changed_by=admin
        )
        rollback_snapshot = CommunicationTemplateHistory.create_snapshot(
            template=template, reason='ROLLBACK', changed_by=admin
        )
        system_snapshot = CommunicationTemplateHistory.create_snapshot(
            template=template, reason='SYSTEM', changed_by=admin
        )

        assert create_snapshot.reason == 'CREATE'
        assert update_snapshot.reason == 'UPDATE'
        assert rollback_snapshot.reason == 'ROLLBACK'
        assert system_snapshot.reason == 'SYSTEM'

    def test_unique_template_version_constraint(self, user_factory):
        """Test unique constraint on (template, version)."""
        admin = user_factory(admin=True)
        template = CommunicationTemplate.objects.create(
            name='Unique Version Template',
            body_template='Body',
        )

        CommunicationTemplateHistory.create_snapshot(
            template=template, reason='CREATE', changed_by=admin
        )

        # Manually try to create duplicate version (bypassing create_snapshot)
        with pytest.raises(Exception):  # IntegrityError
            CommunicationTemplateHistory.objects.create(
                template=template,
                version=1,  # Duplicate!
                name=template.name,
                channel=template.channel,
                category=template.category,
                body_template=template.body_template,
                reason='UPDATE',
            )

    def test_history_ordering(self, user_factory):
        """Test history entries are ordered by created_at descending."""
        admin = user_factory(admin=True)
        template = CommunicationTemplate.objects.create(
            name='Ordered Template',
            body_template='Body',
        )

        snapshot1 = CommunicationTemplateHistory.create_snapshot(
            template=template, reason='CREATE', changed_by=admin
        )
        snapshot2 = CommunicationTemplateHistory.create_snapshot(
            template=template, reason='UPDATE', changed_by=admin
        )

        history = CommunicationTemplateHistory.objects.filter(template=template)

        # Most recent first due to ordering = ['-created_at']
        assert list(history) == [snapshot2, snapshot1]


@pytest.mark.django_db
class TestCommunicationRecord:
    """Unit tests for the CommunicationRecord model."""

    def test_create_email_record(self, user_factory):
        """Test creating an email communication record."""
        client = user_factory()
        sender = user_factory(admin=True)

        record = CommunicationRecord.objects.create(
            template_name='Welcome Email',
            channel='EMAIL',
            category='SYSTEM',
            recipient='client@example.com',
            subject='Welcome to LifePlace!',
            body='<p>Welcome!</p>',
            client=client,
            sent_by=sender,
        )

        assert record.id is not None
        assert isinstance(record.id, uuid.UUID)
        assert record.template_name == 'Welcome Email'
        assert record.channel == 'EMAIL'
        assert record.category == 'SYSTEM'
        assert record.recipient == 'client@example.com'
        assert record.subject == 'Welcome to LifePlace!'
        assert record.client == client
        assert record.sent_by == sender
        assert record.delivery_status == 'PENDING'

    def test_record_string_representation(self, user_factory):
        """Test CommunicationRecord __str__."""
        record = CommunicationRecord.objects.create(
            template_name='Test Template',
            recipient='test@example.com',
            body='Test body',
            delivery_status='SENT',
        )

        assert str(record) == 'Test Template to test@example.com - SENT'

    def test_valid_status_transitions(self):
        """Test valid delivery status transitions."""
        record = CommunicationRecord.objects.create(
            template_name='Status Test',
            recipient='test@example.com',
            body='Test',
            delivery_status='PENDING',
        )

        # PENDING -> SENT
        assert record.transition_status('SENT') is True
        assert record.delivery_status == 'SENT'

        # SENT -> DELIVERED
        assert record.transition_status('DELIVERED') is True
        assert record.delivery_status == 'DELIVERED'

    def test_invalid_status_transitions(self):
        """Test invalid delivery status transitions raise ValidationError."""
        record = CommunicationRecord.objects.create(
            template_name='Invalid Transition Test',
            recipient='test@example.com',
            body='Test',
            delivery_status='PENDING',
        )

        # PENDING -> DELIVERED (invalid, must go through SENT)
        with pytest.raises(ValidationError, match='Cannot transition'):
            record.transition_status('DELIVERED')

    def test_transition_to_same_status_is_no_op(self):
        """Test transitioning to the same status is allowed (no-op)."""
        record = CommunicationRecord.objects.create(
            template_name='Same Status Test',
            recipient='test@example.com',
            body='Test',
            delivery_status='SENT',
        )

        assert record.transition_status('SENT') is True
        assert record.delivery_status == 'SENT'

    def test_force_status_transition(self):
        """Test force flag bypasses validation."""
        record = CommunicationRecord.objects.create(
            template_name='Force Transition Test',
            recipient='test@example.com',
            body='Test',
            delivery_status='PENDING',
        )

        # Force invalid transition
        assert record.transition_status('DELIVERED', force=True) is True
        assert record.delivery_status == 'DELIVERED'

    def test_failed_to_pending_retry_transition(self):
        """Test FAILED -> PENDING for retry is valid."""
        record = CommunicationRecord.objects.create(
            template_name='Retry Test',
            recipient='test@example.com',
            body='Test',
            delivery_status='FAILED',
        )

        assert record.transition_status('PENDING') is True
        assert record.delivery_status == 'PENDING'

    def test_delivered_is_terminal_state(self):
        """Test DELIVERED is a terminal state."""
        record = CommunicationRecord.objects.create(
            template_name='Terminal Test',
            recipient='test@example.com',
            body='Test',
            delivery_status='DELIVERED',
        )

        with pytest.raises(ValidationError, match='Cannot transition'):
            record.transition_status('SENT')

    def test_bounced_is_terminal_state(self):
        """Test BOUNCED is a terminal state."""
        record = CommunicationRecord.objects.create(
            template_name='Bounce Test',
            recipient='test@example.com',
            body='Test',
            delivery_status='BOUNCED',
        )

        with pytest.raises(ValidationError, match='Cannot transition'):
            record.transition_status('PENDING')

    def test_soft_delete(self, user_factory):
        """Test soft delete sets flags and doesn't actually delete."""
        admin = user_factory(admin=True)
        record = CommunicationRecord.objects.create(
            template_name='Soft Delete Test',
            recipient='test@example.com',
            body='Test',
        )

        record_id = record.id
        record.soft_delete(deleted_by=admin)

        # Record should still exist
        refreshed = CommunicationRecord.objects.get(id=record_id)
        assert refreshed.is_deleted is True
        assert refreshed.deleted_by == admin
        assert refreshed.deleted_at is not None

    def test_restore_soft_deleted_record(self, user_factory):
        """Test restoring a soft-deleted record."""
        admin = user_factory(admin=True)
        record = CommunicationRecord.objects.create(
            template_name='Restore Test',
            recipient='test@example.com',
            body='Test',
        )

        record.soft_delete(deleted_by=admin)
        record.restore()

        assert record.is_deleted is False
        assert record.deleted_at is None
        assert record.deleted_by is None

    def test_record_timestamps(self):
        """Test opened_at, sent_at, delivered_at timestamps."""
        record = CommunicationRecord.objects.create(
            template_name='Timestamp Test',
            recipient='test@example.com',
            body='Test',
        )

        now = timezone.now()

        record.sent_at = now
        record.delivered_at = now + timedelta(seconds=5)
        record.opened_at = now + timedelta(minutes=10)
        record.is_opened = True
        record.save()

        refreshed = CommunicationRecord.objects.get(id=record.id)
        assert refreshed.sent_at is not None
        assert refreshed.delivered_at is not None
        assert refreshed.opened_at is not None
        assert refreshed.is_opened is True

    def test_context_data_json_field(self):
        """Test context_data JSONField stores arbitrary data."""
        record = CommunicationRecord.objects.create(
            template_name='Context Data Test',
            recipient='test@example.com',
            body='Test',
            context_data={
                'client_name': 'John Doe',
                'event_date': '2024-12-25',
                'custom_field': {'nested': 'value'},
            },
        )

        refreshed = CommunicationRecord.objects.get(id=record.id)
        assert refreshed.context_data['client_name'] == 'John Doe'
        assert refreshed.context_data['custom_field']['nested'] == 'value'

    def test_record_ordering(self):
        """Test records are ordered by created_at descending."""
        record1 = CommunicationRecord.objects.create(
            template_name='First',
            recipient='first@example.com',
            body='First',
        )
        record2 = CommunicationRecord.objects.create(
            template_name='Second',
            recipient='second@example.com',
            body='Second',
        )

        records = list(CommunicationRecord.objects.all())

        # Most recent first due to ordering = ['-created_at']
        assert records[0].template_name == 'Second'
        assert records[1].template_name == 'First'

    def test_external_message_id_storage(self):
        """Test external_message_id field for provider tracking."""
        record = CommunicationRecord.objects.create(
            template_name='External ID Test',
            recipient='test@example.com',
            body='Test',
            external_message_id='brevo_msg_12345abcdef',
        )

        assert record.external_message_id == 'brevo_msg_12345abcdef'

    def test_record_with_event_relationship(self, event_factory):
        """Test communication record linked to an event."""
        event = event_factory()

        record = CommunicationRecord.objects.create(
            template_name='Event Communication',
            recipient='test@example.com',
            body='Your event is confirmed!',
            client=event.client,
            event=event,
        )

        assert record.event == event
        assert event.communication_records.count() == 1
