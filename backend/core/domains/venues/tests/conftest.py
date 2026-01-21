"""
Pytest configuration and fixtures for venues domain tests.

This file registers venue-related factories with pytest-factoryboy,
making them available as fixtures throughout the venue test suite.
"""

import pytest
from pytest_factoryboy import register

# Import factories
from core.factories.venues import (
    VenueFactory,
    VenueOperatingRulesFactory,
    PackageVenueFactory,
    VenueEventTypeConfigurationFactory,
    VenueBlockedDateFactory,
)
from core.factories.products import ProductOptionFactory, ProductCategoryFactory
from core.factories.events import EventTypeFactory
from core.factories.users import UserFactory


# =============================================================================
# REGISTER FACTORIES AS FIXTURES
# =============================================================================
# This makes factories available as fixtures:
# - venue_factory, venue
# - venue_operating_rules_factory, venue_operating_rules
# - etc.

# Venues domain
register(VenueFactory)
register(VenueOperatingRulesFactory)
register(PackageVenueFactory)
register(VenueEventTypeConfigurationFactory)
register(VenueBlockedDateFactory)

# Products domain (needed for PackageVenue)
register(ProductOptionFactory)
register(ProductCategoryFactory)

# Events domain (needed for VenueEventTypeConfiguration)
register(EventTypeFactory)

# Users domain (needed for blocked dates)
register(UserFactory)


# =============================================================================
# CONVENIENCE FIXTURES
# =============================================================================

@pytest.fixture
def venue_with_rules(venue_factory, venue_operating_rules_factory):
    """Create a venue with operating rules configured."""
    venue = venue_factory()
    venue_operating_rules_factory(venue=venue)
    return venue


@pytest.fixture
def overnight_venue(venue_factory, venue_operating_rules_factory):
    """Create an overnight venue with appropriate rules."""
    from datetime import time
    venue = venue_factory(is_overnight=True)
    venue_operating_rules_factory(
        venue=venue,
        checkout_next_day=True,
        default_check_in_time=time(14, 0),
        default_checkout_time=time(12, 0)
    )
    return venue


@pytest.fixture
def rentable_venue(venue_factory, venue_operating_rules_factory):
    """Create a venue configured for standalone rental."""
    from decimal import Decimal
    venue = venue_factory(
        is_rentable_standalone=True,
        standalone_base_price=Decimal('5000.00'),
        standalone_included_hours=Decimal('3.0'),
        standalone_excess_hour_price=Decimal('500.00')
    )
    venue_operating_rules_factory(venue=venue)
    return venue


@pytest.fixture
def package_with_venues(product_option_factory, venue_factory, venue_operating_rules_factory):
    """Create a package with multiple venues."""
    from core.domains.venues.models import PackageVenue

    package = product_option_factory(type='PACKAGE', name='Test Package')

    venue1 = venue_factory(name='Primary Venue')
    venue_operating_rules_factory(venue=venue1)
    venue2 = venue_factory(name='Secondary Venue')

    pv1 = PackageVenue.objects.create(
        package=package,
        venue=venue1,
        is_primary=True,
        access_order=1
    )
    pv2 = PackageVenue.objects.create(
        package=package,
        venue=venue2,
        is_primary=False,
        access_order=2
    )

    return {
        'package': package,
        'primary_venue': venue1,
        'secondary_venue': venue2,
        'package_venues': [pv1, pv2]
    }
