"""
JWT middleware for WebSocket authentication.

This middleware extracts and validates JWT tokens from WebSocket query parameters,
providing compatibility with both session-based and JWT-based authentication.
"""

import jwt
from urllib.parse import parse_qs
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class JWTWebSocketMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSocket connections.
    
    This middleware checks for JWT tokens in query parameters and authenticates
    users accordingly. Falls back to session-based authentication if no token
    is provided.
    """

    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        """
        Extract JWT token from query parameters and authenticate user.
        """
        # Check if we're dealing with a WebSocket connection
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)

        # Try to extract token from query parameters
        query_params = parse_qs(scope.get("query_string", b"").decode())
        token = query_params.get("token", [None])[0]

        if token:
            try:
                # Validate JWT token
                user = await self.get_user_from_jwt(token)
                if user:
                    scope["user"] = user
                    logger.info(f"JWT authentication successful for user {user.id}")
                else:
                    scope["user"] = AnonymousUser()
                    logger.warning("JWT token validation failed")
            except Exception as e:
                logger.error(f"JWT authentication error: {str(e)}")
                scope["user"] = AnonymousUser()
        else:
            # Fall back to session-based authentication (existing behavior)
            logger.debug("No JWT token provided, using session authentication")

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user_from_jwt(self, token):
        """
        Validate JWT token and return the associated user.
        
        Args:
            token (str): The JWT token to validate
            
        Returns:
            User object if token is valid, None otherwise
        """
        try:
            # Get the signing key from settings
            signing_key = getattr(settings, 'SIMPLE_JWT', {}).get('SIGNING_KEY')
            if not signing_key:
                signing_key = settings.SECRET_KEY
                
            # Get the algorithm from settings
            algorithm = getattr(settings, 'SIMPLE_JWT', {}).get('ALGORITHM', 'HS256')

            # Decode the token
            payload = jwt.decode(token, signing_key, algorithms=[algorithm])
            
            # Extract user ID from payload
            user_id = payload.get('user_id')
            if not user_id:
                logger.warning("No user_id found in JWT token payload")
                return None

            # Fetch the user
            try:
                user = User.objects.get(id=user_id)
                if user.is_active:
                    return user
                else:
                    logger.warning(f"User {user_id} is inactive")
                    return None
            except User.DoesNotExist:
                logger.warning(f"User {user_id} not found")
                return None

        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error validating JWT token: {str(e)}")
            return None


def JWTAuthMiddlewareStack(inner):
    """
    Convenience function that wraps the JWTWebSocketMiddleware.
    This can be used as a drop-in replacement for AuthMiddlewareStack
    when JWT authentication is needed.
    """
    return JWTWebSocketMiddleware(inner)