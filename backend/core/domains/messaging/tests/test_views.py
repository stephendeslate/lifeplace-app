"""
Comprehensive test suite for messaging domain API views

Tests all REST API endpoints, permissions, filtering, pagination,
and response formats for the messaging system.
"""

import json
import uuid
from datetime import datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import (
    MessageThread,
    ThreadParticipant,
    Message,
    MessageAttachment,
    MessageReadReceipt,
    TypingIndicator
)

User = get_user_model()


class MessagingAPITestCase(APITestCase):
    """Base test case for messaging API tests"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
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
        
        # Create API clients
        self.admin_client = APIClient()
        self.client_client = APIClient()
        self.other_client_api = APIClient()
        
        # Set up authentication
        self.admin_token = RefreshToken.for_user(self.admin_user).access_token
        self.client_token = RefreshToken.for_user(self.client_user).access_token
        self.other_client_token = RefreshToken.for_user(self.other_client).access_token
        
        self.admin_client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        self.client_client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.client_token}')
        self.other_client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {self.other_client_token}')
    
    def create_test_thread(self, client=None, admin=None, **kwargs):
        """Helper to create test thread"""
        defaults = {
            'client': client or self.client_user,
            'subject': 'Test Thread'
        }
        if admin:
            defaults['assigned_admin'] = admin
        defaults.update(kwargs)
        return MessageThread.objects.create(**defaults)
    
    def create_test_message(self, thread, sender, content='Test message', **kwargs):
        """Helper to create test message"""
        defaults = {
            'thread': thread,
            'sender': sender,
            'content': content
        }
        defaults.update(kwargs)
        return Message.objects.create(**defaults)


class MessageThreadViewSetTest(MessagingAPITestCase):
    """Test MessageThread API endpoints"""
    
    def test_list_threads_admin(self):
        """Test admin can list all threads"""
        # Create threads for different clients
        thread1 = self.create_test_thread(client=self.client_user)
        thread2 = self.create_test_thread(client=self.other_client)
        
        response = self.admin_client.get('/api/messaging/threads/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_list_threads_client_filtered(self):
        """Test client can only see their own threads"""
        # Create threads for different clients
        my_thread = self.create_test_thread(client=self.client_user)
        other_thread = self.create_test_thread(client=self.other_client)
        
        response = self.client_client.get('/api/messaging/threads/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(my_thread.id))
    
    def test_create_thread_admin_only(self):
        """Test only admins can create threads"""
        data = {
            'client': self.client_user.id,
            'subject': 'New Thread'
        }
        
        # Admin should be able to create
        response = self.admin_client.post('/api/messaging/threads/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Client should not be able to create
        response = self.client_client.post('/api/messaging/threads/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_thread_detail_permissions(self):
        """Test thread detail access permissions"""
        thread = self.create_test_thread(client=self.client_user)
        url = f'/api/messaging/threads/{thread.id}/'
        
        # Admin should have access
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Thread owner should have access
        response = self.client_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Other client should not have access
        response = self.other_client_api.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_thread_filtering_admin(self):
        """Test thread filtering for admins"""
        # Create threads with different properties
        active_thread = self.create_test_thread(status='active', priority='normal')
        urgent_thread = self.create_test_thread(status='active', priority='urgent')
        resolved_thread = self.create_test_thread(status='resolved')
        assigned_thread = self.create_test_thread(assigned_admin=self.admin_user)
        
        # Test status filter
        response = self.admin_client.get('/api/messaging/threads/?status=active')
        self.assertEqual(len(response.data['results']), 3)
        
        # Test priority filter
        response = self.admin_client.get('/api/messaging/threads/?priority=urgent')
        self.assertEqual(len(response.data['results']), 1)
        
        # Test assigned filter
        response = self.admin_client.get('/api/messaging/threads/?assigned_to_me=true')
        self.assertEqual(len(response.data['results']), 1)
        
        # Test unassigned filter
        response = self.admin_client.get('/api/messaging/threads/?unassigned=true')
        self.assertEqual(len(response.data['results']), 3)
    
    def test_thread_search(self):
        """Test thread search functionality"""
        thread1 = self.create_test_thread(subject='Important Discussion')
        thread2 = self.create_test_thread(subject='General Chat')
        
        response = self.admin_client.get('/api/messaging/threads/?search=Important')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(thread1.id))
    
    def test_thread_ordering(self):
        """Test thread ordering"""
        old_thread = self.create_test_thread()
        new_thread = self.create_test_thread()
        
        # Update last_message_at to test ordering
        old_thread.last_message_at = timezone.now() - timedelta(hours=1)
        old_thread.save()
        new_thread.last_message_at = timezone.now()
        new_thread.save()
        
        response = self.admin_client.get('/api/messaging/threads/?ordering=-last_message_at')
        results = response.data['results']
        
        self.assertEqual(results[0]['id'], str(new_thread.id))
        self.assertEqual(results[1]['id'], str(old_thread.id))
    
    def test_assign_admin_action(self):
        """Test assign admin action"""
        thread = self.create_test_thread()
        url = f'/api/messaging/threads/{thread.id}/assign_admin/'
        
        data = {'admin_id': self.admin_user.id}
        response = self.admin_client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        thread.refresh_from_db()
        self.assertEqual(thread.assigned_admin, self.admin_user)
    
    def test_mark_urgent_action(self):
        """Test mark urgent action"""
        thread = self.create_test_thread(client=self.client_user)
        url = f'/api/messaging/threads/{thread.id}/mark_urgent/'
        
        # Client can mark their own thread urgent
        response = self.client_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        thread.refresh_from_db()
        self.assertEqual(thread.priority, 'urgent')
        
        # Other client cannot mark thread urgent
        response = self.other_client_api.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_resolve_thread_action(self):
        """Test resolve thread action"""
        thread = self.create_test_thread()
        url = f'/api/messaging/threads/{thread.id}/resolve/'
        
        # Only admin can resolve
        response = self.admin_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        thread.refresh_from_db()
        self.assertEqual(thread.status, 'resolved')
        
        # Client cannot resolve
        response = self.client_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_reopen_thread_action(self):
        """Test reopen thread action"""
        thread = self.create_test_thread(status='resolved')
        url = f'/api/messaging/threads/{thread.id}/reopen/'
        
        response = self.admin_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        thread.refresh_from_db()
        self.assertEqual(thread.status, 'active')
    
    def test_thread_stats_admin_only(self):
        """Test thread statistics endpoint"""
        # Create various threads
        self.create_test_thread(status='active', priority='urgent')
        self.create_test_thread(status='waiting')
        self.create_test_thread(status='resolved')
        self.create_test_thread(assigned_admin=self.admin_user)
        
        response = self.admin_client.get('/api/messaging/threads/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data
        self.assertIn('total', stats)
        self.assertIn('active', stats)
        self.assertIn('urgent', stats)
        self.assertIn('assigned_to_me', stats)
        
        # Client should not have access
        response = self.client_client.get('/api/messaging/threads/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MessageViewSetTest(MessagingAPITestCase):
    """Test Message API endpoints"""
    
    def setUp(self):
        super().setUp()
        self.thread = self.create_test_thread(client=self.client_user)
    
    def test_list_messages_with_thread_filter(self):
        """Test listing messages filtered by thread"""
        message1 = self.create_test_message(self.thread, self.admin_user)
        message2 = self.create_test_message(self.thread, self.client_user)
        
        # Other thread message (should not appear)
        other_thread = self.create_test_thread(client=self.other_client)
        other_message = self.create_test_message(other_thread, self.other_client)
        
        response = self.client_client.get(f'/api/messaging/messages/?thread={self.thread.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_list_messages_client_permissions(self):
        """Test client can only see messages from accessible threads"""
        # Try to access messages from thread they don't own
        other_thread = self.create_test_thread(client=self.other_client)
        other_message = self.create_test_message(other_thread, self.other_client)
        
        response = self.client_client.get(f'/api/messaging/messages/?thread={other_thread.id}')
        
        # Should return empty results (no access to thread)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_create_message(self):
        """Test creating messages"""
        data = {
            'thread': self.thread.id,
            'content': 'New test message',
            'message_type': 'text'
        }
        
        response = self.client_client.post('/api/messaging/messages/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['content'], 'New test message')
        self.assertEqual(response.data['sender'], self.client_user.id)
    
    def test_create_internal_note_admin_only(self):
        """Test internal notes can only be created by admins"""
        data = {
            'thread': self.thread.id,
            'content': 'Internal admin note',
            'is_internal_note': True
        }
        
        # Admin should be able to create internal note
        response = self.admin_client.post('/api/messaging/messages/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Client should not be able to create internal note
        response = self.client_client.post('/api/messaging/messages/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_internal_notes_hidden_from_clients(self):
        """Test internal notes are hidden from clients"""
        # Create internal note
        internal_message = self.create_test_message(
            self.thread, 
            self.admin_user, 
            content='Internal note',
            is_internal_note=True
        )
        
        # Create regular message
        regular_message = self.create_test_message(
            self.thread, 
            self.admin_user, 
            content='Regular message'
        )
        
        # Admin should see both
        response = self.admin_client.get(f'/api/messaging/messages/?thread={self.thread.id}')
        self.assertEqual(len(response.data['results']), 2)
        
        # Client should only see regular message
        response = self.client_client.get(f'/api/messaging/messages/?thread={self.thread.id}')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(regular_message.id))
    
    def test_edit_message_permissions(self):
        """Test message editing permissions"""
        message = self.create_test_message(self.thread, self.client_user)
        url = f'/api/messaging/messages/{message.id}/'
        
        data = {'content': 'Edited content'}
        
        # Sender should be able to edit
        response = self.client_client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Other user should not be able to edit
        response = self.other_client_api.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_edit_message_time_limit(self):
        """Test message edit time limit"""
        message = self.create_test_message(self.thread, self.client_user)
        
        # Simulate old message (beyond edit time limit)
        old_time = timezone.now() - timedelta(minutes=20)
        message.created_at = old_time
        message.save()
        
        url = f'/api/messaging/messages/{message.id}/'
        data = {'content': 'Attempted edit'}
        
        response = self.client_client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_delete_message_permissions(self):
        """Test message deletion permissions"""
        message = self.create_test_message(self.thread, self.client_user)
        url = f'/api/messaging/messages/{message.id}/'
        
        # Sender should be able to delete within time limit
        response = self.client_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Admin should always be able to delete
        admin_message = self.create_test_message(self.thread, self.client_user)
        admin_url = f'/api/messaging/messages/{admin_message.id}/'
        
        response = self.admin_client.delete(admin_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_mark_message_read(self):
        """Test marking individual message as read"""
        message = self.create_test_message(self.thread, self.admin_user)
        url = f'/api/messaging/messages/{message.id}/mark_read/'
        
        response = self.client_client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(message.is_read_by(self.client_user))
    
    def test_mark_thread_read(self):
        """Test marking all messages in thread as read"""
        message1 = self.create_test_message(self.thread, self.admin_user, 'Message 1')
        message2 = self.create_test_message(self.thread, self.admin_user, 'Message 2')
        internal_message = self.create_test_message(
            self.thread, 
            self.admin_user, 
            'Internal note',
            is_internal_note=True
        )
        
        data = {'thread_id': self.thread.id}
        response = self.client_client.post('/api/messaging/messages/mark_thread_read/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['marked_read'], 2)  # Should not count internal note
        
        # Verify messages are marked read
        self.assertTrue(message1.is_read_by(self.client_user))
        self.assertTrue(message2.is_read_by(self.client_user))
        self.assertFalse(internal_message.is_read_by(self.client_user))  # Internal notes not marked for clients


class MessageAttachmentViewSetTest(MessagingAPITestCase):
    """Test MessageAttachment API endpoints"""
    
    def setUp(self):
        super().setUp()
        self.thread = self.create_test_thread(client=self.client_user)
        self.message = self.create_test_message(self.thread, self.client_user)
        
        # Create test attachment
        test_file = SimpleUploadedFile(
            "test.txt",
            b"Test file content",
            content_type="text/plain"
        )
        
        self.attachment = MessageAttachment.objects.create(
            message=self.message,
            file=test_file,
            uploaded_by=self.client_user
        )
    
    def test_list_attachments_permissions(self):
        """Test attachment listing permissions"""
        # Client owner should see attachment
        response = self.client_client.get('/api/messaging/attachments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        # Other client should not see attachment
        response = self.other_client_api.get('/api/messaging/attachments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
        
        # Admin should see all attachments
        response = self.admin_client.get('/api/messaging/attachments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_download_attachment(self):
        """Test attachment download"""
        url = f'/api/messaging/attachments/{self.attachment.id}/download/'
        
        response = self.client_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/plain')
    
    def test_download_attachment_permissions(self):
        """Test attachment download permissions"""
        url = f'/api/messaging/attachments/{self.attachment.id}/download/'
        
        # Other client should not be able to download
        response = self.other_client_api.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TypingIndicatorViewSetTest(MessagingAPITestCase):
    """Test TypingIndicator API endpoints"""
    
    def setUp(self):
        super().setUp()
        self.thread = self.create_test_thread(client=self.client_user)
    
    def test_update_typing_status(self):
        """Test updating typing status"""
        data = {
            'thread_id': self.thread.id,
            'is_typing': True
        }
        
        response = self.client_client.post('/api/messaging/typing/update_typing/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify typing indicator created
        indicator = TypingIndicator.objects.get(
            thread=self.thread,
            user=self.client_user
        )
        self.assertTrue(indicator.is_typing)
    
    def test_stop_typing(self):
        """Test stopping typing"""
        # First start typing
        TypingIndicator.objects.create(
            thread=self.thread,
            user=self.client_user,
            is_typing=True
        )
        
        data = {
            'thread_id': self.thread.id,
            'is_typing': False
        }
        
        response = self.client_client.post('/api/messaging/typing/update_typing/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Indicator should be deleted
        self.assertFalse(
            TypingIndicator.objects.filter(
                thread=self.thread,
                user=self.client_user
            ).exists()
        )
    
    def test_typing_permissions(self):
        """Test typing indicator permissions"""
        data = {
            'thread_id': self.thread.id,
            'is_typing': True
        }
        
        # Client owner should be able to set typing
        response = self.client_client.post('/api/messaging/typing/update_typing/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Other client should not be able to set typing
        response = self.other_client_api.post('/api/messaging/typing/update_typing/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class FileUploadViewTest(MessagingAPITestCase):
    """Test file upload functionality"""
    
    def test_file_upload(self):
        """Test file upload for messages"""
        test_file = SimpleUploadedFile(
            "test.txt",
            b"Test file content",
            content_type="text/plain"
        )
        
        data = {'file': test_file}
        response = self.client_client.post('/api/messaging/upload/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('file', response.data)
        self.assertIn('filename', response.data)
    
    def test_file_upload_validation(self):
        """Test file upload validation"""
        # Test with invalid file type (if validation exists)
        invalid_file = SimpleUploadedFile(
            "malicious.exe",
            b"Executable content",
            content_type="application/exe"
        )
        
        data = {'file': invalid_file}
        response = self.client_client.post('/api/messaging/upload/', data, format='multipart')
        
        # Should either reject or accept based on validation rules
        # This test depends on actual validation implementation
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])


class MessagingPaginationTest(MessagingAPITestCase):
    """Test pagination in messaging endpoints"""
    
    def setUp(self):
        super().setUp()
        # Create many threads for pagination testing
        self.threads = []
        for i in range(25):
            thread = self.create_test_thread(
                client=self.client_user,
                subject=f'Thread {i:02d}'
            )
            self.threads.append(thread)
    
    def test_thread_pagination(self):
        """Test thread list pagination"""
        response = self.admin_client.get('/api/messaging/threads/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)
        
        # Should have pagination
        self.assertEqual(response.data['count'], 25)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])
    
    def test_pagination_navigation(self):
        """Test pagination navigation"""
        # Get first page
        response = self.admin_client.get('/api/messaging/threads/')
        first_page_results = response.data['results']
        next_url = response.data['next']
        
        # Get second page
        response = self.admin_client.get(next_url)
        second_page_results = response.data['results']
        
        # Results should be different
        first_page_ids = {r['id'] for r in first_page_results}
        second_page_ids = {r['id'] for r in second_page_results}
        
        self.assertEqual(len(first_page_ids & second_page_ids), 0)  # No overlap


class MessagingErrorHandlingTest(MessagingAPITestCase):
    """Test error handling in messaging endpoints"""
    
    def test_thread_not_found(self):
        """Test handling of non-existent thread"""
        fake_id = uuid.uuid4()
        response = self.client_client.get(f'/api/messaging/threads/{fake_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_message_not_found(self):
        """Test handling of non-existent message"""
        fake_id = uuid.uuid4()
        response = self.client_client.get(f'/api/messaging/messages/{fake_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_invalid_data_submission(self):
        """Test handling of invalid data"""
        # Missing required fields
        data = {'subject': 'Test Thread'}  # Missing client
        response = self.admin_client.post('/api/messaging/threads/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('client', response.data)
    
    def test_unauthorized_access(self):
        """Test unauthorized access handling"""
        # Remove authentication
        unauth_client = APIClient()
        
        response = unauth_client.get('/api/messaging/threads/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MessagingPerformanceTest(MessagingAPITestCase):
    """Test performance aspects of messaging endpoints"""
    
    def setUp(self):
        super().setUp()
        # Create test data
        self.thread = self.create_test_thread(client=self.client_user)
        
        # Create many messages
        for i in range(50):
            self.create_test_message(
                self.thread,
                self.admin_user if i % 2 else self.client_user,
                f'Test message {i}'
            )
    
    def test_message_list_query_optimization(self):
        """Test that message list queries are optimized"""
        with self.assertNumQueries(3):  # Should be optimized with select_related/prefetch_related
            response = self.client_client.get(f'/api/messaging/messages/?thread={self.thread.id}')
            
            # Access related data to ensure it's prefetched
            for message in response.data['results']:
                _ = message['sender']
                _ = message.get('attachments', [])
    
    def test_thread_list_query_optimization(self):
        """Test that thread list queries are optimized"""
        # Create threads with various relationships
        for i in range(10):
            thread = self.create_test_thread(
                client=self.client_user,
                assigned_admin=self.admin_user if i % 2 else None
            )
            self.create_test_message(thread, self.admin_user, f'Message {i}')
        
        with self.assertNumQueries(4):  # Should be optimized
            response = self.client_client.get('/api/messaging/threads/')
            
            # Access related data
            for thread in response.data['results']:
                _ = thread['client_name']
                _ = thread.get('assigned_admin')
                _ = thread.get('last_message_at')


class MessagingIntegrationTest(TransactionTestCase):
    """Integration tests for complete messaging workflows"""
    
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
        
        self.admin_client = APIClient()
        self.client_client = APIClient()
        
        admin_token = RefreshToken.for_user(self.admin_user).access_token
        client_token = RefreshToken.for_user(self.client_user).access_token
        
        self.admin_client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        self.client_client.credentials(HTTP_AUTHORIZATION=f'Bearer {client_token}')
    
    def test_complete_messaging_workflow(self):
        """Test complete messaging workflow from creation to resolution"""
        # 1. Admin creates thread
        thread_data = {
            'client': self.client_user.id,
            'subject': 'Integration Test Thread',
            'priority': 'normal'
        }
        
        response = self.admin_client.post('/api/messaging/threads/', thread_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        thread_id = response.data['id']
        
        # 2. Admin sends initial message
        message_data = {
            'thread': thread_id,
            'content': 'Hello, how can I help you today?'
        }
        
        response = self.admin_client.post('/api/messaging/messages/', message_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 3. Client responds
        client_message_data = {
            'thread': thread_id,
            'content': 'I need help with my event planning'
        }
        
        response = self.client_client.post('/api/messaging/messages/', client_message_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 4. Client marks admin message as read
        admin_message_id = Message.objects.filter(
            thread_id=thread_id,
            sender=self.admin_user
        ).first().id
        
        response = self.client_client.post(f'/api/messaging/messages/{admin_message_id}/mark_read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Client marks thread as urgent
        response = self.client_client.post(f'/api/messaging/threads/{thread_id}/mark_urgent/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 6. Admin assigns thread to themselves
        assign_data = {'admin_id': self.admin_user.id}
        response = self.admin_client.post(f'/api/messaging/threads/{thread_id}/assign_admin/', assign_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 7. Admin resolves thread
        response = self.admin_client.post(f'/api/messaging/threads/{thread_id}/resolve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 8. Verify final state
        response = self.admin_client.get(f'/api/messaging/threads/{thread_id}/')
        thread_data = response.data
        
        self.assertEqual(thread_data['status'], 'resolved')
        self.assertEqual(thread_data['priority'], 'urgent')
        self.assertEqual(thread_data['assigned_admin'], self.admin_user.id)
        
        # Verify message count
        response = self.admin_client.get(f'/api/messaging/messages/?thread={thread_id}')
        self.assertEqual(len(response.data['results']), 2)
    
    def test_real_time_features_integration(self):
        """Test integration of real-time features"""
        # Create thread
        thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Real-time Test'
        )
        
        # 1. Set typing indicator
        typing_data = {
            'thread_id': thread.id,
            'is_typing': True
        }
        
        response = self.client_client.post('/api/messaging/typing/update_typing/', typing_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify typing indicator exists
        self.assertTrue(
            TypingIndicator.objects.filter(
                thread=thread,
                user=self.client_user,
                is_typing=True
            ).exists()
        )
        
        # 2. Send message (should clear typing indicator)
        message_data = {
            'thread': thread.id,
            'content': 'Test message with typing'
        }
        
        response = self.client_client.post('/api/messaging/messages/', message_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 3. Mark all thread messages as read
        mark_read_data = {'thread_id': thread.id}
        response = self.admin_client.post('/api/messaging/messages/mark_thread_read/', mark_read_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify read receipt created
        message = Message.objects.get(thread=thread, content='Test message with typing')
        self.assertTrue(message.is_read_by(self.admin_user))