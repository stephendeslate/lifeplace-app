# backend/core/domains/bookingflow/tests/test_models.py

import uuid
from decimal import Decimal
from datetime import timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.domains.bookingflow.models import (
    BookingFlow,
    BookingFlowStep,
    BookingSession,
    BookingFlowAnalytics,
    IntroductionStepConfiguration,
    VenueSelectionStepConfiguration,
    DateTimeStepConfiguration,
    QuestionnaireStepConfiguration,
    QuestionnaireStepItem,
    PackageSelectionStepConfiguration,
    AddonSelectionStepConfiguration,
    PricingSummaryStepConfiguration,
    ContactInfoStepConfiguration,
    PaymentInfoStepConfiguration,
    PaymentTermsConfiguration,
    ConfirmationStepConfiguration,
)
from core.domains.events.models import EventType

User = get_user_model()


class BookingFlowModelTestCase(TestCase):
    """Test cases for BookingFlow model"""

    def setUp(self):
        """Set up test data"""
        self.event_type = EventType.objects.create(
            name='Wedding',
            description='Wedding events'
        )

    def test_booking_flow_creation(self):
        """Test creating a booking flow"""
        booking_flow = BookingFlow.objects.create(
            name='Test Booking Flow',
            description='A test booking flow',
            event_type=self.event_type,
            is_active=True
        )

        self.assertEqual(booking_flow.name, 'Test Booking Flow')
        self.assertEqual(booking_flow.description, 'A test booking flow')
        self.assertEqual(booking_flow.event_type, self.event_type)
        self.assertTrue(booking_flow.is_active)
        self.assertIsNotNone(booking_flow.created_at)
        self.assertIsNotNone(booking_flow.updated_at)

    def test_booking_flow_str_with_event_type(self):
        """Test string representation with event type"""
        booking_flow = BookingFlow.objects.create(
            name='Wedding Flow',
            event_type=self.event_type,
            is_active=True
        )

        self.assertEqual(str(booking_flow), 'Wedding Flow - Wedding')

    def test_booking_flow_str_without_event_type(self):
        """Test string representation without event type"""
        booking_flow = BookingFlow.objects.create(
            name='Generic Flow',
            event_type=None,
            is_active=True
        )

        self.assertEqual(str(booking_flow), 'Generic Flow - Any Event Type')

    def test_event_type_name_property(self):
        """Test event_type_name property"""
        booking_flow_with_type = BookingFlow.objects.create(
            name='Flow With Type',
            event_type=self.event_type,
            is_active=True
        )
        booking_flow_without_type = BookingFlow.objects.create(
            name='Flow Without Type',
            event_type=None,
            is_active=False
        )

        self.assertEqual(booking_flow_with_type.event_type_name, 'Wedding')
        self.assertEqual(booking_flow_without_type.event_type_name, 'Any Event Type')

    def test_unique_active_booking_flow_per_event_type(self):
        """Test that only one active booking flow per event type is allowed"""
        BookingFlow.objects.create(
            name='First Wedding Flow',
            event_type=self.event_type,
            is_active=True
        )

        # Attempting to create another active flow for the same event type should fail
        with self.assertRaises(ValidationError):
            BookingFlow.objects.create(
                name='Second Wedding Flow',
                event_type=self.event_type,
                is_active=True
            )

    def test_unique_active_booking_flow_for_any_event_type(self):
        """Test that only one active booking flow for 'Any Event Type' is allowed"""
        BookingFlow.objects.create(
            name='First Generic Flow',
            event_type=None,
            is_active=True
        )

        # Attempting to create another active flow for null event type should fail
        with self.assertRaises(ValidationError):
            BookingFlow.objects.create(
                name='Second Generic Flow',
                event_type=None,
                is_active=True
            )

    def test_multiple_inactive_flows_same_event_type(self):
        """Test that multiple inactive flows for same event type are allowed"""
        flow1 = BookingFlow.objects.create(
            name='Inactive Flow 1',
            event_type=self.event_type,
            is_active=False
        )
        flow2 = BookingFlow.objects.create(
            name='Inactive Flow 2',
            event_type=self.event_type,
            is_active=False
        )

        self.assertEqual(BookingFlow.objects.filter(event_type=self.event_type).count(), 2)

    def test_enabled_steps_property(self):
        """Test enabled_steps property returns only enabled steps in order"""
        booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )

        # Create steps with different orders and enabled states
        step1 = BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='introduction',
            order=1,
            is_enabled=True
        )
        step2 = BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='contact_info',
            order=2,
            is_enabled=False
        )
        step3 = BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='confirmation',
            order=3,
            is_enabled=True
        )

        enabled_steps = list(booking_flow.enabled_steps)

        self.assertEqual(len(enabled_steps), 2)
        self.assertEqual(enabled_steps[0], step1)
        self.assertEqual(enabled_steps[1], step3)

    def test_calculate_total_steps(self):
        """Test calculate_total_steps method"""
        booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )

        self.assertEqual(booking_flow.calculate_total_steps(), 0)

        BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='introduction',
            order=1,
            is_enabled=True
        )
        BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='contact_info',
            order=2,
            is_enabled=True
        )
        BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='confirmation',
            order=3,
            is_enabled=False
        )

        self.assertEqual(booking_flow.calculate_total_steps(), 2)

    def test_get_next_step(self):
        """Test get_next_step method"""
        booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )

        step1 = BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='introduction',
            order=1,
            is_enabled=True
        )
        step2 = BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='contact_info',
            order=2,
            is_enabled=False
        )
        step3 = BookingFlowStep.objects.create(
            booking_flow=booking_flow,
            step_type='confirmation',
            order=3,
            is_enabled=True
        )

        # Next step after step1 should skip disabled step2 and return step3
        next_step = booking_flow.get_next_step(step1.id)
        self.assertEqual(next_step, step3)

        # Next step after step3 should be None
        next_step = booking_flow.get_next_step(step3.id)
        self.assertIsNone(next_step)

    def test_get_next_step_invalid_step_id(self):
        """Test get_next_step with invalid step ID"""
        booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )

        next_step = booking_flow.get_next_step(99999)
        self.assertIsNone(next_step)

    def test_default_values(self):
        """Test default values for booking flow fields"""
        booking_flow = BookingFlow.objects.create(name='Default Flow')

        self.assertTrue(booking_flow.is_active)
        self.assertTrue(booking_flow.allow_guest_booking)
        self.assertFalse(booking_flow.require_account_creation)
        self.assertFalse(booking_flow.auto_approve_bookings)
        self.assertTrue(booking_flow.enable_progress_saving)
        self.assertEqual(booking_flow.max_advance_booking_days, 365)
        self.assertEqual(booking_flow.min_advance_booking_days, 1)
        self.assertTrue(booking_flow.allow_discounts)
        self.assertFalse(booking_flow.require_immediate_payment)
        self.assertFalse(booking_flow.is_test_mode)


class BookingFlowStepModelTestCase(TestCase):
    """Test cases for BookingFlowStep model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )

    def test_step_creation(self):
        """Test creating a booking flow step"""
        step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            description='Welcome step',
            order=1,
            is_enabled=True,
            is_required=True
        )

        self.assertEqual(step.booking_flow, self.booking_flow)
        self.assertEqual(step.step_type, 'introduction')
        self.assertEqual(step.description, 'Welcome step')
        self.assertEqual(step.order, 1)
        self.assertTrue(step.is_enabled)
        self.assertTrue(step.is_required)

    def test_step_str(self):
        """Test string representation of step"""
        step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            order=1
        )

        self.assertEqual(str(step), 'Test Flow - Introduction')

    def test_step_type_choices(self):
        """Test all step type choices are valid"""
        valid_types = [
            'introduction', 'venue_selection', 'date_time', 'questionnaire',
            'package_selection', 'addon_selection', 'pricing_summary',
            'contact_info', 'payment_info', 'confirmation'
        ]

        for i, step_type in enumerate(valid_types):
            step = BookingFlowStep.objects.create(
                booking_flow=self.booking_flow,
                step_type=step_type,
                order=i + 1
            )
            self.assertEqual(step.step_type, step_type)

    def test_unique_step_type_per_flow(self):
        """Test that step type is unique per booking flow"""
        BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            order=1
        )

        # Creating another introduction step in the same flow should fail
        with self.assertRaises(Exception):
            BookingFlowStep.objects.create(
                booking_flow=self.booking_flow,
                step_type='introduction',
                order=2
            )

    def test_unique_order_per_flow(self):
        """Test that order is unique per booking flow"""
        BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            order=1
        )

        # Creating another step with the same order should fail
        with self.assertRaises(Exception):
            BookingFlowStep.objects.create(
                booking_flow=self.booking_flow,
                step_type='contact_info',
                order=1
            )

    def test_is_visible_for_data_no_conditions(self):
        """Test is_visible_for_data with no display conditions"""
        step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            order=1,
            display_conditions={}
        )

        self.assertTrue(step.is_visible_for_data({}))
        self.assertTrue(step.is_visible_for_data({'any': 'data'}))

    def test_is_visible_for_data_with_matching_conditions(self):
        """Test is_visible_for_data with matching conditions"""
        step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='questionnaire',
            order=1,
            display_conditions={'event_type': 'wedding'}
        )

        self.assertTrue(step.is_visible_for_data({'event_type': 'wedding'}))
        self.assertFalse(step.is_visible_for_data({'event_type': 'corporate'}))

    def test_is_visible_for_data_with_multiple_conditions(self):
        """Test is_visible_for_data with multiple conditions"""
        step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='addon_selection',
            order=1,
            display_conditions={'event_type': 'wedding', 'has_package': True}
        )

        # All conditions must match
        self.assertTrue(step.is_visible_for_data({
            'event_type': 'wedding',
            'has_package': True
        }))
        self.assertFalse(step.is_visible_for_data({
            'event_type': 'wedding',
            'has_package': False
        }))

    def test_default_json_fields(self):
        """Test default values for JSON fields"""
        step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            order=1
        )

        self.assertEqual(step.display_conditions, {})
        self.assertEqual(step.configuration, {})
        self.assertEqual(step.validation_rules, {})


class BookingSessionModelTestCase(TestCase):
    """Test cases for BookingSession model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.user = User.objects.create_user(
            email='test@test.com',
            first_name='Test',
            last_name='User',
            role='CLIENT'
        )
        self.session_id = uuid.uuid4()

    def test_session_creation(self):
        """Test creating a booking session"""
        session = BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            client=self.user,
            booking_data={'step_1': {'field': 'value'}},
            expires_at=timezone.now() + timedelta(hours=24)
        )

        self.assertEqual(session.session_id, self.session_id)
        self.assertEqual(session.booking_flow, self.booking_flow)
        self.assertEqual(session.client, self.user)
        self.assertFalse(session.is_completed)
        self.assertFalse(session.is_abandoned)

    def test_session_str(self):
        """Test string representation of session"""
        session = BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        self.assertEqual(str(session), f'Session {self.session_id} - Test Flow')

    def test_progress_percentage_no_steps(self):
        """Test progress percentage when no steps exist"""
        session = BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        self.assertEqual(session.progress_percentage, 0)

    def test_progress_percentage_with_steps(self):
        """Test progress percentage calculation"""
        step1 = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            order=1,
            is_enabled=True
        )
        step2 = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='contact_info',
            order=2,
            is_enabled=True
        )
        step3 = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='confirmation',
            order=3,
            is_enabled=True
        )

        session = BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        self.assertEqual(session.progress_percentage, 0)

        session.completed_steps.add(step1)
        self.assertAlmostEqual(session.progress_percentage, 33.33, places=1)

        session.completed_steps.add(step2)
        self.assertAlmostEqual(session.progress_percentage, 66.67, places=1)

        session.completed_steps.add(step3)
        self.assertEqual(session.progress_percentage, 100)

    def test_is_expired(self):
        """Test is_expired method"""
        # Not expired
        session = BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            expires_at=timezone.now() + timedelta(hours=24)
        )
        self.assertFalse(session.is_expired())

        # Expired
        session.expires_at = timezone.now() - timedelta(hours=1)
        session.save()
        self.assertTrue(session.is_expired())

    def test_mark_step_completed(self):
        """Test mark_step_completed method"""
        step1 = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            order=1,
            is_enabled=True
        )
        step2 = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='confirmation',
            order=2,
            is_enabled=True
        )

        session = BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            current_step=step1,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        session.mark_step_completed(step1)

        self.assertIn(step1, session.completed_steps.all())
        self.assertEqual(session.current_step, step2)
        self.assertFalse(session.is_completed)

    def test_mark_step_completed_last_step(self):
        """Test mark_step_completed on last step completes session"""
        step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='confirmation',
            order=1,
            is_enabled=True
        )

        session = BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            current_step=step,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        session.mark_step_completed(step)

        self.assertTrue(session.is_completed)
        self.assertIsNotNone(session.completed_at)

    def test_session_unique_session_id(self):
        """Test that session_id must be unique"""
        BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        with self.assertRaises(Exception):
            BookingSession.objects.create(
                session_id=self.session_id,
                booking_flow=self.booking_flow,
                expires_at=timezone.now() + timedelta(hours=24)
            )

    def test_guest_session(self):
        """Test session without a client (guest booking)"""
        session = BookingSession.objects.create(
            session_id=self.session_id,
            booking_flow=self.booking_flow,
            client=None,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        self.assertIsNone(session.client)


class IntroductionStepConfigurationTestCase(TestCase):
    """Test cases for IntroductionStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='introduction',
            order=1
        )

    def test_intro_config_creation(self):
        """Test creating introduction step configuration"""
        config = IntroductionStepConfiguration.objects.create(
            step=self.step,
            title='Welcome!',
            content='Welcome to our booking system.',
            show_event_details=True,
            show_pricing_overview=False
        )

        self.assertEqual(config.step, self.step)
        self.assertEqual(config.title, 'Welcome!')
        self.assertEqual(config.content, 'Welcome to our booking system.')
        self.assertTrue(config.show_event_details)
        self.assertFalse(config.show_pricing_overview)

    def test_intro_config_str(self):
        """Test string representation"""
        config = IntroductionStepConfiguration.objects.create(
            step=self.step,
            title='Test',
            content='Test content'
        )

        self.assertEqual(str(config), f'Intro config for {self.step}')


class VenueSelectionStepConfigurationTestCase(TestCase):
    """Test cases for VenueSelectionStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='venue_selection',
            order=1
        )

    def test_venue_config_creation(self):
        """Test creating venue selection step configuration"""
        config = VenueSelectionStepConfiguration.objects.create(
            step=self.step,
            min_venues=1,
            max_venues=3,
            show_pricing=True,
            bundle_discount_percent=Decimal('15.00')
        )

        self.assertEqual(config.step, self.step)
        self.assertEqual(config.min_venues, 1)
        self.assertEqual(config.max_venues, 3)
        self.assertTrue(config.show_pricing)
        self.assertEqual(config.bundle_discount_percent, Decimal('15.00'))

    def test_venue_config_defaults(self):
        """Test default values"""
        config = VenueSelectionStepConfiguration.objects.create(
            step=self.step
        )

        self.assertEqual(config.min_venues, 1)
        self.assertEqual(config.max_venues, 5)
        self.assertTrue(config.show_pricing)
        self.assertTrue(config.show_included_hours)
        self.assertTrue(config.show_bundle_discount)
        self.assertEqual(config.bundle_discount_percent, Decimal('10.00'))


class DateTimeStepConfigurationTestCase(TestCase):
    """Test cases for DateTimeStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='date_time',
            order=1
        )

    def test_datetime_config_creation(self):
        """Test creating datetime step configuration"""
        config = DateTimeStepConfiguration.objects.create(
            step=self.step,
            allow_multi_day=True,
            min_event_days=1,
            max_event_days=5,
            blocked_dates=['2024-12-25', '2024-01-01']
        )

        self.assertEqual(config.step, self.step)
        self.assertTrue(config.allow_multi_day)
        self.assertEqual(config.min_event_days, 1)
        self.assertEqual(config.max_event_days, 5)
        self.assertEqual(config.blocked_dates, ['2024-12-25', '2024-01-01'])

    def test_datetime_config_defaults(self):
        """Test default values"""
        config = DateTimeStepConfiguration.objects.create(
            step=self.step
        )

        self.assertFalse(config.allow_multi_day)
        self.assertEqual(config.min_event_days, 1)
        self.assertEqual(config.max_event_days, 7)
        self.assertTrue(config.show_calendar_view)
        self.assertTrue(config.enable_real_time_availability)
        self.assertEqual(config.availability_display_mode, 'FULL')
        self.assertFalse(config.allow_overbooking)


class PackageSelectionStepConfigurationTestCase(TestCase):
    """Test cases for PackageSelectionStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='package_selection',
            order=1
        )

    def test_package_config_creation(self):
        """Test creating package selection step configuration"""
        config = PackageSelectionStepConfiguration.objects.create(
            step=self.step,
            selection_type='SINGLE',
            min_selection=1,
            max_selection=1,
            show_pricing=True
        )

        self.assertEqual(config.step, self.step)
        self.assertEqual(config.selection_type, 'SINGLE')
        self.assertEqual(config.min_selection, 1)
        self.assertEqual(config.max_selection, 1)
        self.assertTrue(config.show_pricing)

    def test_package_config_validation_min_max(self):
        """Test validation that max_selection >= min_selection"""
        config = PackageSelectionStepConfiguration(
            step=self.step,
            min_selection=5,
            max_selection=3
        )

        with self.assertRaises(ValidationError):
            config.full_clean()

    def test_package_config_multiple_selection(self):
        """Test multiple selection configuration"""
        config = PackageSelectionStepConfiguration.objects.create(
            step=self.step,
            selection_type='MULTIPLE',
            min_selection=1,
            max_selection=5
        )

        self.assertEqual(config.selection_type, 'MULTIPLE')
        self.assertEqual(config.max_selection, 5)


class AddonSelectionStepConfigurationTestCase(TestCase):
    """Test cases for AddonSelectionStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='addon_selection',
            order=1
        )

    def test_addon_config_creation(self):
        """Test creating addon selection step configuration"""
        config = AddonSelectionStepConfiguration.objects.create(
            step=self.step,
            min_selection=0,
            max_selection=10,
            group_by_category=True,
            show_recommendations=True
        )

        self.assertEqual(config.step, self.step)
        self.assertEqual(config.min_selection, 0)
        self.assertEqual(config.max_selection, 10)
        self.assertTrue(config.group_by_category)
        self.assertTrue(config.show_recommendations)

    def test_addon_config_validation_min_max(self):
        """Test validation that max_selection >= min_selection when max > 0"""
        config = AddonSelectionStepConfiguration(
            step=self.step,
            min_selection=5,
            max_selection=3
        )

        with self.assertRaises(ValidationError):
            config.full_clean()

    def test_addon_config_unlimited_max(self):
        """Test that max_selection=0 means unlimited"""
        config = AddonSelectionStepConfiguration.objects.create(
            step=self.step,
            min_selection=0,
            max_selection=0
        )

        self.assertEqual(config.max_selection, 0)  # 0 means unlimited


class PricingSummaryStepConfigurationTestCase(TestCase):
    """Test cases for PricingSummaryStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='pricing_summary',
            order=1
        )

    def test_pricing_config_creation(self):
        """Test creating pricing summary step configuration"""
        config = PricingSummaryStepConfiguration.objects.create(
            step=self.step,
            show_package_breakdown=True,
            show_addon_breakdown=True,
            show_tax_breakdown=True,
            allow_discount_codes=True,
            header_text='Review Your Order'
        )

        self.assertEqual(config.step, self.step)
        self.assertTrue(config.show_package_breakdown)
        self.assertTrue(config.show_addon_breakdown)
        self.assertTrue(config.show_tax_breakdown)
        self.assertTrue(config.allow_discount_codes)
        self.assertEqual(config.header_text, 'Review Your Order')

    def test_pricing_config_terms_settings(self):
        """Test terms and legal configuration"""
        config = PricingSummaryStepConfiguration.objects.create(
            step=self.step,
            show_terms_checkbox=True,
            require_terms_acceptance=True,
            terms_url='https://example.com/terms',
            privacy_url='https://example.com/privacy'
        )

        self.assertTrue(config.show_terms_checkbox)
        self.assertTrue(config.require_terms_acceptance)
        self.assertEqual(config.terms_url, 'https://example.com/terms')
        self.assertEqual(config.privacy_url, 'https://example.com/privacy')


class ContactInfoStepConfigurationTestCase(TestCase):
    """Test cases for ContactInfoStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='contact_info',
            order=1
        )

    def test_contact_config_creation(self):
        """Test creating contact info step configuration"""
        config = ContactInfoStepConfiguration.objects.create(
            step=self.step,
            require_full_name=True,
            require_email=True,
            require_phone=True,
            require_address=False
        )

        self.assertEqual(config.step, self.step)
        self.assertTrue(config.require_full_name)
        self.assertTrue(config.require_email)
        self.assertTrue(config.require_phone)
        self.assertFalse(config.require_address)

    def test_contact_config_defaults(self):
        """Test default values"""
        config = ContactInfoStepConfiguration.objects.create(
            step=self.step
        )

        self.assertTrue(config.require_full_name)
        self.assertTrue(config.require_email)
        self.assertTrue(config.require_phone)
        self.assertFalse(config.require_address)
        self.assertFalse(config.require_company)
        self.assertTrue(config.offer_account_creation)
        self.assertFalse(config.require_account_creation)


class PaymentInfoStepConfigurationTestCase(TestCase):
    """Test cases for PaymentInfoStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='payment_info',
            order=1
        )

    def test_payment_config_creation(self):
        """Test creating payment info step configuration"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.step,
            accept_full_payment=True,
            accept_deposit=True,
            allow_quote_request=True,
            require_immediate_payment=False
        )

        self.assertEqual(config.step, self.step)
        self.assertTrue(config.accept_full_payment)
        self.assertTrue(config.accept_deposit)
        self.assertTrue(config.allow_quote_request)
        self.assertFalse(config.require_immediate_payment)

    def test_payment_config_quote_request_settings(self):
        """Test quote request configuration"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.step,
            allow_quote_request=True,
            quote_request_button_text='Get a Quote',
            quote_request_description='Receive a customized quote'
        )

        self.assertTrue(config.allow_quote_request)
        self.assertEqual(config.quote_request_button_text, 'Get a Quote')
        self.assertEqual(config.quote_request_description, 'Receive a customized quote')

    def test_payment_config_defaults(self):
        """Test default values"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.step
        )

        self.assertTrue(config.accept_full_payment)
        self.assertTrue(config.accept_deposit)
        self.assertTrue(config.allow_quote_request)
        self.assertFalse(config.require_immediate_payment)
        self.assertEqual(config.quote_request_button_text, 'Request Quote')


class ConfirmationStepConfigurationTestCase(TestCase):
    """Test cases for ConfirmationStepConfiguration model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )
        self.step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='confirmation',
            order=1
        )

    def test_confirmation_config_creation(self):
        """Test creating confirmation step configuration"""
        config = ConfirmationStepConfiguration.objects.create(
            step=self.step,
            title='Booking Confirmed!',
            message='Thank you for your booking.',
            show_booking_summary=True,
            send_confirmation_email=True
        )

        self.assertEqual(config.step, self.step)
        self.assertEqual(config.title, 'Booking Confirmed!')
        self.assertEqual(config.message, 'Thank you for your booking.')
        self.assertTrue(config.show_booking_summary)
        self.assertTrue(config.send_confirmation_email)

    def test_confirmation_config_defaults(self):
        """Test default values"""
        config = ConfirmationStepConfiguration.objects.create(
            step=self.step,
            message='Thank you!'
        )

        self.assertEqual(config.title, 'Booking Confirmed!')
        self.assertTrue(config.show_booking_summary)
        self.assertTrue(config.show_next_steps)
        self.assertTrue(config.send_confirmation_email)
        self.assertFalse(config.send_calendar_invite)
        self.assertTrue(config.create_event_immediately)


class BookingFlowAnalyticsModelTestCase(TestCase):
    """Test cases for BookingFlowAnalytics model"""

    def setUp(self):
        """Set up test data"""
        self.booking_flow = BookingFlow.objects.create(
            name='Test Flow',
            is_active=True
        )

    def test_analytics_creation(self):
        """Test creating analytics record"""
        analytics = BookingFlowAnalytics.objects.create(
            booking_flow=self.booking_flow,
            date=timezone.now().date(),
            total_sessions=100,
            completed_bookings=25,
            abandoned_sessions=75,
            conversion_rate=Decimal('25.00')
        )

        self.assertEqual(analytics.booking_flow, self.booking_flow)
        self.assertEqual(analytics.total_sessions, 100)
        self.assertEqual(analytics.completed_bookings, 25)
        self.assertEqual(analytics.abandoned_sessions, 75)
        self.assertEqual(analytics.conversion_rate, Decimal('25.00'))

    def test_analytics_str(self):
        """Test string representation"""
        today = timezone.now().date()
        analytics = BookingFlowAnalytics.objects.create(
            booking_flow=self.booking_flow,
            date=today
        )

        self.assertEqual(str(analytics), f'Analytics for Test Flow on {today}')

    def test_analytics_unique_per_day(self):
        """Test that only one analytics record per flow per day"""
        today = timezone.now().date()

        BookingFlowAnalytics.objects.create(
            booking_flow=self.booking_flow,
            date=today
        )

        with self.assertRaises(Exception):
            BookingFlowAnalytics.objects.create(
                booking_flow=self.booking_flow,
                date=today
            )

    def test_analytics_defaults(self):
        """Test default values"""
        analytics = BookingFlowAnalytics.objects.create(
            booking_flow=self.booking_flow,
            date=timezone.now().date()
        )

        self.assertEqual(analytics.total_sessions, 0)
        self.assertEqual(analytics.completed_bookings, 0)
        self.assertEqual(analytics.abandoned_sessions, 0)
        self.assertEqual(analytics.conversion_rate, Decimal('0.00'))
        self.assertEqual(analytics.total_revenue, Decimal('0.00'))
        self.assertEqual(analytics.average_booking_value, Decimal('0.00'))
        self.assertEqual(analytics.bounce_rate, Decimal('0.00'))
        self.assertEqual(analytics.step_completion_data, {})
        self.assertEqual(analytics.step_drop_off_data, {})
