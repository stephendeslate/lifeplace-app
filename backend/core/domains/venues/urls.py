# backend/core/domains/venues/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    VenueViewSet,
    PackageVenueViewSet,
    VenueBlockedDateViewSet,
    PublicVenueViewSet,
    PublicGalleryPhotoViewSet,
    GalleryPhotoViewSet,
)

# Admin router
router = DefaultRouter()
router.register(r'venues', VenueViewSet, basename='venue')
router.register(r'package-venues', PackageVenueViewSet, basename='package-venue')
router.register(r'blocked-dates', VenueBlockedDateViewSet, basename='venue-blocked-date')
router.register(r'gallery-photos', GalleryPhotoViewSet, basename='gallery-photo')

# Public router - register at root level (not under 'venues' again)
public_router = DefaultRouter()
public_router.register(r'', PublicVenueViewSet, basename='public-venue')
public_router.register(r'gallery', PublicGalleryPhotoViewSet, basename='public-gallery')

urlpatterns = [
    # Admin endpoints
    path('', include(router.urls)),

    # Public endpoints (nested under 'public/')
    # This gives us /api/venues/public/ and /api/venues/public/rentable/
    # Gallery: /api/venues/public/gallery/
    path('public/', include(public_router.urls)),
]
