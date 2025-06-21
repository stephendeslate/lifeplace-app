# backend/core/domains/sales/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class EventNotFoundException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Event not found."

class InvalidQuoteStatusTransition(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid quote status transition."


class TemplateProductAlreadyExists(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This product is already in the template."


class SalesException(APIException):
    """Base exception for sales domain"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A sales error occurred."
    default_code = "sales_error"


class QuoteTemplateNotFound(SalesException):
    """Raised when a quote template is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Quote template not found."
    default_code = "quote_template_not_found"


class QuoteNotFoundException(SalesException):
    """Raised when a quote is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Quote not found."
    default_code = "quote_not_found"


class EventNotFoundException(SalesException):
    """Raised when an event is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Event not found."
    default_code = "event_not_found"


class InvalidQuoteStatusTransition(SalesException):
    """Raised when an invalid quote status transition is attempted"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid quote status transition."
    default_code = "invalid_quote_status_transition"


class LineItemNotFoundException(SalesException):
    """Raised when a line item is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Line item not found."
    default_code = "line_item_not_found"


class TemplateProductAlreadyExists(SalesException):
    """Raised when trying to add a product that already exists in a template"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Product already exists in template."
    default_code = "template_product_already_exists"