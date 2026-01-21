"""
Unit tests for VIP domain models.

Tests:
- VIPSettings model (singleton pattern, program configuration)
- VIPTier model (tier hierarchy, slug generation, default tier)
- VIPBenefit model (benefit types, validation)
- ClientVIPStatus model (client status tracking, properties)
- VIPPointTransaction model (points ledger)
- VIPRewardRedemption model (benefit redemptions)
- VIPTierHistory model (tier change audit trail)
"""

import pytest
from decimal import Decimal
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


@pytest.mark.django_db
class TestVIPSettings:
    """Unit tests for the VIPSettings model (singleton)."""

    def test_get_settings_creates_singleton(self):
        """Test get_settings creates singleton instance on first call."""
        settings = VIPSettings.get_settings()

        assert settings.pk == 1
        assert settings.is_program_enabled is True
        assert settings.program_name == "VIP Program"

    def test_get_settings_returns_same_instance(self):
        """Test get_settings returns same instance on subsequent calls."""
        settings1 = VIPSettings.get_settings()
        settings2 = VIPSettings.get_settings()

        assert settings1.pk == settings2.pk

    def test_settings_string_representation(self):
        """Test VIPSettings __str__ shows enabled status."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.save()

        assert str(settings) == "VIP Settings (Program: Enabled)"

    def test_settings_string_representation_disabled(self):
        """Test VIPSettings __str__ shows disabled status."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = False
        settings.save()

        assert str(settings) == "VIP Settings (Program: Disabled)"

    def test_settings_default_values(self):
        """Test VIPSettings has correct default values."""
        settings = VIPSettings.get_settings()

        assert settings.earning_automatic_enabled is True
        assert settings.earning_points_enabled is False
        assert settings.earning_manual_enabled is True
        assert settings.automatic_earning_type == 'SPENDING'
        assert settings.points_per_currency_spent == Decimal('1.00')
        assert settings.points_currency_unit == Decimal('100.00')
        assert settings.points_expiry_months == 0
        assert settings.expiration_type == 'NEVER'
        assert settings.expiration_months == 12
        assert settings.show_vip_status_to_client is True
        assert settings.show_tier_progress_to_client is True
        assert settings.show_available_rewards_to_client is True
        assert settings.show_points_balance_to_client is True

    def test_save_always_uses_pk_1(self):
        """Test saving settings always forces pk=1 for singleton pattern."""
        settings = VIPSettings(pk=99, program_name="Test")
        settings.save()

        assert settings.pk == 1
        assert VIPSettings.objects.count() == 1


@pytest.mark.django_db
class TestVIPTier:
    """Unit tests for the VIPTier model."""

    def test_create_tier(self):
        """Test creating a VIP tier."""
        tier = VIPTier.objects.create(
            name="Gold",
            level=2,
            description="Gold tier benefits",
            color="#FFD700"
        )

        assert tier.name == "Gold"
        assert tier.level == 2
        assert tier.slug == "gold"
        assert tier.is_active is True

    def test_tier_string_representation(self):
        """Test VIPTier __str__ includes name and level."""
        tier = VIPTier.objects.create(name="Platinum", level=3)

        assert str(tier) == "Platinum (Level 3)"

    def test_auto_generate_slug(self):
        """Test slug is auto-generated from name."""
        tier = VIPTier.objects.create(name="VIP Member", level=1)

        assert tier.slug == "vip-member"

    def test_slug_uniqueness(self):
        """Test duplicate names get unique slugs."""
        tier1 = VIPTier.objects.create(name="Gold", level=1)
        tier2 = VIPTier.objects.create(name="Gold", level=2)

        assert tier1.slug == "gold"
        assert tier2.slug == "gold-1"

    def test_only_one_default_tier(self):
        """Test only one tier can be marked as default."""
        tier1 = VIPTier.objects.create(name="Standard", level=0, is_default=True)
        tier2 = VIPTier.objects.create(name="VIP", level=1, is_default=True)

        tier1.refresh_from_db()
        assert tier1.is_default is False
        assert tier2.is_default is True

    def test_tier_ordering(self):
        """Test tiers are ordered by level."""
        VIPTier.objects.create(name="Platinum", level=3)
        VIPTier.objects.create(name="Standard", level=0)
        VIPTier.objects.create(name="Gold", level=2)
        VIPTier.objects.create(name="Silver", level=1)

        tiers = list(VIPTier.objects.all())
        assert tiers[0].name == "Standard"
        assert tiers[1].name == "Silver"
        assert tiers[2].name == "Gold"
        assert tiers[3].name == "Platinum"

    def test_tier_level_is_unique(self):
        """Test tier level must be unique."""
        VIPTier.objects.create(name="Gold", level=1)

        with pytest.raises(Exception):  # IntegrityError
            VIPTier.objects.create(name="Silver", level=1)

    def test_tier_qualification_thresholds(self):
        """Test tier with spending and booking thresholds."""
        tier = VIPTier.objects.create(
            name="Gold",
            level=2,
            min_total_spent=Decimal('50000.00'),
            min_completed_bookings=5,
            min_points_required=1000
        )

        assert tier.min_total_spent == Decimal('50000.00')
        assert tier.min_completed_bookings == 5
        assert tier.min_points_required == 1000


@pytest.mark.django_db
class TestVIPBenefit:
    """Unit tests for the VIPBenefit model."""

    @pytest.fixture
    def gold_tier(self):
        """Create a gold tier for tests."""
        return VIPTier.objects.create(name="Gold", level=2)

    def test_create_percentage_discount_benefit(self, gold_tier):
        """Test creating a percentage discount benefit."""
        benefit = VIPBenefit.objects.create(
            tier=gold_tier,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            application_mode='AUTOMATIC'
        )

        assert benefit.tier == gold_tier
        assert benefit.benefit_type == 'PERCENTAGE_DISCOUNT'
        assert benefit.value == Decimal('10.00')
        assert benefit.application_mode == 'AUTOMATIC'

    def test_benefit_string_representation(self, gold_tier):
        """Test VIPBenefit __str__ shows tier and type."""
        benefit = VIPBenefit.objects.create(
            tier=gold_tier,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00')
        )

        assert str(benefit) == "Gold - Percentage Discount"

    def test_benefit_name_property_with_display_name(self, gold_tier):
        """Test name property returns display_name when set."""
        benefit = VIPBenefit.objects.create(
            tier=gold_tier,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            display_name="10% VIP Discount"
        )

        assert benefit.name == "10% VIP Discount"

    def test_benefit_name_property_without_display_name(self, gold_tier):
        """Test name property returns benefit type display when no display_name."""
        benefit = VIPBenefit.objects.create(
            tier=gold_tier,
            benefit_type='FREE_HOURS',
            value=Decimal('2.00')
        )

        assert benefit.name == "Free Excess Hours"

    def test_redeemable_benefit_with_points_cost(self, gold_tier):
        """Test creating a redeemable benefit with points cost."""
        benefit = VIPBenefit.objects.create(
            tier=gold_tier,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            points_cost=100
        )

        assert benefit.application_mode == 'REDEEMABLE'
        assert benefit.points_cost == 100

    def test_benefit_usage_limits(self, gold_tier):
        """Test benefit usage limits."""
        benefit = VIPBenefit.objects.create(
            tier=gold_tier,
            benefit_type='WAIVE_SERVICE_CHARGE',
            max_uses_per_booking=1,
            max_uses_per_month=3
        )

        assert benefit.max_uses_per_booking == 1
        assert benefit.max_uses_per_month == 3

    def test_benefit_ordering(self, gold_tier):
        """Test benefits are ordered by tier level then benefit type."""
        standard = VIPTier.objects.create(name="Standard", level=0)

        benefit1 = VIPBenefit.objects.create(
            tier=gold_tier,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('100.00')
        )
        benefit2 = VIPBenefit.objects.create(
            tier=standard,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('5.00')
        )

        benefits = list(VIPBenefit.objects.all())
        assert benefits[0] == benefit2  # Standard tier first (level 0)
        assert benefits[1] == benefit1  # Gold tier second (level 2)


@pytest.mark.django_db
class TestClientVIPStatus:
    """Unit tests for the ClientVIPStatus model."""

    @pytest.fixture
    def client_user(self, user_factory):
        """Create a client user."""
        return user_factory(role='CLIENT')

    @pytest.fixture
    def standard_tier(self):
        """Create a standard (default) tier."""
        return VIPTier.objects.create(name="Standard", level=0, is_default=True)

    @pytest.fixture
    def gold_tier(self):
        """Create a gold tier."""
        return VIPTier.objects.create(name="Gold", level=2)

    def test_create_client_vip_status(self, client_user, standard_tier):
        """Test creating a client VIP status."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=standard_tier
        )

        assert status.client == client_user
        assert status.current_tier == standard_tier
        assert status.points_balance == 0
        assert status.total_spent == Decimal('0.00')
        assert status.completed_bookings_count == 0
        assert status.status == 'ACTIVE'

    def test_vip_status_string_representation(self, client_user, gold_tier):
        """Test ClientVIPStatus __str__ shows client and tier."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold_tier
        )

        assert str(status) == f"{client_user.email} - Gold"

    def test_vip_status_string_representation_no_tier(self, client_user):
        """Test ClientVIPStatus __str__ handles no tier."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=None
        )

        assert str(status) == f"{client_user.email} - No Tier"

    def test_is_vip_property_true(self, client_user, gold_tier):
        """Test is_vip returns True for non-default active tier."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold_tier,
            status='ACTIVE'
        )

        assert status.is_vip is True

    def test_is_vip_property_false_for_default_tier(self, client_user, standard_tier):
        """Test is_vip returns False for default tier."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=standard_tier,
            status='ACTIVE'
        )

        assert status.is_vip is False

    def test_is_vip_property_false_for_expired_status(self, client_user, gold_tier):
        """Test is_vip returns False when status is EXPIRED."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold_tier,
            status='EXPIRED'
        )

        assert status.is_vip is False

    def test_is_vip_property_false_for_no_tier(self, client_user):
        """Test is_vip returns False when no tier assigned."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=None
        )

        assert status.is_vip is False

    def test_is_expired_property_true_for_expired_status(self, client_user, gold_tier):
        """Test is_expired returns True for EXPIRED status."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold_tier,
            status='EXPIRED'
        )

        assert status.is_expired is True

    @freeze_time('2024-01-15 10:00:00')
    def test_is_expired_property_true_for_past_expiration(self, client_user, gold_tier):
        """Test is_expired returns True when expires_at is in the past."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold_tier,
            status='ACTIVE',
            expires_at=timezone.now() - timedelta(days=1)
        )

        assert status.is_expired is True

    @freeze_time('2024-01-15 10:00:00')
    def test_is_expired_property_false_for_future_expiration(self, client_user, gold_tier):
        """Test is_expired returns False when expires_at is in the future."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold_tier,
            status='ACTIVE',
            expires_at=timezone.now() + timedelta(days=30)
        )

        assert status.is_expired is False

    def test_points_tracking(self, client_user, gold_tier):
        """Test points balance tracking fields."""
        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold_tier,
            points_balance=500,
            lifetime_points_earned=1000,
            lifetime_points_spent=500
        )

        assert status.points_balance == 500
        assert status.lifetime_points_earned == 1000
        assert status.lifetime_points_spent == 500

    def test_manual_assignment_tracking(self, client_user, gold_tier, user_factory):
        """Test manual assignment tracking fields."""
        admin = user_factory(admin=True)
        now = timezone.now()

        status = ClientVIPStatus.objects.create(
            client=client_user,
            current_tier=gold_tier,
            assigned_by=admin,
            assigned_at=now,
            assignment_reason="VIP customer"
        )

        assert status.assigned_by == admin
        assert status.assigned_at == now
        assert status.assignment_reason == "VIP customer"


@pytest.mark.django_db
class TestVIPPointTransaction:
    """Unit tests for the VIPPointTransaction model."""

    @pytest.fixture
    def client_vip_status(self, user_factory):
        """Create a client VIP status."""
        client = user_factory(role='CLIENT')
        tier = VIPTier.objects.create(name="Gold", level=2)
        return ClientVIPStatus.objects.create(
            client=client,
            current_tier=tier,
            points_balance=500
        )

    def test_create_earned_transaction(self, client_vip_status):
        """Test creating an earned points transaction."""
        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_vip_status,
            transaction_type='EARNED_PAYMENT',
            points=100,
            description="Earned from payment #PAY-2024-001",
            balance_after=600
        )

        assert transaction.points == 100
        assert transaction.transaction_type == 'EARNED_PAYMENT'
        assert transaction.balance_after == 600

    def test_create_spent_transaction(self, client_vip_status):
        """Test creating a spent points transaction."""
        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_vip_status,
            transaction_type='SPENT_REWARD',
            points=-100,
            description="Redeemed for VIP discount",
            balance_after=400
        )

        assert transaction.points == -100
        assert transaction.transaction_type == 'SPENT_REWARD'
        assert transaction.balance_after == 400

    def test_transaction_string_representation(self, client_vip_status):
        """Test VIPPointTransaction __str__ format."""
        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_vip_status,
            transaction_type='EARNED_BONUS',
            points=50,
            description="Welcome bonus",
            balance_after=550
        )

        expected = f"{client_vip_status.client.email}: +50 points (Bonus Points)"
        assert str(transaction) == expected

    def test_transaction_with_event_reference(self, client_vip_status, event_factory):
        """Test transaction with event reference."""
        event = event_factory(client=client_vip_status.client)
        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_vip_status,
            transaction_type='EARNED_BOOKING',
            points=200,
            description="Earned from booking",
            balance_after=700,
            event=event
        )

        assert transaction.event == event

    def test_transaction_with_admin_reference(self, client_vip_status, user_factory):
        """Test transaction with admin reference (manual adjustment)."""
        admin = user_factory(admin=True)
        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_vip_status,
            transaction_type='ADJUSTED',
            points=-50,
            description="Correction for error",
            balance_after=450,
            performed_by=admin
        )

        assert transaction.performed_by == admin

    def test_transactions_ordered_by_created_at_desc(self, client_vip_status):
        """Test transactions are ordered newest first."""
        VIPPointTransaction.objects.create(
            client_vip_status=client_vip_status,
            transaction_type='EARNED_BONUS',
            points=10,
            description="First",
            balance_after=510
        )
        VIPPointTransaction.objects.create(
            client_vip_status=client_vip_status,
            transaction_type='EARNED_BONUS',
            points=20,
            description="Second",
            balance_after=530
        )

        transactions = list(VIPPointTransaction.objects.all())
        assert transactions[0].points == 20  # Second (newest)
        assert transactions[1].points == 10  # First (oldest)


@pytest.mark.django_db
class TestVIPRewardRedemption:
    """Unit tests for the VIPRewardRedemption model."""

    @pytest.fixture
    def client_vip_status(self, user_factory):
        """Create a client VIP status."""
        client = user_factory(role='CLIENT')
        tier = VIPTier.objects.create(name="Gold", level=2)
        return ClientVIPStatus.objects.create(
            client=client,
            current_tier=tier,
            points_balance=500
        )

    @pytest.fixture
    def redeemable_benefit(self, client_vip_status):
        """Create a redeemable benefit."""
        return VIPBenefit.objects.create(
            tier=client_vip_status.current_tier,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            points_cost=100
        )

    def test_create_redemption(self, client_vip_status, redeemable_benefit, event_factory):
        """Test creating a reward redemption."""
        event = event_factory(client=client_vip_status.client)
        redemption = VIPRewardRedemption.objects.create(
            client_vip_status=client_vip_status,
            benefit=redeemable_benefit,
            event=event,
            status='PENDING',
            points_spent=100
        )

        assert redemption.status == 'PENDING'
        assert redemption.points_spent == 100
        assert redemption.benefit == redeemable_benefit

    def test_redemption_string_representation(
        self, client_vip_status, redeemable_benefit, event_factory
    ):
        """Test VIPRewardRedemption __str__ format."""
        event = event_factory(client=client_vip_status.client)
        redemption = VIPRewardRedemption.objects.create(
            client_vip_status=client_vip_status,
            benefit=redeemable_benefit,
            event=event,
            points_spent=100
        )

        expected = f"{client_vip_status.client.email} - {redeemable_benefit.name}"
        assert str(redemption) == expected

    def test_redemption_applied_status(
        self, client_vip_status, redeemable_benefit, event_factory
    ):
        """Test redemption can be marked as applied."""
        event = event_factory(client=client_vip_status.client)
        redemption = VIPRewardRedemption.objects.create(
            client_vip_status=client_vip_status,
            benefit=redeemable_benefit,
            event=event,
            status='APPLIED',
            points_spent=100,
            value_applied=Decimal('500.00'),
            applied_at=timezone.now()
        )

        assert redemption.status == 'APPLIED'
        assert redemption.value_applied == Decimal('500.00')
        assert redemption.applied_at is not None


@pytest.mark.django_db
class TestVIPTierHistory:
    """Unit tests for the VIPTierHistory model."""

    @pytest.fixture
    def client_vip_status(self, user_factory):
        """Create a client VIP status."""
        client = user_factory(role='CLIENT')
        return ClientVIPStatus.objects.create(client=client)

    @pytest.fixture
    def standard_tier(self):
        """Create standard tier."""
        return VIPTier.objects.create(name="Standard", level=0, is_default=True)

    @pytest.fixture
    def gold_tier(self):
        """Create gold tier."""
        return VIPTier.objects.create(name="Gold", level=2)

    def test_create_tier_history(self, client_vip_status, standard_tier, gold_tier):
        """Test creating tier history entry."""
        history = VIPTierHistory.objects.create(
            client_vip_status=client_vip_status,
            from_tier=standard_tier,
            to_tier=gold_tier,
            reason='AUTOMATIC_UPGRADE',
            notes="Upgraded based on spending threshold"
        )

        assert history.from_tier == standard_tier
        assert history.to_tier == gold_tier
        assert history.reason == 'AUTOMATIC_UPGRADE'

    def test_tier_history_string_representation(
        self, client_vip_status, standard_tier, gold_tier
    ):
        """Test VIPTierHistory __str__ format."""
        history = VIPTierHistory.objects.create(
            client_vip_status=client_vip_status,
            from_tier=standard_tier,
            to_tier=gold_tier,
            reason='AUTOMATIC_UPGRADE'
        )

        expected = f"{client_vip_status.client.email}: Standard -> Gold"
        assert str(history) == expected

    def test_tier_history_initial_assignment(self, client_vip_status, gold_tier):
        """Test tier history for initial assignment."""
        history = VIPTierHistory.objects.create(
            client_vip_status=client_vip_status,
            from_tier=None,
            to_tier=gold_tier,
            reason='INITIAL'
        )

        expected = f"{client_vip_status.client.email}: None -> Gold"
        assert str(history) == expected

    def test_tier_history_with_admin(
        self, client_vip_status, standard_tier, gold_tier, user_factory
    ):
        """Test tier history with admin who made change."""
        admin = user_factory(admin=True)
        history = VIPTierHistory.objects.create(
            client_vip_status=client_vip_status,
            from_tier=standard_tier,
            to_tier=gold_tier,
            reason='MANUAL_ASSIGNMENT',
            notes="VIP customer request",
            changed_by=admin
        )

        assert history.changed_by == admin

    def test_tier_history_ordering(self, client_vip_status, standard_tier, gold_tier):
        """Test tier history is ordered newest first."""
        history1 = VIPTierHistory.objects.create(
            client_vip_status=client_vip_status,
            from_tier=None,
            to_tier=standard_tier,
            reason='INITIAL'
        )
        history2 = VIPTierHistory.objects.create(
            client_vip_status=client_vip_status,
            from_tier=standard_tier,
            to_tier=gold_tier,
            reason='AUTOMATIC_UPGRADE'
        )

        histories = list(VIPTierHistory.objects.all())
        assert histories[0] == history2  # Newest first
        assert histories[1] == history1
