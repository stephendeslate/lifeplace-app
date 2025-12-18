# backend/core/domains/vip/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    VIPSettingsViewSet,
    VIPTierViewSet,
    VIPBenefitViewSet,
    ClientVIPStatusViewSet,
    VIPPointTransactionViewSet,
    ClientVIPView,
)

app_name = 'vip'

router = DefaultRouter()
router.register(r'tiers', VIPTierViewSet, basename='vip-tier')
router.register(r'benefits', VIPBenefitViewSet, basename='vip-benefit')
router.register(r'client-status', ClientVIPStatusViewSet, basename='client-vip-status')
router.register(r'point-transactions', VIPPointTransactionViewSet, basename='point-transaction')

# Client portal routes
client_router = DefaultRouter()
client_router.register(r'', ClientVIPView, basename='client-vip')

urlpatterns = [
    # Settings endpoint (singleton)
    path('settings/', VIPSettingsViewSet.as_view({
        'get': 'list',
        'post': 'create',
        'put': 'update_settings',
        'patch': 'update_settings',
    }), name='vip-settings'),

    # Admin routes
    path('', include(router.urls)),

    # Client portal routes
    path('client/', include([
        path('my-status/', ClientVIPView.as_view({'get': 'my_status'}), name='client-my-status'),
        path('my-benefits/', ClientVIPView.as_view({'get': 'my_benefits'}), name='client-my-benefits'),
        path('my-points/', ClientVIPView.as_view({'get': 'my_points'}), name='client-my-points'),
        path('redeemable-benefits/', ClientVIPView.as_view({'get': 'redeemable_benefits'}), name='client-redeemable-benefits'),
        path('redeem-benefit/', ClientVIPView.as_view({'post': 'redeem_benefit'}), name='client-redeem-benefit'),
    ])),
]
