from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'threads', views.MessageThreadViewSet, basename='messagethread')
router.register(r'messages', views.MessageViewSet, basename='message')
router.register(r'admin/threads', views.MessageThreadAdminViewSet, basename='admin-messagethread')

urlpatterns = [
    path('', include(router.urls)),
]