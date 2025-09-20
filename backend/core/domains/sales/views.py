# backend/core/domains/sales/views.py
from core.utils.permissions import IsAdmin
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import Http404, HttpResponse
from django.utils import timezone

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
    ClientEventQuoteSerializer,
)
from .permissions import IsClientQuoteAccessible
from .services import QuoteService, QuoteTemplateService


class QuoteTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing quote templates"""
    queryset = QuoteTemplate.objects.select_related(
        'event_type'
    ).prefetch_related(
        'products',
        'contract_templates',
        'questionnaires'
    )
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
    queryset = QuoteTemplateProduct.objects.select_related(
        'template',
        'product'
    )
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
    queryset = EventQuote.objects.select_related(
        'event',
        'event__client',
        'event__event_type',
        'template',
        'template__event_type',
        'created_by',
        'discount'
    ).prefetch_related(
        'line_items',
        'line_items__product',
        'options',
        'options__items',
        'activities',
        'activities__action_by'
    )
    serializer_class = EventQuoteSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        event_id = self.request.query_params.get('event_id', None)
        client_id = self.request.query_params.get('client_id', None)
        status = self.request.query_params.get('status', None)
        
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        if client_id:
            queryset = queryset.filter(event__client=client_id)
        
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
    queryset = QuoteLineItem.objects.select_related(
        'quote',
        'product'
    )
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


class ClientEventQuoteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Client-facing ViewSet for accessing their own event quotes
    Provides read-only access plus accept/reject actions
    """
    serializer_class = ClientEventQuoteSerializer
    permission_classes = [IsAuthenticated, IsClientQuoteAccessible]

    def get_queryset(self):
        """
        Filter quotes to only those belonging to the authenticated client's events
        and only quotes that are in SENT, ACCEPTED, or REJECTED status
        """
        queryset = EventQuote.objects.select_related(
            'event',
            'event__client',
            'template'
        ).prefetch_related(
            'line_items',
            'line_items__product',
            'options',
            'options__items'
        ).filter(
            event__client=self.request.user,
            status__in=['SENT', 'ACCEPTED', 'REJECTED']
        ).order_by('-created_at')

        # Apply event filter if provided
        event_id = self.request.query_params.get('event', None)
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """Get a specific quote with activity logging"""
        try:
            quote = self.get_object()

            # Log that client viewed the quote
            from .models import QuoteActivity
            QuoteActivity.objects.create(
                quote=quote,
                action='VIEWED',
                action_by=request.user,
                notes=f"Quote viewed by client {request.user.get_full_name()}"
            )

            serializer = self.get_serializer(quote)
            return Response(serializer.data)
        except Http404:
            return Response(
                {"detail": "Quote not found or not accessible"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a quote"""
        try:
            quote = self.get_object()

            # Validate quote can be accepted
            if quote.status != 'SENT':
                return Response(
                    {"detail": "Only sent quotes can be accepted"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Accept the quote using the model method
            signature_data = request.data.get('signature_data', None)
            quote.accept(signature_data=signature_data)

            serializer = self.get_serializer(quote)
            return Response(serializer.data)

        except Http404:
            return Response(
                {"detail": "Quote not found or not accessible"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a quote with optional reason"""
        try:
            quote = self.get_object()

            # Validate quote can be rejected
            if quote.status != 'SENT':
                return Response(
                    {"detail": "Only sent quotes can be rejected"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get rejection reason from request
            reason = request.data.get('reason', '')
            if not reason:
                return Response(
                    {"detail": "Rejection reason is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Reject the quote using the model method
            quote.reject(reason=reason)

            serializer = self.get_serializer(quote)
            return Response(serializer.data)

        except Http404:
            return Response(
                {"detail": "Quote not found or not accessible"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download quote as PDF"""
        try:
            quote = self.get_object()

            # Check if PDF file exists
            if not quote.pdf_file:
                return Response(
                    {"detail": "PDF not available for this quote"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Log PDF download
            from .models import QuoteActivity
            QuoteActivity.objects.create(
                quote=quote,
                action='VIEWED',
                action_by=request.user,
                notes=f"PDF downloaded by client {request.user.get_full_name()}"
            )

            # Return file response
            response = HttpResponse(
                quote.pdf_file.read(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="quote_{quote.id}_v{quote.version}.pdf"'
            return response

        except Http404:
            return Response(
                {"detail": "Quote not found or not accessible"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )