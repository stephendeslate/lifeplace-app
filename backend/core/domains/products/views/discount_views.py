# backend/core/domains/products/views/discount_views.py
import logging

from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..serializers import (
    DiscountDetailSerializer,
    DiscountSerializer,
)
from ..services import DiscountService
from .pagination import LargePagination

logger = logging.getLogger(__name__)


class DiscountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Discounts
    """

    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "code", "description"]
    pagination_class = LargePagination  # Use larger pagination for discounts

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DiscountDetailSerializer
        return DiscountSerializer

    def get_queryset(self):
        is_active = self.request.query_params.get("is_active", None)
        is_valid = self.request.query_params.get("is_valid", None)
        discount_type = self.request.query_params.get("discount_type", None)

        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == "true"

        if is_valid is not None:
            is_valid = is_valid.lower() == "true"

        return DiscountService.get_all_discounts(is_active=is_active, is_valid=is_valid, discount_type=discount_type)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            discount = DiscountService.create_discount(serializer.validated_data)

        return Response(self.get_serializer(discount).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            discount = DiscountService.update_discount(instance.id, serializer.validated_data)

        return Response(self.get_serializer(discount).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        with transaction.atomic():
            DiscountService.delete_discount(instance.id)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def valid(self, request):
        """Get currently valid discounts"""
        valid = DiscountService.get_all_discounts(is_valid=True)
        page = self.paginate_queryset(valid)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(valid, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_type(self, request):
        """Get discounts by type"""
        discount_type = request.query_params.get("type")
        if not discount_type:
            return Response({"detail": "type parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        discounts = DiscountService.get_all_discounts(discount_type=discount_type, is_active=True)
        page = self.paginate_queryset(discounts)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(discounts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def increment_usage(self, request, pk=None):
        """Increment the usage count of a discount"""
        discount = self.get_object()
        discount = DiscountService.increment_discount_usage(discount.id)
        return Response(self.get_serializer(discount).data)

    @action(detail=True, methods=["post"])
    def validate_for_order(self, request, pk=None):
        """Validate discount for a specific order"""
        discount = self.get_object()

        # Extract validation parameters from request
        client_id = request.data.get("client_id")
        products = request.data.get("products", [])
        categories = request.data.get("categories", [])
        order_amount = request.data.get("order_amount")
        order_hours = request.data.get("order_hours")

        if not client_id:
            return Response({"detail": "client_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            client = User.objects.get(id=client_id)
        except User.DoesNotExist:
            return Response({"detail": "Client not found"}, status=status.HTTP_400_BAD_REQUEST)

        is_valid, message = DiscountService.validate_discount_for_order(
            discount=discount,
            client=client,
            products=products,
            categories=categories,
            order_amount=order_amount,
            order_hours=order_hours,
        )

        return Response({"is_valid": is_valid, "message": message, "discount": self.get_serializer(discount).data})

    @action(detail=False, methods=["get"])
    def all(self, request):
        """Get all discounts without pagination"""
        is_active = self.request.query_params.get("is_active", None)
        if is_active is not None:
            is_active = is_active.lower() == "true"

        discounts = DiscountService.get_all_discounts(is_active=is_active)
        serializer = self.get_serializer(discounts, many=True)
        return Response(serializer.data)
