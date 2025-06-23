# backend/core/domains/bookingflow/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class BookingFlowNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Booking flow not found."


class BookingStepNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Booking step not found."


class DuplicateStepOrder(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A step with this order already exists in this booking flow."


class InvalidStepTypeForConfiguration(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This configuration is not valid for the selected step type."


class ProductItemNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Product item not found."