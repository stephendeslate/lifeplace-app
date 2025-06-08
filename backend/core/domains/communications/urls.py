# backend/core/domains/communications/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'communications'

router = DefaultRouter()
router.register(r'templates', views.CommunicationTemplateViewSet)
router.register(r'records', views.CommunicationRecordViewSet)

urlpatterns = [
    path('', include(router.urls)),
]