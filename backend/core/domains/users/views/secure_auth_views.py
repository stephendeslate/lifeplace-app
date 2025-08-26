# backend/core/domains/users/views/secure_auth_views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import logging

from ..cache_service import UserCacheService
from core.utils.security_logging import SecurityLogger

logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
            UserCacheService.invalidate_auth_session(request.user.id)
            UserCacheService.invalidate_user_tokens(request.user.id)
            
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
@permission_classes([IsAuthenticated])
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
        UserCacheService.invalidate_auth_session(user.id)
        UserCacheService.invalidate_user_tokens(user.id)
        UserCacheService.invalidate_active_sessions(user.id)
        
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
@permission_classes([IsAuthenticated])
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