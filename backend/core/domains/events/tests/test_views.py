"""
Unit tests for events domain admin API views.

Tests:
- EventTypeViewSet (CRUD, permissions)
- EventViewSet (CRUD, filtering, caching, custom actions)
- EventTaskViewSet (CRUD, completion)
- EventProductOptionViewSet
- Availability views (DateAvailabilityAPIView, etc.)
"""

from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

import pytest

from core.domains.events.models import (
    Event,
    EventTask,
    EventTimeline,
    EventType,
)


@pytest.fixture
def api_client():
    """Return a DRF API client instance."""
    return APIClient()


@pytest.fixture
def authenticated_admin(api_client, user_factory):
    """Return an authenticated admin API client."""
    from rest_framework_simplejwt.tokens import RefreshToken

    admin = user_factory(admin=True)
    refresh = RefreshToken.for_user(admin)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    api_client.user = admin
    return api_client


@pytest.fixture
def authenticated_client_user(api_client, user_factory):
    """Return an authenticated client user API client."""
    from rest_framework_simplejwt.tokens import RefreshToken

    client_user = user_factory(role="CLIENT")
    refresh = RefreshToken.for_user(client_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    api_client.user = client_user
    return api_client


# =============================================================================
# EventTypeViewSet Tests
# =============================================================================


@pytest.mark.django_db
class TestEventTypeViewSet:
    """Tests for EventTypeViewSet."""

    def test_list_event_types_public(self, api_client, event_type_factory):
        """Test public access to list active event types."""
        event_type_factory(name="Wedding")
        event_type_factory(name="Corporate")
        event_type_factory(name="Inactive", inactive=True)

        response = api_client.get("/api/events/event-types/")

        assert response.status_code == status.HTTP_200_OK
        # Should only return active event types
        assert len(response.data) == 2

    def test_retrieve_event_type_public(self, api_client, event_type_factory):
        """Test public access to retrieve single event type."""
        event_type = event_type_factory(name="Birthday")

        response = api_client.get(f"/api/events/event-types/{event_type.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Birthday"

    def test_create_event_type_admin_only(self, authenticated_admin):
        """Test only admin can create event types."""
        # Anonymous user should fail - use fresh client to avoid shared state
        anon_client = APIClient()
        response = anon_client.post(
            "/api/events/event-types/",
            {
                "name": "New Type",
                "description": "A new event type",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Admin should succeed
        response = authenticated_admin.post(
            "/api/events/event-types/",
            {
                "name": "New Type",
                "description": "A new event type",
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Type"

    def test_create_event_type_client_forbidden(self, authenticated_client_user):
        """Test client users cannot create event types."""
        response = authenticated_client_user.post(
            "/api/events/event-types/",
            {
                "name": "Client Type",
                "description": "Should fail",
            },
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_event_type_admin_only(self, authenticated_admin, event_type_factory):
        """Test admin can update event types."""
        event_type = event_type_factory(name="Old Name")

        response = authenticated_admin.patch(f"/api/events/event-types/{event_type.id}/", {"name": "New Name"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "New Name"

    def test_delete_event_type_admin(self, authenticated_admin, event_type_factory):
        """Test admin can delete event types."""
        event_type = event_type_factory()

        response = authenticated_admin.delete(f"/api/events/event-types/{event_type.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not EventType.objects.filter(id=event_type.id).exists()

    def test_delete_event_type_in_use_soft_delete(self, authenticated_admin, event_type_factory, event_factory):
        """Test deleting event type in use marks it inactive."""
        event_type = event_type_factory()
        event_factory(event_type=event_type)  # Event using this type

        response = authenticated_admin.delete(f"/api/events/event-types/{event_type.id}/")

        # Should return 200 (soft delete)
        assert response.status_code == status.HTTP_200_OK

    def test_active_endpoint(self, api_client, event_type_factory):
        """Test the active event types endpoint."""
        event_type_factory(name="Active1")
        event_type_factory(name="Active2")
        event_type_factory(name="Inactive", inactive=True)

        response = api_client.get("/api/events/event-types/active/")

        assert response.status_code == status.HTTP_200_OK
        names = [et["name"] for et in response.data]
        assert "Active1" in names
        assert "Active2" in names
        assert "Inactive" not in names


# =============================================================================
# EventViewSet Tests
# =============================================================================


@pytest.mark.django_db
class TestEventViewSet:
    """Tests for EventViewSet."""

    def test_list_events_requires_auth(self, api_client):
        """Test event list requires authentication."""
        response = api_client.get("/api/events/events/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_events_authenticated(self, authenticated_admin, event_factory):
        """Test authenticated user can list events."""
        event_factory()
        event_factory()

        response = authenticated_admin.get("/api/events/events/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_list_events_filter_by_status(self, authenticated_admin, event_factory):
        """Test filtering events by status."""
        event_factory(status="LEAD")
        event_factory(confirmed=True)
        event_factory(cancelled=True)

        response = authenticated_admin.get("/api/events/events/", {"status": "CONFIRMED"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["status"] == "CONFIRMED"

    def test_list_events_filter_by_client(self, authenticated_admin, event_factory, user_factory):
        """Test filtering events by client."""
        client1 = user_factory()
        client2 = user_factory()

        event_factory(client=client1)
        event_factory(client=client1)
        event_factory(client=client2)

        response = authenticated_admin.get("/api/events/events/", {"client": client1.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_list_events_filter_by_date_range(self, authenticated_admin, event_factory):
        """Test filtering events by date range."""
        now = timezone.now()
        event_factory(start_date=now + timedelta(days=10))  # In range
        event_factory(start_date=now + timedelta(days=20))  # In range
        event_factory(start_date=now + timedelta(days=50))  # Out of range

        start_from = (now + timedelta(days=5)).strftime("%Y-%m-%d")
        start_to = (now + timedelta(days=30)).strftime("%Y-%m-%d")

        response = authenticated_admin.get(
            "/api/events/events/",
            {
                "start_date_from": start_from,
                "start_date_to": start_to,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_retrieve_event(self, authenticated_admin, event_factory):
        """Test retrieving single event."""
        event = event_factory(name="Test Event")

        response = authenticated_admin.get(f"/api/events/events/{event.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Test Event"

    @patch("core.domains.events.cache_service.EventCacheService.get_event_detail")
    @patch("core.domains.events.cache_service.EventCacheService.set_event_detail")
    def test_retrieve_event_uses_cache(self, mock_set, mock_get, authenticated_admin, event_factory):
        """Test event retrieval uses cache."""
        event = event_factory()
        mock_get.return_value = None  # Cache miss

        response = authenticated_admin.get(f"/api/events/events/{event.id}/")

        assert response.status_code == status.HTTP_200_OK
        mock_get.assert_called_once_with(event.id)
        mock_set.assert_called_once()

    def test_create_event(self, authenticated_admin, user_factory, event_type_factory):
        """Test creating an event."""
        client = user_factory()
        event_type = event_type_factory()
        start_date = timezone.now() + timedelta(days=30)

        response = authenticated_admin.post(
            "/api/events/events/",
            {
                "client": client.id,
                "event_type": event_type.id,
                "name": "New Event",
                "start_date": start_date.isoformat(),
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Event"
        assert Event.objects.filter(name="New Event").exists()

    def test_update_event(self, authenticated_admin, event_factory):
        """Test updating an event."""
        event = event_factory(name="Old Name")

        response = authenticated_admin.patch(f"/api/events/events/{event.id}/", {"name": "New Name"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "New Name"

    def test_delete_event(self, authenticated_admin, event_factory):
        """Test deleting an event uses soft delete (cancellation)."""
        event = event_factory()

        response = authenticated_admin.delete(f"/api/events/events/{event.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        # Soft delete - event still exists but status is CANCELLED
        event.refresh_from_db()
        assert event.status == "CANCELLED"

    def test_update_status_action(self, authenticated_admin, event_factory):
        """Test the update_status action."""
        event = event_factory(status="LEAD")

        response = authenticated_admin.post(f"/api/events/events/{event.id}/update_status/", {"status": "CONFIRMED"})

        assert response.status_code == status.HTTP_200_OK
        event.refresh_from_db()
        assert event.status == "CONFIRMED"

    def test_update_status_action_missing_status(self, authenticated_admin, event_factory):
        """Test update_status fails without status."""
        event = event_factory()

        response = authenticated_admin.post(f"/api/events/events/{event.id}/update_status/", {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Status is required" in response.data["detail"]

    def test_tasks_action(self, authenticated_admin, event_factory):
        """Test the tasks action returns event tasks."""
        event = event_factory()
        EventTask.objects.create(
            event=event,
            title="Task 1",
            due_date=timezone.now() + timedelta(days=1),
            priority="HIGH",
            status="PENDING",
        )

        response = authenticated_admin.get(f"/api/events/events/{event.id}/tasks/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["title"] == "Task 1"

    def test_timeline_action(self, authenticated_admin, event_factory, user_factory):
        """Test the timeline action returns timeline entries."""
        event = event_factory()
        actor = user_factory()

        EventTimeline.objects.create(
            event=event,
            action_type="STATUS_CHANGE",
            description="Status updated",
            actor=actor,
        )

        response = authenticated_admin.get(f"/api/events/events/{event.id}/timeline/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_next_task_action(self, authenticated_admin, event_factory):
        """Test the next_task action returns next pending task."""
        event = event_factory()
        EventTask.objects.create(
            event=event,
            title="First Task",
            due_date=timezone.now() + timedelta(days=1),
            priority="HIGH",
            status="PENDING",
        )
        EventTask.objects.create(
            event=event,
            title="Second Task",
            due_date=timezone.now() + timedelta(days=5),
            priority="MEDIUM",
            status="PENDING",
        )

        response = authenticated_admin.get(f"/api/events/events/{event.id}/next_task/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "First Task"

    def test_next_task_action_none(self, authenticated_admin, event_factory):
        """Test next_task returns null when no pending tasks."""
        event = event_factory()

        response = authenticated_admin.get(f"/api/events/events/{event.id}/next_task/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data is None

    def test_check_in_action(self, authenticated_admin, event_factory):
        """Test the check_in action."""
        event = event_factory(confirmed=True)

        with patch("core.domains.events.services.CheckInService.check_in") as mock_check_in:
            mock_check_in.return_value = {"success": True}

            response = authenticated_admin.post(
                f"/api/events/events/{event.id}/check_in/", {"notes": "On time arrival"}
            )

            assert response.status_code == status.HTTP_200_OK
            mock_check_in.assert_called_once()

    def test_check_in_action_failure(self, authenticated_admin, event_factory):
        """Test check_in action handles service errors."""
        event = event_factory()

        with patch("core.domains.events.services.CheckInService.check_in") as mock_check_in:
            mock_check_in.return_value = {"success": False, "error": "Event not confirmed"}

            response = authenticated_admin.post(f"/api/events/events/{event.id}/check_in/", {})

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Event not confirmed" in response.data["detail"]

    def test_checkout_action(self, authenticated_admin, event_factory):
        """Test the checkout action."""
        event = event_factory(confirmed=True)

        with patch("core.domains.events.services.CheckInService.checkout") as mock_checkout:
            mock_checkout.return_value = {
                "success": True,
                "late_fee_applied": False,
            }

            response = authenticated_admin.post(
                f"/api/events/events/{event.id}/checkout/", {"notes": "Checkout complete"}
            )

            assert response.status_code == status.HTTP_200_OK

    def test_no_show_action(self, authenticated_admin, event_factory):
        """Test the no_show action."""
        event = event_factory(confirmed=True)

        with patch("core.domains.events.services.CheckInService.mark_no_show") as mock_no_show:
            mock_no_show.return_value = {"success": True}

            response = authenticated_admin.post(f"/api/events/events/{event.id}/no_show/", {})

            assert response.status_code == status.HTTP_200_OK

    def test_place_hold_action(self, authenticated_admin, event_factory):
        """Test the place_hold action."""
        event = event_factory()

        with patch("core.domains.events.services.DateHoldingService.place_temporary_hold") as mock_hold:
            mock_hold.return_value = {"success": True}

            response = authenticated_admin.post(f"/api/events/events/{event.id}/place_hold/", {})

            assert response.status_code == status.HTTP_200_OK

    def test_extend_hold_action(self, authenticated_admin, event_factory):
        """Test the extend_hold action."""
        event = event_factory(temporary_hold=True)

        with patch("core.domains.events.services.DateHoldingService.extend_hold") as mock_extend:
            mock_extend.return_value = {
                "success": True,
                "extensions_remaining": 2,
            }

            response = authenticated_admin.post(f"/api/events/events/{event.id}/extend_hold/", {})

            assert response.status_code == status.HTTP_200_OK
            assert response.data["extensions_remaining"] == 2

    def test_release_hold_action(self, authenticated_admin, event_factory):
        """Test the release_hold action."""
        event = event_factory(temporary_hold=True)

        with patch("core.domains.events.services.DateHoldingService.release_hold") as mock_release:
            mock_release.return_value = {"success": True}

            response = authenticated_admin.post(
                f"/api/events/events/{event.id}/release_hold/", {"reason": "Client requested"}
            )

            assert response.status_code == status.HTTP_200_OK

    def test_hold_status_action(self, authenticated_admin, event_factory):
        """Test the hold_status action."""
        event = event_factory()

        with patch("core.domains.events.services.DateHoldingService.get_hold_status") as mock_status:
            mock_status.return_value = {
                "hold_status": "NONE",
                "can_place_hold": True,
            }

            response = authenticated_admin.get(f"/api/events/events/{event.id}/hold_status/")

            assert response.status_code == status.HTTP_200_OK


# =============================================================================
# EventTaskViewSet Tests
# =============================================================================


@pytest.mark.django_db
class TestEventTaskViewSet:
    """Tests for EventTaskViewSet."""

    def test_list_tasks(self, authenticated_admin, event_factory):
        """Test listing tasks."""
        event = event_factory()
        EventTask.objects.create(
            event=event,
            title="Task 1",
            due_date=timezone.now() + timedelta(days=1),
            priority="HIGH",
            status="PENDING",
        )

        response = authenticated_admin.get("/api/events/event-tasks/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_create_task(self, authenticated_admin, event_factory, user_factory):
        """Test creating a task."""
        event = event_factory()
        assignee = user_factory()

        response = authenticated_admin.post(
            "/api/events/event-tasks/",
            {
                "event": event.id,
                "title": "New Task",
                "description": "Task description",
                "due_date": (timezone.now() + timedelta(days=3)).isoformat(),
                "priority": "HIGH",
                "status": "PENDING",
                "assigned_to": assignee.id,
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "New Task"

    def test_complete_task_action(self, authenticated_admin, event_factory):
        """Test the complete task action."""
        event = event_factory()
        task = EventTask.objects.create(
            event=event,
            title="Task to Complete",
            due_date=timezone.now() + timedelta(days=1),
            priority="MEDIUM",
            status="PENDING",
        )

        response = authenticated_admin.post(
            f"/api/events/event-tasks/{task.id}/complete/", {"completion_notes": "Done!"}
        )

        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.status == "COMPLETED"
        assert task.completion_notes == "Done!"

    def test_update_task(self, authenticated_admin, event_factory):
        """Test updating a task."""
        event = event_factory()
        task = EventTask.objects.create(
            event=event,
            title="Old Title",
            due_date=timezone.now() + timedelta(days=1),
            priority="LOW",
            status="PENDING",
        )

        response = authenticated_admin.patch(
            f"/api/events/event-tasks/{task.id}/", {"title": "New Title", "priority": "HIGH"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "New Title"
        assert response.data["priority"] == "HIGH"

    def test_delete_task(self, authenticated_admin, event_factory):
        """Test deleting a task."""
        event = event_factory()
        task = EventTask.objects.create(
            event=event,
            title="Task to Delete",
            due_date=timezone.now() + timedelta(days=1),
            priority="LOW",
            status="PENDING",
        )

        response = authenticated_admin.delete(f"/api/events/event-tasks/{task.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT


# =============================================================================
# Availability Views Tests
# =============================================================================


@pytest.mark.django_db
class TestDateAvailabilityAPIView:
    """Tests for DateAvailabilityAPIView."""

    def test_check_availability_requires_auth(self, api_client):
        """Test availability check requires authentication."""
        response = api_client.get(
            "/api/events/availability/check/",
            {
                "start_date": "2024-06-15",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_check_availability_missing_date(self, authenticated_admin):
        """Test availability check requires start_date."""
        response = authenticated_admin.get("/api/events/availability/check/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "start_date" in response.data["error"]

    def test_check_availability_invalid_date_format(self, authenticated_admin):
        """Test availability check validates date format."""
        response = authenticated_admin.get(
            "/api/events/availability/check/",
            {
                "start_date": "invalid-date",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid" in response.data["error"]

    def test_check_availability_success(self, authenticated_admin, clear_cache):
        """Test successful availability check."""
        target_date = (timezone.now() + timedelta(days=60)).strftime("%Y-%m-%d")

        response = authenticated_admin.get(
            "/api/events/availability/check/",
            {
                "start_date": target_date,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert "status" in response.data
        assert "can_book_event" in response.data

    def test_check_availability_with_blocked_date(self, authenticated_admin, event_factory, clear_cache):
        """Test availability check with blocked date."""
        target_date = timezone.now() + timedelta(days=60)
        event_factory(
            start_date=target_date,
            confirmed=True,
            date_blocked_trait=True,
        )

        response = authenticated_admin.get(
            "/api/events/availability/check/",
            {
                "start_date": target_date.strftime("%Y-%m-%d"),
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["can_book_event"] is False


@pytest.mark.django_db
class TestDateRangeAvailabilityAPIView:
    """Tests for DateRangeAvailabilityAPIView."""

    def test_check_range_requires_both_dates(self, authenticated_admin):
        """Test range check requires both start and end dates."""
        response = authenticated_admin.get(
            "/api/events/availability/range/",
            {
                "start_date": "2024-06-15",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_check_range_validates_order(self, authenticated_admin):
        """Test range check validates start before end."""
        response = authenticated_admin.get(
            "/api/events/availability/range/",
            {
                "start_date": "2024-06-20",
                "end_date": "2024-06-15",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_check_range_limits_span(self, authenticated_admin):
        """Test range check limits to 365 days."""
        response = authenticated_admin.get(
            "/api/events/availability/range/",
            {
                "start_date": "2024-01-01",
                "end_date": "2025-12-31",  # More than 365 days
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_check_range_success(self, authenticated_admin, clear_cache):
        """Test successful range availability check."""
        start = (timezone.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        end = (timezone.now() + timedelta(days=65)).strftime("%Y-%m-%d")

        response = authenticated_admin.get(
            "/api/events/availability/range/",
            {
                "start_date": start,
                "end_date": end,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert "availability" in response.data
        assert "summary" in response.data


@pytest.mark.django_db
class TestValidateBookingRequestAPIView:
    """Tests for ValidateBookingRequestAPIView."""

    def test_validate_booking_requires_date(self, authenticated_admin):
        """Test booking validation requires start_date."""
        response = authenticated_admin.post("/api/events/availability/validate/", {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_validate_booking_success(self, authenticated_admin, clear_cache):
        """Test successful booking validation."""
        target_date = (timezone.now() + timedelta(days=90)).strftime("%Y-%m-%d")

        response = authenticated_admin.post(
            "/api/events/availability/validate/",
            {
                "start_date": target_date,
                "is_lead": True,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert "is_valid" in response.data


@pytest.mark.django_db
class TestNextAvailableDateAPIView:
    """Tests for NextAvailableDateAPIView."""

    def test_next_available_default_start(self, authenticated_admin, clear_cache):
        """Test finding next available date from today."""
        response = authenticated_admin.get("/api/events/availability/next/")

        assert response.status_code == status.HTTP_200_OK
        assert "next_available_date" in response.data

    def test_next_available_custom_start(self, authenticated_admin, clear_cache):
        """Test finding next available from custom date."""
        start = (timezone.now() + timedelta(days=30)).strftime("%Y-%m-%d")

        response = authenticated_admin.get(
            "/api/events/availability/next/",
            {
                "start_date": start,
            },
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestPublicEventAvailabilityAPIView:
    """Tests for PublicEventAvailabilityAPIView."""

    def test_public_availability_no_auth(self, api_client):
        """Test public availability endpoint doesn't require auth."""
        start = (timezone.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        end = (timezone.now() + timedelta(days=60)).strftime("%Y-%m-%d")

        response = api_client.get(
            "/api/events/public/availability/",
            {
                "start_date": start,
                "end_date": end,
            },
        )

        assert response.status_code == status.HTTP_200_OK

    def test_public_availability_requires_dates(self, api_client):
        """Test public availability requires both dates."""
        response = api_client.get("/api/events/public/availability/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_public_availability_limits_range(self, api_client):
        """Test public availability limits to 90 days."""
        response = api_client.get(
            "/api/events/public/availability/",
            {
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",  # More than 90 days
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_public_availability_returns_blocked_dates(self, api_client, event_factory):
        """Test public availability returns blocked dates."""
        target_date = timezone.now() + timedelta(days=45)
        event_factory(
            start_date=target_date,
            confirmed=True,
            date_blocked_trait=True,
        )

        start = (timezone.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        end = (timezone.now() + timedelta(days=60)).strftime("%Y-%m-%d")

        response = api_client.get(
            "/api/events/public/availability/",
            {
                "start_date": start,
                "end_date": end,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert "blocked_dates" in response.data
        assert len(response.data["blocked_dates"]) >= 1
