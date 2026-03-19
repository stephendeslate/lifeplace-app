# backend/core/domains/sales/views/option_views.py
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..models import EventQuote, QuoteOption, QuoteOptionItem
from ..serializers import QuoteOptionSerializer


class QuoteOptionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing quote pricing options"""

    queryset = QuoteOption.objects.select_related("quote").prefetch_related("items")
    serializer_class = QuoteOptionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        quote_id = self.request.query_params.get("quote")
        if quote_id:
            queryset = queryset.filter(quote_id=quote_id)
        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """Create a new quote option with optional items"""
        try:
            quote_id = request.data.get("quote")
            if not quote_id:
                return Response({"detail": "Quote ID is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Create the option
            option = QuoteOption.objects.create(
                quote_id=quote_id,
                name=request.data.get("name", ""),
                description=request.data.get("description", ""),
                total_price=0,
                is_selected=request.data.get("is_selected", False),
            )

            # Create items if provided
            items_data = request.data.get("items", [])
            for item_data in items_data:
                QuoteOptionItem.objects.create(
                    option=option,
                    description=item_data.get("description", ""),
                    quantity=item_data.get("quantity", 1),
                    unit_price=item_data.get("unit_price", 0),
                    total=item_data.get("total", 0),
                    product_id=item_data.get("product"),
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
            option.name = request.data.get("name", option.name)
            option.description = request.data.get("description", option.description)
            option.is_selected = request.data.get("is_selected", option.is_selected)
            option.save()

            # Update items if provided
            items_data = request.data.get("items")
            if items_data is not None:
                # Clear existing items and recreate
                option.items.all().delete()
                for item_data in items_data:
                    QuoteOptionItem.objects.create(
                        option=option,
                        description=item_data.get("description", ""),
                        quantity=item_data.get("quantity", 1),
                        unit_price=item_data.get("unit_price", 0),
                        total=item_data.get("total", 0),
                        product_id=item_data.get("product"),
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

    @action(detail=True, methods=["post"])
    def select(self, request, pk=None):
        """Select this option (deselects others).

        Uses atomic transaction to prevent race conditions where
        multiple options could end up selected simultaneously.
        """
        try:
            option = self.get_object()

            with transaction.atomic():
                # Lock the quote to prevent concurrent option selections
                quote = EventQuote.objects.select_for_update().get(pk=option.quote_id)

                # Deselect all options for this quote
                QuoteOption.objects.filter(quote=quote).update(is_selected=False)

                # Re-fetch the option within the transaction and select it
                option = QuoteOption.objects.select_for_update().get(pk=option.pk)
                option.is_selected = True
                option.save()

            serializer = self.get_serializer(option)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
