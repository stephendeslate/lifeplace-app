# backend/core/domains/events/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'events'

router = DefaultRouter()
router.register(r'event-types', views.EventTypeViewSet, basename='event-type')
router.register(r'events', views.EventViewSet, basename='event')
router.register(r'event-products', views.EventProductOptionViewSet, basename='event-product')
router.register(r'tasks', views.EventTaskViewSet, basename='task')
router.register(r'files', views.EventFileViewSet, basename='file')
router.register(r'feedback', views.EventFeedbackViewSet, basename='feedback')
router.register(r'timeline', views.EventTimelineViewSet, basename='timeline')

urlpatterns = [
    path('', include(router.urls)),
]