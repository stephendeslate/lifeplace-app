"""
Unit tests for venues domain API views.

Tests:
- VenueViewSet (Admin CRUD, custom actions)
- PackageVenueViewSet (Admin venue-package management)
- VenueBlockedDateViewSet (Admin blocked date management)
- PublicVenueViewSet (Public read-only access)

URL Structure:
- Admin endpoints: /api/venues/venues/, /api/venues/package-venues/, /api/venues/blocked-dates/
- Public endpoints: /api/venues/public/
"""

import pytest
import json
from decimal import Decimal
from datetime import date, time, timedelta
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from core.domains.venues.models import (
    Venue,
    VenueOperatingRules,
    PackageVenue,
    VenueBlockedDate,
    VenueEventTypeConfiguration,
)


# Base URL paths
VENUES_URL = '/api/venues/venues/'
PACKAGE_VENUES_URL = '/api/venues/package-venues/'
BLOCKED_DATES_URL = '/api/venues/blocked-dates/'
PUBLIC_VENUES_URL = '/api/venues/public/'


# =============================================================================
# VENUE VIEWSET TESTS (Admin)
# =============================================================================

@pytest.mark.django_db
class TestVenueViewSetList:
    """Tests for VenueViewSet list and retrieve operations."""

    def test_list_venues_requires_admin(self, api_client, venue_factory):
        """Test that listing venues requires admin authentication."""
        venue_factory()

        response = api_client.get(VENUES_URL)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_venues_as_admin(self, admin_client, venue_factory):
        """Test admin can list venues."""
        venue1 = venue_factory(name='Venue A')
        venue2 = venue_factory(name='Venue B')

        response = admin_client.get(VENUES_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_list_venues_filter_is_active(self, admin_client, venue_factory):
        """Test filtering venues by is_active."""
        active = venue_factory(is_active=True)
        inactive = venue_factory(is_active=False)

        response = admin_client.get(VENUES_URL, {'is_active': 'true'})

        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data['results']]
        assert active.id in venue_ids
        assert inactive.id not in venue_ids

    def test_list_venues_filter_is_bookable(self, admin_client, venue_factory):
        """Test filtering venues by is_bookable."""
        bookable = venue_factory(is_bookable=True)
        not_bookable = venue_factory(is_bookable=False)

        response = admin_client.get(VENUES_URL, {'is_bookable': 'true'})

        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data['results']]
        assert bookable.id in venue_ids
        assert not_bookable.id not in venue_ids

    def test_list_venues_filter_is_overnight(self, admin_client, venue_factory):
        """Test filtering venues by is_overnight."""
        overnight = venue_factory(is_overnight=True)
        day_venue = venue_factory(is_overnight=False)

        response = admin_client.get(VENUES_URL, {'is_overnight': 'true'})

        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data['results']]
        assert overnight.id in venue_ids
        assert day_venue.id not in venue_ids

    def test_list_venues_search(self, admin_client, venue_factory):
        """Test searching venues by name/code/description."""
        venue_factory(name='Wedding Garden', code='GARDEN')
        venue_factory(name='Event Hall', code='HALL')

        response = admin_client.get(VENUES_URL, {'search': 'garden'})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == 'Wedding Garden'

    def test_retrieve_venue(self, admin_client, venue_factory, venue_operating_rules_factory):
        """Test retrieving a single venue."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        response = admin_client.get(f'{VENUES_URL}{venue.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == venue.id
        assert response.data['name'] == venue.name

    def test_all_venues_action(self, admin_client, venue_factory):
        """Test getting all venues without pagination."""
        for i in range(60):  # More than page size
            venue_factory(name=f'Venue {i}')

        response = admin_client.get(f'{VENUES_URL}all/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 60  # All venues, not paginated

    def test_active_venues_action(self, admin_client, venue_factory):
        """Test getting only active and bookable venues."""
        active = venue_factory(is_active=True, is_bookable=True)
        inactive = venue_factory(is_active=False, is_bookable=True)

        response = admin_client.get(f'{VENUES_URL}active/')

        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data]
        assert active.id in venue_ids
        assert inactive.id not in venue_ids


@pytest.mark.django_db
class TestVenueViewSetCreate:
    """Tests for VenueViewSet create operations."""

    def test_create_venue_as_admin(self, admin_client):
        """Test admin can create a venue."""
        data = {
            'name': 'New Venue',
            'code': 'NEW_VENUE',
            'maximum_capacity': 100,
            'minimum_capacity': 10,
            'is_active': True,
            'is_bookable': True,
        }

        response = admin_client.post(VENUES_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Venue'
        assert response.data['code'] == 'NEW_VENUE'
        assert Venue.objects.filter(code='NEW_VENUE').exists()

    def test_create_venue_with_operating_rules(self, admin_client):
        """Test creating venue with nested operating rules."""
        data = {
            'name': 'Venue With Rules',
            'code': 'RULES_VENUE',
            'maximum_capacity': 50,
            'operating_rules': {
                'default_check_in_time': '14:00:00',
                'default_checkout_time': '12:00:00',
                'checkout_next_day': True,
                'minimum_program_hours': '2.0',
                'maximum_program_hours': '8.0',
            }
        }

        response = admin_client.post(VENUES_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        venue = Venue.objects.get(code='RULES_VENUE')
        assert hasattr(venue, 'venue_operating_rules')
        assert venue.venue_operating_rules.checkout_next_day is True

    def test_create_venue_non_admin_forbidden(self, client_user_client):
        """Test non-admin users cannot create venues."""
        data = {
            'name': 'New Venue',
            'code': 'NEW_VENUE',
            'maximum_capacity': 100,
        }

        response = client_user_client.post(VENUES_URL, data, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestVenueViewSetUpdate:
    """Tests for VenueViewSet update operations."""

    def test_update_venue(self, admin_client, venue_factory):
        """Test updating a venue."""
        venue = venue_factory(name='Old Name')

        data = {
            'name': 'Updated Name',
            'code': venue.code,
            'maximum_capacity': venue.maximum_capacity,
        }

        response = admin_client.put(f'{VENUES_URL}{venue.id}/', data, format='json')

        assert response.status_code == status.HTTP_200_OK
        venue.refresh_from_db()
        assert venue.name == 'Updated Name'

    def test_partial_update_venue(self, admin_client, venue_factory):
        """Test partial update (PATCH) of a venue."""
        venue = venue_factory(name='Original', is_featured=False)

        response = admin_client.patch(
            f'{VENUES_URL}{venue.id}/',
            {'is_featured': True},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        venue.refresh_from_db()
        assert venue.is_featured is True
        assert venue.name == 'Original'  # Unchanged

    def test_update_venue_with_rules(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test updating venue and operating rules together."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            default_check_in_time=time(14, 0)
        )

        data = {
            'name': venue.name,
            'code': venue.code,
            'maximum_capacity': venue.maximum_capacity,
            'operating_rules': {
                'default_check_in_time': '10:00:00',
                'default_checkout_time': '18:00:00',
            }
        }

        response = admin_client.patch(f'{VENUES_URL}{venue.id}/', data, format='json')

        assert response.status_code == status.HTTP_200_OK
        venue.refresh_from_db()
        assert venue.venue_operating_rules.default_check_in_time == time(10, 0)


@pytest.mark.django_db
class TestVenueViewSetDelete:
    """Tests for VenueViewSet delete operations."""

    def test_delete_venue(self, admin_client, venue_factory):
        """Test deleting a venue."""
        venue = venue_factory()
        venue_id = venue.id

        response = admin_client.delete(f'{VENUES_URL}{venue_id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Venue.objects.filter(id=venue_id).exists()


@pytest.mark.django_db
class TestVenueViewSetOperatingRulesAction:
    """Tests for VenueViewSet operating_rules action."""

    def test_get_operating_rules(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test getting operating rules for a venue."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(
            venue=venue,
            default_check_in_time=time(14, 0)
        )

        response = admin_client.get(f'{VENUES_URL}{venue.id}/operating_rules/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['default_check_in_time'] == '14:00:00'

    def test_get_operating_rules_not_configured(self, admin_client, venue_factory):
        """Test getting operating rules when not configured."""
        venue = venue_factory()

        response = admin_client.get(f'{VENUES_URL}{venue.id}/operating_rules/')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_operating_rules_put(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test updating operating rules via PUT."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        data = {
            'default_check_in_time': '10:00:00',
            'default_checkout_time': '16:00:00',
        }

        response = admin_client.put(
            f'{VENUES_URL}{venue.id}/operating_rules/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        venue.refresh_from_db()
        assert venue.venue_operating_rules.default_check_in_time == time(10, 0)

    def test_update_operating_rules_patch(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test partial update of operating rules via PATCH."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            default_check_in_time=time(14, 0),
            early_checkin_allowed=False
        )

        response = admin_client.patch(
            f'{VENUES_URL}{venue.id}/operating_rules/',
            {'early_checkin_allowed': True},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        venue.refresh_from_db()
        assert venue.venue_operating_rules.early_checkin_allowed is True

    def test_create_operating_rules(self, admin_client, venue_factory):
        """Test creating operating rules for venue without rules."""
        venue = venue_factory()

        data = {
            'default_check_in_time': '14:00:00',
            'default_checkout_time': '12:00:00',
        }

        response = admin_client.put(
            f'{VENUES_URL}{venue.id}/operating_rules/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        venue.refresh_from_db()
        assert hasattr(venue, 'venue_operating_rules')


@pytest.mark.django_db
class TestVenueViewSetPackagesAction:
    """Tests for VenueViewSet packages action."""

    def test_get_packages_for_venue(
        self, admin_client, venue_factory, product_option_factory
    ):
        """Test getting packages that include a venue."""
        venue = venue_factory()
        package1 = product_option_factory(type='PACKAGE', name='Package A', is_active=True)
        package2 = product_option_factory(type='PACKAGE', name='Package B', is_active=True)

        PackageVenue.objects.create(package=package1, venue=venue, is_primary=True, access_order=1)
        PackageVenue.objects.create(package=package2, venue=venue, is_primary=False, access_order=2)

        response = admin_client.get(f'{VENUES_URL}{venue.id}/packages/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2


@pytest.mark.django_db
class TestVenueViewSetAvailabilityAction:
    """Tests for VenueViewSet availability action."""

    def test_check_availability_default_dates(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test checking availability with default date range."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        response = admin_client.get(f'{VENUES_URL}{venue.id}/availability/')

        assert response.status_code == status.HTTP_200_OK
        assert 'venue_id' in response.data
        assert 'blocked_dates' in response.data

    def test_check_availability_custom_dates(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test checking availability with custom date range."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        response = admin_client.get(
            f'{VENUES_URL}{venue.id}/availability/',
            {'start_date': '2025-06-01', 'end_date': '2025-06-30'}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['start_date'] == '2025-06-01'
        assert response.data['end_date'] == '2025-06-30'

    def test_check_availability_invalid_date_format(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test availability check with invalid date format."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        response = admin_client.get(
            f'{VENUES_URL}{venue.id}/availability/',
            {'start_date': 'invalid-date'}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data


@pytest.mark.django_db
class TestVenueViewSetCalculateTimesAction:
    """Tests for VenueViewSet calculate_times action."""

    def test_calculate_times_success(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test calculating event times."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            ingress_hours=Decimal('1.0'),
            egress_hours=Decimal('0.5')
        )

        data = {
            'program_date': '2025-06-15',
            'program_start_time': '14:00',
            'program_hours': 4,
        }

        response = admin_client.post(
            f'{VENUES_URL}{venue.id}/calculate_times/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'times' in response.data
        assert 'duration_breakdown' in response.data
        assert 'validation' in response.data

    def test_calculate_times_with_early_late(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test calculating times with early check-in and late checkout."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            early_checkin_allowed=True,
            early_checkin_fee_per_hour=Decimal('300.00'),
            late_checkout_allowed=True,
            late_checkout_fee_per_hour=Decimal('250.00')
        )

        data = {
            'program_date': '2025-06-15',
            'program_start_time': '14:00',
            'program_hours': 4,
            'early_checkin_hours': 2,
            'late_checkout_hours': 2,
        }

        response = admin_client.post(
            f'{VENUES_URL}{venue.id}/calculate_times/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['early_checkin'] is not None
        assert response.data['late_checkout'] is not None
        assert response.data['early_checkin']['fee'] == 600.0
        assert response.data['late_checkout']['fee'] == 500.0

    def test_calculate_times_missing_params(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test calculate times with missing required parameters."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        data = {
            'program_date': '2025-06-15',
            # Missing program_start_time
        }

        response = admin_client.post(
            f'{VENUES_URL}{venue.id}/calculate_times/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_calculate_times_invalid_format(
        self, admin_client, venue_factory, venue_operating_rules_factory
    ):
        """Test calculate times with invalid parameter format."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        data = {
            'program_date': 'not-a-date',
            'program_start_time': '14:00',
            'program_hours': 4,
        }

        response = admin_client.post(
            f'{VENUES_URL}{venue.id}/calculate_times/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestVenueViewSetRentableAction:
    """Tests for VenueViewSet rentable action."""

    def test_get_rentable_venues(self, admin_client, venue_factory, venue_operating_rules_factory):
        """Test getting standalone rentable venues."""
        rentable = venue_factory(
            is_rentable_standalone=True,
            standalone_base_price=Decimal('5000.00'),
            is_active=True,
            is_bookable=True
        )
        venue_operating_rules_factory(venue=rentable)

        not_rentable = venue_factory(
            is_rentable_standalone=False,
            is_active=True,
            is_bookable=True
        )

        response = admin_client.get(f'{VENUES_URL}rentable/')

        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data]
        assert rentable.id in venue_ids
        assert not_rentable.id not in venue_ids


# =============================================================================
# PACKAGE VENUE VIEWSET TESTS (Admin)
# =============================================================================

@pytest.mark.django_db
class TestPackageVenueViewSetList:
    """Tests for PackageVenueViewSet list operations."""

    def test_list_package_venues(self, admin_client, package_with_venues):
        """Test listing package venue assignments."""
        response = admin_client.get(PACKAGE_VENUES_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_list_package_venues_filter_by_package(
        self, admin_client, package_with_venues
    ):
        """Test filtering by package_id."""
        package = package_with_venues['package']

        response = admin_client.get(
            PACKAGE_VENUES_URL,
            {'package_id': package.id}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_list_package_venues_filter_by_venue(
        self, admin_client, package_with_venues
    ):
        """Test filtering by venue_id."""
        venue = package_with_venues['primary_venue']

        response = admin_client.get(
            PACKAGE_VENUES_URL,
            {'venue_id': venue.id}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1


@pytest.mark.django_db
class TestPackageVenueViewSetCreate:
    """Tests for PackageVenueViewSet create operations."""

    def test_create_package_venue(self, admin_client, venue_factory, product_option_factory):
        """Test creating a package venue assignment."""
        venue = venue_factory()
        package = product_option_factory(type='PACKAGE')

        data = {
            'package': package.id,
            'venue': venue.id,
            'is_primary': True,
            'access_order': 1,
        }

        response = admin_client.post(PACKAGE_VENUES_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert PackageVenue.objects.filter(package=package, venue=venue).exists()


@pytest.mark.django_db
class TestPackageVenueViewSetByPackageAction:
    """Tests for PackageVenueViewSet by_package action."""

    def test_get_by_package(self, admin_client, package_with_venues):
        """Test getting venues for a specific package."""
        package = package_with_venues['package']

        response = admin_client.get(
            f'{PACKAGE_VENUES_URL}by_package/',
            {'package_id': package.id}
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_get_by_package_missing_id(self, admin_client):
        """Test by_package without package_id."""
        response = admin_client.get(f'{PACKAGE_VENUES_URL}by_package/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPackageVenueViewSetBulkAssignAction:
    """Tests for PackageVenueViewSet bulk_assign action."""

    def test_bulk_assign_venues(self, admin_client, venue_factory, product_option_factory):
        """Test bulk assigning venues to a package."""
        venue1 = venue_factory()
        venue2 = venue_factory()
        package = product_option_factory(type='PACKAGE')

        data = {
            'package_id': package.id,
            'venues': [
                {'venue_id': venue1.id, 'is_primary': True, 'access_order': 1},
                {'venue_id': venue2.id, 'is_primary': False, 'access_order': 2},
            ]
        }

        response = admin_client.post(
            f'{PACKAGE_VENUES_URL}bulk_assign/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        assert PackageVenue.objects.filter(package=package).count() == 2

    def test_bulk_assign_replaces_existing(
        self, admin_client, package_with_venues, venue_factory
    ):
        """Test bulk assign replaces existing assignments."""
        package = package_with_venues['package']
        new_venue = venue_factory()

        data = {
            'package_id': package.id,
            'venues': [
                {'venue_id': new_venue.id, 'is_primary': True, 'access_order': 1},
            ]
        }

        response = admin_client.post(
            f'{PACKAGE_VENUES_URL}bulk_assign/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert PackageVenue.objects.filter(package=package).count() == 1
        assert PackageVenue.objects.filter(package=package, venue=new_venue).exists()

    def test_bulk_assign_missing_package_id(self, admin_client):
        """Test bulk assign without package_id."""
        data = {
            'venues': []
        }

        response = admin_client.post(
            f'{PACKAGE_VENUES_URL}bulk_assign/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# VENUE BLOCKED DATE VIEWSET TESTS (Admin)
# =============================================================================

@pytest.mark.django_db
class TestVenueBlockedDateViewSetList:
    """Tests for VenueBlockedDateViewSet list operations."""

    def test_list_blocked_dates(self, admin_client, venue_factory, venue_blocked_date_factory):
        """Test listing blocked dates."""
        venue = venue_factory()
        venue_blocked_date_factory(venue=venue)
        venue_blocked_date_factory(venue=venue)

        response = admin_client.get(BLOCKED_DATES_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_list_blocked_dates_filter_by_venue(
        self, admin_client, venue_factory, venue_blocked_date_factory
    ):
        """Test filtering blocked dates by venue."""
        venue1 = venue_factory()
        venue2 = venue_factory()
        venue_blocked_date_factory(venue=venue1)
        venue_blocked_date_factory(venue=venue2)

        response = admin_client.get(
            BLOCKED_DATES_URL,
            {'venue_id': venue1.id}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_list_blocked_dates_filter_by_date_range(
        self, admin_client, venue_factory, venue_blocked_date_factory
    ):
        """Test filtering blocked dates by date range."""
        venue = venue_factory()
        today = timezone.now().date()

        block1 = venue_blocked_date_factory(
            venue=venue,
            date=today + timedelta(days=5)
        )
        block2 = venue_blocked_date_factory(
            venue=venue,
            date=today + timedelta(days=20)
        )

        response = admin_client.get(
            BLOCKED_DATES_URL,
            {
                'start_date': (today + timedelta(days=1)).isoformat(),
                'end_date': (today + timedelta(days=10)).isoformat()
            }
        )

        assert response.status_code == status.HTTP_200_OK
        # Only block1 should be in range
        assert response.data['count'] == 1


@pytest.mark.django_db
class TestVenueBlockedDateViewSetCreate:
    """Tests for VenueBlockedDateViewSet create operations."""

    def test_create_full_day_block(self, admin_client, venue_factory):
        """Test creating a full day blocked date."""
        venue = venue_factory()
        future_date = (timezone.now().date() + timedelta(days=7)).isoformat()

        data = {
            'venue': venue.id,
            'date': future_date,
            'reason': 'Maintenance',
            'is_full_day': True,
        }

        response = admin_client.post(BLOCKED_DATES_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['is_full_day'] is True
        # Verify created_by is set
        block = VenueBlockedDate.objects.get(id=response.data['id'])
        assert block.created_by is not None

    def test_create_partial_day_block(self, admin_client, venue_factory):
        """Test creating a partial day blocked date."""
        venue = venue_factory()
        future_date = (timezone.now().date() + timedelta(days=7)).isoformat()

        data = {
            'venue': venue.id,
            'date': future_date,
            'reason': 'Morning Event',
            'is_full_day': False,
            'blocked_start_time': '08:00:00',
            'blocked_end_time': '12:00:00',
        }

        response = admin_client.post(BLOCKED_DATES_URL, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['is_full_day'] is False
        assert response.data['blocked_start_time'] == '08:00:00'


@pytest.mark.django_db
class TestVenueBlockedDateViewSetDelete:
    """Tests for VenueBlockedDateViewSet delete operations."""

    def test_delete_blocked_date(self, admin_client, venue_factory, venue_blocked_date_factory):
        """Test deleting a blocked date."""
        venue = venue_factory()
        block = venue_blocked_date_factory(venue=venue)
        block_id = block.id

        response = admin_client.delete(f'{BLOCKED_DATES_URL}{block_id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not VenueBlockedDate.objects.filter(id=block_id).exists()


# =============================================================================
# PUBLIC VENUE VIEWSET TESTS
# =============================================================================

@pytest.mark.django_db
class TestPublicVenueViewSetList:
    """Tests for PublicVenueViewSet list operations."""

    def test_list_public_venues_no_auth(self, api_client, venue_factory):
        """Test public venues accessible without authentication."""
        venue_factory(is_active=True, is_bookable=True)

        response = api_client.get(PUBLIC_VENUES_URL)

        assert response.status_code == status.HTTP_200_OK

    def test_list_public_venues_only_active_bookable(self, api_client, venue_factory):
        """Test public list only shows active and bookable venues."""
        active_bookable = venue_factory(is_active=True, is_bookable=True)
        inactive = venue_factory(is_active=False, is_bookable=True)
        not_bookable = venue_factory(is_active=True, is_bookable=False)

        response = api_client.get(PUBLIC_VENUES_URL)

        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data['results']]
        assert active_bookable.id in venue_ids
        assert inactive.id not in venue_ids
        assert not_bookable.id not in venue_ids

    def test_retrieve_public_venue(self, api_client, venue_factory):
        """Test retrieving a single public venue."""
        venue = venue_factory(is_active=True, is_bookable=True)

        response = api_client.get(f'{PUBLIC_VENUES_URL}{venue.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == venue.id


@pytest.mark.django_db
class TestPublicVenueViewSetRentableAction:
    """Tests for PublicVenueViewSet rentable action."""

    def test_get_rentable_venues_public(
        self, api_client, venue_factory, venue_operating_rules_factory
    ):
        """Test getting rentable venues (public)."""
        rentable = venue_factory(
            is_rentable_standalone=True,
            standalone_base_price=Decimal('5000.00'),
            is_active=True,
            is_bookable=True
        )
        venue_operating_rules_factory(venue=rentable)

        response = api_client.get(f'{PUBLIC_VENUES_URL}rentable/')

        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data]
        assert rentable.id in venue_ids

    def test_get_rentable_venues_with_event_type(
        self, api_client, venue_factory, venue_operating_rules_factory, event_type_factory
    ):
        """Test getting rentable venues with event type pricing."""
        venue = venue_factory(
            is_rentable_standalone=True,
            standalone_base_price=Decimal('5000.00'),
            is_active=True,
            is_bookable=True
        )
        venue_operating_rules_factory(venue=venue)
        event_type = event_type_factory()

        VenueEventTypeConfiguration.objects.create(
            venue=venue,
            event_type=event_type,
            base_price=Decimal('8000.00')
        )

        response = api_client.get(
            f'{PUBLIC_VENUES_URL}rentable/',
            {'event_type_id': event_type.id}
        )

        assert response.status_code == status.HTTP_200_OK
        venue_data = next(v for v in response.data if v['id'] == venue.id)
        assert venue_data['effective_base_price'] == '8000.00'


@pytest.mark.django_db
class TestPublicVenueViewSetOperatingRulesAction:
    """Tests for PublicVenueViewSet operating_rules action."""

    def test_get_operating_rules_public(
        self, api_client, venue_factory, venue_operating_rules_factory
    ):
        """Test getting operating rules (public)."""
        venue = venue_factory(is_active=True, is_bookable=True)
        venue_operating_rules_factory(
            venue=venue,
            default_check_in_time=time(14, 0)
        )

        response = api_client.get(f'{PUBLIC_VENUES_URL}{venue.id}/operating_rules/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['default_check_in_time'] == '14:00:00'

    def test_get_operating_rules_not_configured_public(
        self, api_client, venue_factory
    ):
        """Test getting operating rules when not configured (public)."""
        venue = venue_factory(is_active=True, is_bookable=True)

        response = api_client.get(f'{PUBLIC_VENUES_URL}{venue.id}/operating_rules/')

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestPublicVenueViewSetCalculateTimesAction:
    """Tests for PublicVenueViewSet calculate_times action."""

    def test_calculate_times_public(
        self, api_client, venue_factory, venue_operating_rules_factory
    ):
        """Test calculating event times (public)."""
        venue = venue_factory(is_active=True, is_bookable=True)
        venue_operating_rules_factory(venue=venue)

        data = {
            'program_date': '2025-06-15',
            'program_start_time': '14:00',
            'program_hours': 4,
        }

        response = api_client.post(
            f'{PUBLIC_VENUES_URL}{venue.id}/calculate_times/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'times' in response.data
        assert 'duration' in response.data
        assert 'fees' in response.data
        assert 'validation' in response.data

    def test_calculate_times_public_missing_params(
        self, api_client, venue_factory, venue_operating_rules_factory
    ):
        """Test calculate times with missing params (public)."""
        venue = venue_factory(is_active=True, is_bookable=True)
        venue_operating_rules_factory(venue=venue)

        data = {
            'program_date': '2025-06-15',
            # Missing program_start_time
        }

        response = api_client.post(
            f'{PUBLIC_VENUES_URL}{venue.id}/calculate_times/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# PERMISSION TESTS
# =============================================================================

@pytest.mark.django_db
class TestVenueViewsPermissions:
    """Tests for venue views permission checks."""

    def test_venue_crud_requires_admin(self, client_user_client, venue_factory):
        """Test CRUD operations require admin role."""
        venue = venue_factory()

        # Create
        response = client_user_client.post(VENUES_URL, {
            'name': 'Test',
            'code': 'TEST',
            'maximum_capacity': 50
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Update
        response = client_user_client.put(f'{VENUES_URL}{venue.id}/', {
            'name': 'Updated',
            'code': venue.code,
            'maximum_capacity': venue.maximum_capacity
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Delete
        response = client_user_client.delete(f'{VENUES_URL}{venue.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_package_venue_requires_admin(self, client_user_client):
        """Test package venue endpoints require admin role."""
        response = client_user_client.get(PACKAGE_VENUES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_blocked_dates_requires_admin(self, client_user_client):
        """Test blocked dates endpoints require admin role."""
        response = client_user_client.get(BLOCKED_DATES_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_public_venues_allow_any(self, api_client, venue_factory):
        """Test public venue endpoints allow unauthenticated access."""
        venue = venue_factory(is_active=True, is_bookable=True)

        # List
        response = api_client.get(PUBLIC_VENUES_URL)
        assert response.status_code == status.HTTP_200_OK

        # Retrieve
        response = api_client.get(f'{PUBLIC_VENUES_URL}{venue.id}/')
        assert response.status_code == status.HTTP_200_OK

    def test_public_venues_read_only(self, api_client, venue_factory):
        """Test public venue endpoints are read-only."""
        venue = venue_factory(is_active=True, is_bookable=True)

        # Create should fail (405 Method Not Allowed for ReadOnlyModelViewSet)
        response = api_client.post(PUBLIC_VENUES_URL, {
            'name': 'Test',
            'code': 'TEST',
            'maximum_capacity': 50
        }, format='json')
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

        # Update should fail
        response = api_client.put(f'{PUBLIC_VENUES_URL}{venue.id}/', {
            'name': 'Updated'
        }, format='json')
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

        # Delete should fail
        response = api_client.delete(f'{PUBLIC_VENUES_URL}{venue.id}/')
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
