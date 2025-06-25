# backend/core/domains/notifications/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'notifications'

router = DefaultRouter()
router.register(r'templates', views.NotificationTemplateViewSet, basename='template')
router.register(r'preferences', views.NotificationPreferenceViewSet, basename='preference')
router.register(r'rules', views.NotificationRuleViewSet, basename='rule')
router.register(r'queue', views.NotificationQueueViewSet, basename='queue')
router.register(r'history', views.NotificationHistoryViewSet, basename='history')
router.register(r'in-app', views.InAppNotificationViewSet, basename='in-app')
router.register(r'analytics', views.NotificationAnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]