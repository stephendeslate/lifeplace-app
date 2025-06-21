# backend/core/domains/sales/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EventQuoteViewSet,
    QuoteLineItemViewSet,
    QuoteTemplateProductViewSet,
    QuoteTemplateViewSet,
)

router = DefaultRouter()
router.register(r'templates', QuoteTemplateViewSet, basename='quote-templates')
router.register(r'template-products', QuoteTemplateProductViewSet, basename='template-products')
router.register(r'quotes', EventQuoteViewSet, basename='quotes')
router.register(r'line-items', QuoteLineItemViewSet, basename='line-items')

urlpatterns = [
    path('', include(router.urls)),
]