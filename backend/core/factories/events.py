"""
Factories for the events domain.

Based on actual models in core/domains/events/models.py:
- EventType (simple name/description)
- Event (complex model with many status fields)
"""

import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


class EventTypeFactory(DjangoModelFactory):
    """
    Factory for creating EventType instances.

    EventType is a simple model for categorizing events.
    """

    class Meta:
        model = 'events.EventType'
        django_get_or_create = ('name',)

    name = factory.Sequence(lambda n: f'Event Type {n}')
    description = factory.Faker('sentence')
    is_active = True

    class Params:
        """Traits for common event types."""

        wedding = factory.Trait(
            name='Wedding',
            description='Wedding events and ceremonies'
        )

        corporate = factory.Trait(
            name='Corporate',
            description='Corporate events and meetings'
        )

        birthday = factory.Trait(
            name='Birthday',
            description='Birthday celebrations'
        )

        inactive = factory.Trait(
            is_active=False
        )


class EventFactory(DjangoModelFactory):
    """
    Factory for creating Event instances.

    Event is the core model with many status fields:
    - status: LEAD, CONFIRMED, COMPLETED, CANCELLED
    - payment_status: UNPAID, PARTIALLY_PAID, PAID
    - date_hold_status: NONE, TEMPORARY_HOLD, PERMANENT_BLOCK
    - check_in_status: PENDING, CHECKED_IN, CHECKED_OUT, NO_SHOW
    """

    class Meta:
        model = 'events.Event'

    client = factory.SubFactory('core.factories.users.UserFactory')
    event_type = factory.SubFactory(EventTypeFactory)
    name = factory.Faker('sentence', nb_words=3)
    status = 'LEAD'
    payment_status = 'UNPAID'

    @factory.lazy_attribute
    def start_date(self):
        """Default start date is 30 days from now."""
        return timezone.now() + timedelta(days=30)

    @factory.lazy_attribute
    def end_date(self):
        """Default end date is same as start date (single day event)."""
        return self.start_date + timedelta(hours=4)

    # Payment fields
    total_amount_due = None
    total_amount_paid = Decimal('0')

    # Date hold fields
    date_hold_status = 'NONE'
    date_blocked = False

    # Check-in fields
    check_in_status = 'PENDING'

    class Params:
        """Traits for common event configurations."""

        confirmed = factory.Trait(
            status='CONFIRMED'
        )

        completed = factory.Trait(
            status='COMPLETED',
            start_date=factory.LazyFunction(
                lambda: timezone.now() - timedelta(days=7)
            )
        )

        cancelled = factory.Trait(
            status='CANCELLED',
            cancelled_at=factory.LazyFunction(timezone.now),
            cancelled_reason='CLIENT_REQUEST'
        )

        paid = factory.Trait(
            payment_status='PAID',
            total_amount_paid=Decimal('5000.00'),
            total_amount_due=Decimal('5000.00')
        )

        partially_paid = factory.Trait(
            payment_status='PARTIALLY_PAID',
            total_amount_paid=Decimal('2500.00'),
            total_amount_due=Decimal('5000.00')
        )

        date_blocked_trait = factory.Trait(
            date_blocked=True,
            date_hold_status='PERMANENT_BLOCK',
            date_blocked_at=factory.LazyFunction(timezone.now)
        )

        temporary_hold = factory.Trait(
            date_hold_status='TEMPORARY_HOLD',
            date_hold_expires_at=factory.LazyFunction(
                lambda: timezone.now() + timedelta(days=7)
            ),
            date_held_at=factory.LazyFunction(timezone.now)
        )

        upcoming = factory.Trait(
            status='CONFIRMED',
            start_date=factory.LazyFunction(
                lambda: timezone.now() + timedelta(days=7)
            )
        )

        past = factory.Trait(
            status='COMPLETED',
            start_date=factory.LazyFunction(
                lambda: timezone.now() - timedelta(days=30)
            )
        )
