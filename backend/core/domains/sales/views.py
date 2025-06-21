# backend/core/domains/sales/views.py
from core.utils.permissions import IsAdmin
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    EventQuote,
    QuoteLineItem,
    QuoteOption,
    QuoteOptionItem,
    QuoteTemplate,
    QuoteTemplateProduct,
)
from .serializers import (
    EventQuoteSerializer,
    QuoteLineItemSerializer,
    QuoteOptionItemSerializer,
    QuoteOptionSerializer,
    QuoteTemplateProductSerializer,
    QuoteTemplateSerializer,
)
from .services import QuoteService, QuoteTemplateService


class QuoteTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing quote templates"""
    queryset = QuoteTemplate.objects.all()
    serializer_class = QuoteTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        search = self.request.query_params.get('search', None)
        event_type = self.request.query_params.get('event_type', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        if event_type:
            queryset = queryset.filter(event_type_id=event_type)
        
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new quote template"""
        try:
            template = QuoteTemplateService.create_template(request.data, request.user)
            serializer = self.get_serializer(template)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update an existing quote template"""
        try:
            template = QuoteTemplateService.update_template(
                kwargs.get('pk'), request.data, request.user
            )
            serializer = self.get_serializer(template)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a quote template"""
        try:
            QuoteTemplateService.delete_template(kwargs.get('pk'))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active templates only"""
        queryset = self.get_queryset().filter(is_active=True)
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def for_event_type(self, request):
        """Get templates for a specific event type"""
        event_type = self.request.query_params.get('event_type', None)
        
        if not event_type:
            return Response(
                {"detail": "event_type parameter is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            event_type_id=event_type, is_active=True
        )
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class QuoteTemplateProductViewSet(viewsets.ModelViewSet):
    """ViewSet for managing products in quote templates"""
    queryset = QuoteTemplateProduct.objects.all()
    serializer_class = QuoteTemplateProductSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def create(self, request, *args, **kwargs):
        """Add a product to a template"""
        try:
            product = QuoteTemplateService.add_product_to_template(
                request.data.get('template'), request.data
            )
            serializer = self.get_serializer(product)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update a template product"""
        try:
            product = QuoteTemplateService.update_template_product(
                kwargs.get('pk'), request.data
            )
            serializer = self.get_serializer(product)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Remove a product from a template"""
        try:
            QuoteTemplateService.remove_template_product(kwargs.get('pk'))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EventQuoteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing event quotes"""
    queryset = EventQuote.objects.all()
    serializer_class = EventQuoteSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        event_id = self.request.query_params.get('event_id', None)
        status = self.request.query_params.get('status', None)
        
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new quote"""
        try:
            quote = QuoteService.create_quote(request.data, request.user)
            serializer = self.get_serializer(quote)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update an existing quote"""
        try:
            quote = QuoteService.update_quote(
                kwargs.get('pk'), request.data, request.user
            )
            serializer = self.get_serializer(quote)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a quote"""
        try:
            QuoteService.delete_quote(kwargs.get('pk'))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def for_event(self, request):
        """Get quotes for a specific event"""
        event_id = self.request.query_params.get('event_id', None)
        
        if not event_id:
            return Response(
                {"detail": "event_id parameter is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(event_id=event_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send a quote to the client"""
        try:
            quote = QuoteService.update_quote(
                pk, {'status': 'SENT'}, request.user
            )
            serializer = self.get_serializer(quote)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a quote"""
        try:
            data = {'status': 'ACCEPTED'}
            if 'notes' in request.data:
                data['notes'] = request.data['notes']
            
            quote = QuoteService.update_quote(pk, data, request.user)
            serializer = self.get_serializer(quote)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a quote"""
        try:
            data = {'status': 'REJECTED'}
            if 'notes' in request.data:
                data['rejection_reason'] = request.data['notes']
            
            quote = QuoteService.update_quote(pk, data, request.user)
            serializer = self.get_serializer(quote)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a quote"""
        try:
            quote = QuoteService.duplicate_quote(pk, request.user)
            serializer = self.get_serializer(quote)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuoteLineItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing quote line items"""
    queryset = QuoteLineItem.objects.all()
    serializer_class = QuoteLineItemSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def create(self, request, *args, **kwargs):
        """Add a line item to a quote"""
        try:
            line_item = QuoteService.add_line_item(
                request.data.get('quote'), request.data, request.user
            )
            serializer = self.get_serializer(line_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update a line item"""
        try:
            line_item = QuoteService.update_line_item(
                kwargs.get('pk'), request.data, request.user
            )
            serializer = self.get_serializer(line_item)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Remove a line item"""
        try:
            QuoteService.remove_line_item(kwargs.get('pk'), request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)