# backend/core/domains/notifications/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    NotificationPreferenceViewSet,
    NotificationTypeViewSet,
    NotificationViewSet,
)

app_name = 'notifications'

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'types', NotificationTypeViewSet, basename='notification-type')
router.register(r'preferences', NotificationPreferenceViewSet, basename='notification-preference')

urlpatterns = [
    path('', include(router.urls)),
]