# backend/core/infrastructure/urls.py
from django.urls import path

from . import views

urlpatterns = [
    path("dora-metrics/", views.dora_metrics, name="dora-metrics"),
    path("deployments/", views.deployment_history, name="deployment-history"),
    path("record-deploy/", views.record_deployment_api, name="record-deployment"),
]
