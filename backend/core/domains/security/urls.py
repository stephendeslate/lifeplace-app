# core/domains/security/urls.py

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SecurityBreachViewSet

app_name = "security"

router = DefaultRouter()
router.register(r"breaches", SecurityBreachViewSet, basename="breach")

urlpatterns = [
    path("", include(router.urls)),
]

# Available endpoints:
# GET    /api/security/breaches/                    - List all breaches
# POST   /api/security/breaches/                    - Create new breach
# GET    /api/security/breaches/{id}/               - Get breach details
# PUT    /api/security/breaches/{id}/               - Update breach
# PATCH  /api/security/breaches/{id}/               - Partial update breach
# DELETE /api/security/breaches/{id}/               - Delete breach
# POST   /api/security/breaches/{id}/notify-npc/    - Trigger NPC notification
# POST   /api/security/breaches/{id}/notify-users/  - Trigger user notifications
# POST   /api/security/breaches/{id}/assess-impact/ - Assess breach impact
# GET    /api/security/breaches/{id}/timeline/      - Get breach timeline
# GET    /api/security/breaches/summary/            - Get breaches summary
