"""
WebSocket routing for the messaging domain.

This module defines URL patterns for WebSocket connections
supporting real-time messaging functionality.
"""

from django.urls import re_path, path
from . import consumers

# WebSocket URL patterns
websocket_urlpatterns = [
    # Thread-specific messaging
    # ws://localhost:8000/ws/messaging/thread/<thread_id>/
    re_path(
        r'ws/messaging/thread/(?P<thread_id>[0-9a-f-]+)/$',
        consumers.ThreadMessagingConsumer.as_asgi(),
        name='thread_messaging'
    ),
    
    # User-specific messaging (personal notifications)
    # ws://localhost:8000/ws/messaging/user/
    re_path(
        r'ws/messaging/user/$',
        consumers.UserMessagingConsumer.as_asgi(),
        name='user_messaging'
    ),
    
    # General messaging (system broadcasts)
    # ws://localhost:8000/ws/messaging/general/
    re_path(
        r'ws/messaging/general/$',
        consumers.GeneralMessagingConsumer.as_asgi(),
        name='general_messaging'
    ),
    
    # Legacy room messaging (backwards compatibility)
    # ws://localhost:8000/ws/messaging/room/<room_id>/
    re_path(
        r'ws/messaging/room/(?P<room_id>[0-9a-f-]+)/$',
        consumers.RoomConsumer.as_asgi(),
        name='room_messaging'
    ),
    
    # Legacy user-to-user messaging (backwards compatibility)
    # ws://localhost:8000/ws/messaging/private/<user_id>/
    re_path(
        r'ws/messaging/private/(?P<user_id>\d+)/$',
        consumers.UserMessagingConsumer.as_asgi(),
        name='private_messaging'
    ),
]

# Application name for routing
app_name = 'messaging_ws'