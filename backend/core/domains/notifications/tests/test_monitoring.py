# backend/core/domains/notifications/tests/test_monitoring.py

from datetime import datetime, timedelta
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache

from ..models import NotificationType, Notification
from ..monitoring import NotificationMetrics, NotificationAlerts

User = get_user_model()


class NotificationMetricsTestCase(TestCase):
    """Test cases for notification metrics collection"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='metrics@example.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.user2 = User.objects.create_user(
            email='metrics2@example.com',
            password='testpass123',
            role='CLIENT'
        )
        
        self.notification_type = NotificationType.objects.create(
            code='METRICS_TEST',
            name='Metrics Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='Test',
            default_content_template='Test content',
            is_active=True,
        )
        
        # Clear cache before each test
        cache.clear()
    
    def test_get_delivery_stats(self):
        """Test delivery statistics collection"""
        # Create notifications with various delivery states
        successful_notification = Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Successful',
            content='Content',
            delivered_via=['in_app', 'email'],
        )
        
        failed_notification = Notification.objects.create(
            recipient=self.user2,
            notification_type=self.notification_type,
            title='Failed',
            content='Content',
            delivered_via=[],  # No delivery methods = failed
        )
        
        stats = NotificationMetrics.get_delivery_stats(hours=24)
        
        self.assertIn('total_notifications', stats)
        self.assertIn('successful_deliveries', stats)
        self.assertIn('success_rate', stats)
        self.assertIn('delivery_rates', stats)
        
        self.assertEqual(stats['total_notifications'], 2)
        self.assertEqual(stats['successful_deliveries'], 1)
        self.assertEqual(stats['success_rate'], 50.0)  # 1 out of 2 successful
        
        # Check delivery method rates
        self.assertIn('in_app', stats['delivery_rates'])
        self.assertIn('email', stats['delivery_rates'])
        self.assertIn('sms', stats['delivery_rates'])
    
    def test_get_category_breakdown(self):
        """Test category breakdown metrics"""
        # Create notifications in different categories
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,  # SYSTEM category
            title='System Notification',
            content='System content',
            is_read=True,
        )
        
        # Create another type for different category
        event_type = NotificationType.objects.create(
            code='EVENT_TEST',
            name='Event Test',
            category='EVENT',
            priority='HIGH',
            default_title_template='Event',
            default_content_template='Event content',
            is_active=True,
        )
        
        Notification.objects.create(
            recipient=self.user,
            notification_type=event_type,
            title='Event Notification',
            content='Event content',
            is_read=False,
        )
        
        breakdown = NotificationMetrics.get_category_breakdown(hours=24)
        
        self.assertIn('categories', breakdown)
        categories = breakdown['categories']
        
        self.assertIn('SYSTEM', categories)
        self.assertIn('EVENT', categories)
        
        # Check SYSTEM category stats
        system_stats = categories['SYSTEM']
        self.assertEqual(system_stats['total'], 1)
        self.assertEqual(system_stats['read'], 1)
        self.assertEqual(system_stats['unread'], 0)
        self.assertEqual(system_stats['read_rate'], 100.0)
        
        # Check EVENT category stats
        event_stats = categories['EVENT']
        self.assertEqual(event_stats['total'], 1)
        self.assertEqual(event_stats['read'], 0)
        self.assertEqual(event_stats['unread'], 1)
        self.assertEqual(event_stats['read_rate'], 0.0)
    
    def test_get_user_engagement_stats(self):
        """Test user engagement statistics"""
        # Create notifications for different users with different priorities
        high_priority_type = NotificationType.objects.create(
            code='HIGH_PRIORITY_TEST',
            name='High Priority Test',
            category='SYSTEM',
            priority='HIGH',
            default_title_template='High Priority',
            default_content_template='High priority content',
            is_active=True,
        )
        
        # Create read notification
        read_notification = Notification.objects.create(
            recipient=self.user,
            notification_type=high_priority_type,
            title='High Priority Read',
            content='Content',
            is_read=True,
            read_at=timezone.now() - timedelta(minutes=30),
        )
        
        # Create unread notification
        Notification.objects.create(
            recipient=self.user2,
            notification_type=self.notification_type,
            title='Unread',
            content='Content',
            is_read=False,
        )
        
        stats = NotificationMetrics.get_user_engagement_stats(hours=24)
        
        self.assertIn('total_recipients', stats)
        self.assertIn('total_notifications', stats)
        self.assertIn('read_notifications', stats)
        self.assertIn('overall_read_rate', stats)
        self.assertIn('avg_notifications_per_user', stats)
        self.assertIn('priority_breakdown', stats)
        
        self.assertEqual(stats['total_recipients'], 2)
        self.assertEqual(stats['total_notifications'], 2)
        self.assertEqual(stats['read_notifications'], 1)
        self.assertEqual(stats['overall_read_rate'], 50.0)
        self.assertEqual(stats['avg_notifications_per_user'], 1.0)
        
        # Check priority breakdown
        priority_stats = stats['priority_breakdown']
        self.assertIn('HIGH', priority_stats)
        self.assertIn('NORMAL', priority_stats)
    
    def test_get_system_health(self):
        """Test system health metrics"""
        # Create some notifications to test health calculation
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Healthy',
            content='Content',
            delivered_via=['in_app'],
        )
        
        health = NotificationMetrics.get_system_health()
        
        self.assertIn('status', health)
        self.assertIn('health_score', health)
        self.assertIn('recent_notifications', health)
        self.assertIn('failed_deliveries', health)
        self.assertIn('stuck_notifications', health)
        self.assertIn('recommendations', health)
        
        # Health score should be a number between 0 and 100
        self.assertGreaterEqual(health['health_score'], 0)
        self.assertLessEqual(health['health_score'], 100)
        
        # Status should be one of the expected values
        self.assertIn(health['status'], ['excellent', 'good', 'warning', 'critical', 'unknown'])
    
    def test_get_performance_metrics(self):
        """Test performance metrics collection"""
        # Create some notifications spread over time
        now = timezone.now()
        
        # Recent notification
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Recent',
            content='Content',
        )
        
        # Older notification
        old_notification = Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Old',
            content='Content',
        )
        # Modify created_at to simulate older notification
        old_notification.created_at = now - timedelta(hours=2)
        old_notification.save()
        
        metrics = NotificationMetrics.get_performance_metrics(hours=24)
        
        self.assertIn('total_volume', metrics)
        self.assertIn('hourly_average', metrics)
        self.assertIn('peak_hour_volume', metrics)
        self.assertIn('hourly_distribution', metrics)
        
        self.assertEqual(metrics['total_volume'], 2)
        self.assertGreater(metrics['hourly_average'], 0)
        self.assertIsInstance(metrics['hourly_distribution'], list)
        self.assertEqual(len(metrics['hourly_distribution']), 24)
    
    def test_cache_behavior(self):
        """Test that metrics are properly cached"""
        # First call should populate cache
        stats1 = NotificationMetrics.get_delivery_stats(hours=1)
        
        # Create a new notification
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='New after cache',
            content='Content',
        )
        
        # Second call should return cached data (same stats)
        stats2 = NotificationMetrics.get_delivery_stats(hours=1)
        
        self.assertEqual(stats1['total_notifications'], stats2['total_notifications'])
        
        # Clear cache and try again
        NotificationMetrics.clear_cache()
        stats3 = NotificationMetrics.get_delivery_stats(hours=1)
        
        # Now stats should include the new notification
        self.assertGreater(stats3['total_notifications'], stats1['total_notifications'])


class NotificationAlertsTestCase(TestCase):
    """Test cases for notification alerts system"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='alerts@example.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.notification_type = NotificationType.objects.create(
            code='ALERTS_TEST',
            name='Alerts Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='Alert Test',
            default_content_template='Alert content',
            is_active=True,
        )
        
        cache.clear()
    
    def test_check_delivery_failures_no_alert(self):
        """Test no alert when delivery failure rate is acceptable"""
        # Create mostly successful notifications
        for i in range(10):
            Notification.objects.create(
                recipient=self.user,
                notification_type=self.notification_type,
                title=f'Success {i}',
                content='Content',
                delivered_via=['in_app'],  # Successful delivery
            )
        
        # Only one failure
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Failure',
            content='Content',
            delivered_via=[],  # Failed delivery
        )
        
        alert = NotificationAlerts.check_delivery_failures(threshold=0.2)  # 20% threshold
        
        self.assertIsNone(alert)  # Should not alert for ~9% failure rate
    
    def test_check_delivery_failures_with_alert(self):
        """Test alert when delivery failure rate exceeds threshold"""
        # Create notifications with high failure rate
        for i in range(3):
            Notification.objects.create(
                recipient=self.user,
                notification_type=self.notification_type,
                title=f'Success {i}',
                content='Content',
                delivered_via=['in_app'],
            )
        
        # Create many failures
        for i in range(7):
            Notification.objects.create(
                recipient=self.user,
                notification_type=self.notification_type,
                title=f'Failure {i}',
                content='Content',
                delivered_via=[],  # Failed delivery
            )
        
        alert = NotificationAlerts.check_delivery_failures(threshold=0.2)  # 20% threshold
        
        self.assertIsNotNone(alert)
        self.assertEqual(alert['type'], 'high_failure_rate')
        self.assertIn('severity', alert)
        self.assertIn('message', alert)
        self.assertGreater(alert['actual'], alert['threshold'])
    
    def test_check_stuck_notifications_no_alert(self):
        """Test no alert when stuck notifications are below threshold"""
        # Create recent notifications (should not be considered stuck)
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Recent',
            content='Content',
            delivery_attempts={'in_app': []},  # Has delivery attempts
        )
        
        alert = NotificationAlerts.check_stuck_notifications(max_stuck=50)
        
        self.assertIsNone(alert)
    
    def test_check_stuck_notifications_with_alert(self):
        """Test alert when too many notifications are stuck"""
        # Create old notifications with no delivery attempts (stuck)
        old_time = timezone.now() - timedelta(minutes=15)
        
        for i in range(60):  # More than threshold
            stuck_notification = Notification.objects.create(
                recipient=self.user,
                notification_type=self.notification_type,
                title=f'Stuck {i}',
                content='Content',
                delivery_attempts={},  # No delivery attempts = stuck
            )
            stuck_notification.created_at = old_time
            stuck_notification.save()
        
        alert = NotificationAlerts.check_stuck_notifications(max_stuck=50)
        
        self.assertIsNotNone(alert)
        self.assertEqual(alert['type'], 'stuck_notifications')
        self.assertIn('severity', alert)
        self.assertIn('message', alert)
        self.assertGreater(alert['actual'], alert['threshold'])
    
    def test_get_all_alerts(self):
        """Test getting all active alerts"""
        # Create conditions that should trigger alerts
        
        # Create high failure rate
        for i in range(20):
            Notification.objects.create(
                recipient=self.user,
                notification_type=self.notification_type,
                title=f'Failed {i}',
                content='Content',
                delivered_via=[],  # Failed delivery
            )
        
        # Create stuck notifications
        old_time = timezone.now() - timedelta(minutes=15)
        for i in range(60):
            stuck_notification = Notification.objects.create(
                recipient=self.user,
                notification_type=self.notification_type,
                title=f'Stuck {i}',
                content='Content',
                delivery_attempts={},
            )
            stuck_notification.created_at = old_time
            stuck_notification.save()
        
        alerts = NotificationAlerts.get_all_alerts()
        
        self.assertIsInstance(alerts, list)
        self.assertGreater(len(alerts), 0)
        
        # Should have both types of alerts
        alert_types = [alert['type'] for alert in alerts]
        self.assertIn('high_failure_rate', alert_types)
        self.assertIn('stuck_notifications', alert_types)
        
        # Each alert should have required fields
        for alert in alerts:
            self.assertIn('type', alert)
            self.assertIn('severity', alert)
            self.assertIn('message', alert)
    
    def test_get_all_alerts_none(self):
        """Test getting alerts when there are none"""
        # Create healthy notifications
        Notification.objects.create(
            recipient=self.user,
            notification_type=self.notification_type,
            title='Healthy',
            content='Content',
            delivered_via=['in_app'],
            delivery_attempts={'in_app': [{'timestamp': timezone.now().isoformat()}]},
        )
        
        alerts = NotificationAlerts.get_all_alerts()
        
        self.assertIsInstance(alerts, list)
        self.assertEqual(len(alerts), 0)