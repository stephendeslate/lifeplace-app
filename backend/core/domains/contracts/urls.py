# backend/core/domains/contracts/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from . import client_views

app_name = 'contracts'

# Admin/internal router
router = DefaultRouter()
router.register(r'templates', views.ContractTemplateViewSet, basename='template')
router.register(r'contracts', views.EventContractViewSet, basename='contract')
router.register(r'signatures', views.ContractSignatureViewSet, basename='signature')
router.register(r'amendments', views.ContractAmendmentViewSet, basename='amendment')
router.register(r'documents', views.ContractDocumentViewSet, basename='document')
router.register(r'notes', views.ContractNoteViewSet, basename='note')

# Client-facing router
client_router = DefaultRouter()
client_router.register(r'contracts', client_views.ClientContractViewSet, basename='client-contract')
client_router.register(r'signatures', client_views.ClientSignatureViewSet, basename='client-signature')

urlpatterns = [
    path('', include(router.urls)),
    path('client/', include(client_router.urls)),
]