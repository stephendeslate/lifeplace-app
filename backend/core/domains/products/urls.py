# backend/core/domains/products/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'products'

router = DefaultRouter()
router.register(r'categories', views.ProductCategoryViewSet, basename='product-category')
router.register(r'products', views.ProductOptionViewSet, basename='product')
router.register(r'discounts', views.DiscountViewSet, basename='discount')

urlpatterns = [
    path('', include(router.urls)),
]