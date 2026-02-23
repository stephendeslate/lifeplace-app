# backend/core/domains/communications/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views, webhooks

app_name = "communications"

router = DefaultRouter()
router.register(r"layouts", views.EmailLayoutViewSet)
router.register(r"templates", views.CommunicationTemplateViewSet)
router.register(r"records", views.CommunicationRecordViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("webhooks/brevo/", webhooks.brevo_webhook, name="brevo_webhook"),
    # CAN-SPAM Compliance: Public unsubscribe endpoint
    path("unsubscribe/<uuid:token_id>/", views.email_unsubscribe, name="email_unsubscribe"),
]
