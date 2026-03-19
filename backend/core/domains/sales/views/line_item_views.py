# backend/core/domains/sales/views/line_item_views.py
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..models import QuoteLineItem
from ..serializers import QuoteLineItemSerializer
from ..services import QuoteService


class QuoteLineItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing quote line items"""

    queryset = QuoteLineItem.objects.select_related("quote", "product")
    serializer_class = QuoteLineItemSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def create(self, request, *args, **kwargs):
        """Add a line item to a quote"""
        try:
            line_item = QuoteService.add_line_item(request.data.get("quote"), request.data, request.user)
            serializer = self.get_serializer(line_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Update a line item"""
        try:
            line_item = QuoteService.update_line_item(kwargs.get("pk"), request.data, request.user)
            serializer = self.get_serializer(line_item)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Remove a line item"""
        try:
            QuoteService.remove_line_item(kwargs.get("pk"), request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def product_venues(self, request):
        """Get venues associated with a product for venue-based hours selection."""
        from core.domains.venues.models import PackageVenue, VenueEventTypeConfiguration

        product_id = request.query_params.get("product_id")
        if not product_id:
            return Response({"detail": "product_id query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        event_type_id = request.query_params.get("event_type_id")

        package_venues = PackageVenue.objects.filter(package_id=product_id).select_related("venue")

        # Pre-fetch event type configurations if event_type_id is provided
        event_type_configs = {}
        if event_type_id:
            try:
                event_type_id = int(event_type_id)
                configs = VenueEventTypeConfiguration.objects.filter(
                    venue__in=[pv.venue for pv in package_venues], event_type_id=event_type_id
                ).select_related("venue")
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

            venues_data.append(
                {
                    "venue_id": venue.id,
                    "venue_name": venue.name,
                    "included_hours": included_hours,
                    "excess_hour_price": excess_hour_price,
                    "is_all_day_access": is_all_day_access,
                    "has_event_type_config": event_config is not None,
                }
            )

        return Response(venues_data)

    @action(detail=False, methods=["post"])
    def calculate_pricing(self, request):
        """Calculate pricing for a line item based on product and venue-based hours."""
        from core.domains.products.models import ProductOption
        from core.domains.sales.pricing_service import PricingCalculationService

        try:
            product_id = request.data.get("product_id")
            quantity = int(request.data.get("quantity", 1))
            venue_additional_hours = request.data.get("venue_additional_hours", {})
            event_type_id = request.data.get("event_type_id")

            if not product_id:
                return Response({"detail": "product_id is required"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                product = ProductOption.objects.get(pk=product_id)
            except ProductOption.DoesNotExist:
                return Response({"detail": f"Product with ID {product_id} not found"}, status=status.HTTP_404_NOT_FOUND)

            # Build package data for pricing calculation
            package_data = {
                "product_id": product.id,
                "name": product.name,
                "price": float(product.base_price),
                "quantity": quantity,
            }

            # Use venue-based hours calculation with event_type_id for event-type-specific pricing
            pricing_item = PricingCalculationService._create_package_line_item(
                package_data, venue_additional_hours if venue_additional_hours else None, event_type_id=event_type_id
            )

            # Get venue breakdown if venue_additional_hours was provided
            venue_breakdown = None
            if venue_additional_hours:
                _, venue_breakdown = PricingCalculationService.get_venue_hours_info(
                    product.id, venue_additional_hours, event_type_id=event_type_id
                )

            if pricing_item:
                item_type = "ADDON" if getattr(product, "type", "PACKAGE") == "ADDON" else "PACKAGE"

                # Tax rate: uses product's tax_rate with global fallback
                from ..services import get_tax_rate_for_product

                is_tax_inclusive = getattr(product, "is_tax_inclusive", False)
                tax_rate = get_tax_rate_for_product(product)

                return Response(
                    {
                        "product_id": product.id,
                        "product_name": product.name,
                        "description": pricing_item.description,
                        "quantity": pricing_item.quantity,
                        "base_unit_price": str(pricing_item.base_unit_price),
                        "excess_hours": pricing_item.excess_hours,
                        "excess_hour_price": str(pricing_item.excess_hour_price)
                        if pricing_item.excess_hour_price
                        else None,
                        "excess_cost": str(pricing_item.excess_cost),
                        "unit_price": str(pricing_item.total_unit_price),
                        "total": str(pricing_item.line_total),
                        "tax_rate": str(tax_rate),
                        "item_type": item_type,
                        "is_tax_inclusive": is_tax_inclusive,
                        "venue_hours_breakdown": venue_breakdown,
                    }
                )
            else:
                return Response({"detail": "Failed to calculate pricing"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
