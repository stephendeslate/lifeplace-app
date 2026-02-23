# backend/core/domains/communications/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class CommunicationException(APIException):
    """Base exception for communication domain"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Communication error occurred."
    default_code = "communication_error"


class TemplateNotFound(CommunicationException):
    """Template not found exception"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Communication template not found."
    default_code = "template_not_found"


class TemplateNameExists(CommunicationException):
    """Template name already exists exception"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A template with this name already exists."
    default_code = "template_name_exists"


class InvalidTemplateFormat(CommunicationException):
    """Invalid template format exception"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid template format."
    default_code = "invalid_template_format"


class CommunicationProviderError(CommunicationException):
    """Communication provider error"""

    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Communication provider error occurred."
    default_code = "provider_error"


class SendingFailed(CommunicationException):
    """Communication sending failed"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Failed to send communication."
    default_code = "sending_failed"
