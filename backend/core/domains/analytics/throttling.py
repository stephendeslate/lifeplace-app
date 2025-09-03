# backend/core/domains/analytics/throttling.py
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
import hashlib


class AnalyticsThrottle(AnonRateThrottle):
    """Custom throttle for analytics endpoints"""
    scope = 'analytics'
    
    def allow_request(self, request, view):
        """Skip throttling in development mode"""
        from django.conf import settings
        if settings.DEBUG:
            return True
        return super().allow_request(request, view)


class PublicTrackingThrottle(AnonRateThrottle):
    """Strict throttling for public tracking endpoint"""
    scope = 'public_tracking'
    
    def allow_request(self, request, view):
        """Skip throttling in development mode"""
        from django.conf import settings
        if settings.DEBUG:
            return True
        return super().allow_request(request, view)
    
    def get_ident(self, request):
        """
        Identify the machine making the request by IP and User-Agent.
        This makes it harder for a single source to abuse the endpoint.
        """
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded:
            # Use the first IP in the forwarded chain
            ip = forwarded.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Create a hash of IP + User-Agent for more granular rate limiting
        combined = f"{ip}:{user_agent}"
        return hashlib.sha256(combined.encode()).hexdigest()


class AdminAnalyticsThrottle(UserRateThrottle):
    """Higher limits for authenticated admin users"""
    scope = 'admin_analytics'
    
    def allow_request(self, request, view):
        """
        Skip throttling in development mode, only apply throttling to non-admin users
        """
        from django.conf import settings
        if settings.DEBUG:
            return True
        
        if request.user.is_authenticated and getattr(request.user, 'role', None) == 'ADMIN':
            return True
        return super().allow_request(request, view)