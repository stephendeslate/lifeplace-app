"""
Comprehensive test suite for messaging domain services

Tests business logic, service methods, integrations, and
complex workflows in the messaging service layer.
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, call
from django.test import TestCase, TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from channels.layers import get_channel_layer

from ..models import (
    MessageThread,
    ThreadParticipant,
    Message,
    MessageAttachment,
    MessageReadReceipt,
    TypingIndicator
)
from ..services import MessagingService, NotificationService

User = get_user_model()


class MessagingServiceTest(TestCase):
    """Test MessagingService functionality"""
    
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
        
        self.other_client = User.objects.create_user(
            email='other@test.com',
            password='testpass123',
            role='CLIENT',
            first_name='Other',
            last_name='Client'
        )
        
        self.thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Test Thread'
        )
    
    def test_send_message_basic(self):
        """Test basic message sending"""
        message = MessagingService.send_message(
            thread=self.thread,
            sender=self.admin_user,
            content='Test message from service',
            message_type='text'
        )
        
        self.assertIsInstance(message, Message)
        self.assertEqual(message.thread, self.thread)
        self.assertEqual(message.sender, self.admin_user)
        self.assertEqual(message.content, 'Test message from service')
        self.assertEqual(message.message_type, 'text')
        self.assertFalse(message.is_internal_note)
    
    def test_send_internal_note(self):
        """Test sending internal note"""
        message = MessagingService.send_message(
            thread=self.thread,
            sender=self.admin_user,
            content='Internal admin note',
            is_internal_note=True
        )
        
        self.assertTrue(message.is_internal_note)
    
    def test_send_message_with_parent(self):
        """Test sending reply message"""
        parent_message = Message.objects.create(
            thread=self.thread,
            sender=self.client_user,
            content='Original message'
        )
        
        reply_message = MessagingService.send_message(
            thread=self.thread,
            sender=self.admin_user,
            content='Reply to original',
            parent_message=parent_message
        )
        
        self.assertEqual(reply_message.parent_message, parent_message)
    
    def test_send_message_validation(self):
        """Test message sending validation"""
        # Test empty content
        with self.assertRaises(ValueError):
            MessagingService.send_message(
                thread=self.thread,
                sender=self.admin_user,
                content=''
            )
        
        # Test None content
        with self.assertRaises(ValueError):
            MessagingService.send_message(
                thread=self.thread,
                sender=self.admin_user,
                content=None
            )
        
        # Test overly long content
        long_content = 'A' * 10000
        with self.assertRaises(ValueError):
            MessagingService.send_message(
                thread=self.thread,
                sender=self.admin_user,
                content=long_content
            )
    
    def test_send_message_permissions(self):
        """Test message sending permissions"""
        # Client should not be able to send internal notes
        with self.assertRaises(PermissionError):
            MessagingService.send_message(
                thread=self.thread,
                sender=self.client_user,
                content='Client trying internal note',
                is_internal_note=True
            )
    
    def test_thread_last_message_update(self):
        """Test thread last message cache update"""
        message = MessagingService.send_message(
            thread=self.thread,
            sender=self.admin_user,
            content='Test cache update'
        )
        
        self.thread.refresh_from_db()
        self.assertEqual(self.thread.last_message_at, message.created_at)
        self.assertEqual(self.thread.last_message_content, 'Test cache update')
        self.assertEqual(self.thread.last_message_sender_name, self.admin_user.get_display_name())
    
    def test_create_thread_basic(self):
        """Test basic thread creation"""
        thread = MessagingService.create_thread(
            client=self.other_client,
            subject='Service Created Thread',
            created_by=self.admin_user
        )
        
        self.assertIsInstance(thread, MessageThread)
        self.assertEqual(thread.client, self.other_client)
        self.assertEqual(thread.subject, 'Service Created Thread')
        self.assertEqual(thread.status, 'active')
    
    def test_create_thread_with_admin_assignment(self):
        """Test thread creation with admin assignment"""
        thread = MessagingService.create_thread(
            client=self.other_client,
            subject='Assigned Thread',
            created_by=self.admin_user,
            assigned_admin=self.admin_user
        )
        
        self.assertEqual(thread.assigned_admin, self.admin_user)
        
        # Should automatically add admin as participant
        self.assertTrue(
            ThreadParticipant.objects.filter(
                thread=thread,
                user=self.admin_user
            ).exists()
        )
    
    def test_create_thread_with_event(self):
        """Test thread creation with event association"""
        # Mock event (would normally be from events app)
        mock_event = MagicMock()
        mock_event.client = self.client_user
        mock_event.name = 'Test Event'
        
        thread = MessagingService.create_thread(
            client=self.client_user,
            subject='Event Thread',
            created_by=self.admin_user,
            event=mock_event
        )
        
        self.assertEqual(thread.event, mock_event)
    
    def test_mark_thread_read(self):
        """Test marking entire thread as read"""
        # Create messages
        message1 = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Message 1'
        )
        message2 = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Message 2'
        )
        internal_message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Internal note',
            is_internal_note=True
        )
        
        # Mark thread as read by client
        marked_count = MessagingService.mark_thread_read(self.thread, self.client_user)
        
        # Should mark 2 regular messages (not internal note)
        self.assertEqual(marked_count, 2)
        
        # Verify read receipts created
        self.assertTrue(message1.is_read_by(self.client_user))
        self.assertTrue(message2.is_read_by(self.client_user))
        self.assertFalse(internal_message.is_read_by(self.client_user))
    
    def test_mark_thread_read_admin(self):
        """Test admin marking thread as read (includes internal notes)"""
        # Create messages
        message1 = Message.objects.create(
            thread=self.thread,
            sender=self.client_user,
            content='Client message'
        )
        internal_message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Internal note',
            is_internal_note=True
        )
        
        # Mark thread as read by admin
        marked_count = MessagingService.mark_thread_read(self.thread, self.admin_user)
        
        # Should mark all messages including internal notes
        self.assertEqual(marked_count, 2)
        
        self.assertTrue(message1.is_read_by(self.admin_user))
        self.assertTrue(internal_message.is_read_by(self.admin_user))
    
    def test_get_thread_participants(self):
        """Test getting thread participants"""
        # Add participants
        self.thread.add_participant(self.admin_user)
        self.thread.add_participant(self.client_user)
        
        participants = MessagingService.get_thread_participants(self.thread)
        
        self.assertEqual(len(participants), 2)
        participant_users = [p.user for p in participants]
        self.assertIn(self.admin_user, participant_users)
        self.assertIn(self.client_user, participant_users)
    
    def test_add_thread_participant(self):
        """Test adding participant to thread"""
        participant = MessagingService.add_thread_participant(
            self.thread,
            self.admin_user,
            added_by=self.admin_user
        )
        
        self.assertIsInstance(participant, ThreadParticipant)
        self.assertEqual(participant.thread, self.thread)
        self.assertEqual(participant.user, self.admin_user)
        self.assertTrue(participant.is_active)
    
    def test_remove_thread_participant(self):
        """Test removing participant from thread"""
        # Add participant first
        participant = self.thread.add_participant(self.admin_user)
        
        success = MessagingService.remove_thread_participant(
            self.thread,
            self.admin_user,
            removed_by=self.admin_user
        )
        
        self.assertTrue(success)
        self.assertFalse(
            ThreadParticipant.objects.filter(
                thread=self.thread,
                user=self.admin_user,
                is_active=True
            ).exists()
        )
    
    def test_get_unread_count(self):
        """Test getting unread message count"""
        # Create messages
        message1 = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Unread message 1'
        )
        message2 = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Unread message 2'
        )
        
        # Initially all unread
        unread_count = MessagingService.get_unread_count(self.thread, self.client_user)
        self.assertEqual(unread_count, 2)
        
        # Mark one as read
        message1.mark_as_read_by(self.client_user)
        unread_count = MessagingService.get_unread_count(self.thread, self.client_user)
        self.assertEqual(unread_count, 1)
    
    def test_update_typing_indicator(self):
        """Test updating typing indicator"""
        # Start typing
        indicator = MessagingService.update_typing_indicator(
            self.thread,
            self.client_user,
            is_typing=True
        )
        
        self.assertIsInstance(indicator, TypingIndicator)
        self.assertTrue(indicator.is_typing)
        
        # Stop typing
        result = MessagingService.update_typing_indicator(
            self.thread,
            self.client_user,
            is_typing=False
        )
        
        # Should delete indicator when stopping
        self.assertIsNone(result)
        self.assertFalse(
            TypingIndicator.objects.filter(
                thread=self.thread,
                user=self.client_user
            ).exists()
        )
    
    def test_get_typing_users(self):
        """Test getting users currently typing"""
        # Add typing indicators
        TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user,
            is_typing=True
        )
        TypingIndicator.objects.create(
            thread=self.thread,
            user=self.admin_user,
            is_typing=False
        )
        
        typing_users = MessagingService.get_typing_users(self.thread)
        
        self.assertEqual(len(typing_users), 1)
        self.assertEqual(typing_users[0].user, self.client_user)
    
    def test_cleanup_stale_typing_indicators(self):
        """Test cleanup of stale typing indicators"""
        # Create old typing indicator
        old_indicator = TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user,
            is_typing=True
        )
        old_indicator.last_activity = timezone.now() - timedelta(minutes=10)
        old_indicator.save()
        
        # Create recent typing indicator
        recent_indicator = TypingIndicator.objects.create(
            thread=self.thread,
            user=self.admin_user,
            is_typing=True
        )
        
        # Clean up stale indicators
        cleaned_count = MessagingService.cleanup_stale_typing_indicators(minutes=5)
        
        self.assertEqual(cleaned_count, 1)
        self.assertFalse(TypingIndicator.objects.filter(id=old_indicator.id).exists())
        self.assertTrue(TypingIndicator.objects.filter(id=recent_indicator.id).exists())
    
    @patch('channels.layers.get_channel_layer')
    def test_broadcast_new_message(self, mock_get_channel_layer):
        """Test broadcasting new message"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Broadcast test message'
        )
        
        MessagingService.broadcast_new_message(message)
        
        # Should call group_send for thread group
        mock_channel_layer.group_send.assert_called()
        call_args = mock_channel_layer.group_send.call_args
        
        self.assertEqual(call_args[0][0], f'thread_{self.thread.id}')
        self.assertEqual(call_args[0][1]['type'], 'messaging_update')
    
    @patch('channels.layers.get_channel_layer')
    def test_broadcast_message_edited(self, mock_get_channel_layer):
        """Test broadcasting message edit"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Original content'
        )
        
        # Edit message
        message.content = 'Edited content'
        message.edited_at = timezone.now()
        message.save()
        
        MessagingService.broadcast_message_edited(message)
        
        mock_channel_layer.group_send.assert_called()
        call_args = mock_channel_layer.group_send.call_args
        
        self.assertEqual(call_args[0][1]['data']['action'], 'message_edited')
    
    @patch('channels.layers.get_channel_layer')
    def test_broadcast_message_deleted(self, mock_get_channel_layer):
        """Test broadcasting message deletion"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Message to delete'
        )
        message_id = message.id
        
        MessagingService.broadcast_message_deleted(message)
        
        mock_channel_layer.group_send.assert_called()
        call_args = mock_channel_layer.group_send.call_args
        
        self.assertEqual(call_args[0][1]['data']['action'], 'message_deleted')
        self.assertEqual(call_args[0][1]['data']['message_id'], str(message_id))
    
    @patch('channels.layers.get_channel_layer')
    def test_broadcast_typing_status(self, mock_get_channel_layer):
        """Test broadcasting typing status"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        indicator = TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user,
            is_typing=True
        )
        
        MessagingService.broadcast_typing_status(indicator)
        
        mock_channel_layer.group_send.assert_called()
        call_args = mock_channel_layer.group_send.call_args
        
        self.assertEqual(call_args[0][1]['data']['action'], 'typing_indicator')
    
    @patch('channels.layers.get_channel_layer')
    def test_broadcast_message_read(self, mock_get_channel_layer):
        """Test broadcasting message read receipt"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Message to mark read'
        )
        
        MessagingService.broadcast_message_read(message, self.client_user)
        
        mock_channel_layer.group_send.assert_called()
        call_args = mock_channel_layer.group_send.call_args
        
        self.assertEqual(call_args[0][1]['data']['action'], 'message_read')
    
    @patch('channels.layers.get_channel_layer')
    def test_broadcast_thread_read(self, mock_get_channel_layer):
        """Test broadcasting thread read"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        MessagingService.broadcast_thread_read(self.thread, self.client_user)
        
        mock_channel_layer.group_send.assert_called()
        call_args = mock_channel_layer.group_send.call_args
        
        self.assertEqual(call_args[0][1]['data']['action'], 'thread_read')


class NotificationServiceTest(TestCase):
    """Test NotificationService functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Notification Test Thread'
        )
    
    @patch('channels.layers.get_channel_layer')
    def test_notify_new_message(self, mock_get_channel_layer):
        """Test new message notification"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='New message notification test'
        )
        
        NotificationService.notify_new_message(message)
        
        # Should send notification to thread participants
        mock_channel_layer.group_send.assert_called()
    
    @patch('channels.layers.get_channel_layer')
    def test_notify_thread_created(self, mock_get_channel_layer):
        """Test thread creation notification"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        NotificationService.notify_thread_created(self.thread, self.admin_user)
        
        mock_channel_layer.group_send.assert_called()
    
    @patch('channels.layers.get_channel_layer')
    def test_notify_thread_assigned(self, mock_get_channel_layer):
        """Test thread assignment notification"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        self.thread.assigned_admin = self.admin_user
        self.thread.save()
        
        NotificationService.notify_thread_assigned(self.thread, None)
        
        mock_channel_layer.group_send.assert_called()
    
    @patch('channels.layers.get_channel_layer')
    def test_notify_thread_status_changed(self, mock_get_channel_layer):
        """Test thread status change notification"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        old_status = self.thread.status
        self.thread.status = 'resolved'
        self.thread.save()
        
        NotificationService.notify_thread_status_changed(self.thread, old_status)
        
        mock_channel_layer.group_send.assert_called()
    
    @patch('channels.layers.get_channel_layer')
    def test_notify_thread_marked_urgent(self, mock_get_channel_layer):
        """Test urgent thread notification"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        self.thread.priority = 'urgent'
        self.thread.save()
        
        NotificationService.notify_thread_marked_urgent(self.thread)
        
        mock_channel_layer.group_send.assert_called()
    
    @patch('channels.layers.get_channel_layer')
    def test_notify_thread_resolved(self, mock_get_channel_layer):
        """Test thread resolution notification"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        self.thread.status = 'resolved'
        self.thread.save()
        
        NotificationService.notify_thread_resolved(self.thread)
        
        mock_channel_layer.group_send.assert_called()
    
    @patch('channels.layers.get_channel_layer')
    def test_notify_thread_reopened(self, mock_get_channel_layer):
        """Test thread reopening notification"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        self.thread.status = 'active'
        self.thread.save()
        
        NotificationService.notify_thread_reopened(self.thread)
        
        mock_channel_layer.group_send.assert_called()
    
    def test_get_notification_recipients(self):
        """Test getting notification recipients for thread"""
        # Add participants
        self.thread.add_participant(self.client_user)
        self.thread.add_participant(self.admin_user)
        
        recipients = NotificationService.get_notification_recipients(self.thread)
        
        self.assertEqual(len(recipients), 2)
        recipient_users = [p.user for p in recipients]
        self.assertIn(self.client_user, recipient_users)
        self.assertIn(self.admin_user, recipient_users)
    
    def test_should_notify_user(self):
        """Test notification filtering logic"""
        message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Test message'
        )
        
        # Should notify client (message recipient)
        should_notify_client = NotificationService.should_notify_user(
            self.client_user,
            message
        )
        self.assertTrue(should_notify_client)
        
        # Should not notify sender
        should_notify_sender = NotificationService.should_notify_user(
            self.admin_user,
            message
        )
        self.assertFalse(should_notify_sender)
    
    def test_should_notify_internal_note(self):
        """Test notification filtering for internal notes"""
        internal_message = Message.objects.create(
            thread=self.thread,
            sender=self.admin_user,
            content='Internal note',
            is_internal_note=True
        )
        
        # Should not notify client about internal notes
        should_notify_client = NotificationService.should_notify_user(
            self.client_user,
            internal_message
        )
        self.assertFalse(should_notify_client)
        
        # Should notify other admin about internal notes
        other_admin = User.objects.create_user(
            email='other_admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        should_notify_admin = NotificationService.should_notify_user(
            other_admin,
            internal_message
        )
        self.assertTrue(should_notify_admin)


class MessagingServiceIntegrationTest(TransactionTestCase):
    """Integration tests for messaging services"""
    
    def setUp(self):
        """Set up test data"""
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
    
    @patch('channels.layers.get_channel_layer')
    def test_complete_messaging_workflow(self, mock_get_channel_layer):
        """Test complete messaging workflow with services"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        # 1. Create thread
        thread = MessagingService.create_thread(
            client=self.client_user,
            subject='Service Integration Test',
            created_by=self.admin_user,
            assigned_admin=self.admin_user
        )
        
        # 2. Send initial message
        message1 = MessagingService.send_message(
            thread=thread,
            sender=self.admin_user,
            content='Welcome to our support system!'
        )
        
        # 3. Client responds
        message2 = MessagingService.send_message(
            thread=thread,
            sender=self.client_user,
            content='Thank you for the help!'
        )
        
        # 4. Mark messages as read
        read_count = MessagingService.mark_thread_read(thread, self.client_user)
        
        # 5. Verify state
        self.assertEqual(thread.messages.count(), 2)
        self.assertEqual(read_count, 1)  # Only admin message marked read by client
        self.assertTrue(message1.is_read_by(self.client_user))
        
        # Verify broadcasts were made
        self.assertGreater(mock_channel_layer.group_send.call_count, 0)
    
    def test_thread_lifecycle_with_services(self):
        """Test complete thread lifecycle using services"""
        # Create thread
        thread = MessagingService.create_thread(
            client=self.client_user,
            subject='Lifecycle Test',
            created_by=self.admin_user
        )
        
        # Add participants
        MessagingService.add_thread_participant(
            thread,
            self.admin_user,
            added_by=self.admin_user
        )
        
        # Send messages
        for i in range(5):
            MessagingService.send_message(
                thread=thread,
                sender=self.admin_user if i % 2 else self.client_user,
                content=f'Message {i + 1}'
            )
        
        # Mark some as read
        messages = thread.messages.all()[:3]
        for message in messages:
            message.mark_as_read_by(self.client_user)
        
        # Test statistics
        unread_count = MessagingService.get_unread_count(thread, self.client_user)
        participants = MessagingService.get_thread_participants(thread)
        
        self.assertEqual(thread.messages.count(), 5)
        self.assertEqual(len(participants), 1)  # Only admin added as participant
        self.assertGreater(unread_count, 0)
    
    @patch('channels.layers.get_channel_layer')
    def test_real_time_features_integration(self, mock_get_channel_layer):
        """Test real-time features integration"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        thread = MessagingService.create_thread(
            client=self.client_user,
            subject='Real-time Test',
            created_by=self.admin_user
        )
        
        # Test typing indicators
        indicator = MessagingService.update_typing_indicator(
            thread,
            self.client_user,
            is_typing=True
        )
        self.assertIsNotNone(indicator)
        
        # Send message (should clear typing)
        message = MessagingService.send_message(
            thread=thread,
            sender=self.client_user,
            content='Real-time message'
        )
        
        # Stop typing
        result = MessagingService.update_typing_indicator(
            thread,
            self.client_user,
            is_typing=False
        )
        self.assertIsNone(result)
        
        # Verify broadcasts
        self.assertGreater(mock_channel_layer.group_send.call_count, 0)
    
    def test_error_handling_in_services(self):
        """Test error handling in service methods"""
        thread = MessagingService.create_thread(
            client=self.client_user,
            subject='Error Test',
            created_by=self.admin_user
        )
        
        # Test invalid message content
        with self.assertRaises(ValueError):
            MessagingService.send_message(
                thread=thread,
                sender=self.admin_user,
                content=''
            )
        
        # Test permission errors
        with self.assertRaises(PermissionError):
            MessagingService.send_message(
                thread=thread,
                sender=self.client_user,
                content='Internal note attempt',
                is_internal_note=True
            )
        
        # Test non-existent participant removal
        success = MessagingService.remove_thread_participant(
            thread,
            self.admin_user,  # Not a participant
            removed_by=self.admin_user
        )
        self.assertFalse(success)


class MessagingServicePerformanceTest(TestCase):
    """Test performance aspects of messaging services"""
    
    def setUp(self):
        """Set up test data"""
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Performance Test Thread'
        )
    
    def test_bulk_message_operations(self):
        """Test performance with bulk message operations"""
        # Create many messages
        messages = []
        for i in range(100):
            message = MessagingService.send_message(
                thread=self.thread,
                sender=self.admin_user if i % 2 else self.client_user,
                content=f'Bulk message {i}'
            )
            messages.append(message)
        
        # Test bulk read marking
        with self.assertNumQueries(4):  # Should be optimized
            read_count = MessagingService.mark_thread_read(self.thread, self.client_user)
        
        # Should mark approximately half (admin messages)
        self.assertGreater(read_count, 45)
        self.assertLess(read_count, 55)
    
    def test_typing_indicator_cleanup_performance(self):
        """Test typing indicator cleanup performance"""
        # Create many stale typing indicators
        old_time = timezone.now() - timedelta(minutes=10)
        
        for i in range(50):
            user = User.objects.create_user(
                email=f'user{i}@test.com',
                password='testpass123',
                role='CLIENT'
            )
            
            indicator = TypingIndicator.objects.create(
                thread=self.thread,
                user=user,
                is_typing=True
            )
            indicator.last_activity = old_time
            indicator.save()
        
        # Test cleanup performance
        with self.assertNumQueries(2):  # Should be a single bulk delete
            cleaned_count = MessagingService.cleanup_stale_typing_indicators(minutes=5)
        
        self.assertEqual(cleaned_count, 50)
    
    def test_unread_count_performance(self):
        """Test unread count calculation performance"""
        # Create many messages
        for i in range(100):
            Message.objects.create(
                thread=self.thread,
                sender=self.admin_user,
                content=f'Performance message {i}'
            )
        
        # Mark some as read
        messages = Message.objects.filter(thread=self.thread)[:50]
        for message in messages:
            message.mark_as_read_by(self.client_user)
        
        # Test unread count performance
        with self.assertNumQueries(1):  # Should be a single count query
            unread_count = MessagingService.get_unread_count(self.thread, self.client_user)
        
        self.assertEqual(unread_count, 50)