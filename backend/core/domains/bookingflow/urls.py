# backend/core/domains/bookingflow/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from ..events.views import EventTypeViewSet
from .views import BookingFlowViewSet

router = DefaultRouter()
router.register(r'flows', BookingFlowViewSet, basename='booking-flows')
router.register(r'event-types', EventTypeViewSet, basename='event-types')

urlpatterns = [
    path('', include(router.urls)),
]