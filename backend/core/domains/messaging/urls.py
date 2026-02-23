from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"threads", views.MessageThreadViewSet, basename="messagethread")
router.register(r"messages", views.MessageViewSet, basename="message")
router.register(r"admin/threads", views.MessageThreadAdminViewSet, basename="admin-messagethread")
router.register(r"support", views.SupportInquiryViewSet, basename="support-inquiry")
router.register(r"admin/support", views.AdminSupportInquiryViewSet, basename="admin-support-inquiry")

urlpatterns = [
    # Place specific path before router to ensure it matches first
    path("support-settings/", views.PublicSupportSettingsView.as_view(), name="support-settings"),
    path("", include(router.urls)),
]
