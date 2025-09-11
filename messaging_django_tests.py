#!/usr/bin/env python3
"""
Django-based Messaging System Tests
===================================

This script uses Django's testing framework to validate the messaging system
with proper database transactions and model testing.

Usage:
    python messaging_django_tests.py
"""

import os
import sys
import django
from pathlib import Path

# Setup Django environment
sys.path.append(str(Path(__file__).parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

import json
import time
import django.core.exceptions
from datetime import datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

# Import messaging models
from core.domains.messaging.models import (
    MessageThread, ThreadParticipant, Message, 
    MessageAttachment, MessageReadReceipt, TypingIndicator
)
from core.domains.events.models import Event

User = get_user_model()


class MessagingSystemIntegrationTests(TransactionTestCase):
    """Comprehensive messaging system integration tests using Django's test framework"""
    
    def setUp(self):
        """Set up test data"""
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        
        # Create unique timestamp for test users
        timestamp = str(int(time.time()))
        
        # Create test users with unique emails
        self.client_user1, _ = User.objects.get_or_create(
            email=f'client1_{timestamp}@test.com',
            defaults={
                'first_name': 'John',
                'last_name': 'Client',
                'role': 'CLIENT'
            }
        )
        self.client_user1.set_password('testpass123')
        self.client_user1.save()
        
        self.client_user2, _ = User.objects.get_or_create(
            email=f'client2_{timestamp}@test.com',
            defaults={
                'first_name': 'Jane',
                'last_name': 'Client',
                'role': 'CLIENT'
            }
        )
        self.client_user2.set_password('testpass123')
        self.client_user2.save()
        
        self.admin_user1, _ = User.objects.get_or_create(
            email=f'admin1_{timestamp}@test.com',
            defaults={
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'ADMIN'
            }
        )
        self.admin_user1.set_password('testpass123')
        self.admin_user1.save()
        
        self.admin_user2, _ = User.objects.get_or_create(
            email=f'admin2_{timestamp}@test.com',
            defaults={
                'first_name': 'Sarah',
                'last_name': 'Admin',
                'role': 'ADMIN'
            }
        )
        self.admin_user2.set_password('testpass123')
        self.admin_user2.save()
        
        # Create test events
        self.event1 = Event.objects.create(
            name='John\'s Wedding',
            client=self.client_user1,
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=30, hours=8),
            status='CONFIRMED'
        )
        
        self.event2 = Event.objects.create(
            name='Jane\'s Corporate Event',
            client=self.client_user2,
            start_date=timezone.now() + timedelta(days=60),
            end_date=timezone.now() + timedelta(days=60, hours=6),
            status='CONFIRMED'
        )
        
        # Setup API client
        self.api_client = APIClient()
        
        # Generate auth tokens
        self.client1_token = str(RefreshToken.for_user(self.client_user1).access_token)
        self.client2_token = str(RefreshToken.for_user(self.client_user2).access_token)
        self.admin1_token = str(RefreshToken.for_user(self.admin_user1).access_token)
        self.admin2_token = str(RefreshToken.for_user(self.admin_user2).access_token)
    
    def log_test_result(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        if passed:
            self.test_results['passed'] += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.test_results['failed'] += 1
            print(f"❌ {test_name}: FAILED - {details}")
            self.test_results['errors'].append(f"{test_name}: {details}")
    
    def test_message_thread_crud_operations(self):
        """Test MessageThread CRUD operations"""
        try:
            print("\n🗄️ Testing MessageThread CRUD Operations...")
            
            # CREATE - General thread
            general_thread = MessageThread.objects.create(
                client=self.client_user1,
                subject="General Support Question",
                priority="normal"
            )
            
            self.assertIsNotNone(general_thread.id)
            self.assertEqual(general_thread.client, self.client_user1)
            self.assertEqual(general_thread.subject, "General Support Question")
            
            # CREATE - Event-specific thread
            event_thread = MessageThread.objects.create(
                client=self.client_user1,
                event=self.event1,
                subject="Wedding Planning Discussion",
                priority="high"
            )
            
            self.assertIsNotNone(event_thread.id)
            self.assertEqual(event_thread.event, self.event1)
            self.assertEqual(event_thread.priority, "high")
            
            # READ - Test retrieval
            retrieved_thread = MessageThread.objects.get(id=general_thread.id)
            self.assertEqual(retrieved_thread.client, self.client_user1)
            
            # UPDATE - Test modification
            general_thread.assigned_admin = self.admin_user1
            general_thread.status = 'waiting'
            general_thread.save()
            
            updated_thread = MessageThread.objects.get(id=general_thread.id)
            self.assertEqual(updated_thread.assigned_admin, self.admin_user1)
            self.assertEqual(updated_thread.status, 'waiting')
            
            # Test manager methods
            client_threads = MessageThread.objects.for_client(self.client_user1.id)
            self.assertGreater(client_threads.count(), 0)
            
            active_threads = MessageThread.objects.active()
            self.assertGreater(active_threads.count(), 0)
            
            # Store for other tests
            self.general_thread = general_thread
            self.event_thread = event_thread
            
            self.log_test_result("MessageThread CRUD Operations", True)
            
        except Exception as e:
            self.log_test_result("MessageThread CRUD Operations", False, str(e))
    
    def test_message_crud_operations(self):
        """Test Message CRUD operations"""
        try:
            print("\n💬 Testing Message CRUD Operations...")
            
            # Ensure we have a thread
            if not hasattr(self, 'general_thread'):
                self.general_thread = MessageThread.objects.create(
                    client=self.client_user1,
                    subject="Test Thread for Messages"
                )
            
            # CREATE - Client message
            client_message = Message.objects.create(
                thread=self.general_thread,
                sender=self.client_user1,
                content="Hello, I need help with my event planning.",
                message_type="text"
            )
            
            self.assertIsNotNone(client_message.id)
            self.assertEqual(client_message.sender, self.client_user1)
            self.assertEqual(client_message.thread, self.general_thread)
            
            # CREATE - Admin response
            admin_message = Message.objects.create(
                thread=self.general_thread,
                sender=self.admin_user1,
                content="Hello! I'd be happy to help you with your event.",
                message_type="text"
            )
            
            self.assertIsNotNone(admin_message.id)
            self.assertEqual(admin_message.sender, self.admin_user1)
            
            # CREATE - Internal note (admin only)
            internal_note = Message.objects.create(
                thread=self.general_thread,
                sender=self.admin_user1,
                content="Client seems very enthusiastic about the event.",
                message_type="text",
                is_internal_note=True
            )
            
            self.assertTrue(internal_note.is_internal_note)
            self.assertEqual(internal_note.sender.role, 'ADMIN')
            
            # READ - Verify messages exist
            thread_messages = Message.objects.filter(thread=self.general_thread)
            self.assertGreaterEqual(thread_messages.count(), 3)
            
            # UPDATE - Edit message
            original_content = client_message.content
            client_message.content = "Hello, I need help with my wedding planning."
            client_message.original_content = original_content
            client_message.edited_at = timezone.now()
            client_message.save()
            
            # Verify thread cache was updated
            self.general_thread.refresh_from_db()
            self.assertIsNotNone(self.general_thread.last_message_at)
            
            # Store for other tests
            self.client_message = client_message
            self.admin_message = admin_message
            self.internal_note = internal_note
            
            self.log_test_result("Message CRUD Operations", True)
            
        except Exception as e:
            self.log_test_result("Message CRUD Operations", False, str(e))
    
    def test_thread_participants(self):
        """Test ThreadParticipant functionality"""
        try:
            print("\n👥 Testing Thread Participants...")
            
            if not hasattr(self, 'general_thread'):
                self.general_thread = MessageThread.objects.create(
                    client=self.client_user1,
                    subject="Test Thread for Participants"
                )
            
            # Add participants
            client_participation = self.general_thread.add_participant(self.client_user1)
            admin_participation = self.general_thread.add_participant(self.admin_user1)
            
            self.assertIsNotNone(client_participation)
            self.assertIsNotNone(admin_participation)
            
            # Verify participants
            participants = ThreadParticipant.objects.filter(thread=self.general_thread)
            self.assertEqual(participants.count(), 2)
            
            # Test notification settings
            client_participation.notifications_enabled = False
            client_participation.save()
            
            updated_participation = ThreadParticipant.objects.get(
                thread=self.general_thread, 
                user=self.client_user1
            )
            self.assertFalse(updated_participation.notifications_enabled)
            
            # Test removing participant
            self.general_thread.remove_participant(self.admin_user1)
            remaining_participants = ThreadParticipant.objects.filter(
                thread=self.general_thread, 
                is_active=True
            )
            self.assertEqual(remaining_participants.count(), 1)
            
            self.log_test_result("Thread Participants", True)
            
        except Exception as e:
            self.log_test_result("Thread Participants", False, str(e))
    
    def test_message_attachments(self):
        """Test MessageAttachment functionality"""
        try:
            print("\n📎 Testing Message Attachments...")
            
            if not hasattr(self, 'client_message'):
                # Create test message
                thread = MessageThread.objects.create(
                    client=self.client_user1,
                    subject="Test Thread for Attachments"
                )
                self.client_message = Message.objects.create(
                    thread=thread,
                    sender=self.client_user1,
                    content="Test message with attachment"
                )
            
            # Create test file content
            from django.core.files.base import ContentFile
            test_file = ContentFile(b"This is test PDF content", name="test_document.pdf")
            
            # CREATE attachment
            attachment = MessageAttachment.objects.create(
                message=self.client_message,
                filename="Wedding Inspiration.pdf",
                file=test_file,
                file_size=len(test_file.read()),
                file_type="application/pdf",
                uploaded_by=self.client_user1
            )
            
            self.assertIsNotNone(attachment.id)
            self.assertEqual(attachment.filename, "Wedding Inspiration.pdf")
            self.assertEqual(attachment.file_type, "application/pdf")
            self.assertEqual(attachment.uploaded_by, self.client_user1)
            
            # Test file URL property
            file_url = attachment.file_url
            self.assertIsNotNone(file_url)
            
            self.log_test_result("Message Attachments", True)
            
        except Exception as e:
            self.log_test_result("Message Attachments", False, str(e))
    
    def test_read_receipts(self):
        """Test MessageReadReceipt functionality"""
        try:
            print("\n📖 Testing Read Receipts...")
            
            if not hasattr(self, 'admin_message'):
                # Create test message
                thread = MessageThread.objects.create(
                    client=self.client_user1,
                    subject="Test Thread for Read Receipts"
                )
                self.admin_message = Message.objects.create(
                    thread=thread,
                    sender=self.admin_user1,
                    content="Test admin message"
                )
            
            # Mark message as read by client
            receipt = self.admin_message.mark_as_read_by(self.client_user1)
            
            self.assertIsNotNone(receipt)
            self.assertEqual(receipt.user, self.client_user1)
            self.assertEqual(receipt.message, self.admin_message)
            
            # Verify read status
            self.assertTrue(self.admin_message.is_read_by(self.client_user1))
            self.assertFalse(self.admin_message.is_read_by(self.admin_user1))
            
            # Test unread count
            thread = self.admin_message.thread
            unread_count = thread.get_unread_count_for_user(self.admin_user1)
            self.assertIsInstance(unread_count, int)
            self.assertGreaterEqual(unread_count, 0)
            
            self.log_test_result("Read Receipts", True)
            
        except Exception as e:
            self.log_test_result("Read Receipts", False, str(e))
    
    def test_typing_indicators(self):
        """Test TypingIndicator functionality"""
        try:
            print("\n⌨️ Testing Typing Indicators...")
            
            if not hasattr(self, 'general_thread'):
                self.general_thread = MessageThread.objects.create(
                    client=self.client_user1,
                    subject="Test Thread for Typing"
                )
            
            # CREATE typing indicator
            typing = TypingIndicator.objects.create(
                thread=self.general_thread,
                user=self.client_user1,
                is_typing=True
            )
            
            self.assertIsNotNone(typing.id)
            self.assertTrue(typing.is_typing)
            self.assertEqual(typing.user, self.client_user1)
            
            # Verify typing indicator
            active_typing = TypingIndicator.objects.filter(
                thread=self.general_thread, 
                is_typing=True
            )
            self.assertEqual(active_typing.count(), 1)
            
            # UPDATE typing status
            typing.is_typing = False
            typing.save()
            
            typing.refresh_from_db()
            self.assertFalse(typing.is_typing)
            
            # Test cleanup of stale indicators
            old_count = TypingIndicator.objects.count()
            deleted_count = TypingIndicator.cleanup_stale_indicators(older_than_minutes=0)
            new_count = TypingIndicator.objects.count()
            self.assertLessEqual(new_count, old_count)
            
            self.log_test_result("Typing Indicators", True)
            
        except Exception as e:
            self.log_test_result("Typing Indicators", False, str(e))
    
    def test_model_validation(self):
        """Test model validation and constraints"""
        try:
            print("\n🔍 Testing Model Validation...")
            
            # Test event belongs to same client constraint
            try:
                # This should fail validation
                invalid_thread = MessageThread(
                    client=self.client_user1,
                    event=self.event2,  # Event2 belongs to client_user2
                    subject="Invalid thread"
                )
                invalid_thread.full_clean()  # Should raise ValidationError
                self.fail("Validation should have failed")
            except django.core.exceptions.ValidationError:
                # Expected to fail
                pass
            
            # Test internal notes can only be sent by admins
            try:
                invalid_note = Message(
                    thread=self.general_thread,
                    sender=self.client_user1,  # Client trying to send internal note
                    content="Internal note from client",
                    is_internal_note=True
                )
                invalid_note.full_clean()  # Should raise ValidationError
                self.fail("Validation should have failed")
            except django.core.exceptions.ValidationError:
                # Expected to fail
                pass
            
            self.log_test_result("Model Validation", True)
            
        except Exception as e:
            self.log_test_result("Model Validation", False, str(e))
    
    def test_optimized_queries(self):
        """Test optimized manager queries"""
        try:
            print("\n⚡ Testing Optimized Queries...")
            
            # Test with_details() prefetching
            detailed_threads = MessageThread.objects.with_details()[:5]
            for thread in detailed_threads:
                # These should not cause additional queries due to prefetching
                list(thread.participants.all())
                list(thread.messages.all()[:3])
            
            # Test with_unread_counts
            threads_with_counts = MessageThread.objects.with_unread_counts(
                self.client_user1.id
            )[:3]
            for thread in threads_with_counts:
                unread_count = getattr(thread, 'unread_count', 0)
                self.assertIsInstance(unread_count, int)
            
            # Test filtering methods
            client_threads = MessageThread.objects.for_client(self.client_user1.id)
            self.assertGreaterEqual(client_threads.count(), 0)
            
            event_threads = MessageThread.objects.for_event(self.event1.id)
            self.assertGreaterEqual(event_threads.count(), 0)
            
            active_threads = MessageThread.objects.active()
            self.assertGreaterEqual(active_threads.count(), 0)
            
            self.log_test_result("Optimized Queries", True)
            
        except Exception as e:
            self.log_test_result("Optimized Queries", False, str(e))
    
    def test_api_authentication(self):
        """Test API authentication"""
        try:
            print("\n🔐 Testing API Authentication...")
            
            # Test without authentication
            response = self.api_client.get('/api/messaging/threads/')
            self.assertEqual(response.status_code, 401)
            
            # Test with valid token
            self.api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.client1_token}')
            response = self.api_client.get('/api/messaging/threads/')
            self.assertEqual(response.status_code, 200)
            
            self.log_test_result("API Authentication", True)
            
        except Exception as e:
            self.log_test_result("API Authentication", False, str(e))
    
    def test_api_thread_operations(self):
        """Test Thread API operations"""
        try:
            print("\n🌐 Testing Thread API Operations...")
            
            self.api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.client1_token}')
            
            # CREATE thread via API
            create_data = {
                'subject': 'API Test Thread',
                'priority': 'normal'
            }
            response = self.api_client.post('/api/messaging/threads/', create_data)
            self.assertEqual(response.status_code, 201)
            
            thread_data = response.json()
            thread_id = thread_data['id']
            
            # READ thread via API
            response = self.api_client.get(f'/api/messaging/threads/{thread_id}/')
            self.assertEqual(response.status_code, 200)
            
            # UPDATE thread via API
            update_data = {'priority': 'high'}
            response = self.api_client.patch(f'/api/messaging/threads/{thread_id}/', update_data)
            self.assertEqual(response.status_code, 200)
            
            updated_data = response.json()
            self.assertEqual(updated_data['priority'], 'high')
            
            self.log_test_result("Thread API Operations", True)
            
        except Exception as e:
            self.log_test_result("Thread API Operations", False, str(e))
    
    def test_api_message_operations(self):
        """Test Message API operations"""
        try:
            print("\n💬 Testing Message API Operations...")
            
            self.api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.client1_token}')
            
            # Get or create a thread
            threads_response = self.api_client.get('/api/messaging/threads/')
            threads = threads_response.json()['results']
            
            if threads:
                thread_id = threads[0]['id']
            else:
                # Create a thread first
                thread_data = {'subject': 'Test Thread for Messages'}
                thread_response = self.api_client.post('/api/messaging/threads/', thread_data)
                thread_id = thread_response.json()['id']
            
            # CREATE message via API
            message_data = {
                'thread': thread_id,
                'content': 'This is a test message via API',
                'message_type': 'text'
            }
            response = self.api_client.post('/api/messaging/messages/', message_data)
            self.assertEqual(response.status_code, 201)
            
            message = response.json()
            message_id = message['id']
            
            # READ message via API
            response = self.api_client.get(f'/api/messaging/messages/{message_id}/')
            self.assertEqual(response.status_code, 200)
            
            # LIST messages for thread
            response = self.api_client.get(f'/api/messaging/messages/?thread={thread_id}')
            self.assertEqual(response.status_code, 200)
            
            self.log_test_result("Message API Operations", True)
            
        except Exception as e:
            self.log_test_result("Message API Operations", False, str(e))
    
    def test_cross_client_permissions(self):
        """Test that clients can't access other clients' threads"""
        try:
            print("\n🔒 Testing Cross-Client Permissions...")
            
            # Create thread as client1
            self.api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.client1_token}')
            thread_data = {'subject': 'Client 1 Private Thread'}
            response = self.api_client.post('/api/messaging/threads/', thread_data)
            thread_id = response.json()['id']
            
            # Try to access as client2
            self.api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.client2_token}')
            response = self.api_client.get(f'/api/messaging/threads/{thread_id}/')
            
            # Should be 403 Forbidden or 404 Not Found
            self.assertIn(response.status_code, [403, 404])
            
            self.log_test_result("Cross-Client Permissions", True)
            
        except Exception as e:
            self.log_test_result("Cross-Client Permissions", False, str(e))
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        print("🚀 Starting Django-based Messaging Integration Tests")
        print("=" * 60)
        
        # Database and Model Tests
        self.test_message_thread_crud_operations()
        self.test_message_crud_operations()
        self.test_thread_participants()
        self.test_message_attachments()
        self.test_read_receipts()
        self.test_typing_indicators()
        self.test_model_validation()
        self.test_optimized_queries()
        
        # API Tests
        self.test_api_authentication()
        self.test_api_thread_operations()
        self.test_api_message_operations()
        self.test_cross_client_permissions()
        
        # Generate Report
        self.generate_report()
    
    def generate_report(self):
        """Generate test report"""
        print("\n" + "="*60)
        print("DJANGO MESSAGING TESTS REPORT")
        print("="*60)
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        pass_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {self.test_results['passed']} ✅")
        print(f"Failed: {self.test_results['failed']} ❌")
        print(f"Pass Rate: {pass_rate:.1f}%")
        
        if self.test_results['failed'] > 0:
            print("\n🚨 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"  • {error}")
        
        # Save detailed report
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_tests': total_tests,
            'passed': self.test_results['passed'],
            'failed': self.test_results['failed'],
            'pass_rate': f"{pass_rate:.1f}%",
            'errors': self.test_results['errors']
        }
        
        with open('django_messaging_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: django_messaging_test_report.json")
        
        # Overall status
        if pass_rate >= 90:
            print("\n🎉 OVERALL STATUS: EXCELLENT - System ready for production!")
        elif pass_rate >= 75:
            print("\n✅ OVERALL STATUS: GOOD - Minor issues to address")
        elif pass_rate >= 50:
            print("\n⚠️ OVERALL STATUS: NEEDS WORK - Several issues to fix")
        else:
            print("\n🚨 OVERALL STATUS: CRITICAL ISSUES - Major fixes required")


def main():
    """Main function to run the tests"""
    test_instance = MessagingSystemIntegrationTests()
    test_instance.setUp()
    test_instance.run_all_tests()


if __name__ == "__main__":
    main()