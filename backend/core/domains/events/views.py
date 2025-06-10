# backend/core/domains/events/views.py
from core.utils.permissions import IsAdmin, IsAdminOrClient, IsClient, IsOwnerOrAdmin
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import (
    EventTypeSerializer,
)


class EventTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event types
    """
    serializer_class = EventTypeSerializer
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing events
    """
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'client__first_name', 'client__last_name', 'client__email']
    
    

