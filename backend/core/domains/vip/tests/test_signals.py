"""
Unit tests for VIP domain signal handlers.

Tests:
- handle_payment_completed: Points awarding and tier upgrades on payment completion
- handle_event_status_change: Booking count updates and tier upgrades on event completion
"""

import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock

from core.domains.vip.models import (
    VIPSettings,
    VIPTier,
    ClientVIPStatus,
    VIPPointTransaction,
    VIPTierHistory,
)


# =============================================================================
# Payment Completion Signal Tests
# =============================================================================

@pytest.mark.django_db
class TestHandlePaymentCompleted:
    """Tests for the handle_payment_completed signal handler."""

    @pytest.fixture
    def vip_setup(self, user_factory):
        """Create base VIP setup: enabled settings, tiers, and a client."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.earning_points_enabled = True
        settings.points_per_currency_spent = Decimal('1.00')
        settings.points_currency_unit = Decimal('100')
        settings.save()

        default_tier = VIPTier.objects.create(
            name='Guest', level=0, is_default=True, is_active=True
        )
        partner_tier = VIPTier.objects.create(
            name='Partner', level=1, is_active=True,
            min_total_spent=Decimal('100000'),
            min_completed_bookings=2,
        )

        client = user_factory(role='CLIENT')
        return settings, default_tier, partner_tier, client

    def _create_payment(self, event_factory, payment_factory, client, status='COMPLETED', amount=Decimal('50000.00')):
        """Helper to create a payment with associated event and client."""
        event = event_factory(client=client)
        payment = payment_factory(event=event, status=status, amount=amount)
        return payment

    def test_updates_total_spent_on_completed_payment(self, vip_setup, event_factory, payment_factory):
        """Payment completion updates the client's total_spent."""
        settings, default_tier, _, client = vip_setup
        event = event_factory(client=client)

        # Create payment — signal fires on save
        payment = payment_factory(event=event, status='COMPLETED', amount=Decimal('50000.00'))

        client_status = ClientVIPStatus.objects.get(client=client)
        assert client_status.total_spent >= Decimal('50000.00')

    def test_awards_points_when_enabled(self, vip_setup, event_factory, payment_factory):
        """Payment completion awards points when points earning is enabled."""
        settings, default_tier, _, client = vip_setup
        event = event_factory(client=client)

        payment = payment_factory(event=event, status='COMPLETED', amount=Decimal('50000.00'))

        client_status = ClientVIPStatus.objects.get(client=client)
        # 50000 / 100 * 1 = 500 points
        assert client_status.points_balance > 0

        # Verify transaction was created
        assert VIPPointTransaction.objects.filter(
            client_vip_status=client_status,
            transaction_type='EARNED_PAYMENT',
        ).exists()

    def test_skips_points_when_disabled(self, vip_setup, event_factory, payment_factory):
        """Payment completion skips points when points earning is disabled."""
        settings, default_tier, _, client = vip_setup
        settings.earning_points_enabled = False
        settings.save()

        event = event_factory(client=client)
        payment = payment_factory(event=event, status='COMPLETED', amount=Decimal('50000.00'))

        # Status may be created but no point transaction
        assert not VIPPointTransaction.objects.filter(
            transaction_type='EARNED_PAYMENT',
        ).exists()

    def test_ignores_non_completed_payments(self, vip_setup, event_factory, payment_factory):
        """Signal ignores payments that are not COMPLETED."""
        settings, default_tier, _, client = vip_setup
        event = event_factory(client=client)

        payment = payment_factory(event=event, status='PENDING', amount=Decimal('50000.00'))

        assert not ClientVIPStatus.objects.filter(client=client).exists()

    def test_ignores_payment_without_event(self, vip_setup, event_factory, payment_factory):
        """Signal ignores payments with no associated event."""
        settings, _, _, client = vip_setup

        # DB has NOT NULL on event_id, so create a valid payment then
        # call the handler directly with event_id cleared to test the guard
        event = event_factory(client=client)
        payment = payment_factory(event=event, status='COMPLETED', amount=Decimal('50000.00'))

        # Clean up any VIP status created by the signal during save
        ClientVIPStatus.objects.filter(client=client).delete()

        # Now call the handler directly with event cleared to test the guard
        from core.domains.vip.signals import handle_payment_completed
        payment.event_id = None
        # Clear Django's cached FK descriptor
        if 'event' in payment.__dict__:
            del payment.__dict__['event']
        handle_payment_completed(sender=type(payment), instance=payment, created=False)

        assert not ClientVIPStatus.objects.filter(client=client).exists()

    def test_ignores_non_client_role(self, vip_setup, user_factory, event_factory, payment_factory):
        """Signal ignores payments where the event client is not a CLIENT role."""
        settings, _, _, _ = vip_setup
        admin_user = user_factory(role='ADMIN')
        event = event_factory(client=admin_user)

        payment = payment_factory(event=event, status='COMPLETED', amount=Decimal('50000.00'))

        assert not ClientVIPStatus.objects.filter(client=admin_user).exists()

    def test_ignores_when_program_disabled(self, vip_setup, event_factory, payment_factory):
        """Signal ignores payments when VIP program is disabled."""
        settings, _, _, client = vip_setup
        settings.is_program_enabled = False
        settings.save()

        event = event_factory(client=client)
        payment = payment_factory(event=event, status='COMPLETED', amount=Decimal('50000.00'))

        assert not ClientVIPStatus.objects.filter(client=client).exists()

    def test_checks_tier_upgrade(self, vip_setup, event_factory, payment_factory):
        """Payment completion checks for automatic tier upgrade."""
        settings, default_tier, partner_tier, client = vip_setup

        # Create status at default tier with spending just under threshold
        client_status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=default_tier,
            status='ACTIVE',
            total_spent=Decimal('60000.00'),
        )

        event = event_factory(client=client)
        # This payment pushes total over 100k threshold
        payment = payment_factory(event=event, status='COMPLETED', amount=Decimal('50000.00'))

        client_status.refresh_from_db()
        assert client_status.current_tier == partner_tier

    def test_handles_errors_gracefully(self, vip_setup, event_factory, payment_factory):
        """Signal handles errors without crashing the payment save."""
        settings, _, _, client = vip_setup

        event = event_factory(client=client)

        # Patch to force an error inside the handler
        with patch('core.domains.vip.signals.VIPService.get_or_create_client_status', side_effect=Exception("DB error")):
            # Should not raise — signal catches exceptions
            payment = payment_factory(event=event, status='COMPLETED', amount=Decimal('50000.00'))
            # Payment should still exist
            assert payment.pk is not None


# =============================================================================
# Event Completion Signal Tests
# =============================================================================

@pytest.mark.django_db
class TestHandleEventStatusChange:
    """Tests for the handle_event_status_change signal handler."""

    @pytest.fixture
    def vip_setup(self, user_factory):
        """Create base VIP setup."""
        settings = VIPSettings.get_settings()
        settings.is_program_enabled = True
        settings.earning_automatic_enabled = True
        settings.automatic_earning_type = 'BOTH'
        settings.save()

        default_tier = VIPTier.objects.create(
            name='Guest', level=0, is_default=True, is_active=True
        )
        partner_tier = VIPTier.objects.create(
            name='Partner', level=1, is_active=True,
            min_completed_bookings=2,
        )

        client = user_factory(role='CLIENT')
        return settings, default_tier, partner_tier, client

    def test_updates_completed_bookings_count(self, vip_setup, event_factory):
        """Event completion updates the client's completed_bookings_count."""
        settings, default_tier, _, client = vip_setup

        event = event_factory(client=client, status='CONFIRMED')
        event.status = 'COMPLETED'
        event.save()

        client_status = ClientVIPStatus.objects.get(client=client)
        assert client_status.completed_bookings_count >= 1

    def test_ignores_non_completed_events(self, vip_setup, event_factory):
        """Signal ignores events that are not COMPLETED."""
        settings, _, _, client = vip_setup

        event = event_factory(client=client, status='CONFIRMED')

        assert not ClientVIPStatus.objects.filter(client=client).exists()

    def test_ignores_events_without_client(self, vip_setup, user_factory, event_factory):
        """Signal ignores events with no client."""
        settings, _, _, _ = vip_setup

        # DB has NOT NULL on client_id, so create a valid event then
        # call the handler directly with client_id cleared to test the guard
        temp_client = user_factory(role='CLIENT')
        event = event_factory(client=temp_client, status='COMPLETED')

        # Clean up any VIP status created by the signal during save
        ClientVIPStatus.objects.filter(client=temp_client).delete()

        # Now call the handler directly with client cleared to test the guard
        from core.domains.vip.signals import handle_event_status_change
        event.client_id = None
        # Clear Django's cached FK descriptor
        if 'client' in event.__dict__:
            del event.__dict__['client']
        handle_event_status_change(sender=type(event), instance=event, created=False)

        # No VIP status should be created for null client
        assert not ClientVIPStatus.objects.filter(client=temp_client).exists()

    def test_ignores_non_client_role(self, vip_setup, user_factory, event_factory):
        """Signal ignores events where client is not a CLIENT role."""
        settings, _, _, _ = vip_setup
        admin_user = user_factory(role='ADMIN')

        event = event_factory(client=admin_user, status='CONFIRMED')
        event.status = 'COMPLETED'
        event.save()

        assert not ClientVIPStatus.objects.filter(client=admin_user).exists()

    def test_checks_tier_upgrade_on_booking_threshold(self, vip_setup, event_factory):
        """Event completion triggers tier upgrade when booking threshold met."""
        settings, default_tier, partner_tier, client = vip_setup

        # Pre-create status with 1 completed booking
        client_status = ClientVIPStatus.objects.create(
            client=client,
            current_tier=default_tier,
            status='ACTIVE',
            completed_bookings_count=1,
        )

        # Complete first event (already counted above)
        event1 = event_factory(client=client, status='COMPLETED')

        # Complete second event — this should trigger upgrade
        event2 = event_factory(client=client, status='CONFIRMED')
        event2.status = 'COMPLETED'
        event2.save()

        client_status.refresh_from_db()
        # Should have upgraded to Partner (2+ completed bookings)
        assert client_status.current_tier == partner_tier

    def test_ignores_when_program_disabled(self, vip_setup, event_factory):
        """Signal ignores event completion when VIP program is disabled."""
        settings, _, _, client = vip_setup
        settings.is_program_enabled = False
        settings.save()

        event = event_factory(client=client, status='CONFIRMED')
        event.status = 'COMPLETED'
        event.save()

        assert not ClientVIPStatus.objects.filter(client=client).exists()

    def test_handles_errors_gracefully(self, vip_setup, event_factory):
        """Signal handles errors without crashing the event save."""
        settings, _, _, client = vip_setup

        with patch('core.domains.vip.signals.VIPService.get_or_create_client_status', side_effect=Exception("DB error")):
            event = event_factory(client=client, status='CONFIRMED')
            event.status = 'COMPLETED'
            event.save()
            # Event should still be saved
            event.refresh_from_db()
            assert event.status == 'COMPLETED'
