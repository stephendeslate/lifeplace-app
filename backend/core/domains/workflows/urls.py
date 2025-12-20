# backend/core/domains/workflows/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from .client_views import ClientWorkflowViewSet

app_name = 'workflows'

# Admin router
router = DefaultRouter()
router.register(r'templates', views.WorkflowTemplateViewSet, basename='template')
router.register(r'stages', views.WorkflowStageViewSet, basename='stage')
router.register(r'triggers', views.WorkflowTriggerViewSet, basename='trigger')

# Client router
client_router = DefaultRouter()
client_router.register(r'workflows', ClientWorkflowViewSet, basename='client-workflow')

urlpatterns = [
    path('', include(router.urls)),
    path('client/', include(client_router.urls)),
]