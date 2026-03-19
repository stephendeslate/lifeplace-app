import logging

from django.contrib.auth import authenticate
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken

from core.utils.security import (
    RegistrationRateThrottle,
    LoginRateThrottle,
    sanitize_input,
    validate_email_format,
    validate_password_strength,
    validate_request_data,
)
from core.utils.security_logging import SecurityEventType, SecurityLogger

from ..exceptions import InvalidCredentials
from ..models import User
from ..serializers import UserCreateSerializer, UserSerializer
from ..services import UserService

logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(cache_control(no_cache=True, no_store=True, must_revalidate=True), name="dispatch")
class UserLoginAPIView(APIView):
    """
    User login API view with enhanced security

    Security features:
    - Rate limiting (10 attempts per hour per IP)
    - Input validation and sanitization
    - Enhanced error handling
    - Security headers
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        client_ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))

        # Validate request data structure
        validation_result = validate_request_data(
            request.data, required_fields=["email", "password"], optional_fields=["remember_me"]
        )

        if not validation_result["is_valid"]:
            logger.warning(f"Invalid login request from IP {client_ip}: {validation_result['messages']}")
            return Response({"detail": "Invalid request data"}, status=status.HTTP_400_BAD_REQUEST)

        # Additional validation
        email = validation_result["cleaned_data"]["email"]
        password = request.data.get("password")  # Don't sanitize password
        remember_me = validation_result["cleaned_data"].get("remember_me", False)

        # Validate email format
        if not validate_email_format(email):
            logger.warning(f"Invalid email format in login attempt from IP {client_ip}")
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        # Check password length (basic validation without revealing requirements)
        if not password or len(password) < 1:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = authenticate(request, username=email, password=password)

            if user is None:
                # Log failed login attempt
                security_logger.log_login_failure(request, email, "Invalid credentials")
                raise InvalidCredentials()

            if not user.is_active:
                # Log inactive user login attempt
                security_logger.log_login_failure(request, email, "Account is disabled")
                return Response({"detail": "Account is disabled"}, status=status.HTTP_400_BAD_REQUEST)

            # Generate tokens
            tokens = UserService.get_tokens_for_user(user, remember_me)

            # Log successful login
            security_logger.log_login_success(request, user)

            return Response({"tokens": tokens, "user": UserSerializer(user).data})

        except InvalidCredentials:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error during login from IP {client_ip}: {e!s}")
            return Response({"detail": "Login failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([RegistrationRateThrottle])
@cache_control(no_cache=True, no_store=True, must_revalidate=True)
def client_register(request):
    """
    Public endpoint for client self-registration with enhanced security

    This endpoint allows clients to register directly without an invitation.

    Security features:
    - Rate limiting (5 registrations per hour per IP)
    - Enhanced input validation and sanitization
    - Password strength validation
    - Email format validation
    - Improved error handling
    """
    import time

    start_time = time.time()

    client_ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))

    # Validate request data structure
    validation_result = validate_request_data(
        request.data,
        required_fields=["email", "password", "confirm_password", "first_name", "last_name"],
        optional_fields=["phone", "company"],
    )

    if not validation_result["is_valid"]:
        logger.warning(f"Invalid registration request from IP {client_ip}: {validation_result['messages']}")
        return Response({"detail": "Invalid request data"}, status=status.HTTP_400_BAD_REQUEST)

    # Additional validation
    email = validation_result["cleaned_data"]["email"]
    password = request.data.get("password")  # Don't sanitize password
    confirm_password = request.data.get("confirm_password")  # Don't sanitize password

    # Validate email format
    if not validate_email_format(email):
        logger.warning(f"Invalid email format in registration from IP {client_ip}: {email}")
        return Response({"detail": "Invalid email format"}, status=status.HTTP_400_BAD_REQUEST)

    # Validate password strength
    password_validation = validate_password_strength(password)
    if not password_validation["is_valid"]:
        return Response(
            {
                "detail": "Password does not meet security requirements",
                "password_feedback": password_validation["messages"],
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate password confirmation
    if password != confirm_password:
        return Response({"detail": "Passwords do not match"}, status=status.HTTP_400_BAD_REQUEST)

    # Check if user already exists
    if User.objects.filter(email=email).exists():
        logger.warning(f"Registration attempt for existing email from IP {client_ip}: {email}")
        return Response({"detail": "An account with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Create user in transaction
        with transaction.atomic():
            # Prepare user data
            user_data = {
                "email": email,
                "password": password,
                "first_name": sanitize_input(validation_result["cleaned_data"]["first_name"], 150),
                "last_name": sanitize_input(validation_result["cleaned_data"]["last_name"], 150),
                "role": "CLIENT",
            }

            # Add profile data if provided
            profile_data = {}
            if "phone" in validation_result["cleaned_data"]:
                profile_data["phone"] = sanitize_input(validation_result["cleaned_data"]["phone"], 20)
            if "company" in validation_result["cleaned_data"]:
                profile_data["company"] = sanitize_input(validation_result["cleaned_data"]["company"], 200)

            if profile_data:
                user_data["profile"] = profile_data

            # Create user
            user = UserService.create_user(user_data)
            user.auth_method = "password"
            user.save(update_fields=["auth_method"])

            # Generate tokens for automatic login
            tokens = UserService.get_tokens_for_user(user)

        # Log successful registration AFTER transaction completes
        # This prevents blocking the response and avoids nested transaction issues
        try:
            elapsed_time = time.time() - start_time
            security_logger.log_event(
                SecurityEventType.LOGIN_SUCCESS,  # Consider this a login since tokens are generated
                f"New client registration and auto-login: {user.email}",
                request=request,
                user=user,
                severity="LOW",
                details={
                    "registration": True,
                    "user_id": user.id,
                    "registration_duration_ms": round(elapsed_time * 1000, 2),
                },
            )
            logger.info(f"Registration completed for {user.email} in {elapsed_time:.3f}s")
        except Exception as log_error:
            # Don't fail the registration if logging fails
            logger.error(f"Failed to log registration event: {log_error!s}")

        return Response({"tokens": tokens, "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error during client registration from IP {client_ip}: {e!s}")
        return Response(
            {"detail": "Registration failed. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
