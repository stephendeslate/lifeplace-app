"""
Factories for the venues domain.

Based on actual models in core/domains/venues/models.py:
- Venue (venue types)
- VenueOperatingRules (check-in/out, duration limits)
- PackageVenue (junction table for packages)
- VenueEventTypeConfiguration (event-type-specific configs)
- VenueBlockedDate (blocked dates)
"""

import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from datetime import time, timedelta
from decimal import Decimal


class VenueFactory(DjangoModelFactory):
    """
    Factory for creating Venue instances.

    Venue represents a venue type at the facility.
    """

    class Meta:
        model = 'venues.Venue'
        django_get_or_create = ('code',)

    name = factory.Sequence(lambda n: f'Venue {n}')
    code = factory.Sequence(lambda n: f'VENUE_{n}')
    description = factory.Faker('paragraph')
    is_overnight = False
    minimum_capacity = 1
    maximum_capacity = 50
    recommended_capacity = 30
    is_active = True
    is_bookable = True
    is_featured = False
    location_description = factory.Faker('sentence')
    featured_image = None
    gallery_images = factory.LazyFunction(list)
    amenities = factory.LazyFunction(lambda: ['WiFi', 'Parking', 'Sound System'])
    sort_order = factory.Sequence(lambda n: n)
    is_rentable_standalone = False
    standalone_base_price = None
    standalone_included_hours = None
    standalone_excess_hour_price = None

    class Params:
        """Traits for venue configurations."""

        inactive = factory.Trait(
            is_active=False
        )

        not_bookable = factory.Trait(
            is_bookable=False
        )

        featured = factory.Trait(
            is_featured=True
        )

        overnight = factory.Trait(
            is_overnight=True,
            name=factory.Sequence(lambda n: f'Overnight Venue {n}')
        )

        standalone_rentable = factory.Trait(
            is_rentable_standalone=True,
            standalone_base_price=Decimal('5000.00'),
            standalone_included_hours=Decimal('3.0'),
            standalone_excess_hour_price=Decimal('500.00')
        )

        cabana = factory.Trait(
            name='Cabana',
            code='CABANA',
            is_overnight=True,
            minimum_capacity=2,
            maximum_capacity=8,
            recommended_capacity=4,
            amenities=['Pool', 'AC', 'Kitchen', 'WiFi']
        )

        open_field = factory.Trait(
            name='Open Field',
            code='OPEN_FIELD',
            is_overnight=False,
            minimum_capacity=50,
            maximum_capacity=500,
            recommended_capacity=200,
            amenities=['Stage', 'Parking', 'Restrooms']
        )


class VenueOperatingRulesFactory(DjangoModelFactory):
    """
    Factory for creating VenueOperatingRules instances.

    Operating rules define check-in/out times, duration limits, etc.
    """

    class Meta:
        model = 'venues.VenueOperatingRules'

    venue = factory.SubFactory(VenueFactory)
    default_check_in_time = time(14, 0)
    default_checkout_time = time(12, 0)
    checkout_next_day = False
    minimum_program_hours = Decimal('1.0')
    maximum_program_hours = Decimal('8.0')
    default_program_hours = Decimal('3.0')
    is_fixed_duration = False
    ingress_hours = Decimal('0.0')
    egress_hours = Decimal('0.0')
    allow_custom_ingress = False
    allow_custom_egress = False
    min_ingress_hours = Decimal('0.0')
    max_ingress_hours = Decimal('6.0')
    min_egress_hours = Decimal('0.0')
    max_egress_hours = Decimal('2.0')
    earliest_start_time = None
    latest_end_time = time(21, 0)
    hard_cutoff_time = time(2, 0)
    hard_cutoff_next_day = True
    early_access_minutes = 60
    early_checkin_allowed = False
    early_checkin_fee_per_hour = None
    earliest_checkin_time = None
    late_checkout_allowed = True
    late_checkout_fee_per_hour = Decimal('300.00')
    late_checkout_max_hours = 4
    latest_checkout_time = time(16, 0)
    custom_rules = factory.LazyFunction(dict)

    class Params:
        """Traits for operating rule configurations."""

        overnight = factory.Trait(
            checkout_next_day=True,
            default_check_in_time=time(14, 0),
            default_checkout_time=time(12, 0)
        )

        daytime = factory.Trait(
            checkout_next_day=False,
            default_check_in_time=time(8, 0),
            default_checkout_time=time(17, 0)
        )

        fixed_duration = factory.Trait(
            is_fixed_duration=True,
            minimum_program_hours=Decimal('3.0'),
            maximum_program_hours=Decimal('3.0'),
            default_program_hours=Decimal('3.0')
        )

        with_ingress_egress = factory.Trait(
            ingress_hours=Decimal('5.0'),
            egress_hours=Decimal('2.0'),
            allow_custom_ingress=True,
            allow_custom_egress=True
        )

        early_checkin = factory.Trait(
            early_checkin_allowed=True,
            early_checkin_fee_per_hour=Decimal('300.00'),
            earliest_checkin_time=time(10, 0)
        )


class PackageVenueFactory(DjangoModelFactory):
    """
    Factory for creating PackageVenue instances.

    Junction table linking packages to venues.
    """

    class Meta:
        model = 'venues.PackageVenue'

    package = factory.SubFactory(
        'core.factories.products.ProductOptionFactory',
        package=True
    )
    venue = factory.SubFactory(VenueFactory)
    is_primary = False
    access_order = 1
    access_duration_hours = None
    notes = ''
    is_bonus = False
    hours_contribution = None
    price_contribution = None

    class Params:
        """Traits for package venue configurations."""

        primary = factory.Trait(
            is_primary=True
        )

        bonus = factory.Trait(
            is_bonus=True
        )

        with_contributions = factory.Trait(
            hours_contribution=Decimal('3.0'),
            price_contribution=Decimal('5000.00')
        )


class VenueEventTypeConfigurationFactory(DjangoModelFactory):
    """
    Factory for creating VenueEventTypeConfiguration instances.

    Event-type-specific venue configuration.
    """

    class Meta:
        model = 'venues.VenueEventTypeConfiguration'

    venue = factory.SubFactory(VenueFactory)
    event_type = factory.SubFactory('core.factories.events.EventTypeFactory')
    base_price = None
    included_hours = None
    excess_hour_price = None
    is_all_day_access = False
    default_check_in_time = None
    default_checkout_time = None
    checkout_next_day = None
    maximum_program_hours = None
    is_fixed_duration = None
    notes = ''

    class Params:
        """Traits for event type configurations."""

        all_day = factory.Trait(
            is_all_day_access=True
        )

        with_pricing = factory.Trait(
            base_price=Decimal('8000.00'),
            included_hours=Decimal('4.0'),
            excess_hour_price=Decimal('600.00')
        )

        overnight_override = factory.Trait(
            checkout_next_day=True,
            default_check_in_time=time(14, 0),
            default_checkout_time=time(12, 0)
        )


class VenueBlockedDateFactory(DjangoModelFactory):
    """
    Factory for creating VenueBlockedDate instances.

    Dates when a specific venue is blocked.
    """

    class Meta:
        model = 'venues.VenueBlockedDate'

    venue = factory.SubFactory(VenueFactory)
    reason = factory.Faker('sentence')
    is_full_day = True
    blocked_start_time = None
    blocked_end_time = None
    created_by = factory.SubFactory('core.factories.users.UserFactory', admin=True)

    @factory.lazy_attribute
    def date(self):
        """Default blocked date is 7 days from now."""
        return (timezone.now() + timedelta(days=7)).date()

    class Params:
        """Traits for blocked date configurations."""

        maintenance = factory.Trait(
            reason='Scheduled maintenance'
        )

        private_event = factory.Trait(
            reason='Private event'
        )

        partial_day = factory.Trait(
            is_full_day=False,
            blocked_start_time=time(14, 0),
            blocked_end_time=time(18, 0)
        )

        past = factory.Trait(
            date=factory.LazyFunction(
                lambda: (timezone.now() - timedelta(days=7)).date()
            )
        )
