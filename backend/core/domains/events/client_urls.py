# backend/core/domains/events/client_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientEventViewSet

# Client-only router
client_router = DefaultRouter()
client_router.register(r'events', ClientEventViewSet, basename='client-event')

urlpatterns = [
    path('', include(client_router.urls)),
]