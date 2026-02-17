# backend/core/domains/notifications/tests/test_models.py

"""
Tests for notification domain models.

This module tests the following models:
- NotificationType: Notification type definitions with templates
- NotificationPreference: User notification preferences
- Notification: Individual notification records
- NotificationDigest: Digest collections
- DevicePushToken: Push token management
"""

import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import IntegrityError

from core.domains.notifications.models import (
    NotificationType,
    NotificationPreference,
    Notification,
    NotificationDigest,
    DevicePushToken,
)

User = get_user_model()


@pytest.mark.django_db
class TestNotificationType:
    """Tests for NotificationType model"""

    @pytest.fixture
    def notification_type(self):
        """Create a basic notification type"""
        return NotificationType.objects.create(
            code='TEST_NOTIFICATION',
            name='Test Notification',
            description='A test notification type',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='{{ title }}',
            default_content_template='{{ content }}',
            is_active=True,
        )

    def test_notification_type_creation(self, notification_type):
        """Test notification type can be created with required fields"""
        assert notification_type.id is not None
        assert notification_type.code == 'TEST_NOTIFICATION'
        assert notification_type.name == 'Test Notification'
        assert notification_type.category == 'SYSTEM'
        assert notification_type.priority == 'NORMAL'
        assert notification_type.is_active is True

    def test_notification_type_str_representation(self, notification_type):
        """Test string representation returns the name"""
        assert str(notification_type) == 'Test Notification'

    def test_notification_type_unique_code(self, notification_type):
        """Test that code must be unique"""
        with pytest.raises(IntegrityError):
            NotificationType.objects.create(
                code='TEST_NOTIFICATION',  # Duplicate code
                name='Another Notification',
                category='SYSTEM',
                priority='NORMAL',
                default_title_template='Title',
                default_content_template='Content',
            )

    def test_notification_type_all_categories(self):
        """Test that all category choices are valid"""
        valid_categories = [
            'SYSTEM', 'EVENT', 'TASK', 'PAYMENT', 'CLIENT',
            'CONTRACT', 'WORKFLOW', 'COMMUNICATION', 'MARKETING'
        ]

        for i, category in enumerate(valid_categories):
            nt = NotificationType.objects.create(
                code=f'TEST_{category}_{i}',
                name=f'Test {category}',
                category=category,
                priority='NORMAL',
                default_title_template='Title',
                default_content_template='Content',
            )
            assert nt.category == category

    def test_notification_type_all_priorities(self):
        """Test that all priority choices are valid"""
        valid_priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

        for i, priority in enumerate(valid_priorities):
            nt = NotificationType.objects.create(
                code=f'PRIORITY_TEST_{i}',
                name=f'Test {priority}',
                category='SYSTEM',
                priority=priority,
                default_title_template='Title',
                default_content_template='Content',
            )
            assert nt.priority == priority

    def test_notification_type_with_email_template(self):
        """Test notification type with email template"""
        nt = NotificationType.objects.create(
            code='EMAIL_TYPE',
            name='Email Notification',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='Title',
            default_content_template='Content',
            default_email_template='<html><body>{{ content }}</body></html>',
            supports_email=True,
        )

        assert nt.default_email_template == '<html><body>{{ content }}</body></html>'
        assert nt.supports_email is True

    def test_notification_type_with_sms_template(self):
        """Test notification type with SMS template (max 160 chars)"""
        nt = NotificationType.objects.create(
            code='SMS_TYPE',
            name='SMS Notification',
            category='PAYMENT',
            priority='HIGH',
            default_title_template='Title',
            default_content_template='Content',
            default_sms_template='Payment received: {{ amount }}',
            supports_sms=True,
        )

        assert len(nt.default_sms_template) <= 160
        assert nt.supports_sms is True

    def test_notification_type_system_flag(self):
        """Test is_system flag for system notifications"""
        nt = NotificationType.objects.create(
            code='SYSTEM_CRITICAL',
            name='System Critical',
            category='SYSTEM',
            priority='URGENT',
            default_title_template='Critical: {{ message }}',
            default_content_template='{{ details }}',
            is_system=True,
        )

        assert nt.is_system is True

    def test_notification_type_ordering(self):
        """Test notification types are ordered by category and name"""
        # Create types in non-alphabetical order
        NotificationType.objects.create(
            code='B_TYPE',
            name='Zebra',
            category='PAYMENT',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )
        NotificationType.objects.create(
            code='A_TYPE',
            name='Alpha',
            category='EVENT',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

        types = list(NotificationType.objects.all())
        # Should be ordered by category first, then name
        assert types[0].category <= types[-1].category


@pytest.mark.django_db
class TestNotificationPreference:
    """Tests for NotificationPreference model"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='testuser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='CLIENT'
        )

    @pytest.fixture
    def notification_type(self):
        """Create a test notification type"""
        return NotificationType.objects.create(
            code='PREF_TEST',
            name='Preference Test',
            category='EVENT',
            priority='NORMAL',
            default_title_template='Title',
            default_content_template='Content',
            supports_email=True,
            supports_sms=True,
            supports_push=True,
        )

    @pytest.fixture
    def preferences(self, user):
        """Get notification preferences for user (auto-created by signal)"""
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        return prefs

    def test_preference_creation(self, preferences, user):
        """Test preference creation with defaults"""
        assert preferences.id is not None
        assert preferences.user == user
        assert preferences.email_enabled is True
        assert preferences.sms_enabled is False
        assert preferences.in_app_enabled is True
        assert preferences.push_enabled is True

    def test_preference_str_representation(self, preferences, user):
        """Test string representation"""
        assert str(preferences) == f'Preferences for {user.email}'

    def test_preference_one_to_one_constraint(self, user):
        """Test that user can only have one preference record"""
        # Ensure one preference already exists (from signal)
        assert NotificationPreference.objects.filter(user=user).exists()
        # Attempting to create another should raise IntegrityError
        with pytest.raises(IntegrityError):
            NotificationPreference.objects.create(user=user)

    def test_is_delivery_method_enabled_global_disabled(self, preferences):
        """Test delivery method check when globally disabled"""
        preferences.email_enabled = False
        preferences.save()

        # Even if category email is enabled, global takes precedence
        assert preferences.is_delivery_method_enabled('event', 'email') is False

    def test_is_delivery_method_enabled_category_disabled(self, preferences):
        """Test delivery method check when category is disabled"""
        preferences.event_email = False
        preferences.save()

        # Global is enabled but category is disabled
        assert preferences.is_delivery_method_enabled('event', 'email') is False

    def test_is_delivery_method_enabled_both_enabled(self, preferences):
        """Test delivery method check when both are enabled"""
        assert preferences.is_delivery_method_enabled('event', 'email') is True

    def test_is_notification_enabled_type_disabled(self, preferences, notification_type):
        """Test notification enabled check when type is specifically disabled"""
        preferences.disabled_types.add(notification_type)

        assert preferences.is_notification_enabled(notification_type, 'email') is False

    def test_is_notification_enabled_method_not_supported(self, preferences):
        """Test notification enabled check when method is not supported"""
        nt = NotificationType.objects.create(
            code='NO_SMS',
            name='No SMS',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
            supports_email=True,
            supports_sms=False,  # SMS not supported
        )

        # SMS is not supported by this notification type
        assert preferences.is_notification_enabled(nt, 'sms') is False

    def test_is_notification_enabled_fully_enabled(self, preferences, notification_type):
        """Test notification enabled when all conditions are met"""
        assert preferences.is_notification_enabled(notification_type, 'email') is True

    def test_category_specific_preferences(self, preferences):
        """Test category-specific preference fields"""
        # Payment category defaults (SMS enabled for payments)
        assert preferences.payment_email is True
        assert preferences.payment_sms is True  # SMS enabled for payments by default
        assert preferences.payment_in_app is True

        # Workflow category defaults (less critical)
        assert preferences.workflow_email is False
        assert preferences.workflow_sms is False

    def test_marketing_preferences_default_to_false(self, preferences):
        """Test marketing preferences default to False for GDPR compliance"""
        assert preferences.marketing_email is False
        assert preferences.marketing_sms is False
        assert preferences.marketing_push is False

    def test_quiet_hours_settings(self, preferences):
        """Test quiet hours configuration"""
        from datetime import time

        preferences.quiet_hours_enabled = True
        preferences.quiet_hours_start = time(22, 0)
        preferences.quiet_hours_end = time(8, 0)
        preferences.save()

        preferences.refresh_from_db()
        assert preferences.quiet_hours_enabled is True
        assert preferences.quiet_hours_start == time(22, 0)
        assert preferences.quiet_hours_end == time(8, 0)

    def test_digest_frequency_choices(self, preferences):
        """Test digest frequency choices"""
        valid_frequencies = ['IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY']

        for freq in valid_frequencies:
            preferences.digest_frequency = freq
            preferences.save()
            preferences.refresh_from_db()
            assert preferences.digest_frequency == freq


@pytest.mark.django_db
class TestNotification:
    """Tests for Notification model"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='recipient@example.com',
            password='testpass123',
            first_name='Recipient',
            last_name='User',
            role='CLIENT'
        )

    @pytest.fixture
    def notification_type(self):
        """Create a test notification type"""
        return NotificationType.objects.create(
            code='TEST_NOTIF',
            name='Test Notification',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='{{ title }}',
            default_content_template='{{ content }}',
        )

    @pytest.fixture
    def notification(self, user, notification_type):
        """Create a basic notification"""
        return Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Test Title',
            content='Test content',
        )

    def test_notification_creation(self, notification, user, notification_type):
        """Test notification can be created"""
        assert notification.id is not None
        assert notification.recipient == user
        assert notification.notification_type == notification_type
        assert notification.title == 'Test Title'
        assert notification.content == 'Test content'
        assert notification.is_read is False
        assert notification.read_at is None

    def test_notification_str_representation(self, notification):
        """Test string representation"""
        expected = f"{notification.notification_type.name} for {notification.recipient.email}"
        assert str(notification) == expected

    def test_notification_mark_as_read(self, notification):
        """Test marking notification as read"""
        assert notification.is_read is False
        assert notification.read_at is None

        notification.mark_as_read()

        assert notification.is_read is True
        assert notification.read_at is not None

    def test_notification_mark_as_read_already_read(self, notification):
        """Test marking already-read notification doesn't update"""
        notification.mark_as_read()
        original_read_at = notification.read_at

        # Mark as read again
        notification.mark_as_read()

        # Should not update read_at again
        assert notification.read_at == original_read_at

    def test_notification_delivery_tracking(self, notification):
        """Test delivery method tracking"""
        assert notification.delivered_via == []

        notification.add_delivery_method('in_app', success=True)
        assert 'in_app' in notification.delivered_via
        assert notification.is_delivery_successful('in_app') is True

    def test_notification_delivery_failure_tracking(self, notification):
        """Test delivery failure tracking"""
        notification.add_delivery_method('email', success=False, error='SMTP error')

        assert 'email' not in notification.delivered_via
        assert 'email' in notification.delivery_attempts
        assert notification.delivery_attempts['email'][0]['success'] is False
        assert notification.delivery_attempts['email'][0]['error'] == 'SMTP error'

    def test_notification_multiple_delivery_methods(self, notification):
        """Test multiple delivery methods"""
        notification.add_delivery_method('in_app', success=True)
        notification.add_delivery_method('email', success=True)
        notification.add_delivery_method('push', success=False, error='Token expired')

        assert len(notification.delivered_via) == 2
        assert 'in_app' in notification.delivered_via
        assert 'email' in notification.delivered_via
        assert 'push' not in notification.delivered_via

    def test_notification_with_action_url(self, user, notification_type):
        """Test notification with action URL"""
        notification = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Action Required',
            content='Please review this event',
            action_url='/events/123/review',
        )

        assert notification.action_url == '/events/123/review'

    def test_notification_with_context_data(self, user, notification_type):
        """Test notification with context data"""
        context = {
            'event_name': 'Birthday Party',
            'date': '2024-12-25',
            'location': 'Manila'
        }

        notification = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Event Update',
            content='Your event has been updated',
            context_data=context,
        )

        assert notification.context_data == context
        assert notification.context_data['event_name'] == 'Birthday Party'

    def test_notification_with_expiration(self, user, notification_type):
        """Test notification with expiration date"""
        expires = timezone.now() + timedelta(days=7)

        notification = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Limited Time Offer',
            content='This offer expires soon',
            expires_at=expires,
        )

        assert notification.expires_at is not None
        assert notification.is_expired is False

    def test_notification_ordering(self, user, notification_type):
        """Test notifications are ordered by creation date (newest first)"""
        n1 = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='First',
            content='Created first',
        )
        n2 = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Second',
            content='Created second',
        )

        notifications = list(Notification.objects.filter(recipient=user))
        assert notifications[0].title == 'Second'
        assert notifications[1].title == 'First'

    def test_notification_indexes_exist(self):
        """Test that expected indexes are defined"""
        indexes = Notification._meta.indexes
        index_fields = [tuple(idx.fields) for idx in indexes]

        assert ('recipient', '-created_at') in index_fields
        assert ('recipient', 'is_read') in index_fields
        assert ('notification_type', '-created_at') in index_fields


@pytest.mark.django_db
class TestNotificationDigest:
    """Tests for NotificationDigest model"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='digestuser@example.com',
            password='testpass123',
            role='CLIENT'
        )

    @pytest.fixture
    def notification_type(self):
        """Create a test notification type"""
        return NotificationType.objects.create(
            code='DIGEST_TEST',
            name='Digest Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

    def test_digest_creation(self, user):
        """Test digest creation"""
        now = timezone.now()
        digest = NotificationDigest.objects.create(
            user=user,
            frequency='DAILY',
            period_start=now - timedelta(days=1),
            period_end=now,
        )

        assert digest.id is not None
        assert digest.user == user
        assert digest.frequency == 'DAILY'
        assert digest.is_sent is False
        assert digest.notification_count == 0

    def test_digest_str_representation(self, user):
        """Test digest string representation"""
        now = timezone.now()
        digest = NotificationDigest.objects.create(
            user=user,
            frequency='WEEKLY',
            period_start=now - timedelta(days=7),
            period_end=now,
            notification_count=5,
        )

        expected = f"WEEKLY digest for {user.email} (5 notifications)"
        assert str(digest) == expected

    def test_digest_with_notifications(self, user, notification_type):
        """Test digest with notifications added"""
        now = timezone.now()

        # Create notifications
        n1 = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Notification 1',
            content='Content 1',
        )
        n2 = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Notification 2',
            content='Content 2',
        )

        # Create digest and add notifications
        digest = NotificationDigest.objects.create(
            user=user,
            frequency='HOURLY',
            period_start=now - timedelta(hours=1),
            period_end=now,
            notification_count=2,
        )
        digest.notifications.add(n1, n2)

        assert digest.notifications.count() == 2

    def test_digest_unique_together_constraint(self, user):
        """Test unique together constraint on user, frequency, period_start"""
        now = timezone.now()
        period_start = now - timedelta(days=1)

        NotificationDigest.objects.create(
            user=user,
            frequency='DAILY',
            period_start=period_start,
            period_end=now,
        )

        with pytest.raises(IntegrityError):
            NotificationDigest.objects.create(
                user=user,
                frequency='DAILY',
                period_start=period_start,  # Same period_start
                period_end=now,
            )

    def test_digest_sent_tracking(self, user):
        """Test digest sent status tracking"""
        now = timezone.now()
        digest = NotificationDigest.objects.create(
            user=user,
            frequency='DAILY',
            period_start=now - timedelta(days=1),
            period_end=now,
        )

        assert digest.is_sent is False
        assert digest.sent_at is None

        digest.is_sent = True
        digest.sent_at = timezone.now()
        digest.delivery_methods = ['email']
        digest.save()

        digest.refresh_from_db()
        assert digest.is_sent is True
        assert digest.sent_at is not None
        assert 'email' in digest.delivery_methods


@pytest.mark.django_db
class TestDevicePushToken:
    """Tests for DevicePushToken model"""

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
            token='ExponentPushToken[abcdef123456]',
            device_type='ios',
            device_id='device-123',
            device_name="John's iPhone",
        )

    def test_push_token_creation(self, push_token, user):
        """Test push token creation"""
        assert push_token.id is not None
        assert push_token.user == user
        assert push_token.token == 'ExponentPushToken[abcdef123456]'
        assert push_token.device_type == 'ios'
        assert push_token.is_active is True
        assert push_token.failure_count == 0

    def test_push_token_str_representation(self, push_token, user):
        """Test string representation"""
        expected = f"Push token for {user.email} (ios)"
        assert str(push_token) == expected

    def test_push_token_deactivate(self, push_token):
        """Test deactivating a push token"""
        assert push_token.is_active is True

        push_token.deactivate(reason="User logout")

        assert push_token.is_active is False

    def test_push_token_record_success(self, push_token):
        """Test recording successful push"""
        push_token.failure_count = 3
        push_token.save()

        push_token.record_success()

        assert push_token.failure_count == 0
        assert push_token.last_used_at is not None

    def test_push_token_record_failure(self, push_token):
        """Test recording push failure"""
        push_token.record_failure(permanent=False)
        assert push_token.failure_count == 1
        assert push_token.is_active is True

        push_token.record_failure(permanent=False)
        assert push_token.failure_count == 2

    def test_push_token_auto_deactivate_on_failures(self, push_token):
        """Test auto-deactivation after 5 consecutive failures"""
        for i in range(5):
            push_token.record_failure(permanent=False)

        assert push_token.is_active is False

    def test_push_token_permanent_failure(self, push_token):
        """Test permanent failure immediately deactivates"""
        push_token.record_failure(permanent=True)

        assert push_token.is_active is False

    def test_push_token_unique_together(self, user):
        """Test unique together constraint on user and token"""
        token_value = 'ExponentPushToken[unique123]'

        DevicePushToken.objects.create(
            user=user,
            token=token_value,
            device_type='ios',
        )

        with pytest.raises(IntegrityError):
            DevicePushToken.objects.create(
                user=user,
                token=token_value,  # Same token
                device_type='android',
            )

    def test_push_token_device_types(self, user):
        """Test all device types are valid"""
        device_types = ['ios', 'android', 'web']

        for i, device_type in enumerate(device_types):
            token = DevicePushToken.objects.create(
                user=user,
                token=f'ExpoPushToken[{device_type}{i}]',
                device_type=device_type,
            )
            assert token.device_type == device_type

    def test_push_token_with_app_version(self, user):
        """Test push token with app version"""
        token = DevicePushToken.objects.create(
            user=user,
            token='ExpoPushToken[version123]',
            device_type='ios',
            app_version='1.2.3',
        )

        assert token.app_version == '1.2.3'
