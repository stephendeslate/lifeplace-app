"""
Unit tests for communications domain serializers.

Tests:
- CommunicationTemplateSerializer (CRUD, validation)
- CommunicationRecordSerializer (read-only serialization)
- SendCommunicationSerializer (manual message validation)
- PreviewCommunicationSerializer (preview validation)
- BulkSendSerializer (bulk validation, no manual templates)
"""


import pytest

from core.domains.communications.context_service import ContextType
from core.domains.communications.models import CommunicationRecord, CommunicationTemplate
from core.domains.communications.serializers import (
    BulkSendSerializer,
    CommunicationRecordSerializer,
    CommunicationTemplateSerializer,
    PreviewCommunicationSerializer,
    SendCommunicationSerializer,
)


@pytest.mark.django_db
class TestCommunicationTemplateSerializer:
    """Unit tests for CommunicationTemplateSerializer."""

    def test_serialize_template(self):
        """Test serializing a template includes all expected fields."""
        template = CommunicationTemplate.objects.create(
            name="Test Template",
            channel="EMAIL",
            category="SYSTEM",
            context_type=ContextType.CLIENT,
            subject_template="Welcome {{client_name}}",
            body_template="<p>Hello!</p>",
            is_system=True,
        )

        serializer = CommunicationTemplateSerializer(template)
        data = serializer.data

        assert data["id"] == template.id
        assert data["name"] == "Test Template"
        assert data["channel"] == "EMAIL"
        assert data["category"] == "SYSTEM"
        assert data["context_type"] == ContextType.CLIENT
        assert data["context_type_display"] == "Client"
        assert data["subject_template"] == "Welcome {{client_name}}"
        assert data["body_template"] == "<p>Hello!</p>"
        assert data["is_system"] is True
        assert "created_at" in data
        assert "updated_at" in data

    def test_deserialize_valid_email_template(self):
        """Test deserializing and creating a valid email template."""
        data = {
            "name": "New Email Template",
            "channel": "EMAIL",
            "category": "MANUAL",
            "context_type": ContextType.MANUAL,
            "subject_template": "Hello {{name}}",
            "body_template": "<p>Dear {{name}},</p>",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated["name"] == "New Email Template"
        assert validated["channel"] == "EMAIL"

    def test_email_template_requires_subject(self):
        """Test email templates must have a subject."""
        data = {
            "name": "No Subject Email",
            "channel": "EMAIL",
            "category": "MANUAL",
            "body_template": "<p>Body only</p>",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert not serializer.is_valid()
        assert "non_field_errors" in serializer.errors

    def test_sms_template_subject_is_cleared(self):
        """Test SMS templates have subject cleared automatically."""
        data = {
            "name": "SMS With Subject",
            "channel": "SMS",
            "category": "AUTO",
            "subject_template": "This should be removed",
            "body_template": "SMS content here",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated["subject_template"] is None

    def test_unique_name_validation_on_create(self):
        """Test name uniqueness is enforced on creation."""
        CommunicationTemplate.objects.create(
            name="Existing Template",
            body_template="Body",
        )

        data = {
            "name": "Existing Template",
            "channel": "EMAIL",
            "subject_template": "Subject",
            "body_template": "Different body",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert not serializer.is_valid()
        assert "name" in serializer.errors

    def test_unique_name_validation_case_insensitive(self):
        """Test name uniqueness is case-insensitive."""
        CommunicationTemplate.objects.create(
            name="My Template",
            body_template="Body",
        )

        data = {
            "name": "MY TEMPLATE",  # Different case
            "channel": "EMAIL",
            "subject_template": "Subject",
            "body_template": "Body",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert not serializer.is_valid()
        assert "name" in serializer.errors

    def test_unique_name_allows_update_same_template(self):
        """Test updating a template allows keeping the same name."""
        template = CommunicationTemplate.objects.create(
            name="My Template",
            channel="EMAIL",
            subject_template="Subject",
            body_template="Original body",
        )

        data = {
            "name": "My Template",  # Same name
            "channel": "EMAIL",
            "subject_template": "Updated Subject",
            "body_template": "Updated body",
        }

        serializer = CommunicationTemplateSerializer(template, data=data)
        assert serializer.is_valid(), serializer.errors

    def test_invalid_context_type_rejected(self):
        """Test invalid context_type values are rejected."""
        data = {
            "name": "Invalid Context",
            "channel": "EMAIL",
            "context_type": "INVALID_TYPE",
            "subject_template": "Subject",
            "body_template": "Body",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert not serializer.is_valid()
        assert "context_type" in serializer.errors

    def test_non_manual_context_clears_include_flags(self):
        """Test non-MANUAL context types clear include_client/event_context flags."""
        data = {
            "name": "Event Context Template",
            "channel": "EMAIL",
            "context_type": ContextType.EVENT,  # Not MANUAL
            "include_client_context": True,  # Should be cleared
            "include_event_context": True,  # Should be cleared
            "subject_template": "Event Update",
            "body_template": "Your event details...",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated["include_client_context"] is False
        assert validated["include_event_context"] is False

    def test_manual_context_preserves_include_flags(self):
        """Test MANUAL context type preserves include_client/event_context flags."""
        data = {
            "name": "Manual Template",
            "channel": "EMAIL",
            "context_type": ContextType.MANUAL,
            "include_client_context": True,
            "include_event_context": True,
            "subject_template": "Custom Message",
            "body_template": "Hello {{client_name}}",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated["include_client_context"] is True
        assert validated["include_event_context"] is True

    def test_read_only_fields(self):
        """Test read-only fields are not writable."""
        data = {
            "id": 999,  # Should be ignored
            "created_at": "2020-01-01T00:00:00Z",  # Should be ignored
            "name": "Test",
            "channel": "EMAIL",
            "subject_template": "Subject",
            "body_template": "Body",
        }

        serializer = CommunicationTemplateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        # id should not be in validated_data
        assert "id" not in serializer.validated_data
        assert "created_at" not in serializer.validated_data


@pytest.mark.django_db
class TestCommunicationRecordSerializer:
    """Unit tests for CommunicationRecordSerializer."""

    def test_serialize_record_with_client(self, user_factory):
        """Test serializing a record includes client info."""
        client = user_factory(
            email="client@example.com",
            first_name="John",
            last_name="Doe",
        )
        sender = user_factory(
            admin=True,
            first_name="Admin",
            last_name="User",
        )

        record = CommunicationRecord.objects.create(
            template_name="Welcome Email",
            channel="EMAIL",
            category="SYSTEM",
            recipient="client@example.com",
            subject="Welcome!",
            body="<p>Hello!</p>",
            client=client,
            sent_by=sender,
            delivery_status="SENT",
        )

        serializer = CommunicationRecordSerializer(record)
        data = serializer.data

        assert data["template_name"] == "Welcome Email"
        assert data["channel"] == "EMAIL"
        assert data["category"] == "SYSTEM"
        assert data["recipient"] == "client@example.com"
        assert data["subject"] == "Welcome!"
        assert data["client"] == client.id
        assert data["client_email"] == "client@example.com"
        assert data["client_name"] == "John Doe"
        assert data["sent_by"] == sender.id
        assert data["sent_by_name"] == "Admin User"
        assert data["delivery_status"] == "SENT"

    def test_serialize_record_without_client(self):
        """Test serializing a record without client relationship."""
        record = CommunicationRecord.objects.create(
            template_name="Anonymous Email",
            recipient="unknown@example.com",
            body="Content",
        )

        serializer = CommunicationRecordSerializer(record)
        data = serializer.data

        assert data["client"] is None
        # DRF omits source fields when the parent object is None
        assert "client_email" not in data
        assert "client_name" not in data

    def test_serializer_includes_all_read_only_fields(self, user_factory):
        """Test all read-only fields are included in serialization."""
        client = user_factory()
        record = CommunicationRecord.objects.create(
            template_name="Test",
            recipient="test@example.com",
            body="Body",
            client=client,
            external_message_id="ext_123",
            delivery_status="DELIVERED",
            is_opened=True,
            context_data={"key": "value"},
        )

        serializer = CommunicationRecordSerializer(record)
        data = serializer.data

        assert "id" in data
        assert data["external_message_id"] == "ext_123"
        assert data["delivery_status"] == "DELIVERED"
        assert data["is_opened"] is True
        assert data["context_data"] == {"key": "value"}
        assert "created_at" in data


@pytest.mark.django_db
class TestSendCommunicationSerializer:
    """Unit tests for SendCommunicationSerializer."""

    def test_valid_send_request(self):
        """Test valid send communication request."""
        template = CommunicationTemplate.objects.create(
            name="Test Template",
            channel="EMAIL",
            category="SYSTEM",
            subject_template="Subject",
            body_template="Body",
        )

        data = {
            "template_id": template.id,
            "recipient": "test@example.com",
        }

        serializer = SendCommunicationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_nonexistent_template_rejected(self):
        """Test sending with nonexistent template is rejected."""
        data = {
            "template_id": 99999,
            "recipient": "test@example.com",
        }

        serializer = SendCommunicationSerializer(data=data)
        assert not serializer.is_valid()
        assert "template_id" in serializer.errors

    def test_optional_fields(self):
        """Test optional fields are properly handled."""
        template = CommunicationTemplate.objects.create(
            name="Test",
            channel="EMAIL",
            category="SYSTEM",
            subject_template="Subject",
            body_template="Body",
        )

        data = {
            "template_id": template.id,
            "recipient": "test@example.com",
            "client_id": None,
            "event_id": None,
            "context_data": {"custom_var": "value"},
            "use_async": True,
        }

        serializer = SendCommunicationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated["context_data"] == {"custom_var": "value"}
        assert validated["use_async"] is True

    def test_manual_email_requires_custom_subject(self):
        """Test manual email templates require custom_subject."""
        template = CommunicationTemplate.objects.create(
            name="Manual Email",
            channel="EMAIL",
            category="MANUAL",
            subject_template="{{custom_subject}}",
            body_template="{{custom_body}}",
        )

        data = {
            "template_id": template.id,
            "recipient": "test@example.com",
            "custom_body": "Hello there!",
            # Missing custom_subject
        }

        serializer = SendCommunicationSerializer(data=data)
        assert not serializer.is_valid()
        assert "custom_subject" in serializer.errors

    def test_manual_template_requires_custom_body(self):
        """Test manual templates require custom_body."""
        template = CommunicationTemplate.objects.create(
            name="Manual Template",
            channel="EMAIL",
            category="MANUAL",
            subject_template="Subject",
            body_template="{{custom_body}}",
        )

        data = {
            "template_id": template.id,
            "recipient": "test@example.com",
            "custom_subject": "Hello",
            # Missing custom_body
        }

        serializer = SendCommunicationSerializer(data=data)
        assert not serializer.is_valid()
        assert "custom_body" in serializer.errors

    def test_manual_template_with_custom_content(self):
        """Test manual template with all custom content."""
        template = CommunicationTemplate.objects.create(
            name="Full Manual",
            channel="EMAIL",
            category="MANUAL",
            subject_template="{{custom_subject}}",
            body_template="{{custom_body}}",
        )

        data = {
            "template_id": template.id,
            "recipient": "test@example.com",
            "custom_subject": "Important Update",
            "custom_body": "This is the message content.",
            "context_data": {"extra": "data"},
        }

        serializer = SendCommunicationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        # Custom content should be added to context_data
        assert validated["context_data"]["custom_subject"] == "Important Update"
        assert validated["context_data"]["custom_body"] == "This is the message content."
        assert validated["context_data"]["message"] == "This is the message content."
        assert validated["context_data"]["extra"] == "data"

    def test_sms_manual_template_no_subject_required(self):
        """Test manual SMS templates don't require custom_subject."""
        template = CommunicationTemplate.objects.create(
            name="Manual SMS",
            channel="SMS",
            category="MANUAL",
            body_template="{{custom_body}}",
        )

        data = {
            "template_id": template.id,
            "recipient": "+1234567890",
            "custom_body": "SMS message content",
        }

        serializer = SendCommunicationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
class TestPreviewCommunicationSerializer:
    """Unit tests for PreviewCommunicationSerializer."""

    def test_valid_preview_request(self):
        """Test valid preview request with context data."""
        data = {
            "template_id": 1,
            "context_data": {"client_name": "John Doe"},
        }

        serializer = PreviewCommunicationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_preview_with_custom_content(self):
        """Test preview request with custom subject and body."""
        data = {
            "template_id": 1,
            "custom_subject": "Custom Subject Line",
            "custom_body": "Custom body content here.",
            "context_data": {},
        }

        serializer = PreviewCommunicationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        # Custom content should be added to context_data
        assert validated["context_data"]["custom_subject"] == "Custom Subject Line"
        assert validated["context_data"]["custom_body"] == "Custom body content here."
        assert validated["context_data"]["message"] == "Custom body content here."
        assert validated["context_data"]["content"] == "Custom body content here."

    def test_preview_empty_context_data_default(self):
        """Test preview with empty context data defaults to empty dict."""
        data = {
            "template_id": 1,
        }

        serializer = PreviewCommunicationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["context_data"] == {}


@pytest.mark.django_db
class TestBulkSendSerializer:
    """Unit tests for BulkSendSerializer."""

    def test_valid_bulk_send_request(self):
        """Test valid bulk send request."""
        template = CommunicationTemplate.objects.create(
            name="Bulk Template",
            channel="EMAIL",
            category="AUTO",
            subject_template="Notification",
            body_template="You have updates.",
        )

        data = {
            "template_id": template.id,
            "recipients": [
                {"recipient": "user1@example.com", "context_data": {"name": "User 1"}},
                {"recipient": "user2@example.com", "context_data": {"name": "User 2"}},
            ],
        }

        serializer = BulkSendSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_recipients_require_recipient_field(self):
        """Test each recipient object must have 'recipient' field."""
        template = CommunicationTemplate.objects.create(
            name="Bulk Template",
            channel="EMAIL",
            category="AUTO",
            subject_template="Subject",
            body_template="Body",
        )

        data = {
            "template_id": template.id,
            "recipients": [
                {"email": "user@example.com"},  # Wrong field name
            ],
        }

        serializer = BulkSendSerializer(data=data)
        assert not serializer.is_valid()
        assert "recipients" in serializer.errors

    def test_manual_templates_not_allowed_for_bulk(self):
        """Test MANUAL category templates are not allowed for bulk send."""
        template = CommunicationTemplate.objects.create(
            name="Manual Template",
            channel="EMAIL",
            category="MANUAL",
            subject_template="Subject",
            body_template="Body",
        )

        data = {
            "template_id": template.id,
            "recipients": [
                {"recipient": "user@example.com"},
            ],
        }

        serializer = BulkSendSerializer(data=data)
        assert not serializer.is_valid()
        assert "template_id" in serializer.errors
        assert "Bulk sending is not allowed with manual templates" in str(serializer.errors)

    def test_nonexistent_template_rejected(self):
        """Test bulk send with nonexistent template is rejected."""
        data = {
            "template_id": 99999,
            "recipients": [
                {"recipient": "user@example.com"},
            ],
        }

        serializer = BulkSendSerializer(data=data)
        assert not serializer.is_valid()
        assert "template_id" in serializer.errors

    def test_optional_use_async_field(self):
        """Test use_async field is optional with None default."""
        template = CommunicationTemplate.objects.create(
            name="Async Template",
            channel="EMAIL",
            category="SYSTEM",
            subject_template="Subject",
            body_template="Body",
        )

        data = {
            "template_id": template.id,
            "recipients": [
                {"recipient": "user@example.com"},
            ],
            "use_async": True,
        }

        serializer = BulkSendSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["use_async"] is True

    def test_empty_recipients_list(self):
        """Test empty recipients list is technically valid (business logic elsewhere)."""
        template = CommunicationTemplate.objects.create(
            name="Empty Recipients",
            channel="EMAIL",
            category="AUTO",
            subject_template="Subject",
            body_template="Body",
        )

        data = {
            "template_id": template.id,
            "recipients": [],
        }

        serializer = BulkSendSerializer(data=data)
        # Empty list is valid at serializer level
        assert serializer.is_valid(), serializer.errors
