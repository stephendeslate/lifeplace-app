# backend/core/domains/products/views.py
from core.utils.permissions import IsAdmin
from django.db import transaction
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Discount, ProductOption, ProductCategory
from .serializers import (
    DiscountDetailSerializer,
    DiscountSerializer,
    ProductOptionSerializer,
    ProductCategorySerializer,
    ProductCategoryTreeSerializer,
)
from .services import DiscountService, ProductService, ProductCategoryService


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product Categories
    """
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        is_active = self.request.query_params.get('is_active', None)
        parent_id = self.request.query_params.get('parent_id', None)
        
        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        # Convert parent_id to int or None
        if parent_id is not None:
            try:
                parent_id = int(parent_id) if parent_id != '0' else 0
            except ValueError:
                parent_id = None
        
        return ProductCategoryService.get_all_categories(
            is_active=is_active,
            parent_id=parent_id
        )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            category = ProductCategoryService.create_category(serializer.validated_data)
        
        return Response(
            self.get_serializer(category).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            category = ProductCategoryService.update_category(
                instance.id, 
                serializer.validated_data
            )
        
        return Response(self.get_serializer(category).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            with transaction.atomic():
                ProductCategoryService.delete_category(instance.id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get categories organized as a tree structure"""
        categories = ProductCategoryService.get_categories_tree()
        serializer = ProductCategoryTreeSerializer(categories, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def root(self, request):
        """Get only root categories (no parent)"""
        categories = ProductCategoryService.get_all_categories(parent_id=0, is_active=True)
        page = self.paginate_queryset(categories)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)


class ProductOptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product options (products and packages)
    """
    serializer_class = ProductOptionSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'sku']
    
    def get_queryset(self):
        product_type = self.request.query_params.get('type', None)
        is_active = self.request.query_params.get('is_active', None)
        category_id = self.request.query_params.get('category_id', None)
        is_featured = self.request.query_params.get('is_featured', None)
        
        # Convert string parameters to appropriate types
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        if is_featured is not None:
            is_featured = is_featured.lower() == 'true'
        
        if category_id is not None:
            try:
                category_id = int(category_id)
            except ValueError:
                category_id = None
        
        return ProductService.get_all_products(
            product_type=product_type,
            is_active=is_active,
            category_id=category_id,
            is_featured=is_featured
        )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            product = ProductService.create_product(serializer.validated_data)
        
        return Response(
            self.get_serializer(product).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            product = ProductService.update_product(
                instance.id, 
                serializer.validated_data
            )
        
        return Response(self.get_serializer(product).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            ProductService.delete_product(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def packages(self, request):
        """Get only packages"""
        packages = ProductService.get_all_products(product_type='PACKAGE')
        page = self.paginate_queryset(packages)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(packages, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def products(self, request):
        """Get only products"""
        products = ProductService.get_all_products(product_type='PRODUCT')
        page = self.paginate_queryset(products)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active products/packages"""
        active = ProductService.get_all_products(is_active=True)
        page = self.paginate_queryset(active)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(active, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get only featured products/packages"""
        featured = ProductService.get_all_products(is_featured=True, is_active=True)
        page = self.paginate_queryset(featured)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(featured, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get products grouped by category"""
        category_id = request.query_params.get('category_id')
        if not category_id:
            return Response(
                {"detail": "category_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            category_id = int(category_id)
        except ValueError:
            return Response(
                {"detail": "Invalid category_id"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        products = ProductService.get_all_products(category_id=category_id, is_active=True)
        page = self.paginate_queryset(products)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class DiscountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Discounts
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code', 'description']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DiscountDetailSerializer
        return DiscountSerializer
    
    def get_queryset(self):
        is_active = self.request.query_params.get('is_active', None)
        is_valid = self.request.query_params.get('is_valid', None)
        discount_type = self.request.query_params.get('discount_type', None)
        
        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        if is_valid is not None:
            is_valid = is_valid.lower() == 'true'
        
        return DiscountService.get_all_discounts(
            is_active=is_active,
            is_valid=is_valid,
            discount_type=discount_type
        )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            discount = DiscountService.create_discount(serializer.validated_data)
        
        return Response(
            self.get_serializer(discount).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            discount = DiscountService.update_discount(
                instance.id, 
                serializer.validated_data
            )
        
        return Response(self.get_serializer(discount).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            DiscountService.delete_discount(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def valid(self, request):
        """Get currently valid discounts"""
        valid = DiscountService.get_all_discounts(is_valid=True)
        page = self.paginate_queryset(valid)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(valid, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get discounts by type"""
        discount_type = request.query_params.get('type')
        if not discount_type:
            return Response(
                {"detail": "type parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        discounts = DiscountService.get_all_discounts(discount_type=discount_type, is_active=True)
        page = self.paginate_queryset(discounts)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(discounts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def increment_usage(self, request, pk=None):
        """Increment the usage count of a discount"""
        discount = self.get_object()
        discount = DiscountService.increment_discount_usage(discount.id)
        return Response(self.get_serializer(discount).data)
    
    @action(detail=True, methods=['post'])
    def validate_for_order(self, request, pk=None):
        """Validate discount for a specific order"""
        discount = self.get_object()
        
        # Extract validation parameters from request
        client_id = request.data.get('client_id')
        products = request.data.get('products', [])
        categories = request.data.get('categories', [])
        order_amount = request.data.get('order_amount')
        order_hours = request.data.get('order_hours')
        
        if not client_id:
            return Response(
                {"detail": "client_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            client = User.objects.get(id=client_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Client not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_valid, message = DiscountService.validate_discount_for_order(
            discount=discount,
            client=client,
            products=products,
            categories=categories,
            order_amount=order_amount,
            order_hours=order_hours
        )
        
        return Response({
            "is_valid": is_valid,
            "message": message,
            "discount": self.get_serializer(discount).data
        })