"""
Performance test suite for messaging domain

Tests performance characteristics, load handling, and
optimization effectiveness of the messaging system.
"""

import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from django.test import TestCase, TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from django.db import connection, transaction
from django.test.utils import override_settings

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


class MessagingPerformanceTest(TestCase):
    """Test messaging system performance characteristics"""
    
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
        
        # Clear any existing cache
        cache.clear()
    
    def test_thread_list_query_performance(self):
        """Test thread list query performance with many threads"""
        # Create many threads
        threads = []
        for i in range(100):
            thread = MessageThread.objects.create(
                client=self.client_user,
                subject=f'Performance Test Thread {i}',
                assigned_admin=self.admin_user if i % 2 else None
            )
            threads.append(thread)
            
            # Add some messages to each thread
            for j in range(5):
                Message.objects.create(
                    thread=thread,
                    sender=self.admin_user if j % 2 else self.client_user,
                    content=f'Message {j} in thread {i}'
                )
        
        # Test optimized query performance
        start_time = time.time()
        
        with self.assertNumQueries(1):  # Should be optimized with select_related
            queryset = MessageThread.objects.with_details().filter(
                client=self.client_user
            )
            threads_list = list(queryset)
        
        end_time = time.time()
        query_time = end_time - start_time
        
        # Should complete quickly even with many threads
        self.assertLess(query_time, 1.0, "Thread list query took too long")
        self.assertEqual(len(threads_list), 100)
        
        # Test accessing related data doesn't trigger additional queries
        with self.assertNumQueries(0):
            for thread in threads_list[:10]:  # Test first 10
                _ = thread.client.email
                _ = thread.assigned_admin.email if thread.assigned_admin else None
    
    def test_message_list_query_performance(self):
        """Test message list query performance with many messages"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Performance Test Thread'
        )
        
        # Create many messages
        messages = []
        for i in range(500):
            message = Message.objects.create(
                thread=thread,
                sender=self.admin_user if i % 2 else self.client_user,
                content=f'Performance test message {i}'
            )
            messages.append(message)
        
        # Test optimized message query
        start_time = time.time()
        
        with self.assertNumQueries(3):  # Optimized with select_related/prefetch_related
            queryset = Message.objects.select_related('sender', 'thread').filter(
                thread=thread
            ).order_by('-created_at')[:50]  # Paginated
            
            messages_list = list(queryset)
        
        end_time = time.time()
        query_time = end_time - start_time
        
        self.assertLess(query_time, 0.5, "Message list query took too long")
        self.assertEqual(len(messages_list), 50)
        
        # Test accessing related data
        with self.assertNumQueries(0):
            for message in messages_list:
                _ = message.sender.email
                _ = message.thread.subject
    
    def test_unread_count_performance(self):
        """Test unread count calculation performance"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Unread Count Test'
        )
        
        # Create many messages
        messages = []
        for i in range(200):
            message = Message.objects.create(
                thread=thread,
                sender=self.admin_user,
                content=f'Unread test message {i}'
            )
            messages.append(message)
        
        # Mark some as read
        for message in messages[:100]:
            message.mark_as_read_by(self.client_user)
        
        # Test unread count performance
        start_time = time.time()
        
        with self.assertNumQueries(1):  # Should be a single count query
            unread_count = MessagingService.get_unread_count(thread, self.client_user)
        
        end_time = time.time()
        query_time = end_time - start_time
        
        self.assertLess(query_time, 0.1, "Unread count query took too long")
        self.assertEqual(unread_count, 100)
    
    def test_bulk_message_marking_performance(self):
        """Test bulk message read marking performance"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Bulk Read Test'
        )
        
        # Create many messages
        for i in range(300):
            Message.objects.create(
                thread=thread,
                sender=self.admin_user,
                content=f'Bulk read test message {i}'
            )
        
        # Test bulk read marking performance
        start_time = time.time()
        
        with self.assertNumQueries(4):  # Should be optimized bulk operations
            marked_count = MessagingService.mark_thread_read(thread, self.client_user)
        
        end_time = time.time()
        operation_time = end_time - start_time
        
        self.assertLess(operation_time, 1.0, "Bulk read marking took too long")
        self.assertEqual(marked_count, 300)
    
    def test_typing_indicator_cleanup_performance(self):
        """Test typing indicator cleanup performance"""
        # Create many stale typing indicators
        old_time = timezone.now() - timedelta(minutes=10)
        
        indicators = []
        for i in range(100):
            user = User.objects.create_user(
                email=f'user{i}@test.com',
                password='testpass123',
                role='CLIENT'
            )
            
            thread = MessageThread.objects.create(
                client=user,
                subject=f'Typing test thread {i}'
            )
            
            indicator = TypingIndicator.objects.create(
                thread=thread,
                user=user,
                is_typing=True
            )
            indicator.last_activity = old_time
            indicator.save()
            indicators.append(indicator)
        
        # Test cleanup performance
        start_time = time.time()
        
        with self.assertNumQueries(2):  # Should be bulk delete
            cleaned_count = MessagingService.cleanup_stale_typing_indicators(minutes=5)
        
        end_time = time.time()
        cleanup_time = end_time - start_time
        
        self.assertLess(cleanup_time, 0.5, "Typing indicator cleanup took too long")
        self.assertEqual(cleaned_count, 100)
    
    def test_thread_stats_aggregation_performance(self):
        """Test thread statistics aggregation performance"""
        # Create many threads with various states
        threads = []
        for i in range(50):
            thread = MessageThread.objects.create(
                client=self.client_user,
                subject=f'Stats test thread {i}',
                status=['active', 'waiting', 'resolved'][i % 3],
                priority=['normal', 'high', 'urgent'][i % 3],
                assigned_admin=self.admin_user if i % 2 else None
            )
            threads.append(thread)
            
            # Add messages
            for j in range(10):
                Message.objects.create(
                    thread=thread,
                    sender=self.admin_user,
                    content=f'Stats message {j}'
                )
        
        # Test stats aggregation performance
        start_time = time.time()
        
        with self.assertNumQueries(8):  # Should be optimized aggregation queries
            stats = {
                'total': MessageThread.objects.count(),
                'active': MessageThread.objects.filter(status='active').count(),
                'waiting': MessageThread.objects.filter(status='waiting').count(),
                'resolved': MessageThread.objects.filter(status='resolved').count(),
                'urgent': MessageThread.objects.filter(priority='urgent').count(),
                'unassigned': MessageThread.objects.filter(assigned_admin__isnull=True).count(),
                'assigned': MessageThread.objects.filter(assigned_admin__isnull=False).count(),
            }
        
        end_time = time.time()
        stats_time = end_time - start_time
        
        self.assertLess(stats_time, 0.5, "Stats aggregation took too long")
        
        # Verify stats are correct
        self.assertEqual(stats['total'], 50)
        self.assertGreater(stats['active'], 0)
        self.assertGreater(stats['waiting'], 0)
        self.assertGreater(stats['resolved'], 0)
    
    def test_search_performance(self):
        """Test search performance with many threads and messages"""
        # Create threads with searchable content
        search_terms = ['urgent', 'meeting', 'payment', 'wedding', 'catering']
        
        for i in range(100):
            term = search_terms[i % len(search_terms)]
            thread = MessageThread.objects.create(
                client=self.client_user,
                subject=f'Thread about {term} planning {i}'
            )
            
            # Add messages with search terms
            for j in range(5):
                Message.objects.create(
                    thread=thread,
                    sender=self.admin_user,
                    content=f'Message about {term} details {j}'
                )
        
        # Test search performance
        start_time = time.time()
        
        # Search threads
        thread_results = MessageThread.objects.filter(
            subject__icontains='urgent'
        )[:20]
        
        # Search messages
        message_results = Message.objects.select_related('thread', 'sender').filter(
            content__icontains='urgent'
        )[:50]
        
        # Force evaluation
        list(thread_results)
        list(message_results)
        
        end_time = time.time()
        search_time = end_time - start_time
        
        self.assertLess(search_time, 1.0, "Search took too long")
    
    def test_attachment_handling_performance(self):
        """Test attachment handling performance"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Attachment Performance Test'
        )
        
        message = Message.objects.create(
            thread=thread,
            sender=self.client_user,
            content='Message with many attachments'
        )
        
        # Create many attachments
        attachments = []
        for i in range(20):
            # Mock file data
            from django.core.files.uploadedfile import SimpleUploadedFile
            test_file = SimpleUploadedFile(
                f"test_file_{i}.txt",
                b"Test file content",
                content_type="text/plain"
            )
            
            attachment = MessageAttachment.objects.create(
                message=message,
                filename=f'test_file_{i}.txt',
                file=test_file,
                uploaded_by=self.client_user
            )
            attachments.append(attachment)
        
        # Test attachment query performance
        start_time = time.time()
        
        with self.assertNumQueries(1):
            attachment_list = list(
                MessageAttachment.objects.select_related('message', 'uploaded_by')
                .filter(message=message)
            )
        
        end_time = time.time()
        query_time = end_time - start_time
        
        self.assertLess(query_time, 0.2, "Attachment query took too long")
        self.assertEqual(len(attachment_list), 20)


class MessagingConcurrencyTest(TransactionTestCase):
    """Test messaging system under concurrent load"""
    
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
            subject='Concurrency Test Thread'
        )
    
    def test_concurrent_message_sending(self):
        """Test concurrent message sending"""
        def send_messages(user, count, prefix):
            """Send multiple messages from a user"""
            messages = []
            for i in range(count):
                message = MessagingService.send_message(
                    thread=self.thread,
                    sender=user,
                    content=f'{prefix} message {i}'
                )
                messages.append(message)
            return messages
        
        # Use ThreadPoolExecutor for concurrent operations
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(send_messages, self.admin_user, 25, 'Admin'),
                executor.submit(send_messages, self.client_user, 25, 'Client'),
                executor.submit(send_messages, self.admin_user, 25, 'Admin2'),
                executor.submit(send_messages, self.client_user, 25, 'Client2'),
            ]
            
            results = []
            for future in as_completed(futures):
                results.extend(future.result())
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should handle concurrent operations efficiently
        self.assertLess(total_time, 5.0, "Concurrent message sending took too long")
        
        # Verify all messages were created
        total_messages = Message.objects.filter(thread=self.thread).count()
        self.assertEqual(total_messages, 100)
        
        # Verify thread cache was updated correctly
        self.thread.refresh_from_db()
        self.assertIsNotNone(self.thread.last_message_at)
    
    def test_concurrent_read_marking(self):
        """Test concurrent read receipt marking"""
        # Create messages
        messages = []
        for i in range(50):
            message = Message.objects.create(
                thread=self.thread,
                sender=self.admin_user,
                content=f'Concurrent read test message {i}'
            )
            messages.append(message)
        
        def mark_messages_read(message_batch):
            """Mark a batch of messages as read"""
            for message in message_batch:
                message.mark_as_read_by(self.client_user)
        
        # Split messages into batches for concurrent processing
        batch_size = 10
        batches = [
            messages[i:i + batch_size] 
            for i in range(0, len(messages), batch_size)
        ]
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(mark_messages_read, batch) 
                for batch in batches
            ]
            
            for future in as_completed(futures):
                future.result()  # Wait for completion
        
        end_time = time.time()
        total_time = end_time - start_time
        
        self.assertLess(total_time, 2.0, "Concurrent read marking took too long")
        
        # Verify all messages were marked as read
        read_count = MessageReadReceipt.objects.filter(
            message__in=messages,
            user=self.client_user
        ).count()
        self.assertEqual(read_count, 50)
    
    def test_concurrent_typing_indicators(self):
        """Test concurrent typing indicator updates"""
        # Create multiple users
        users = []
        for i in range(10):
            user = User.objects.create_user(
                email=f'user{i}@test.com',
                password='testpass123',
                role='CLIENT'
            )
            users.append(user)
        
        def update_typing_status(user, iterations):
            """Update typing status multiple times"""
            for i in range(iterations):
                MessagingService.update_typing_indicator(
                    self.thread,
                    user,
                    is_typing=True
                )
                time.sleep(0.01)  # Small delay
                MessagingService.update_typing_indicator(
                    self.thread,
                    user,
                    is_typing=False
                )
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(update_typing_status, user, 5)
                for user in users
            ]
            
            for future in as_completed(futures):
                future.result()
        
        end_time = time.time()
        total_time = end_time - start_time
        
        self.assertLess(total_time, 3.0, "Concurrent typing updates took too long")
        
        # All typing indicators should be cleaned up (set to False)
        active_typing = TypingIndicator.objects.filter(
            thread=self.thread,
            is_typing=True
        ).count()
        self.assertEqual(active_typing, 0)


class MessagingMemoryTest(TestCase):
    """Test memory usage and potential leaks"""
    
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
    
    def test_large_dataset_handling(self):
        """Test handling of large datasets without memory issues"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create a large number of threads and messages
        threads = []
        for i in range(200):
            thread = MessageThread.objects.create(
                client=self.client_user,
                subject=f'Memory test thread {i}'
            )
            threads.append(thread)
            
            # Add messages to each thread
            for j in range(20):
                Message.objects.create(
                    thread=thread,
                    sender=self.admin_user if j % 2 else self.client_user,
                    content=f'Memory test message {j} in thread {i}'
                )
        
        # Process the data
        for thread in threads:
            # Simulate typical operations
            messages = list(thread.messages.all())
            unread_count = thread.get_unread_count_for_user(self.client_user)
            
            # Mark some messages as read
            for message in messages[:10]:
                message.mark_as_read_by(self.client_user)
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable for the amount of data
        self.assertLess(memory_increase, 100, f"Memory usage increased too much: {memory_increase}MB")
    
    def test_queryset_memory_efficiency(self):
        """Test that querysets don't load excessive data into memory"""
        # Create many threads
        for i in range(1000):
            MessageThread.objects.create(
                client=self.client_user,
                subject=f'Memory efficiency test {i}'
            )
        
        # Test that iteration doesn't load all objects at once
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024
        
        # Use iterator to process large queryset
        count = 0
        for thread in MessageThread.objects.filter(client=self.client_user).iterator():
            count += 1
            if count % 100 == 0:
                # Check memory hasn't grown excessively
                current_memory = process.memory_info().rss / 1024 / 1024
                memory_increase = current_memory - initial_memory
                self.assertLess(memory_increase, 50, "Memory usage grew too much during iteration")
        
        self.assertEqual(count, 1000)


@override_settings(DEBUG=True)  # Enable query logging
class MessagingQueryOptimizationTest(TestCase):
    """Test query optimization and N+1 problem prevention"""
    
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
        
        # Create test data
        self.threads = []
        for i in range(10):
            thread = MessageThread.objects.create(
                client=self.client_user,
                subject=f'Query optimization test {i}',
                assigned_admin=self.admin_user if i % 2 else None
            )
            self.threads.append(thread)
            
            # Add messages and participants
            for j in range(5):
                Message.objects.create(
                    thread=thread,
                    sender=self.admin_user if j % 2 else self.client_user,
                    content=f'Message {j}'
                )
            
            thread.add_participant(self.client_user)
            if thread.assigned_admin:
                thread.add_participant(self.admin_user)
    
    def test_thread_list_query_optimization(self):
        """Test that thread list queries are optimized"""
        # Test optimized manager
        with self.assertNumQueries(1):
            threads = list(MessageThread.objects.all())
            
            # Access related fields that should be select_related
            for thread in threads:
                _ = thread.client.email
                if thread.assigned_admin:
                    _ = thread.assigned_admin.email
    
    def test_thread_with_details_optimization(self):
        """Test with_details() manager method optimization"""
        with self.assertNumQueries(4):  # 1 main + 3 prefetch_related
            threads = list(MessageThread.objects.with_details())
            
            # Access prefetched data
            for thread in threads:
                _ = list(thread.participants.all())
                _ = list(thread.messages.all())
                for message in thread.messages.all()[:3]:
                    _ = message.sender.email
                    _ = list(message.read_receipts.all())
    
    def test_message_list_query_optimization(self):
        """Test message list query optimization"""
        thread = self.threads[0]
        
        with self.assertNumQueries(3):  # Optimized with select_related/prefetch_related
            messages = list(
                Message.objects
                .select_related('sender', 'thread')
                .prefetch_related('attachments', 'read_receipts__user')
                .filter(thread=thread)
            )
            
            # Access related data
            for message in messages:
                _ = message.sender.email
                _ = message.thread.subject
                _ = list(message.attachments.all())
                _ = list(message.read_receipts.all())
    
    def test_unread_count_annotation_optimization(self):
        """Test unread count annotation is optimized"""
        with self.assertNumQueries(1):
            threads_with_counts = list(
                MessageThread.objects.with_unread_counts(self.client_user.id)
            )
            
            # Access annotated field
            for thread in threads_with_counts:
                _ = thread.unread_count
    
    def test_bulk_operations_optimization(self):
        """Test bulk operations are optimized"""
        thread = self.threads[0]
        messages = list(thread.messages.all())
        
        # Test bulk read receipt creation
        with self.assertNumQueries(2):  # 1 bulk_create + 1 select for existing
            receipts_to_create = []
            for message in messages:
                if not message.is_read_by(self.client_user):
                    receipt = MessageReadReceipt(
                        message=message,
                        user=self.client_user
                    )
                    receipts_to_create.append(receipt)
            
            if receipts_to_create:
                MessageReadReceipt.objects.bulk_create(
                    receipts_to_create,
                    ignore_conflicts=True
                )


class MessagingIndexTest(TestCase):
    """Test database index effectiveness"""
    
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
    
    def test_thread_index_usage(self):
        """Test that thread queries use appropriate indexes"""
        # Create test data that would benefit from indexes
        for i in range(100):
            MessageThread.objects.create(
                client=self.client_user,
                status=['active', 'waiting', 'resolved'][i % 3],
                priority=['normal', 'high', 'urgent'][i % 3],
                assigned_admin=self.admin_user if i % 2 else None,
                last_message_at=timezone.now() - timedelta(hours=i)
            )
        
        # Test queries that should use indexes
        queries = [
            # Client filter with status and ordering
            lambda: list(MessageThread.objects.filter(
                client=self.client_user,
                status='active'
            ).order_by('-last_message_at')[:10]),
            
            # Admin assignment filter
            lambda: list(MessageThread.objects.filter(
                assigned_admin=self.admin_user,
                status='active'
            ).order_by('-created_at')[:10]),
            
            # Priority and status filter
            lambda: list(MessageThread.objects.filter(
                priority='urgent',
                status='active'
            ).order_by('-created_at')[:10]),
        ]
        
        for query in queries:
            start_time = time.time()
            result = query()
            end_time = time.time()
            
            query_time = end_time - start_time
            self.assertLess(query_time, 0.1, "Index-optimized query took too long")
            self.assertGreater(len(result), 0)
    
    def test_message_index_usage(self):
        """Test that message queries use appropriate indexes"""
        thread = MessageThread.objects.create(
            client=self.client_user,
            subject='Index Test Thread'
        )
        
        # Create many messages
        for i in range(200):
            Message.objects.create(
                thread=thread,
                sender=self.admin_user if i % 2 else self.client_user,
                content=f'Index test message {i}',
                is_internal_note=(i % 10 == 0),
                created_at=timezone.now() - timedelta(minutes=i)
            )
        
        # Test queries that should use indexes
        queries = [
            # Thread filter with ordering
            lambda: list(Message.objects.filter(
                thread=thread
            ).order_by('-created_at')[:20]),
            
            # Sender filter with time ordering
            lambda: list(Message.objects.filter(
                sender=self.admin_user
            ).order_by('-created_at')[:20]),
            
            # Thread with internal note filter
            lambda: list(Message.objects.filter(
                thread=thread,
                is_internal_note=False
            ).order_by('-created_at')[:20]),
        ]
        
        for query in queries:
            start_time = time.time()
            result = query()
            end_time = time.time()
            
            query_time = end_time - start_time
            self.assertLess(query_time, 0.1, "Index-optimized query took too long")
            self.assertEqual(len(result), 20)