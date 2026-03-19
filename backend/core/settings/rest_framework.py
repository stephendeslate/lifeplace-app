# backend/core/settings/rest_framework.py
"""
Django REST Framework and drf-spectacular configuration.
"""
from .base import DEBUG, LOAD_TEST_MODE

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "core.utils.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ]
    + (["rest_framework.renderers.BrowsableAPIRenderer"] if DEBUG else []),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "analytics": "999999/hour" if DEBUG or LOAD_TEST_MODE else "1000/hour",
        "public_tracking": "999999/hour" if DEBUG or LOAD_TEST_MODE else "100/hour",
        "admin_analytics": "999999/hour" if DEBUG or LOAD_TEST_MODE else "2000/hour",
        "anon": "999999/hour" if DEBUG or LOAD_TEST_MODE else "100/hour",
        "user": "999999/hour" if DEBUG or LOAD_TEST_MODE else "1000/hour",
        "notifications": "999999/hour" if DEBUG or LOAD_TEST_MODE else "200/hour",
        "notifications_admin": "999999/hour" if DEBUG or LOAD_TEST_MODE else "500/hour",
        "communications_manual_send": "999999/min" if DEBUG or LOAD_TEST_MODE else "60/min",
        "communications_bulk_send": "999999/hour" if DEBUG or LOAD_TEST_MODE else "10/hour",
        "communications_preview": "999999/min" if DEBUG or LOAD_TEST_MODE else "30/min",
        "communications_admin": "999999/hour" if DEBUG or LOAD_TEST_MODE else "500/hour",
        "communications_webhook": "999999/hour" if DEBUG or LOAD_TEST_MODE else "200/hour",
        "data_export": "999999/day" if DEBUG or LOAD_TEST_MODE else "1/day",
        "data_access": "999999/hour" if DEBUG or LOAD_TEST_MODE else "10/hour",
        "account_deletion": "999999/day" if DEBUG or LOAD_TEST_MODE else "1/day",
        "data_correction": "999999/day" if DEBUG or LOAD_TEST_MODE else "5/day",
        "processing_objection": "999999/day" if DEBUG or LOAD_TEST_MODE else "3/day",
        "consent_management": "999999/hour" if DEBUG or LOAD_TEST_MODE else "20/hour",
    },
}

# Communications throttle disabled in debug/load test mode
COMMUNICATION_THROTTLE_DISABLED = DEBUG or LOAD_TEST_MODE

SPECTACULAR_SETTINGS = {
    "TITLE": "LifePlace API",
    "DESCRIPTION": """API documentation for the LifePlace event management platform.

## Timezone Handling

**IMPORTANT:** All datetime fields in this API use **Philippine Time (PHT / Asia/Manila / UTC+8)**.

- All event datetimes represent times at the physical venue in the Philippines
- The Philippines does NOT observe daylight saving time (constant UTC+8 year-round)
- All API responses include `timezone` and `timezone_offset` fields for clarity
- When sending datetime values, send in ISO 8601 format (timezone will be interpreted as PHT)

### Example Response
```json
{
  "id": 123,
  "start_date": "2026-03-15T18:00:00",
  "end_date": "2026-03-16T02:00:00",
  "timezone": "Asia/Manila",
  "timezone_offset": "+08:00"
}
```

For clients in different timezones, convert to your local time on the client side using the provided timezone information.
    """,
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
    },
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/",
    "SECURITY": [
        {"Bearer": []},
    ],
    "APPEND_COMPONENTS": {
        "securitySchemes": {
            "Bearer": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "JWT Authorization header using the Bearer scheme",
            }
        }
    },
    "TAGS": [
        {"name": "users", "description": "User authentication and management"},
        {"name": "clients", "description": "Client management"},
        {"name": "events", "description": "Event management"},
        {"name": "payments", "description": "Payment processing"},
        {"name": "bookingflow", "description": "Booking flow management"},
        {"name": "contracts", "description": "Contract management"},
        {"name": "communications", "description": "Email and messaging"},
        {"name": "notifications", "description": "Push and in-app notifications"},
        {"name": "analytics", "description": "Analytics and reporting"},
        {"name": "settings", "description": "Application settings"},
    ],
    "ENUM_NAME_OVERRIDES": {},
    "PREPROCESSING_HOOKS": [],
    "POSTPROCESSING_HOOKS": [],
}
