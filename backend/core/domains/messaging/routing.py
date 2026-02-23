from django.urls import re_path

from core.domains.events.consumers import AvailabilityConsumer

from . import consumers

websocket_urlpatterns = [
    # Messaging WebSockets (authenticated)
    re_path(r"ws/messaging/thread/(?P<thread_id>[^/]+)/$", consumers.MessagingConsumer.as_asgi()),
    re_path(r"ws/messaging/global/$", consumers.GlobalMessagingConsumer.as_asgi()),
    # Availability WebSocket (public - no auth required)
    # Used for real-time date availability updates during booking
    re_path(r"ws/availability/$", AvailabilityConsumer.as_asgi()),
]
