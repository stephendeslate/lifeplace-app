# backend/core/domains/products/views/product_category_views.py
import logging

from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..cache_service import product_cache_service
from ..serializers import (
    ProductCategorySerializer,
    ProductCategoryTreeSerializer,
)
from ..services import ProductCategoryService
from .pagination import LargePagination

logger = logging.getLogger(__name__)


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product Categories

    Permissions:
    - List/Retrieve: Public (AllowAny) - categories are public catalog data
    - Create/Update/Delete: Admin only (IsAdmin)
    """

    serializer_class = ProductCategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description"]
    pagination_class = LargePagination  # Use larger pagination for categories

    def get_permissions(self):
        """Allow public read access, require admin for write operations."""
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAdmin()]

    def get_queryset(self):
        is_active = self.request.query_params.get("is_active", None)
        parent_id = self.request.query_params.get("parent_id", None)

        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == "true"

        # Convert parent_id to int or None
        if parent_id is not None:
            try:
                parent_id = int(parent_id) if parent_id != "0" else 0
            except ValueError:
                parent_id = None

        return ProductCategoryService.get_all_categories(is_active=is_active, parent_id=parent_id)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            category = ProductCategoryService.create_category(serializer.validated_data)

        return Response(self.get_serializer(category).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            category = ProductCategoryService.update_category(instance.id, serializer.validated_data)

        return Response(self.get_serializer(category).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        try:
            with transaction.atomic():
                ProductCategoryService.delete_category(instance.id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """Get categories organized as a tree structure"""
        # Try to get from cache first
        cached_data = product_cache_service.get_cached_categories_tree()

        if cached_data is not None:
            logger.debug("Categories tree served from cache")
            return Response(cached_data)

        # Cache miss - get from database
        categories = ProductCategoryService.get_categories_tree()
        serializer = ProductCategoryTreeSerializer(categories, many=True)
        serialized_data = serializer.data

        # Cache the result
        product_cache_service.cache_categories_tree(serialized_data)
        logger.info("Categories tree cached after database query")

        return Response(serialized_data)

    @action(detail=False, methods=["get"])
    def root(self, request):
        """Get only root categories (no parent)"""
        categories = ProductCategoryService.get_all_categories(parent_id=0, is_active=True)
        page = self.paginate_queryset(categories)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def all(self, request):
        """Get all categories without pagination"""
        is_active = self.request.query_params.get("is_active", None)
        if is_active is not None:
            is_active = is_active.lower() == "true"

        categories = ProductCategoryService.get_all_categories(is_active=is_active)
        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)
