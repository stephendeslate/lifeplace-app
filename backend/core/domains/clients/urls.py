# backend/core/domains/clients/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'clients'

router = DefaultRouter()
router.register(r'', views.ClientViewSet, basename='client')
router.register(r'invitations', views.ClientInvitationViewSet, basename='invitation')

urlpatterns = [
    path('', include(router.urls)),
]