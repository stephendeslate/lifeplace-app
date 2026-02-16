# backend/core/domains/users/views.py
from core.utils.permissions import IsAdmin, IsOwnerOrAdmin, CanManageAdmins
from core.utils.security import (
    LoginRateThrottle,
    RegistrationRateThrottle,
    InvitationAcceptRateThrottle,
    validate_email_format,
    validate_password_strength,
    validate_request_data,
    sanitize_input
)
from .throttling import (
    DataAccessThrottle,
    DataExportThrottle,
    AccountDeletionThrottle,
    DataCorrectionThrottle,
    ProcessingObjectionThrottle,
    ConsentManagementThrottle,
)
from core.utils.security_logging import security_logger, SecurityEventType
from django.contrib.auth import authenticate
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import logging

from .exceptions import InvalidCredentials, UserNotFound
from .models import AdminInvitation, User
from .serializers import (
    AdminInvitationSerializer,
    AdminPermissionsSerializer,
    AvatarUploadSerializer,
    PublicAdminInvitationSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from .services import AdminInvitationService, UserService
from .cache_service import users_cache_service
from core.utils.security_logging import SecurityLogger

logger = logging.getLogger(__name__)
security_logger = SecurityLogger()

@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(cache_control(no_cache=True, no_store=True, must_revalidate=True), name='dispatch')
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
        client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        
        # Validate request data structure
        validation_result = validate_request_data(
            request.data,
            required_fields=['email', 'password'],
            optional_fields=['remember_me']
        )
        
        if not validation_result['is_valid']:
            logger.warning(f"Invalid login request from IP {client_ip}: {validation_result['messages']}")
            return Response({
                'detail': 'Invalid request data'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Additional validation
        email = validation_result['cleaned_data']['email']
        password = request.data.get('password')  # Don't sanitize password
        remember_me = validation_result['cleaned_data'].get('remember_me', False)
        
        # Validate email format
        if not validate_email_format(email):
            logger.warning(f"Invalid email format in login attempt from IP {client_ip}")
            return Response({
                'detail': 'Invalid credentials'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check password length (basic validation without revealing requirements)
        if not password or len(password) < 1:
            return Response({
                'detail': 'Invalid credentials'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = authenticate(request, username=email, password=password)
            
            if user is None:
                # Log failed login attempt
                security_logger.log_login_failure(request, email, 'Invalid credentials')
                raise InvalidCredentials()
            
            if not user.is_active:
                # Log inactive user login attempt
                security_logger.log_login_failure(request, email, 'Account is disabled')
                return Response({
                    'detail': 'Account is disabled'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate tokens
            tokens = UserService.get_tokens_for_user(user, remember_me)
            
            # Log successful login
            security_logger.log_login_success(request, user)
            
            return Response({
                'tokens': tokens,
                'user': UserSerializer(user).data
            })
            
        except InvalidCredentials:
            return Response({
                'detail': 'Invalid credentials'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error during login from IP {client_ip}: {str(e)}")
            return Response({
                'detail': 'Login failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
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

    client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    
    # Validate request data structure
    validation_result = validate_request_data(
        request.data,
        required_fields=['email', 'password', 'confirm_password', 'first_name', 'last_name'],
        optional_fields=['phone', 'company']
    )
    
    if not validation_result['is_valid']:
        logger.warning(f"Invalid registration request from IP {client_ip}: {validation_result['messages']}")
        return Response({
            'detail': 'Invalid request data'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Additional validation
    email = validation_result['cleaned_data']['email']
    password = request.data.get('password')  # Don't sanitize password
    confirm_password = request.data.get('confirm_password')  # Don't sanitize password
    
    # Validate email format
    if not validate_email_format(email):
        logger.warning(f"Invalid email format in registration from IP {client_ip}: {email}")
        return Response({
            'detail': 'Invalid email format'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate password strength
    password_validation = validate_password_strength(password)
    if not password_validation['is_valid']:
        return Response({
            'detail': 'Password does not meet security requirements',
            'password_feedback': password_validation['messages']
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate password confirmation
    if password != confirm_password:
        return Response({
            'detail': 'Passwords do not match'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    if User.objects.filter(email=email).exists():
        logger.warning(f"Registration attempt for existing email from IP {client_ip}: {email}")
        return Response({
            'detail': 'An account with this email already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Create user in transaction
        with transaction.atomic():
            # Prepare user data
            user_data = {
                'email': email,
                'password': password,
                'first_name': sanitize_input(validation_result['cleaned_data']['first_name'], 150),
                'last_name': sanitize_input(validation_result['cleaned_data']['last_name'], 150),
                'role': 'CLIENT'
            }

            # Add profile data if provided
            profile_data = {}
            if 'phone' in validation_result['cleaned_data']:
                profile_data['phone'] = sanitize_input(validation_result['cleaned_data']['phone'], 20)
            if 'company' in validation_result['cleaned_data']:
                profile_data['company'] = sanitize_input(validation_result['cleaned_data']['company'], 200)

            if profile_data:
                user_data['profile'] = profile_data

            # Create user
            user = UserService.create_user(user_data)

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
                severity='LOW',
                details={
                    'registration': True,
                    'user_id': user.id,
                    'registration_duration_ms': round(elapsed_time * 1000, 2)
                }
            )
            logger.info(f"Registration completed for {user.email} in {elapsed_time:.3f}s")
        except Exception as log_error:
            # Don't fail the registration if logging fails
            logger.error(f"Failed to log registration event: {str(log_error)}")

        return Response({
            'tokens': tokens,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        logger.error(f"Error during client registration from IP {client_ip}: {str(e)}")
        return Response({
            'detail': 'Registration failed. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserListCreateAPIView(generics.ListCreateAPIView):
    """
    List and create users
    """
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        search_query = self.request.query_params.get('search', None)
        
        # Try cache for search results
        if search_query:
            cached_results = users_cache_service.get_cached_user_search_results(search_query)
            if cached_results is not None:
                logger.debug(f"User search results served from cache for query: {search_query}")
                # Convert cached results back to queryset-like behavior
                # For now, we'll fall back to database query but this could be optimized
                return UserService.get_users(search_query)
        
        # Try cache for general user list
        query_params = dict(self.request.query_params)
        cached_users = users_cache_service.get_cached_user_list(query_params)
        
        if cached_users is not None and not search_query:
            logger.debug("User list served from cache")
            # Convert cached results back to queryset-like behavior
            # For now, we'll fall back to database query but this could be optimized
            
        return UserService.get_users(search_query)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Strip confirm_password as it's only used for validation
        user_data = {k: v for k, v in serializer.validated_data.items() if k != 'confirm_password'}

        with transaction.atomic():
            user = UserService.create_user(user_data)
        
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )


class UserDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a user
    """
    serializer_class = UserSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_object(self):
        user_id = self.kwargs.get('pk')
        
        # Try to get from cache first
        cached_user = users_cache_service.get_cached_user_detail(int(user_id))
        
        if cached_user is not None:
            logger.debug(f"User detail for {user_id} served from cache")
            # We still need the actual user object for permissions checking
            # But we can optimize this in the future
            user = UserService.get_user_by_id(user_id)
            self.check_object_permissions(self.request, user)
            return user
        
        # Cache miss - get from database
        user = UserService.get_user_by_id(user_id)
        self.check_object_permissions(self.request, user)
        
        # Cache the user detail
        user_data = UserSerializer(user).data
        users_cache_service.cache_user_detail(user.id, user_data)
        logger.info(f"User detail for {user_id} cached after database query")
        
        return user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            updated_user = UserService.update_user(user, serializer.validated_data)
        
        return Response(UserSerializer(updated_user).data)
    
    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        
        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        UserService.delete_user(user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    """
    Get or update current logged in user
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = request.user.id

        # Try to get from cache first
        cached_user = users_cache_service.get_cached_user_detail(user_id)

        if cached_user is not None:
            logger.debug(f"Current user data served from cache for user {user_id}")
            return Response(cached_user)

        # Cache miss - serialize and cache
        user_data = UserSerializer(request.user, context={'request': request}).data
        users_cache_service.cache_user_detail(user_id, user_data)
        users_cache_service.cache_user_by_email(request.user.email, user_data)
        logger.info(f"Current user data cached for user {user_id}")

        return Response(user_data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            updated_user = UserService.update_user(request.user, serializer.validated_data)

        return Response(UserSerializer(updated_user, context={'request': request}).data)


class AvatarUploadView(APIView):
    """
    Upload avatar for current user

    POST /api/users/me/avatar/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        avatar_file = serializer.validated_data['avatar']

        # Ensure user has a profile
        if not hasattr(user, 'profile') or user.profile is None:
            from .models import UserProfile
            UserProfile.objects.create(user=user)

        # Delete old avatar if exists
        if user.profile.avatar:
            user.profile.avatar.delete(save=False)

        # Save new avatar
        user.profile.avatar = avatar_file
        user.profile.save()

        # Invalidate user cache
        users_cache_service.invalidate_user_caches(user_id=user.id)

        logger.info(f"Avatar uploaded for user {user.id}")

        return Response(UserSerializer(user, context={'request': request}).data)

    def delete(self, request):
        """Delete current user's avatar"""
        user = request.user

        if hasattr(user, 'profile') and user.profile and user.profile.avatar:
            user.profile.avatar.delete(save=True)
            users_cache_service.invalidate_user_caches(user_id=user.id)
            logger.info(f"Avatar deleted for user {user.id}")

        return Response(UserSerializer(user, context={'request': request}).data)


class AdminInvitationListCreateAPIView(generics.ListCreateAPIView):
    """
    List and create admin invitations
    """
    serializer_class = AdminInvitationSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        # Try to get from cache first
        cached_invitations = users_cache_service.get_cached_pending_invitations()
        
        if cached_invitations is not None:
            logger.debug("Pending invitations served from cache")
            # For now, fall back to database query but cache the results
            queryset = AdminInvitation.objects.filter(is_accepted=False)
            return queryset
        
        # Cache miss - get from database and cache
        queryset = AdminInvitation.objects.filter(is_accepted=False)
        
        # Cache the results
        invitations_data = []
        for invitation in queryset:
            invitations_data.append(AdminInvitationSerializer(invitation).data)
        
        users_cache_service.cache_pending_invitations(invitations_data)
        logger.info("Pending invitations cached after database query")
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            invitation = AdminInvitationService.create_invitation(
                email=serializer.validated_data['email'],
                first_name=serializer.validated_data['first_name'],
                last_name=serializer.validated_data['last_name'],
                invited_by=request.user,
                permissions=serializer.validated_data.get('permissions', {})
            )

        return Response(
            AdminInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED
        )


class AdminInvitationDetailAPIView(generics.RetrieveDestroyAPIView):
    """
    Retrieve or delete an admin invitation
    """
    serializer_class = AdminInvitationSerializer
    permission_classes = [IsAdmin]  # Only admins should delete invitations
    
    def get_object(self):
        invitation_id = self.kwargs.get('pk')
        return AdminInvitationService.get_invitation_by_id(invitation_id)
        
    def get_permissions(self):
        """
        Override to allow anyone to view an invitation, but only admins to delete
        """
        if self.request.method == 'DELETE':
            return [IsAdmin()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        """Use limited serializer for unauthenticated GET requests."""
        if self.request.method == 'GET' and not (self.request.user and self.request.user.is_authenticated):
            return PublicAdminInvitationSerializer
        return AdminInvitationSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Optional: Add additional checks if needed
        if instance.is_accepted:
            return Response(
                {"detail": "Cannot delete an already accepted invitation."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([InvitationAcceptRateThrottle])
def accept_invitation(request, invitation_id):
    """
    Accept an admin invitation and create a user account

    Security features:
    - Rate limiting (5 attempts per hour per IP) - SECURITY FIX
    """
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')
    
    if not password:
        return Response(
            {"detail": "Password is required."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if password != confirm_password:
        return Response(
            {"detail": "Passwords do not match."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate password strength (consistent with client_register)
    password_validation = validate_password_strength(password)
    if not password_validation['is_valid']:
        return Response({
            'detail': 'Password does not meet security requirements',
            'password_feedback': password_validation['messages']
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user = AdminInvitationService.accept_invitation(invitation_id, password)
    
    tokens = UserService.get_tokens_for_user(user)
    
    return Response({
        'message': 'Invitation accepted successfully.',
        'tokens': tokens,
        'user': UserSerializer(user).data
    })


# === SECURE AUTHENTICATION VIEWS ===
# Moved from views/secure_auth_views.py to resolve import conflict

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def secure_logout(request):
    """
    Secure logout that blacklists JWT tokens
    """
    try:
        # Get the refresh token from request
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required for secure logout'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Blacklist the refresh token
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            # Log security event
            security_logger.log_event(
                SecurityEventType.LOGOUT,
                f"User {request.user.email} logged out securely",
                request=request,
                user=request.user,
                details={'method': 'secure_logout_with_blacklist'}
            )
            
            # Invalidate user's cached sessions
            users_cache_service.invalidate_user_tokens(request.user.id)
            users_cache_service.invalidate_user_caches(user_id=request.user.id)
            
            logger.info(f"User {request.user.id} logged out securely with token blacklisting")
            
            return Response(
                {'message': 'Successfully logged out'}, 
                status=status.HTTP_200_OK
            )
            
        except TokenError as e:
            logger.warning(f"Invalid refresh token provided during logout: {e}")
            return Response(
                {'error': 'Invalid refresh token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    except Exception as e:
        logger.error(f"Secure logout failed: {e}")
        return Response(
            {'error': 'Logout failed'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_all_devices(request):
    """
    Logout from all devices by blacklisting all user tokens
    """
    try:
        user = request.user
        
        # Get all outstanding tokens for the user and blacklist them
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        
        outstanding_tokens = OutstandingToken.objects.filter(user=user)
        blacklisted_count = 0
        
        for outstanding_token in outstanding_tokens:
            try:
                token = RefreshToken(outstanding_token.token)
                token.blacklist()
                blacklisted_count += 1
            except TokenError:
                # Token might already be blacklisted or invalid
                continue
        
        # Log security event
        security_logger.log_event(
            SecurityEventType.LOGOUT,
            f"User {user.email} logged out from all devices",
            request=request,
            user=user,
            details={
                'tokens_blacklisted': blacklisted_count,
                'method': 'logout_all_devices'
            }
        )
        
        # Clear all cached sessions for this user
        users_cache_service.invalidate_user_tokens(user.id)
        users_cache_service.invalidate_user_caches(user_id=user.id)
        
        logger.info(f"User {user.id} logged out from all devices ({blacklisted_count} tokens blacklisted)")
        
        return Response({
            'message': f'Successfully logged out from all devices',
            'tokens_blacklisted': blacklisted_count
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Logout all devices failed: {e}")
        return Response(
            {'error': 'Failed to logout from all devices'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def active_sessions(request):
    """
    Get list of user's active sessions/devices
    """
    try:
        user = request.user

        # Get outstanding tokens for the user
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        from django.utils import timezone

        outstanding_tokens = OutstandingToken.objects.filter(
            user=user
        ).exclude(
            blacklistedtoken__isnull=False  # Exclude blacklisted tokens
        ).select_related('user')

        sessions = []
        current_token_jti = None

        # Try to get current token JTI from request
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(
                jwt_auth.get_raw_token(jwt_auth.get_header(request))
            )
            current_token_jti = validated_token.get('jti')
        except Exception:
            pass

        for token in outstanding_tokens:
            try:
                # Parse token to get details
                refresh_token = RefreshToken(token.token)

                session_info = {
                    'jti': str(refresh_token.get('jti')),
                    'created_at': token.created_at.isoformat(),
                    'expires_at': refresh_token.get('exp'),
                    'is_current': str(refresh_token.get('jti')) == current_token_jti,
                }

                sessions.append(session_info)

            except (TokenError, ValueError):
                # Skip invalid tokens
                continue

        return Response({
            'active_sessions': sessions,
            'total_count': len(sessions)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Failed to get active sessions: {e}")
        return Response(
            {'error': 'Failed to retrieve active sessions'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============================================================================
# DPA Compliance Views - Data Subject Rights
# ============================================================================

from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
from .dpa_service import DataSubjectRightsService
from .models import PrivacyRequest, ConsentRecord


class DataAccessView(APIView):
    """
    GET /api/users/me/data/
    Right to Access - View all personal data
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [DataAccessThrottle]

    def get(self, request):
        report = DataSubjectRightsService.generate_data_access_report(request.user)

        # Log the access request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type='ACCESS',
            status='COMPLETED',
            processed_at=timezone.now(),
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response(report)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class DataExportView(APIView):
    """
    GET /api/users/me/export/?export_format=json
    Right to Portability - Export personal data
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [DataExportThrottle]  # Limit to 1/day

    def get(self, request):
        # Use 'export_format' instead of 'format' to avoid DRF content negotiation conflict
        export_format = request.query_params.get('export_format', 'json')

        if export_format not in ['json', 'csv']:
            return Response(
                {"error": "Invalid format. Use 'json' or 'csv'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        content, filename, content_type = DataSubjectRightsService.generate_data_export(
            request.user, export_format
        )

        # Log the export request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type='EXPORT',
            status='COMPLETED',
            processed_at=timezone.now(),
            response_data={"format": export_format, "filename": filename}
        )

        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AccountDeletionView(APIView):
    """
    DELETE /api/users/me/
    Right to Erasure - Delete account
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AccountDeletionThrottle]

    def delete(self, request):
        user = request.user

        # Validate request body
        confirmation = request.data.get('confirmation')
        password = request.data.get('password')

        if confirmation != 'DELETE MY ACCOUNT':
            return Response(
                {"error": "Please type 'DELETE MY ACCOUNT' to confirm"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(password):
            return Response(
                {"error": "Invalid password"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for blockers
        blockers = DataSubjectRightsService.check_deletion_blockers(user)

        if blockers:
            return Response({
                "status": "blocked",
                "message": "Deletion cannot proceed due to active obligations.",
                "blocking_reasons": blockers
            }, status=status.HTTP_409_CONFLICT)

        # Create privacy request record
        privacy_request = PrivacyRequest.objects.create(
            user=user,
            user_email=user.email,
            request_type='DELETION',
            status='PROCESSING',
            request_data={"reason": request.data.get('reason', '')}
        )

        # Process deletion
        summary = DataSubjectRightsService.process_deletion(user, request)

        # Update privacy request
        privacy_request.status = 'COMPLETED'
        privacy_request.processed_at = timezone.now()
        privacy_request.deletion_summary = summary
        privacy_request.save()

        return Response({
            "status": "completed",
            "request_id": str(privacy_request.id),
            "message": "Your account has been deleted.",
            "actions": summary,
            "appeal_contact": settings.DPO_EMAIL
        })


class DataCorrectionView(APIView):
    """
    PATCH /api/users/me/correct/
    Right to Correction - Correct personal data
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [DataCorrectionThrottle]

    def patch(self, request):
        corrections = request.data.get('corrections', [])

        if not corrections:
            return Response(
                {"error": "No corrections provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = DataSubjectRightsService.process_correction(
            request.user, corrections
        )

        # Log the correction request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type='CORRECTION',
            status='COMPLETED',
            processed_at=timezone.now(),
            request_data={"corrections": corrections},
            response_data=results
        )

        return Response({
            "status": "completed",
            "corrections_applied": results["applied"],
            "corrections_pending": results["pending"],
            "corrections_rejected": results["rejected"],
            "third_party_notification": "Corrected data will be shared with relevant third parties within 30 days."
        })


class ProcessingObjectionView(APIView):
    """
    POST /api/users/me/object/
    Right to Object - Object to processing
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ProcessingObjectionThrottle]

    def post(self, request):
        objection_type = request.data.get('objection_type')

        valid_types = ['marketing', 'profiling', 'analytics', 'all_non_essential']
        if objection_type not in valid_types:
            return Response(
                {"error": f"Invalid objection type. Use one of: {valid_types}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = DataSubjectRightsService.process_objection(
            request.user, objection_type
        )

        # Log the objection
        privacy_request = PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type='OBJECTION',
            status='COMPLETED',
            processed_at=timezone.now(),
            request_data={"objection_type": objection_type},
            response_data=results
        )

        return Response({
            "status": "accepted",
            "objection_id": str(privacy_request.id),
            "changes_applied": results["changes_applied"],
            "cannot_object": results["cannot_object"]
        })


class ConsentListView(APIView):
    """
    GET /api/users/me/consents/
    View all active consents
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ConsentManagementThrottle]

    def get(self, request):
        user = request.user
        consent_types = [
            ('MARKETING_EMAIL', 'Marketing emails', True),
            ('MARKETING_SMS', 'Marketing SMS', True),
            ('MARKETING_PUSH', 'Marketing push notifications', True),
            ('ANALYTICS', 'Usage analytics', True),
            ('THIRD_PARTY_SHARING', 'Third-party data sharing', True),
            ('PRIVACY_POLICY', 'Privacy Policy', False),
            ('TERMS_OF_SERVICE', 'Terms of Service', False),
        ]

        consents = []
        for consent_type, purpose, can_withdraw in consent_types:
            record = ConsentRecord.get_current_consent(user, consent_type)
            consents.append({
                "consent_type": consent_type,
                "purpose": purpose,
                "status": "granted" if (record and record.action == 'GRANT') else "not_granted",
                "granted_at": record.created_at.isoformat() if record else None,
                "can_withdraw": can_withdraw
            })

        return Response({"consents": consents})


class ConsentWithdrawView(APIView):
    """
    POST /api/users/me/consents/{consent_type}/withdraw/
    Withdraw a specific consent
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ConsentManagementThrottle]

    def post(self, request, consent_type):
        user = request.user

        # Check if consent can be withdrawn
        non_withdrawable = ['PRIVACY_POLICY', 'TERMS_OF_SERVICE']
        if consent_type in non_withdrawable:
            return Response(
                {"error": "This consent cannot be withdrawn while maintaining an account"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Record withdrawal
        record = ConsentRecord.record_consent(
            user=user,
            consent_type=consent_type,
            granted=False,
            request=request,
            source='PRIVACY_DASHBOARD'
        )

        return Response({
            "status": "withdrawn",
            "consent_type": consent_type,
            "withdrawn_at": record.created_at.isoformat(),
            "effective_immediately": True
        })


class PrivacyRequestListView(APIView):
    """
    GET /api/users/me/privacy-requests/
    View status of all privacy requests
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        requests = PrivacyRequest.objects.filter(
            user=request.user
        ).order_by('-created_at')[:20]

        return Response({
            "requests": [
                {
                    "id": str(req.id),
                    "type": req.request_type,
                    "status": req.status,
                    "submitted_at": req.created_at.isoformat(),
                    "completed_at": req.processed_at.isoformat() if req.processed_at else None,
                    "response_data": req.response_data if req.status == 'COMPLETED' else None
                }
                for req in requests
            ]
        })


# ============================================================================
# Admin Permission Management Views
# ============================================================================

from .permissions_constants import (
    PERMISSION_PRESETS,
    PERMISSION_DESCRIPTIONS,
    PERMISSION_LABELS,
    validate_permissions,
)


class AdminPermissionsPresetsView(APIView):
    """
    GET /api/users/permissions/
    Get available permission presets and descriptions for UI display.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({
            'presets': PERMISSION_PRESETS,
            'descriptions': PERMISSION_DESCRIPTIONS,
            'labels': PERMISSION_LABELS,
        })


class UpdateAdminPermissionsView(APIView):
    """
    PATCH /api/users/{user_id}/permissions/
    Update admin permissions for a specific user.
    Only users with 'can_manage_admins' permission can update permissions.
    """
    permission_classes = [IsAdmin, CanManageAdmins]

    def patch(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id, role='ADMIN')
        except User.DoesNotExist:
            return Response(
                {'detail': 'Admin user not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prevent self-permission modification
        if target_user.id == request.user.id:
            return Response(
                {'detail': 'You cannot modify your own permissions.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent modifying superuser permissions
        if target_user.is_superuser:
            return Response(
                {'detail': 'Cannot modify superuser permissions.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminPermissionsSerializer(data=request.data)
        if serializer.is_valid():
            # Validate and clean permissions
            validated_permissions = validate_permissions(serializer.validated_data)
            target_user.admin_permissions = validated_permissions
            target_user.save()

            # Log the permission change
            logger.info(
                f"Admin permissions updated for user {target_user.email} "
                f"by {request.user.email}: {validated_permissions}"
            )

            return Response({
                'detail': 'Permissions updated successfully.',
                'user': UserSerializer(target_user).data
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, user_id):
        """Get current permissions for a specific admin user."""
        try:
            target_user = User.objects.get(id=user_id, role='ADMIN')
        except User.DoesNotExist:
            return Response(
                {'detail': 'Admin user not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'user_id': target_user.id,
            'email': target_user.email,
            'permissions': target_user.get_all_permissions_dict(),
            'is_full_admin': target_user.is_full_admin(),
        })