# backend/core/domains/vendors/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    VendorViewSet,
    PackageVendorViewSet,
    PublicVendorViewSet,
)

# Admin router
router = DefaultRouter()
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'package-vendors', PackageVendorViewSet, basename='package-vendor')

# Public router
public_router = DefaultRouter()
public_router.register(r'vendors', PublicVendorViewSet, basename='public-vendor')

urlpatterns = [
    # Admin endpoints
    path('', include(router.urls)),

    # Public endpoints (nested under 'public/')
    path('public/', include(public_router.urls)),
]
