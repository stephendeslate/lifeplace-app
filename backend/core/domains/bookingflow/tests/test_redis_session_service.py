# backend/core/domains/bookingflow/tests/test_redis_session_service.py

import uuid
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from core.domains.bookingflow.models import BookingFlow, BookingFlowStep
from core.domains.bookingflow.redis_session_service import (
    BookingFlowCacheWarmer,
    BookingFlowSessionService,
)


class MockCache:
    """Mock cache for testing Redis session service"""

    def __init__(self):
        self.store = {}

    def get(self, key, default=None):
        return self.store.get(key, default)

    def set(self, key, value, timeout=None):
        self.store[key] = value

    def delete(self, key):
        if key in self.store:
            del self.store[key]
            return 1
        return 0

    def clear(self):
        self.store = {}


class BookingFlowSessionServiceTestCase(TestCase):
    """Test cases for BookingFlowSessionService"""

    def setUp(self):
        """Set up test data"""
        self.mock_cache = MockCache()
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        # Patch the session_cache at module level
        self.cache_patcher = patch("core.domains.bookingflow.redis_session_service.session_cache", self.mock_cache)
        self.mock_session_cache = self.cache_patcher.start()

    def tearDown(self):
        """Clean up patches"""
        self.cache_patcher.stop()
        self.mock_cache.clear()

    def test_create_session(self):
        """Test creating a new booking session"""
        session_id = BookingFlowSessionService.create_session(
            booking_flow_id=self.booking_flow.id, user_id=123, initial_data={"event_type": "wedding"}
        )

        self.assertIsNotNone(session_id)
        self.assertTrue(uuid.UUID(session_id))  # Valid UUID

        # Verify session was stored
        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertIsNotNone(session_data)
        self.assertEqual(session_data["booking_flow_id"], self.booking_flow.id)
        self.assertEqual(session_data["user_id"], 123)
        self.assertEqual(session_data["booking_data"]["event_type"], "wedding")
        self.assertEqual(session_data["current_step"], 0)

    def test_create_session_without_user(self):
        """Test creating a guest session"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertIsNone(session_data["user_id"])

    def test_create_session_initializes_analytics(self):
        """Test that session creation initializes analytics data"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        session_data = BookingFlowSessionService.get_session(session_id)
        analytics = session_data["analytics_data"]

        self.assertIn("started_at", analytics)
        self.assertIn("steps_visited", analytics)
        self.assertIn("time_spent_per_step", analytics)
        self.assertIn("form_errors", analytics)
        self.assertIn("conversion_funnel", analytics)
        self.assertFalse(analytics["completed"])

    def test_get_session_returns_none_for_nonexistent(self):
        """Test that get_session returns None for non-existent session"""
        result = BookingFlowSessionService.get_session("nonexistent-id")
        self.assertIsNone(result)

    def test_get_session_expired(self):
        """Test that get_session returns None for expired session"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        # Manually expire the session
        session_data = self.mock_cache.get(BookingFlowSessionService.SESSION_KEY.format(session_id=session_id))
        session_data["expires_at"] = (timezone.now() - timedelta(hours=1)).isoformat()
        self.mock_cache.set(BookingFlowSessionService.SESSION_KEY.format(session_id=session_id), session_data)

        result = BookingFlowSessionService.get_session(session_id)
        self.assertIsNone(result)

    def test_update_session(self):
        """Test updating session data"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        result = BookingFlowSessionService.update_session(
            session_id, current_step=1, booking_data={"step_1": {"field": "value"}}
        )

        self.assertTrue(result)

        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertEqual(session_data["current_step"], 1)
        self.assertIn("step_1", session_data["booking_data"])

    def test_update_session_nonexistent(self):
        """Test updating non-existent session returns False"""
        result = BookingFlowSessionService.update_session("nonexistent-id", current_step=1)
        self.assertFalse(result)

    def test_update_session_extends_expiry(self):
        """Test that updating session extends expiry time"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        original_session = BookingFlowSessionService.get_session(session_id)
        original_expires = original_session["expires_at"]

        # Update session
        BookingFlowSessionService.update_session(session_id, current_step=1)

        updated_session = BookingFlowSessionService.get_session(session_id)
        # Expiry should be extended
        self.assertGreaterEqual(updated_session["expires_at"], original_expires)

    def test_update_session_merges_booking_data(self):
        """Test that booking_data is merged, not replaced"""
        session_id = BookingFlowSessionService.create_session(
            booking_flow_id=self.booking_flow.id, initial_data={"initial": "data"}
        )

        BookingFlowSessionService.update_session(session_id, booking_data={"new_field": "new_value"})

        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertIn("initial", session_data["booking_data"])
        self.assertIn("new_field", session_data["booking_data"])

    def test_advance_step(self):
        """Test advancing to next step"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        result = BookingFlowSessionService.advance_step(
            session_id, step_data={"field": "value"}, step_name="introduction"
        )

        self.assertTrue(result)

        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertEqual(session_data["current_step"], 1)
        self.assertIn(0, session_data["analytics_data"]["steps_visited"])

    def test_advance_step_updates_conversion_funnel(self):
        """Test that advancing step updates conversion funnel"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        BookingFlowSessionService.advance_step(session_id, step_data={}, step_name="introduction")

        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertTrue(session_data["analytics_data"]["conversion_funnel"]["introduction"])

    def test_advance_step_tracks_validation_errors(self):
        """Test that validation errors are tracked"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        BookingFlowSessionService.advance_step(
            session_id,
            step_data={},
            step_name="contact_info",
            validation_errors=["Email is required", "Phone is required"],
        )

        session_data = BookingFlowSessionService.get_session(session_id)
        form_errors = session_data["analytics_data"]["form_errors"]
        self.assertEqual(len(form_errors), 1)
        self.assertEqual(form_errors[0]["errors"], ["Email is required", "Phone is required"])

    def test_advance_step_nonexistent_session(self):
        """Test advancing step for non-existent session"""
        result = BookingFlowSessionService.advance_step("nonexistent-id", step_data={})
        self.assertFalse(result)

    def test_complete_session(self):
        """Test completing a booking session"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        # Mock the persistence to avoid database calls in unit test
        with patch.object(BookingFlowSessionService, "_schedule_session_persistence"):
            result = BookingFlowSessionService.complete_session(session_id, final_data={"confirmation": "success"})

        self.assertTrue(result)

        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertTrue(session_data["completed"])
        self.assertTrue(session_data["analytics_data"]["completed"])
        self.assertIn("completed_at", session_data["analytics_data"])
        self.assertTrue(session_data["analytics_data"]["conversion_funnel"]["confirmation"])

    def test_complete_session_nonexistent(self):
        """Test completing non-existent session"""
        result = BookingFlowSessionService.complete_session("nonexistent-id")
        self.assertFalse(result)

    def test_abandon_session(self):
        """Test marking session as abandoned"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        # Advance to step 2
        BookingFlowSessionService.update_session(session_id, current_step=2)

        result = BookingFlowSessionService.abandon_session(session_id, step_name="package_selection")

        self.assertTrue(result)

        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertEqual(session_data["analytics_data"]["abandoned_at_step"], 2)
        self.assertEqual(session_data["analytics_data"]["abandoned_at_step_name"], "package_selection")
        self.assertIn("abandoned_at", session_data["analytics_data"])

    def test_abandon_session_nonexistent(self):
        """Test abandoning non-existent session"""
        result = BookingFlowSessionService.abandon_session("nonexistent-id")
        self.assertFalse(result)

    def test_delete_session(self):
        """Test deleting a session"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        result = BookingFlowSessionService.delete_session(session_id)
        self.assertTrue(result)

        # Session should no longer exist
        session_data = BookingFlowSessionService.get_session(session_id)
        self.assertIsNone(session_data)

    def test_delete_session_nonexistent(self):
        """Test deleting non-existent session"""
        result = BookingFlowSessionService.delete_session("nonexistent-id")
        self.assertFalse(result)

    def test_get_user_sessions(self):
        """Test getting user's active sessions"""
        user_id = 123

        # Create multiple sessions for the same user
        session1 = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id, user_id=user_id)
        session2 = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id, user_id=user_id)

        sessions = BookingFlowSessionService.get_user_sessions(user_id)

        self.assertEqual(len(sessions), 2)
        self.assertIn(session1, sessions)
        self.assertIn(session2, sessions)

    def test_get_user_sessions_empty(self):
        """Test getting sessions for user with no sessions"""
        sessions = BookingFlowSessionService.get_user_sessions(999)
        self.assertEqual(len(sessions), 0)

    def test_get_user_sessions_filters_expired(self):
        """Test that expired sessions are filtered from user sessions"""
        user_id = 123

        session1 = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id, user_id=user_id)

        # Manually expire session1
        key = BookingFlowSessionService.SESSION_KEY.format(session_id=session1)
        session_data = self.mock_cache.get(key)
        session_data["expires_at"] = (timezone.now() - timedelta(hours=1)).isoformat()
        self.mock_cache.set(key, session_data)

        sessions = BookingFlowSessionService.get_user_sessions(user_id)
        self.assertEqual(len(sessions), 0)


class BookingFlowSessionServiceAnalyticsTestCase(TestCase):
    """Test cases for BookingFlowSessionService analytics methods"""

    def setUp(self):
        """Set up test data"""
        self.mock_cache = MockCache()
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        self.cache_patcher = patch("core.domains.bookingflow.redis_session_service.session_cache", self.mock_cache)
        self.mock_session_cache = self.cache_patcher.start()

    def tearDown(self):
        """Clean up patches"""
        self.cache_patcher.stop()
        self.mock_cache.clear()

    def test_get_flow_analytics_summary_empty(self):
        """Test getting analytics for flow with no data"""
        analytics = BookingFlowSessionService.get_flow_analytics_summary(self.booking_flow.id)

        self.assertEqual(analytics["sessions_started"], 0)
        self.assertEqual(analytics["sessions_completed"], 0)
        self.assertEqual(analytics["sessions_abandoned"], 0)
        self.assertEqual(analytics["conversion_rate"], 0.0)

    def test_update_flow_analytics_session_started(self):
        """Test analytics update on session start"""
        # Create a session which triggers analytics update
        BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        analytics = BookingFlowSessionService.get_flow_analytics_summary(self.booking_flow.id)

        self.assertEqual(analytics["sessions_started"], 1)

    def test_update_flow_analytics_session_completed(self):
        """Test analytics update on session completion"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        with patch.object(BookingFlowSessionService, "_schedule_session_persistence"):
            BookingFlowSessionService.complete_session(session_id)

        analytics = BookingFlowSessionService.get_flow_analytics_summary(self.booking_flow.id)

        self.assertEqual(analytics["sessions_started"], 1)
        self.assertEqual(analytics["sessions_completed"], 1)
        self.assertEqual(analytics["conversion_rate"], 100.0)

    def test_update_flow_analytics_session_abandoned(self):
        """Test analytics update on session abandonment"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        BookingFlowSessionService.update_session(session_id, current_step=2)
        BookingFlowSessionService.abandon_session(session_id)

        analytics = BookingFlowSessionService.get_flow_analytics_summary(self.booking_flow.id)

        self.assertEqual(analytics["sessions_started"], 1)
        self.assertEqual(analytics["sessions_abandoned"], 1)
        self.assertEqual(analytics["step_drop_off"]["2"], 1)

    def test_conversion_rate_calculation(self):
        """Test conversion rate calculation"""
        # Create 4 sessions, complete 2
        for i in range(4):
            session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)
            if i < 2:
                with patch.object(BookingFlowSessionService, "_schedule_session_persistence"):
                    BookingFlowSessionService.complete_session(session_id)

        analytics = BookingFlowSessionService.get_flow_analytics_summary(self.booking_flow.id)

        self.assertEqual(analytics["sessions_started"], 4)
        self.assertEqual(analytics["sessions_completed"], 2)
        self.assertEqual(analytics["conversion_rate"], 50.0)


class BookingFlowCacheWarmerTestCase(TestCase):
    """Test cases for BookingFlowCacheWarmer"""

    def setUp(self):
        """Set up test data"""
        self.mock_cache = MockCache()
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="introduction", order=1, is_enabled=True
        )
        self.cache_patcher = patch("core.domains.bookingflow.redis_session_service.session_cache", self.mock_cache)
        self.mock_session_cache = self.cache_patcher.start()

    def tearDown(self):
        """Clean up patches"""
        self.cache_patcher.stop()
        self.mock_cache.clear()

    def test_warm_booking_flow_data(self):
        """Test warming cache with booking flow data"""
        BookingFlowCacheWarmer.warm_booking_flow_data(self.booking_flow.id)

        cached_data = self.mock_cache.get(f"booking_flow:{self.booking_flow.id}")

        self.assertIsNotNone(cached_data)
        self.assertEqual(cached_data["id"], self.booking_flow.id)
        self.assertEqual(cached_data["name"], "Test Flow")
        self.assertIn("steps", cached_data)

    def test_warm_booking_flow_nonexistent(self):
        """Test warming cache for non-existent flow"""
        # Should not raise an exception
        BookingFlowCacheWarmer.warm_booking_flow_data(99999)

        cached_data = self.mock_cache.get("booking_flow:99999")
        self.assertIsNone(cached_data)

    def test_warm_booking_flow_inactive(self):
        """Test warming cache for inactive flow"""
        self.booking_flow.is_active = False
        self.booking_flow.save()

        BookingFlowCacheWarmer.warm_booking_flow_data(self.booking_flow.id)

        cached_data = self.mock_cache.get(f"booking_flow:{self.booking_flow.id}")
        self.assertIsNone(cached_data)


class BookingFlowSessionServiceIntegrationTestCase(TestCase):
    """Integration tests for complete booking flow session lifecycle"""

    def setUp(self):
        """Set up test data"""
        self.mock_cache = MockCache()
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="introduction", order=1, is_enabled=True
        )
        BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="contact_info", order=2, is_enabled=True
        )
        BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="confirmation", order=3, is_enabled=True
        )
        self.cache_patcher = patch("core.domains.bookingflow.redis_session_service.session_cache", self.mock_cache)
        self.mock_session_cache = self.cache_patcher.start()

    def tearDown(self):
        """Clean up patches"""
        self.cache_patcher.stop()
        self.mock_cache.clear()

    def test_complete_booking_flow_lifecycle(self):
        """Test complete booking flow from start to completion"""
        user_id = 123

        # Step 1: Create session
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id, user_id=user_id)

        session = BookingFlowSessionService.get_session(session_id)
        self.assertEqual(session["current_step"], 0)
        self.assertFalse(session["analytics_data"]["completed"])

        # Step 2: Complete introduction step
        BookingFlowSessionService.advance_step(session_id, step_data={"viewed": True}, step_name="introduction")

        session = BookingFlowSessionService.get_session(session_id)
        self.assertEqual(session["current_step"], 1)
        self.assertTrue(session["analytics_data"]["conversion_funnel"]["introduction"])

        # Step 3: Complete contact info step
        BookingFlowSessionService.advance_step(
            session_id, step_data={"email": "test@example.com", "phone": "123-456-7890"}, step_name="contact_info"
        )

        session = BookingFlowSessionService.get_session(session_id)
        self.assertEqual(session["current_step"], 2)
        self.assertTrue(session["analytics_data"]["conversion_funnel"]["contact_info"])

        # Step 4: Complete session
        with patch.object(BookingFlowSessionService, "_schedule_session_persistence"):
            BookingFlowSessionService.complete_session(session_id, final_data={"booking_reference": "ABC123"})

        session = BookingFlowSessionService.get_session(session_id)
        self.assertTrue(session["completed"])
        self.assertTrue(session["analytics_data"]["completed"])
        self.assertTrue(session["analytics_data"]["conversion_funnel"]["confirmation"])
        self.assertEqual(session["booking_data"]["booking_reference"], "ABC123")

        # Verify analytics
        analytics = BookingFlowSessionService.get_flow_analytics_summary(self.booking_flow.id)
        self.assertEqual(analytics["sessions_started"], 1)
        self.assertEqual(analytics["sessions_completed"], 1)
        self.assertEqual(analytics["conversion_rate"], 100.0)

    def test_abandoned_booking_flow(self):
        """Test tracking abandoned booking flow"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        # Complete first step
        BookingFlowSessionService.advance_step(session_id, step_data={}, step_name="introduction")

        # User abandons at step 2
        BookingFlowSessionService.abandon_session(session_id, step_name="contact_info")

        session = BookingFlowSessionService.get_session(session_id)
        self.assertEqual(session["analytics_data"]["abandoned_at_step"], 1)
        self.assertEqual(session["analytics_data"]["abandoned_at_step_name"], "contact_info")

        analytics = BookingFlowSessionService.get_flow_analytics_summary(self.booking_flow.id)
        self.assertEqual(analytics["sessions_started"], 1)
        self.assertEqual(analytics["sessions_abandoned"], 1)
        self.assertEqual(analytics["step_drop_off"]["1"], 1)

    def test_session_with_validation_errors(self):
        """Test session that encounters validation errors"""
        session_id = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id)

        # First attempt with errors
        BookingFlowSessionService.advance_step(
            session_id,
            step_data={"email": "invalid"},
            step_name="contact_info",
            validation_errors=["Invalid email format"],
        )

        # Second attempt successful
        BookingFlowSessionService.advance_step(
            session_id, step_data={"email": "valid@example.com"}, step_name="contact_info"
        )

        session = BookingFlowSessionService.get_session(session_id)
        form_errors = session["analytics_data"]["form_errors"]

        self.assertEqual(len(form_errors), 1)
        self.assertEqual(form_errors[0]["step_name"], "contact_info")
        self.assertIn("Invalid email format", form_errors[0]["errors"])

    def test_multiple_user_sessions(self):
        """Test handling multiple sessions for same user"""
        user_id = 123

        session1 = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id, user_id=user_id)
        session2 = BookingFlowSessionService.create_session(booking_flow_id=self.booking_flow.id, user_id=user_id)

        user_sessions = BookingFlowSessionService.get_user_sessions(user_id)

        self.assertEqual(len(user_sessions), 2)

        # Sessions should be independent
        BookingFlowSessionService.update_session(session1, current_step=2)

        session1_data = BookingFlowSessionService.get_session(session1)
        session2_data = BookingFlowSessionService.get_session(session2)

        self.assertEqual(session1_data["current_step"], 2)
        self.assertEqual(session2_data["current_step"], 0)
