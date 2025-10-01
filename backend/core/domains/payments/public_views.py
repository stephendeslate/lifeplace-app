# backend/core/domains/payments/public_views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.core.cache import cache
import logging

from .models import PaymentGateway, PaymentSettings
from .serializers import PublicPaymentGatewaySerializer, PublicPaymentSettingsSerializer

logger = logging.getLogger(__name__)


class PublicPaymentGatewayThrottle(AnonRateThrottle):
    """Custom throttle for public payment gateway endpoint"""
    rate = '100/hour'


class PublicPaymentGatewayViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for payment gateways.

    This endpoint provides public access to active payment gateways
    without requiring authentication. Only safe, non-sensitive data is exposed.

    Use cases:
    - Guest checkout flows
    - Invoice payments from email links
    - Public booking forms

    Security features:
    - Only active gateways returned (is_active=True)
    - Sensitive configuration data excluded
    - Rate limiting applied
    - Cached responses for performance
    """
    serializer_class = PublicPaymentGatewaySerializer
    permission_classes = [AllowAny]
    throttle_classes = [PublicPaymentGatewayThrottle]

    def get_queryset(self):
        """Return only active payment gateways"""
        return PaymentGateway.objects.filter(is_active=True).order_by('name')

    def list(self, request, *args, **kwargs):
        """
        List all active payment gateways with caching
        """
        cache_key = 'public_payment_gateways'
        cache_timeout = 300  # 5 minutes

        # Try to get cached response
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            logger.debug("Public payment gateways served from cache")
            return Response(cached_data)

        # Cache miss - get from database
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Cache the response
        cache.set(cache_key, serializer.data, cache_timeout)
        logger.info("Public payment gateways cached after database query")

        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific active payment gateway by ID
        """
        gateway_id = kwargs.get('pk')
        cache_key = f'public_payment_gateway_{gateway_id}'
        cache_timeout = 300  # 5 minutes

        # Try to get cached response
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            logger.debug(f"Public payment gateway {gateway_id} served from cache")
            return Response(cached_data)

        # Check if gateway exists and is active
        try:
            gateway = self.get_queryset().get(pk=gateway_id)
        except PaymentGateway.DoesNotExist:
            return Response(
                {"detail": "Payment gateway not found or not active."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Serialize and cache
        serializer = self.get_serializer(gateway)
        cache.set(cache_key, serializer.data, cache_timeout)
        logger.info(f"Public payment gateway {gateway_id} cached after database query")

        return Response(serializer.data)


class PublicPaymentSettingsThrottle(AnonRateThrottle):
    """Custom throttle for public payment settings endpoint"""
    rate = '100/hour'


class PublicPaymentSettingsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for payment settings.

    This endpoint provides public access to payment configuration
    without requiring authentication. Only safe, non-sensitive data is exposed.

    Use cases:
    - Client booking flows (deposit calculations, currency)
    - Guest checkout flows
    - Public refund policy display
    - Payment gateway defaults for booking forms

    Security features:
    - Only safe fields exposed (no admin/internal settings)
    - Sensitive configuration data excluded
    - Rate limiting applied
    - Cached responses for performance
    """
    serializer_class = PublicPaymentSettingsSerializer
    permission_classes = [AllowAny]
    throttle_classes = [PublicPaymentSettingsThrottle]

    def get_queryset(self):
        """Return the singleton payment settings instance"""
        settings = PaymentSettings.get_default_settings()
        return PaymentSettings.objects.filter(id=settings.id)

    def list(self, request, *args, **kwargs):
        """
        Return payment settings as array (for backwards compatibility)
        """
        return self.retrieve(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve the payment settings with caching.
        Always returns the singleton settings instance regardless of ID provided.
        """
        cache_key = 'public_payment_settings'
        cache_timeout = 300  # 5 minutes

        # Try to get cached response
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            logger.debug("Public payment settings served from cache")
            return Response(cached_data)

        # Cache miss - get from database
        settings = PaymentSettings.get_default_settings()
        serializer = self.get_serializer(settings)

        # Cache the response
        cache.set(cache_key, serializer.data, cache_timeout)
        logger.info("Public payment settings cached after database query")

        return Response(serializer.data)