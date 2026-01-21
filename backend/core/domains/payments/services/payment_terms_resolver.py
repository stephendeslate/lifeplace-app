# backend/core/domains/payments/services/payment_terms_resolver.py
"""
Payment Terms Resolver Service

Resolves payment terms by merging flow-specific overrides with global defaults.
Provides a single source of truth for payment term configuration across the application.
"""
from decimal import Decimal
from typing import Dict, Any, Optional
import logging

from core.domains.payments.models import PaymentSettings
from core.domains.settings.models import CurrencySettings

logger = logging.getLogger(__name__)


class PaymentTermsResolver:
    """
    Resolves payment terms with hierarchy:
    1. Flow-specific PaymentTermsConfiguration (if exists and field is set)
    2. Global PaymentSettings defaults

    Also generates human-readable payment terms text from structured configuration.
    """

    @staticmethod
    def get_global_settings() -> Dict[str, Any]:
        """Get global payment settings as a dictionary"""
        settings = PaymentSettings.get_default_settings()
        # Get currency from CurrencySettings (single source of truth)
        currency_settings = CurrencySettings.get_system_settings()
        currency = currency_settings.default_currency if currency_settings else 'PHP'
        return {
            # Deposit settings
            'deposit_type': settings.deposit_type,
            'deposit_percentage': settings.default_deposit_percentage,
            'deposit_fixed_amount': settings.deposit_fixed_amount,
            'deposit_is_refundable': settings.deposit_is_refundable,
            'deposit_is_deductible': settings.deposit_is_deductible,
            'deposit_waived_on_full_payment': settings.deposit_waived_on_full_payment,
            # Late fee settings
            'late_fee_enabled': settings.late_fee_enabled,
            'late_fee_type': settings.late_fee_type,
            'late_fee_amount': settings.default_late_fee_amount,
            'late_fee_percentage': settings.late_fee_percentage,
            # Security deposit settings
            'security_deposit_enabled': settings.security_deposit_enabled,
            'security_deposit_amount': settings.security_deposit_amount,
            'security_deposit_is_refundable': settings.security_deposit_is_refundable,
            'security_deposit_description': settings.security_deposit_description,
            # Cancellation settings
            'cancellation_admin_fee_percentage': settings.cancellation_admin_fee_percentage,
            'allow_refunds': settings.allow_refunds,
            'refund_percentage': settings.refund_percentage,
            'refund_deadline_hours': settings.refund_deadline_hours,
            # Payment schedule settings
            'downpayment_percentage': settings.downpayment_percentage,
            'downpayment_due_days': settings.downpayment_due_days,
            'balance_due_days': settings.balance_due_days,
            'balance_due_type': settings.balance_due_type,
            # Other
            'currency': currency,
            'grace_period_days': settings.grace_period_days,
        }

    @staticmethod
    def get_terms_for_flow(booking_flow_id: int) -> Dict[str, Any]:
        """
        Get merged payment terms for a booking flow.

        Args:
            booking_flow_id: ID of the booking flow

        Returns:
            Dict with all payment terms, using flow-specific values when set,
            falling back to global settings when not set.
        """
        from core.domains.bookingflow.models import BookingFlow, BookingFlowStep

        try:
            # Get the booking flow
            flow = BookingFlow.objects.get(id=booking_flow_id)

            # Find the payment step
            payment_step = BookingFlowStep.objects.filter(
                booking_flow=flow,
                step_type='payment_info'
            ).first()

            if payment_step:
                # Check if payment terms configuration exists
                try:
                    terms_config = payment_step.payment_terms_config
                    return terms_config.get_effective_settings()
                except Exception:
                    # No payment terms config, fall back to global
                    pass

        except BookingFlow.DoesNotExist:
            logger.warning(f"BookingFlow {booking_flow_id} not found, using global settings")
        except Exception as e:
            logger.error(f"Error getting payment terms for flow {booking_flow_id}: {e}")

        # Fall back to global settings
        return PaymentTermsResolver.get_global_settings()

    @staticmethod
    def get_terms_for_event(event_id: int) -> Dict[str, Any]:
        """
        Get payment terms for an event by tracing back to its booking flow.

        Args:
            event_id: ID of the event

        Returns:
            Dict with all payment terms for the event's booking flow
        """
        from core.domains.events.models import Event
        from core.domains.bookingflow.models import BookingSession

        try:
            event = Event.objects.get(id=event_id)

            # Try to find booking session that created this event
            booking_session = BookingSession.objects.filter(
                created_event=event
            ).select_related('booking_flow').first()

            if booking_session and booking_session.booking_flow:
                return PaymentTermsResolver.get_terms_for_flow(
                    booking_session.booking_flow.id
                )

        except Event.DoesNotExist:
            logger.warning(f"Event {event_id} not found, using global settings")
        except Exception as e:
            logger.error(f"Error getting payment terms for event {event_id}: {e}")

        # Fall back to global settings
        return PaymentTermsResolver.get_global_settings()

    @staticmethod
    def get_terms_for_step(step_id: int) -> Dict[str, Any]:
        """
        Get payment terms for a specific booking flow step.

        Args:
            step_id: ID of the BookingFlowStep

        Returns:
            Dict with all payment terms for that step
        """
        from core.domains.bookingflow.models import BookingFlowStep

        try:
            step = BookingFlowStep.objects.get(id=step_id)

            # Check if payment terms configuration exists
            try:
                terms_config = step.payment_terms_config
                return terms_config.get_effective_settings()
            except Exception:
                pass

        except BookingFlowStep.DoesNotExist:
            logger.warning(f"BookingFlowStep {step_id} not found, using global settings")
        except Exception as e:
            logger.error(f"Error getting payment terms for step {step_id}: {e}")

        # Fall back to global settings
        return PaymentTermsResolver.get_global_settings()

    @staticmethod
    def generate_terms_text(terms: Dict[str, Any], currency_symbol: str = '₱') -> str:
        """
        Generate human-readable payment terms text from structured configuration.

        Args:
            terms: Dict of payment terms from get_terms_for_* methods
            currency_symbol: Currency symbol to use (default: ₱ for PHP)

        Returns:
            Human-readable payment terms string suitable for contracts
        """
        lines = []

        # Reservation/Deposit terms
        deposit_type = terms.get('deposit_type', 'PERCENTAGE')
        deposit_refundable = terms.get('deposit_is_refundable', False)
        deposit_deductible = terms.get('deposit_is_deductible', True)

        if deposit_type == 'FIXED':
            deposit_amount = terms.get('deposit_fixed_amount', Decimal('0'))
            if deposit_amount:
                deposit_str = f"{currency_symbol}{deposit_amount:,.0f}"
        else:
            deposit_pct = terms.get('deposit_percentage', Decimal('50'))
            deposit_str = f"{deposit_pct:.0f}%"

        # Build deposit description
        refund_status = "Non-Refundable" if not deposit_refundable else "Refundable"
        deduct_status = "Non-Deductible" if not deposit_deductible else "Deductible"

        if deposit_type == 'FIXED':
            lines.append(f"Reservation payment of {deposit_str} has been placed upon signing this agreement and is {refund_status} and {deduct_status}.")
        else:
            lines.append(f"A deposit of {deposit_str} of the Total Contract Price (TCP) is required upon signing and is {refund_status}.")

        # Full payment waiver
        if terms.get('deposit_waived_on_full_payment', True):
            lines.append(f"If the Client pays the full amount of the TCP upon signing, the reservation fee will be waived.")

        # Downpayment terms
        downpayment_pct = terms.get('downpayment_percentage', Decimal('30'))
        downpayment_days = terms.get('downpayment_due_days', 7)
        if downpayment_pct and downpayment_pct > 0:
            lines.append(f"Settlement of {downpayment_pct:.0f}% of the TCP shall be paid within {downpayment_days} days to officially block the date.")

        # Balance due terms
        balance_due_type = terms.get('balance_due_type', 'DAYS_BEFORE')
        balance_due_days = terms.get('balance_due_days', 1)
        remaining_pct = 100 - float(downpayment_pct) if downpayment_pct else 70

        if balance_due_type == 'DAY_BEFORE':
            lines.append(f"Settlement of the remaining {remaining_pct:.0f}% of the TCP shall be paid a day before the event.")
        else:
            lines.append(f"Settlement of the remaining {remaining_pct:.0f}% of the TCP shall be paid {balance_due_days} days prior to the event.")

        # Late payment penalty
        late_fee_enabled = terms.get('late_fee_enabled', True)
        if late_fee_enabled:
            late_fee_type = terms.get('late_fee_type', 'FIXED')
            if late_fee_type == 'PERCENTAGE':
                late_fee_pct = terms.get('late_fee_percentage', Decimal('0'))
                if late_fee_pct and late_fee_pct > 0:
                    lines.append(f"Late payments are subject to {late_fee_pct:.0f}% of the invoice amount as a penalty charge.")
            else:
                late_fee_amount = terms.get('late_fee_amount', Decimal('0'))
                if late_fee_amount and late_fee_amount > 0:
                    lines.append(f"Late payments are subject to a {currency_symbol}{late_fee_amount:,.0f} penalty fee.")

        # Cancellation terms
        cancellation_fee = terms.get('cancellation_admin_fee_percentage', Decimal('0'))
        if cancellation_fee and cancellation_fee > 0:
            lines.append(f"In case of Client cancellation, {cancellation_fee:.0f}% of the total payment (excluding the reservation fee) will be deducted as an administrative processing fee.")

        # Security deposit
        security_enabled = terms.get('security_deposit_enabled', False)
        if security_enabled:
            security_amount = terms.get('security_deposit_amount', Decimal('0'))
            security_refundable = terms.get('security_deposit_is_refundable', True)
            security_desc = terms.get('security_deposit_description', 'upon check-in')

            refund_text = "Refundable upon check-out and inspection" if security_refundable else "Non-Refundable"

            if security_amount and security_amount > 0:
                if security_desc:
                    lines.append(f"A security deposit of {currency_symbol}{security_amount:,.0f} {security_desc} is required. {refund_text}.")
                else:
                    lines.append(f"A security deposit of {currency_symbol}{security_amount:,.0f} upon check-in is required. {refund_text}.")

        return "\n".join(lines)

    @staticmethod
    def format_deposit_amount(terms: Dict[str, Any], total_amount: Decimal, currency_symbol: str = '₱') -> str:
        """
        Format the deposit amount based on terms and total.

        Args:
            terms: Payment terms dict
            total_amount: Total contract price
            currency_symbol: Currency symbol

        Returns:
            Formatted deposit amount string
        """
        deposit_type = terms.get('deposit_type', 'PERCENTAGE')

        if deposit_type == 'FIXED':
            amount = terms.get('deposit_fixed_amount', Decimal('0'))
        else:
            percentage = terms.get('deposit_percentage', Decimal('50'))
            amount = (total_amount * percentage) / Decimal('100')

        return f"{currency_symbol}{amount:,.2f}"

    @staticmethod
    def calculate_deposit_amount(terms: Dict[str, Any], total_amount: Decimal) -> Decimal:
        """
        Calculate the deposit amount based on terms and total.

        Args:
            terms: Payment terms dict
            total_amount: Total contract price

        Returns:
            Deposit amount as Decimal
        """
        deposit_type = terms.get('deposit_type', 'PERCENTAGE')

        if deposit_type == 'FIXED':
            return terms.get('deposit_fixed_amount', Decimal('0')) or Decimal('0')
        else:
            percentage = terms.get('deposit_percentage', Decimal('50'))
            return (total_amount * percentage) / Decimal('100')
