# backend/core/domains/messaging/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'messaging'

router = DefaultRouter()
router.register(r'threads', views.MessageThreadViewSet, basename='thread')
router.register(r'messages', views.MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
    path('attachments/', views.AttachmentUploadView.as_view(), name='attachment-upload'),
    path('threads/<uuid:thread_id>/typing/', views.TypingIndicatorView.as_view(), name='typing-indicator'),
]