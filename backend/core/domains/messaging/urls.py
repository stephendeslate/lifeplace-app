"""
URL routing for the messaging domain.

This module defines RESTful URL patterns for message threads, messages,
attachments, and related messaging functionality.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    MessageThreadViewSet,
    MessageViewSet,
    MessageAttachmentViewSet,
    TypingIndicatorViewSet,
    FileUploadView
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'threads', MessageThreadViewSet, basename='messagethread')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'attachments', MessageAttachmentViewSet, basename='messageattachment')
router.register(r'typing', TypingIndicatorViewSet, basename='typingindicator')
router.register(r'uploads', FileUploadView, basename='fileupload')

# URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Additional thread action URLs (handled by ViewSet actions)
    # These are available through the router:
    # GET /api/messaging/threads/ - List threads
    # POST /api/messaging/threads/ - Create thread
    # GET /api/messaging/threads/{id}/ - Thread detail
    # PUT/PATCH /api/messaging/threads/{id}/ - Update thread
    # DELETE /api/messaging/threads/{id}/ - Delete thread
    # POST /api/messaging/threads/{id}/assign_admin/ - Assign admin
    # POST /api/messaging/threads/{id}/mark_urgent/ - Mark urgent
    # POST /api/messaging/threads/{id}/resolve/ - Resolve thread
    # POST /api/messaging/threads/{id}/reopen/ - Reopen thread
    # GET /api/messaging/threads/stats/ - Thread statistics
    
    # Message URLs:
    # GET /api/messaging/messages/ - List messages (with thread filter)
    # POST /api/messaging/messages/ - Create message
    # GET /api/messaging/messages/{id}/ - Message detail
    # PUT/PATCH /api/messaging/messages/{id}/ - Update message
    # DELETE /api/messaging/messages/{id}/ - Delete message
    # POST /api/messaging/messages/{id}/mark_read/ - Mark message read
    # POST /api/messaging/messages/mark_thread_read/ - Mark thread read
    
    # Attachment URLs:
    # GET /api/messaging/attachments/ - List attachments
    # GET /api/messaging/attachments/{id}/ - Attachment detail
    # GET /api/messaging/attachments/{id}/download/ - Download file
    
    # Typing indicator URLs:
    # GET /api/messaging/typing/ - List typing indicators
    # POST /api/messaging/typing/ - Create typing indicator
    # POST /api/messaging/typing/update_typing/ - Update typing status
    
    # File upload URLs:
    # POST /api/messaging/uploads/ - Upload file
]

# App name for URL namespacing
app_name = 'messaging'