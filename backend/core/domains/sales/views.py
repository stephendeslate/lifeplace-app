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
        """Send a DRAFT quote to the client (admin only)

        This action is specifically for quote requests that are in DRAFT status.
        Admin reviews the quote, customizes it if needed, then sends it to the client.
        """
        try:
            quote = self.get_object()

            # Validate that quote is in DRAFT status
            if quote.status != 'DRAFT':
                return Response(
                    {"detail": f"Only DRAFT quotes can be sent. This quote is {quote.get_status_display()}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Use the model's send_to_client method
            quote.send_to_client(request.user)

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

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Preview quote as PDF (inline display)"""
        try:
            from .pdf_service import QuotePDFService

            quote = self.get_object()
            pdf_buffer = QuotePDFService.generate_quote_pdf(quote)

            response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="quote_{quote.id}_v{quote.version}.pdf"'
            return response
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Download quote as PDF (attachment)"""
        try:
            from .pdf_service import QuotePDFService

            quote = self.get_object()
            pdf_buffer = QuotePDFService.generate_quote_pdf(quote)

            response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="quote_{quote.id}_v{quote.version}.pdf"'
            return response
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate and save PDF to quote model"""
        try:
            from .pdf_service import QuotePDFService

            quote = self.get_object()
            pdf_url = QuotePDFService.save_quote_pdf(quote)

            serializer = self.get_serializer(quote)
            return Response({
                **serializer.data,
                'pdf_url': pdf_url
            })
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        """Get activity history for a quote"""
        try:
            from .models import QuoteActivity
            from .serializers import QuoteActivitySerializer

            quote = self.get_object()
            activities = QuoteActivity.objects.filter(quote=quote).order_by('-created_at')
            serializer = QuoteActivitySerializer(activities, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def booking_session_line_items(self, request):
        """Get line items from a booking session for an event.

        This allows admin to populate quote line items from the booking session
        data when editing quotes for events that came from booking flows.

        Query params:
        - event_id: The event ID to get booking session data for

        Returns list of calculated line items based on booking session data.
        """
        from core.domains.bookingflow.models import BookingSession
        from core.domains.sales.pricing_service import PricingCalculationService

        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response(
                {"detail": "event_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find booking session for this event
        try:
            session = BookingSession.objects.select_related('booking_flow').get(
                created_event_id=event_id
            )
        except BookingSession.DoesNotExist:
            return Response(
                {"detail": "No booking session found for this event", "has_booking_session": False},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get event_type_id for event-type-specific pricing
        event_type_id = None
        if session.booking_flow and session.booking_flow.event_type:
            event_type_id = session.booking_flow.event_type_id

        # Calculate pricing using centralized service
        pricing_breakdown = PricingCalculationService.calculate_from_booking_data(
            booking_data=session.booking_data,
            event_type_id=event_type_id
        )

        # Convert line items to response format
        line_items = []
        for item in pricing_breakdown.line_items:
            # Handle custom bundles (product_id=-1) by returning None
            product_id = item.product_id if item.product_id != -1 else None

            line_items.append({
                'description': item.description,
                'quantity': item.quantity,
                'unit_price': str(item.total_unit_price),
                'total': str(item.line_total),
                'product_id': product_id,
                'base_unit_price': str(item.base_unit_price),
                'excess_hours': item.excess_hours,
                'excess_hour_price': str(item.excess_hour_price) if item.excess_hour_price else None,
                'excess_cost': str(item.excess_cost),
                'item_type': item.item_type,
            })

        return Response({
            'has_booking_session': True,
            'session_id': str(session.session_id),
            'line_items': line_items,
            'subtotal': str(pricing_breakdown.subtotal),
            'tax_amount': str(pricing_breakdown.tax_amount),
            'total_amount': str(pricing_breakdown.total_amount),
        })


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

    @action(detail=False, methods=['get'])
    def product_venues(self, request):
        """Get venues associated with a product for venue-based hours selection.

        Query params:
        - product_id: The product ID to get venues for
        - event_type_id: Optional event type ID for event-type-specific pricing

        Returns list of venues with their hours configuration.
        """
        from core.domains.venues.models import PackageVenue, VenueEventTypeConfiguration

        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response(
                {"detail": "product_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        event_type_id = request.query_params.get('event_type_id')

        package_venues = PackageVenue.objects.filter(
            package_id=product_id
        ).select_related('venue')

        # Pre-fetch event type configurations if event_type_id is provided
        event_type_configs = {}
        if event_type_id:
            try:
                event_type_id = int(event_type_id)
                configs = VenueEventTypeConfiguration.objects.filter(
                    venue__in=[pv.venue for pv in package_venues],
                    event_type_id=event_type_id
                ).select_related('venue')
                event_type_configs = {config.venue_id: config for config in configs}
            except (ValueError, TypeError):
                pass

        venues_data = []
        for pv in package_venues:
            venue = pv.venue
            event_config = event_type_configs.get(venue.id)

            if event_config:
                # Use event-type-specific pricing
                included_hours = float(event_config.get_effective_included_hours() or 0)
                excess_hour_price = float(event_config.get_effective_excess_hour_price() or 0)
                is_all_day_access = event_config.is_all_day_access
            else:
                # Fall back to venue defaults
                included_hours = float(venue.standalone_included_hours or 0)
                excess_hour_price = float(venue.standalone_excess_hour_price or 0)
                is_all_day_access = False

            venues_data.append({
                'venue_id': venue.id,
                'venue_name': venue.name,
                'included_hours': included_hours,
                'excess_hour_price': excess_hour_price,
                'is_all_day_access': is_all_day_access,
                'has_event_type_config': event_config is not None,
            })

        return Response(venues_data)

    @action(detail=False, methods=['post'])
    def calculate_pricing(self, request):
        """Calculate pricing for a line item based on product and venue-based hours.

        Request body:
        {
            "product_id": 123,
            "quantity": 1,
            "venue_additional_hours": {"1": 2, "2": 1},  // Optional: venue_id -> additional hours
            "event_type_id": 1  // Optional: for event-type-specific venue pricing
        }

        Returns pricing breakdown including venue-based excess hours calculation.
        Note: Excess hours are now managed at the Venue level, not ProductOption level.
        Event-type-specific pricing is applied when event_type_id is provided.
        """
        from core.domains.sales.pricing_service import PricingCalculationService
        from core.domains.products.models import ProductOption
        from decimal import Decimal

        try:
            product_id = request.data.get('product_id')
            quantity = int(request.data.get('quantity', 1))
            venue_additional_hours = request.data.get('venue_additional_hours', {})
            event_type_id = request.data.get('event_type_id')

            if not product_id:
                return Response(
                    {"detail": "product_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                product = ProductOption.objects.get(pk=product_id)
            except ProductOption.DoesNotExist:
                return Response(
                    {"detail": f"Product with ID {product_id} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Build package data for pricing calculation
            package_data = {
                'product_id': product.id,
                'name': product.name,
                'price': float(product.base_price),
                'quantity': quantity,
            }

            # Use venue-based hours calculation with event_type_id for event-type-specific pricing
            pricing_item = PricingCalculationService._create_package_line_item(
                package_data,
                venue_additional_hours if venue_additional_hours else None,
                event_type_id=event_type_id
            )

            # Get venue breakdown if venue_additional_hours was provided
            venue_breakdown = None
            if venue_additional_hours:
                _, venue_breakdown = PricingCalculationService.get_venue_hours_info(
                    product.id, venue_additional_hours, event_type_id=event_type_id
                )

            if pricing_item:
                item_type = 'ADDON' if getattr(product, 'type', 'PACKAGE') == 'ADDON' else 'PACKAGE'

                # Tax rate: uses product's tax_rate with global fallback
                from .services import get_tax_rate_for_product
                is_tax_inclusive = getattr(product, 'is_tax_inclusive', False)
                tax_rate = get_tax_rate_for_product(product)

                return Response({
                    'product_id': product.id,
                    'product_name': product.name,
                    'description': pricing_item.description,
                    'quantity': pricing_item.quantity,
                    'base_unit_price': str(pricing_item.base_unit_price),
                    'excess_hours': pricing_item.excess_hours,
                    'excess_hour_price': str(pricing_item.excess_hour_price) if pricing_item.excess_hour_price else None,
                    'excess_cost': str(pricing_item.excess_cost),
                    'unit_price': str(pricing_item.total_unit_price),
                    'total': str(pricing_item.line_total),
                    'tax_rate': str(tax_rate),
                    'item_type': item_type,
                    'is_tax_inclusive': is_tax_inclusive,
                    'venue_hours_breakdown': venue_breakdown,
                })
            else:
                return Response(
                    {"detail": "Failed to calculate pricing"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuoteOptionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing quote pricing options"""
    queryset = QuoteOption.objects.select_related('quote').prefetch_related('items')
    serializer_class = QuoteOptionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        quote_id = self.request.query_params.get('quote')
        if quote_id:
            queryset = queryset.filter(quote_id=quote_id)
        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Create a new quote option with optional items"""
        try:
            quote_id = request.data.get('quote')
            if not quote_id:
                return Response(
                    {"detail": "Quote ID is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create the option
            option = QuoteOption.objects.create(
                quote_id=quote_id,
                name=request.data.get('name', ''),
                description=request.data.get('description', ''),
                total_price=0,
                is_selected=request.data.get('is_selected', False)
            )

            # Create items if provided
            items_data = request.data.get('items', [])
            for item_data in items_data:
                QuoteOptionItem.objects.create(
                    option=option,
                    description=item_data.get('description', ''),
                    quantity=item_data.get('quantity', 1),
                    unit_price=item_data.get('unit_price', 0),
                    total=item_data.get('total', 0),
                    product_id=item_data.get('product')
                )

            # Recalculate total
            option.calculate_total()

            serializer = self.get_serializer(option)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Update a quote option"""
        try:
            option = self.get_object()
            option.name = request.data.get('name', option.name)
            option.description = request.data.get('description', option.description)
            option.is_selected = request.data.get('is_selected', option.is_selected)
            option.save()

            # Update items if provided
            items_data = request.data.get('items')
            if items_data is not None:
                # Clear existing items and recreate
                option.items.all().delete()
                for item_data in items_data:
                    QuoteOptionItem.objects.create(
                        option=option,
                        description=item_data.get('description', ''),
                        quantity=item_data.get('quantity', 1),
                        unit_price=item_data.get('unit_price', 0),
                        total=item_data.get('total', 0),
                        product_id=item_data.get('product')
                    )
                option.calculate_total()

            serializer = self.get_serializer(option)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a quote option"""
        try:
            option = self.get_object()
            option.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def select(self, request, pk=None):
        """Select this option (deselects others)"""
        try:
            option = self.get_object()
            # Deselect all other options for this quote
            QuoteOption.objects.filter(quote=option.quote).update(is_selected=False)
            option.is_selected = True
            option.save()
            serializer = self.get_serializer(option)
            return Response(serializer.data)
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
            from .pdf_service import QuotePDFService

            quote = self.get_object()

            # Log PDF download
            from .models import QuoteActivity
            QuoteActivity.objects.create(
                quote=quote,
                action='VIEWED',
                action_by=request.user,
                notes=f"PDF downloaded by client {request.user.get_full_name()}"
            )

            # Generate PDF dynamically
            pdf_buffer = QuotePDFService.generate_quote_pdf(quote)

            # Return file response
            response = HttpResponse(
                pdf_buffer.read(),
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