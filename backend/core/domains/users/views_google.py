# backend/core/domains/users/views_google.py
"""
Google OAuth authentication views for client users.

This module provides endpoints for Google Sign-In integration,
allowing client users to authenticate using their Google accounts.
"""

import logging

from django.conf import settings
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import cache_control
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .models import User, UserProfile
from .serializers import UserSerializer
from .services import UserService
from core.utils.security import LoginRateThrottle
from core.utils.security_logging import SecurityLogger

logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
@cache_control(no_cache=True, no_store=True, must_revalidate=True)
def google_login(request):
    """
    Handle Google OAuth login/registration for client users.

    Accepts a Google ID token (credential) from the frontend's
    Google Sign In With Google button and:
    1. Verifies the token with Google
    2. Creates a new CLIENT user if they don't exist
    3. Links Google account to existing users with matching email
    4. Returns JWT tokens for authentication

    Security features:
    - Rate limiting (10 attempts per hour per IP)
    - Token verification with Google
    - Only verified Google emails are accepted
    - Admin users cannot use Google sign-in
    - No password required for Google-authenticated users

    Request body:
        credential: str - Google ID token from Sign In With Google

    Returns:
        200: { tokens: { access, refresh }, user: {...}, created: bool }
        400: { error: str } - Invalid or missing credential
        403: { error: str } - Account deactivated or admin account
        500: { error: str } - Server error
    """
    client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))

    # Get the Google credential (ID token) from request
    credential = request.data.get('credential')

    if not credential:
        logger.warning(f"Google login attempt without credential from IP {client_ip}")
        return Response(
            {'error': 'Google credential is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if Google OAuth is configured
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        logger.error("Google OAuth not configured - GOOGLE_OAUTH_CLIENT_ID is empty")
        return Response(
            {'error': 'Google sign-in is not configured'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID
        )

        # Extract user information from the verified token
        email = idinfo.get('email')
        email_verified = idinfo.get('email_verified', False)
        google_id = idinfo.get('sub')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        picture = idinfo.get('picture', '')

        # Validate email
        if not email:
            logger.warning(f"Google token missing email from IP {client_ip}")
            return Response(
                {'error': 'Email not provided by Google'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Require verified email
        if not email_verified:
            logger.warning(f"Unverified Google email {email} from IP {client_ip}")
            return Response(
                {'error': 'Google email is not verified'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user exists with this email
        user = User.objects.filter(email__iexact=email).first()
        created = False

        if user:
            # Existing user found
            if not user.is_active:
                logger.warning(f"Google login attempt for deactivated account {email}")
                security_logger.log_login_failure(request, email, 'Account is deactivated')
                return Response(
                    {'error': 'Account is deactivated'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Prevent admin users from using Google sign-in
            if user.role == 'ADMIN':
                logger.warning(f"Admin user {email} attempted Google sign-in")
                return Response(
                    {'error': 'Admin accounts cannot use Google sign-in. Please use email/password login.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Update user's name if empty and Google provided it
            updated_fields = []
            if not user.first_name and first_name:
                user.first_name = first_name
                updated_fields.append('first_name')
            if not user.last_name and last_name:
                user.last_name = last_name
                updated_fields.append('last_name')
            # Update auth_method if user was invitation_pending (now using Google)
            if user.auth_method == 'invitation_pending':
                user.auth_method = 'google'
                updated_fields.append('auth_method')
            if updated_fields:
                user.save(update_fields=updated_fields)

            # Update Google profile picture if available and not already set
            if picture and hasattr(user, 'profile') and user.profile:
                if not user.profile.google_picture_url:
                    user.profile.google_picture_url = picture
                    user.profile.save(update_fields=['google_picture_url'])

            logger.info(f"Google login successful for existing user {email}")

        else:
            # Create new user
            with transaction.atomic():
                user = User.objects.create_user(
                    email=email,
                    password=None,  # No password for Google-only users
                    first_name=first_name,
                    last_name=last_name,
                    role='CLIENT',
                    auth_method='google',
                )

                # Ensure profile exists (should be created by signal, but verify)
                if not hasattr(user, 'profile') or user.profile is None:
                    UserProfile.objects.create(user=user, google_picture_url=picture if picture else None)
                elif picture:
                    # Update profile with Google picture
                    user.profile.google_picture_url = picture
                    user.profile.save(update_fields=['google_picture_url'])

            created = True
            logger.info(f"New user created via Google sign-in: {email}")

        # Generate JWT tokens
        tokens = UserService.get_tokens_for_user(user)

        # Log successful authentication
        try:
            if created:
                security_logger.log_event(
                    event_type='LOGIN_SUCCESS',
                    description=f"New client registration via Google: {user.email}",
                    request=request,
                    user=user,
                    severity='LOW',
                    details={
                        'registration': True,
                        'auth_method': 'google',
                        'user_id': user.id,
                        'google_id': google_id,
                    }
                )
            else:
                security_logger.log_login_success(request, user)
        except Exception as log_error:
            logger.error(f"Failed to log Google auth event: {str(log_error)}")

        return Response({
            'tokens': tokens,
            'user': UserSerializer(user).data,
            'created': created,
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        # Token verification failed
        logger.warning(f"Google token verification failed from IP {client_ip}: {e}")
        return Response(
            {'error': 'Invalid Google token'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.exception(f"Google login error from IP {client_ip}: {e}")
        return Response(
            {'error': 'An error occurred during Google sign-in'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def google_client_id(request):
    """
    Return the Google OAuth client ID for frontend use.

    This endpoint allows the frontend to dynamically fetch the
    Google client ID rather than hardcoding it in the frontend build.

    Returns:
        200: { client_id: str }
    """
    return Response({
        'client_id': settings.GOOGLE_OAUTH_CLIENT_ID or ''
    })
