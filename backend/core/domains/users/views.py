# backend/core/domains/users/views.py
from core.utils.permissions import IsAdmin, IsOwnerOrAdmin
from core.utils.security import (
    LoginRateThrottle, 
    RegistrationRateThrottle,
    validate_email_format,
    validate_password_strength,
    validate_request_data,
    sanitize_input
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
            
            # Log successful registration
            security_logger.log_event(
                SecurityEventType.LOGIN_SUCCESS,  # Consider this a login since tokens are generated
                f"New client registration and auto-login: {user.email}",
                request=request,
                user=user,
                severity='LOW',
                details={'registration': True, 'user_id': user.id}
            )
            
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
        
        with transaction.atomic():
            user = UserService.create_user(serializer.validated_data)
        
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
        user_data = UserSerializer(request.user).data
        users_cache_service.cache_user_detail(user_id, user_data)
        users_cache_service.cache_user_by_email(request.user.email, user_data)
        logger.info(f"Current user data cached for user {user_id}")
        
        return Response(user_data)
    
    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            updated_user = UserService.update_user(request.user, serializer.validated_data)
        
        return Response(UserSerializer(updated_user).data)


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
                invited_by=request.user
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
def accept_invitation(request, invitation_id):
    """
    Accept an admin invitation and create a user account
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
            security_logger.log_security_event(
                event_type='logout',
                user=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
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
        security_logger.log_security_event(
            event_type='logout_all_devices',
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
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
        except:
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