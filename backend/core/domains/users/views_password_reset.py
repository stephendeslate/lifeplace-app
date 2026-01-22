# backend/core/domains/users/views_password_reset.py
from core.utils.security import (
    validate_email_format,
    validate_password_strength,
    validate_request_data,
)
from core.utils.security_logging import security_logger, SecurityEventType
from core.domains.communications.services import CommunicationService
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
import logging

from .models import PasswordResetToken, User

logger = logging.getLogger(__name__)


class PasswordResetRateThrottle(AnonRateThrottle):
    """Rate limiting for password reset requests"""

    def __init__(self):
        super().__init__()
        # Disable throttling in development
        if settings.DEBUG:
            self.rate = '999999/hour'
        else:
            self.rate = '5/hour'  # 5 password reset requests per hour per IP


class PasswordResetConfirmRateThrottle(AnonRateThrottle):
    """
    SECURITY FIX: Rate limiting for password reset confirmation.
    Stricter limit to prevent brute-force token attacks.
    """

    def __init__(self):
        super().__init__()
        if settings.DEBUG:
            self.rate = '999999/hour'
        else:
            self.rate = '10/hour'  # 10 attempts per hour per IP to prevent token brute-force


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def request_password_reset(request):
    """
    Request password reset - sends email with reset token

    Security features:
    - Rate limiting (5 requests per hour per IP)
    - Email format validation
    - No information disclosure (same response whether email exists or not)
    - Invalidates previous tokens
    """
    client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))

    # Validate request data
    validation_result = validate_request_data(
        request.data,
        required_fields=['email']
    )

    if not validation_result['is_valid']:
        logger.warning(f"Invalid password reset request from IP {client_ip}")
        return Response({
            'detail': 'Invalid request data'
        }, status=status.HTTP_400_BAD_REQUEST)

    email = validation_result['cleaned_data']['email']

    # Validate email format
    if not validate_email_format(email):
        logger.warning(f"Invalid email format in password reset request from IP {client_ip}")
        # Don't reveal whether email is invalid - always return success message
        return Response({
            'detail': 'If an account with that email exists, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)

    try:
        # Try to find user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal that user doesn't exist - return success message anyway
            logger.info(f"Password reset requested for non-existent email: {email}")
            return Response({
                'detail': 'If an account with that email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)

        with transaction.atomic():
            # Invalidate any existing tokens for this user
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

            # Create new reset token
            reset_token = PasswordResetToken.objects.create(user=user)

            # Construct reset URL (frontend will handle this)
            # For admin users, use admin-crm URL; for clients, use client-portal URL
            if user.role == 'ADMIN':
                frontend_url = settings.ADMIN_FRONTEND_URL
            else:
                frontend_url = settings.CLIENT_FRONTEND_URL

            reset_url = f"{frontend_url}/reset-password/{reset_token.id}"

            # Send password reset email using CommunicationService
            try:
                communication_service = CommunicationService()
                communication_service.send_communication(
                    template_name='Password Reset',
                    recipient=user.email,
                    context_data={
                        'first_name': user.first_name or user.get_display_name(),
                        'reset_url': reset_url,
                    },
                    client=user,
                    skip_preference_check=True  # Always send password reset emails
                )

                # Log successful password reset request
                security_logger.log_event(
                    SecurityEventType.PASSWORD_CHANGE,
                    f"Password reset requested for user: {user.email}",
                    request=request,
                    user=user,
                    severity='MEDIUM',
                    details={'token_id': str(reset_token.id)}
                )

                logger.info(f"Password reset email sent to {user.email}")

            except Exception as e:
                logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
                # Don't reveal email send failure to user
                # Fall through to success response

        return Response({
            'detail': 'If an account with that email exists, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error processing password reset request from IP {client_ip}: {str(e)}")
        return Response({
            'detail': 'An error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetConfirmRateThrottle])
def confirm_password_reset(request, token_id):
    """
    Confirm password reset with token and new password

    Security features:
    - Rate limiting (10 requests per hour per IP) - SECURITY FIX
    - Token validation (not used, not expired)
    - Password strength validation
    - Token invalidation after use
    """
    client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))

    # Validate request data
    validation_result = validate_request_data(
        request.data,
        required_fields=['password', 'confirm_password']
    )

    if not validation_result['is_valid']:
        logger.warning(f"Invalid password reset confirmation from IP {client_ip}")
        return Response({
            'detail': 'Invalid request data'
        }, status=status.HTTP_400_BAD_REQUEST)

    password = request.data.get('password')  # Don't sanitize password
    confirm_password = request.data.get('confirm_password')

    # Validate password confirmation
    if password != confirm_password:
        return Response({
            'detail': 'Passwords do not match'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate password strength
    password_validation = validate_password_strength(password)
    if not password_validation['is_valid']:
        return Response({
            'detail': 'Password does not meet security requirements',
            'password_feedback': password_validation['messages']
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get and validate token
        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(id=token_id)
        except PasswordResetToken.DoesNotExist:
            logger.warning(f"Invalid password reset token from IP {client_ip}: {token_id}")
            return Response({
                'detail': 'Invalid or expired reset token'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if token is valid
        if not reset_token.is_valid():
            if reset_token.is_used:
                logger.warning(f"Already used password reset token from IP {client_ip}: {token_id}")
                return Response({
                    'detail': 'This reset link has already been used'
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.warning(f"Expired password reset token from IP {client_ip}: {token_id}")
                return Response({
                    'detail': 'This reset link has expired'
                }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Update user password
            user = reset_token.user
            user.set_password(password)
            user.save()

            # Mark token as used
            reset_token.is_used = True
            reset_token.save()

            # Invalidate any other unused tokens for this user
            PasswordResetToken.objects.filter(
                user=user,
                is_used=False
            ).exclude(id=reset_token.id).update(is_used=True)

            # Log successful password reset
            security_logger.log_event(
                SecurityEventType.PASSWORD_CHANGE,
                f"Password reset completed for user: {user.email}",
                request=request,
                user=user,
                severity='HIGH',
                details={'token_id': str(token_id)}
            )

            logger.info(f"Password reset successful for {user.email}")

        return Response({
            'detail': 'Password has been reset successfully. You can now log in with your new password.'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error confirming password reset from IP {client_ip}: {str(e)}")
        return Response({
            'detail': 'An error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetConfirmRateThrottle])
def validate_reset_token(request, token_id):
    """
    Validate a password reset token without using it
    Useful for frontend to check if token is valid before showing reset form

    Security features:
    - Rate limiting (10 requests per hour per IP) - SECURITY FIX
    """
    try:
        reset_token = PasswordResetToken.objects.select_related('user').get(id=token_id)

        if not reset_token.is_valid():
            if reset_token.is_used:
                return Response({
                    'valid': False,
                    'reason': 'already_used'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'valid': False,
                    'reason': 'expired'
                }, status=status.HTTP_200_OK)

        return Response({
            'valid': True,
            'email': reset_token.user.email  # Show email to user for confirmation
        }, status=status.HTTP_200_OK)

    except PasswordResetToken.DoesNotExist:
        return Response({
            'valid': False,
            'reason': 'not_found'
        }, status=status.HTTP_200_OK)
