# backend/core/domains/venues/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    VenueViewSet,
    PackageVenueViewSet,
    VenueBlockedDateViewSet,
    PublicVenueViewSet,
)

# Admin router
router = DefaultRouter()
router.register(r'venues', VenueViewSet, basename='venue')
router.register(r'package-venues', PackageVenueViewSet, basename='package-venue')
router.register(r'blocked-dates', VenueBlockedDateViewSet, basename='venue-blocked-date')

# Public router
public_router = DefaultRouter()
public_router.register(r'venues', PublicVenueViewSet, basename='public-venue')

urlpatterns = [
    # Admin endpoints
    path('', include(router.urls)),

    # Public endpoints (nested under 'public/')
    path('public/', include(public_router.urls)),
]
