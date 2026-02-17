# backend/core/domains/notifications/tests/test_services.py

"""
Tests for notification domain services.

This module tests the following services:
- NotificationService
- NotificationTypeService
- NotificationStatsService
- NotificationDigestService
- PushNotificationService
"""

import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock, Mock

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from django.test import override_settings

from core.domains.notifications.models import (
    NotificationType,
    NotificationPreference,
    Notification,
    NotificationDigest,
    DevicePushToken,
)
from core.domains.notifications.services import (
    NotificationService,
    NotificationTypeService,
    NotificationStatsService,
    NotificationDigestService,
    PushNotificationService,
)
from core.domains.notifications.exceptions import (
    NotificationNotFoundException,
    NotificationTypeNotFoundException,
    NotificationPreferenceNotFoundException,
    InvalidNotificationDataException,
)

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_cache_fixture():
    """Clear cache before and after each test"""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestNotificationService:
    """Tests for NotificationService"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='serviceuser@example.com',
            password='testpass123',
            first_name='Service',
            last_name='User',
            role='CLIENT'
        )

    @pytest.fixture
    def admin_user(self):
        """Create an admin user"""
        return User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            role='ADMIN',
            is_staff=True
        )

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='SERVICE_TEST',
            name='Service Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='Hello {{ name }}',
            default_content_template='Welcome to {{ site_name }}',
            is_active=True,
        )

    @pytest.fixture
    def notification(self, user, notification_type):
        """Create a notification"""
        return Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Test Notification',
            content='Test content',
        )

    # =========================================================================
    # get_notifications tests
    # =========================================================================

    def test_get_notifications_all(self, user, notification_type):
        """Test getting all notifications for a user"""
        # Create multiple notifications
        for i in range(5):
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Notification {i}',
                content=f'Content {i}',
            )

        notifications = NotificationService.get_notifications(user)
        assert notifications.count() == 5

    def test_get_notifications_filtered_by_read_status(self, user, notification_type):
        """Test filtering notifications by read status"""
        # Create read and unread notifications
        Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Read',
            content='Read content',
            is_read=True,
        )
        Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Unread',
            content='Unread content',
            is_read=False,
        )

        unread = NotificationService.get_notifications(user, is_read=False)
        assert unread.count() == 1
        assert unread.first().title == 'Unread'

        read = NotificationService.get_notifications(user, is_read=True)
        assert read.count() == 1
        assert read.first().title == 'Read'

    def test_get_notifications_filtered_by_type(self, user, notification_type):
        """Test filtering notifications by type"""
        other_type = NotificationType.objects.create(
            code='OTHER_TYPE',
            name='Other Type',
            category='EVENT',
            priority='HIGH',
            default_title_template='T',
            default_content_template='C',
        )

        Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='System Notification',
            content='Content',
        )
        Notification.objects.create(
            recipient=user,
            notification_type=other_type,
            title='Event Notification',
            content='Content',
        )

        filtered = NotificationService.get_notifications(
            user, notification_type='SERVICE_TEST'
        )
        assert filtered.count() == 1
        assert filtered.first().title == 'System Notification'

    def test_get_notifications_filtered_by_category(self, user, notification_type):
        """Test filtering notifications by category"""
        event_type = NotificationType.objects.create(
            code='EVENT_TYPE',
            name='Event Type',
            category='EVENT',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

        Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='System',
            content='Content',
        )
        Notification.objects.create(
            recipient=user,
            notification_type=event_type,
            title='Event',
            content='Content',
        )

        filtered = NotificationService.get_notifications(user, category='EVENT')
        assert filtered.count() == 1
        assert filtered.first().title == 'Event'

    def test_get_notifications_with_limit(self, user, notification_type):
        """Test limiting number of notifications"""
        for i in range(10):
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Notification {i}',
                content='Content',
            )

        limited = NotificationService.get_notifications(user, limit=5)
        assert len(limited) == 5

    # =========================================================================
    # get_notification_by_id tests
    # =========================================================================

    def test_get_notification_by_id_found(self, notification, user):
        """Test getting notification by ID"""
        result = NotificationService.get_notification_by_id(notification.id)
        assert result.id == notification.id
        assert result.title == 'Test Notification'

    def test_get_notification_by_id_with_user_filter(self, notification, user):
        """Test getting notification by ID with user filter"""
        result = NotificationService.get_notification_by_id(notification.id, user)
        assert result.id == notification.id

    def test_get_notification_by_id_not_found(self, user):
        """Test getting non-existent notification raises exception"""
        with pytest.raises(NotificationNotFoundException):
            NotificationService.get_notification_by_id(99999)

    def test_get_notification_by_id_wrong_user(self, notification, admin_user):
        """Test getting notification for different user raises exception"""
        with pytest.raises(NotificationNotFoundException):
            NotificationService.get_notification_by_id(notification.id, admin_user)

    # =========================================================================
    # mark_as_read / mark_as_unread tests
    # =========================================================================

    def test_mark_as_read(self, notification, user):
        """Test marking notification as read"""
        assert notification.is_read is False

        result = NotificationService.mark_as_read(notification.id, user)

        assert result.is_read is True
        assert result.read_at is not None

    def test_mark_as_unread(self, notification, user):
        """Test marking notification as unread"""
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()

        result = NotificationService.mark_as_unread(notification.id, user)

        assert result.is_read is False
        assert result.read_at is None

    def test_mark_all_as_read(self, user, notification_type):
        """Test marking all notifications as read"""
        for i in range(5):
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Notification {i}',
                content='Content',
                is_read=False,
            )

        count = NotificationService.mark_all_as_read(user)
        assert count == 5

        # Verify all are read
        unread = Notification.objects.filter(recipient=user, is_read=False).count()
        assert unread == 0

    # =========================================================================
    # delete_notification tests
    # =========================================================================

    def test_delete_notification(self, notification, user):
        """Test deleting notification"""
        notification_id = notification.id

        result = NotificationService.delete_notification(notification_id, user)
        assert result is True

        # Verify deleted
        with pytest.raises(Notification.DoesNotExist):
            Notification.objects.get(id=notification_id)

    def test_delete_notification_not_found(self, user):
        """Test deleting non-existent notification raises exception"""
        with pytest.raises(NotificationNotFoundException):
            NotificationService.delete_notification(99999, user)

    # =========================================================================
    # create_notification tests
    # =========================================================================

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('core.domains.notifications.security.NotificationRateLimiter.check_creation_limit')
    @patch('core.domains.notifications.security.NotificationRateLimiter.record_creation')
    def test_create_notification_basic(self, mock_record, mock_check, user, notification_type):
        """Test creating a basic notification"""
        mock_check.return_value = (True, None)

        context = {'name': 'Test'}

        notification = NotificationService.create_notification(
            recipient=user,
            notification_type_code='SERVICE_TEST',
            context=context,
            use_async=False,
        )

        assert notification is not None
        assert notification.recipient == user
        assert notification.notification_type == notification_type
        assert 'Test' in notification.title

    @patch('core.domains.notifications.security.NotificationRateLimiter.check_creation_limit')
    def test_create_notification_rate_limited(self, mock_check, user, notification_type):
        """Test rate limiting prevents notification creation"""
        mock_check.return_value = (False, 'Rate limit exceeded')

        with pytest.raises(InvalidNotificationDataException) as exc_info:
            NotificationService.create_notification(
                recipient=user,
                notification_type_code='SERVICE_TEST',
                context={},
                use_async=False,
            )

        assert 'Rate limit exceeded' in str(exc_info.value)

    def test_create_notification_invalid_type(self, user):
        """Test creating notification with invalid type raises exception"""
        with pytest.raises(NotificationTypeNotFoundException):
            NotificationService.create_notification(
                recipient=user,
                notification_type_code='INVALID_TYPE',
                context={},
                use_async=False,
            )

    @patch('core.domains.notifications.security.NotificationRateLimiter.check_creation_limit')
    @patch('core.domains.notifications.security.NotificationRateLimiter.record_creation')
    def test_create_notification_no_enabled_methods(self, mock_record, mock_check, user, notification_type):
        """Test notification skipped when no delivery methods enabled"""
        mock_check.return_value = (True, None)

        # Get or create preferences with all methods disabled
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        prefs.email_enabled = False
        prefs.sms_enabled = False
        prefs.in_app_enabled = False
        prefs.push_enabled = False
        prefs.save()

        result = NotificationService.create_notification(
            recipient=user,
            notification_type_code='SERVICE_TEST',
            context={},
            use_async=False,
        )

        # Should return None when no delivery methods
        assert result is None

    # =========================================================================
    # bulk_action tests
    # =========================================================================

    def test_bulk_action_mark_read(self, user, notification_type):
        """Test bulk mark as read action"""
        notifications = [
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Notification {i}',
                content='Content',
                is_read=False,
            )
            for i in range(3)
        ]
        notification_ids = [n.id for n in notifications]

        count = NotificationService.bulk_action(user.id, notification_ids, 'mark_read')
        assert count == 3

        # Verify all are read
        for n in notifications:
            n.refresh_from_db()
            assert n.is_read is True

    def test_bulk_action_mark_unread(self, user, notification_type):
        """Test bulk mark as unread action"""
        notifications = [
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Notification {i}',
                content='Content',
                is_read=True,
            )
            for i in range(3)
        ]
        notification_ids = [n.id for n in notifications]

        count = NotificationService.bulk_action(user.id, notification_ids, 'mark_unread')
        assert count == 3

    def test_bulk_action_delete(self, user, notification_type):
        """Test bulk delete action"""
        notifications = [
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Notification {i}',
                content='Content',
            )
            for i in range(3)
        ]
        notification_ids = [n.id for n in notifications]

        count = NotificationService.bulk_action(user.id, notification_ids, 'delete')
        assert count == 3

        # Verify all deleted
        remaining = Notification.objects.filter(id__in=notification_ids).count()
        assert remaining == 0

    def test_bulk_action_empty_ids(self, user):
        """Test bulk action with empty IDs raises exception"""
        with pytest.raises(InvalidNotificationDataException):
            NotificationService.bulk_action(user.id, [], 'mark_read')

    def test_bulk_action_no_matching(self, user):
        """Test bulk action with no matching notifications raises exception"""
        with pytest.raises(NotificationNotFoundException):
            NotificationService.bulk_action(user.id, [99999], 'mark_read')

    # =========================================================================
    # get_notification_counts tests
    # =========================================================================

    def test_get_notification_counts(self, user, notification_type):
        """Test getting notification counts"""
        # Create various notifications
        for i in range(3):
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Read {i}',
                content='Content',
                is_read=True,
            )
        for i in range(2):
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Unread {i}',
                content='Content',
                is_read=False,
            )

        counts = NotificationService.get_notification_counts(user.id)

        assert counts['total'] == 5
        assert counts['unread'] == 2
        assert 'by_category' in counts
        assert 'by_priority' in counts

    # =========================================================================
    # preferences tests
    # =========================================================================

    def test_get_or_create_user_preferences_create(self, user):
        """Test preferences are created if they don't exist"""
        # Ensure no preferences exist
        NotificationPreference.objects.filter(user=user).delete()

        prefs = NotificationService.get_or_create_user_preferences(user.id)

        assert prefs is not None
        assert prefs.user == user
        assert prefs.email_enabled is True  # Default

    def test_get_or_create_user_preferences_get(self, user):
        """Test existing preferences are returned"""
        # Get the auto-created preferences and modify them
        existing, _ = NotificationPreference.objects.get_or_create(user=user)
        existing.email_enabled = False
        existing.save()

        prefs = NotificationService.get_or_create_user_preferences(user.id)

        assert prefs.id == existing.id
        assert prefs.email_enabled is False

    def test_get_or_create_user_preferences_invalid_user(self):
        """Test invalid user raises exception"""
        with pytest.raises(NotificationPreferenceNotFoundException):
            NotificationService.get_or_create_user_preferences(99999)

    def test_update_user_preferences(self, user):
        """Test updating user preferences"""
        NotificationPreference.objects.get_or_create(user=user)

        update_data = {
            'email_enabled': False,
            'marketing_email': True,
            'digest_frequency': 'DAILY',
        }

        prefs = NotificationService.update_user_preferences(user.id, update_data)

        assert prefs.email_enabled is False
        assert prefs.marketing_email is True
        assert prefs.digest_frequency == 'DAILY'

    # =========================================================================
    # cleanup and expiration tests
    # =========================================================================

    def test_cleanup_old_notifications(self, user, notification_type):
        """Test cleanup of old read notifications"""
        # Create old notification
        old_notif = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Old',
            content='Content',
            is_read=True,
        )
        # Manually set created_at to old date
        Notification.objects.filter(id=old_notif.id).update(
            created_at=timezone.now() - timedelta(days=100)
        )

        # Create recent notification
        Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Recent',
            content='Content',
            is_read=True,
        )

        deleted_count = NotificationService.cleanup_old_notifications(days=90)
        assert deleted_count == 1

        # Verify recent notification still exists
        assert Notification.objects.filter(title='Recent').exists()

    def test_auto_expire_notifications(self, user, notification_type):
        """Test auto-expiring notifications"""
        # Create expired notification
        expired = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Expired',
            content='Content',
            expires_at=timezone.now() - timedelta(hours=1),
            is_expired=False,
        )

        # Create non-expired notification
        Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Not Expired',
            content='Content',
            expires_at=timezone.now() + timedelta(days=1),
            is_expired=False,
        )

        count = NotificationService.auto_expire_notifications()
        assert count == 1

        expired.refresh_from_db()
        assert expired.is_expired is True


@pytest.mark.django_db
class TestNotificationTypeService:
    """Tests for NotificationTypeService"""

    @pytest.fixture
    def notification_types(self):
        """Create multiple notification types"""
        types = []
        categories = ['SYSTEM', 'EVENT', 'PAYMENT']
        for i, category in enumerate(categories):
            types.append(
                NotificationType.objects.create(
                    code=f'TYPE_{category}_{i}',
                    name=f'{category} Type',
                    category=category,
                    priority='NORMAL',
                    default_title_template='T',
                    default_content_template='C',
                    is_active=True,
                )
            )
        return types

    def test_get_all_notification_types(self, notification_types):
        """Test getting all notification types"""
        types = NotificationTypeService.get_all_notification_types()
        assert types.count() >= 3

    def test_get_notification_types_by_category(self, notification_types):
        """Test filtering notification types by category"""
        types = NotificationTypeService.get_all_notification_types(category='EVENT')
        # At least the one we created, plus any defaults from the system
        assert types.count() >= 1
        assert all(t.category == 'EVENT' for t in types)

    def test_get_notification_types_by_active_status(self, notification_types):
        """Test filtering by active status"""
        # Create inactive type
        NotificationType.objects.create(
            code='INACTIVE',
            name='Inactive',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
            is_active=False,
        )

        active = NotificationTypeService.get_all_notification_types(is_active=True)
        inactive = NotificationTypeService.get_all_notification_types(is_active=False)

        assert all(t.is_active for t in active)
        assert all(not t.is_active for t in inactive)

    def test_get_notification_type_by_code(self, notification_types):
        """Test getting notification type by code"""
        nt = NotificationTypeService.get_notification_type_by_code('TYPE_SYSTEM_0')
        assert nt.code == 'TYPE_SYSTEM_0'
        assert nt.category == 'SYSTEM'

    def test_get_notification_type_by_code_not_found(self):
        """Test getting non-existent type raises exception"""
        with pytest.raises(NotificationTypeNotFoundException):
            NotificationTypeService.get_notification_type_by_code('NONEXISTENT')

    def test_create_notification_type(self):
        """Test creating a new notification type"""
        type_data = {
            'code': 'NEW_SERVICE_TYPE',
            'name': 'New Service Type',
            'category': 'WORKFLOW',
            'priority': 'HIGH',
            'default_title_template': 'Workflow: {{ action }}',
            'default_content_template': 'Details: {{ details }}',
        }

        nt = NotificationTypeService.create_notification_type(type_data)

        assert nt.code == 'NEW_SERVICE_TYPE'
        assert nt.category == 'WORKFLOW'
        assert nt.priority == 'HIGH'

    def test_update_notification_type(self, notification_types):
        """Test updating a notification type"""
        nt = notification_types[0]

        update_data = {
            'name': 'Updated Name',
            'priority': 'URGENT',
        }

        updated = NotificationTypeService.update_notification_type(nt.id, update_data)

        assert updated.name == 'Updated Name'
        assert updated.priority == 'URGENT'

    def test_update_notification_type_not_found(self):
        """Test updating non-existent type raises exception"""
        with pytest.raises(NotificationTypeNotFoundException):
            NotificationTypeService.update_notification_type(99999, {'name': 'Test'})


@pytest.mark.django_db
class TestNotificationStatsService:
    """Tests for NotificationStatsService"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='statsuser@example.com',
            password='testpass123',
            role='CLIENT'
        )

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='STATS_TEST',
            name='Stats Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

    @pytest.fixture
    def notifications(self, user, notification_type):
        """Create sample notifications for stats"""
        notifications = []
        for i in range(10):
            n = Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Stats Notification {i}',
                content='Content',
                is_read=(i < 7),  # 7 read, 3 unread
                delivered_via=['in_app'] if i < 8 else ['in_app', 'email'],
            )
            notifications.append(n)
        return notifications

    def test_get_user_stats(self, user, notifications):
        """Test getting user statistics"""
        stats = NotificationStatsService.get_user_stats(user.id, days=30)

        assert stats['total_sent'] == 10
        assert stats['total_read'] == 7
        assert stats['read_rate'] == 70.0
        assert 'delivery_rates' in stats
        assert 'popular_types' in stats

    def test_get_user_stats_empty(self, user):
        """Test getting stats for user with no notifications"""
        stats = NotificationStatsService.get_user_stats(user.id, days=30)

        assert stats['total_sent'] == 0
        assert stats['read_rate'] == 0

    def test_get_system_stats(self, user, notifications):
        """Test getting system-wide statistics"""
        stats = NotificationStatsService.get_system_stats(days=30)

        assert stats['total_sent'] == 10
        assert stats['total_users'] == 1
        assert 'by_category' in stats
        assert 'delivery_stats' in stats


@pytest.mark.django_db
class TestNotificationDigestService:
    """Tests for NotificationDigestService"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        user = User.objects.create_user(
            email='digestuser@example.com',
            password='testpass123',
            first_name='Digest',
            last_name='User',
            role='CLIENT'
        )
        # Signal auto-creates NotificationPreference, so just ensure it exists
        NotificationPreference.objects.get_or_create(user=user)
        return user

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='DIGEST_SERVICE_TEST',
            name='Digest Service Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

    @pytest.fixture
    def unread_notifications(self, user, notification_type):
        """Create unread notifications for digest"""
        now = timezone.now()
        notifications = []
        for i in range(5):
            n = Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Digest Notification {i}',
                content=f'Content {i}',
                is_read=False,
            )
            # Set created_at to within the past hour
            Notification.objects.filter(id=n.id).update(
                created_at=now - timedelta(minutes=30)
            )
            n.refresh_from_db()
            notifications.append(n)
        return notifications

    def test_create_digest(self, user, unread_notifications):
        """Test creating a notification digest"""
        now = timezone.now()
        period_start = now - timedelta(hours=1)
        period_end = now

        digest = NotificationDigestService.create_digest(
            user=user,
            frequency='HOURLY',
            period_start=period_start,
            period_end=period_end,
        )

        assert digest is not None
        assert digest.user == user
        assert digest.frequency == 'HOURLY'
        assert digest.notification_count == 5
        assert digest.notifications.count() == 5

    def test_create_digest_no_notifications(self, user):
        """Test creating digest with no notifications returns None"""
        now = timezone.now()

        digest = NotificationDigestService.create_digest(
            user=user,
            frequency='DAILY',
            period_start=now - timedelta(days=1),
            period_end=now,
        )

        assert digest is None

    @patch('core.domains.notifications.services.NotificationDigestService._send_email_digest')
    def test_send_digest(self, mock_email, user, unread_notifications):
        """Test sending a digest"""
        now = timezone.now()

        digest = NotificationDigestService.create_digest(
            user=user,
            frequency='HOURLY',
            period_start=now - timedelta(hours=1),
            period_end=now,
        )

        result = NotificationDigestService.send_digest(digest.id)

        assert result.is_sent is True
        assert result.sent_at is not None
        assert 'email' in result.delivery_methods

    def test_send_digest_already_sent(self, user, unread_notifications):
        """Test sending already-sent digest returns without resending"""
        now = timezone.now()

        digest = NotificationDigestService.create_digest(
            user=user,
            frequency='HOURLY',
            period_start=now - timedelta(hours=1),
            period_end=now,
        )
        digest.is_sent = True
        digest.save()

        result = NotificationDigestService.send_digest(digest.id)

        # Should return the same digest without modification
        assert result.id == digest.id


@pytest.mark.django_db
class TestPushNotificationService:
    """Tests for PushNotificationService"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='pushuser@example.com',
            password='testpass123',
            role='CLIENT'
        )

    @pytest.fixture
    def push_token(self, user):
        """Create a push token"""
        return DevicePushToken.objects.create(
            user=user,
            token='ExponentPushToken[test123]',
            device_type='ios',
            device_id='device-123',
        )

    # =========================================================================
    # Token validation tests
    # =========================================================================

    def test_is_valid_expo_token_valid(self):
        """Test valid Expo token formats"""
        valid_tokens = [
            'ExponentPushToken[xxxxxxxxxxxxxx]',
            'ExpoPushToken[xxxxxxxxxxxxxxx]',
            'ExponentPushToken[abc123def456]',
        ]

        for token in valid_tokens:
            assert PushNotificationService.is_valid_expo_token(token) is True

    def test_is_valid_expo_token_invalid(self):
        """Test invalid token formats"""
        invalid_tokens = [
            'invalid_token',
            'ExponentPushToken',
            'ExponentPushToken[',
            'ExponentPushToken]',
            'RandomToken[xxx]',
            '',
            None,
        ]

        for token in invalid_tokens:
            assert PushNotificationService.is_valid_expo_token(token) is False

    # =========================================================================
    # Token registration tests
    # =========================================================================

    def test_register_token_new(self, user):
        """Test registering a new token"""
        token = 'ExponentPushToken[new123]'

        result = PushNotificationService.register_token(
            user=user,
            token=token,
            device_type='android',
            device_id='new-device',
            device_name='Test Android',
            app_version='1.0.0',
        )

        assert result.token == token
        assert result.device_type == 'android'
        assert result.is_active is True

    def test_register_token_reactivate_existing(self, user, push_token):
        """Test reactivating an existing inactive token"""
        push_token.is_active = False
        push_token.failure_count = 3
        push_token.save()

        result = PushNotificationService.register_token(
            user=user,
            token=push_token.token,
            device_type='ios',
        )

        assert result.id == push_token.id
        assert result.is_active is True
        assert result.failure_count == 0

    def test_register_token_deactivates_old_device(self, user):
        """Test registering new token deactivates old token for same device"""
        old_token = DevicePushToken.objects.create(
            user=user,
            token='ExponentPushToken[old123]',
            device_type='ios',
            device_id='same-device',
            is_active=True,
        )

        new_token = PushNotificationService.register_token(
            user=user,
            token='ExponentPushToken[new456]',
            device_type='ios',
            device_id='same-device',
        )

        old_token.refresh_from_db()
        assert old_token.is_active is False
        assert new_token.is_active is True

    def test_register_token_invalid_format(self, user):
        """Test registering invalid token raises error"""
        with pytest.raises(ValueError):
            PushNotificationService.register_token(
                user=user,
                token='invalid_token',
            )

    # =========================================================================
    # Token unregistration tests
    # =========================================================================

    def test_unregister_token_by_token(self, user, push_token):
        """Test unregistering by token value"""
        count = PushNotificationService.unregister_token(
            user=user,
            token=push_token.token,
        )

        assert count == 1
        push_token.refresh_from_db()
        assert push_token.is_active is False

    def test_unregister_token_by_device_id(self, user):
        """Test unregistering by device_id"""
        for i in range(3):
            DevicePushToken.objects.create(
                user=user,
                token=f'ExponentPushToken[device{i}]',
                device_type='ios',
                device_id='same-device',
            )

        count = PushNotificationService.unregister_token(
            user=user,
            device_id='same-device',
        )

        assert count == 3

    def test_unregister_token_requires_identifier(self, user):
        """Test unregistering requires token or device_id"""
        with pytest.raises(ValueError):
            PushNotificationService.unregister_token(user=user)

    # =========================================================================
    # Push sending tests
    # =========================================================================

    def test_send_push_notification_success(self):
        """Test successful push notification (or graceful handling when SDK not installed)"""
        import sys
        mock_sdk = MagicMock()
        mock_sdk.DeviceNotRegisteredError = type('DeviceNotRegisteredError', (Exception,), {})
        mock_sdk.PushServerError = type('PushServerError', (Exception,), {})
        mock_response = MagicMock()
        mock_response.push_message = MagicMock()
        mock_response.validate_response = MagicMock()
        mock_sdk.PushClient.return_value.publish.return_value = mock_response

        with patch.dict(sys.modules, {'exponent_server_sdk': mock_sdk}):
            with patch.object(PushNotificationService, 'get_push_client', return_value=mock_sdk.PushClient()):
                result = PushNotificationService.send_push_notification(
                    push_token='ExponentPushToken[test123]',
                    title='Test Title',
                    body='Test Body',
                )

                assert result['success'] is True
                assert result['error'] is None

    def test_send_push_notification_invalid_token(self):
        """Test push with invalid token returns failure"""
        import sys
        mock_sdk = MagicMock()
        mock_sdk.DeviceNotRegisteredError = type('DeviceNotRegisteredError', (Exception,), {})
        mock_sdk.PushServerError = type('PushServerError', (Exception,), {})

        with patch.dict(sys.modules, {'exponent_server_sdk': mock_sdk}):
            result = PushNotificationService.send_push_notification(
                push_token='invalid_token',
                title='Test',
                body='Test',
            )

            assert result['success'] is False
            assert result['permanent_failure'] is True
            assert 'Invalid token' in result['error']

    @patch('core.domains.notifications.services.PushNotificationService.send_push_notification')
    def test_send_push_to_user(self, mock_send, user):
        """Test sending push to all user devices"""
        # Create multiple tokens
        for i in range(3):
            DevicePushToken.objects.create(
                user=user,
                token=f'ExponentPushToken[multi{i}]',
                device_type='ios',
            )

        mock_send.return_value = {'success': True, 'error': None, 'permanent_failure': False}

        result = PushNotificationService.send_push_to_user(
            user_id=user.id,
            title='Test',
            body='Test body',
        )

        assert result['total_devices'] == 3
        assert result['successful'] == 3
        assert result['failed'] == 0

    def test_send_push_to_user_no_devices(self, user):
        """Test sending push to user with no devices"""
        # Ensure no tokens exist
        DevicePushToken.objects.filter(user=user).delete()

        result = PushNotificationService.send_push_to_user(
            user_id=user.id,
            title='Test',
            body='Test body',
        )

        assert result['total_devices'] == 0

    # =========================================================================
    # Token cleanup tests
    # =========================================================================

    def test_cleanup_inactive_tokens(self, user):
        """Test cleaning up inactive/stale tokens"""
        # Create old inactive token
        old_token = DevicePushToken.objects.create(
            user=user,
            token='ExponentPushToken[old]',
            device_type='ios',
            is_active=False,
        )
        # Set updated_at to old date
        DevicePushToken.objects.filter(id=old_token.id).update(
            updated_at=timezone.now() - timedelta(days=100)
        )

        # Create recent active token
        DevicePushToken.objects.create(
            user=user,
            token='ExponentPushToken[recent]',
            device_type='ios',
            is_active=True,
        )

        deleted_count = PushNotificationService.cleanup_inactive_tokens(days=90)
        assert deleted_count >= 1

        # Recent token should still exist
        assert DevicePushToken.objects.filter(token='ExponentPushToken[recent]').exists()

    def test_get_user_push_tokens(self, user, push_token):
        """Test getting active push tokens for a user"""
        # Create inactive token
        DevicePushToken.objects.create(
            user=user,
            token='ExponentPushToken[inactive]',
            device_type='ios',
            is_active=False,
        )

        tokens = PushNotificationService.get_user_push_tokens(user.id)

        # Should only return active tokens
        assert tokens.count() == 1
        assert tokens.first().token == push_token.token
