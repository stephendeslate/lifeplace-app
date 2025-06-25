# core/domains/notes/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'notes'

router = DefaultRouter()
router.register(r'', views.NoteViewSet, basename='note')

urlpatterns = [
    path('', include(router.urls)),
]