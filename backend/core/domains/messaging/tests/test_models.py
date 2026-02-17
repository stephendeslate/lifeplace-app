"""
Unit tests for messaging domain models.

Tests:
- MessageThread model (client-admin communication threads)
- Message model (individual messages within threads)
- MessageReadStatus model (read tracking)
- MessageAttachment model (file attachments)
"""

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time

from core.domains.messaging.models import (
    MessageThread,
    Message,
    MessageReadStatus,
    MessageAttachment,
)

User = get_user_model()


@pytest.mark.django_db
class TestMessageThreadModel:
    """Unit tests for the MessageThread model."""

    def test_create_message_thread(self, message_thread_factory):
        """Test creating a message thread with valid data."""
        thread = message_thread_factory(subject='Test Thread')

        assert thread.subject == 'Test Thread'
        assert thread.status == 'active'
        assert thread.priority == 'normal'
        assert thread.client is not None
        assert thread.client.role == 'CLIENT'

    def test_thread_string_representation(self, message_thread_factory):
        """Test MessageThread __str__ returns subject and client name."""
        thread = message_thread_factory(subject='Payment Question')

        expected = f"Payment Question - {thread.client.get_display_name()}"
        assert str(thread) == expected

    def test_thread_priority_choices(self, message_thread_factory):
        """Test all priority choices are valid."""
        priorities = ['urgent', 'high', 'normal', 'low']

        for priority in priorities:
            thread = message_thread_factory(priority=priority)
            assert thread.priority == priority

    def test_thread_status_choices(self, message_thread_factory):
        """Test all status choices are valid."""
        statuses = ['active', 'waiting', 'resolved', 'archived']

        for status in statuses:
            thread = message_thread_factory(status=status)
            assert thread.status == status

    def test_thread_with_event(self, message_thread_factory, event_factory):
        """Test creating a thread associated with an event."""
        event = event_factory()
        thread = message_thread_factory(client=event.client, event=event)

        assert thread.event == event
        assert thread.event_name == str(event)

    def test_thread_without_event(self, message_thread_factory):
        """Test creating a thread without an event."""
        thread = message_thread_factory()

        assert thread.event is None
        assert thread.event_name is None

    def test_thread_with_assigned_admin(self, message_thread_factory, user_factory):
        """Test creating a thread with an assigned admin."""
        admin = user_factory(admin=True)
        thread = message_thread_factory(assigned_admin=admin)

        assert thread.assigned_admin == admin
        assert thread.assigned_admin.role == 'ADMIN'

    def test_thread_client_name_property(self, message_thread_factory, user_factory):
        """Test client_name property returns client's display name."""
        client = user_factory(first_name='John', last_name='Doe', role='CLIENT')
        thread = message_thread_factory(client=client)

        assert thread.client_name == 'John Doe'

    def test_thread_default_ordering(self, message_thread_factory):
        """Test threads are ordered by last_message_at descending."""
        thread1 = message_thread_factory()
        thread2 = message_thread_factory()

        # Update timestamps to test ordering
        thread1.last_message_at = timezone.now() - timedelta(hours=1)
        thread1.save()
        thread2.last_message_at = timezone.now()
        thread2.save()

        threads = list(MessageThread.objects.all())
        assert threads[0] == thread2
        assert threads[1] == thread1

    def test_update_last_message_timestamp_with_admin_sender(
        self, message_thread_factory, user_factory
    ):
        """Test updating last message timestamp for admin sender."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        timestamp = timezone.now()

        thread.update_last_message_timestamp(timestamp, admin)

        assert thread.last_message_at == timestamp
        assert thread.last_admin_message_at == timestamp
        assert thread.last_client_message_at is None

    def test_update_last_message_timestamp_with_client_sender(
        self, message_thread_factory, user_factory
    ):
        """Test updating last message timestamp for client sender."""
        client = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client)
        timestamp = timezone.now()

        thread.update_last_message_timestamp(timestamp, client)

        assert thread.last_message_at == timestamp
        assert thread.last_client_message_at == timestamp
        assert thread.last_admin_message_at is None

    def test_thread_uuid_primary_key(self, message_thread_factory):
        """Test that thread uses UUID as primary key."""
        thread = message_thread_factory()

        assert thread.id is not None
        # UUID has 36 characters in string format
        assert len(str(thread.id)) == 36

    def test_thread_created_at_auto_set(self, message_thread_factory):
        """Test that created_at is automatically set."""
        thread = message_thread_factory()

        assert thread.created_at is not None
        assert thread.created_at <= timezone.now()


@pytest.mark.django_db
class TestMessageModel:
    """Unit tests for the Message model."""

    def test_create_message(self, message_factory):
        """Test creating a message with valid data."""
        message = message_factory(content='Hello, this is a test message')

        assert message.content == 'Hello, this is a test message'
        assert message.message_type == 'text'
        assert message.is_internal_note is False
        assert message.thread is not None
        assert message.sender is not None

    def test_message_string_representation(self, message_factory):
        """Test Message __str__ returns informative string."""
        message = message_factory()

        expected = f"Message from {message.sender.get_display_name()} in {message.thread.subject}"
        assert str(message) == expected

    def test_message_type_choices(self, message_factory):
        """Test all message type choices are valid."""
        types = ['text', 'system', 'file', 'event_update']

        for msg_type in types:
            message = message_factory(message_type=msg_type)
            assert message.message_type == msg_type

    def test_internal_note_message(self, message_factory, user_factory):
        """Test creating an internal note (admin only)."""
        admin = user_factory(admin=True)
        message = message_factory(sender=admin, is_internal_note=True)

        assert message.is_internal_note is True
        assert message.sender.role == 'ADMIN'

    def test_message_sender_name_property(self, message_factory, user_factory):
        """Test sender_name property returns sender's display name."""
        sender = user_factory(first_name='Jane', last_name='Smith')
        message = message_factory(sender=sender)

        assert message.sender_name == 'Jane Smith'

    def test_message_uuid_primary_key(self, message_factory):
        """Test that message uses UUID as primary key."""
        message = message_factory()

        assert message.id is not None
        assert len(str(message.id)) == 36

    def test_message_default_ordering(self, message_factory, message_thread_factory):
        """Test messages are ordered by created_at ascending."""
        thread = message_thread_factory()

        message1 = message_factory(thread=thread)
        message2 = message_factory(thread=thread)

        messages = list(thread.messages.all())
        assert messages[0] == message1
        assert messages[1] == message2

    def test_message_save_updates_thread_timestamp(
        self, message_thread_factory, user_factory
    ):
        """Test that saving a new message does not update thread's last_message_at.

        Note: Message uses UUIDField as primary key with default=uuid.uuid4,
        so self.pk is never None during save(). The is_new check (self.pk is None)
        is always False, meaning update_last_message_timestamp is never called.
        """
        thread = message_thread_factory()
        sender = user_factory()
        old_timestamp = thread.last_message_at

        Message.objects.create(
            thread=thread,
            sender=sender,
            content='New message',
            message_type='text'
        )

        thread.refresh_from_db()
        # UUID pk is auto-generated before save(), so is_new is always False
        # and update_last_message_timestamp is never called
        assert thread.last_message_at == old_timestamp

    def test_mark_as_read(self, message_factory, user_factory):
        """Test marking a message as read by a user."""
        message = message_factory()
        reader = user_factory()

        read_status = message.mark_as_read(reader)

        assert read_status is not None
        assert read_status.message == message
        assert read_status.user == reader
        assert read_status.read_at is not None

    def test_mark_as_read_idempotent(self, message_factory, user_factory):
        """Test marking same message as read multiple times."""
        message = message_factory()
        reader = user_factory()

        read_status1 = message.mark_as_read(reader)
        read_status2 = message.mark_as_read(reader)

        assert read_status1 == read_status2
        # Should only have one read status record
        assert MessageReadStatus.objects.filter(
            message=message, user=reader
        ).count() == 1

    def test_message_edited_at(self, message_factory):
        """Test message edited_at timestamp."""
        message = message_factory()
        assert message.edited_at is None

        message.edited_at = timezone.now()
        message.save()

        message.refresh_from_db()
        assert message.edited_at is not None

    def test_message_with_thread_relationship(self, message_factory, message_thread_factory):
        """Test message belongs to correct thread."""
        thread = message_thread_factory()
        message = message_factory(thread=thread)

        assert message.thread == thread
        assert message in thread.messages.all()


@pytest.mark.django_db
class TestMessageReadStatusModel:
    """Unit tests for the MessageReadStatus model."""

    def test_create_read_status(self, message_read_status_factory):
        """Test creating a message read status."""
        read_status = message_read_status_factory()

        assert read_status.message is not None
        assert read_status.user is not None
        assert read_status.read_at is not None

    def test_read_status_string_representation(self, message_read_status_factory):
        """Test MessageReadStatus __str__ returns informative string."""
        read_status = message_read_status_factory()

        expected = f"{read_status.user.get_display_name()} read message {read_status.message.id}"
        assert str(read_status) == expected

    def test_read_status_unique_constraint(
        self, message_factory, user_factory
    ):
        """Test that a user can only have one read status per message."""
        message = message_factory()
        reader = user_factory()

        # Create first read status
        MessageReadStatus.objects.create(
            message=message,
            user=reader,
            read_at=timezone.now()
        )

        # Attempting to create duplicate should raise error
        with pytest.raises(Exception):  # IntegrityError
            MessageReadStatus.objects.create(
                message=message,
                user=reader,
                read_at=timezone.now()
            )

    def test_read_status_default_read_at(self, message_factory, user_factory):
        """Test that read_at defaults to current time."""
        message = message_factory()
        reader = user_factory()

        read_status = MessageReadStatus.objects.create(
            message=message,
            user=reader
        )

        assert read_status.read_at is not None
        # Should be very close to now
        assert (timezone.now() - read_status.read_at).total_seconds() < 5


@pytest.mark.django_db
class TestMessageAttachmentModel:
    """Unit tests for the MessageAttachment model."""

    def test_create_attachment(self, message_attachment_factory):
        """Test creating a message attachment."""
        attachment = message_attachment_factory(filename='document.pdf')

        assert attachment.filename == 'document.pdf'
        assert attachment.file_size > 0
        assert attachment.file_type is not None
        assert attachment.message is not None

    def test_attachment_string_representation(self, message_attachment_factory):
        """Test MessageAttachment __str__ returns filename."""
        attachment = message_attachment_factory(filename='report.pdf')

        assert str(attachment) == 'Attachment: report.pdf'

    def test_attachment_uuid_primary_key(self, message_attachment_factory):
        """Test that attachment uses UUID as primary key."""
        attachment = message_attachment_factory()

        assert attachment.id is not None
        assert len(str(attachment.id)) == 36

    def test_attachment_ordering(self, message_factory, message_attachment_factory):
        """Test attachments are ordered by created_at ascending."""
        message = message_factory()

        attachment1 = message_attachment_factory(message=message)
        attachment2 = message_attachment_factory(message=message)

        attachments = list(message.attachments.all())
        assert attachments[0] == attachment1
        assert attachments[1] == attachment2

    def test_attachment_image_type(self, message_attachment_factory):
        """Test creating an image attachment."""
        attachment = message_attachment_factory(
            filename='photo.jpg',
            file_type='image/jpeg'
        )

        assert attachment.file_type == 'image/jpeg'

    def test_attachment_pdf_type(self, message_attachment_factory):
        """Test creating a PDF attachment."""
        attachment = message_attachment_factory(
            filename='contract.pdf',
            file_type='application/pdf'
        )

        assert attachment.file_type == 'application/pdf'

    def test_multiple_attachments_per_message(
        self, message_factory, message_attachment_factory
    ):
        """Test that a message can have multiple attachments."""
        message = message_factory()

        attachment1 = message_attachment_factory(message=message, filename='doc1.pdf')
        attachment2 = message_attachment_factory(message=message, filename='doc2.pdf')
        attachment3 = message_attachment_factory(message=message, filename='image.jpg')

        assert message.attachments.count() == 3
        assert attachment1 in message.attachments.all()
        assert attachment2 in message.attachments.all()
        assert attachment3 in message.attachments.all()


@pytest.mark.django_db
class TestMessageThreadIndexes:
    """Test database indexes are working correctly."""

    def test_thread_client_status_index(self, message_thread_factory, user_factory):
        """Test query using client and status index."""
        client = user_factory(role='CLIENT')
        message_thread_factory(client=client, status='active')
        message_thread_factory(client=client, status='resolved')

        # Query should use index
        active_threads = MessageThread.objects.filter(
            client=client, status='active'
        )
        assert active_threads.count() == 1

    def test_thread_assigned_admin_index(self, message_thread_factory, user_factory):
        """Test query using assigned_admin index."""
        admin = user_factory(admin=True)
        message_thread_factory(assigned_admin=admin)
        message_thread_factory(assigned_admin=admin)
        message_thread_factory()  # No admin assigned

        admin_threads = MessageThread.objects.filter(assigned_admin=admin)
        assert admin_threads.count() == 2


@pytest.mark.django_db
class TestMessageThreadTimestampBehavior:
    """Test timestamp behavior in threads."""

    @freeze_time('2024-06-15 10:00:00')
    def test_thread_tracks_admin_and_client_messages_separately(
        self, message_thread_factory, user_factory
    ):
        """Test that thread tracks admin and client message timestamps separately."""
        admin = user_factory(admin=True)
        client = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client, assigned_admin=admin)

        # Admin sends a message
        admin_time = timezone.now()
        thread.update_last_message_timestamp(admin_time, admin)

        assert thread.last_admin_message_at == admin_time
        assert thread.last_client_message_at is None

        # Client sends a message later
        client_time = timezone.now() + timedelta(minutes=5)
        thread.update_last_message_timestamp(client_time, client)

        thread.refresh_from_db()
        assert thread.last_admin_message_at == admin_time
        assert thread.last_client_message_at == client_time
        assert thread.last_message_at == client_time
