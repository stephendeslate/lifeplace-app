# backend/core/domains/users/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class UserNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "User not found."
    default_code = "user_not_found"


class InvalidCredentials(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Invalid credentials."
    default_code = "invalid_credentials"


class InvitationExpired(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invitation has expired."
    default_code = "invitation_expired"


class InvitationAlreadyAccepted(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invitation has already been accepted."
    default_code = "invitation_accepted"


class EmailAlreadyExists(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A user with this email already exists."
    default_code = "email_exists"