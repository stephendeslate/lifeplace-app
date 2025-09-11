"""
Comprehensive test suite for messaging domain models

Tests all model functionality, relationships, validations, and business logic
for the messaging system core entities.
"""

import uuid
from datetime import datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile

from ..models import (
    MessageThread,
    ThreadParticipant,
    Message,
    MessageAttachment,
    MessageReadReceipt,
    TypingIndicator
)

User = get_user_model()


class MessageThreadModelTest(TestCase):
    """Test MessageThread model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN',
            first_name='Admin',
            last_name='User'
        )
        
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT',
            first_name='Client',
            last_name='User'
        )
        
        # Create Event model mock (would normally be from events app)
        from django.db import models
        class MockEvent(models.Model):
            name = models.CharField(max_length=255)
            client = models.ForeignKey(User, on_delete=models.CASCADE)
            start_date = models.DateTimeField()
            
            class Meta:
                app_label = 'messaging'
        
        # Only create if doesn't exist (for repeated test runs)
        if not hasattr(self, 'mock_event'):
            self.mock_event = MockEvent.objects.create(
                name='Test Event',
                client=self.client_user,
                start_date=timezone.now() + timedelta(days=30)
            )
    
    def test_thread_creation_basic(self):
        """Test basic thread creation"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Test Thread'
        )
        
        self.assertEqual(thread.client, self.client_user)
        self.assertEqual(thread.subject, 'Test Thread')
        self.assertEqual(thread.status, 'active')  # Default status
        self.assertEqual(thread.priority, 'normal')  # Default priority
        self.assertIsNone(thread.event)
        self.assertIsNone(thread.assigned_admin)
    
    def test_thread_with_event(self):
        """Test thread creation with associated event"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            event=self.mock_event,
            subject='Event Thread'
        )
        
        self.assertEqual(thread.event, self.mock_event)
        self.assertEqual(thread.client, self.client_user)
    
    def test_thread_validation_event_client_mismatch(self):
        """Test validation that event must belong to same client"""
        other_client = User.objects.create_user(
            email='other@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        thread = MessageThread(
            client=other_client,
            event=self.mock_event  # Event belongs to different client
        )
        
        with self.assertRaises(ValidationError):
            thread.clean()
    
    def test_thread_admin_assignment(self):
        """Test admin assignment to thread"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            assigned_admin=self.admin_user
        )
        
        self.assertEqual(thread.assigned_admin, self.admin_user)
    
    def test_thread_status_choices(self):
        """Test valid status choices"""
        valid_statuses = ['active', 'waiting', 'resolved']
        
        for status in valid_statuses:
            thread = MessageThread.objects.create(
                client=self.client_user,
                status=status
            )
            self.assertEqual(thread.status, status)
    
    def test_thread_priority_choices(self):
        """Test valid priority choices"""
        valid_priorities = ['low', 'normal', 'high', 'urgent']
        
        for priority in valid_priorities:
            thread = MessageThread.objects.create(
                client=self.client_user,
                priority=priority
            )
            self.assertEqual(thread.priority, priority)
    
    def test_thread_string_representation(self):
        """Test thread string representation"""
        # General thread
        general_thread = MessageThread.objects.create(
            client=self.client_user,
            subject='General Discussion'
        )
        
        expected_str = f"General Thread - {self.client_user.get_display_name()}"
        self.assertEqual(str(general_thread), expected_str)
        
        # Event thread
        event_thread = MessageThread.objects.create(
            client=self.client_user,
            event=self.mock_event
        )
        
        expected_str = f"Thread for {self.mock_event.name} - {self.client_user.get_display_name()}"
        self.assertEqual(str(event_thread), expected_str)
    
    def test_thread_properties(self):
        """Test thread computed properties"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            event=self.mock_event
        )
        
        self.assertEqual(thread.event_name, self.mock_event.name)
        self.assertEqual(thread.event_date, self.mock_event.start_date.isoformat())
        self.assertEqual(thread.client_name, self.client_user.get_display_name())
    
    def test_unread_count_for_user(self):
        """Test unread message count calculation"""
        thread = MessageThread.objects.create(client=self.client_user)
        
        # Create messages
        msg1 = Message.objects.create(
            thread=thread,
            sender=self.admin_user,
            content='Message 1'
        )
        msg2 = Message.objects.create(
            thread=thread,
            sender=self.admin_user,
            content='Message 2'
        )
        
        # Initially all messages are unread for client
        self.assertEqual(thread.get_unread_count_for_user(self.client_user), 2)
        
        # Mark one message as read
        msg1.mark_as_read_by(self.client_user)
        self.assertEqual(thread.get_unread_count_for_user(self.client_user), 1)
        
        # Mark all as read
        msg2.mark_as_read_by(self.client_user)
        self.assertEqual(thread.get_unread_count_for_user(self.client_user), 0)
    
    def test_update_last_message_cache(self):
        """Test last message cache update"""
        thread = MessageThread.objects.create(client=self.client_user)
        
        message = Message.objects.create(
            thread=thread,
            sender=self.admin_user,
            content='Test message for cache update'
        )
        
        # Cache should be updated automatically on message save
        thread.refresh_from_db()
        self.assertEqual(thread.last_message_at, message.created_at)
        self.assertEqual(thread.last_message_content, message.content[:200])
        self.assertEqual(thread.last_message_sender_name, self.admin_user.get_display_name())
    
    def test_add_participant(self):
        """Test adding participants to thread"""
        thread = MessageThread.objects.create(client=self.client_user)
        
        participant = thread.add_participant(self.admin_user)
        
        self.assertIsInstance(participant, ThreadParticipant)
        self.assertEqual(participant.thread, thread)
        self.assertEqual(participant.user, self.admin_user)
        self.assertTrue(participant.is_active)
    
    def test_remove_participant(self):
        """Test removing participants from thread"""
        thread = MessageThread.objects.create(client=self.client_user)
        thread.add_participant(self.admin_user)
        
        # Verify participant exists
        self.assertTrue(
            ThreadParticipant.objects.filter(
                thread=thread, user=self.admin_user
            ).exists()
        )
        
        # Remove participant
        thread.remove_participant(self.admin_user)
        
        # Verify participant removed
        self.assertFalse(
            ThreadParticipant.objects.filter(
                thread=thread, user=self.admin_user
            ).exists()
        )


class ThreadParticipantModelTest(TestCase):
    """Test ThreadParticipant model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.thread = MessageThread.objects.create(client=self.client_user)
    
    def test_participant_creation(self):
        """Test participant creation"""
        participant = ThreadParticipant.objects.create(
            thread=self.thread,
            user=self.admin_user
        )
        
        self.assertEqual(participant.thread, self.thread)
        self.assertEqual(participant.user, self.admin_user)
        self.assertTrue(participant.is_active)
        self.assertTrue(participant.notifications_enabled)
        self.assertIsNotNone(participant.joined_at)
    
    def test_participant_unique_constraint(self):
        """Test unique constraint on thread-user combination"""
        ThreadParticipant.objects.create(
            thread=self.thread,
            user=self.admin_user
        )
        
        # Attempt to create duplicate should fail
        with self.assertRaises(IntegrityError):
            ThreadParticipant.objects.create(
                thread=self.thread,
                user=self.admin_user
            )
    
    def test_participant_string_representation(self):
        """Test participant string representation"""
        participant = ThreadParticipant.objects.create(
            thread=self.thread,
            user=self.admin_user
        )
        
        expected_str = f"{self.admin_user.get_display_name()} in {self.thread}"
        self.assertEqual(str(participant), expected_str)


class MessageModelTest(TestCase):
    """Test Message model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.thread = MessageThread.objects.create(client=self.client_user)
    
    def test_message_creation_basic(self):
        """Test basic message creation"""
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Test message content'
        )
        
        self.assertEqual(message.thread, self.thread)
        self.assertEqual(message.sender, self.admin_user)
        self.assertEqual(message.content, 'Test message content')
        self.assertEqual(message.message_type, 'text')  # Default type
        self.assertFalse(message.is_internal_note)
        self.assertIsNone(message.edited_at)
        self.assertEqual(message.original_content, '')
    
    def test_message_types(self):
        """Test different message types"""
        types = ['text', 'system', 'file', 'event_update']
        
        for msg_type in types:
            message = Message.objects.create(
                thread=self.thread,
                sender=self.admin_user,
                content=f'Test {msg_type} message',
                message_type=msg_type
            )
            self.assertEqual(message.message_type, msg_type)
    
    def test_internal_note_validation(self):
        """Test internal note can only be sent by admins"""
        # Admin should be able to send internal note
        admin_note = Message(
            thread=self.thread,
            sender=self.admin_user,
            content='Admin internal note',
            is_internal_note=True
        )
        admin_note.clean()  # Should not raise
        
        # Client should not be able to send internal note
        client_note = Message(
            thread=self.thread,
            sender=self.client_user,
            content='Client trying internal note',
            is_internal_note=True
        )
        
        with self.assertRaises(ValidationError):
            client_note.clean()
    
    def test_message_reply_threading(self):
        """Test message reply threading"""
        parent_message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Parent message'
        )
        
        reply_message = Message.objects.create(
            thread=self.thread,
            sender=self.client_user,
            content='Reply to parent',
            parent_message=parent_message
        )
        
        self.assertEqual(reply_message.parent_message, parent_message)
        self.assertIn(reply_message, parent_message.replies.all())
    
    def test_message_edit_tracking(self):
        """Test message edit tracking"""
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Original content'
        )
        
        # Edit message
        original_content = message.content
        message.content = 'Edited content'
        message.original_content = original_content
        message.edited_at = timezone.now()
        message.save()
        
        self.assertEqual(message.content, 'Edited content')
        self.assertEqual(message.original_content, 'Original content')
        self.assertIsNotNone(message.edited_at)
    
    def test_message_string_representation(self):
        """Test message string representation"""
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='This is a long message that should be truncated in the string representation'
        )
        
        expected_str = f"Message from {self.admin_user.get_display_name()}: This is a long message that should be truncated..."
        self.assertEqual(str(message), expected_str)
    
    def test_mark_as_read_by(self):
        """Test marking message as read"""
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Test message'
        )
        
        # Message should not be read initially
        self.assertFalse(message.is_read_by(self.client_user))
        
        # Mark as read
        receipt = message.mark_as_read_by(self.client_user)
        
        self.assertIsInstance(receipt, MessageReadReceipt)
        self.assertTrue(message.is_read_by(self.client_user))
    
    def test_message_auto_read_by_sender(self):
        """Test that message is automatically marked as read by sender"""
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Test message'
        )
        
        # Check if sender auto-read logic exists in view/service layer
        # This test would need integration with the service layer
        pass


class MessageAttachmentModelTest(TestCase):
    """Test MessageAttachment model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.thread = MessageThread.objects.create(client=self.client_user)
        self.message = Message.objects.create(
            thread=self.thread,
            sender=self.client_user,
            content='Message with attachment'
        )
    
    def test_attachment_creation(self):
        """Test attachment creation"""
        # Create a test file
        test_file = SimpleUploadedFile(
            "test.txt",
            b"Test file content",
            content_type="text/plain"
        )
        
        attachment = MessageAttachment.objects.create(
            message=self.message,
            filename='test.txt',
            file=test_file,
            uploaded_by=self.client_user
        )
        
        self.assertEqual(attachment.message, self.message)
        self.assertEqual(attachment.filename, 'test.txt')
        self.assertEqual(attachment.uploaded_by, self.client_user)
        self.assertIsNotNone(attachment.file)
    
    def test_attachment_metadata_auto_population(self):
        """Test automatic population of file metadata"""
        test_file = SimpleUploadedFile(
            "test.txt",
            b"Test file content",
            content_type="text/plain"
        )
        
        attachment = MessageAttachment.objects.create(
            message=self.message,
            file=test_file,
            uploaded_by=self.client_user
        )
        
        # File metadata should be auto-populated
        self.assertGreater(attachment.file_size, 0)
        self.assertEqual(attachment.file_type, 'text/plain')
        self.assertEqual(attachment.filename, 'test.txt')
    
    def test_attachment_string_representation(self):
        """Test attachment string representation"""
        test_file = SimpleUploadedFile(
            "document.pdf",
            b"PDF content",
            content_type="application/pdf"
        )
        
        attachment = MessageAttachment.objects.create(
            message=self.message,
            filename='document.pdf',
            file=test_file,
            uploaded_by=self.client_user
        )
        
        self.assertEqual(str(attachment), "Attachment: document.pdf")
    
    def test_file_url_property(self):
        """Test file URL property"""
        test_file = SimpleUploadedFile(
            "test.txt",
            b"Test content",
            content_type="text/plain"
        )
        
        attachment = MessageAttachment.objects.create(
            message=self.message,
            file=test_file,
            uploaded_by=self.client_user
        )
        
        # Should have a file URL
        self.assertIsNotNone(attachment.file_url)
        self.assertTrue(attachment.file_url.endswith('.txt'))


class MessageReadReceiptModelTest(TestCase):
    """Test MessageReadReceipt model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.thread = MessageThread.objects.create(client=self.client_user)
        self.message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Test message'
        )
    
    def test_read_receipt_creation(self):
        """Test read receipt creation"""
        receipt = MessageReadReceipt.objects.create(
            message=self.message,
            user=self.client_user
        )
        
        self.assertEqual(receipt.message, self.message)
        self.assertEqual(receipt.user, self.client_user)
        self.assertIsNotNone(receipt.read_at)
    
    def test_read_receipt_unique_constraint(self):
        """Test unique constraint on message-user combination"""
        MessageReadReceipt.objects.create(
            message=self.message,
            user=self.client_user
        )
        
        # Attempt to create duplicate should fail
        with self.assertRaises(IntegrityError):
            MessageReadReceipt.objects.create(
                message=self.message,
                user=self.client_user
            )
    
    def test_read_receipt_string_representation(self):
        """Test read receipt string representation"""
        receipt = MessageReadReceipt.objects.create(
            message=self.message,
            user=self.client_user
        )
        
        expected_str = f"{self.client_user.get_display_name()} read message {self.message.id}"
        self.assertEqual(str(receipt), expected_str)


class TypingIndicatorModelTest(TestCase):
    """Test TypingIndicator model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.thread = MessageThread.objects.create(client=self.client_user)
    
    def test_typing_indicator_creation(self):
        """Test typing indicator creation"""
        indicator = TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user,
            is_typing=True
        )
        
        self.assertEqual(indicator.thread, self.thread)
        self.assertEqual(indicator.user, self.client_user)
        self.assertTrue(indicator.is_typing)
        self.assertIsNotNone(indicator.last_activity)
    
    def test_typing_indicator_unique_constraint(self):
        """Test unique constraint on thread-user combination"""
        TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user
        )
        
        # Attempt to create duplicate should fail
        with self.assertRaises(IntegrityError):
            TypingIndicator.objects.create(
                thread=self.thread,
                user=self.client_user
            )
    
    def test_typing_indicator_string_representation(self):
        """Test typing indicator string representation"""
        # Test typing status
        typing_indicator = TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user,
            is_typing=True
        )
        
        expected_str = f"{self.client_user.get_display_name()} typing in {self.thread}"
        self.assertEqual(str(typing_indicator), expected_str)
        
        # Test stopped typing status
        stopped_indicator = TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user,
            is_typing=False
        )
        
        expected_str = f"{self.client_user.get_display_name()} stopped typing in {self.thread}"
        self.assertEqual(str(stopped_indicator), expected_str)
    
    def test_cleanup_stale_indicators(self):
        """Test cleanup of stale typing indicators"""
        # Create old typing indicator
        old_time = timezone.now() - timedelta(minutes=10)
        old_indicator = TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user
        )
        old_indicator.last_activity = old_time
        old_indicator.save()
        
        # Create recent typing indicator
        recent_indicator = TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user
        )
        
        # Cleanup stale indicators (older than 5 minutes)
        deleted_count, _ = TypingIndicator.cleanup_stale_indicators(older_than_minutes=5)
        
        self.assertEqual(deleted_count, 1)
        self.assertFalse(TypingIndicator.objects.filter(id=old_indicator.id).exists())
        self.assertTrue(TypingIndicator.objects.filter(id=recent_indicator.id).exists())


class MessageThreadManagerTest(TestCase):
    """Test MessageThread custom manager functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        # Create test threads
        self.active_thread = MessageThread.objects.create(
            client=self.client_user,
            status='active',
            priority='normal'
        )
        
        self.urgent_thread = MessageThread.objects.create(
            client=self.client_user,
            status='active',
            priority='urgent',
            assigned_admin=self.admin_user
        )
        
        self.resolved_thread = MessageThread.objects.create(
            client=self.client_user,
            status='resolved'
        )
    
    def test_for_client_filter(self):
        """Test filtering threads for specific client"""
        client_threads = MessageThread.objects.for_client(self.client_user.id)
        
        self.assertEqual(client_threads.count(), 3)
        for thread in client_threads:
            self.assertEqual(thread.client, self.client_user)
    
    def test_active_filter(self):
        """Test filtering active threads"""
        active_threads = MessageThread.objects.active()
        
        self.assertEqual(active_threads.count(), 2)
        for thread in active_threads:
            self.assertEqual(thread.status, 'active')
    
    def test_by_priority_filter(self):
        """Test filtering by priority"""
        urgent_threads = MessageThread.objects.by_priority('urgent')
        
        self.assertEqual(urgent_threads.count(), 1)
        self.assertEqual(urgent_threads.first(), self.urgent_thread)
    
    def test_assigned_to_filter(self):
        """Test filtering threads assigned to specific admin"""
        assigned_threads = MessageThread.objects.assigned_to(self.admin_user.id)
        
        self.assertEqual(assigned_threads.count(), 1)
        self.assertEqual(assigned_threads.first(), self.urgent_thread)
    
    def test_with_unread_counts(self):
        """Test annotation with unread counts"""
        # Create messages
        Message.objects.create(
            thread=self.active_thread,
            sender=self.admin_user,
            content='Unread message 1'
        )
        Message.objects.create(
            thread=self.active_thread,
            sender=self.admin_user,
            content='Unread message 2'
        )
        
        threads_with_counts = MessageThread.objects.with_unread_counts(self.client_user.id)
        
        active_thread_with_count = threads_with_counts.get(id=self.active_thread.id)
        self.assertEqual(active_thread_with_count.unread_count, 2)


class ModelIntegrationTest(TransactionTestCase):
    """Integration tests for model interactions"""
    
    def setUp(self):
        """Set up test data"""
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
    
    def test_complete_messaging_flow(self):
        """Test complete messaging flow with all models"""
        # Create thread
        thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Complete Flow Test',
            assigned_admin=self.admin_user
        )
        
        # Add participants
        client_participant = thread.add_participant(self.client_user)
        admin_participant = thread.add_participant(self.admin_user)
        
        self.assertEqual(thread.participants.count(), 2)
        
        # Send messages
        admin_message = Message.objects.create(
            thread=thread,
            sender=self.admin_user,
            content='Hello from admin'
        )
        
        client_message = Message.objects.create(
            thread=thread,
            sender=self.client_user,
            content='Hello from client'
        )
        
        # Add attachment
        test_file = SimpleUploadedFile(
            "test.txt",
            b"Test content",
            content_type="text/plain"
        )
        
        attachment = MessageAttachment.objects.create(
            message=client_message,
            file=test_file,
            uploaded_by=self.client_user
        )
        
        # Mark messages as read
        admin_message.mark_as_read_by(self.client_user)
        client_message.mark_as_read_by(self.admin_user)
        
        # Add typing indicator
        typing_indicator = TypingIndicator.objects.create(
            thread=thread,
            user=self.client_user,
            is_typing=True
        )
        
        # Verify complete setup
        self.assertEqual(thread.messages.count(), 2)
        self.assertEqual(MessageAttachment.objects.count(), 1)
        self.assertEqual(MessageReadReceipt.objects.count(), 2)
        self.assertEqual(TypingIndicator.objects.count(), 1)
        
        # Test thread cache update
        thread.refresh_from_db()
        self.assertEqual(thread.last_message_at, client_message.created_at)
        self.assertIn('Hello from client', thread.last_message_content)
    
    def test_cascade_deletions(self):
        """Test cascade deletion behavior"""
        thread = MessageThread.objects.create(client=self.client_user)
        
        message = Message.objects.create(
            thread=thread,
            sender=self.admin_user,
            content='Test message'
        )
        
        # Add related objects
        message.mark_as_read_by(self.client_user)
        TypingIndicator.objects.create(thread=thread, user=self.client_user)
        
        # Delete thread should cascade
        thread_id = thread.id
        thread.delete()
        
        # Verify cascades
        self.assertFalse(Message.objects.filter(thread_id=thread_id).exists())
        self.assertFalse(MessageReadReceipt.objects.filter(message_id=message.id).exists())
        self.assertFalse(TypingIndicator.objects.filter(thread_id=thread_id).exists())
    
    def test_performance_optimizations(self):
        """Test performance optimizations in manager"""
        # Create test data
        threads = []
        for i in range(5):
            thread = MessageThread.objects.create(
                client=self.client_user,
                assigned_admin=self.admin_user
            )
            threads.append(thread)
            
            # Add messages
            for j in range(3):
                Message.objects.create(
                    thread=thread,
                    sender=self.admin_user,
                    content=f'Message {j} in thread {i}'
                )
        
        # Test optimized queryset
        with self.assertNumQueries(1):  # Should be optimized with select_related
            threads_with_details = list(MessageThread.objects.with_details())
            
            # Access related fields (should not trigger additional queries)
            for thread in threads_with_details:
                _ = thread.client.email
                _ = thread.assigned_admin.email if thread.assigned_admin else None