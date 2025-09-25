# backend/core/domains/payments/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InvoiceLineItemViewSet,
    InvoiceTaxViewSet,
    InvoiceViewSet,
    PaymentGatewayViewSet,
    PaymentInstallmentViewSet,
    PaymentMethodViewSet,
    PaymentNotificationViewSet,
    PaymentPlanViewSet,
    PaymentSettingsViewSet,
    PaymentTransactionViewSet,
    PaymentViewSet,
    RefundViewSet,
    TaxRateViewSet,
)
from .client_views import (
    ClientInvoiceViewSet,
    ClientPaymentViewSet,
    ClientPaymentInstallmentViewSet,
    ClientPaymentMethodViewSet,
    ClientPaymentPlanViewSet,
    ClientRefundViewSet,
)
from .public_views import (
    PublicPaymentGatewayViewSet,
)

# Admin routers (existing functionality)
router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payment-plans', PaymentPlanViewSet, basename='payment-plan')
router.register(r'installments', PaymentInstallmentViewSet, basename='installment')
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
client_router.register(r'payment-plans', ClientPaymentPlanViewSet, basename='client-payment-plan')
client_router.register(r'installments', ClientPaymentInstallmentViewSet, basename='client-installment')
client_router.register(r'payment-methods', ClientPaymentMethodViewSet, basename='client-payment-method')
client_router.register(r'refunds', ClientRefundViewSet, basename='client-refund')

# Public routers (no authentication required)
public_router = DefaultRouter()
public_router.register(r'gateways', PublicPaymentGatewayViewSet, basename='public-payment-gateway')

urlpatterns = [
    path('', include(router.urls)),
    path('client/', include(client_router.urls)),
    path('public/', include(public_router.urls)),
]