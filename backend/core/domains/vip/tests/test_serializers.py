"""
Unit tests for VIP domain serializers.

Tests:
- VIPSettingsSerializer
- VIPTierSerializer
- VIPTierListSerializer
- VIPBenefitSerializer
- ClientVIPStatusSerializer
- ClientVIPStatusListSerializer
- VIPPointTransactionSerializer
- VIPRewardRedemptionSerializer
- VIPTierHistorySerializer
- ClientVIPStatusPublicSerializer
- VIPBenefitPublicSerializer
- Action serializers (AssignTierSerializer, AwardPointsSerializer, etc.)
"""

import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

from core.domains.vip.models import (
    VIPSettings,
    VIPTier,
    VIPBenefit,
    ClientVIPStatus,
    VIPPointTransaction,
    VIPRewardRedemption,
    VIPTierHistory,
)
from core.domains.vip.serializers import (
    VIPSettingsSerializer,
    VIPTierSerializer,
    VIPTierListSerializer,
    VIPBenefitSerializer,
    ClientVIPStatusSerializer,
    ClientVIPStatusListSerializer,
    VIPPointTransactionSerializer,
    VIPRewardRedemptionSerializer,
    VIPTierHistorySerializer,
    ClientVIPStatusPublicSerializer,
    VIPBenefitPublicSerializer,
    AssignTierSerializer,
    AwardPointsSerializer,
    AdjustPointsSerializer,
    RedeemBenefitSerializer,
)


@pytest.mark.django_db
class TestVIPSettingsSerializer:
    """Tests for VIPSettingsSerializer."""

    def test_serialize_settings(self):
        """Test serializing VIP settings."""
        settings = VIPSettings.get_settings()
        serializer = VIPSettingsSerializer(settings)
        data = serializer.data

        assert data['is_program_enabled'] is True
        assert data['program_name'] == "VIP Program"
        assert data['earning_automatic_enabled'] is True
        assert data['earning_points_enabled'] is False
        assert data['automatic_earning_type'] == 'SPENDING'
        assert data['expiration_type'] == 'NEVER'

    def test_deserialize_settings(self):
        """Test updating VIP settings via serializer."""
        settings = VIPSettings.get_settings()
        serializer = VIPSettingsSerializer(
            settings,
            data={
                'program_name': 'Elite Program',
                'earning_points_enabled': True,
                'points_per_currency_spent': '2.00'
            },
            partial=True
        )

        assert serializer.is_valid()
        updated = serializer.save()

        assert updated.program_name == 'Elite Program'
        assert updated.earning_points_enabled is True
        assert updated.points_per_currency_spent == Decimal('2.00')

    def test_read_only_fields(self):
        """Test read-only fields cannot be set."""
        settings = VIPSettings.get_settings()
        serializer = VIPSettingsSerializer(
            settings,
            data={'id': 999, 'created_at': '2020-01-01T00:00:00Z'},
            partial=True
        )

        assert serializer.is_valid()
        updated = serializer.save()
        assert updated.pk == 1  # ID unchanged


@pytest.mark.django_db
class TestVIPTierSerializer:
    """Tests for VIPTierSerializer."""

    def test_serialize_tier(self):
        """Test serializing a VIP tier."""
        tier = VIPTier.objects.create(
            name="Gold",
            level=2,
            description="Gold tier benefits",
            min_total_spent=Decimal('50000.00'),
            color="#FFD700"
        )
        serializer = VIPTierSerializer(tier)
        data = serializer.data

        assert data['name'] == "Gold"
        assert data['slug'] == "gold"
        assert data['level'] == 2
        assert data['min_total_spent'] == '50000.00'
        assert data['color'] == "#FFD700"
        assert data['benefits_count'] == 0
        assert data['members_count'] == 0

    def test_serialize_tier_with_benefits_and_members(self, user_factory):
        """Test benefits_count and members_count computed fields."""
        tier = VIPTier.objects.create(name="Gold", level=2)

        # Add benefits
        VIPBenefit.objects.create(
            tier=tier,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            is_active=True
        )
        VIPBenefit.objects.create(
            tier=tier,
            benefit_type='FREE_HOURS',
            value=Decimal('2.00'),
            is_active=False  # Inactive - shouldn't count
        )

        # Add members
        client = user_factory(role='CLIENT')
        ClientVIPStatus.objects.create(
            client=client,
            current_tier=tier,
            status='ACTIVE'
        )

        serializer = VIPTierSerializer(tier)
        data = serializer.data

        assert data['benefits_count'] == 1  # Only active benefit
        assert data['members_count'] == 1

    def test_deserialize_tier_creates_slug(self):
        """Test creating tier generates slug from name."""
        serializer = VIPTierSerializer(data={
            'name': 'VIP Elite',
            'level': 3,
        })

        assert serializer.is_valid(), serializer.errors
        tier = serializer.save()

        assert tier.slug == 'vip-elite'

    def test_validate_unique_level(self):
        """Test level validation for uniqueness."""
        VIPTier.objects.create(name="Gold", level=2)

        serializer = VIPTierSerializer(data={
            'name': 'Silver',
            'level': 2,  # Same level
        })

        assert not serializer.is_valid()
        assert 'level' in serializer.errors

    def test_update_tier_preserves_slug_uniqueness(self):
        """Test updating tier name generates unique slug."""
        tier1 = VIPTier.objects.create(name="Gold", level=1)
        tier2 = VIPTier.objects.create(name="Premium", level=2)

        serializer = VIPTierSerializer(tier2, data={'name': 'Gold'}, partial=True)
        assert serializer.is_valid()
        updated = serializer.save()

        assert updated.slug == 'gold-1'  # Unique slug generated


@pytest.mark.django_db
class TestVIPTierListSerializer:
    """Tests for VIPTierListSerializer (lightweight)."""

    def test_serialize_tier_list(self):
        """Test lightweight tier serialization for dropdowns."""
        tier = VIPTier.objects.create(
            name="Gold",
            level=2,
            color="#FFD700",
            is_default=False
        )

        serializer = VIPTierListSerializer(tier)
        data = serializer.data

        assert data == {
            'id': tier.id,
            'name': 'Gold',
            'level': 2,
            'color': '#FFD700',
            'is_default': False,
        }


@pytest.mark.django_db
class TestVIPBenefitSerializer:
    """Tests for VIPBenefitSerializer."""

    @pytest.fixture
    def gold_tier(self):
        """Create gold tier."""
        return VIPTier.objects.create(name="Gold", level=2)

    def test_serialize_benefit(self, gold_tier):
        """Test serializing a VIP benefit."""
        benefit = VIPBenefit.objects.create(
            tier=gold_tier,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            application_mode='AUTOMATIC',
            display_name='10% VIP Discount'
        )

        serializer = VIPBenefitSerializer(benefit)
        data = serializer.data

        assert data['tier'] == gold_tier.id
        assert data['tier_name'] == 'Gold'
        assert data['benefit_type'] == 'PERCENTAGE_DISCOUNT'
        assert data['benefit_type_display'] == 'Percentage Discount'
        assert data['application_mode'] == 'AUTOMATIC'
        assert data['application_mode_display'] == 'Apply Automatically'
        assert data['value'] == '10.00'
        assert data['display_name'] == '10% VIP Discount'

    def test_deserialize_percentage_discount_requires_value(self, gold_tier):
        """Test percentage discount requires a value."""
        serializer = VIPBenefitSerializer(data={
            'tier': gold_tier.id,
            'benefit_type': 'PERCENTAGE_DISCOUNT',
            # Missing value
        })

        assert not serializer.is_valid()
        assert 'value' in serializer.errors

    def test_deserialize_percentage_discount_validates_range(self, gold_tier):
        """Test percentage discount must be 0-100."""
        serializer = VIPBenefitSerializer(data={
            'tier': gold_tier.id,
            'benefit_type': 'PERCENTAGE_DISCOUNT',
            'value': '150.00',  # Invalid: > 100
        })

        assert not serializer.is_valid()
        assert 'value' in serializer.errors

    def test_deserialize_fixed_discount_requires_value(self, gold_tier):
        """Test fixed discount requires a value."""
        serializer = VIPBenefitSerializer(data={
            'tier': gold_tier.id,
            'benefit_type': 'FIXED_DISCOUNT',
            # Missing value
        })

        assert not serializer.is_valid()
        assert 'value' in serializer.errors

    def test_deserialize_waive_fee_no_value_required(self, gold_tier):
        """Test waive fee benefits don't require value."""
        serializer = VIPBenefitSerializer(data={
            'tier': gold_tier.id,
            'benefit_type': 'WAIVE_SERVICE_CHARGE',
            # No value needed
        })

        assert serializer.is_valid(), serializer.errors

    def test_valid_percentage_discount(self, gold_tier):
        """Test valid percentage discount benefit creation."""
        serializer = VIPBenefitSerializer(data={
            'tier': gold_tier.id,
            'benefit_type': 'PERCENTAGE_DISCOUNT',
            'value': '15.00',
            'application_mode': 'AUTOMATIC',
        })

        assert serializer.is_valid(), serializer.errors
        benefit = serializer.save()
        assert benefit.value == Decimal('15.00')


@pytest.mark.django_db
class TestClientVIPStatusSerializer:
    """Tests for ClientVIPStatusSerializer."""

    @pytest.fixture
    def gold_tier(self):
        """Create gold tier."""
        return VIPTier.objects.create(name="Gold", level=2, color="#FFD700")

    @pytest.fixture
    def client_status(self, user_factory, gold_tier):
        """Create client VIP status."""
        client = user_factory(
            email='john@example.com',
            first_name='John',
            last_name='Doe',
            role='CLIENT'
        )
        admin = user_factory(admin=True)
        return ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold_tier,
            points_balance=500,
            lifetime_points_earned=1000,
            lifetime_points_spent=500,
            total_spent=Decimal('50000.00'),
            completed_bookings_count=10,
            status='ACTIVE',
            assigned_by=admin,
            assigned_at=timezone.now(),
            assignment_reason="VIP customer"
        )

    def test_serialize_client_status(self, client_status):
        """Test serializing client VIP status."""
        serializer = ClientVIPStatusSerializer(client_status)
        data = serializer.data

        assert data['client_email'] == 'john@example.com'
        assert data['client_name'] == 'John Doe'
        assert data['current_tier_name'] == 'Gold'
        assert data['points_balance'] == 500
        assert data['total_spent'] == '50000.00'
        assert data['completed_bookings_count'] == 10
        assert data['status'] == 'ACTIVE'
        assert data['status_display'] == 'Active'
        assert data['is_vip'] is True

    def test_client_name_falls_back_to_email(self, user_factory, gold_tier):
        """Test client_name returns email when no name set."""
        client = user_factory(
            email='noname@example.com',
            first_name='',
            last_name='',
            role='CLIENT'
        )
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold_tier
        )

        serializer = ClientVIPStatusSerializer(status)
        assert serializer.data['client_name'] == 'noname@example.com'


@pytest.mark.django_db
class TestClientVIPStatusListSerializer:
    """Tests for ClientVIPStatusListSerializer (lightweight)."""

    def test_serialize_status_list(self, user_factory):
        """Test lightweight status serialization for lists."""
        tier = VIPTier.objects.create(name="Gold", level=2, color="#FFD700")
        client = user_factory(
            email='john@example.com',
            first_name='John',
            last_name='Doe',
            role='CLIENT'
        )
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=tier,
            points_balance=500,
            total_spent=Decimal('50000.00'),
            completed_bookings_count=10
        )

        serializer = ClientVIPStatusListSerializer(status)
        data = serializer.data

        assert data['client_email'] == 'john@example.com'
        assert data['client_name'] == 'John Doe'
        assert data['current_tier_name'] == 'Gold'
        assert data['tier_color'] == '#FFD700'
        assert data['points_balance'] == 500
        assert data['status'] == 'ACTIVE'


@pytest.mark.django_db
class TestVIPPointTransactionSerializer:
    """Tests for VIPPointTransactionSerializer."""

    def test_serialize_transaction(self, user_factory):
        """Test serializing point transaction."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        tier = VIPTier.objects.create(name="Gold", level=2)
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=tier,
            points_balance=500
        )

        transaction = VIPPointTransaction.objects.create(
            client_vip_status=status,
            transaction_type='EARNED_BONUS',
            points=100,
            description="Welcome bonus",
            balance_after=600,
            performed_by=admin
        )

        serializer = VIPPointTransactionSerializer(transaction)
        data = serializer.data

        assert data['transaction_type'] == 'EARNED_BONUS'
        assert data['transaction_type_display'] == 'Bonus Points'
        assert data['points'] == 100
        assert data['balance_after'] == 600
        assert data['client_email'] == client.email
        assert data['performed_by_email'] == admin.email


@pytest.mark.django_db
class TestVIPRewardRedemptionSerializer:
    """Tests for VIPRewardRedemptionSerializer."""

    def test_serialize_redemption(self, user_factory, event_factory):
        """Test serializing reward redemption."""
        tier = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=tier,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            display_name="$500 VIP Discount"
        )

        client = user_factory(role='CLIENT')
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=tier
        )
        event = event_factory(client=client)

        redemption = VIPRewardRedemption.objects.create(
            client_vip_status=status,
            benefit=benefit,
            event=event,
            status='APPLIED',
            points_spent=100,
            value_applied=Decimal('500.00')
        )

        serializer = VIPRewardRedemptionSerializer(redemption)
        data = serializer.data

        assert data['benefit_name'] == '$500 VIP Discount'
        assert data['benefit_type'] == 'FIXED_DISCOUNT'
        assert data['status'] == 'APPLIED'
        assert data['status_display'] == 'Applied'
        assert data['points_spent'] == 100
        assert data['value_applied'] == '500.00'


@pytest.mark.django_db
class TestVIPTierHistorySerializer:
    """Tests for VIPTierHistorySerializer."""

    def test_serialize_tier_history(self, user_factory):
        """Test serializing tier history."""
        standard = VIPTier.objects.create(name="Standard", level=0, is_default=True)
        gold = VIPTier.objects.create(name="Gold", level=2)

        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold
        )

        history = VIPTierHistory.objects.create(
            client_vip_status=status,
            from_tier=standard,
            to_tier=gold,
            reason='MANUAL_ASSIGNMENT',
            notes='VIP customer request',
            changed_by=admin
        )

        serializer = VIPTierHistorySerializer(history)
        data = serializer.data

        assert data['from_tier_name'] == 'Standard'
        assert data['to_tier_name'] == 'Gold'
        assert data['reason'] == 'MANUAL_ASSIGNMENT'
        assert data['reason_display'] == 'Manual Assignment'
        assert data['changed_by_email'] == admin.email


@pytest.mark.django_db
class TestClientVIPStatusPublicSerializer:
    """Tests for ClientVIPStatusPublicSerializer (client portal)."""

    @pytest.fixture
    def setup_tiers(self):
        """Create tier hierarchy."""
        standard = VIPTier.objects.create(
            name="Standard",
            level=0,
            is_default=True
        )
        silver = VIPTier.objects.create(
            name="Silver",
            level=1,
            min_total_spent=Decimal('10000.00'),
            min_completed_bookings=3
        )
        gold = VIPTier.objects.create(
            name="Gold",
            level=2,
            min_total_spent=Decimal('50000.00'),
            min_completed_bookings=10,
            min_points_required=500
        )
        return standard, silver, gold

    def test_serialize_public_status(self, user_factory, setup_tiers):
        """Test public status serialization for client portal."""
        standard, silver, gold = setup_tiers
        client = user_factory(role='CLIENT')
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=silver,
            points_balance=200,
            total_spent=Decimal('25000.00'),
            completed_bookings_count=5
        )

        # Add benefit to silver tier
        VIPBenefit.objects.create(
            tier=silver,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('5.00'),
            is_active=True
        )

        serializer = ClientVIPStatusPublicSerializer(status)
        data = serializer.data

        assert data['current_tier']['name'] == 'Silver'
        assert data['points_balance'] == 200
        assert data['total_spent'] == '25000.00'
        assert len(data['benefits']) == 1
        assert data['next_tier']['name'] == 'Gold'

    def test_progress_to_next_tier(self, user_factory, setup_tiers):
        """Test progress calculation toward next tier."""
        standard, silver, gold = setup_tiers
        client = user_factory(role='CLIENT')
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=silver,
            points_balance=250,
            total_spent=Decimal('25000.00'),
            completed_bookings_count=5
        )

        serializer = ClientVIPStatusPublicSerializer(status)
        data = serializer.data

        progress = data['progress_to_next_tier']
        assert progress['spending']['current'] == 25000.00
        assert progress['spending']['required'] == 50000.00
        assert progress['spending']['percentage'] == 50.0

        assert progress['bookings']['current'] == 5
        assert progress['bookings']['required'] == 10
        assert progress['bookings']['percentage'] == 50.0

        assert progress['points']['current'] == 250
        assert progress['points']['required'] == 500
        assert progress['points']['percentage'] == 50.0

    def test_no_next_tier_at_highest_level(self, user_factory, setup_tiers):
        """Test no next tier when at highest level."""
        standard, silver, gold = setup_tiers
        client = user_factory(role='CLIENT')
        status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=gold,
            total_spent=Decimal('100000.00')
        )

        serializer = ClientVIPStatusPublicSerializer(status)
        data = serializer.data

        assert data['next_tier'] is None
        assert data['progress_to_next_tier'] is None


@pytest.mark.django_db
class TestVIPBenefitPublicSerializer:
    """Tests for VIPBenefitPublicSerializer (client-facing)."""

    def test_serialize_public_benefit(self):
        """Test public benefit serialization."""
        tier = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=tier,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            application_mode='AUTOMATIC',
            display_name='10% VIP Discount',
            description='Get 10% off all bookings',
            points_cost=0
        )

        serializer = VIPBenefitPublicSerializer(benefit)
        data = serializer.data

        assert data['benefit_type'] == 'PERCENTAGE_DISCOUNT'
        assert data['benefit_type_display'] == 'Percentage Discount'
        assert data['value'] == '10.00'
        assert data['display_name'] == '10% VIP Discount'
        assert data['points_cost'] == 0
        # Should not include internal fields like tier, tier_name, etc.
        assert 'tier' not in data
        assert 'tier_name' not in data


@pytest.mark.django_db
class TestAssignTierSerializer:
    """Tests for AssignTierSerializer (action serializer)."""

    def test_valid_tier_assignment(self):
        """Test valid tier assignment data."""
        tier = VIPTier.objects.create(name="Gold", level=2, is_active=True)

        serializer = AssignTierSerializer(data={
            'tier_id': tier.id,
            'reason': 'VIP customer request'
        })

        assert serializer.is_valid()
        assert serializer.validated_data['tier_id'] == tier.id
        assert serializer.validated_data['reason'] == 'VIP customer request'

    def test_invalid_tier_id(self):
        """Test invalid tier ID validation."""
        serializer = AssignTierSerializer(data={
            'tier_id': 99999,  # Non-existent
        })

        assert not serializer.is_valid()
        assert 'tier_id' in serializer.errors

    def test_inactive_tier_rejected(self):
        """Test inactive tier is rejected."""
        tier = VIPTier.objects.create(name="Gold", level=2, is_active=False)

        serializer = AssignTierSerializer(data={
            'tier_id': tier.id,
        })

        assert not serializer.is_valid()
        assert 'tier_id' in serializer.errors

    def test_reason_is_optional(self):
        """Test reason field is optional."""
        tier = VIPTier.objects.create(name="Gold", level=2, is_active=True)

        serializer = AssignTierSerializer(data={
            'tier_id': tier.id,
        })

        assert serializer.is_valid()


@pytest.mark.django_db
class TestAwardPointsSerializer:
    """Tests for AwardPointsSerializer (action serializer)."""

    def test_valid_award_points(self):
        """Test valid award points data."""
        serializer = AwardPointsSerializer(data={
            'points': 100,
            'description': 'Welcome bonus'
        })

        assert serializer.is_valid()
        assert serializer.validated_data['points'] == 100
        assert serializer.validated_data['description'] == 'Welcome bonus'

    def test_points_must_be_positive(self):
        """Test points must be at least 1."""
        serializer = AwardPointsSerializer(data={
            'points': 0,
            'description': 'Test'
        })

        assert not serializer.is_valid()
        assert 'points' in serializer.errors

    def test_negative_points_rejected(self):
        """Test negative points are rejected."""
        serializer = AwardPointsSerializer(data={
            'points': -50,
            'description': 'Test'
        })

        assert not serializer.is_valid()
        assert 'points' in serializer.errors

    def test_description_required(self):
        """Test description is required."""
        serializer = AwardPointsSerializer(data={
            'points': 100,
        })

        assert not serializer.is_valid()
        assert 'description' in serializer.errors


@pytest.mark.django_db
class TestAdjustPointsSerializer:
    """Tests for AdjustPointsSerializer (action serializer)."""

    def test_valid_positive_adjustment(self):
        """Test valid positive point adjustment."""
        serializer = AdjustPointsSerializer(data={
            'points': 50,
            'description': 'Correction'
        })

        assert serializer.is_valid()

    def test_valid_negative_adjustment(self):
        """Test valid negative point adjustment."""
        serializer = AdjustPointsSerializer(data={
            'points': -50,
            'description': 'Correction for error'
        })

        assert serializer.is_valid()
        assert serializer.validated_data['points'] == -50

    def test_zero_adjustment_rejected(self):
        """Test zero adjustment is rejected."""
        serializer = AdjustPointsSerializer(data={
            'points': 0,
            'description': 'No change'
        })

        assert not serializer.is_valid()
        assert 'points' in serializer.errors


@pytest.mark.django_db
class TestRedeemBenefitSerializer:
    """Tests for RedeemBenefitSerializer (action serializer)."""

    def test_valid_redemption(self, event_factory):
        """Test valid benefit redemption data."""
        tier = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=tier,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            is_active=True
        )
        event = event_factory()

        serializer = RedeemBenefitSerializer(data={
            'benefit_id': benefit.id,
            'event_id': event.id
        })

        assert serializer.is_valid()

    def test_invalid_benefit_id(self, event_factory):
        """Test invalid benefit ID."""
        event = event_factory()

        serializer = RedeemBenefitSerializer(data={
            'benefit_id': 99999,
            'event_id': event.id
        })

        assert not serializer.is_valid()
        assert 'benefit_id' in serializer.errors

    def test_automatic_benefit_rejected(self, event_factory):
        """Test automatic (non-redeemable) benefit is rejected."""
        tier = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=tier,
            benefit_type='PERCENTAGE_DISCOUNT',
            value=Decimal('10.00'),
            application_mode='AUTOMATIC',  # Not redeemable
            is_active=True
        )
        event = event_factory()

        serializer = RedeemBenefitSerializer(data={
            'benefit_id': benefit.id,
            'event_id': event.id
        })

        assert not serializer.is_valid()
        assert 'benefit_id' in serializer.errors

    def test_inactive_benefit_rejected(self, event_factory):
        """Test inactive benefit is rejected."""
        tier = VIPTier.objects.create(name="Gold", level=2)
        benefit = VIPBenefit.objects.create(
            tier=tier,
            benefit_type='FIXED_DISCOUNT',
            value=Decimal('500.00'),
            application_mode='REDEEMABLE',
            is_active=False  # Inactive
        )
        event = event_factory()

        serializer = RedeemBenefitSerializer(data={
            'benefit_id': benefit.id,
            'event_id': event.id
        })

        assert not serializer.is_valid()
        assert 'benefit_id' in serializer.errors
