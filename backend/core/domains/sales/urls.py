# backend/core/domains/sales/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ClientEventQuoteViewSet,
    EventQuoteViewSet,
    QuoteLineItemViewSet,
    QuoteOptionViewSet,
    QuoteTemplateProductViewSet,
    QuoteTemplateViewSet,
)

# Admin router for admin-only endpoints
admin_router = DefaultRouter()
admin_router.register(r"templates", QuoteTemplateViewSet, basename="quote-templates")
admin_router.register(r"template-products", QuoteTemplateProductViewSet, basename="template-products")
admin_router.register(r"quotes", EventQuoteViewSet, basename="quotes")
admin_router.register(r"line-items", QuoteLineItemViewSet, basename="line-items")
admin_router.register(r"options", QuoteOptionViewSet, basename="quote-options")

# Client router for client-accessible endpoints
client_router = DefaultRouter()
client_router.register(r"quotes", ClientEventQuoteViewSet, basename="client-quotes")

urlpatterns = [
    # Admin endpoints (existing functionality)
    path("", include(admin_router.urls)),
    # Client endpoints (new client-facing functionality)
    path("client/", include(client_router.urls)),
]
