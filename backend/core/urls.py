# lifeplace-app/backend/core/urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from core.domains.settings.views import MobileVersionCheckView
from core.views import health_check, readiness_check

urlpatterns = [
    # Health check endpoints (no auth required)
    path("health/", health_check, name="health_check"),
    path("ready/", readiness_check, name="readiness_check"),
    # OpenAPI Documentation (no auth required)
    path("api/docs/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Mobile app version check (public endpoint)
    path("api/mobile/version/", MobileVersionCheckView.as_view(), name="mobile-version-check"),
    path("admin/", admin.site.urls),
    path("api/users/", include("core.domains.users.urls")),
    path("api/communications/", include("core.domains.communications.urls")),
    path("api/clients/", include("core.domains.clients.urls")),
    path("api/events/", include("core.domains.events.urls")),
    path("api/products/", include("core.domains.products.urls")),
    path("api/venues/", include("core.domains.venues.urls")),
    path("api/vendors/", include("core.domains.vendors.urls")),
    path("api/questionnaires/", include("core.domains.questionnaires.urls")),
    path("api/payments/", include("core.domains.payments.urls")),
    path("api/sales/", include("core.domains.sales.urls")),
    path("api/workflows/", include("core.domains.workflows.urls")),
    path("api/contracts/", include("core.domains.contracts.urls")),
    path("api/bookingflow/", include("core.domains.bookingflow.urls")),
    path("api/notes/", include("core.domains.notes.urls")),
    path("api/notifications/", include("core.domains.notifications.urls")),
    path("api/analytics/", include("core.domains.analytics.urls_v2")),
    path("api/client/analytics/", include("core.domains.analytics.urls_client")),
    path("api/settings/", include("core.domains.settings.urls")),
    path("api/messaging/", include("core.domains.messaging.urls")),
    path("api/vip/", include("core.domains.vip.urls")),
    path("api/security/", include("core.domains.security.urls")),
    path("api/infrastructure/", include("core.infrastructure.urls")),
    # Client-specific endpoint routing for frontend compatibility
    path("api/client/", include("core.domains.events.client_urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
