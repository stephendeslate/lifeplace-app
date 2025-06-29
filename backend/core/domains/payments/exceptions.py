# backend/core/domains/payments/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class PaymentException(APIException):
    """Base exception for payment domain"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A payment error occurred.'
    default_code = 'payment_error'


class PaymentNotFoundException(PaymentException):
    """Raised when a payment is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Payment not found.'
    default_code = 'payment_not_found'


class PaymentMethodNotFoundException(PaymentException):
    """Raised when a payment method is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Payment method not found.'
    default_code = 'payment_method_not_found'


class PaymentGatewayException(PaymentException):
    """Raised when payment gateway operations fail"""
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = 'Payment gateway error occurred.'
    default_code = 'payment_gateway_error'


class PaymentAlreadyCompletedException(PaymentException):
    """Raised when trying to modify a completed payment"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Payment is already completed and cannot be modified.'
    default_code = 'payment_already_completed'


class InvalidPaymentAmountException(PaymentException):
    """Raised when payment amount is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid payment amount.'
    default_code = 'invalid_payment_amount'


class InvalidPaymentStatusTransition(PaymentException):
    """Raised when payment status transition is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid payment status transition.'
    default_code = 'invalid_status_transition'


class InsufficientFundsException(PaymentException):
    """Raised when there are insufficient funds"""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Insufficient funds for this transaction.'
    default_code = 'insufficient_funds'


class RefundExceedsPaymentException(PaymentException):
    """Raised when refund amount exceeds original payment"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Refund amount exceeds original payment amount.'
    default_code = 'refund_exceeds_payment'


class InvalidRefundStatusException(PaymentException):
    """Raised when refund status is invalid for operation"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid refund status for this operation.'
    default_code = 'invalid_refund_status'


class InvoiceNotFoundException(PaymentException):
    """Raised when an invoice is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Invoice not found.'
    default_code = 'invoice_not_found'


class PaymentPlanNotFoundException(PaymentException):
    """Raised when a payment plan is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Payment plan not found.'
    default_code = 'payment_plan_not_found'