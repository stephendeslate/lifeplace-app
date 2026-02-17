"""
Unit tests for VIP domain views (API endpoints).

Tests:
- VIPSettingsViewSet (admin-only settings management)
- VIPTierViewSet (admin-only tier CRUD)
- VIPBenefitViewSet (admin-only benefit CRUD)
- ClientVIPStatusViewSet (admin-only client status management)
- VIPPointTransactionViewSet (admin-only transaction viewing)
- ClientVIPView (client portal endpoints)
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.domains.vip.models import (
    VIPSettings,
    VIPTier,
    VIPBenefit,
    ClientVIPStatus,
    VIPPointTransaction,
    VIPRewardRedemption,
    VIPTierHistory,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def api_client():
    """Return an API client."""
    return APIClient()


@pytest.fixture
def admin_user(user_factory):
    """Create an admin user."""
    return user_factory(admin=True)


@pytest.fixture
def client_user(user_factory):
    """Create a client user."""
    return user_factory(role='CLIENT')


@pytest.fixture
def authenticated_admin(api_client, admin_user):
    """Return authenticated admin API client."""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = admin_user
    return api_client


@pytest.fixture
def authenticated_client(api_client, client_user):
    """Return authenticated client API client."""
    refresh = RefreshToken.for_user(client_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = client_user
    return api_client


@pytest.fixture
def vip_settings():
    """Create VIP settings."""
    settings = VIPSettings.get_settings()
    settings.is_program_enabled = True
    settings.show_vip_status_to_client = True
    settings.show_tier_progress_to_client = True
    settings.show_available_rewards_to_client = True
    settings.show_points_balance_to_client = True
    settings.save()
    return settings


@pytest.fixture
def tier_hierarchy():
    """Create a tier hierarchy."""
    standard = VIPTier.objects.create(
        name="Standard", level=0, is_default=True, is_active=True
    )
    silver = VIPTier.objects.create(
        name="Silver", level=1, is_active=True,
        min_total_spent=Decimal('10000.00')
    )
    gold = VIPTier.objects.create(
        name="Gold", level=2, is_active=True,
        min_total_spent=Decimal('50000.00')
    )
    return standard, silver, gold


@pytest.fixture
def gold_tier_with_benefits():
    """Create gold tier with benefits."""
    gold = VIPTier.objects.create(name="Gold", level=2, is_active=True)
    auto_benefit = VIPBenefit.objects.create(
        tier=gold,
        benefit_type='PERCENTAGE_DISCOUNT',
        value=Decimal('10.00'),
        application_mode='AUTOMATIC',
        display_name='10% VIP Discount',
        is_active=True
    )
    redeem_benefit = VIPBenefit.objects.create(
        tier=gold,
        benefit_type='FIXED_DISCOUNT',
        value=Decimal('500.00'),
        application_mode='REDEEMABLE',
        points_cost=100,
        display_name='$500 Discount',
        is_active=True
    )
    return gold, auto_benefit, redeem_benefit


# =============================================================================
# VIPSettingsViewSet Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPSettingsViewSet:
    """Tests for VIP settings endpoints."""

    def test_get_settings_as_admin(self, authenticated_admin, vip_settings):
        """Test admin can retrieve VIP settings."""
        url = reverse('vip:vip-settings')
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_program_enabled'] is True
        assert 'program_name' in response.data

    def test_get_settings_as_client_forbidden(self, authenticated_client):
        """Test client cannot retrieve VIP settings."""
        url = reverse('vip:vip-settings')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_settings_unauthenticated_forbidden(self, api_client):
        """Test unauthenticated access is forbidden."""
        url = reverse('vip:vip-settings')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_settings_as_admin(self, authenticated_admin, vip_settings):
        """Test admin can update VIP settings."""
        url = reverse('vip:vip-settings')
        response = authenticated_admin.patch(url, {
            'program_name': 'Elite Program',
            'earning_points_enabled': True
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['program_name'] == 'Elite Program'
        assert response.data['earning_points_enabled'] is True

    def test_update_settings_as_client_forbidden(self, authenticated_client, vip_settings):
        """Test client cannot update VIP settings."""
        url = reverse('vip:vip-settings')
        response = authenticated_client.patch(url, {
            'program_name': 'Hacked'
        }, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_settings_as_admin(self, authenticated_admin):
        """Test admin can create/update settings via POST."""
        url = reverse('vip:vip-settings')
        response = authenticated_admin.post(url, {
            'program_name': 'VIP Elite',
            'is_program_enabled': True
        }, format='json')

        assert response.status_code == status.HTTP_200_OK


# =============================================================================
# VIPTierViewSet Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPTierViewSet:
    """Tests for VIP tier CRUD endpoints."""

    def test_list_tiers_as_admin(self, authenticated_admin, tier_hierarchy):
        """Test admin can list tiers."""
        url = reverse('vip:vip-tier-list')
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_list_tiers_as_client_forbidden(self, authenticated_client, tier_hierarchy):
        """Test client cannot list tiers."""
        url = reverse('vip:vip-tier-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_tier_as_admin(self, authenticated_admin):
        """Test admin can create a tier."""
        url = reverse('vip:vip-tier-list')
        response = authenticated_admin.post(url, {
            'name': 'Platinum',
            'level': 3,
            'description': 'Platinum tier benefits',
            'min_total_spent': '100000.00'
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Platinum'
        assert response.data['slug'] == 'platinum'

    def test_retrieve_tier_as_admin(self, authenticated_admin, tier_hierarchy):
        """Test admin can retrieve a tier."""
        standard, _, _ = tier_hierarchy
        url = reverse('vip:vip-tier-detail', kwargs={'pk': standard.pk})
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Standard'

    def test_update_tier_as_admin(self, authenticated_admin, tier_hierarchy):
        """Test admin can update a tier."""
        _, silver, _ = tier_hierarchy
        url = reverse('vip:vip-tier-detail', kwargs={'pk': silver.pk})
        response = authenticated_admin.patch(url, {
            'description': 'Updated description'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['description'] == 'Updated description'

    def test_delete_tier_as_admin(self, authenticated_admin, tier_hierarchy):
        """Test admin can delete a tier."""
        _, _, gold = tier_hierarchy
        url = reverse('vip:vip-tier-detail', kwargs={'pk': gold.pk})
        response = authenticated_admin.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not VIPTier.objects.filter(pk=gold.pk).exists()

    def test_filter_tiers_by_active(self, authenticated_admin, tier_hierarchy):
        """Test filtering tiers by active status."""
        standard, silver, gold = tier_hierarchy
        silver.is_active = False
        silver.save()

        url = reverse('vip:vip-tier-list')
        response = authenticated_admin.get(url, {'is_active': 'true'})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2  # Standard and Gold

    def test_active_tiers_action(self, authenticated_admin, tier_hierarchy):
        """Test active tiers action endpoint."""
        standard, silver, gold = tier_hierarchy
        silver.is_active = False
        silver.save()

        url = reverse('vip:vip-tier-active')
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_create_tier_validates_unique_level(self, authenticated_admin, tier_hierarchy):
        """Test creating tier with duplicate level fails."""
        url = reverse('vip:vip-tier-list')
        response = authenticated_admin.post(url, {
            'name': 'Duplicate',
            'level': 0,  # Same as Standard
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'level' in response.data


# =============================================================================
# VIPBenefitViewSet Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPBenefitViewSet:
    """Tests for VIP benefit CRUD endpoints."""

    def test_list_benefits_as_admin(self, authenticated_admin, gold_tier_with_benefits):
        """Test admin can list benefits."""
        url = reverse('vip:vip-benefit-list')
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_create_benefit_as_admin(self, authenticated_admin, tier_hierarchy):
        """Test admin can create a benefit."""
        standard, silver, gold = tier_hierarchy
        url = reverse('vip:vip-benefit-list')
        response = authenticated_admin.post(url, {
            'tier': gold.pk,
            'benefit_type': 'PERCENTAGE_DISCOUNT',
            'value': '15.00',
            'application_mode': 'AUTOMATIC'
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['benefit_type'] == 'PERCENTAGE_DISCOUNT'

    def test_filter_benefits_by_tier(self, authenticated_admin, tier_hierarchy):
        """Test filtering benefits by tier."""
        standard, silver, gold = tier_hierarchy
        VIPBenefit.objects.create(
            tier=gold,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            is_active=True
        )
        VIPBenefit.objects.create(
            tier=silver,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('100.00'),
            is_active=True
        )

        url = reverse('vip:vip-benefit-list')
        response = authenticated_admin.get(url, {'tier': gold.pk})

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['tier'] == gold.pk

    def test_filter_benefits_by_type(self, authenticated_admin, gold_tier_with_benefits):
        """Test filtering benefits by type."""
        url = reverse('vip:vip-benefit-list')
        response = authenticated_admin.get(url, {'benefit_type': 'PERCENTAGE_DISCOUNT'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['benefit_type'] == 'PERCENTAGE_DISCOUNT'

    def test_filter_benefits_by_application_mode(self, authenticated_admin, gold_tier_with_benefits):
        """Test filtering benefits by application mode."""
        url = reverse('vip:vip-benefit-list')
        response = authenticated_admin.get(url, {'application_mode': 'REDEEMABLE'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['application_mode'] == 'REDEEMABLE'

    def test_benefit_types_action(self, authenticated_admin):
        """Test benefit types action returns choices."""
        url = reverse('vip:vip-benefit-benefit-types')
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) > 0
        assert all('value' in item and 'label' in item for item in response.data)

    def test_create_benefit_validates_percentage_range(self, authenticated_admin, tier_hierarchy):
        """Test percentage discount must be 0-100."""
        _, _, gold = tier_hierarchy
        url = reverse('vip:vip-benefit-list')
        response = authenticated_admin.post(url, {
            'tier': gold.pk,
            'benefit_type': 'PERCENTAGE_DISCOUNT',
            'value': '150.00',  # Invalid
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'value' in response.data


# =============================================================================
# ClientVIPStatusViewSet Tests
# =============================================================================

@pytest.mark.django_db
class TestClientVIPStatusViewSet:
    """Tests for client VIP status admin endpoints."""

    @pytest.fixture
    def client_with_status(self, user_factory, tier_hierarchy):
        """Create a client with VIP status."""
        standard, silver, gold = tier_hierarchy
        client = user_factory(
            role='CLIENT',
            email='vip@example.com',
            first_name='John',
            last_name='Doe'
        )
        status_obj = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            points_balance=500,
            total_spent=Decimal('75000.00'),
            completed_bookings_count=15,
            status='ACTIVE'
        )
        return client, status_obj

    def test_list_client_statuses_as_admin(self, authenticated_admin, client_with_status):
        """Test admin can list client VIP statuses."""
        url = reverse('vip:client-vip-status-list')
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_list_client_statuses_as_client_forbidden(self, authenticated_client):
        """Test client cannot list VIP statuses."""
        url = reverse('vip:client-vip-status-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_client_status_as_admin(self, authenticated_admin, client_with_status):
        """Test admin can retrieve client status."""
        client, status_obj = client_with_status
        url = reverse('vip:client-vip-status-detail', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['client_email'] == 'vip@example.com'

    def test_filter_by_tier(self, authenticated_admin, client_with_status, tier_hierarchy):
        """Test filtering statuses by tier."""
        _, _, gold = tier_hierarchy
        url = reverse('vip:client-vip-status-list')
        response = authenticated_admin.get(url, {'tier': gold.pk})

        assert response.status_code == status.HTTP_200_OK

    def test_filter_by_status(self, authenticated_admin, client_with_status):
        """Test filtering statuses by status."""
        url = reverse('vip:client-vip-status-list')
        response = authenticated_admin.get(url, {'status': 'ACTIVE'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert all(item['status'] == 'ACTIVE' for item in results)

    def test_search_by_email(self, authenticated_admin, client_with_status):
        """Test searching statuses by email."""
        url = reverse('vip:client-vip-status-list')
        response = authenticated_admin.get(url, {'search': 'vip@'})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_assign_tier_action(self, authenticated_admin, client_with_status, tier_hierarchy):
        """Test assign_tier action."""
        client, status_obj = client_with_status
        _, silver, gold = tier_hierarchy
        url = reverse('vip:client-vip-status-assign-tier', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.post(url, {
            'tier_id': silver.pk,
            'reason': 'Manual downgrade'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['current_tier_name'] == 'Silver'

    def test_assign_tier_invalid_tier(self, authenticated_admin, client_with_status):
        """Test assign_tier with invalid tier ID."""
        _, status_obj = client_with_status
        url = reverse('vip:client-vip-status-assign-tier', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.post(url, {
            'tier_id': 99999
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_award_points_action(self, authenticated_admin, client_with_status):
        """Test award_points action."""
        _, status_obj = client_with_status
        url = reverse('vip:client-vip-status-award-points', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.post(url, {
            'points': 100,
            'description': 'Welcome bonus'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['new_balance'] == 600

    def test_award_points_invalid_amount(self, authenticated_admin, client_with_status):
        """Test award_points with invalid amount."""
        _, status_obj = client_with_status
        url = reverse('vip:client-vip-status-award-points', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.post(url, {
            'points': -50,
            'description': 'Invalid'
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_adjust_points_action(self, authenticated_admin, client_with_status):
        """Test adjust_points action."""
        _, status_obj = client_with_status
        url = reverse('vip:client-vip-status-adjust-points', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.post(url, {
            'points': -100,
            'description': 'Correction'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['new_balance'] == 400

    def test_adjust_points_zero_rejected(self, authenticated_admin, client_with_status):
        """Test adjust_points with zero is rejected."""
        _, status_obj = client_with_status
        url = reverse('vip:client-vip-status-adjust-points', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.post(url, {
            'points': 0,
            'description': 'No change'
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_tier_history_action(self, authenticated_admin, client_with_status, tier_hierarchy):
        """Test tier_history action."""
        client, status_obj = client_with_status
        _, silver, gold = tier_hierarchy
        # Create some history
        VIPTierHistory.objects.create(
            client_vip_status=status_obj,
            from_tier=silver,
            to_tier=gold,
            reason='AUTOMATIC_UPGRADE'
        )

        url = reverse('vip:client-vip-status-tier-history', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_point_transactions_action(self, authenticated_admin, client_with_status):
        """Test point_transactions action."""
        _, status_obj = client_with_status
        # Create some transactions
        VIPPointTransaction.objects.create(
            client_vip_status=status_obj,
            transaction_type='EARNED_BONUS',
            points=100,
            description='Test',
            balance_after=600
        )

        url = reverse('vip:client-vip-status-point-transactions', kwargs={'pk': status_obj.pk})
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1


# =============================================================================
# VIPPointTransactionViewSet Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPPointTransactionViewSet:
    """Tests for point transaction admin endpoints."""

    @pytest.fixture
    def transactions(self, user_factory, tier_hierarchy):
        """Create some transactions."""
        standard, _, _ = tier_hierarchy
        client = user_factory(role='CLIENT')
        status_obj = ClientVIPStatus.objects.create(
            client=client,
            current_tier=standard,
            points_balance=200
        )
        tx1 = VIPPointTransaction.objects.create(
            client_vip_status=status_obj,
            transaction_type='EARNED_BONUS',
            points=100,
            description='Bonus',
            balance_after=100
        )
        tx2 = VIPPointTransaction.objects.create(
            client_vip_status=status_obj,
            transaction_type='SPENT_REWARD',
            points=-50,
            description='Spent',
            balance_after=50
        )
        return status_obj, [tx1, tx2]

    def test_list_transactions_as_admin(self, authenticated_admin, transactions):
        """Test admin can list transactions."""
        url = reverse('vip:point-transaction-list')
        response = authenticated_admin.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2

    def test_filter_by_client(self, authenticated_admin, transactions):
        """Test filtering transactions by client."""
        status_obj, _ = transactions
        url = reverse('vip:point-transaction-list')
        response = authenticated_admin.get(url, {'client': status_obj.client.pk})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2

    def test_filter_by_transaction_type(self, authenticated_admin, transactions):
        """Test filtering transactions by type."""
        url = reverse('vip:point-transaction-list')
        response = authenticated_admin.get(url, {'transaction_type': 'EARNED_BONUS'})

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert all(t['transaction_type'] == 'EARNED_BONUS' for t in results)

    def test_read_only_no_create(self, authenticated_admin):
        """Test transactions are read-only (no POST)."""
        url = reverse('vip:point-transaction-list')
        response = authenticated_admin.post(url, {}, format='json')

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


# =============================================================================
# ClientVIPView (Client Portal) Tests
# =============================================================================

@pytest.mark.django_db
class TestClientVIPView:
    """Tests for client portal VIP endpoints."""

    @pytest.fixture
    def client_with_vip(self, client_user, gold_tier_with_benefits, vip_settings):
        """Setup client with VIP status."""
        gold, auto_benefit, redeem_benefit = gold_tier_with_benefits
        status_obj = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold,
            points_balance=500,
            lifetime_points_earned=1000,
            lifetime_points_spent=500,
            total_spent=Decimal('75000.00'),
            completed_bookings_count=15,
            status='ACTIVE'
        )
        return client_user, status_obj, gold

    def test_my_status_returns_vip_status(self, authenticated_client, client_with_vip, vip_settings):
        """Test my_status returns client's VIP status."""
        url = reverse('vip:client-my-status')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['current_tier']['name'] == 'Gold'
        assert response.data['points_balance'] == 500

    def test_my_status_creates_status_if_none(self, authenticated_client, vip_settings, tier_hierarchy):
        """Test my_status creates VIP status if client has none."""
        url = reverse('vip:client-my-status')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_my_status_forbidden_when_visibility_disabled(self, authenticated_client, client_with_vip):
        """Test my_status returns 403 when visibility disabled."""
        settings = VIPSettings.get_settings()
        settings.show_vip_status_to_client = False
        settings.save()

        url = reverse('vip:client-my-status')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_my_status_hides_points_when_disabled(self, authenticated_client, client_with_vip, vip_settings):
        """Test my_status hides points balance when disabled."""
        vip_settings.show_points_balance_to_client = False
        vip_settings.save()

        url = reverse('vip:client-my-status')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'points_balance' not in response.data

    def test_my_status_hides_progress_when_disabled(self, authenticated_client, client_with_vip, vip_settings):
        """Test my_status hides tier progress when disabled."""
        vip_settings.show_tier_progress_to_client = False
        vip_settings.save()

        url = reverse('vip:client-my-status')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'progress_to_next_tier' not in response.data
        assert 'next_tier' not in response.data

    def test_my_status_hides_benefits_when_disabled(self, authenticated_client, client_with_vip, vip_settings):
        """Test my_status hides benefits when disabled."""
        vip_settings.show_available_rewards_to_client = False
        vip_settings.save()

        url = reverse('vip:client-my-status')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'benefits' not in response.data

    def test_my_benefits_returns_tier_benefits(self, authenticated_client, client_with_vip, vip_settings):
        """Test my_benefits returns client's tier benefits."""
        url = reverse('vip:client-my-benefits')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_my_benefits_forbidden_when_disabled(self, authenticated_client, client_with_vip):
        """Test my_benefits returns 403 when disabled."""
        settings = VIPSettings.get_settings()
        settings.show_available_rewards_to_client = False
        settings.save()

        url = reverse('vip:client-my-benefits')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_my_points_returns_balance_and_transactions(self, authenticated_client, client_with_vip, vip_settings):
        """Test my_points returns balance and recent transactions."""
        client_user, status_obj, _ = client_with_vip
        # Create some transactions
        VIPPointTransaction.objects.create(
            client_vip_status=status_obj,
            transaction_type='EARNED_BONUS',
            points=100,
            description='Test',
            balance_after=600
        )

        url = reverse('vip:client-my-points')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['balance'] == 500
        assert response.data['lifetime_earned'] == 1000
        assert response.data['lifetime_spent'] == 500
        assert 'recent_transactions' in response.data

    def test_my_points_forbidden_when_disabled(self, authenticated_client, client_with_vip):
        """Test my_points returns 403 when disabled."""
        settings = VIPSettings.get_settings()
        settings.show_points_balance_to_client = False
        settings.save()

        url = reverse('vip:client-my-points')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_redeemable_benefits_returns_only_redeemable(self, authenticated_client, client_with_vip, vip_settings):
        """Test redeemable_benefits returns only redeemable benefits."""
        url = reverse('vip:client-redeemable-benefits')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['application_mode'] == 'REDEEMABLE'

    def test_redeem_benefit_creates_redemption(self, authenticated_client, client_with_vip, vip_settings, event_factory):
        """Test redeem_benefit creates a redemption record."""
        client_user, status_obj, gold = client_with_vip
        redeem_benefit = VIPBenefit.objects.get(
            tier=gold,
            application_mode='REDEEMABLE'
        )
        event = event_factory(client=client_user)

        url = reverse('vip:client-redeem-benefit')
        response = authenticated_client.post(url, {
            'benefit_id': redeem_benefit.pk,
            'event_id': event.pk
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == 'PENDING'

    def test_redeem_benefit_deducts_points(self, authenticated_client, client_with_vip, vip_settings, event_factory):
        """Test redeem_benefit deducts points."""
        client_user, status_obj, gold = client_with_vip
        redeem_benefit = VIPBenefit.objects.get(
            tier=gold,
            application_mode='REDEEMABLE'
        )
        event = event_factory(client=client_user)

        url = reverse('vip:client-redeem-benefit')
        authenticated_client.post(url, {
            'benefit_id': redeem_benefit.pk,
            'event_id': event.pk
        }, format='json')

        status_obj.refresh_from_db()
        assert status_obj.points_balance == 400  # 500 - 100

    def test_redeem_benefit_invalid_benefit(self, authenticated_client, client_with_vip, vip_settings, event_factory):
        """Test redeem_benefit with invalid benefit ID."""
        client_user, _, _ = client_with_vip
        event = event_factory(client=client_user)

        url = reverse('vip:client-redeem-benefit')
        response = authenticated_client.post(url, {
            'benefit_id': 99999,
            'event_id': event.pk
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_redeem_benefit_wrong_client_event(self, authenticated_client, client_with_vip, vip_settings, event_factory, user_factory):
        """Test redeem_benefit fails for another client's event."""
        _, status_obj, gold = client_with_vip
        redeem_benefit = VIPBenefit.objects.get(
            tier=gold,
            application_mode='REDEEMABLE'
        )
        other_client = user_factory(role='CLIENT')
        event = event_factory(client=other_client)

        url = reverse('vip:client-redeem-benefit')
        response = authenticated_client.post(url, {
            'benefit_id': redeem_benefit.pk,
            'event_id': event.pk
        }, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_redeem_benefit_insufficient_points(self, authenticated_client, client_with_vip, vip_settings, event_factory):
        """Test redeem_benefit fails when insufficient points."""
        client_user, status_obj, gold = client_with_vip
        status_obj.points_balance = 50  # Less than 100 required
        status_obj.save()

        redeem_benefit = VIPBenefit.objects.get(
            tier=gold,
            application_mode='REDEEMABLE'
        )
        event = event_factory(client=client_user)

        url = reverse('vip:client-redeem-benefit')
        response = authenticated_client.post(url, {
            'benefit_id': redeem_benefit.pk,
            'event_id': event.pk
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'detail' in response.data


# =============================================================================
# Permission Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPPermissions:
    """Tests for VIP endpoint permissions."""

    def test_unauthenticated_cannot_access_admin_endpoints(self, api_client):
        """Test unauthenticated users cannot access admin endpoints."""
        urls = [
            reverse('vip:vip-settings'),
            reverse('vip:vip-tier-list'),
            reverse('vip:vip-benefit-list'),
            reverse('vip:client-vip-status-list'),
            reverse('vip:point-transaction-list'),
        ]

        for url in urls:
            response = api_client.get(url)
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_client_cannot_access_admin_endpoints(self, authenticated_client, vip_settings, tier_hierarchy):
        """Test client users cannot access admin endpoints."""
        urls = [
            reverse('vip:vip-settings'),
            reverse('vip:vip-tier-list'),
            reverse('vip:vip-benefit-list'),
            reverse('vip:client-vip-status-list'),
            reverse('vip:point-transaction-list'),
        ]

        for url in urls:
            response = authenticated_client.get(url)
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_cannot_access_client_portal_endpoints(self, authenticated_admin, vip_settings):
        """Test admin users cannot access client portal endpoints."""
        urls = [
            reverse('vip:client-my-status'),
            reverse('vip:client-my-benefits'),
            reverse('vip:client-my-points'),
            reverse('vip:client-redeemable-benefits'),
        ]

        for url in urls:
            response = authenticated_admin.get(url)
            # Admin has role 'ADMIN', not 'CLIENT', so should be forbidden
            assert response.status_code == status.HTTP_403_FORBIDDEN
