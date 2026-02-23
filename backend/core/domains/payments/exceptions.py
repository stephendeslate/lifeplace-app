# backend/core/domains/payments/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class PaymentException(APIException):
    """Base exception for payment domain"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A payment error occurred."
    default_code = "payment_error"


class PaymentNotFoundException(PaymentException):
    """Raised when a payment is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Payment not found."
    default_code = "payment_not_found"


class PaymentMethodNotFoundException(PaymentException):
    """Raised when a payment method is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Payment method not found."
    default_code = "payment_method_not_found"


class PaymentGatewayException(PaymentException):
    """Raised when payment gateway operations fail"""

    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Payment gateway error occurred."
    default_code = "payment_gateway_error"


class PaymentAlreadyCompletedException(PaymentException):
    """Raised when trying to modify a completed payment"""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Payment is already completed and cannot be modified."
    default_code = "payment_already_completed"


class InvalidPaymentAmountException(PaymentException):
    """Raised when payment amount is invalid"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid payment amount."
    default_code = "invalid_payment_amount"


class InvalidPaymentStatusTransition(PaymentException):
    """Raised when payment status transition is invalid"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid payment status transition."
    default_code = "invalid_status_transition"


class InsufficientFundsException(PaymentException):
    """Raised when there are insufficient funds"""

    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Insufficient funds for this transaction."
    default_code = "insufficient_funds"


class RefundExceedsPaymentException(PaymentException):
    """Raised when refund amount exceeds original payment"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Refund amount exceeds original payment amount."
    default_code = "refund_exceeds_payment"


class InvalidRefundStatusException(PaymentException):
    """Raised when refund status is invalid for operation"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid refund status for this operation."
    default_code = "invalid_refund_status"


class InvoiceNotFoundException(PaymentException):
    """Raised when an invoice is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Invoice not found."
    default_code = "invoice_not_found"


class PaymentPlanNotFoundException(PaymentException):
    """Raised when a payment plan is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Payment plan not found."
    default_code = "payment_plan_not_found"


# =============================================================================
# Stripe Error Code Mapping - User-Friendly Messages
# =============================================================================

# Maps Stripe error codes to user-friendly messages and internal error codes
STRIPE_ERROR_MAP = {
    # Card Errors - Common decline reasons
    "card_declined": {
        "code": "CARD_DECLINED",
        "message": "Your card was declined. Please try a different payment method.",
        "recoverable": True,
    },
    "generic_decline": {
        "code": "CARD_DECLINED",
        "message": "Your card was declined. Please contact your bank or try a different card.",
        "recoverable": True,
    },
    "insufficient_funds": {
        "code": "INSUFFICIENT_FUNDS",
        "message": "Your card has insufficient funds. Please try a different payment method.",
        "recoverable": True,
    },
    "lost_card": {
        "code": "CARD_LOST",
        "message": "This card has been reported as lost. Please use a different card.",
        "recoverable": True,
    },
    "stolen_card": {
        "code": "CARD_STOLEN",
        "message": "This card has been reported as stolen. Please use a different card.",
        "recoverable": True,
    },
    "expired_card": {
        "code": "CARD_EXPIRED",
        "message": "Your card has expired. Please use a different card.",
        "recoverable": True,
    },
    "incorrect_cvc": {
        "code": "INVALID_CVC",
        "message": "The security code (CVC) is incorrect. Please check and try again.",
        "recoverable": True,
    },
    "incorrect_number": {
        "code": "INVALID_CARD_NUMBER",
        "message": "The card number is incorrect. Please check and try again.",
        "recoverable": True,
    },
    "invalid_expiry_month": {
        "code": "INVALID_EXPIRY",
        "message": "The expiration month is invalid. Please check and try again.",
        "recoverable": True,
    },
    "invalid_expiry_year": {
        "code": "INVALID_EXPIRY",
        "message": "The expiration year is invalid. Please check and try again.",
        "recoverable": True,
    },
    "processing_error": {
        "code": "PROCESSING_ERROR",
        "message": "An error occurred while processing your payment. Please try again.",
        "recoverable": True,
    },
    "do_not_honor": {
        "code": "CARD_DECLINED",
        "message": "Your bank declined the transaction. Please contact your bank or try a different card.",
        "recoverable": True,
    },
    "fraudulent": {
        "code": "CARD_DECLINED",
        "message": "This transaction was flagged for security reasons. Please contact your bank.",
        "recoverable": False,
    },
    # Rate limiting
    "rate_limit": {
        "code": "RATE_LIMITED",
        "message": "Too many requests. Please wait a moment and try again.",
        "recoverable": True,
    },
    # Authentication errors (should not expose details to users)
    "authentication_required": {
        "code": "AUTH_REQUIRED",
        "message": "Additional authentication is required to complete this payment.",
        "recoverable": True,
    },
    # Invalid request errors
    "invalid_request_error": {
        "code": "INVALID_REQUEST",
        "message": "There was an issue with the payment request. Please try again.",
        "recoverable": False,
    },
    # Default fallback
    "default": {
        "code": "PAYMENT_ERROR",
        "message": "An error occurred processing your payment. Please try again or use a different payment method.",
        "recoverable": True,
    },
}


def get_user_friendly_stripe_error(stripe_error):
    """
    Convert a Stripe error to a user-friendly error response.

    Args:
        stripe_error: A Stripe error exception

    Returns:
        dict: Contains 'code', 'message', and 'recoverable' keys
    """
    import stripe

    error_code = None
    decline_code = None

    # Extract error details based on error type
    if hasattr(stripe_error, "error"):
        error_obj = stripe_error.error
        error_code = getattr(error_obj, "code", None)
        decline_code = getattr(error_obj, "decline_code", None)
    elif hasattr(stripe_error, "code"):
        error_code = stripe_error.code

    # Try to find a matching error mapping
    # First check decline_code (more specific), then error_code
    if decline_code and decline_code in STRIPE_ERROR_MAP:
        return STRIPE_ERROR_MAP[decline_code].copy()
    elif error_code and error_code in STRIPE_ERROR_MAP:
        return STRIPE_ERROR_MAP[error_code].copy()

    # Check for error type-based mapping
    if isinstance(stripe_error, stripe.error.CardError):
        return STRIPE_ERROR_MAP.get(decline_code, STRIPE_ERROR_MAP["card_declined"]).copy()
    elif isinstance(stripe_error, stripe.error.RateLimitError):
        return STRIPE_ERROR_MAP["rate_limit"].copy()
    elif isinstance(stripe_error, stripe.error.InvalidRequestError):
        return STRIPE_ERROR_MAP["invalid_request_error"].copy()
    elif isinstance(stripe_error, stripe.error.AuthenticationError):
        # Don't expose auth errors - these are server-side issues
        return {
            "code": "GATEWAY_ERROR",
            "message": "An error occurred with the payment service. Please try again later.",
            "recoverable": False,
        }
    elif isinstance(stripe_error, stripe.error.APIConnectionError):
        return {
            "code": "CONNECTION_ERROR",
            "message": "Unable to connect to payment service. Please try again.",
            "recoverable": True,
        }

    # Default fallback
    return STRIPE_ERROR_MAP["default"].copy()


class StripeUserFriendlyError(PaymentGatewayException):
    """
    Stripe error with user-friendly message mapping.
    Use this instead of raw PaymentGatewayException for Stripe errors.
    """

    def __init__(self, stripe_error, log_details=None):
        import logging

        logger = logging.getLogger(__name__)

        # Get user-friendly error info
        error_info = get_user_friendly_stripe_error(stripe_error)

        # Log the full technical details for debugging (not exposed to user)
        if log_details:
            logger.error(
                f"Stripe payment error: code={error_info['code']}, "
                f"stripe_error_type={type(stripe_error).__name__}, "
                f"details={log_details}"
            )

        # Set the user-friendly message
        self.detail = error_info["message"]
        self.error_code = error_info["code"]
        self.recoverable = error_info["recoverable"]

        super().__init__(detail=self.detail)
