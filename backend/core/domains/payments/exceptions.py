# backend/core/domains/payments/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class PaymentNotFoundException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Payment not found."


class InvoiceNotFoundException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Invoice not found."


class PaymentMethodNotFoundException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Payment method not found."


class PaymentPlanNotFoundException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Payment plan not found."


class InvalidPaymentStatusTransition(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid payment status transition."


class PaymentGatewayException(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Payment gateway error occurred."


class PaymentAlreadyCompletedException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Payment is already completed."


class InsufficientFundsException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Insufficient funds for this transaction."


class InvalidPaymentAmountException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid payment amount."


class RefundExceedsPaymentException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Refund amount exceeds original payment amount."


class InvalidRefundStatusException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Cannot refund a payment with this status."