"""
Unit tests for VIP domain services.

Tests:
- VIPService (core VIP operations)
- VIPPointsService (points management)
- VIPPricingIntegrationService (pricing integration)
- VIPRedemptionService (benefit redemptions)
"""

import pytest
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time

from core.domains.vip.models import (
    VIPSettings,
    VIPTier,
    VIPBenefit,
    ClientVIPStatus,
    VIPPointTransaction,
    VIPRewardRedemption,
    VIPTierHistory,
)
from core.domains.vip.services import (
    VIPService,
    VIPPointsService,
    VIPPricingIntegrationService,
    VIPRedemptionService,
)


# =============================================================================
# VIPService Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPServiceGetSettings:
    """Tests for VIPService.get_settings()."""

    def test_get_settings_returns_singleton(self):
        """Test get_settings returns singleton instance."""
        settings = VIPService.get_settings()

        assert settings is not None
        assert settings.pk == 1
        assert isinstance(settings, VIPSettings)

    def test_get_settings_returns_same_instance(self):
        """Test get_settings returns same instance on repeated calls."""
        settings1 = VIPService.get_settings()
        settings2 = VIPService.get_settings()

        assert settings1.pk == settings2.pk


@pytest.mark.django_db
class TestVIPServiceIsProgramEnabled:
    """Tests for VIPService.is_program_enabled()."""

    def test_returns_true_when_enabled(self):
        """Test returns True when program is enabled."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.save()

        assert VIPService.is_program_enabled() is True

    def test_returns_false_when_disabled(self):
        """Test returns False when program is disabled."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = False
        settings.save()

        assert VIPService.is_program_enabled() is False


@pytest.mark.django_db
class TestVIPServiceGetOrCreateClientStatus:
    """Tests for VIPService.get_or_create_client_status()."""

    @pytest.fixture
    def default_tier(self):
        """Create a default tier."""
        return VIPTier.objects.create(name="Standard", level=0, is_default=True)

    def test_creates_new_status_for_client(self, user_factory, default_tier):
        """Test creates new VIP status for client without one."""
        client = user_factory(role='CLIENT')

        status = VIPService.get_or_create_client_status(client)

        assert status is not None
        assert status.client == client
        assert status.current_tier == default_tier
        assert status.status == 'ACTIVE'

    def test_returns_existing_status(self, user_factory, default_tier):
        """Test returns existing status if client already has one."""
        client = user_factory(role='CLIENT')
        existing = ClientVIPStatus.objects.create(
            client=client,
            current_tier=default_tier,
            points_balance=100
        )

        status = VIPService.get_or_create_client_status(client)

        assert status.pk == existing.pk
        assert status.points_balance == 100

    def test_creates_initial_tier_history(self, user_factory, default_tier):
        """Test creates tier history entry on initial status creation."""
        client = user_factory(role='CLIENT')

        status = VIPService.get_or_create_client_status(client)

        history = VIPTierHistory.objects.filter(client_vip_status=status)
        assert history.count() == 1
        assert history.first().reason == 'INITIAL'
        assert history.first().from_tier is None
        assert history.first().to_tier == default_tier

    def test_no_default_tier_creates_status_without_tier(self, user_factory):
        """Test creates status without tier if no default tier exists."""
        client = user_factory(role='CLIENT')

        status = VIPService.get_or_create_client_status(client)

        assert status is not None
        assert status.current_tier is None


@pytest.mark.django_db
class TestVIPServiceCalculateEligibleTier:
    """Tests for VIPService.calculate_eligible_tier()."""

    @pytest.fixture
    def tier_hierarchy(self):
        """Create a tier hierarchy."""
        standard = VIPTier.objects.create(
            name="Standard", level=0, is_default=True, is_active=True
        )
        silver = VIPTier.objects.create(
            name="Silver", level=1, is_active=True,
            min_total_spent=Decimal('10000.00'),
            min_completed_bookings=3
        )
        gold = VIPTier.objects.create(
            name="Gold", level=2, is_active=True,
            min_total_spent=Decimal('50000.00'),
            min_completed_bookings=10,
            min_points_required=500
        )
        return standard, silver, gold

    @pytest.fixture
    def client_status(self, user_factory, tier_hierarchy):
        """Create a client VIP status."""
        standard, _, _ = tier_hierarchy
        client = user_factory(role='CLIENT')
        return ClientVIPStatus.objects.create(
            client=client,
            current_tier=standard,
            total_spent=Decimal('0.00'),
            completed_bookings_count=0,
            points_balance=0
        )

    def test_returns_none_when_program_disabled(self, client_status):
        """Test returns None when VIP program is disabled."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = False
        settings.save()

        result = VIPService.calculate_eligible_tier(client_status)

        assert result is None

    def test_returns_none_when_automatic_earning_disabled(self, client_status):
        """Test returns None when automatic earning is disabled."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = False
        settings.save()

        result = VIPService.calculate_eligible_tier(client_status)

        assert result is None

    def test_qualifies_by_spending(self, client_status, tier_hierarchy):
        """Test client qualifies for tier by total spending."""
        standard, silver, gold = tier_hierarchy
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'SPENDING'
        settings.save()

        client_status.total_spent = Decimal('25000.00')
        client_status.save()

        result = VIPService.calculate_eligible_tier(client_status)

        assert result == silver

    def test_qualifies_by_bookings(self, client_status, tier_hierarchy):
        """Test client qualifies for tier by completed bookings."""
        standard, silver, gold = tier_hierarchy
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'BOOKINGS'
        settings.save()

        client_status.completed_bookings_count = 5
        client_status.save()

        result = VIPService.calculate_eligible_tier(client_status)

        assert result == silver

    def test_qualifies_highest_tier_by_spending(self, client_status, tier_hierarchy):
        """Test client qualifies for highest tier by spending."""
        standard, silver, gold = tier_hierarchy
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'SPENDING'
        settings.save()

        client_status.total_spent = Decimal('75000.00')
        client_status.save()

        result = VIPService.calculate_eligible_tier(client_status)

        assert result == gold

    def test_qualifies_by_both_any_condition(self, client_status, tier_hierarchy):
        """Test BOTH mode qualifies if any condition is met."""
        standard, silver, gold = tier_hierarchy
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'BOTH'
        settings.save()

        # Only spending meets silver threshold
        client_status.total_spent = Decimal('15000.00')
        client_status.completed_bookings_count = 1  # Below threshold
        client_status.save()

        result = VIPService.calculate_eligible_tier(client_status)

        assert result == silver

    def test_qualifies_by_points_in_both_mode(self, client_status, tier_hierarchy):
        """Test BOTH mode qualifies by points."""
        standard, silver, gold = tier_hierarchy
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'BOTH'
        settings.save()

        client_status.points_balance = 600
        client_status.save()

        result = VIPService.calculate_eligible_tier(client_status)

        assert result == gold

    def test_returns_default_when_no_qualification(self, client_status, tier_hierarchy):
        """Test returns default tier when no higher tier qualifies."""
        standard, silver, gold = tier_hierarchy
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'SPENDING'
        settings.save()

        client_status.total_spent = Decimal('100.00')
        client_status.save()

        result = VIPService.calculate_eligible_tier(client_status)

        assert result == standard


@pytest.mark.django_db
class TestVIPServiceUpgradeTierIfEligible:
    """Tests for VIPService.upgrade_tier_if_eligible()."""

    @pytest.fixture
    def tier_hierarchy(self):
        """Create tier hierarchy."""
        standard = VIPTier.objects.create(
            name="Standard", level=0, is_default=True, is_active=True
        )
        gold = VIPTier.objects.create(
            name="Gold", level=2, is_active=True,
            min_total_spent=Decimal('50000.00')
        )
        return standard, gold

    @pytest.fixture
    def client_status(self, user_factory, tier_hierarchy):
        """Create client VIP status."""
        standard, _ = tier_hierarchy
        client = user_factory(role='CLIENT')
        return ClientVIPStatus.objects.create(
            client=client,
            current_tier=standard,
            total_spent=Decimal('60000.00')
        )

    def test_upgrades_tier_when_eligible(self, client_status, tier_hierarchy):
        """Test upgrades tier when client qualifies for higher tier."""
        standard, gold = tier_hierarchy
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'SPENDING'
        settings.save()

        result = VIPService.upgrade_tier_if_eligible(client_status)

        assert result is True
        client_status.refresh_from_db()
        assert client_status.current_tier == gold

    def test_creates_tier_history_on_upgrade(self, client_status, tier_hierarchy):
        """Test creates tier history entry on upgrade."""
        standard, gold = tier_hierarchy
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'SPENDING'
        settings.save()

        VIPService.upgrade_tier_if_eligible(client_status)

        history = VIPTierHistory.objects.filter(
            client_vip_status=client_status,
            reason='AUTOMATIC_UPGRADE'
        )
        assert history.count() == 1
        assert history.first().from_tier == standard
        assert history.first().to_tier == gold

    def test_returns_false_when_not_eligible(self, user_factory, tier_hierarchy):
        """Test returns False when client is not eligible for upgrade."""
        standard, gold = tier_hierarchy
        client = user_factory(role='CLIENT')
        client_status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=standard,
            total_spent=Decimal('1000.00')  # Below gold threshold
        )
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'SPENDING'
        settings.save()

        result = VIPService.upgrade_tier_if_eligible(client_status)

        assert result is False

    def test_returns_false_when_already_at_tier(self, user_factory, tier_hierarchy):
        """Test returns False when client already at eligible tier."""
        standard, gold = tier_hierarchy
        client = user_factory(role='CLIENT')
        client_status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            total_spent=Decimal('60000.00')
        )
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'SPENDING'
        settings.save()

        result = VIPService.upgrade_tier_if_eligible(client_status)

        assert result is False


@pytest.mark.django_db
class TestVIPServiceAssignTierManually:
    """Tests for VIPService.assign_tier_manually()."""

    @pytest.fixture
    def tiers(self):
        """Create tiers."""
        standard = VIPTier.objects.create(name="Standard", level=0, is_default=True)
        gold = VIPTier.objects.create(name="Gold", level=2)
        return standard, gold

    def test_assigns_tier_manually(self, user_factory, tiers):
        """Test manually assigns tier to client."""
        standard, gold = tiers
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        status = VIPService.assign_tier_manually(
            client=client,
            tier=gold,
            assigned_by=admin,
            reason="VIP customer"
        )

        assert status.current_tier == gold
        assert status.assigned_by == admin
        assert status.assignment_reason == "VIP customer"
        assert status.status == 'ACTIVE'

    def test_creates_tier_history_entry(self, user_factory, tiers):
        """Test creates tier history entry for manual assignment."""
        standard, gold = tiers
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        # First create initial status
        initial_status = VIPService.get_or_create_client_status(client)

        # Then assign manually
        VIPService.assign_tier_manually(
            client=client,
            tier=gold,
            assigned_by=admin,
            reason="VIP customer"
        )

        history = VIPTierHistory.objects.filter(
            client_vip_status=initial_status,
            reason='MANUAL_ASSIGNMENT'
        )
        assert history.count() == 1
        assert history.first().to_tier == gold
        assert history.first().changed_by == admin


@pytest.mark.django_db
class TestVIPServiceGetClientBenefits:
    """Tests for VIPService.get_client_benefits()."""

    @pytest.fixture
    def gold_tier_with_benefits(self):
        """Create gold tier with benefits."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        benefit1 = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            is_active=True
        )
        benefit2 = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FREE_HOURS',
            value=Decimal('2.00'),
            is_active=True
        )
        benefit_inactive = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            is_active=False
        )
        return gold, [benefit1, benefit2]

    def test_returns_active_benefits_for_tier(self, user_factory, gold_tier_with_benefits):
        """Test returns active benefits for client's tier."""
        gold, expected_benefits = gold_tier_with_benefits
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )

        benefits = VIPService.get_client_benefits(client)

        assert len(benefits) == 2
        assert all(b.is_active for b in benefits)

    def test_returns_empty_for_no_tier(self, user_factory):
        """Test returns empty list when client has no tier."""
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(client=client, current_tier=None)

        benefits = VIPService.get_client_benefits(client)

        assert benefits == []

    def test_returns_empty_for_inactive_status(self, user_factory, gold_tier_with_benefits):
        """Test returns empty list when status is not ACTIVE."""
        gold, _ = gold_tier_with_benefits
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='EXPIRED'
        )

        benefits = VIPService.get_client_benefits(client)

        assert benefits == []

    def test_returns_empty_for_no_vip_status(self, user_factory):
        """Test returns empty list when client has no VIP status."""
        client = user_factory(role='CLIENT')

        benefits = VIPService.get_client_benefits(client)

        assert benefits == []


@pytest.mark.django_db
class TestVIPServiceGetAutomaticAndRedeemableBenefits:
    """Tests for get_automatic_benefits and get_redeemable_benefits."""

    @pytest.fixture
    def tier_with_mixed_benefits(self):
        """Create tier with automatic and redeemable benefits."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        auto_benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            application_mode='AUTOMATIC',
            is_active=True
        )
        redeem_benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            points_cost=100,
            is_active=True
        )
        return gold, auto_benefit, redeem_benefit

    def test_get_automatic_benefits(self, user_factory, tier_with_mixed_benefits):
        """Test returns only automatic benefits."""
        gold, auto_benefit, _ = tier_with_mixed_benefits
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )

        benefits = VIPService.get_automatic_benefits(client)

        assert len(benefits) == 1
        assert benefits[0].application_mode == 'AUTOMATIC'

    def test_get_redeemable_benefits(self, user_factory, tier_with_mixed_benefits):
        """Test returns only redeemable benefits."""
        gold, _, redeem_benefit = tier_with_mixed_benefits
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )

        benefits = VIPService.get_redeemable_benefits(client)

        assert len(benefits) == 1
        assert benefits[0].application_mode == 'REDEEMABLE'


@pytest.mark.django_db
class TestVIPServiceCheckBenefitEligibility:
    """Tests for VIPService.check_benefit_eligibility()."""

    @pytest.fixture
    def gold_tier_with_benefit(self):
        """Create gold tier with redeemable benefit."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            points_cost=100,
            max_uses_per_month=2,
            is_active=True
        )
        return gold, benefit

    def test_eligible_for_benefit(self, user_factory, gold_tier_with_benefit):
        """Test client is eligible for benefit."""
        gold, benefit = gold_tier_with_benefit
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE',
            points_balance=200
        )

        is_eligible, reason = VIPService.check_benefit_eligibility(client, benefit)

        assert is_eligible is True
        assert reason == "Eligible"

    def test_not_eligible_no_client(self, gold_tier_with_benefit):
        """Test not eligible when no client provided."""
        _, benefit = gold_tier_with_benefit

        is_eligible, reason = VIPService.check_benefit_eligibility(None, benefit)

        assert is_eligible is False
        assert reason == "No client provided"

    def test_not_eligible_no_vip_status(self, user_factory, gold_tier_with_benefit):
        """Test not eligible when client has no VIP status."""
        _, benefit = gold_tier_with_benefit
        client = user_factory(role='CLIENT')

        is_eligible, reason = VIPService.check_benefit_eligibility(client, benefit)

        assert is_eligible is False
        assert reason == "Client has no VIP status"

    def test_not_eligible_wrong_tier(self, user_factory, gold_tier_with_benefit):
        """Test not eligible when benefit is for different tier."""
        gold, benefit = gold_tier_with_benefit
        silver = VIPTier.objects.create(name="Silver", level=1)
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=silver,
            status='ACTIVE',
            points_balance=200
        )

        is_eligible, reason = VIPService.check_benefit_eligibility(client, benefit)

        assert is_eligible is False
        assert reason == "Benefit not available for client's tier"

    def test_not_eligible_inactive_status(self, user_factory, gold_tier_with_benefit):
        """Test not eligible when VIP status is not active."""
        gold, benefit = gold_tier_with_benefit
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='EXPIRED',
            points_balance=200
        )

        is_eligible, reason = VIPService.check_benefit_eligibility(client, benefit)

        assert is_eligible is False
        assert "EXPIRED" in reason

    def test_not_eligible_inactive_benefit(self, user_factory, gold_tier_with_benefit):
        """Test not eligible when benefit is inactive."""
        gold, benefit = gold_tier_with_benefit
        benefit.is_active = False
        benefit.save()
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE',
            points_balance=200
        )

        is_eligible, reason = VIPService.check_benefit_eligibility(client, benefit)

        assert is_eligible is False
        assert reason == "Benefit is not active"

    def test_not_eligible_insufficient_points(self, user_factory, gold_tier_with_benefit):
        """Test not eligible when insufficient points for redeemable."""
        gold, benefit = gold_tier_with_benefit
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE',
            points_balance=50  # Less than 100 required
        )

        is_eligible, reason = VIPService.check_benefit_eligibility(client, benefit)

        assert is_eligible is False
        assert "Insufficient points" in reason

    @freeze_time('2024-01-15 10:00:00')
    def test_not_eligible_monthly_limit_reached(self, user_factory, gold_tier_with_benefit, event_factory):
        """Test not eligible when monthly usage limit reached."""
        gold, benefit = gold_tier_with_benefit
        client = user_factory(role='CLIENT')
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE',
            points_balance=500
        )

        # Create 2 redemptions this month
        event = event_factory(client=client)
        for _ in range(2):
            VIPRewardRedemption.objects.create(
                client_vip_status=status,
                benefit=benefit,
                event=event,
                status='APPLIED'
            )

        is_eligible, reason = VIPService.check_benefit_eligibility(client, benefit)

        assert is_eligible is False
        assert "Monthly limit" in reason


# =============================================================================
# VIPPointsService Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPPointsServiceAwardPointsForPayment:
    """Tests for VIPPointsService.award_points_for_payment()."""

    @pytest.fixture
    def setup_vip(self, user_factory, event_factory, payment_factory):
        """Setup VIP status and related objects."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_points_enabled = True
        settings.points_per_currency_spent = Decimal('1.00')
        settings.points_currency_unit = Decimal('100.00')
        settings.save()

        tier = VIPTier.objects.create(name="Standard", level=0, is_default=True)
        client = user_factory(role='CLIENT')
        event = event_factory(client=client)
        payment = payment_factory(event=event, amount=Decimal('5000.00'))

        return client, event, payment, tier

    def test_awards_points_for_payment(self, setup_vip):
        """Test awards points based on payment amount."""
        client, event, payment, tier = setup_vip

        transaction = VIPPointsService.award_points_for_payment(payment)

        assert transaction is not None
        assert transaction.points == 50  # 5000 / 100 * 1 = 50 points
        assert transaction.transaction_type == 'EARNED_PAYMENT'

    def test_updates_client_balance(self, setup_vip):
        """Test updates client points balance."""
        client, event, payment, tier = setup_vip

        VIPPointsService.award_points_for_payment(payment)

        status = ClientVIPStatus.objects.get(client=client)
        assert status.points_balance == 50
        assert status.lifetime_points_earned == 50

    def test_returns_none_when_program_disabled(self, setup_vip):
        """Test returns None when VIP program disabled."""
        client, event, payment, tier = setup_vip
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = False
        settings.save()

        result = VIPPointsService.award_points_for_payment(payment)

        assert result is None

    def test_returns_none_when_points_disabled(self, setup_vip):
        """Test returns None when points earning disabled."""
        client, event, payment, tier = setup_vip
        settings = VIPSettings.get_settings()
        settings.earning_points_enabled = False
        settings.save()

        result = VIPPointsService.award_points_for_payment(payment)

        assert result is None

    def test_returns_none_for_payment_without_event(self, setup_vip):
        """Test returns None when payment has no event."""
        client, event, payment, tier = setup_vip
        payment.event = None
        payment.save()

        result = VIPPointsService.award_points_for_payment(payment)

        assert result is None


@pytest.mark.django_db
class TestVIPPointsServiceAwardBonusPoints:
    """Tests for VIPPointsService.award_bonus_points()."""

    def test_awards_bonus_points(self, user_factory):
        """Test awards bonus points to client."""
        VIPTier.objects.create(name="Standard", level=0, is_default=True)
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        transaction = VIPPointsService.award_bonus_points(
            client=client,
            points=100,
            description="Welcome bonus",
            performed_by=admin
        )

        assert transaction.points == 100
        assert transaction.transaction_type == 'EARNED_BONUS'
        assert transaction.performed_by == admin

    def test_updates_balance_and_lifetime(self, user_factory):
        """Test updates balance and lifetime earned."""
        VIPTier.objects.create(name="Standard", level=0, is_default=True)
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        VIPPointsService.award_bonus_points(client, 100, "Test", admin)

        status = ClientVIPStatus.objects.get(client=client)
        assert status.points_balance == 100
        assert status.lifetime_points_earned == 100


@pytest.mark.django_db
class TestVIPPointsServiceSpendPoints:
    """Tests for VIPPointsService.spend_points()."""

    @pytest.fixture
    def client_with_points(self, user_factory):
        """Create client with points balance."""
        VIPTier.objects.create(name="Standard", level=0, is_default=True)
        client = user_factory(role='CLIENT')
        status = VIPService.get_or_create_client_status(client)
        status.points_balance = 500
        status.save()
        return client, status

    def test_spends_points(self, client_with_points):
        """Test deducts points from balance."""
        client, status = client_with_points

        transaction = VIPPointsService.spend_points(
            client=client,
            points=100,
            description="Redeemed reward"
        )

        assert transaction.points == -100
        assert transaction.transaction_type == 'SPENT_REWARD'

    def test_updates_balance_and_lifetime_spent(self, client_with_points):
        """Test updates balance and lifetime spent."""
        client, status = client_with_points

        VIPPointsService.spend_points(client, 100, "Test")

        status.refresh_from_db()
        assert status.points_balance == 400
        assert status.lifetime_points_spent == 100

    def test_raises_error_for_insufficient_points(self, client_with_points):
        """Test raises error when insufficient points."""
        client, status = client_with_points

        with pytest.raises(ValueError) as exc_info:
            VIPPointsService.spend_points(client, 600, "Test")

        assert "Insufficient points" in str(exc_info.value)


@pytest.mark.django_db
class TestVIPPointsServiceAdjustPoints:
    """Tests for VIPPointsService.adjust_points()."""

    @pytest.fixture
    def client_with_points(self, user_factory):
        """Create client with points."""
        VIPTier.objects.create(name="Standard", level=0, is_default=True)
        client = user_factory(role='CLIENT')
        status = VIPService.get_or_create_client_status(client)
        status.points_balance = 200
        status.save()
        return client, status

    def test_positive_adjustment(self, client_with_points, user_factory):
        """Test positive point adjustment."""
        client, status = client_with_points
        admin = user_factory(admin=True)

        transaction = VIPPointsService.adjust_points(
            client=client,
            points=50,
            description="Correction",
            performed_by=admin
        )

        assert transaction.points == 50
        assert transaction.transaction_type == 'ADJUSTED'

        status.refresh_from_db()
        assert status.points_balance == 250

    def test_negative_adjustment(self, client_with_points, user_factory):
        """Test negative point adjustment."""
        client, status = client_with_points
        admin = user_factory(admin=True)

        transaction = VIPPointsService.adjust_points(
            client=client,
            points=-50,
            description="Correction",
            performed_by=admin
        )

        assert transaction.points == -50

        status.refresh_from_db()
        assert status.points_balance == 150

    def test_balance_cannot_go_negative(self, client_with_points, user_factory):
        """Test balance cannot go below zero."""
        client, status = client_with_points
        admin = user_factory(admin=True)

        VIPPointsService.adjust_points(client, -300, "Large adjustment", admin)

        status.refresh_from_db()
        assert status.points_balance == 0  # Capped at 0


# =============================================================================
# VIPPricingIntegrationService Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPPricingIntegrationServiceApplyBenefits:
    """Tests for VIPPricingIntegrationService.apply_vip_benefits_to_breakdown()."""

    @pytest.fixture
    def mock_breakdown(self):
        """Create mock pricing breakdown."""
        breakdown = Mock()
        breakdown.subtotal = Decimal('10000.00')
        breakdown.discount_amount = Decimal('0.00')
        breakdown.service_charge_amount = Decimal('500.00')
        breakdown.tax_amount = Decimal('1200.00')
        breakdown.total_amount = Decimal('11700.00')
        breakdown.line_items = []
        return breakdown

    @pytest.fixture
    def gold_tier_with_discount(self):
        """Create gold tier with percentage discount."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            application_mode='AUTOMATIC',
            is_active=True
        )
        return gold, benefit

    def test_applies_percentage_discount(self, user_factory, mock_breakdown, gold_tier_with_discount):
        """Test applies percentage discount to breakdown."""
        gold, _ = gold_tier_with_discount
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.save()

        result = VIPPricingIntegrationService.apply_vip_benefits_to_breakdown(
            mock_breakdown, client
        )

        # 10% of 10000 = 1000
        assert result.discount_amount == Decimal('1000.00')

    def test_applies_fixed_discount(self, user_factory, mock_breakdown):
        """Test applies fixed discount to breakdown."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='AUTOMATIC',
            is_active=True
        )
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.save()

        result = VIPPricingIntegrationService.apply_vip_benefits_to_breakdown(
            mock_breakdown, client
        )

        assert result.discount_amount == Decimal('500.00')

    def test_waives_service_charge(self, user_factory, mock_breakdown):
        """Test waives service charge."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        VIPBenefit.objects.create(
            tier=gold,
            benefit_type='WAIVE_SERVICE_CHARGE',
            application_mode='AUTOMATIC',
            is_active=True
        )
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.save()

        result = VIPPricingIntegrationService.apply_vip_benefits_to_breakdown(
            mock_breakdown, client
        )

        assert result.service_charge_amount == Decimal('0')

    def test_returns_unchanged_when_program_disabled(self, user_factory, mock_breakdown, gold_tier_with_discount):
        """Test returns unchanged breakdown when program disabled."""
        gold, _ = gold_tier_with_discount
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = False
        settings.save()

        result = VIPPricingIntegrationService.apply_vip_benefits_to_breakdown(
            mock_breakdown, client
        )

        assert result.discount_amount == Decimal('0.00')


@pytest.mark.django_db
class TestVIPPricingIntegrationServiceCalculateVIPDiscount:
    """Tests for VIPPricingIntegrationService.calculate_vip_discount()."""

    def test_calculates_percentage_discount(self, user_factory):
        """Test calculates percentage discount amount."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        VIPBenefit.objects.create(
            tier=gold,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            application_mode='AUTOMATIC',
            is_active=True
        )
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.save()

        discount, applied = VIPPricingIntegrationService.calculate_vip_discount(
            client, Decimal('10000.00')
        )

        assert discount == Decimal('1000.00')
        assert len(applied) == 1


@pytest.mark.django_db
class TestVIPPricingIntegrationServiceShouldWaiveFee:
    """Tests for VIPPricingIntegrationService.should_waive_fee()."""

    def test_waives_service_charge(self, user_factory):
        """Test returns True for waived service charge."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        VIPBenefit.objects.create(
            tier=gold,
            benefit_type='WAIVE_SERVICE_CHARGE',
            application_mode='AUTOMATIC',
            is_active=True
        )
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )

        result = VIPPricingIntegrationService.should_waive_fee(client, 'SERVICE_CHARGE')

        assert result is True

    def test_does_not_waive_when_no_benefit(self, user_factory):
        """Test returns False when no waive benefit."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )

        result = VIPPricingIntegrationService.should_waive_fee(client, 'SERVICE_CHARGE')

        assert result is False

    def test_unknown_fee_type_returns_false(self, user_factory):
        """Test returns False for unknown fee type."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )

        result = VIPPricingIntegrationService.should_waive_fee(client, 'UNKNOWN_FEE')

        assert result is False


# =============================================================================
# VIPRedemptionService Tests
# =============================================================================

@pytest.mark.django_db
class TestVIPRedemptionServiceRedeemBenefit:
    """Tests for VIPRedemptionService.redeem_benefit()."""

    @pytest.fixture
    def redemption_setup(self, user_factory, event_factory):
        """Setup for redemption tests."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            points_cost=100,
            is_active=True
        )
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE',
            points_balance=500
        )
        event = event_factory(client=client)
        return client, benefit, event

    def test_redeems_benefit(self, redemption_setup):
        """Test creates redemption record."""
        client, benefit, event = redemption_setup

        redemption = VIPRedemptionService.redeem_benefit(client, benefit, event)

        assert redemption is not None
        assert redemption.status == 'PENDING'
        assert redemption.points_spent == 100
        assert redemption.benefit == benefit
        assert redemption.event == event

    def test_deducts_points_for_redemption(self, redemption_setup):
        """Test deducts points when redeeming."""
        client, benefit, event = redemption_setup

        VIPRedemptionService.redeem_benefit(client, benefit, event)

        status = ClientVIPStatus.objects.get(client=client)
        assert status.points_balance == 400

    def test_raises_error_when_not_eligible(self, user_factory, event_factory):
        """Test raises error when client not eligible."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        silver = VIPTier.objects.create(name="Silver", level=1)
        benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            points_cost=100,
            is_active=True
        )
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=silver,  # Wrong tier
            status='ACTIVE',
            points_balance=500
        )
        event = event_factory(client=client)

        with pytest.raises(ValueError) as exc_info:
            VIPRedemptionService.redeem_benefit(client, benefit, event)

        assert "Cannot redeem benefit" in str(exc_info.value)


@pytest.mark.django_db
class TestVIPRedemptionServiceApplyRedemption:
    """Tests for VIPRedemptionService.apply_redemption()."""

    def test_marks_redemption_as_applied(self, user_factory, event_factory):
        """Test marks redemption as applied."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            is_active=True
        )
        client = user_factory(role='CLIENT')
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE'
        )
        event = event_factory(client=client)
        redemption = VIPRewardRedemption.objects.create(
            client_vip_status=status,
            benefit=benefit,
            event=event,
            status='PENDING'
        )

        VIPRedemptionService.apply_redemption(redemption, Decimal('500.00'))

        redemption.refresh_from_db()
        assert redemption.status == 'APPLIED'
        assert redemption.value_applied == Decimal('500.00')
        assert redemption.applied_at is not None


@pytest.mark.django_db
class TestVIPRedemptionServiceCancelRedemption:
    """Tests for VIPRedemptionService.cancel_redemption()."""

    def test_cancels_redemption_and_refunds_points(self, user_factory, event_factory):
        """Test cancels redemption and refunds points."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            points_cost=100,
            is_active=True
        )
        client = user_factory(role='CLIENT')
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE',
            points_balance=400,
            lifetime_points_spent=100
        )
        event = event_factory(client=client)
        redemption = VIPRewardRedemption.objects.create(
            client_vip_status=status,
            benefit=benefit,
            event=event,
            status='PENDING',
            points_spent=100
        )

        VIPRedemptionService.cancel_redemption(redemption)

        redemption.refresh_from_db()
        assert redemption.status == 'CANCELLED'

        status.refresh_from_db()
        assert status.points_balance == 500  # Refunded

    def test_no_op_if_already_cancelled(self, user_factory, event_factory):
        """Test does nothing if already cancelled."""
        gold = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=gold,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            is_active=True
        )
        client = user_factory(role='CLIENT')
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            status='ACTIVE',
            points_balance=400
        )
        event = event_factory(client=client)
        redemption = VIPRewardRedemption.objects.create(
            client_vip_status=status,
            benefit=benefit,
            event=event,
            status='CANCELLED',
            points_spent=100
        )

        VIPRedemptionService.cancel_redemption(redemption)

        status.refresh_from_db()
        assert status.points_balance == 400  # Unchanged
