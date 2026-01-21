# backend/core/domains/payments/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InvoiceLineItemViewSet,
    InvoiceTaxViewSet,
    InvoiceViewSet,
    PaymentGatewayViewSet,
    PaymentMethodViewSet,
    PaymentNotificationViewSet,
    PaymentSettingsViewSet,
    PaymentTransactionViewSet,
    PaymentViewSet,
    RefundViewSet,
    StripeWebhookView,
    TaxRateViewSet,
)
from .client_views import (
    ClientInvoiceViewSet,
    ClientPaymentViewSet,
    ClientPaymentMethodViewSet,
    ClientRefundViewSet,
)
from .public_views import (
    PublicPaymentGatewayViewSet,
    PublicPaymentSettingsViewSet,
)

# Admin routers (existing functionality)
router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'gateways', PaymentGatewayViewSet, basename='payment-gateway')
router.register(r'settings', PaymentSettingsViewSet, basename='payment-settings')
router.register(r'tax-rates', TaxRateViewSet, basename='tax-rate')
router.register(r'transactions', PaymentTransactionViewSet, basename='transaction')
router.register(r'refunds', RefundViewSet, basename='refund')
router.register(r'invoice-items', InvoiceLineItemViewSet, basename='invoice-item')
router.register(r'invoice-taxes', InvoiceTaxViewSet, basename='invoice-tax')
router.register(r'notifications', PaymentNotificationViewSet, basename='notification')

# Client routers (new client-facing endpoints)
client_router = DefaultRouter()
client_router.register(r'payments', ClientPaymentViewSet, basename='client-payment')
client_router.register(r'invoices', ClientInvoiceViewSet, basename='client-invoice')
client_router.register(r'payment-methods', ClientPaymentMethodViewSet, basename='client-payment-method')
client_router.register(r'refunds', ClientRefundViewSet, basename='client-refund')

# Public routers (no authentication required)
public_router = DefaultRouter()
public_router.register(r'gateways', PublicPaymentGatewayViewSet, basename='public-payment-gateway')
public_router.register(r'settings', PublicPaymentSettingsViewSet, basename='public-payment-settings')

urlpatterns = [
    path('', include(router.urls)),
    path('client/', include(client_router.urls)),
    path('public/', include(public_router.urls)),
    # Stripe webhook endpoint
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
]