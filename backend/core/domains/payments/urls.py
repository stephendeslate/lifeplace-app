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
    PaymentTransactionViewSet,
    PaymentViewSet,
    RefundViewSet,
    TaxRateViewSet,
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payment-plans', PaymentPlanViewSet, basename='payment-plan')
router.register(r'installments', PaymentInstallmentViewSet, basename='installment')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'gateways', PaymentGatewayViewSet, basename='payment-gateway')
router.register(r'tax-rates', TaxRateViewSet, basename='tax-rate')
router.register(r'transactions', PaymentTransactionViewSet, basename='transaction')
router.register(r'refunds', RefundViewSet, basename='refund')
router.register(r'invoice-items', InvoiceLineItemViewSet, basename='invoice-item')
router.register(r'invoice-taxes', InvoiceTaxViewSet, basename='invoice-tax')
router.register(r'notifications', PaymentNotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]