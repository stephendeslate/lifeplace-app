# backend/core/domains/events/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EventViewSet,
    EventTypeViewSet,
    EventTaskViewSet,
    EventFileViewSet,
    EventFeedbackViewSet,
    EventTimelineViewSet,
    EventProductOptionViewSet,
    ClientEventViewSet,
)
from .views.availability_views import (
    DateAvailabilityAPIView,
    DateRangeAvailabilityAPIView,
    ValidateBookingRequestAPIView,
    NextAvailableDateAPIView,
    invalidate_availability_cache,
    PublicEventAvailabilityAPIView,
)

router = DefaultRouter()
# Admin endpoints
router.register(r'events', EventViewSet, basename='event')
router.register(r'event-types', EventTypeViewSet, basename='event-type')
router.register(r'event-tasks', EventTaskViewSet, basename='event-task')
router.register(r'event-files', EventFileViewSet, basename='event-file')
router.register(r'event-feedback', EventFeedbackViewSet, basename='event-feedback')
router.register(r'event-timeline', EventTimelineViewSet, basename='event-timeline')
router.register(r'event-products', EventProductOptionViewSet, basename='event-product')

# Client endpoints
router.register(r'client/events', ClientEventViewSet, basename='client-event')

urlpatterns = [
    path('', include(router.urls)),

    # Date Availability API endpoints
    path('availability/check/', DateAvailabilityAPIView.as_view(), name='check-availability'),
    path('availability/range/', DateRangeAvailabilityAPIView.as_view(), name='check-range-availability'),
    path('availability/validate/', ValidateBookingRequestAPIView.as_view(), name='validate-booking'),
    path('availability/next/', NextAvailableDateAPIView.as_view(), name='next-available-date'),
    path('availability/cache/invalidate/', invalidate_availability_cache, name='invalidate-availability-cache'),

    # Public availability endpoint for booking flow calendars
    path('public/availability/', PublicEventAvailabilityAPIView.as_view(), name='public-event-availability'),
]