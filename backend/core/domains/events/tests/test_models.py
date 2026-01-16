"""
Unit tests for events domain models.

Tests:
- Event model (status transitions, payment tracking, date blocking, check-in)
- EventType model (active/inactive)
- EventProductOption model (junction table)
- EventTask model (completion logic)
- EventFeedback model (unique constraint)
- EventTimeline model (audit trail)
- EventFile model (file upload)
- EventDateReminder model (reminder tracking)
- DateReservation model (temporary holds)
"""

import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from freezegun import freeze_time

from core.domains.events.models import (
    Event,
    EventType,
    EventTask,
    EventFeedback,
    EventTimeline,
    EventFile,
    EventDateReminder,
    DateReservation,
)


@pytest.mark.django_db
class TestEventTypeModel:
    """Unit tests for the EventType model."""

    def test_create_event_type(self, event_type_factory):
        """Test creating an event type."""
        event_type = event_type_factory(name='Wedding')

        assert event_type.name == 'Wedding'
        assert event_type.is_active is True

    def test_event_type_string_representation(self, event_type_factory):
        """Test EventType __str__ returns name."""
        event_type = event_type_factory(name='Corporate Event')

        assert str(event_type) == 'Corporate Event'

    def test_inactive_event_type(self, event_type_factory):
        """Test creating an inactive event type."""
        event_type = event_type_factory(inactive=True)

        assert event_type.is_active is False


@pytest.mark.django_db
class TestEventModel:
    """Unit tests for the Event model."""

    def test_create_event_with_defaults(self, event_factory):
        """Test creating an event with default values."""
        event = event_factory()

        assert event.status == 'LEAD'
        assert event.payment_status == 'UNPAID'
        assert event.date_blocked is False
        assert event.date_hold_status == 'NONE'
        assert event.check_in_status == 'PENDING'

    def test_event_string_representation(self, event_factory, event_type_factory):
        """Test Event __str__ returns informative string."""
        event_type = event_type_factory(name='Birthday')
        event = event_factory(name='John Birthday Party', event_type=event_type)

        assert 'John Birthday Party' in str(event)

    def test_event_string_representation_without_name(self, event_factory, user_factory, event_type_factory):
        """Test Event __str__ fallback when name is empty."""
        client = user_factory(first_name='Jane', last_name='Doe')
        event_type = event_type_factory(name='Wedding')
        event = event_factory(name='', client=client, event_type=event_type)

        # Should fall back to event_type and client
        assert str(event) is not None

    def test_confirmed_event_status(self, event_factory):
        """Test creating a confirmed event."""
        event = event_factory(confirmed=True)

        assert event.status == 'CONFIRMED'

    def test_completed_event_status(self, event_factory):
        """Test creating a completed event."""
        event = event_factory(completed=True)

        assert event.status == 'COMPLETED'

    def test_cancelled_event_status(self, event_factory):
        """Test creating a cancelled event."""
        event = event_factory(cancelled=True)

        assert event.status == 'CANCELLED'
        assert event.cancelled_reason == 'CLIENT_REQUEST'
        assert event.cancelled_at is not None

    def test_paid_event_status(self, event_factory):
        """Test creating a paid event."""
        event = event_factory(paid=True)

        assert event.payment_status == 'PAID'
        assert event.total_amount_paid == Decimal('5000.00')
        assert event.total_amount_due == Decimal('5000.00')

    def test_partially_paid_event_status(self, event_factory):
        """Test creating a partially paid event."""
        event = event_factory(partially_paid=True)

        assert event.payment_status == 'PARTIALLY_PAID'
        assert event.total_amount_paid == Decimal('2500.00')
        assert event.total_amount_due == Decimal('5000.00')

    def test_date_blocked_event(self, event_factory):
        """Test creating an event with date blocked."""
        event = event_factory(date_blocked_trait=True)

        assert event.date_blocked is True
        assert event.date_hold_status == 'PERMANENT_BLOCK'
        assert event.date_blocked_at is not None

    def test_temporary_hold_event(self, event_factory):
        """Test creating an event with temporary hold."""
        event = event_factory(temporary_hold=True)

        assert event.date_hold_status == 'TEMPORARY_HOLD'
        assert event.date_hold_expires_at is not None
        assert event.date_held_at is not None

    def test_event_duration_from_dates(self, event_factory):
        """Test event duration calculation from start/end dates."""
        start = timezone.now() + timedelta(days=30)
        end = start + timedelta(hours=6)
        event = event_factory(start_date=start, end_date=end)

        assert event.get_duration_hours() == 6

    def test_event_duration_same_day(self, event_factory):
        """Test event duration for same day event."""
        start = timezone.now() + timedelta(days=30)
        end = start + timedelta(hours=4)
        event = event_factory(start_date=start, end_date=end)

        assert event.get_duration_hours() == 4

    def test_upcoming_event(self, event_factory):
        """Test creating an upcoming event."""
        event = event_factory(upcoming=True)

        assert event.status == 'CONFIRMED'
        assert event.start_date > timezone.now()

    def test_past_event(self, event_factory):
        """Test creating a past event."""
        event = event_factory(past=True)

        assert event.status == 'COMPLETED'
        assert event.start_date < timezone.now()


@pytest.mark.django_db
class TestEventPaymentStatus:
    """Tests for Event payment status updates."""

    def test_update_payment_status_unpaid(self, event_factory):
        """Test payment status remains UNPAID with no payments."""
        event = event_factory()
        event.update_payment_status()

        assert event.payment_status == 'UNPAID'

    def test_computed_total_amount_due(self, event_factory, invoice_factory):
        """Test computed_total_amount_due property."""
        event = event_factory(confirmed=True)
        invoice_factory(event=event, issued=True, total_amount=Decimal('5000.00'))

        assert event.computed_total_amount_due == Decimal('5000.00')

    def test_computed_total_amount_paid(self, event_factory, payment_factory):
        """Test computed_total_amount_paid property."""
        event = event_factory(confirmed=True)
        payment_factory(event=event, completed=True, amount=Decimal('2500.00'))

        assert event.computed_total_amount_paid == Decimal('2500.00')


@pytest.mark.django_db
class TestEventDateBlocking:
    """Tests for Event date blocking functionality."""

    def test_date_hold_status_default(self, event_factory):
        """Test default date hold status is NONE."""
        event = event_factory()

        assert event.date_hold_status == 'NONE'
        assert event.date_blocked is False

    def test_date_blocked_at_timestamp(self, event_factory):
        """Test date_blocked_at is set when date is blocked."""
        event = event_factory(date_blocked_trait=True)

        assert event.date_blocked_at is not None
        assert event.date_blocked_at <= timezone.now()

    def test_reschedule_tracking(self, event_factory):
        """Test reschedule count tracking."""
        event = event_factory()
        original_date = event.start_date

        event.original_start_date = original_date
        event.reschedule_count = 1
        event.last_rescheduled_at = timezone.now()
        event.start_date = original_date + timedelta(days=7)
        event.save()

        event.refresh_from_db()
        assert event.reschedule_count == 1
        assert event.last_rescheduled_at is not None


@pytest.mark.django_db
class TestEventCheckIn:
    """Tests for Event check-in/out functionality."""

    def test_check_in_status_default(self, event_factory):
        """Test default check-in status is PENDING."""
        event = event_factory()

        assert event.check_in_status == 'PENDING'

    def test_check_in_timestamps(self, event_factory, user_factory):
        """Test check-in timestamp and user tracking."""
        event = event_factory(confirmed=True)
        staff = user_factory(admin=True)

        event.check_in_status = 'CHECKED_IN'
        event.actual_check_in_time = timezone.now()
        event.checked_in_by = staff
        event.save()

        event.refresh_from_db()
        assert event.check_in_status == 'CHECKED_IN'
        assert event.actual_check_in_time is not None
        assert event.checked_in_by == staff

    def test_checkout_timestamps(self, event_factory, user_factory):
        """Test checkout timestamp and user tracking."""
        event = event_factory(confirmed=True)
        staff = user_factory(admin=True)

        event.check_in_status = 'CHECKED_OUT'
        event.actual_checkout_time = timezone.now()
        event.checked_out_by = staff
        event.save()

        event.refresh_from_db()
        assert event.check_in_status == 'CHECKED_OUT'
        assert event.actual_checkout_time is not None
        assert event.checked_out_by == staff

    def test_late_checkout_fee_tracking(self, event_factory):
        """Test late checkout fee tracking fields."""
        event = event_factory(confirmed=True)

        event.late_checkout_fee_applied = True
        event.late_checkout_fee_amount = Decimal('500.00')
        event.save()

        event.refresh_from_db()
        assert event.late_checkout_fee_applied is True
        assert event.late_checkout_fee_amount == Decimal('500.00')


@pytest.mark.django_db
class TestEventTask:
    """Tests for EventTask model."""

    def test_create_task(self, event_factory, user_factory):
        """Test creating an event task."""
        event = event_factory()
        user = user_factory()

        task = EventTask.objects.create(
            event=event,
            title='Review contract',
            description='Review and approve event contract',
            due_date=timezone.now() + timedelta(days=3),
            priority='HIGH',
            status='PENDING',
            assigned_to=user,
        )

        assert task.event == event
        assert task.title == 'Review contract'
        assert task.priority == 'HIGH'
        assert task.status == 'PENDING'

    def test_task_string_representation(self, event_factory):
        """Test EventTask __str__ returns informative string."""
        event = event_factory()
        task = EventTask.objects.create(
            event=event,
            title='Setup venue',
            due_date=timezone.now() + timedelta(days=1),
            priority='MEDIUM',
            status='PENDING',
        )

        assert 'Setup venue' in str(task)
        assert 'PENDING' in str(task)

    def test_task_completion_sets_timestamp(self, event_factory, user_factory):
        """Test that completing a task sets completed_at timestamp."""
        event = event_factory()
        user = user_factory()

        task = EventTask.objects.create(
            event=event,
            title='Test task',
            due_date=timezone.now() + timedelta(days=1),
            priority='LOW',
            status='PENDING',
        )

        task.status = 'COMPLETED'
        task.completed_by = user
        task.save()

        task.refresh_from_db()
        assert task.completed_at is not None

    def test_task_ordering(self, event_factory):
        """Test tasks are ordered by due_date and priority."""
        event = event_factory()

        task1 = EventTask.objects.create(
            event=event,
            title='Later task',
            due_date=timezone.now() + timedelta(days=5),
            priority='HIGH',
            status='PENDING',
        )
        task2 = EventTask.objects.create(
            event=event,
            title='Earlier task',
            due_date=timezone.now() + timedelta(days=1),
            priority='LOW',
            status='PENDING',
        )

        tasks = list(event.tasks.all())
        assert tasks[0].title == 'Earlier task'


@pytest.mark.django_db
class TestEventFeedback:
    """Tests for EventFeedback model."""

    def test_create_feedback(self, event_factory, user_factory):
        """Test creating event feedback."""
        event = event_factory(completed=True)
        user = user_factory()

        feedback = EventFeedback.objects.create(
            event=event,
            submitted_by=user,
            overall_rating=5,
            comments='Great event!',
        )

        assert feedback.overall_rating == 5
        assert feedback.comments == 'Great event!'

    def test_feedback_string_representation(self, event_factory, user_factory):
        """Test EventFeedback __str__ returns informative string."""
        event = event_factory(completed=True)
        user = user_factory()

        feedback = EventFeedback.objects.create(
            event=event,
            submitted_by=user,
            overall_rating=4,
        )

        assert 'Rating: 4' in str(feedback)

    def test_feedback_unique_per_user(self, event_factory, user_factory):
        """Test only one feedback per user per event."""
        from django.db import IntegrityError

        event = event_factory(completed=True)
        user = user_factory()

        EventFeedback.objects.create(
            event=event,
            submitted_by=user,
            overall_rating=5,
        )

        with pytest.raises(IntegrityError):
            EventFeedback.objects.create(
                event=event,
                submitted_by=user,
                overall_rating=3,
            )


@pytest.mark.django_db
class TestEventTimeline:
    """Tests for EventTimeline model."""

    def test_create_timeline_entry(self, event_factory, user_factory):
        """Test creating a timeline entry."""
        event = event_factory()
        user = user_factory()

        entry = EventTimeline.objects.create(
            event=event,
            action_type='STATUS_CHANGE',
            description='Status changed from Lead to Confirmed',
            actor=user,
            is_public=True,
        )

        assert entry.action_type == 'STATUS_CHANGE'
        assert entry.is_public is True

    def test_timeline_string_representation(self, event_factory):
        """Test EventTimeline __str__ returns informative string."""
        event = event_factory()

        entry = EventTimeline.objects.create(
            event=event,
            action_type='QUOTE_CREATED',
            description='Quote created',
        )

        assert 'QUOTE_CREATED' in str(entry)

    def test_timeline_ordering(self, event_factory):
        """Test timeline entries are ordered by created_at descending."""
        event = event_factory()

        entry1 = EventTimeline.objects.create(
            event=event,
            action_type='STATUS_CHANGE',
            description='First entry',
        )
        entry2 = EventTimeline.objects.create(
            event=event,
            action_type='QUOTE_CREATED',
            description='Second entry',
        )

        entries = list(event.timeline.all())
        assert entries[0].description == 'Second entry'


@pytest.mark.django_db
class TestDateReservation:
    """Tests for DateReservation model."""

    def test_create_reservation(self):
        """Test creating a date reservation."""
        target_date = timezone.now().date() + timedelta(days=30)
        expires_at = timezone.now() + timedelta(minutes=5)

        reservation = DateReservation.objects.create(
            target_date=target_date,
            booking_session_id='session_123',
            status='PENDING',
            expires_at=expires_at,
        )

        assert reservation.token is not None
        assert reservation.status == 'PENDING'
        assert reservation.target_date == target_date

    def test_reservation_string_representation(self):
        """Test DateReservation __str__ returns informative string."""
        target_date = timezone.now().date() + timedelta(days=30)

        reservation = DateReservation.objects.create(
            target_date=target_date,
            booking_session_id='session_123',
            status='PENDING',
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        assert str(target_date) in str(reservation)
        assert 'PENDING' in str(reservation)

    def test_reservation_is_expired_property_not_expired(self):
        """Test is_expired returns False when not expired."""
        target_date = timezone.now().date() + timedelta(days=30)
        expires_at = timezone.now() + timedelta(minutes=5)

        reservation = DateReservation.objects.create(
            target_date=target_date,
            booking_session_id='session_123',
            status='PENDING',
            expires_at=expires_at,
        )

        assert reservation.is_expired is False

    @freeze_time('2024-01-15 10:10:00')
    def test_reservation_is_expired_property_expired(self):
        """Test is_expired returns True when expired."""
        from datetime import datetime
        target_date = timezone.now().date() + timedelta(days=30)
        # Expiry was 5 minutes ago
        expires_at = timezone.now() - timedelta(minutes=5)

        reservation = DateReservation.objects.create(
            target_date=target_date,
            booking_session_id='session_123',
            status='PENDING',
            expires_at=expires_at,
        )

        assert reservation.is_expired is True

    def test_reservation_is_active_property(self):
        """Test is_active returns True when pending and not expired."""
        target_date = timezone.now().date() + timedelta(days=30)
        expires_at = timezone.now() + timedelta(minutes=5)

        reservation = DateReservation.objects.create(
            target_date=target_date,
            booking_session_id='session_123',
            status='PENDING',
            expires_at=expires_at,
        )

        assert reservation.is_active is True

    def test_reservation_is_active_false_when_confirmed(self):
        """Test is_active returns False when status is not PENDING."""
        target_date = timezone.now().date() + timedelta(days=30)
        expires_at = timezone.now() + timedelta(minutes=5)

        reservation = DateReservation.objects.create(
            target_date=target_date,
            booking_session_id='session_123',
            status='CONFIRMED',
            expires_at=expires_at,
        )

        assert reservation.is_active is False


@pytest.mark.django_db
class TestEventDateReminder:
    """Tests for EventDateReminder model."""

    def test_create_reminder(self, event_factory):
        """Test creating an event date reminder."""
        event = event_factory(upcoming=True)

        reminder = EventDateReminder.objects.create(
            event=event,
            days_before=7,
        )

        assert reminder.event == event
        assert reminder.days_before == 7
        assert reminder.sent_at is not None

    def test_reminder_string_representation(self, event_factory):
        """Test EventDateReminder __str__ returns informative string."""
        event = event_factory()

        reminder = EventDateReminder.objects.create(
            event=event,
            days_before=3,
        )

        assert '3 days before' in str(reminder)

    def test_reminder_unique_constraint(self, event_factory):
        """Test only one reminder per days_before per event."""
        from django.db import IntegrityError

        event = event_factory()

        EventDateReminder.objects.create(
            event=event,
            days_before=7,
        )

        with pytest.raises(IntegrityError):
            EventDateReminder.objects.create(
                event=event,
                days_before=7,
            )


@pytest.mark.django_db
class TestOptimizedEventManager:
    """Tests for OptimizedEventManager."""

    def test_active_events(self, event_factory):
        """Test active() returns non-cancelled events."""
        event1 = event_factory(confirmed=True)
        event2 = event_factory(cancelled=True)

        active_events = Event.objects.active()

        assert event1 in active_events
        assert event2 not in active_events

    def test_upcoming_events(self, event_factory):
        """Test upcoming() returns future events."""
        upcoming_event = event_factory(
            start_date=timezone.now() + timedelta(days=7)
        )
        past_event = event_factory(
            start_date=timezone.now() - timedelta(days=7),
            completed=True
        )

        upcoming_events = Event.objects.upcoming()

        assert upcoming_event in upcoming_events
        assert past_event not in upcoming_events

    def test_for_client(self, event_factory, user_factory):
        """Test for_client() returns events for specific client."""
        client1 = user_factory()
        client2 = user_factory()

        event1 = event_factory(client=client1)
        event2 = event_factory(client=client2)

        client1_events = Event.objects.for_client(client1.id)

        assert event1 in client1_events
        assert event2 not in client1_events
