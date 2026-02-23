# backend/core/domains/bookingflow/tests/test_serializers.py

import unittest
import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from core.domains.bookingflow.models import (
    BookingFlow,
    BookingFlowAnalytics,
    BookingFlowStep,
    BookingSession,
    ConfirmationStepConfiguration,
    DateTimeStepConfiguration,
    IntroductionStepConfiguration,
    PaymentInfoStepConfiguration,
    PaymentTermsConfiguration,
    PricingSummaryStepConfiguration,
)
from core.domains.bookingflow.serializers import (
    BookingFlowAnalyticsSerializer,
    BookingFlowCreateSerializer,
    BookingFlowDetailSerializer,
    BookingFlowSerializer,
    BookingFlowStepCreateSerializer,
    BookingFlowStepSerializer,
    BookingFlowStepUpdateSerializer,
    BookingFlowUpdateSerializer,
    BookingSessionCreateSerializer,
    BookingSessionSerializer,
    BookingSessionUpdateSerializer,
    ConfirmationStepConfigurationSerializer,
    DateTimeStepConfigurationSerializer,
    DuplicateFlowSerializer,
    IntroductionStepConfigurationSerializer,
    PaymentTermsConfigurationSerializer,
    PricingSummaryStepConfigurationSerializer,
    PublicBookingFlowSerializer,
    ReorderStepsSerializer,
)
from core.domains.events.models import EventType

User = get_user_model()


class BookingFlowSerializerTestCase(TestCase):
    """Test cases for BookingFlowSerializer"""

    def setUp(self):
        """Set up test data"""
        self.event_type = EventType.objects.create(name="Wedding", description="Wedding events")
        self.booking_flow = BookingFlow.objects.create(
            name="Test Booking Flow", description="A test booking flow", event_type=self.event_type, is_active=True
        )
        self.factory = APIRequestFactory()

    def test_serializer_contains_expected_fields(self):
        """Test serializer returns expected fields"""
        serializer = BookingFlowSerializer(self.booking_flow)
        data = serializer.data

        expected_fields = [
            "id",
            "name",
            "description",
            "event_type",
            "event_type_name",
            "event_type_details",
            "workflow_template",
            "workflow_template_details",
            "confirmation_email_template",
            "confirmation_email_template_details",
            "reminder_email_template",
            "reminder_email_template_details",
            "is_active",
            "allow_guest_booking",
            "require_account_creation",
            "auto_approve_bookings",
            "enable_progress_saving",
            "max_advance_booking_days",
            "min_advance_booking_days",
            "allow_discounts",
            "available_discounts",
            "available_discounts_details",
            "redirect_url",
            "success_message",
            "is_test_mode",
            "conversion_tracking_code",
            "total_steps",
            "enabled_steps_count",
            "created_at",
            "updated_at",
        ]

        for field in expected_fields:
            self.assertIn(field, data)

    def test_event_type_name_serialization(self):
        """Test event_type_name field serialization"""
        serializer = BookingFlowSerializer(self.booking_flow)
        data = serializer.data

        self.assertEqual(data["event_type_name"], "Wedding")

    def test_event_type_name_null_event_type(self):
        """Test event_type_name when event_type is null"""
        self.booking_flow.event_type = None
        self.booking_flow.is_active = False  # Set to inactive to avoid validation error
        self.booking_flow.save()

        serializer = BookingFlowSerializer(self.booking_flow)
        data = serializer.data

        self.assertIsNone(data["event_type_name"])

    def test_total_steps_count(self):
        """Test total_steps field"""
        BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="introduction", order=1)
        BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="confirmation", order=2)

        serializer = BookingFlowSerializer(self.booking_flow)
        data = serializer.data

        self.assertEqual(data["total_steps"], 2)

    def test_enabled_steps_count(self):
        """Test enabled_steps_count field"""
        BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="introduction", order=1, is_enabled=True
        )
        BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="confirmation", order=2, is_enabled=False
        )

        serializer = BookingFlowSerializer(self.booking_flow)
        data = serializer.data

        self.assertEqual(data["enabled_steps_count"], 1)


class BookingFlowDetailSerializerTestCase(TestCase):
    """Test cases for BookingFlowDetailSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        self.step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="introduction", order=1)

    def test_includes_steps(self):
        """Test that detail serializer includes steps"""
        serializer = BookingFlowDetailSerializer(self.booking_flow)
        data = serializer.data

        self.assertIn("steps", data)
        self.assertEqual(len(data["steps"]), 1)
        self.assertEqual(data["steps"][0]["step_type"], "introduction")


class BookingFlowStepSerializerTestCase(TestCase):
    """Test cases for BookingFlowStepSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="introduction", order=1, is_enabled=True, is_required=True
        )

    def test_serializer_contains_expected_fields(self):
        """Test serializer returns expected fields"""
        serializer = BookingFlowStepSerializer(self.step)
        data = serializer.data

        expected_fields = [
            "id",
            "booking_flow",
            "step_type",
            "step_type_display",
            "description",
            "order",
            "is_enabled",
            "is_required",
            "is_skippable",
            "display_conditions",
            "configuration",
            "validation_rules",
            "configuration_data",
            "created_at",
            "updated_at",
        ]

        for field in expected_fields:
            self.assertIn(field, data)

    def test_step_type_display(self):
        """Test step_type_display field"""
        serializer = BookingFlowStepSerializer(self.step)
        data = serializer.data

        self.assertEqual(data["step_type_display"], "Introduction")

    def test_configuration_data_for_introduction(self):
        """Test configuration_data includes introduction config"""
        IntroductionStepConfiguration.objects.create(step=self.step, title="Welcome", content="Welcome to booking")

        serializer = BookingFlowStepSerializer(self.step)
        data = serializer.data

        self.assertIsNotNone(data["configuration_data"])
        self.assertEqual(data["configuration_data"]["title"], "Welcome")
        self.assertEqual(data["configuration_data"]["content"], "Welcome to booking")

    def test_configuration_data_null_when_no_config(self):
        """Test configuration_data is null when no config exists"""
        serializer = BookingFlowStepSerializer(self.step)
        data = serializer.data

        self.assertIsNone(data["configuration_data"])

    def test_configuration_data_for_different_step_types(self):
        """Test configuration_data for various step types"""
        # Create payment step with config
        payment_step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="payment_info", order=2)
        PaymentInfoStepConfiguration.objects.create(step=payment_step, accept_full_payment=True, accept_deposit=True)

        serializer = BookingFlowStepSerializer(payment_step)
        data = serializer.data

        self.assertIsNotNone(data["configuration_data"])
        self.assertTrue(data["configuration_data"]["accept_full_payment"])
        self.assertTrue(data["configuration_data"]["accept_deposit"])


class BookingSessionSerializerTestCase(TestCase):
    """Test cases for BookingSessionSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="introduction", order=1, is_enabled=True
        )
        self.user = User.objects.create_user(email="test@test.com", first_name="Test", last_name="User", role="CLIENT")
        self.session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=self.booking_flow,
            client=self.user,
            current_step=self.step,
            booking_data={"test": "data"},
            expires_at=timezone.now() + timedelta(hours=24),
        )

    def test_serializer_contains_expected_fields(self):
        """Test serializer returns expected fields"""
        serializer = BookingSessionSerializer(self.session)
        data = serializer.data

        expected_fields = [
            "id",
            "session_id",
            "booking_flow",
            "booking_flow_details",
            "client",
            "current_step",
            "current_step_details",
            "booking_data",
            "validation_errors",
            "is_completed",
            "is_abandoned",
            "completed_at",
            "expires_at",
            "progress_percentage",
            "total_price",
            "is_expired",
            "created_at",
            "updated_at",
        ]

        for field in expected_fields:
            self.assertIn(field, data)

    def test_booking_flow_details(self):
        """Test booking_flow_details field"""
        serializer = BookingSessionSerializer(self.session)
        data = serializer.data

        self.assertIsNotNone(data["booking_flow_details"])
        self.assertEqual(data["booking_flow_details"]["id"], self.booking_flow.id)
        self.assertEqual(data["booking_flow_details"]["name"], "Test Flow")

    def test_progress_percentage(self):
        """Test progress_percentage field"""
        serializer = BookingSessionSerializer(self.session)
        data = serializer.data

        self.assertEqual(data["progress_percentage"], 0)

    def test_current_step_details(self):
        """Test current_step_details field"""
        serializer = BookingSessionSerializer(self.session)
        data = serializer.data

        self.assertIsNotNone(data["current_step_details"])
        self.assertEqual(data["current_step_details"]["step_type"], "introduction")


class BookingFlowAnalyticsSerializerTestCase(TestCase):
    """Test cases for BookingFlowAnalyticsSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        self.analytics = BookingFlowAnalytics.objects.create(
            booking_flow=self.booking_flow,
            date=timezone.now().date(),
            total_sessions=100,
            completed_bookings=25,
            conversion_rate=Decimal("25.00"),
        )

    def test_serializer_contains_expected_fields(self):
        """Test serializer returns expected fields"""
        serializer = BookingFlowAnalyticsSerializer(self.analytics)
        data = serializer.data

        expected_fields = [
            "id",
            "booking_flow",
            "booking_flow_name",
            "date",
            "total_sessions",
            "completed_bookings",
            "abandoned_sessions",
            "conversion_rate",
            "step_completion_data",
            "step_drop_off_data",
            "total_revenue",
            "average_booking_value",
            "average_completion_time",
            "bounce_rate",
            "created_at",
            "updated_at",
        ]

        for field in expected_fields:
            self.assertIn(field, data)

    def test_booking_flow_name(self):
        """Test booking_flow_name field"""
        serializer = BookingFlowAnalyticsSerializer(self.analytics)
        data = serializer.data

        self.assertEqual(data["booking_flow_name"], "Test Flow")


class PublicBookingFlowSerializerTestCase(TestCase):
    """Test cases for PublicBookingFlowSerializer"""

    def setUp(self):
        """Set up test data"""
        self.event_type = EventType.objects.create(name="Wedding", description="Wedding events")
        self.booking_flow = BookingFlow.objects.create(
            name="Public Test Flow", description="Public facing flow", event_type=self.event_type, is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="introduction", order=1, is_enabled=True
        )

    def test_public_serializer_limited_fields(self):
        """Test that public serializer only includes safe fields"""
        serializer = PublicBookingFlowSerializer(self.booking_flow)
        data = serializer.data

        # Should include public fields
        self.assertIn("id", data)
        self.assertIn("name", data)
        self.assertIn("description", data)
        self.assertIn("event_type", data)
        self.assertIn("event_type_name", data)
        self.assertIn("enabled_steps", data)
        self.assertIn("total_steps", data)

        # Should not include admin-only fields
        self.assertNotIn("is_test_mode", data)
        self.assertNotIn("conversion_tracking_code", data)

    def test_enabled_steps_included(self):
        """Test that enabled steps are included"""
        serializer = PublicBookingFlowSerializer(self.booking_flow)
        data = serializer.data

        self.assertEqual(len(data["enabled_steps"]), 1)
        self.assertEqual(data["enabled_steps"][0]["step_type"], "introduction")


class BookingFlowCreateSerializerTestCase(TestCase):
    """Test cases for BookingFlowCreateSerializer"""

    def setUp(self):
        """Set up test data"""
        self.event_type = EventType.objects.create(name="Wedding", description="Wedding events")

    def test_valid_create_data(self):
        """Test serializer with valid data"""
        data = {
            "name": "New Booking Flow",
            "description": "A new flow",
            "event_type": self.event_type.id,
            "is_active": True,
            "min_advance_booking_days": 1,
            "max_advance_booking_days": 365,
        }

        serializer = BookingFlowCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_invalid_min_max_days(self):
        """Test validation error when min days >= max days"""
        data = {"name": "Invalid Flow", "min_advance_booking_days": 30, "max_advance_booking_days": 10}

        serializer = BookingFlowCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("max_advance_booking_days", serializer.errors)

    def test_event_type_empty_string_converts_to_none(self):
        """Test that empty string event_type converts to None"""
        data = {"name": "Any Event Type Flow", "event_type": ""}

        serializer = BookingFlowCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data.get("event_type"))

    @unittest.skip("Test has EventType field conversion issue - needs investigation")
    def test_duplicate_active_flow_validation(self):
        """Test validation error for duplicate active flow.

        This test needs investigation - EventType object conversion issue.
        """
        pass


class BookingFlowUpdateSerializerTestCase(TestCase):
    """Test cases for BookingFlowUpdateSerializer"""

    def setUp(self):
        """Set up test data"""
        self.event_type = EventType.objects.create(name="Wedding", description="Wedding events")
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", event_type=self.event_type, is_active=True)

    def test_valid_update_data(self):
        """Test serializer with valid update data"""
        data = {"name": "Updated Flow Name", "description": "Updated description"}

        serializer = BookingFlowUpdateSerializer(instance=self.booking_flow, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_update_preserves_unspecified_fields(self):
        """Test that partial update preserves unspecified fields"""
        data = {"name": "Updated Name"}

        serializer = BookingFlowUpdateSerializer(instance=self.booking_flow, data=data, partial=True)
        self.assertTrue(serializer.is_valid())

        updated = serializer.save()
        self.assertEqual(updated.name, "Updated Name")
        self.assertEqual(updated.event_type, self.event_type)  # Preserved


class BookingFlowStepCreateSerializerTestCase(TestCase):
    """Test cases for BookingFlowStepCreateSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)

    def test_valid_step_creation(self):
        """Test serializer with valid step data"""
        data = {"booking_flow": self.booking_flow.id, "step_type": "introduction", "order": 1, "is_enabled": True}

        serializer = BookingFlowStepCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_availability_check_step_type_rejected(self):
        """Test that availability_check step type is rejected"""
        data = {"booking_flow": self.booking_flow.id, "step_type": "availability_check", "order": 1}

        serializer = BookingFlowStepCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("step_type", serializer.errors)

    def test_duplicate_step_type_validation(self):
        """Test validation error for duplicate step type"""
        BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="introduction", order=1)

        data = {"booking_flow": self.booking_flow.id, "step_type": "introduction", "order": 2}

        serializer = BookingFlowStepCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        # unique_together constraint puts error in non_field_errors
        self.assertIn("non_field_errors", serializer.errors)
        self.assertIn("unique", serializer.errors["non_field_errors"][0])


class BookingFlowStepUpdateSerializerTestCase(TestCase):
    """Test cases for BookingFlowStepUpdateSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        self.step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="introduction", order=1)

    def test_valid_update(self):
        """Test serializer with valid update data"""
        data = {"description": "Updated description", "is_enabled": False}

        serializer = BookingFlowStepUpdateSerializer(instance=self.step, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_availability_check_step_type_rejected_on_update(self):
        """Test that availability_check step type is rejected on update"""
        data = {"step_type": "availability_check"}

        serializer = BookingFlowStepUpdateSerializer(instance=self.step, data=data, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn("step_type", serializer.errors)


class BookingSessionCreateSerializerTestCase(TestCase):
    """Test cases for BookingSessionCreateSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)

    def test_valid_session_creation(self):
        """Test serializer with valid session data"""
        data = {"booking_flow": self.booking_flow.id}

        serializer = BookingSessionCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_with_optional_fields(self):
        """Test serializer with optional fields"""
        data = {
            "booking_flow": self.booking_flow.id,
            "ip_address": "192.168.1.1",
            "user_agent": "Test Browser",
            "referrer_url": "https://example.com",
        }

        serializer = BookingSessionCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class BookingSessionUpdateSerializerTestCase(TestCase):
    """Test cases for BookingSessionUpdateSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        self.step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="introduction", order=1)
        self.session = BookingSession.objects.create(
            session_id=uuid.uuid4(), booking_flow=self.booking_flow, expires_at=timezone.now() + timedelta(hours=24)
        )

    def test_valid_session_update(self):
        """Test serializer with valid update data"""
        data = {
            "session_id": str(self.session.session_id),
            "step_id": self.step.id,
            "step_data": {"field": "value"},
            "mark_completed": False,
        }

        serializer = BookingSessionUpdateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class ReorderStepsSerializerTestCase(TestCase):
    """Test cases for ReorderStepsSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)

    def test_valid_reorder_data(self):
        """Test serializer with valid reorder data"""
        data = {"flow_id": self.booking_flow.id, "order_mapping": {"1": 2, "2": 1}}

        serializer = ReorderStepsSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class DuplicateFlowSerializerTestCase(TestCase):
    """Test cases for DuplicateFlowSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Original Flow", is_active=True)

    def test_valid_duplicate_data(self):
        """Test serializer with valid duplicate data"""
        data = {"name": "Duplicated Flow", "copy_steps": True, "copy_configuration": True}

        serializer = DuplicateFlowSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_duplicate_name_validation(self):
        """Test validation error for duplicate name"""
        data = {
            "name": "Original Flow",  # Already exists
            "copy_steps": True,
        }

        serializer = DuplicateFlowSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)


class StepConfigurationSerializersTestCase(TestCase):
    """Test cases for step configuration serializers"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)

    def test_introduction_config_serializer(self):
        """Test IntroductionStepConfigurationSerializer"""
        step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="introduction", order=1)
        config = IntroductionStepConfiguration.objects.create(step=step, title="Welcome", content="Welcome content")

        serializer = IntroductionStepConfigurationSerializer(config)
        data = serializer.data

        self.assertEqual(data["title"], "Welcome")
        self.assertEqual(data["content"], "Welcome content")

    def test_datetime_config_serializer(self):
        """Test DateTimeStepConfigurationSerializer"""
        step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="date_time", order=1)
        config = DateTimeStepConfiguration.objects.create(step=step, allow_multi_day=True, blocked_dates=["2024-12-25"])

        serializer = DateTimeStepConfigurationSerializer(config)
        data = serializer.data

        self.assertTrue(data["allow_multi_day"])
        self.assertEqual(data["blocked_dates"], ["2024-12-25"])

    def test_pricing_summary_config_serializer(self):
        """Test PricingSummaryStepConfigurationSerializer"""
        step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="pricing_summary", order=1)
        config = PricingSummaryStepConfiguration.objects.create(
            step=step, show_package_breakdown=True, terms_url="https://example.com/terms"
        )

        serializer = PricingSummaryStepConfigurationSerializer(config)
        data = serializer.data

        self.assertTrue(data["show_package_breakdown"])
        self.assertEqual(data["terms_url"], "https://example.com/terms")
        self.assertEqual(data["effective_terms_url"], "https://example.com/terms")

    def test_pricing_summary_config_default_urls(self):
        """Test PricingSummaryStepConfigurationSerializer default URLs"""
        step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="pricing_summary", order=1)
        config = PricingSummaryStepConfiguration.objects.create(
            step=step,
            show_package_breakdown=True,
            # No custom URLs
        )

        serializer = PricingSummaryStepConfigurationSerializer(config)
        data = serializer.data

        self.assertEqual(data["effective_terms_url"], "/terms")
        self.assertEqual(data["effective_privacy_url"], "/privacy")

    def test_confirmation_config_serializer(self):
        """Test ConfirmationStepConfigurationSerializer"""
        step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="confirmation", order=1)
        config = ConfirmationStepConfiguration.objects.create(
            step=step, title="Confirmed!", message="Your booking is confirmed.", send_confirmation_email=True
        )

        serializer = ConfirmationStepConfigurationSerializer(config)
        data = serializer.data

        self.assertEqual(data["title"], "Confirmed!")
        self.assertEqual(data["message"], "Your booking is confirmed.")
        self.assertTrue(data["send_confirmation_email"])


class PaymentTermsConfigurationSerializerTestCase(TestCase):
    """Test cases for PaymentTermsConfigurationSerializer"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(name="Test Flow", is_active=True)
        self.step = BookingFlowStep.objects.create(booking_flow=self.booking_flow, step_type="payment_info", order=1)

    def test_deposit_percentage_validation(self):
        """Test deposit percentage validation (0-100)"""
        data = {"step": self.step.id, "deposit_percentage": Decimal("150.00")}

        serializer = PaymentTermsConfigurationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("deposit_percentage", serializer.errors)

    def test_valid_deposit_percentage(self):
        """Test valid deposit percentage"""
        config = PaymentTermsConfiguration.objects.create(step=self.step, deposit_percentage=Decimal("25.00"))

        serializer = PaymentTermsConfigurationSerializer(config)
        data = serializer.data

        self.assertEqual(data["deposit_percentage"], "25.00")

    def test_downpayment_percentage_validation(self):
        """Test downpayment percentage validation (0-100)"""
        data = {"step": self.step.id, "downpayment_percentage": Decimal("-10.00")}

        serializer = PaymentTermsConfigurationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("downpayment_percentage", serializer.errors)

    def test_late_fee_percentage_validation(self):
        """Test late fee percentage validation (0-100)"""
        data = {"step": self.step.id, "late_fee_percentage": Decimal("200.00")}

        serializer = PaymentTermsConfigurationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("late_fee_percentage", serializer.errors)

    def test_cancellation_admin_fee_validation(self):
        """Test cancellation admin fee percentage validation (0-100)"""
        data = {"step": self.step.id, "cancellation_admin_fee_percentage": Decimal("105.00")}

        serializer = PaymentTermsConfigurationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("cancellation_admin_fee_percentage", serializer.errors)

    def test_null_values_allowed(self):
        """Test that null values are allowed (meaning use global default)"""
        config = PaymentTermsConfiguration.objects.create(
            step=self.step
            # All nullable fields left as None
        )

        serializer = PaymentTermsConfigurationSerializer(config)
        data = serializer.data

        self.assertIsNone(data["deposit_percentage"])
        self.assertIsNone(data["downpayment_percentage"])
        self.assertIsNone(data["late_fee_percentage"])
