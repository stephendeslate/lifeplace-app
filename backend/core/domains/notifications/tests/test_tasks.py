# backend/core/domains/notifications/tests/test_tasks.py

from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache

from ..models import NotificationType, Notification
from ..tasks import (
    create_notification_async,
    bulk_create_notifications_async,
    cleanup_old_notifications,
    auto_expire_notifications,
    collect_delivery_metrics,
    update_notification_metrics,
    health_check,
)

User = get_user_model()


# Override Celery settings for testing
@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    NOTIFICATION_RATE_LIMIT='10/hour',
    NOTIFICATION_CLEANUP_DAYS=7,
)
class NotificationTasksTestCase(TestCase):
    """Test cases for notification Celery tasks"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='ADMIN'
        )
        
        self.notification_type = NotificationType.objects.create(
            code='TEST_NOTIFICATION',
            name='Test Notification',
            description='Test notification type',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='Test: {{ title }}',
            default_content_template='Test content: {{ message }}',
            is_active=True,
        )
        
        # Clear cache before each test
        cache.clear()
    
    def test_create_notification_async_success(self):
        """Test successful async notification creation"""
        context = {
            'title': 'Test Title',
            'message': 'Test message content'
        }
        
        result = create_notification_async(
            recipient_id=self.user.id,
            notification_type_code='TEST_NOTIFICATION',
            context=context
        )
        
        self.assertEqual(result['status'], 'success')
        self.assertIsNotNone(result['notification_id'])
        
        # Verify notification was created
        notification = Notification.objects.get(id=result['notification_id'])
        self.assertEqual(notification.recipient, self.user)
        self.assertEqual(notification.notification_type, self.notification_type)
        self.assertIn('Test Title', notification.title)
        self.assertIn('Test message content', notification.content)
    
    def test_create_notification_async_invalid_user(self):
        """Test async notification creation with invalid user"""
        result = create_notification_async(
            recipient_id=99999,  # Non-existent user
            notification_type_code='TEST_NOTIFICATION',
            context={'title': 'Test'}
        )
        
        self.assertEqual(result['status'], 'error')
        self.assertIn('Recipient not found', result['message'])
    
    def test_create_notification_async_invalid_type(self):
        """Test async notification creation with invalid type"""
        result = create_notification_async(
            recipient_id=self.user.id,
            notification_type_code='INVALID_TYPE',
            context={'title': 'Test'}
        )
        
        self.assertEqual(result['status'], 'error')
        self.assertIn('not found', result['message'])
    
    @patch('core.domains.notifications.tasks.rate_limit_check')
    def test_create_notification_async_rate_limited(self, mock_rate_limit):
        """Test rate limiting for async notification creation"""
        mock_rate_limit.return_value = False
        
        result = create_notification_async(
            recipient_id=self.user.id,
            notification_type_code='TEST_NOTIFICATION',
            context={'title': 'Test'}
        )
        
        self.assertEqual(result['status'], 'rate_limited')
        self.assertIsNone(result['notification_id'])
    
    def test_bulk_create_notifications_async(self):
        """Test bulk async notification creation"""
        user2 = User.objects.create_user(
            email='test2@example.com',
            password='testpass123',
            role='CLIENT'
        )
        
        recipient_ids = [self.user.id, user2.id]
        context = {'title': 'Bulk Test', 'message': 'Bulk message'}
        
        results = bulk_create_notifications_async(
            recipient_ids=recipient_ids,
            notification_type_code='TEST_NOTIFICATION',
            context=context
        )
        
        self.assertEqual(len(results), 2)
        self.assertTrue(all(result['status'] == 'queued' for result in results))
        self.assertTrue(all(result['task_id'] is not None for result in results))
    
    def test_cleanup_old_notifications(self):
        """Test cleanup of old notifications"""
        # Create old read notification
        old_notification = Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Old Notification',
            content='Old content',
            is_read=True,
            read_at=timezone.now() - timedelta(days=10),
        )
        old_notification.created_at = timezone.now() - timedelta(days=10)
        old_notification.save()
        
        # Create recent notification (should not be deleted)
        recent_notification = Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Recent Notification',
            content='Recent content',
            is_read=True,
            read_at=timezone.now() - timedelta(days=1),
        )
        
        result = cleanup_old_notifications()
        
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['cleaned_count'], 1)
        
        # Verify old notification was deleted
        with self.assertRaises(Notification.DoesNotExist):
            Notification.objects.get(id=old_notification.id)
        
        # Verify recent notification still exists
        self.assertTrue(Notification.objects.filter(id=recent_notification.id).exists())
    
    def test_auto_expire_notifications(self):
        """Test auto-expiring notifications"""
        # Create expired notification
        expired_notification = Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Expired Notification',
            content='Expired content',
            expires_at=timezone.now() - timedelta(hours=1),
            is_expired=False,
        )
        
        result = auto_expire_notifications()
        
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['expired_count'], 1)
        
        # Verify notification was marked as expired
        expired_notification.refresh_from_db()
        self.assertTrue(expired_notification.is_expired)
    
    def test_collect_delivery_metrics(self):
        """Test collection of delivery metrics"""
        # Create notifications with various delivery states
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Delivered',
            content='Content',
            delivered_via=['in_app', 'email'],
        )
        
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Not Delivered',
            content='Content',
            delivered_via=[],
        )
        
        metrics = collect_delivery_metrics()
        
        self.assertIsInstance(metrics, dict)
        self.assertIn('total_created', metrics)
        self.assertIn('total_delivered', metrics)
        self.assertIn('delivery_methods', metrics)
        self.assertIn('by_category', metrics)
        self.assertGreater(metrics['total_created'], 0)
    
    def test_update_notification_metrics(self):
        """Test updating notification metrics in cache"""
        notification_type_code = 'TEST_NOTIFICATION'
        delivery_methods = ['in_app', 'email']
        
        # Test successful notification
        update_notification_metrics(
            notification_type_code=notification_type_code,
            delivery_methods=delivery_methods,
            success=True
        )
        
        # Verify metrics were stored in cache
        cache_key = f"notification_metrics:{notification_type_code}"
        metrics = cache.get(cache_key)
        
        self.assertIsNotNone(metrics)
        self.assertEqual(metrics['total_sent'], 1)
        self.assertEqual(metrics['total_successful'], 1)
        self.assertEqual(metrics['total_failed'], 0)
        self.assertEqual(metrics['delivery_methods']['in_app'], 1)
        self.assertEqual(metrics['delivery_methods']['email'], 1)
        
        # Test failed notification
        update_notification_metrics(
            notification_type_code=notification_type_code,
            delivery_methods=[],
            success=False,
            error='Test error'
        )
        
        # Verify updated metrics
        metrics = cache.get(cache_key)
        self.assertEqual(metrics['total_sent'], 2)
        self.assertEqual(metrics['total_successful'], 1)
        self.assertEqual(metrics['total_failed'], 1)
    
    def test_health_check(self):
        """Test health check task"""
        result = health_check()
        
        self.assertEqual(result['status'], 'healthy')
        self.assertIn('timestamp', result)
        self.assertIn('message', result)
        self.assertEqual(result['message'], 'Notification system is operational')


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class NotificationTasksIntegrationTestCase(TestCase):
    """Integration tests for notification tasks with real services"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='integration@example.com',
            password='testpass123',
            first_name='Integration',
            last_name='Test',
            role='ADMIN'
        )
        
        self.notification_type = NotificationType.objects.create(
            code='INTEGRATION_TEST',
            name='Integration Test',
            description='Integration test notification',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='Integration: {{ test_title }}',
            default_content_template='Integration content: {{ test_message }}',
            supports_email=True,
            supports_sms=False,
            is_active=True,
        )
        
        cache.clear()
    
    @patch('core.domains.notifications.services.NotificationService._send_email_notification')
    def test_async_notification_with_delivery(self, mock_email_send):
        """Test async notification creation with delivery attempt"""
        mock_email_send.return_value = None  # Simulate successful email
        
        context = {
            'test_title': 'Integration Test Title',
            'test_message': 'Integration test message',
            'action_url': '/test/action'
        }
        
        result = create_notification_async(
            recipient_id=self.user.id,
            notification_type_code='INTEGRATION_TEST',
            context=context,
            delivery_methods=['in_app', 'email']
        )
        
        self.assertEqual(result['status'], 'success')
        self.assertIn('in_app', result['delivered_via'])
        
        # Verify notification was created with correct content
        notification = Notification.objects.get(id=result['notification_id'])
        self.assertIn('Integration Test Title', notification.title)
        self.assertIn('Integration test message', notification.content)
        self.assertEqual(notification.action_url, '/test/action')
        
        # Verify email delivery was attempted
        mock_email_send.assert_called_once()
    
    def test_error_handling_in_async_task(self):
        """Test error handling in async notification creation"""
        # Test with template rendering error
        error_type = NotificationType.objects.create(
            code='ERROR_TEST',
            name='Error Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='{{ invalid.nested.attribute }}',  # This will cause error
            default_content_template='Content',
            is_active=True,
        )
        
        result = create_notification_async(
            recipient_id=self.user.id,
            notification_type_code='ERROR_TEST',
            context={}
        )
        
        self.assertEqual(result['status'], 'error')
        self.assertIn('message', result)