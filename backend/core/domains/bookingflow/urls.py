# backend/core/domains/bookingflow/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BookingFlowAnalyticsViewSet,
    BookingFlowStepViewSet,
    BookingFlowViewSet,
    BookingSessionViewSet,
    PublicBookingFlowViewSet,
)

app_name = 'bookingflow'

# Admin router for authenticated/admin endpoints
router = DefaultRouter()
router.register(r'flows', BookingFlowViewSet, basename='booking-flow')
router.register(r'steps', BookingFlowStepViewSet, basename='booking-step')
router.register(r'sessions', BookingSessionViewSet, basename='booking-session')
router.register(r'analytics', BookingFlowAnalyticsViewSet, basename='booking-analytics')

# Public router for client-facing endpoints
public_router = DefaultRouter()
public_router.register(r'public/flows', PublicBookingFlowViewSet, basename='public-booking-flow')

urlpatterns = [
    # Admin endpoints
    path('', include(router.urls)),
    
    # Public endpoints
    path('', include(public_router.urls)),
]