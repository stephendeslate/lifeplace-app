"""Payment processing operations for booking flow.

Handles payment creation, gateway resolution, and payment execution
for completed bookings.
"""
import logging
from decimal import Decimal

from django.utils import timezone

from core.domains.payments.models import PaymentGateway
from core.domains.payments.services import PaymentService
from core.domains.payments.services.gateway_service import PaymentGatewayService

logger = logging.getLogger(__name__)


def get_tax_rate_for_product(product) -> Decimal:
    """
    Get appropriate tax rate for a product.

    Logic:
    - If tax-inclusive, return 0 (tax already in price)
    - Otherwise, use global default TaxRate
    """
    from core.domains.payments.models import TaxRate

    if getattr(product, "is_tax_inclusive", False):
        return Decimal("0")

    default_tax = TaxRate.objects.filter(is_default=True).first()
    return default_tax.rate if default_tax else Decimal("0")


def _resolve_gateway(session, gateway_id):
    """Resolve payment gateway from ID or find first available.

    Args:
        session: BookingSession instance
        gateway_id: Gateway ID from payment data (may be None)

    Returns:
        PaymentGateway instance

    Raises:
        ValueError: If no gateway can be resolved
    """
    if not gateway_id:
        if session.booking_flow.allowed_payment_gateways.filter(is_active=True).exists():
            gateway_id = session.booking_flow.allowed_payment_gateways.filter(is_active=True).first().id
            logger.info(f"Using first allowed payment gateway from booking flow: {gateway_id}")
        else:
            first_active = PaymentGateway.objects.filter(is_active=True).first()
            if first_active:
                gateway_id = first_active.id
                logger.info(f"Using first active payment gateway: {gateway_id}")
            else:
                logger.error("No payment gateway specified and no active gateways available")
                raise ValueError("No payment gateway specified and no active gateways available")

    if not gateway_id:
        raise ValueError("No payment gateway specified")

    try:
        gateway = PaymentGateway.objects.get(id=gateway_id, is_active=True)
        logger.info(f"Found payment gateway: {gateway.name} (code: {gateway.code})")
        return gateway
    except PaymentGateway.DoesNotExist:
        logger.error(f"Payment gateway {gateway_id} not found or inactive")
        raise ValueError(f"Payment gateway {gateway_id} not found or inactive")


def _calculate_charge_amount(full_amount, payment_type):
    """Calculate amount to charge based on payment type.

    Args:
        full_amount: Full payment amount
        payment_type: 'FULL' or 'DEPOSIT'

    Returns:
        Decimal amount to charge
    """
    if payment_type == "DEPOSIT":
        from core.domains.payments.models import PaymentSettings

        payment_settings = PaymentSettings.get_default_settings()
        deposit_percentage = payment_settings.default_deposit_percentage
        amount_to_charge = full_amount * (deposit_percentage / Decimal("100"))
        logger.info(
            f"Payment type: DEPOSIT - Charging {amount_to_charge} ({deposit_percentage}% of {full_amount}) "
            f"using global PaymentSettings"
        )
    else:
        amount_to_charge = full_amount
        logger.info(f"Payment type: FULL - Charging full amount {amount_to_charge}")

    return amount_to_charge


def process_booking_payment(session, event, payment_data):
    """Process payment for completed booking"""
    logger.info(f"Starting payment processing for session {session.session_id}")
    logger.debug(f"Payment data keys: {list(payment_data.keys()) if payment_data else []}")

    gateway_id = payment_data.get("gateway_id") or payment_data.get("payment_gateway_id")
    logger.debug(f"Gateway ID from payment data: {gateway_id}")

    gateway = _resolve_gateway(session, gateway_id)

    # Calculate amount to charge based on payment type
    full_amount = session.calculate_total_price()
    payment_type = payment_data.get("payment_type", "FULL")
    amount_to_charge = _calculate_charge_amount(full_amount, payment_type)

    logger.info(f"Final amount to charge: {amount_to_charge}")

    from datetime import timedelta

    # Get due date from payment step configuration
    payment_step = session.booking_flow.steps.filter(step_type="payment_info").first()
    payment_config = getattr(payment_step, "paymentinfo_config", None) if payment_step else None

    if payment_config and hasattr(payment_config, "balance_due_days"):
        due_days = payment_config.balance_due_days or 30
    else:
        due_days = 30

    logger.info(f"Payment due in {due_days} days")

    if payment_type == "DEPOSIT":
        description = f"Deposit payment for booking session {session.session_id}"
    else:
        description = f"Full payment for booking session {session.session_id}"

    payment_record_data = {
        "event": event.id,
        "amount": amount_to_charge,
        "status": "PENDING",
        "due_date": timezone.now().date() + timedelta(days=due_days),
        "description": description,
        "is_manual": False,
        "currency": "PHP",
    }

    logger.debug(
        f"Creating payment record: amount={payment_record_data.get('amount')}, event_id={payment_record_data.get('event')}"
    )

    try:
        payment = PaymentService.create_payment(payment_record_data, session.client)
        logger.info(f"Payment record created successfully: {payment.id}")
    except Exception as e:
        logger.error(f"Failed to create payment record: {e}")
        raise

    # Process payment through appropriate gateway
    gateway_data = {
        "gateway_id": gateway.id,
        "is_test": session.booking_flow.is_test_mode,
    }

    if payment_data.get("payment_method_token"):
        gateway_data["payment_method_token"] = payment_data["payment_method_token"]
    if payment_data.get("payment_method_id"):
        gateway_data["payment_method_id"] = payment_data["payment_method_id"]
    if payment_data.get("billing_address"):
        gateway_data["billing_address"] = payment_data["billing_address"]

    logger.debug(
        f"Gateway data for processing: gateway_id={gateway_data.get('gateway_id')}, has_token={bool(gateway_data.get('payment_method_token'))}"
    )

    try:
        logger.info(
            f"Calling PaymentGatewayService.process_gateway_payment with payment_id={payment.id}, gateway_code={gateway.code}"
        )
        transaction_result = PaymentGatewayService.process_gateway_payment(
            payment.id, gateway.code, gateway_data, session.client
        )
        logger.info(f"Payment gateway processing result: {transaction_result}")
    except Exception as e:
        logger.error(f"Payment gateway processing failed: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        raise

    return payment


def process_booking_payment_for_invoice(session, event, invoice, payment_data):
    """Process payment for completed booking against an invoice

    Args:
        session: BookingSession instance
        event: Event instance
        invoice: Invoice instance
        payment_data: Payment data from session

    Returns:
        Payment: The created payment record
    """
    logger.info(f"Starting payment processing for invoice {invoice.invoice_id}")
    logger.info(f"Payment data received: {payment_data}")

    gateway_id = payment_data.get("gateway_id") or payment_data.get("payment_gateway_id")
    logger.info(f"Gateway ID from payment data: {gateway_id}")

    gateway = _resolve_gateway(session, gateway_id)

    # Calculate amount to charge based on payment type
    full_amount = invoice.total_amount
    logger.info(
        f"Payment amount source - invoice.total_amount: {invoice.total_amount} (synchronized with event.total_price: {event.total_price})"
    )

    if not full_amount or full_amount <= 0:
        logger.error(
            f"Invalid payment amount: invoice.total_amount={invoice.total_amount}, event.total_price={event.total_price}"
        )
        raise ValueError("Invalid payment amount: invoice total amount is zero or missing")

    payment_type = payment_data.get("payment_type", "FULL")
    amount_to_charge = _calculate_charge_amount(full_amount, payment_type)

    logger.info(f"Final amount to charge: {amount_to_charge}")

    from datetime import timedelta

    from core.domains.payments.models import Payment

    # Get due date from payment step configuration
    payment_step = session.booking_flow.steps.filter(step_type="payment_info").first()
    payment_config = getattr(payment_step, "payment_config", None) if payment_step else None

    if payment_config and hasattr(payment_config, "balance_due_days"):
        due_days = payment_config.balance_due_days or 30
    else:
        due_days = 30

    logger.info(f"Payment due in {due_days} days")

    if payment_type == "DEPOSIT":
        description = f"Deposit payment for invoice {invoice.invoice_id}"
    else:
        description = f"Full payment for invoice {invoice.invoice_id}"

    # Create payment using PaymentOrchestrator
    from core.domains.payments.services.payment_orchestrator import PaymentOrchestrator, PaymentRequest

    request = PaymentRequest(
        event_id=event.id,
        amount=amount_to_charge,
        currency=invoice.currency or "PHP",
        due_date=timezone.now().date() + timedelta(days=due_days),
        description=description,
        invoice_id=invoice.id,
        quote_id=invoice.quote.id if invoice.quote else None,
        payment_type=payment_type,
        is_deposit=(payment_type == "DEPOSIT"),
        created_by="booking_session_service",
    )

    response = PaymentOrchestrator.create_payment(request)
    if not response.success:
        raise ValueError(f"Failed to create payment for booking: {response.message}")

    payment = Payment.objects.get(id=response.payment_id)
    logger.info(f"Created payment record: {payment.payment_number}")

    # Process the payment through the gateway
    try:
        gateway_data = {
            "amount": float(amount_to_charge),
            "currency": payment.currency,
            "description": description,
            "client_email": session.client.email,
            "client_name": session.client.get_full_name(),
            "invoice_id": invoice.invoice_id,
            "event_id": event.id,
        }

        # Handle payment method data properly
        if payment_data.get("payment_method_token"):
            gateway_data["payment_method_token"] = payment_data["payment_method_token"]
        elif payment_data.get("payment_method_id"):
            payment_method_id = payment_data["payment_method_id"]
            if isinstance(payment_method_id, str) and payment_method_id.isdigit():
                gateway_data["payment_method"] = int(payment_method_id)
                logger.info(f"Using saved payment method database ID: {payment_method_id}")
            elif isinstance(payment_method_id, str) and payment_method_id.startswith("pm_"):
                gateway_data["payment_method_id"] = payment_method_id
                logger.info(f"Using Stripe payment method token: {payment_method_id}")
            else:
                try:
                    db_id = int(payment_method_id)
                    gateway_data["payment_method"] = db_id
                    logger.info(f"Converted payment method to database ID: {db_id}")
                except (ValueError, TypeError):
                    gateway_data["payment_method_id"] = payment_method_id
                    logger.info(f"Using payment method as token: {payment_method_id}")

        logger.info(f"Gateway data prepared: {gateway_data}")

        transaction_result = PaymentGatewayService.process_gateway_payment(
            payment.id, gateway.code, gateway_data, session.client
        )
        logger.info(f"Payment gateway processing result: {transaction_result}")
    except Exception as e:
        logger.error(f"Payment gateway processing failed: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        raise

    return payment
