# backend/core/domains/notifications/tests/test_views.py

"""
Tests for notification domain API views.

This module tests the following viewsets:
- NotificationViewSet
- NotificationTypeViewSet
- NotificationPreferenceViewSet
- DevicePushTokenViewSet
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from core.domains.notifications.models import (
    DevicePushToken,
    Notification,
    NotificationPreference,
    NotificationType,
)

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_cache_fixture():
    """Clear cache before and after each test"""
    cache.clear()
    yield
    cache.clear()


def get_auth_header(user):
    """Generate JWT token for a user"""
    refresh = RefreshToken.for_user(user)
    return f"Bearer {refresh.access_token}"


@pytest.mark.django_db
class TestNotificationViewSet:
    """Tests for NotificationViewSet"""

    @pytest.fixture
    def client_user(self):
        """Create a client user"""
        return User.objects.create_user(
            email="client@example.com", password="testpass123", first_name="Client", last_name="User", role="CLIENT"
        )

    @pytest.fixture
    def admin_user(self):
        """Create an admin user"""
        return User.objects.create_user(
            email="admin@example.com",
            password="testpass123",
            first_name="Admin",
            last_name="User",
            role="ADMIN",
            is_staff=True,
        )

    @pytest.fixture
    def notification_type(self):
        """Create a notification type"""
        return NotificationType.objects.create(
            code="VIEW_TEST",
            name="View Test",
            category="SYSTEM",
            priority="NORMAL",
            default_title_template="{{ title }}",
            default_content_template="{{ content }}",
            is_active=True,
        )

    @pytest.fixture
    def notifications(self, client_user, notification_type):
        """Create multiple notifications for the client user"""
        return [
            Notification.objects.create(
                recipient=client_user,
                notification_type=notification_type,
                title=f"Notification {i}",
                content=f"Content {i}",
                is_read=(i % 2 == 0),
            )
            for i in range(5)
        ]

    @pytest.fixture
    def api_client(self):
        """Create API client"""
        return APIClient()

    # =========================================================================
    # List notifications tests
    # =========================================================================

    def test_list_notifications_authenticated(self, api_client, client_user, notifications):
        """Test listing notifications for authenticated user"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/notifications/")

        assert response.status_code == status.HTTP_200_OK
        # Should return paginated results or list
        data = response.data
        if isinstance(data, dict):
            results = data.get("results", data)
        else:
            results = data
        assert len(results) == 5

    def test_list_notifications_unauthenticated(self, api_client):
        """Test listing notifications requires authentication"""
        response = api_client.get("/api/notifications/notifications/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_notifications_filtered_by_read_status(self, api_client, client_user, notifications):
        """Test filtering notifications by read status"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/notifications/?is_read=true")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        if isinstance(data, dict):
            results = data.get("results", data)
        else:
            results = data
        # Check all returned are read
        assert all(n["is_read"] for n in results)

    def test_list_notifications_filtered_by_category(self, api_client, client_user, notification_type):
        """Test filtering notifications by category"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        # Create event notification type and notification
        event_type = NotificationType.objects.create(
            code="EVENT_VIEW",
            name="Event View",
            category="EVENT",
            priority="NORMAL",
            default_title_template="T",
            default_content_template="C",
        )
        Notification.objects.create(
            recipient=client_user,
            notification_type=event_type,
            title="Event Notification",
            content="Content",
        )
        Notification.objects.create(
            recipient=client_user,
            notification_type=notification_type,
            title="System Notification",
            content="Content",
        )

        response = api_client.get("/api/notifications/notifications/?category=EVENT")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        if isinstance(data, dict):
            results = data.get("results", data)
        else:
            results = data
        assert len(results) == 1
        assert results[0]["title"] == "Event Notification"

    def test_list_notifications_user_isolation(self, api_client, client_user, admin_user, notifications):
        """Test users can only see their own notifications"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.get("/api/notifications/notifications/")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        if isinstance(data, dict):
            results = data.get("results", data)
        else:
            results = data
        # Admin should not see client's notifications (by default)
        assert len(results) == 0

    # =========================================================================
    # Retrieve notification tests
    # =========================================================================

    def test_retrieve_notification(self, api_client, client_user, notifications):
        """Test retrieving a single notification"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))
        notification = notifications[0]

        response = api_client.get(f"/api/notifications/notifications/{notification.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == notification.id
        assert response.data["title"] == notification.title

    def test_retrieve_notification_marks_as_read(self, api_client, client_user, notification_type):
        """Test retrieving notification marks it as read"""
        notification = Notification.objects.create(
            recipient=client_user,
            notification_type=notification_type,
            title="Unread Notification",
            content="Content",
            is_read=False,
        )
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get(f"/api/notifications/notifications/{notification.id}/")

        assert response.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.is_read is True

    def test_retrieve_notification_other_user_forbidden(self, api_client, client_user, admin_user, notifications):
        """Test retrieving another user's notification is forbidden"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))
        notification = notifications[0]  # Belongs to client_user

        response = api_client.get(f"/api/notifications/notifications/{notification.id}/")

        # Admin can see notifications but they should be filtered to their own
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    # =========================================================================
    # Mark read/unread action tests
    # =========================================================================

    def test_mark_read_action(self, api_client, client_user, notification_type):
        """Test mark_read action endpoint"""
        notification = Notification.objects.create(
            recipient=client_user,
            notification_type=notification_type,
            title="Test",
            content="Content",
            is_read=False,
        )
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(f"/api/notifications/notifications/{notification.id}/mark_read/")

        assert response.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.is_read is True

    def test_mark_unread_action(self, api_client, client_user, notification_type):
        """Test mark_unread action endpoint"""
        notification = Notification.objects.create(
            recipient=client_user,
            notification_type=notification_type,
            title="Test",
            content="Content",
            is_read=True,
            read_at=timezone.now(),
        )
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(f"/api/notifications/notifications/{notification.id}/mark_unread/")

        assert response.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.is_read is False

    def test_mark_all_read_action(self, api_client, client_user, notifications):
        """Test mark_all_read action endpoint"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post("/api/notifications/notifications/mark_all_read/")

        assert response.status_code == status.HTTP_200_OK
        assert "marked_read" in response.data

        # Verify all are read
        unread_count = Notification.objects.filter(recipient=client_user, is_read=False).count()
        assert unread_count == 0

    # =========================================================================
    # Bulk action tests
    # =========================================================================

    def test_bulk_action_mark_read(self, api_client, client_user, notifications):
        """Test bulk mark_read action"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))
        unread_ids = [n.id for n in notifications if not n.is_read]

        response = api_client.post(
            "/api/notifications/notifications/bulk_action/",
            {
                "notification_ids": unread_ids,
                "action": "mark_read",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["action"] == "mark_read"

    def test_bulk_action_delete(self, api_client, client_user, notifications):
        """Test bulk delete action"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))
        ids_to_delete = [n.id for n in notifications[:2]]

        response = api_client.post(
            "/api/notifications/notifications/bulk_action/",
            {
                "notification_ids": ids_to_delete,
                "action": "delete",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

        # Verify deleted
        remaining = Notification.objects.filter(id__in=ids_to_delete).count()
        assert remaining == 0

    def test_bulk_action_invalid_ids(self, api_client, client_user):
        """Test bulk action with invalid IDs returns error"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/notifications/bulk_action/",
            {
                "notification_ids": [99999],
                "action": "mark_read",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # =========================================================================
    # Counts and stats endpoints
    # =========================================================================

    def test_counts_endpoint(self, api_client, client_user, notifications):
        """Test notification counts endpoint"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/notifications/counts/")

        assert response.status_code == status.HTTP_200_OK
        assert "total" in response.data
        assert "unread" in response.data
        assert "by_category" in response.data

    def test_unread_endpoint(self, api_client, client_user, notifications):
        """Test unread notifications endpoint"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/notifications/unread/")

        assert response.status_code == status.HTTP_200_OK
        # All returned should be unread
        for n in response.data:
            assert n["is_read"] is False

    def test_recent_endpoint(self, api_client, client_user, notifications):
        """Test recent notifications endpoint"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/notifications/recent/?limit=3")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) <= 3

    def test_stats_endpoint(self, api_client, client_user, notifications):
        """Test notification stats endpoint"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/notifications/stats/")

        assert response.status_code == status.HTTP_200_OK
        assert "total_sent" in response.data
        assert "read_rate" in response.data

    # =========================================================================
    # Create notification tests (admin only)
    # =========================================================================

    @patch("core.domains.notifications.security.NotificationRateLimiter.check_bulk_limit")
    @patch("core.domains.notifications.security.NotificationRateLimiter.record_bulk_creation")
    @patch("core.domains.notifications.security.NotificationRateLimiter.check_creation_limit")
    @patch("core.domains.notifications.security.NotificationRateLimiter.record_creation")
    def test_create_notification_admin(
        self,
        mock_record,
        mock_check,
        mock_bulk_record,
        mock_bulk_check,
        api_client,
        admin_user,
        client_user,
        notification_type,
    ):
        """Test admin can create notifications"""
        mock_check.return_value = (True, None)
        mock_bulk_check.return_value = (True, None)

        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.post(
            "/api/notifications/notifications/create_notification/",
            {
                "recipient_ids": [client_user.id],
                "notification_type_code": "VIEW_TEST",
                "context_data": {"title": "Hello", "content": "World"},
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert "created_count" in response.data

    def test_create_notification_client_forbidden(self, api_client, client_user, notification_type):
        """Test client cannot create notifications"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/notifications/create_notification/",
            {
                "recipient_ids": [client_user.id],
                "notification_type_code": "VIEW_TEST",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    # =========================================================================
    # Delete notification tests
    # =========================================================================

    def test_delete_own_notification(self, api_client, client_user, notifications):
        """Test user can delete their own notification"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))
        notification = notifications[0]

        response = api_client.delete(f"/api/notifications/notifications/{notification.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_other_notification_forbidden(self, api_client, client_user, admin_user, notification_type):
        """Test cannot delete another user's notification"""
        # Create notification for admin
        notification = Notification.objects.create(
            recipient=admin_user,
            notification_type=notification_type,
            title="Admin Notification",
            content="Content",
        )
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.delete(f"/api/notifications/notifications/{notification.id}/")

        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    # =========================================================================
    # Admin endpoints tests
    # =========================================================================

    def test_system_metrics_admin_only(self, api_client, admin_user, client_user):
        """Test system_metrics is admin only"""
        # Client should be forbidden
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))
        response = api_client.get("/api/notifications/notifications/system_metrics/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Admin should be allowed
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))
        response = api_client.get("/api/notifications/notifications/system_metrics/")
        # Might fail if monitoring module not available, but shouldn't be 403
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_system_alerts_admin_only(self, api_client, admin_user, client_user):
        """Test system_alerts is admin only"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))
        response = api_client.get("/api/notifications/notifications/system_alerts/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestNotificationTypeViewSet:
    """Tests for NotificationTypeViewSet (admin only)"""

    @pytest.fixture
    def admin_user(self):
        """Create an admin user"""
        return User.objects.create_user(
            email="typeadmin@example.com", password="testpass123", role="ADMIN", is_staff=True
        )

    @pytest.fixture
    def client_user(self):
        """Create a client user"""
        return User.objects.create_user(email="typeclient@example.com", password="testpass123", role="CLIENT")

    @pytest.fixture
    def notification_types(self):
        """Create notification types"""
        return [
            NotificationType.objects.create(
                code=f"TYPE_{i}",
                name=f"Type {i}",
                category="SYSTEM" if i < 2 else "EVENT",
                priority="NORMAL",
                default_title_template="T",
                default_content_template="C",
                is_active=(i % 2 == 0),
            )
            for i in range(4)
        ]

    @pytest.fixture
    def api_client(self):
        """Create API client"""
        return APIClient()

    def test_list_types_admin(self, api_client, admin_user, notification_types):
        """Test admin can list notification types"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.get("/api/notifications/types/")

        assert response.status_code == status.HTTP_200_OK

    def test_list_types_client_forbidden(self, api_client, client_user, notification_types):
        """Test client cannot list notification types"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/types/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_types_filtered_by_category(self, api_client, admin_user, notification_types):
        """Test filtering types by category"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.get("/api/notifications/types/?category=EVENT")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        if isinstance(data, dict):
            results = data.get("results", data)
        else:
            results = data
        for t in results:
            assert t["category"] == "EVENT"

    def test_list_types_filtered_by_active(self, api_client, admin_user, notification_types):
        """Test filtering types by active status"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.get("/api/notifications/types/?is_active=true")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        if isinstance(data, dict):
            results = data.get("results", data)
        else:
            results = data
        for t in results:
            assert t["is_active"] is True

    def test_create_type_admin(self, api_client, admin_user):
        """Test admin can create notification type"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.post(
            "/api/notifications/types/",
            {
                "code": "NEW_TYPE",
                "name": "New Type",
                "category": "PAYMENT",
                "priority": "HIGH",
                "default_title_template": "Payment: {{ status }}",
                "default_content_template": "Details: {{ details }}",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["code"] == "NEW_TYPE"

    def test_categories_endpoint(self, api_client, admin_user):
        """Test categories endpoint returns valid choices"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.get("/api/notifications/types/categories/")

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) > 0
        # Each should have value and label
        assert "value" in response.data[0]
        assert "label" in response.data[0]

    def test_priorities_endpoint(self, api_client, admin_user):
        """Test priorities endpoint returns valid choices"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.get("/api/notifications/types/priorities/")

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        priorities = [p["value"] for p in response.data]
        assert "LOW" in priorities
        assert "NORMAL" in priorities
        assert "HIGH" in priorities
        assert "URGENT" in priorities


@pytest.mark.django_db
class TestNotificationPreferenceViewSet:
    """Tests for NotificationPreferenceViewSet"""

    @pytest.fixture
    def client_user(self):
        """Create a client user"""
        return User.objects.create_user(email="prefclient@example.com", password="testpass123", role="CLIENT")

    @pytest.fixture
    def admin_user(self):
        """Create an admin user"""
        return User.objects.create_user(
            email="prefadmin@example.com", password="testpass123", role="ADMIN", is_staff=True
        )

    @pytest.fixture
    def preferences(self, client_user):
        """Get notification preferences (auto-created by signal)"""
        prefs, _ = NotificationPreference.objects.get_or_create(user=client_user)
        return prefs

    @pytest.fixture
    def api_client(self):
        """Create API client"""
        return APIClient()

    def test_my_preferences_endpoint(self, api_client, client_user, preferences):
        """Test my_preferences returns current user's preferences"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/preferences/my_preferences/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email_enabled"] is True

    def test_my_preferences_creates_if_not_exists(self, api_client, client_user):
        """Test my_preferences creates preferences if not exists"""
        # Ensure no preferences exist
        NotificationPreference.objects.filter(user=client_user).delete()

        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/preferences/my_preferences/")

        assert response.status_code == status.HTTP_200_OK
        # Should have created preferences
        assert NotificationPreference.objects.filter(user=client_user).exists()

    def test_update_preferences_endpoint(self, api_client, client_user, preferences):
        """Test update_preferences endpoint"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.patch(
            "/api/notifications/preferences/update_preferences/",
            {
                "email_enabled": False,
                "marketing_email": True,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        preferences.refresh_from_db()
        assert preferences.email_enabled is False
        assert preferences.marketing_email is True

    def test_reset_to_defaults_endpoint(self, api_client, client_user, preferences):
        """Test reset_to_defaults endpoint"""
        # Modify some preferences
        preferences.email_enabled = False
        preferences.marketing_email = True
        preferences.save()

        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post("/api/notifications/preferences/reset_to_defaults/")

        assert response.status_code == status.HTTP_200_OK
        preferences.refresh_from_db()
        assert preferences.email_enabled is True  # Default value
        assert preferences.marketing_email is False  # Default value

    def test_create_preferences_forbidden(self, api_client, client_user):
        """Test manual creation is not allowed"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/preferences/",
            {
                "email_enabled": True,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_preferences_forbidden(self, api_client, client_user, preferences):
        """Test deletion is not allowed"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.delete(f"/api/notifications/preferences/{preferences.id}/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_digest_frequencies_endpoint(self, api_client, client_user):
        """Test digest_frequencies endpoint returns valid choices"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/preferences/digest_frequencies/")

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        frequencies = [f["value"] for f in response.data]
        assert "IMMEDIATE" in frequencies
        assert "DAILY" in frequencies


@pytest.mark.django_db
class TestDevicePushTokenViewSet:
    """Tests for DevicePushTokenViewSet"""

    @pytest.fixture
    def client_user(self):
        """Create a client user"""
        return User.objects.create_user(email="pushclient@example.com", password="testpass123", role="CLIENT")

    @pytest.fixture
    def push_tokens(self, client_user):
        """Create push tokens for the user"""
        return [
            DevicePushToken.objects.create(
                user=client_user,
                token=f"ExponentPushToken[device{i}]",
                device_type="ios" if i < 2 else "android",
                device_id=f"device-{i}",
                device_name=f"Device {i}",
            )
            for i in range(3)
        ]

    @pytest.fixture
    def api_client(self):
        """Create API client"""
        return APIClient()

    def test_list_own_tokens(self, api_client, client_user, push_tokens):
        """Test listing own push tokens"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/push-tokens/")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        if isinstance(data, dict):
            results = data.get("results", data)
        else:
            results = data
        assert len(results) == 3

    def test_list_tokens_unauthenticated(self, api_client):
        """Test listing tokens requires authentication"""
        response = api_client.get("/api/notifications/push-tokens/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_register_push_token(self, api_client, client_user):
        """Test registering a new push token"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/push-tokens/",
            {
                "token": "ExponentPushToken[newtoken123]",
                "device_type": "ios",
                "device_id": "new-device",
                "device_name": "John's New iPhone",
                "app_version": "1.0.0",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["token"] == "ExponentPushToken[newtoken123]"
        assert response.data["is_active"] is True

    def test_register_invalid_token_format(self, api_client, client_user):
        """Test registering invalid token format fails"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/push-tokens/",
            {
                "token": "invalid_token",
                "device_type": "ios",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unregister_by_id(self, api_client, client_user, push_tokens):
        """Test unregistering push token by ID"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))
        token = push_tokens[0]

        response = api_client.delete(f"/api/notifications/push-tokens/{token.id}/")

        assert response.status_code == status.HTTP_200_OK
        token.refresh_from_db()
        assert token.is_active is False

    def test_unregister_action(self, api_client, client_user, push_tokens):
        """Test unregister action endpoint"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))
        token = push_tokens[0]

        response = api_client.post(
            "/api/notifications/push-tokens/unregister/",
            {
                "token": token.token,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_unregister_by_device_id(self, api_client, client_user, push_tokens):
        """Test unregister by device_id"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/push-tokens/unregister/",
            {
                "device_id": "device-0",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

    def test_my_devices_endpoint(self, api_client, client_user, push_tokens):
        """Test my_devices returns active devices"""
        # Deactivate one token
        push_tokens[0].is_active = False
        push_tokens[0].save()

        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.get("/api/notifications/push-tokens/my_devices/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2  # Only active ones
        assert len(response.data["devices"]) == 2

    @patch("core.domains.notifications.services.PushNotificationService.send_push_to_user")
    def test_test_push_endpoint(self, mock_send, api_client, client_user, push_tokens):
        """Test test_push endpoint sends notification"""
        mock_send.return_value = {
            "total_devices": 3,
            "successful": 3,
            "failed": 0,
            "results": [],
        }

        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/push-tokens/test_push/",
            {
                "title": "Test Notification",
                "body": "This is a test.",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_devices"] == 3
        mock_send.assert_called_once()

    @patch("core.domains.notifications.services.PushNotificationService.send_push_notification")
    def test_test_push_specific_device(self, mock_send, api_client, client_user, push_tokens):
        """Test test_push to specific device"""
        mock_send.return_value = {
            "success": True,
            "error": None,
        }

        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/push-tokens/test_push/",
            {
                "title": "Test",
                "body": "Test body",
                "device_id": "device-0",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "device_id" in response.data
        mock_send.assert_called_once()

    def test_test_push_device_not_found(self, api_client, client_user, push_tokens):
        """Test test_push with non-existent device returns 404"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/push-tokens/test_push/",
            {
                "title": "Test",
                "body": "Test body",
                "device_id": "nonexistent-device",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNotificationViewSetPermissions:
    """Tests for permission checks across viewsets"""

    @pytest.fixture
    def client_user(self):
        """Create a client user"""
        return User.objects.create_user(email="permclient@example.com", password="testpass123", role="CLIENT")

    @pytest.fixture
    def admin_user(self):
        """Create an admin user"""
        return User.objects.create_user(
            email="permadmin@example.com", password="testpass123", role="ADMIN", is_staff=True
        )

    @pytest.fixture
    def api_client(self):
        """Create API client"""
        return APIClient()

    def test_client_cannot_create_notification(self, api_client, client_user):
        """Test client users cannot create notifications via standard create"""
        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.post(
            "/api/notifications/notifications/",
            {
                "title": "Test",
                "content": "Content",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_client_cannot_update_notification(self, api_client, client_user):
        """Test client users cannot update notifications"""
        notification_type = NotificationType.objects.create(
            code="PERM_TEST",
            name="Permission Test",
            category="SYSTEM",
            priority="NORMAL",
            default_title_template="T",
            default_content_template="C",
        )
        notification = Notification.objects.create(
            recipient=client_user,
            notification_type=notification_type,
            title="Original",
            content="Content",
        )

        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(client_user))

        response = api_client.patch(
            f"/api/notifications/notifications/{notification.id}/",
            {
                "title": "Updated",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_view_all_notifications(self, api_client, admin_user, client_user):
        """Test admin can view all notifications with user_id filter"""
        notification_type = NotificationType.objects.create(
            code="ADMIN_VIEW_TEST",
            name="Admin View Test",
            category="SYSTEM",
            priority="NORMAL",
            default_title_template="T",
            default_content_template="C",
        )
        Notification.objects.create(
            recipient=client_user,
            notification_type=notification_type,
            title="Client Notification",
            content="Content",
        )

        api_client.credentials(HTTP_AUTHORIZATION=get_auth_header(admin_user))

        response = api_client.get(f"/api/notifications/notifications/?user_id={client_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        if isinstance(data, dict):
            results = data.get("results", data)
        else:
            results = data
        assert len(results) == 1
