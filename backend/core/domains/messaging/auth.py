"""
WebSocket Authentication Module for JWT-based messaging
Provides secure authentication and authorization for WebSocket connections
"""

import logging
from urllib.parse import parse_qs
from typing import Optional, Tuple, Dict, Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from django.utils.translation import gettext_lazy as _

from channels.middleware import BaseMiddleware
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.exceptions import DenyConnection

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

from core.utils.security_logging import SecurityLogger, SecurityEventType, SecuritySeverity

User = get_user_model()
logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


class JWTAuthMiddleware(BaseMiddleware):
    """
    JWT Authentication middleware for WebSocket connections
    
    Supports authentication via:
    1. Query parameter: ?token=<jwt_token>
    2. Authorization header: Authorization: Bearer <jwt_token>
    3. Subprotocol header for some WebSocket clients
    """
    
    def __init__(self, inner):
        super().__init__(inner)
        self.jwt_authenticator = JWTAuthentication()
    
    async def __call__(self, scope, receive, send):
        # Close any old database connections
        close_old_connections()
        
        # Extract client information for logging
        client_info = self._extract_client_info(scope)
        
        try:
            # Authenticate the user
            user, token_info = await self._authenticate_user(scope, client_info)
            
            # Add user and authentication info to scope
            scope['user'] = user
            scope['token_info'] = token_info
            scope['client_info'] = client_info
            
            # Log successful authentication
            if user and not user.is_anonymous:
                await self._log_websocket_auth_success(user, client_info)
            
        except DenyConnection as e:
            # Log failed authentication
            await self._log_websocket_auth_failure(str(e), client_info)
            raise
        except Exception as e:
            # Log unexpected errors
            await self._log_websocket_auth_error(str(e), client_info)
            # Set anonymous user for unexpected errors
            scope['user'] = AnonymousUser()
            scope['token_info'] = None
            scope['client_info'] = client_info
        
        return await super().__call__(scope, receive, send)
    
    def _extract_client_info(self, scope) -> Dict[str, Any]:
        """Extract client information from WebSocket scope"""
        headers = dict(scope.get('headers', []))
        
        # Get client IP
        client_ip = None
        if b'x-forwarded-for' in headers:
            client_ip = headers[b'x-forwarded-for'].decode().split(',')[0].strip()
        elif b'x-real-ip' in headers:
            client_ip = headers[b'x-real-ip'].decode()
        else:
            # Get from scope client
            client = scope.get('client', [])
            if client and len(client) >= 1:
                client_ip = client[0]
        
        # Get user agent
        user_agent = headers.get(b'user-agent', b'').decode()
        
        # Get origin
        origin = headers.get(b'origin', b'').decode()
        
        return {
            'ip_address': client_ip,
            'user_agent': user_agent,
            'origin': origin,
            'headers': dict(headers),
            'path': scope.get('path', ''),
            'query_string': scope.get('query_string', b'').decode()
        }
    
    async def _authenticate_user(self, scope, client_info) -> Tuple[User, Optional[Dict]]:
        """
        Authenticate user from WebSocket scope
        Returns tuple of (user, token_info)
        """
        token = self._extract_token(scope)
        
        if not token:
            # No token provided - allow anonymous but log the connection
            logger.info(f"Anonymous WebSocket connection from {client_info.get('ip_address')}")
            return AnonymousUser(), None
        
        try:
            # Validate token
            validated_token = UntypedToken(token)
            
            # Get user from token
            user = await self._get_user_from_token(validated_token)
            
            if not user or not user.is_active:
                raise DenyConnection("Invalid or inactive user")
            
            # Extract token information
            token_info = {
                'jti': validated_token.get('jti'),
                'token_type': validated_token.get('token_type'),
                'exp': validated_token.get('exp'),
                'iat': validated_token.get('iat'),
                'user_id': validated_token.get('user_id'),
            }
            
            return user, token_info
            
        except TokenError as e:
            raise DenyConnection(f"Invalid token: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected authentication error: {str(e)}")
            raise DenyConnection("Authentication failed")
    
    def _extract_token(self, scope) -> Optional[str]:
        """
        Extract JWT token from WebSocket connection
        Supports multiple methods of token transmission
        """
        # Method 1: Query parameter
        query_string = scope.get('query_string', b'').decode()
        if query_string:
            params = parse_qs(query_string)
            if 'token' in params:
                return params['token'][0]
        
        # Method 2: Authorization header
        headers = dict(scope.get('headers', []))
        if b'authorization' in headers:
            auth_header = headers[b'authorization'].decode()
            if auth_header.startswith('Bearer '):
                return auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Method 3: Sec-WebSocket-Protocol header (for some clients)
        if b'sec-websocket-protocol' in headers:
            protocols = headers[b'sec-websocket-protocol'].decode()
            # Look for token in protocol list (format: "protocol1, token.jwt.here")
            for protocol in protocols.split(','):
                protocol = protocol.strip()
                if protocol.count('.') == 2:  # JWT format check
                    return protocol
        
        return None
    
    @database_sync_to_async
    def _get_user_from_token(self, validated_token) -> User:
        """Get user from validated JWT token"""
        try:
            user_id = validated_token.get('user_id')
            if not user_id:
                return None
            
            user = User.objects.select_related('profile').get(id=user_id)
            return user
        except User.DoesNotExist:
            return None
    
    @database_sync_to_async
    def _log_websocket_auth_success(self, user: User, client_info: Dict):
        """Log successful WebSocket authentication"""
        security_logger.log_event(
            event_type=SecurityEventType.LOGIN_SUCCESS,
            description=f"WebSocket authentication successful for {user.email}",
            user=user,
            severity=SecuritySeverity.LOW,
            details={
                'connection_type': 'websocket',
                'user_role': user.role,
                'origin': client_info.get('origin'),
                'user_agent': client_info.get('user_agent', '')[:200],
                'path': client_info.get('path'),
            },
            risk_score=5
        )
    
    @database_sync_to_async
    def _log_websocket_auth_failure(self, reason: str, client_info: Dict):
        """Log failed WebSocket authentication"""
        security_logger.log_event(
            event_type=SecurityEventType.LOGIN_FAILURE,
            description=f"WebSocket authentication failed: {reason}",
            severity=SecuritySeverity.MEDIUM,
            details={
                'connection_type': 'websocket',
                'failure_reason': reason,
                'origin': client_info.get('origin'),
                'user_agent': client_info.get('user_agent', '')[:200],
                'path': client_info.get('path'),
                'query_string': client_info.get('query_string', '')[:200],
                'ip_address': client_info.get('ip_address'),
            },
            risk_score=40
        )
    
    @database_sync_to_async
    def _log_websocket_auth_error(self, error: str, client_info: Dict):
        """Log WebSocket authentication errors"""
        security_logger.log_event(
            event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
            description=f"WebSocket authentication error: {error}",
            severity=SecuritySeverity.HIGH,
            details={
                'connection_type': 'websocket',
                'error': error,
                'origin': client_info.get('origin'),
                'user_agent': client_info.get('user_agent', '')[:200],
                'path': client_info.get('path'),
                'ip_address': client_info.get('ip_address'),
            },
            risk_score=60
        )


class TokenAuthMiddleware(BaseMiddleware):
    """
    Token-based authentication middleware that works with the JWTAuthMiddleware
    Provides additional token validation and refresh logic
    """
    
    async def __call__(self, scope, receive, send):
        # Validate token expiry and handle refresh logic if needed
        user = scope.get('user')
        token_info = scope.get('token_info')
        
        if user and token_info and not user.is_anonymous:
            # Check if token is close to expiry (within 5 minutes)
            import time
            current_time = int(time.time())
            exp_time = token_info.get('exp', 0)
            
            # Log if token is close to expiry
            if exp_time - current_time < 300:  # 5 minutes
                logger.info(f"WebSocket token close to expiry for user {user.email}")
                # In a real implementation, you might want to notify the client
                # to refresh their token
        
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """
    Middleware stack that combines JWT authentication with token validation
    """
    return TokenAuthMiddleware(JWTAuthMiddleware(AuthMiddlewareStack(inner)))


# Connection rate limiting utilities
class ConnectionRateLimiter:
    """Rate limiter for WebSocket connections per IP/user"""
    
    def __init__(self):
        from django.core.cache import cache
        self.cache = cache
    
    async def is_allowed(self, identifier: str, limit: int = 10, window: int = 60) -> bool:
        """
        Check if connection is allowed based on rate limiting
        
        Args:
            identifier: IP address or user ID
            limit: Maximum connections per window
            window: Time window in seconds
        """
        key = f"ws_conn_rate:{identifier}"
        current = await database_sync_to_async(self.cache.get)(key, 0)
        
        if current >= limit:
            return False
        
        # Increment counter
        await database_sync_to_async(self.cache.set)(key, current + 1, timeout=window)
        return True
    
    async def get_current_count(self, identifier: str) -> int:
        """Get current connection count for identifier"""
        key = f"ws_conn_rate:{identifier}"
        return await database_sync_to_async(self.cache.get)(key, 0)


# Global rate limiter instance
connection_rate_limiter = ConnectionRateLimiter()