"""
Unit tests for messaging domain serializers.

Tests:
- UserBasicSerializer (basic user info for messaging)
- MessageAttachmentSerializer
- MessageSerializer
- MessageCreateSerializer
- MessageThreadListSerializer
- MessageThreadDetailSerializer
- MessageThreadCreateSerializer
- MessageThreadUpdateSerializer
- MessageReadStatusSerializer
"""

import pytest
from unittest.mock import Mock
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from core.domains.messaging.serializers import (
    UserBasicSerializer,
    MessageAttachmentSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    MessageThreadListSerializer,
    MessageThreadDetailSerializer,
    MessageThreadCreateSerializer,
    MessageThreadUpdateSerializer,
    MessageReadStatusSerializer,
)
from core.domains.messaging.models import MessageThread, Message

User = get_user_model()


@pytest.fixture
def request_context(user_factory):
    """Create a mock request context for serializers."""
    def _create_context(user=None, role='CLIENT'):
        if user is None:
            user = user_factory(role=role, is_staff=(role == 'ADMIN'))
        request = Mock()
        request.user = user
        return {'request': request}
    return _create_context


@pytest.mark.django_db
class TestUserBasicSerializer:
    """Tests for UserBasicSerializer."""

    def test_serialize_user(self, user_factory):
        """Test serializing a user with basic info."""
        user = user_factory(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            role='CLIENT'
        )

        serializer = UserBasicSerializer(user)
        data = serializer.data

        assert data['id'] == str(user.id)
        assert data['first_name'] == 'John'
        assert data['last_name'] == 'Doe'
        assert data['email'] == 'john@example.com'
        assert data['role'] == 'CLIENT'
        assert data['display_name'] == 'John Doe'

    def test_serialize_admin_user(self, user_factory):
        """Test serializing an admin user."""
        user = user_factory(admin=True)

        serializer = UserBasicSerializer(user)
        data = serializer.data

        assert data['role'] == 'ADMIN'

    def test_display_name_fallback_to_email(self, user_factory):
        """Test display_name falls back to email when no name."""
        user = user_factory(
            first_name='',
            last_name='',
            email='test@example.com'
        )

        serializer = UserBasicSerializer(user)
        data = serializer.data

        assert data['display_name'] == 'test@example.com'


@pytest.mark.django_db
class TestMessageAttachmentSerializer:
    """Tests for MessageAttachmentSerializer."""

    def test_serialize_attachment(self, message_attachment_factory):
        """Test serializing a message attachment."""
        attachment = message_attachment_factory(
            filename='document.pdf',
            file_size=1024,
            file_type='application/pdf'
        )

        serializer = MessageAttachmentSerializer(attachment)
        data = serializer.data

        assert data['id'] == str(attachment.id)
        assert data['filename'] == 'document.pdf'
        assert data['file_size'] == 1024
        assert data['file_type'] == 'application/pdf'
        assert 'created_at' in data

    def test_read_only_fields(self, message_attachment_factory):
        """Test that read_only fields cannot be set on update."""
        attachment = message_attachment_factory()

        serializer = MessageAttachmentSerializer(attachment)

        # These fields should be read-only
        read_only = serializer.Meta.read_only_fields
        assert 'id' in read_only
        assert 'file_url' in read_only
        assert 'file_size' in read_only
        assert 'file_type' in read_only
        assert 'created_at' in read_only


@pytest.mark.django_db
class TestMessageSerializer:
    """Tests for MessageSerializer."""

    def test_serialize_message(self, message_factory, request_context):
        """Test serializing a message."""
        message = message_factory(content='Hello world')

        context = request_context()
        serializer = MessageSerializer(message, context=context)
        data = serializer.data

        assert data['id'] == str(message.id)
        assert data['content'] == 'Hello world'
        assert data['message_type'] == 'text'
        assert data['is_internal_note'] is False
        assert 'sender' in data
        assert 'created_at' in data

    def test_serialize_message_with_attachments(
        self, message_factory, message_attachment_factory, request_context
    ):
        """Test serializing a message with attachments."""
        message = message_factory()
        message_attachment_factory(message=message, filename='doc1.pdf')
        message_attachment_factory(message=message, filename='doc2.pdf')

        context = request_context()
        serializer = MessageSerializer(message, context=context)
        data = serializer.data

        assert len(data['attachments']) == 2

    def test_serialize_internal_note(self, message_factory, user_factory, request_context):
        """Test serializing an internal note."""
        admin = user_factory(admin=True)
        message = message_factory(sender=admin, is_internal_note=True)

        context = request_context(user=admin, role='ADMIN')
        serializer = MessageSerializer(message, context=context)
        data = serializer.data

        assert data['is_internal_note'] is True

    def test_thread_id_serialized_as_string(self, message_factory, request_context):
        """Test that thread UUID is serialized as string."""
        message = message_factory()

        context = request_context()
        serializer = MessageSerializer(message, context=context)
        data = serializer.data

        assert isinstance(data['thread'], str)
        assert data['thread'] == str(message.thread.id)


@pytest.mark.django_db
class TestMessageCreateSerializer:
    """Tests for MessageCreateSerializer."""

    def test_create_message(self, message_thread_factory, user_factory, request_context):
        """Test creating a message through serializer."""
        thread = message_thread_factory()
        sender = user_factory()
        context = request_context(user=sender)

        data = {
            'thread': thread.id,
            'content': 'New message content',
            'message_type': 'text',
            'is_internal_note': False,
        }

        serializer = MessageCreateSerializer(data=data, context=context)
        assert serializer.is_valid(), serializer.errors

        message = serializer.save()

        assert message.content == 'New message content'
        assert message.sender == sender
        assert message.thread == thread

    def test_create_internal_note_admin_only(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test that only admins can create internal notes."""
        thread = message_thread_factory()
        client = user_factory(role='CLIENT')
        context = request_context(user=client, role='CLIENT')

        data = {
            'thread': thread.id,
            'content': 'Internal note',
            'message_type': 'text',
            'is_internal_note': True,
        }

        serializer = MessageCreateSerializer(data=data, context=context)
        assert not serializer.is_valid()
        assert 'is_internal_note' in serializer.errors

    def test_admin_can_create_internal_note(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test that admins can create internal notes."""
        thread = message_thread_factory()
        admin = user_factory(admin=True)
        context = request_context(user=admin, role='ADMIN')

        data = {
            'thread': thread.id,
            'content': 'Internal note for admins',
            'message_type': 'text',
            'is_internal_note': True,
        }

        serializer = MessageCreateSerializer(data=data, context=context)
        assert serializer.is_valid(), serializer.errors

        message = serializer.save()
        assert message.is_internal_note is True

    def test_create_message_requires_thread(self, user_factory, request_context):
        """Test that thread is required."""
        sender = user_factory()
        context = request_context(user=sender)

        data = {
            'content': 'Message without thread',
            'message_type': 'text',
        }

        serializer = MessageCreateSerializer(data=data, context=context)
        assert not serializer.is_valid()
        assert 'thread' in serializer.errors


@pytest.mark.django_db
class TestMessageThreadListSerializer:
    """Tests for MessageThreadListSerializer."""

    def test_serialize_thread_list(self, message_thread_factory, request_context):
        """Test serializing a thread for list view."""
        thread = message_thread_factory(subject='Test Subject', priority='high')

        context = request_context()
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        assert data['id'] == str(thread.id)
        assert data['subject'] == 'Test Subject'
        assert data['priority'] == 'high'
        assert data['status'] == 'active'
        assert 'client' in data
        assert 'client_name' in data
        assert 'unread_count' in data
        assert 'can_manage' in data

    def test_unread_count_for_user(
        self, message_thread_factory, message_factory, user_factory, request_context
    ):
        """Test unread_count calculation for specific user."""
        thread = message_thread_factory()
        message_factory(thread=thread)
        message_factory(thread=thread)
        message_factory(thread=thread)

        reader = user_factory()
        context = request_context(user=reader)
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        # No messages marked as read, so all should be unread
        assert data['unread_count'] == 3

    def test_unread_count_excludes_read_messages(
        self, message_thread_factory, message_factory, user_factory, request_context
    ):
        """Test that read messages are not counted as unread."""
        thread = message_thread_factory()
        message1 = message_factory(thread=thread)
        message2 = message_factory(thread=thread)
        message_factory(thread=thread)  # Third unread message

        reader = user_factory()
        message1.mark_as_read(reader)
        message2.mark_as_read(reader)

        context = request_context(user=reader)
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        assert data['unread_count'] == 1

    def test_last_message_preview(
        self, message_thread_factory, message_factory, request_context
    ):
        """Test last_message_preview field."""
        thread = message_thread_factory()
        message_factory(thread=thread, content='First message')
        message_factory(thread=thread, content='Last message content')

        context = request_context()
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        assert 'Last message content' in data['last_message_preview']

    def test_last_message_preview_truncation(
        self, message_thread_factory, message_factory, request_context
    ):
        """Test that long messages are truncated in preview."""
        thread = message_thread_factory()
        long_content = 'A' * 150  # 150 characters
        message_factory(thread=thread, content=long_content)

        context = request_context()
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        # Should be truncated to 100 chars + "..."
        assert len(data['last_message_preview']) == 103
        assert data['last_message_preview'].endswith('...')

    def test_can_manage_for_admin(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test can_manage is True for admin users."""
        thread = message_thread_factory()
        admin = user_factory(admin=True)

        context = request_context(user=admin, role='ADMIN')
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        assert data['can_manage'] is True

    def test_can_manage_for_thread_owner(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test can_manage is True for the thread's client."""
        client = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client)

        context = request_context(user=client, role='CLIENT')
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        assert data['can_manage'] is True

    def test_can_manage_for_other_client(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test can_manage is False for other clients."""
        thread = message_thread_factory()
        other_client = user_factory(role='CLIENT')

        context = request_context(user=other_client, role='CLIENT')
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        assert data['can_manage'] is False

    def test_internal_notes_excluded_for_clients(
        self, message_thread_factory, message_factory, user_factory, request_context
    ):
        """Test that internal notes are excluded from unread_count for clients."""
        thread = message_thread_factory()
        admin = user_factory(admin=True)

        # Create regular message and internal note
        message_factory(thread=thread, is_internal_note=False)
        message_factory(thread=thread, sender=admin, is_internal_note=True)

        client = user_factory(role='CLIENT')
        context = request_context(user=client, role='CLIENT')
        serializer = MessageThreadListSerializer(thread, context=context)
        data = serializer.data

        # Client should only see 1 unread (the non-internal message)
        assert data['unread_count'] == 1


@pytest.mark.django_db
class TestMessageThreadDetailSerializer:
    """Tests for MessageThreadDetailSerializer."""

    def test_serialize_thread_detail_includes_messages(
        self, message_thread_factory, message_factory, request_context
    ):
        """Test that detail serializer includes messages."""
        thread = message_thread_factory()
        message_factory(thread=thread, content='Message 1')
        message_factory(thread=thread, content='Message 2')

        context = request_context()
        serializer = MessageThreadDetailSerializer(thread, context=context)
        data = serializer.data

        assert 'messages' in data
        assert len(data['messages']) == 2

    def test_messages_ordered_by_created_at(
        self, message_thread_factory, message_factory, request_context
    ):
        """Test messages are ordered chronologically."""
        thread = message_thread_factory()
        message1 = message_factory(thread=thread, content='First')
        message2 = message_factory(thread=thread, content='Second')

        context = request_context()
        serializer = MessageThreadDetailSerializer(thread, context=context)
        data = serializer.data

        assert data['messages'][0]['content'] == 'First'
        assert data['messages'][1]['content'] == 'Second'

    def test_internal_notes_hidden_from_clients(
        self, message_thread_factory, message_factory, user_factory, request_context
    ):
        """Test that clients cannot see internal notes."""
        thread = message_thread_factory()
        admin = user_factory(admin=True)

        message_factory(thread=thread, content='Public message')
        message_factory(thread=thread, sender=admin, is_internal_note=True, content='Internal note')

        client = user_factory(role='CLIENT')
        context = request_context(user=client, role='CLIENT')
        serializer = MessageThreadDetailSerializer(thread, context=context)
        data = serializer.data

        assert len(data['messages']) == 1
        assert data['messages'][0]['content'] == 'Public message'

    def test_admin_sees_internal_notes(
        self, message_thread_factory, message_factory, user_factory, request_context
    ):
        """Test that admins can see internal notes."""
        thread = message_thread_factory()
        admin = user_factory(admin=True)

        message_factory(thread=thread, content='Public message')
        message_factory(thread=thread, sender=admin, is_internal_note=True, content='Internal note')

        context = request_context(user=admin, role='ADMIN')
        serializer = MessageThreadDetailSerializer(thread, context=context)
        data = serializer.data

        assert len(data['messages']) == 2


@pytest.mark.django_db
class TestMessageThreadCreateSerializer:
    """Tests for MessageThreadCreateSerializer."""

    def test_create_thread(self, user_factory, request_context):
        """Test creating a new thread."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        context = request_context(user=admin, role='ADMIN')

        data = {
            'client': client.id,
            'subject': 'New Thread Subject',
            'priority': 'high',
        }

        serializer = MessageThreadCreateSerializer(data=data, context=context)
        assert serializer.is_valid(), serializer.errors

        thread = serializer.save()

        assert thread.subject == 'New Thread Subject'
        assert thread.priority == 'high'
        assert thread.client == client

    def test_create_thread_with_initial_message(self, user_factory, request_context):
        """Test creating a thread with an initial message."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        context = request_context(user=admin, role='ADMIN')

        data = {
            'client': client.id,
            'subject': 'Support Request',
            'initial_message': 'Hello, I need help with my booking.',
        }

        serializer = MessageThreadCreateSerializer(data=data, context=context)
        assert serializer.is_valid(), serializer.errors

        thread = serializer.save()

        assert thread.messages.count() == 1
        assert thread.messages.first().content == 'Hello, I need help with my booking.'

    def test_client_can_only_create_for_self(self, user_factory, request_context):
        """Test that clients can only create threads for themselves."""
        client1 = user_factory(role='CLIENT')
        client2 = user_factory(role='CLIENT')
        context = request_context(user=client1, role='CLIENT')

        data = {
            'client': client2.id,  # Different client
            'subject': 'Thread for other client',
        }

        serializer = MessageThreadCreateSerializer(data=data, context=context)
        assert not serializer.is_valid()

    def test_admin_can_create_for_any_client(self, user_factory, request_context):
        """Test that admins can create threads for any client."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        context = request_context(user=admin, role='ADMIN')

        data = {
            'client': client.id,
            'subject': 'Admin created thread',
        }

        serializer = MessageThreadCreateSerializer(data=data, context=context)
        assert serializer.is_valid(), serializer.errors

    def test_validate_client_must_have_client_role(self, user_factory, request_context):
        """Test that the client field must be a user with CLIENT role."""
        admin_as_client = user_factory(admin=True)
        creating_admin = user_factory(admin=True)
        context = request_context(user=creating_admin, role='ADMIN')

        data = {
            'client': admin_as_client.id,  # Admin user, not CLIENT
            'subject': 'Invalid thread',
        }

        serializer = MessageThreadCreateSerializer(data=data, context=context)
        assert not serializer.is_valid()
        assert 'client' in serializer.errors


@pytest.mark.django_db
class TestMessageThreadUpdateSerializer:
    """Tests for MessageThreadUpdateSerializer."""

    def test_update_thread_status(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test updating thread status."""
        thread = message_thread_factory(status='active')
        admin = user_factory(admin=True)
        context = request_context(user=admin, role='ADMIN')

        data = {'status': 'resolved'}

        serializer = MessageThreadUpdateSerializer(
            thread, data=data, partial=True, context=context
        )
        assert serializer.is_valid(), serializer.errors

        updated_thread = serializer.save()
        assert updated_thread.status == 'resolved'

    def test_update_thread_priority(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test updating thread priority."""
        thread = message_thread_factory(priority='normal')
        admin = user_factory(admin=True)
        context = request_context(user=admin, role='ADMIN')

        data = {'priority': 'urgent'}

        serializer = MessageThreadUpdateSerializer(
            thread, data=data, partial=True, context=context
        )
        assert serializer.is_valid(), serializer.errors

        updated_thread = serializer.save()
        assert updated_thread.priority == 'urgent'

    def test_update_thread_assigned_admin(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test assigning an admin to a thread."""
        thread = message_thread_factory()
        admin = user_factory(admin=True)
        new_admin = user_factory(admin=True)
        context = request_context(user=admin, role='ADMIN')

        data = {'assigned_admin': new_admin.id}

        serializer = MessageThreadUpdateSerializer(
            thread, data=data, partial=True, context=context
        )
        assert serializer.is_valid(), serializer.errors

        updated_thread = serializer.save()
        assert updated_thread.assigned_admin == new_admin

    def test_only_admin_can_update_thread(
        self, message_thread_factory, user_factory, request_context
    ):
        """Test that only admins can update threads."""
        thread = message_thread_factory()
        client = user_factory(role='CLIENT')
        context = request_context(user=client, role='CLIENT')

        data = {'status': 'resolved'}

        serializer = MessageThreadUpdateSerializer(
            thread, data=data, partial=True, context=context
        )
        assert not serializer.is_valid()


@pytest.mark.django_db
class TestMessageReadStatusSerializer:
    """Tests for MessageReadStatusSerializer."""

    def test_serialize_read_status(self, message_read_status_factory, request_context):
        """Test serializing a message read status."""
        read_status = message_read_status_factory()

        context = request_context()
        serializer = MessageReadStatusSerializer(read_status, context=context)
        data = serializer.data

        assert 'user' in data
        assert 'read_at' in data

    def test_read_status_user_info(
        self, message_factory, user_factory, request_context
    ):
        """Test that user info is properly serialized."""
        message = message_factory()
        reader = user_factory(first_name='John', last_name='Doe')
        read_status = message.mark_as_read(reader)

        context = request_context()
        serializer = MessageReadStatusSerializer(read_status, context=context)
        data = serializer.data

        assert data['user']['first_name'] == 'John'
        assert data['user']['last_name'] == 'Doe'
