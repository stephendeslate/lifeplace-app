# Mobile Version Management API Specification

## Purpose
This API enables mobile apps to check for required updates, receive configuration, and ensure security patch compliance.

---

## 1. Version Check Endpoint

### Endpoint: `GET /api/mobile/version/`

**Authentication:** None required (public endpoint)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | Yes | `ios` or `android` |
| `current_version` | string | Yes | Current app version (semver format) |
| `build_number` | string | No | Build number for additional tracking |

**Request Example:**
```
GET /api/mobile/version/?platform=ios&current_version=1.2.0&build_number=45
```

**Response:**
```json
{
  "status": "ok",
  "platform": "ios",
  "version_info": {
    "minimum_required": "1.0.0",
    "recommended": "1.3.0",
    "latest": "1.3.1",
    "current": "1.2.0"
  },
  "update_required": false,
  "update_recommended": true,
  "force_update": false,
  "update_urls": {
    "ios": "https://apps.apple.com/app/id123456789",
    "android": "https://play.google.com/store/apps/details?id=com.lifeplace.app"
  },
  "messages": {
    "update_title": "Update Available",
    "update_message": "A new version of LifePlace is available with bug fixes and improvements.",
    "force_title": "Update Required",
    "force_message": "Please update to continue using LifePlace. This update includes important security fixes."
  },
  "deprecation": {
    "is_deprecated": false,
    "deprecation_date": null,
    "sunset_date": null,
    "message": null
  },
  "feature_flags": {
    "biometric_login_enabled": true,
    "push_notifications_enabled": true,
    "offline_mode_enabled": true,
    "stripe_enabled": true
  },
  "maintenance": {
    "is_maintenance": false,
    "message": null,
    "expected_end": null
  }
}
```

---

## 2. Force Update Scenarios

### Scenario 1: Critical Security Patch
```json
{
  "status": "update_required",
  "update_required": true,
  "force_update": true,
  "messages": {
    "force_title": "Security Update Required",
    "force_message": "This update includes critical security fixes. Please update immediately to protect your account."
  }
}
```

### Scenario 2: Deprecated Version
```json
{
  "status": "deprecated",
  "update_required": true,
  "force_update": true,
  "deprecation": {
    "is_deprecated": true,
    "deprecation_date": "2025-01-01",
    "sunset_date": "2025-02-01",
    "message": "Version 1.0.x is no longer supported. Please update to continue using LifePlace."
  }
}
```

### Scenario 3: Maintenance Mode
```json
{
  "status": "maintenance",
  "maintenance": {
    "is_maintenance": true,
    "message": "LifePlace is undergoing scheduled maintenance. Please try again later.",
    "expected_end": "2025-01-15T14:00:00Z"
  }
}
```

---

## 3. Backend Model

```python
# core/domains/settings/models.py

class MobileAppVersion(BaseModel):
    """Mobile app version configuration"""
    PLATFORM_CHOICES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
        ('all', 'All Platforms'),
    ]

    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES)

    # Version numbers
    minimum_required_version = models.CharField(
        max_length=20,
        help_text="Minimum version allowed (force update below this)"
    )
    recommended_version = models.CharField(
        max_length=20,
        help_text="Recommended version (soft prompt to update)"
    )
    latest_version = models.CharField(
        max_length=20,
        help_text="Latest available version"
    )

    # Store URLs
    ios_store_url = models.URLField(blank=True)
    android_store_url = models.URLField(blank=True)

    # Messages
    update_title = models.CharField(max_length=100, default="Update Available")
    update_message = models.TextField(default="A new version is available.")
    force_title = models.CharField(max_length=100, default="Update Required")
    force_message = models.TextField(default="Please update to continue.")

    # Deprecation
    deprecation_date = models.DateField(null=True, blank=True)
    sunset_date = models.DateField(null=True, blank=True)
    deprecation_message = models.TextField(blank=True)

    # Maintenance
    is_maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True)
    maintenance_end = models.DateTimeField(null=True, blank=True)

    # Feature flags
    feature_flags = models.JSONField(default=dict)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['platform', 'is_active']  # One active config per platform

    def __str__(self):
        return f"{self.get_platform_display()} - Min: {self.minimum_required_version}"
```

---

## 4. Backend View

```python
# core/domains/settings/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from packaging import version

class MobileVersionCheckView(APIView):
    """Public endpoint for mobile app version checking"""
    permission_classes = [AllowAny]
    throttle_classes = []  # No throttling for version check

    def get(self, request):
        platform = request.query_params.get('platform', 'ios')
        current_version = request.query_params.get('current_version', '0.0.0')

        # Get active config for platform
        config = MobileAppVersion.objects.filter(
            platform__in=[platform, 'all'],
            is_active=True
        ).first()

        if not config:
            return Response({
                "status": "ok",
                "update_required": False,
                "force_update": False
            })

        # Parse versions
        try:
            current = version.parse(current_version)
            minimum = version.parse(config.minimum_required_version)
            recommended = version.parse(config.recommended_version)
        except Exception:
            return Response({"status": "error", "message": "Invalid version format"}, status=400)

        # Determine update status
        update_required = current < minimum
        update_recommended = current < recommended

        # Check maintenance mode
        if config.is_maintenance_mode:
            return Response({
                "status": "maintenance",
                "maintenance": {
                    "is_maintenance": True,
                    "message": config.maintenance_message,
                    "expected_end": config.maintenance_end
                }
            })

        return Response({
            "status": "update_required" if update_required else "ok",
            "platform": platform,
            "version_info": {
                "minimum_required": config.minimum_required_version,
                "recommended": config.recommended_version,
                "latest": config.latest_version,
                "current": current_version
            },
            "update_required": update_required,
            "update_recommended": update_recommended,
            "force_update": update_required,
            "update_urls": {
                "ios": config.ios_store_url,
                "android": config.android_store_url
            },
            "messages": {
                "update_title": config.update_title,
                "update_message": config.update_message,
                "force_title": config.force_title,
                "force_message": config.force_message
            },
            "deprecation": {
                "is_deprecated": config.deprecation_date is not None,
                "deprecation_date": config.deprecation_date,
                "sunset_date": config.sunset_date,
                "message": config.deprecation_message
            },
            "feature_flags": config.feature_flags,
            "maintenance": {
                "is_maintenance": False,
                "message": None,
                "expected_end": None
            }
        })
```

---

## 5. URL Configuration

```python
# core/urls.py

urlpatterns = [
    # ... existing patterns
    path('api/mobile/version/', MobileVersionCheckView.as_view(), name='mobile-version-check'),
]
```

---

## 6. Mobile App Integration

### React Native Hook

```typescript
// src/hooks/useVersionCheck.ts
import { useEffect, useState } from 'react';
import * as Application from 'expo-application';
import { Platform, Alert, Linking } from 'react-native';
import { api } from '@/utils/api';

interface VersionCheckResult {
  status: string;
  update_required: boolean;
  force_update: boolean;
  update_urls: {
    ios: string;
    android: string;
  };
  messages: {
    update_title: string;
    update_message: string;
    force_title: string;
    force_message: string;
  };
}

export function useVersionCheck() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const currentVersion = Application.nativeApplicationVersion || '1.0.0';
        const platform = Platform.OS;

        const response = await api.get<VersionCheckResult>(
          `/api/mobile/version/?platform=${platform}&current_version=${currentVersion}`
        );

        const { data } = response;

        if (data.status === 'maintenance') {
          setIsBlocked(true);
          Alert.alert(
            'Maintenance',
            data.maintenance?.message || 'App is under maintenance.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (data.force_update) {
          setIsBlocked(true);
          Alert.alert(
            data.messages.force_title,
            data.messages.force_message,
            [
              {
                text: 'Update Now',
                onPress: () => {
                  const url = platform === 'ios'
                    ? data.update_urls.ios
                    : data.update_urls.android;
                  Linking.openURL(url);
                },
              },
            ],
            { cancelable: false }
          );
        } else if (data.update_recommended) {
          Alert.alert(
            data.messages.update_title,
            data.messages.update_message,
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Update',
                onPress: () => {
                  const url = platform === 'ios'
                    ? data.update_urls.ios
                    : data.update_urls.android;
                  Linking.openURL(url);
                },
              },
            ]
          );
        }
      } catch (error) {
        // Fail silently - don't block app for version check failures
        console.warn('Version check failed:', error);
      }
    };

    checkVersion();
  }, []);

  return { isBlocked };
}
```

---

## 7. Admin UI Integration

Add to Admin CRM Settings:

### Mobile App Settings Page
- View current version configuration
- Update minimum required version
- Set maintenance mode
- Configure feature flags
- Preview update messages

---

## 8. Monitoring & Analytics

### Metrics to Track
- Version distribution by platform
- Force update trigger frequency
- Update adoption rate
- Maintenance mode activations

### Logging
```python
# Log version checks for analytics
logger.info(
    'mobile_version_check',
    extra={
        'platform': platform,
        'current_version': current_version,
        'update_required': update_required,
        'ip_address': get_client_ip(request)
    }
)
```
