from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/messaging/thread/(?P<thread_id>[^/]+)/$', consumers.MessagingConsumer.as_asgi()),
    re_path(r'ws/messaging/global/$', consumers.GlobalMessagingConsumer.as_asgi()),
]