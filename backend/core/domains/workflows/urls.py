# backend/core/domains/workflows/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'workflows'

router = DefaultRouter()
router.register(r'templates', views.WorkflowTemplateViewSet, basename='template')
router.register(r'stages', views.WorkflowStageViewSet, basename='stage')

urlpatterns = [
    path('', include(router.urls)),
]