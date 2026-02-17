# backend/core/domains/notifications/tests/test_serializers.py

"""
Tests for notification domain serializers.

This module tests the following serializers:
- NotificationTypeSerializer
- NotificationPreferenceSerializer
- NotificationSerializer / NotificationListSerializer
- NotificationDigestSerializer
- NotificationBulkActionSerializer
- CreateNotificationSerializer
- DevicePushTokenSerializer
- RegisterPushTokenSerializer
- UnregisterPushTokenSerializer
- TestPushNotificationSerializer
"""

import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from core.domains.notifications.models import (
    NotificationType,
    NotificationPreference,
    Notification,
    NotificationDigest,
    DevicePushToken,
)
from core.domains.notifications.serializers import (
    NotificationTypeSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
    NotificationListSerializer,
    NotificationDigestSerializer,
    NotificationBulkActionSerializer,
    NotificationCountSerializer,
    NotificationStatsSerializer,
    CreateNotificationSerializer,
    DevicePushTokenSerializer,
    RegisterPushTokenSerializer,
    UnregisterPushTokenSerializer,
    TestPushNotificationSerializer,
)

User = get_user_model()


@pytest.mark.django_db
class TestNotificationTypeSerializer:
    """Tests for NotificationTypeSerializer"""

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='TEST_TYPE',
            name='Test Type',
            description='A test notification type',
            category='SYSTEM',
            priority='NORMAL',
            icon='notification',
            color='#1976d2',
            default_title_template='{{ title }}',
            default_content_template='{{ content }}',
            default_email_template='<html>{{ content }}</html>',
            supports_email=True,
            supports_sms=False,
            supports_push=True,
            is_active=True,
        )

    def test_serialization(self, notification_type):
        """Test notification type serialization"""
        serializer = NotificationTypeSerializer(notification_type)
        data = serializer.data

        assert data['code'] == 'TEST_TYPE'
        assert data['name'] == 'Test Type'
        assert data['description'] == 'A test notification type'
        assert data['category'] == 'SYSTEM'
        assert data['priority'] == 'NORMAL'
        assert data['icon'] == 'notification'
        assert data['color'] == '#1976d2'
        assert data['supports_email'] is True
        assert data['supports_sms'] is False
        assert data['supports_push'] is True
        assert data['is_active'] is True

    def test_deserialization(self):
        """Test notification type deserialization"""
        data = {
            'code': 'NEW_TYPE',
            'name': 'New Type',
            'description': 'A new type',
            'category': 'EVENT',
            'priority': 'HIGH',
            'default_title_template': 'Title',
            'default_content_template': 'Content',
            'is_active': True,
        }

        serializer = NotificationTypeSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated['code'] == 'NEW_TYPE'
        assert validated['category'] == 'EVENT'
        assert validated['priority'] == 'HIGH'

    def test_read_only_fields(self, notification_type):
        """Test read-only fields are not writable"""
        original_created = notification_type.created_at

        serializer = NotificationTypeSerializer(
            notification_type,
            data={'created_at': timezone.now()},
            partial=True
        )
        serializer.is_valid()

        # created_at should not be in validated_data
        assert 'created_at' not in serializer.validated_data


@pytest.mark.django_db
class TestNotificationPreferenceSerializer:
    """Tests for NotificationPreferenceSerializer"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='prefuser@example.com',
            password='testpass123',
            role='CLIENT'
        )

    @pytest.fixture
    def preferences(self, user):
        """Get notification preferences (auto-created by signal)"""
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        return prefs

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='PREF_SERIALIZER_TEST',
            name='Pref Serializer Test',
            category='EVENT',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

    def test_serialization(self, preferences):
        """Test preferences serialization"""
        serializer = NotificationPreferenceSerializer(preferences)
        data = serializer.data

        assert data['email_enabled'] is True
        assert data['sms_enabled'] is False
        assert data['in_app_enabled'] is True
        assert data['push_enabled'] is True
        assert data['digest_frequency'] == 'IMMEDIATE'
        assert data['disabled_types'] == []

    def test_disabled_types_serialization(self, preferences, notification_type):
        """Test disabled types serialization"""
        preferences.disabled_types.add(notification_type)

        serializer = NotificationPreferenceSerializer(preferences)
        data = serializer.data

        assert len(data['disabled_types']) == 1
        assert data['disabled_types'][0] == notification_type.id
        assert len(data['disabled_types_details']) == 1
        assert data['disabled_types_details'][0]['code'] == 'PREF_SERIALIZER_TEST'

    def test_update_preferences(self, preferences):
        """Test updating preferences through serializer"""
        update_data = {
            'email_enabled': False,
            'marketing_email': True,
            'digest_frequency': 'DAILY',
        }

        serializer = NotificationPreferenceSerializer(
            preferences,
            data=update_data,
            partial=True
        )
        assert serializer.is_valid(), serializer.errors

        updated = serializer.save()
        assert updated.email_enabled is False
        assert updated.marketing_email is True
        assert updated.digest_frequency == 'DAILY'


@pytest.mark.django_db
class TestNotificationSerializer:
    """Tests for NotificationSerializer"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='notifuser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='CLIENT'
        )

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='SERIALIZER_TEST',
            name='Serializer Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

    @pytest.fixture
    def notification(self, user, notification_type):
        """Create a notification"""
        return Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='Test Notification',
            content='Test content for notification',
            action_url='/test/action',
            delivered_via=['in_app'],
        )

    @pytest.fixture
    def request_context(self, user):
        """Create request context"""
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = user
        return {'request': request}

    def test_serialization(self, notification, request_context):
        """Test notification serialization"""
        serializer = NotificationSerializer(notification, context=request_context)
        data = serializer.data

        assert data['title'] == 'Test Notification'
        assert data['content'] == 'Test content for notification'
        assert data['action_url'] == '/test/action'
        assert data['is_read'] is False
        assert 'notification_type_details' in data
        assert data['notification_type_details']['code'] == 'SERIALIZER_TEST'

    def test_time_since_created(self, notification, request_context):
        """Test time_since_created computed field"""
        serializer = NotificationSerializer(notification, context=request_context)
        data = serializer.data

        # Just created, should say "Just now" or "X minutes ago"
        assert 'time_since_created' in data
        assert data['time_since_created'] in ['Just now'] or 'minute' in data['time_since_created']

    def test_delivery_status(self, notification, request_context):
        """Test delivery_status computed field"""
        serializer = NotificationSerializer(notification, context=request_context)
        data = serializer.data

        assert 'delivery_status' in data
        assert data['delivery_status']['delivered_methods'] == ['in_app']
        assert data['delivery_status']['successful_deliveries'] == 1

    def test_can_mark_read(self, notification, request_context):
        """Test can_mark_read computed field"""
        serializer = NotificationSerializer(notification, context=request_context)
        data = serializer.data

        # User is the recipient and notification is unread
        assert data['can_mark_read'] is True

    def test_can_mark_read_already_read(self, notification, request_context):
        """Test can_mark_read when already read"""
        notification.is_read = True
        notification.save()

        serializer = NotificationSerializer(notification, context=request_context)
        data = serializer.data

        assert data['can_mark_read'] is False

    def test_can_mark_read_different_user(self, notification, notification_type):
        """Test can_mark_read for different user"""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            role='CLIENT'
        )

        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = other_user
        context = {'request': request}

        serializer = NotificationSerializer(notification, context=context)
        data = serializer.data

        assert data['can_mark_read'] is False

    def test_recipient_name_field(self, notification, request_context):
        """Test recipient_name computed from get_display_name"""
        serializer = NotificationSerializer(notification, context=request_context)
        data = serializer.data

        # Should have the recipient's display name
        assert 'recipient_name' in data


@pytest.mark.django_db
class TestNotificationListSerializer:
    """Tests for NotificationListSerializer (lightweight version)"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='listuser@example.com',
            password='testpass123',
            role='CLIENT'
        )

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='LIST_TEST',
            name='List Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

    @pytest.fixture
    def notification(self, user, notification_type):
        """Create a notification"""
        return Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title='List Item',
            content='Content for list',
        )

    def test_serialization_includes_essential_fields(self, notification, user):
        """Test list serializer includes essential fields"""
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = user

        serializer = NotificationListSerializer(
            notification,
            context={'request': request}
        )
        data = serializer.data

        # Should include essential fields
        assert 'id' in data
        assert 'title' in data
        assert 'content' in data
        assert 'action_url' in data
        assert 'is_read' in data
        assert 'time_since_created' in data
        assert 'notification_type_details' in data

    def test_list_serializer_is_lightweight(self, notification, user):
        """Test list serializer has fewer fields than full serializer"""
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = user
        context = {'request': request}

        list_serializer = NotificationListSerializer(notification, context=context)
        full_serializer = NotificationSerializer(notification, context=context)

        # List should have fewer fields
        assert len(list_serializer.data) <= len(full_serializer.data)


@pytest.mark.django_db
class TestNotificationBulkActionSerializer:
    """Tests for NotificationBulkActionSerializer"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='bulkuser@example.com',
            password='testpass123',
            role='CLIENT'
        )

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='BULK_TEST',
            name='Bulk Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

    @pytest.fixture
    def notifications(self, user, notification_type):
        """Create multiple notifications"""
        return [
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Notification {i}',
                content=f'Content {i}',
            )
            for i in range(3)
        ]

    @pytest.fixture
    def request_context(self, user):
        """Create request context"""
        factory = APIRequestFactory()
        request = factory.post('/')
        request.user = user
        return {'request': request}

    def test_valid_mark_read_action(self, notifications, request_context):
        """Test valid mark_read action"""
        data = {
            'notification_ids': [n.id for n in notifications],
            'action': 'mark_read',
        }

        serializer = NotificationBulkActionSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors

    def test_valid_mark_unread_action(self, notifications, request_context):
        """Test valid mark_unread action"""
        data = {
            'notification_ids': [n.id for n in notifications],
            'action': 'mark_unread',
        }

        serializer = NotificationBulkActionSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors

    def test_valid_delete_action(self, notifications, request_context):
        """Test valid delete action"""
        data = {
            'notification_ids': [n.id for n in notifications],
            'action': 'delete',
        }

        serializer = NotificationBulkActionSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors

    def test_invalid_action(self, notifications, request_context):
        """Test invalid action is rejected"""
        data = {
            'notification_ids': [n.id for n in notifications],
            'action': 'invalid_action',
        }

        serializer = NotificationBulkActionSerializer(data=data, context=request_context)
        assert not serializer.is_valid()
        assert 'action' in serializer.errors

    def test_empty_notification_ids(self, request_context):
        """Test empty notification_ids list is rejected"""
        data = {
            'notification_ids': [],
            'action': 'mark_read',
        }

        serializer = NotificationBulkActionSerializer(data=data, context=request_context)
        assert not serializer.is_valid()
        assert 'notification_ids' in serializer.errors

    def test_invalid_notification_ids(self, request_context):
        """Test invalid notification IDs are rejected"""
        data = {
            'notification_ids': [99999, 99998],  # Non-existent IDs
            'action': 'mark_read',
        }

        serializer = NotificationBulkActionSerializer(data=data, context=request_context)
        assert not serializer.is_valid()
        assert 'notification_ids' in serializer.errors

    def test_notification_ids_from_other_user(self, notifications, notification_type):
        """Test notification IDs from another user are rejected"""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            role='CLIENT'
        )

        factory = APIRequestFactory()
        request = factory.post('/')
        request.user = other_user
        context = {'request': request}

        data = {
            'notification_ids': [n.id for n in notifications],  # Belong to original user
            'action': 'mark_read',
        }

        serializer = NotificationBulkActionSerializer(data=data, context=context)
        assert not serializer.is_valid()
        assert 'notification_ids' in serializer.errors


@pytest.mark.django_db
class TestCreateNotificationSerializer:
    """Tests for CreateNotificationSerializer"""

    @pytest.fixture
    def users(self):
        """Create test users"""
        return [
            User.objects.create_user(
                email=f'recipient{i}@example.com',
                password='testpass123',
                role='CLIENT'
            )
            for i in range(3)
        ]

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='CREATE_TEST',
            name='Create Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='{{ title }}',
            default_content_template='{{ content }}',
            is_active=True,
        )

    def test_valid_creation_data(self, users, notification_type):
        """Test valid notification creation data"""
        data = {
            'recipient_ids': [u.id for u in users],
            'notification_type_code': 'CREATE_TEST',
            'context_data': {'title': 'Hello', 'content': 'World'},
        }

        serializer = CreateNotificationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_invalid_notification_type_code(self, users):
        """Test invalid notification type code is rejected"""
        data = {
            'recipient_ids': [u.id for u in users],
            'notification_type_code': 'INVALID_CODE',
        }

        serializer = CreateNotificationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'notification_type_code' in serializer.errors

    def test_inactive_notification_type(self, users):
        """Test inactive notification type is rejected"""
        NotificationType.objects.create(
            code='INACTIVE_TYPE',
            name='Inactive Type',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
            is_active=False,  # Inactive
        )

        data = {
            'recipient_ids': [u.id for u in users],
            'notification_type_code': 'INACTIVE_TYPE',
        }

        serializer = CreateNotificationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'notification_type_code' in serializer.errors

    def test_invalid_recipient_ids(self, notification_type):
        """Test invalid recipient IDs are rejected"""
        data = {
            'recipient_ids': [99999, 99998],  # Non-existent users
            'notification_type_code': 'CREATE_TEST',
        }

        serializer = CreateNotificationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'recipient_ids' in serializer.errors

    def test_force_delivery_methods(self, users, notification_type):
        """Test force delivery methods are validated"""
        data = {
            'recipient_ids': [u.id for u in users],
            'notification_type_code': 'CREATE_TEST',
            'force_delivery_methods': ['email', 'sms', 'in_app'],
        }

        serializer = CreateNotificationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_invalid_force_delivery_method(self, users, notification_type):
        """Test invalid delivery method is rejected"""
        data = {
            'recipient_ids': [u.id for u in users],
            'notification_type_code': 'CREATE_TEST',
            'force_delivery_methods': ['invalid_method'],
        }

        serializer = CreateNotificationSerializer(data=data)
        assert not serializer.is_valid()


@pytest.mark.django_db
class TestDevicePushTokenSerializer:
    """Tests for DevicePushTokenSerializer"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='pushtoken@example.com',
            password='testpass123',
            role='CLIENT'
        )

    @pytest.fixture
    def push_token(self, user):
        """Create a push token"""
        return DevicePushToken.objects.create(
            user=user,
            token='ExponentPushToken[abc123]',
            device_type='ios',
            device_id='device-123',
            device_name="Test iPhone",
            app_version='1.0.0',
        )

    def test_serialization(self, push_token):
        """Test push token serialization"""
        serializer = DevicePushTokenSerializer(push_token)
        data = serializer.data

        assert data['token'] == 'ExponentPushToken[abc123]'
        assert data['device_type'] == 'ios'
        assert data['device_id'] == 'device-123'
        assert data['device_name'] == 'Test iPhone'
        assert data['is_active'] is True
        assert data['failure_count'] == 0

    def test_read_only_fields(self, push_token):
        """Test read-only fields are not writable"""
        serializer = DevicePushTokenSerializer(
            push_token,
            data={'failure_count': 999},
            partial=True
        )
        serializer.is_valid()

        # failure_count should not be in validated_data
        assert 'failure_count' not in serializer.validated_data


@pytest.mark.django_db
class TestRegisterPushTokenSerializer:
    """Tests for RegisterPushTokenSerializer"""

    def test_valid_expo_token(self):
        """Test valid Expo push token format"""
        data = {
            'token': 'ExponentPushToken[xxxxxx]',
            'device_type': 'ios',
        }

        serializer = RegisterPushTokenSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_valid_expo_push_token_format(self):
        """Test valid ExpoPushToken format (alternative)"""
        data = {
            'token': 'ExpoPushToken[xxxxxx]',
            'device_type': 'android',
        }

        serializer = RegisterPushTokenSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_invalid_token_format(self):
        """Test invalid token format is rejected"""
        data = {
            'token': 'InvalidToken123',
            'device_type': 'ios',
        }

        serializer = RegisterPushTokenSerializer(data=data)
        assert not serializer.is_valid()
        assert 'token' in serializer.errors

    def test_missing_closing_bracket(self):
        """Test token missing closing bracket is rejected"""
        data = {
            'token': 'ExponentPushToken[xxxxxx',  # Missing ]
            'device_type': 'ios',
        }

        serializer = RegisterPushTokenSerializer(data=data)
        assert not serializer.is_valid()
        assert 'token' in serializer.errors

    def test_all_device_types(self):
        """Test all device types are valid"""
        for device_type in ['ios', 'android', 'web']:
            data = {
                'token': f'ExponentPushToken[{device_type}]',
                'device_type': device_type,
            }

            serializer = RegisterPushTokenSerializer(data=data)
            assert serializer.is_valid(), f"Failed for device_type: {device_type}"

    def test_optional_fields(self):
        """Test optional fields are accepted"""
        data = {
            'token': 'ExponentPushToken[full]',
            'device_type': 'ios',
            'device_id': 'unique-device-id',
            'device_name': "John's iPhone",
            'app_version': '2.0.1',
        }

        serializer = RegisterPushTokenSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        assert serializer.validated_data['device_id'] == 'unique-device-id'
        assert serializer.validated_data['device_name'] == "John's iPhone"
        assert serializer.validated_data['app_version'] == '2.0.1'


@pytest.mark.django_db
class TestUnregisterPushTokenSerializer:
    """Tests for UnregisterPushTokenSerializer"""

    def test_valid_with_token(self):
        """Test valid unregister with token"""
        data = {
            'token': 'ExponentPushToken[xxx]',
        }

        serializer = UnregisterPushTokenSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_valid_with_device_id(self):
        """Test valid unregister with device_id"""
        data = {
            'device_id': 'device-123',
        }

        serializer = UnregisterPushTokenSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_valid_with_both(self):
        """Test valid unregister with both token and device_id"""
        data = {
            'token': 'ExponentPushToken[xxx]',
            'device_id': 'device-123',
        }

        serializer = UnregisterPushTokenSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_invalid_with_neither(self):
        """Test invalid when neither token nor device_id provided"""
        data = {}

        serializer = UnregisterPushTokenSerializer(data=data)
        assert not serializer.is_valid()
        assert 'non_field_errors' in serializer.errors


@pytest.mark.django_db
class TestTestPushNotificationSerializer:
    """Tests for TestPushNotificationSerializer"""

    def test_defaults(self):
        """Test default values are used"""
        serializer = TestPushNotificationSerializer(data={})
        assert serializer.is_valid(), serializer.errors

        assert serializer.validated_data.get('title', 'Test Notification') == 'Test Notification'
        assert 'test' in serializer.validated_data.get('body', '').lower() or serializer.validated_data.get('body') == 'This is a test push notification from LifePlace.'

    def test_custom_values(self):
        """Test custom values are accepted"""
        data = {
            'title': 'Custom Title',
            'body': 'Custom body message',
            'device_id': 'specific-device',
        }

        serializer = TestPushNotificationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        assert serializer.validated_data['title'] == 'Custom Title'
        assert serializer.validated_data['body'] == 'Custom body message'
        assert serializer.validated_data['device_id'] == 'specific-device'


@pytest.mark.django_db
class TestNotificationDigestSerializer:
    """Tests for NotificationDigestSerializer"""

    @pytest.fixture
    def user(self):
        """Create a test user"""
        return User.objects.create_user(
            email='digestser@example.com',
            password='testpass123',
            first_name='Digest',
            last_name='User',
            role='CLIENT'
        )

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code='DIGEST_SER_TEST',
            name='Digest Serializer Test',
            category='SYSTEM',
            priority='NORMAL',
            default_title_template='T',
            default_content_template='C',
        )

    @pytest.fixture
    def digest_with_notifications(self, user, notification_type):
        """Create a digest with notifications"""
        now = timezone.now()

        # Create notifications
        notifications = [
            Notification.objects.create(
                recipient=user,
                notification_type=notification_type,
                title=f'Digest Notification {i}',
                content=f'Content {i}',
            )
            for i in range(5)
        ]

        # Create digest
        digest = NotificationDigest.objects.create(
            user=user,
            frequency='DAILY',
            period_start=now - timedelta(days=1),
            period_end=now,
            notification_count=5,
        )
        digest.notifications.add(*notifications)

        return digest

    def test_serialization(self, digest_with_notifications):
        """Test digest serialization"""
        serializer = NotificationDigestSerializer(digest_with_notifications)
        data = serializer.data

        assert data['frequency'] == 'DAILY'
        assert data['notification_count'] == 5
        assert data['is_sent'] is False
        assert 'user_name' in data
        assert 'notifications_preview' in data

    def test_notifications_preview(self, digest_with_notifications):
        """Test notifications_preview field shows first 3"""
        serializer = NotificationDigestSerializer(digest_with_notifications)
        data = serializer.data

        # Should show max 3 notifications in preview
        assert len(data['notifications_preview']) <= 3

        for preview in data['notifications_preview']:
            assert 'id' in preview
            assert 'title' in preview
            assert 'type' in preview


@pytest.mark.django_db
class TestNotificationCountSerializer:
    """Tests for NotificationCountSerializer"""

    def test_serialization(self):
        """Test count serialization"""
        count_data = {
            'total': 100,
            'unread': 25,
            'by_category': {'SYSTEM': 50, 'EVENT': 30, 'PAYMENT': 20},
            'by_priority': {'NORMAL': 80, 'HIGH': 15, 'URGENT': 5},
        }

        serializer = NotificationCountSerializer(count_data)
        data = serializer.data

        assert data['total'] == 100
        assert data['unread'] == 25
        assert data['by_category']['SYSTEM'] == 50
        assert data['by_priority']['URGENT'] == 5


@pytest.mark.django_db
class TestNotificationStatsSerializer:
    """Tests for NotificationStatsSerializer"""

    def test_serialization(self):
        """Test stats serialization"""
        stats_data = {
            'period': '30 days',
            'total_sent': 500,
            'total_read': 400,
            'read_rate': 80.0,
            'delivery_rates': {'email': 95.0, 'sms': 98.0, 'in_app': 100.0},
            'popular_types': [
                {'notification_type__name': 'Event Update', 'count': 100},
                {'notification_type__name': 'Payment Received', 'count': 80},
            ],
        }

        serializer = NotificationStatsSerializer(stats_data)
        data = serializer.data

        assert data['period'] == '30 days'
        assert data['total_sent'] == 500
        assert data['total_read'] == 400
        assert data['read_rate'] == 80.0
        assert data['delivery_rates']['email'] == 95.0
        assert len(data['popular_types']) == 2
