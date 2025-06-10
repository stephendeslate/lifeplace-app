# backend/core/domains/clients/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class ClientNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Client not found."
    default_code = "client_not_found"


class InvalidClientData(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid client data."
    default_code = "invalid_client_data"


class EmailAlreadyExists(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A user with this email already exists."
    default_code = "email_already_exists"


class ClientDeactivationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Cannot deactivate client with active events."
    default_code = "client_deactivation_error"


class ClientInvitationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Error sending client invitation."
    default_code = "client_invitation_error"


class ClientAlreadyActive(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Client already has an active account."
    default_code = "client_already_active"