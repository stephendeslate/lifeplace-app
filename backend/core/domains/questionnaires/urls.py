# backend/core/domains/questionnaires/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'questionnaires'

router = DefaultRouter()
router.register(r'questionnaires', views.QuestionnaireViewSet, basename='questionnaire')
router.register(r'fields', views.QuestionnaireFieldViewSet, basename='field')
router.register(r'responses', views.QuestionnaireResponseViewSet, basename='response')

urlpatterns = [
    path('', include(router.urls)),
]