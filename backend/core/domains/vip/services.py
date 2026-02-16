# backend/core/domains/vip/services.py
import logging
from decimal import Decimal
from typing import List, Optional, Tuple

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from .models import (
    VIPSettings,
    VIPTier,
    VIPBenefit,
    ClientVIPStatus,
    VIPPointTransaction,
    VIPRewardRedemption,
    VIPTierHistory,
)

logger = logging.getLogger(__name__)


class VIPService:
    """Core VIP operations service."""

    @staticmethod
    def get_settings() -> VIPSettings:
        """Get VIP program settings singleton."""
        return VIPSettings.get_settings()

    @staticmethod
    def is_program_enabled() -> bool:
        """Check if VIP program is enabled."""
        return VIPSettings.get_settings().is_program_enabled

    @staticmethod
    @transaction.atomic
    def get_or_create_client_status(client) -> ClientVIPStatus:
        """
        Get or create VIP status for a client.
        Assigns default tier if creating new status.
        """
        status, created = ClientVIPStatus.objects.get_or_create(
            client=client,
            defaults={
                'current_tier': VIPTier.objects.filter(is_default=True, is_active=True).first(),
                'status': 'ACTIVE',
            }
        )

        if created:
            logger.info(f"Created VIP status for client {client.email}")
            # Record initial tier assignment
            if status.current_tier:
                VIPTierHistory.objects.create(
                    client_vip_status=status,
                    from_tier=None,
                    to_tier=status.current_tier,
                    reason='INITIAL',
                    notes='Initial VIP status creation',
                )

        return status

    @staticmethod
    def calculate_eligible_tier(client_vip_status: ClientVIPStatus) -> Optional[VIPTier]:
        """
        Calculate the highest tier a client is eligible for based on their stats.
        Returns None if no tier qualifies beyond default.
        """
        settings = VIPSettings.get_settings()
        if not settings.is_program_enabled or not settings.earning_automatic_enabled:
            return None

        # Get all active tiers ordered by level (highest first)
        tiers = VIPTier.objects.filter(is_active=True).order_by('-level')

        earning_type = settings.automatic_earning_type
        total_spent = client_vip_status.total_spent
        completed_bookings = client_vip_status.completed_bookings_count
        points_balance = client_vip_status.points_balance

        for tier in tiers:
            qualifies = False

            if earning_type == 'SPENDING':
                if tier.min_total_spent and total_spent >= tier.min_total_spent:
                    qualifies = True
            elif earning_type == 'BOOKINGS':
                if tier.min_completed_bookings and completed_bookings >= tier.min_completed_bookings:
                    qualifies = True
            elif earning_type == 'BOTH':
                # Any condition met qualifies
                if tier.min_total_spent and total_spent >= tier.min_total_spent:
                    qualifies = True
                elif tier.min_completed_bookings and completed_bookings >= tier.min_completed_bookings:
                    qualifies = True
                elif tier.min_points_required and points_balance >= tier.min_points_required:
                    qualifies = True

            if qualifies:
                return tier

        # Return default tier if no higher tier qualifies
        return VIPTier.objects.filter(is_default=True, is_active=True).first()

    @staticmethod
    @transaction.atomic
    def upgrade_tier_if_eligible(client_vip_status: ClientVIPStatus) -> bool:
        """
        Check and upgrade tier if client is eligible.
        Returns True if tier was upgraded.
        """
        settings = VIPSettings.get_settings()
        if not settings.is_program_enabled or not settings.earning_automatic_enabled:
            return False

        eligible_tier = VIPService.calculate_eligible_tier(client_vip_status)
        current_tier = client_vip_status.current_tier

        # Skip if no change or eligible tier is lower/equal
        if not eligible_tier:
            return False
        if current_tier and eligible_tier.level <= current_tier.level:
            return False

        # Perform upgrade
        old_tier = current_tier
        client_vip_status.current_tier = eligible_tier
        client_vip_status.save(update_fields=['current_tier', 'updated_at'])

        # Record tier change
        VIPTierHistory.objects.create(
            client_vip_status=client_vip_status,
            from_tier=old_tier,
            to_tier=eligible_tier,
            reason='AUTOMATIC_UPGRADE',
            notes=f"Auto-upgraded based on spending: {client_vip_status.total_spent}, bookings: {client_vip_status.completed_bookings_count}",
        )

        logger.info(
            f"Upgraded {client_vip_status.client.email} from "
            f"{old_tier.name if old_tier else 'None'} to {eligible_tier.name}"
        )
        return True

    @staticmethod
    @transaction.atomic
    def assign_tier_manually(
        client,
        tier: VIPTier,
        assigned_by,
        reason: str = ""
    ) -> ClientVIPStatus:
        """Manually assign a tier to a client."""
        client_status = VIPService.get_or_create_client_status(client)
        old_tier = client_status.current_tier

        client_status.current_tier = tier
        client_status.assigned_by = assigned_by
        client_status.assigned_at = timezone.now()
        client_status.assignment_reason = reason
        client_status.status = 'ACTIVE'
        client_status.save()

        # Record tier change
        VIPTierHistory.objects.create(
            client_vip_status=client_status,
            from_tier=old_tier,
            to_tier=tier,
            reason='MANUAL_ASSIGNMENT',
            notes=reason,
            changed_by=assigned_by,
        )

        logger.info(
            f"Manually assigned {client.email} to tier {tier.name} "
            f"by {assigned_by.email}. Reason: {reason}"
        )
        return client_status

    @staticmethod
    def get_client_benefits(client) -> List[VIPBenefit]:
        """Get all active benefits for a client's current tier."""
        if not client:
            return []
        try:
            client_status = client.vip_status
        except ClientVIPStatus.DoesNotExist:
            return []

        # Lazy expiration: update status field when expired at query time
        if client_status.status == 'ACTIVE' and client_status.is_expired:
            client_status.status = 'EXPIRED'
            client_status.save(update_fields=['status', 'updated_at'])
            logger.info(f"VIP status for client {client.id} expired (lazy update)")
            return []

        if not client_status.current_tier or client_status.status != 'ACTIVE':
            return []

        return list(VIPBenefit.objects.filter(
            tier=client_status.current_tier,
            is_active=True
        ).select_related('tier'))

    @staticmethod
    def get_automatic_benefits(client) -> List[VIPBenefit]:
        """Get automatic-apply benefits for pricing integration."""
        benefits = VIPService.get_client_benefits(client)
        return [b for b in benefits if b.application_mode == 'AUTOMATIC']

    @staticmethod
    def get_redeemable_benefits(client) -> List[VIPBenefit]:
        """Get redeemable benefits available to the client."""
        benefits = VIPService.get_client_benefits(client)
        return [b for b in benefits if b.application_mode == 'REDEEMABLE']

    @staticmethod
    def check_benefit_eligibility(
        client,
        benefit: VIPBenefit,
        event=None
    ) -> Tuple[bool, str]:
        """
        Check if client can use a specific benefit.
        Returns (is_eligible, reason).
        """
        if not client:
            return False, "No client provided"
        try:
            client_status = client.vip_status
        except ClientVIPStatus.DoesNotExist:
            return False, "Client has no VIP status"

        # Lazy expiration: update status field when expired at query time
        if client_status.status == 'ACTIVE' and client_status.is_expired:
            client_status.status = 'EXPIRED'
            client_status.save(update_fields=['status', 'updated_at'])
            logger.info(f"VIP status for client {client.id} expired (lazy update in eligibility check)")

        if client_status.status != 'ACTIVE':
            return False, f"VIP status is {client_status.status}"

        if not client_status.current_tier:
            return False, "Client has no assigned tier"

        if benefit.tier_id != client_status.current_tier_id:
            return False, "Benefit not available for client's tier"

        if not benefit.is_active:
            return False, "Benefit is not active"

        # Check monthly usage limit
        if benefit.max_uses_per_month:
            month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            monthly_uses = VIPRewardRedemption.objects.filter(
                client_vip_status=client_status,
                benefit=benefit,
                status__in=['PENDING', 'APPLIED'],
                created_at__gte=month_start
            ).count()
            if monthly_uses >= benefit.max_uses_per_month:
                return False, f"Monthly limit of {benefit.max_uses_per_month} reached"

        # Check points cost for redeemable benefits
        if benefit.application_mode == 'REDEEMABLE' and benefit.points_cost > 0:
            if client_status.points_balance < benefit.points_cost:
                return False, f"Insufficient points (need {benefit.points_cost}, have {client_status.points_balance})"

        return True, "Eligible"


class VIPPointsService:
    """Points management service."""

    @staticmethod
    @transaction.atomic
    def award_points_for_payment(payment) -> Optional[VIPPointTransaction]:
        """Award points when payment is completed."""
        settings = VIPSettings.get_settings()
        if not settings.is_program_enabled or not settings.earning_points_enabled:
            return None

        # Get client from payment -> event -> client
        if not payment.event or not payment.event.client:
            return None

        client = payment.event.client
        client_status = VIPService.get_or_create_client_status(client)

        # Calculate points: (amount / currency_unit) * points_per_currency
        amount = payment.amount
        points_earned = int(
            (amount / settings.points_currency_unit) * settings.points_per_currency_spent
        )

        if points_earned <= 0:
            return None

        # Update balance
        new_balance = client_status.points_balance + points_earned
        client_status.points_balance = new_balance
        client_status.lifetime_points_earned += points_earned
        client_status.save(update_fields=['points_balance', 'lifetime_points_earned', 'updated_at'])

        # Create transaction record
        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_status,
            transaction_type='EARNED_PAYMENT',
            points=points_earned,
            payment=payment,
            event=payment.event,
            description=f"Earned from payment #{payment.payment_number}",
            balance_after=new_balance,
        )

        logger.info(f"Awarded {points_earned} points to {client.email} for payment {payment.payment_number}")
        return transaction

    @staticmethod
    @transaction.atomic
    def award_bonus_points(
        client,
        points: int,
        description: str,
        performed_by
    ) -> VIPPointTransaction:
        """Manually award bonus points."""
        client_status = VIPService.get_or_create_client_status(client)

        new_balance = client_status.points_balance + points
        client_status.points_balance = new_balance
        client_status.lifetime_points_earned += points
        client_status.save(update_fields=['points_balance', 'lifetime_points_earned', 'updated_at'])

        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_status,
            transaction_type='EARNED_BONUS',
            points=points,
            description=description,
            balance_after=new_balance,
            performed_by=performed_by,
        )

        logger.info(f"Awarded {points} bonus points to {client.email} by {performed_by.email}")
        return transaction

    @staticmethod
    @transaction.atomic
    def spend_points(
        client,
        points: int,
        description: str,
        benefit: Optional[VIPBenefit] = None
    ) -> VIPPointTransaction:
        """Deduct points for reward redemption."""
        client_status = VIPService.get_or_create_client_status(client)

        if client_status.points_balance < points:
            raise ValueError(f"Insufficient points: have {client_status.points_balance}, need {points}")

        new_balance = client_status.points_balance - points
        client_status.points_balance = new_balance
        client_status.lifetime_points_spent += points
        client_status.save(update_fields=['points_balance', 'lifetime_points_spent', 'updated_at'])

        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_status,
            transaction_type='SPENT_REWARD',
            points=-points,  # Negative for spent
            description=description,
            balance_after=new_balance,
        )

        logger.info(f"Spent {points} points for {client.email}: {description}")
        return transaction

    @staticmethod
    @transaction.atomic
    def adjust_points(
        client,
        points: int,
        description: str,
        performed_by
    ) -> VIPPointTransaction:
        """Manual point adjustment (can be positive or negative)."""
        client_status = VIPService.get_or_create_client_status(client)

        new_balance = max(0, client_status.points_balance + points)

        if points > 0:
            client_status.lifetime_points_earned += points
        else:
            client_status.lifetime_points_spent += abs(points)

        client_status.points_balance = new_balance
        client_status.save(update_fields=['points_balance', 'lifetime_points_earned', 'lifetime_points_spent', 'updated_at'])

        transaction = VIPPointTransaction.objects.create(
            client_vip_status=client_status,
            transaction_type='ADJUSTED',
            points=points,
            description=description,
            balance_after=new_balance,
            performed_by=performed_by,
        )

        logger.info(f"Adjusted points by {points:+d} for {client.email} by {performed_by.email}")
        return transaction


class VIPPricingIntegrationService:
    """Integration with PricingCalculationService."""

    @staticmethod
    def apply_vip_benefits_to_breakdown(breakdown, client, event_duration_hours: int = 0):
        """
        Apply VIP automatic benefits to pricing breakdown.
        Modifies breakdown in place and returns it.
        """
        settings = VIPSettings.get_settings()
        if not settings.is_program_enabled:
            return breakdown

        automatic_benefits = VIPService.get_automatic_benefits(client)
        if not automatic_benefits:
            return breakdown

        applied_benefits = []

        for benefit in automatic_benefits:
            if benefit.benefit_type == 'PERCENTAGE_DISCOUNT' and benefit.value:
                # Apply percentage discount to subtotal
                discount = (breakdown.subtotal - breakdown.discount_amount) * (benefit.value / Decimal('100'))
                breakdown.discount_amount += discount
                applied_benefits.append(f"{benefit.value}% VIP discount")

            elif benefit.benefit_type == 'FIXED_DISCOUNT' and benefit.value:
                # Apply fixed discount
                current_total = breakdown.subtotal - breakdown.discount_amount
                discount = min(benefit.value, current_total)
                breakdown.discount_amount += discount
                applied_benefits.append(f"${benefit.value} VIP discount")

            elif benefit.benefit_type == 'FREE_HOURS' and benefit.value:
                # Apply free hours discount
                free_hours_value = VIPPricingIntegrationService.calculate_free_hours_value(
                    breakdown, int(benefit.value)
                )
                if free_hours_value > 0:
                    breakdown.discount_amount += free_hours_value
                    applied_benefits.append(f"{int(benefit.value)} free hours")

            elif benefit.benefit_type == 'WAIVE_SERVICE_CHARGE':
                # Zero out service charge
                breakdown.service_charge_amount = Decimal('0')
                applied_benefits.append("Service charge waived")

        # Recalculate total
        breakdown.total_amount = (
            breakdown.subtotal
            - breakdown.discount_amount
            + breakdown.service_charge_amount
            + breakdown.tax_amount
        )

        if applied_benefits:
            logger.info(f"Applied VIP benefits for {client.email}: {', '.join(applied_benefits)}")

        return breakdown

    @staticmethod
    def calculate_free_hours_value(breakdown, free_hours: int) -> Decimal:
        """Calculate the monetary value of free excess hours."""
        # Look for excess hour pricing in line items
        for item in breakdown.line_items:
            if hasattr(item, 'excess_hour_price') and item.excess_hour_price:
                # Value = free_hours * excess_hour_price (capped at actual excess)
                actual_excess = getattr(item, 'excess_hours', 0) or 0
                hours_to_apply = min(free_hours, actual_excess)
                return item.excess_hour_price * Decimal(hours_to_apply)
        return Decimal('0')

    @staticmethod
    def calculate_vip_discount(client, subtotal: Decimal) -> Tuple[Decimal, List[str]]:
        """
        Calculate total VIP discount amount and list of applied benefits.
        Useful for displaying discount breakdown.
        """
        settings = VIPSettings.get_settings()
        if not settings.is_program_enabled:
            return Decimal('0'), []

        automatic_benefits = VIPService.get_automatic_benefits(client)
        if not automatic_benefits:
            return Decimal('0'), []

        total_discount = Decimal('0')
        applied = []

        for benefit in automatic_benefits:
            if benefit.benefit_type == 'PERCENTAGE_DISCOUNT' and benefit.value:
                discount = subtotal * (benefit.value / Decimal('100'))
                total_discount += discount
                applied.append(f"{benefit.value}% VIP discount (${discount:.2f})")

            elif benefit.benefit_type == 'FIXED_DISCOUNT' and benefit.value:
                discount = min(benefit.value, subtotal - total_discount)
                total_discount += discount
                applied.append(f"${benefit.value} VIP discount")

        return total_discount, applied

    @staticmethod
    def should_waive_fee(client, fee_type: str) -> bool:
        """
        Check if a specific fee should be waived for VIP client.
        fee_type: 'SERVICE_CHARGE', 'LATE_FEE', 'RESCHEDULING_FEE'
        """
        benefit_type_map = {
            'SERVICE_CHARGE': 'WAIVE_SERVICE_CHARGE',
            'LATE_FEE': 'WAIVE_LATE_FEE',
            'RESCHEDULING_FEE': 'WAIVE_RESCHEDULING_FEE',
        }

        if fee_type not in benefit_type_map:
            return False

        automatic_benefits = VIPService.get_automatic_benefits(client)
        return any(
            b.benefit_type == benefit_type_map[fee_type]
            for b in automatic_benefits
        )

    @staticmethod
    def get_exclusive_products_for_client(client) -> List[int]:
        """Get IDs of exclusive products available to this VIP client."""
        benefits = VIPService.get_client_benefits(client)
        exclusive_benefits = [b for b in benefits if b.benefit_type == 'EXCLUSIVE_PACKAGE']

        product_ids = []
        for benefit in exclusive_benefits:
            product_ids.extend(benefit.applicable_products.values_list('id', flat=True))

        return list(set(product_ids))


class VIPRedemptionService:
    """Service for handling benefit redemptions."""

    @staticmethod
    @transaction.atomic
    def redeem_benefit(
        client,
        benefit: VIPBenefit,
        event
    ) -> VIPRewardRedemption:
        """Redeem a benefit for a specific event."""
        # Check eligibility
        is_eligible, reason = VIPService.check_benefit_eligibility(client, benefit, event)
        if not is_eligible:
            raise ValueError(f"Cannot redeem benefit: {reason}")

        client_status = client.vip_status

        # Deduct points if required
        if benefit.points_cost > 0:
            VIPPointsService.spend_points(
                client,
                benefit.points_cost,
                f"Redeemed: {benefit.name} for event #{event.id}"
            )

        # Create redemption record
        redemption = VIPRewardRedemption.objects.create(
            client_vip_status=client_status,
            benefit=benefit,
            event=event,
            status='PENDING',
            points_spent=benefit.points_cost,
        )

        logger.info(f"Redeemed benefit {benefit.name} for {client.email} on event #{event.id}")
        return redemption

    @staticmethod
    @transaction.atomic
    def apply_redemption(redemption: VIPRewardRedemption, value_applied: Decimal = None):
        """Mark a redemption as applied."""
        redemption.status = 'APPLIED'
        redemption.applied_at = timezone.now()
        if value_applied:
            redemption.value_applied = value_applied
        redemption.save()

        logger.info(f"Applied redemption {redemption.id} with value {value_applied}")

    @staticmethod
    @transaction.atomic
    def cancel_redemption(redemption: VIPRewardRedemption):
        """Cancel a redemption and refund points."""
        if redemption.status == 'CANCELLED':
            return

        # Refund points
        if redemption.points_spent > 0:
            client = redemption.client_vip_status.client
            client_status = redemption.client_vip_status

            client_status.points_balance += redemption.points_spent
            client_status.lifetime_points_spent -= redemption.points_spent
            client_status.save(update_fields=['points_balance', 'lifetime_points_spent', 'updated_at'])

            # Record refund transaction
            VIPPointTransaction.objects.create(
                client_vip_status=client_status,
                transaction_type='ADJUSTED',
                points=redemption.points_spent,
                description=f"Refund for cancelled redemption #{redemption.id}",
                balance_after=client_status.points_balance,
            )

        redemption.status = 'CANCELLED'
        redemption.save()

        logger.info(f"Cancelled redemption {redemption.id}")
