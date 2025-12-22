# Backend Implementation Plan - Mobile App Gaps

This plan bridges all backend gaps required for mobile app production readiness, based on code analysis of the existing codebase and documented specifications.

---

## Executive Summary

| Gap | Priority | Complexity | Est. Effort | Dependencies |
|-----|----------|------------|-------------|--------------|
| Mobile Version API | P0 | Low | 1 day | None |
| ConsentRecord Model | P0 | Medium | 1 day | None |
| Privacy Request Tracking | P0 | Medium | 1 day | ConsentRecord |
| DPA: Right to Access | P0 | Medium | 1 day | None |
| DPA: Right to Export | P0 | Medium | 1 day | Right to Access |
| DPA: Right to Erasure | P0 | High | 2 days | All domains |
| DPA: Right to Correction | P1 | Low | 0.5 days | None |
| DPA: Right to Object | P1 | Low | 0.5 days | ConsentRecord |
| Security Domain Setup | P1 | Medium | 1 day | None |
| Breach Notification System | P1 | High | 2 days | Security Domain |
| Environment Configuration | P0 | Low | 0.5 days | None |

**Total Estimated Effort: 11-12 days**

---

## Phase 1: Foundation (Days 1-2)

### 1.1 Environment Configuration

**File:** `backend/core/settings.py`

Add the following environment variables:

```python
# Mobile App Configuration
MOBILE_APP_IOS_STORE_URL = env('MOBILE_APP_IOS_STORE_URL', default='')
MOBILE_APP_ANDROID_STORE_URL = env('MOBILE_APP_ANDROID_STORE_URL', default='')

# DPA Compliance
DPO_EMAIL = env('DPO_EMAIL', default='dpo@lifeplace.com')
DPO_PHONE = env('DPO_PHONE', default='')
SECURITY_TEAM_EMAIL = env('SECURITY_TEAM_EMAIL', default='')

# Data Retention (in years)
DATA_RETENTION_FINANCIAL = env.int('DATA_RETENTION_FINANCIAL', default=10)  # BIR requirement
DATA_RETENTION_CONTRACTS = env.int('DATA_RETENTION_CONTRACTS', default=10)  # Legal evidence
DATA_RETENTION_ACCOUNT = env.int('DATA_RETENTION_ACCOUNT', default=7)       # Post-deletion
DATA_RETENTION_SECURITY_LOGS = env.int('DATA_RETENTION_SECURITY_LOGS', default=1)
```

**File:** `ENV_VARS.md` - Update documentation

---

### 1.2 Mobile Version API

**Location:** `backend/core/domains/settings/`

This is the simplest gap to close. The API spec is fully defined in `docs/api/MOBILE_VERSION_API.md`.

#### 1.2.1 Model

**File:** `backend/core/domains/settings/models.py` (append)

```python
class MobileAppVersion(BaseModel):
    """Mobile app version configuration per platform"""

    PLATFORM_CHOICES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
        ('all', 'All Platforms'),
    ]

    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES)

    # Version numbers (semver format)
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

    # Update messages
    update_title = models.CharField(max_length=100, default="Update Available")
    update_message = models.TextField(default="A new version is available with improvements.")
    force_title = models.CharField(max_length=100, default="Update Required")
    force_message = models.TextField(default="Please update to continue using the app.")

    # Deprecation
    deprecation_date = models.DateField(null=True, blank=True)
    sunset_date = models.DateField(null=True, blank=True)
    deprecation_message = models.TextField(blank=True)

    # Maintenance mode
    is_maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True)
    maintenance_end = models.DateTimeField(null=True, blank=True)

    # Feature flags (JSON for flexibility)
    feature_flags = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['platform'],
                condition=models.Q(is_active=True),
                name='unique_active_platform_config'
            )
        ]

    def __str__(self):
        return f"{self.get_platform_display()} - v{self.latest_version}"
```

#### 1.2.2 Serializer

**File:** `backend/core/domains/settings/serializers.py` (append)

```python
class MobileVersionResponseSerializer(serializers.Serializer):
    """Response serializer for mobile version check"""
    status = serializers.CharField()
    platform = serializers.CharField()
    version_info = serializers.DictField()
    update_required = serializers.BooleanField()
    update_recommended = serializers.BooleanField()
    force_update = serializers.BooleanField()
    update_urls = serializers.DictField()
    messages = serializers.DictField()
    deprecation = serializers.DictField()
    feature_flags = serializers.DictField()
    maintenance = serializers.DictField()


class MobileAppVersionSerializer(serializers.ModelSerializer):
    """Admin serializer for managing mobile app versions"""
    class Meta:
        model = MobileAppVersion
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
```

#### 1.2.3 View

**File:** `backend/core/domains/settings/views.py` (append)

```python
from packaging import version as semver
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class MobileVersionCheckView(APIView):
    """
    Public endpoint for mobile app version checking.

    GET /api/mobile/version/?platform=ios&current_version=1.0.0
    """
    permission_classes = [AllowAny]
    throttle_classes = []  # No throttling for version checks

    def get(self, request):
        platform = request.query_params.get('platform', 'ios')
        current_version_str = request.query_params.get('current_version', '0.0.0')

        # Get active config for platform (or 'all')
        config = MobileAppVersion.objects.filter(
            platform__in=[platform, 'all'],
            is_active=True
        ).first()

        # No config - allow app to proceed
        if not config:
            return Response({
                "status": "ok",
                "update_required": False,
                "update_recommended": False,
                "force_update": False,
                "feature_flags": {}
            })

        # Check maintenance mode first
        if config.is_maintenance_mode:
            return Response({
                "status": "maintenance",
                "maintenance": {
                    "is_maintenance": True,
                    "message": config.maintenance_message,
                    "expected_end": config.maintenance_end.isoformat() if config.maintenance_end else None
                }
            })

        # Parse and compare versions
        try:
            current = semver.parse(current_version_str)
            minimum = semver.parse(config.minimum_required_version)
            recommended = semver.parse(config.recommended_version)
        except Exception:
            return Response(
                {"status": "error", "message": "Invalid version format"},
                status=400
            )

        update_required = current < minimum
        update_recommended = current < recommended

        # Check deprecation
        is_deprecated = False
        if config.deprecation_date:
            from django.utils import timezone
            is_deprecated = timezone.now().date() >= config.deprecation_date

        return Response({
            "status": "update_required" if update_required else ("deprecated" if is_deprecated else "ok"),
            "platform": platform,
            "version_info": {
                "minimum_required": config.minimum_required_version,
                "recommended": config.recommended_version,
                "latest": config.latest_version,
                "current": current_version_str
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
                "is_deprecated": is_deprecated,
                "deprecation_date": config.deprecation_date.isoformat() if config.deprecation_date else None,
                "sunset_date": config.sunset_date.isoformat() if config.sunset_date else None,
                "message": config.deprecation_message
            },
            "feature_flags": config.feature_flags or {},
            "maintenance": {
                "is_maintenance": False,
                "message": None,
                "expected_end": None
            }
        })
```

#### 1.2.4 URL Configuration

**File:** `backend/core/urls.py` (add to urlpatterns)

```python
from core.domains.settings.views import MobileVersionCheckView

urlpatterns = [
    # ... existing patterns ...
    path('api/mobile/version/', MobileVersionCheckView.as_view(), name='mobile-version-check'),
]
```

#### 1.2.5 Admin Registration

**File:** `backend/core/domains/settings/admin.py` (append)

```python
@admin.register(MobileAppVersion)
class MobileAppVersionAdmin(admin.ModelAdmin):
    list_display = ['platform', 'latest_version', 'minimum_required_version', 'is_active', 'is_maintenance_mode']
    list_filter = ['platform', 'is_active', 'is_maintenance_mode']
    search_fields = ['platform']
```

#### 1.2.6 Dependencies

Add to `requirements.txt`:
```
packaging>=23.0
```

---

### 1.3 ConsentRecord Model

**Location:** `backend/core/domains/users/models.py`

Based on DPA requirements, this model tracks all consent grants and withdrawals with full audit trail.

```python
class ConsentRecord(BaseModel):
    """
    Immutable audit trail of consent grants and withdrawals.
    Each record represents a single consent action (grant or withdraw).
    DPA Compliance: Sec. 12 - Consent requirements
    """

    CONSENT_TYPE_CHOICES = [
        ('MARKETING_EMAIL', 'Marketing Email'),
        ('MARKETING_SMS', 'Marketing SMS'),
        ('MARKETING_PUSH', 'Marketing Push Notifications'),
        ('ANALYTICS', 'Usage Analytics'),
        ('THIRD_PARTY_SHARING', 'Third-Party Sharing'),
        ('SENSITIVE_DATA', 'Sensitive Personal Information Processing'),
        ('PRIVACY_POLICY', 'Privacy Policy Acceptance'),
        ('TERMS_OF_SERVICE', 'Terms of Service Acceptance'),
    ]

    ACTION_CHOICES = [
        ('GRANT', 'Consent Granted'),
        ('WITHDRAW', 'Consent Withdrawn'),
        ('UPDATE', 'Consent Updated'),
    ]

    SOURCE_CHOICES = [
        ('REGISTRATION', 'Registration'),
        ('SETTINGS', 'Settings Change'),
        ('PRIVACY_DASHBOARD', 'Privacy Dashboard'),
        ('API', 'API Request'),
        ('ADMIN', 'Admin Action'),
    ]

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='consent_records'
    )

    consent_type = models.CharField(max_length=30, choices=CONSENT_TYPE_CHOICES)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)

    # The actual text the user consented to (for legal proof)
    consent_text = models.TextField(
        blank=True,
        help_text="The exact text shown to user at time of consent"
    )

    # Version tracking
    privacy_policy_version = models.CharField(
        max_length=20,
        blank=True,
        help_text="Privacy policy version at time of consent"
    )

    # Source and context
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='SETTINGS')

    # Request metadata (for audit)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=20, blank=True)  # ios, android, web

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'consent_type', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.consent_type} - {self.action}"

    @classmethod
    def get_current_consent(cls, user, consent_type):
        """Get the most recent consent record for a user and type"""
        return cls.objects.filter(
            user=user,
            consent_type=consent_type
        ).order_by('-created_at').first()

    @classmethod
    def is_consented(cls, user, consent_type):
        """Check if user has active consent for a type"""
        record = cls.get_current_consent(user, consent_type)
        return record and record.action == 'GRANT'

    @classmethod
    def record_consent(cls, user, consent_type, granted, request=None, source='SETTINGS', consent_text=''):
        """Record a consent action"""
        return cls.objects.create(
            user=user,
            consent_type=consent_type,
            action='GRANT' if granted else 'WITHDRAW',
            consent_text=consent_text,
            source=source,
            ip_address=cls._get_client_ip(request) if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            device_type=cls._get_device_type(request) if request else '',
        )

    @staticmethod
    def _get_client_ip(request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @staticmethod
    def _get_device_type(request):
        """Determine device type from user agent"""
        ua = request.META.get('HTTP_USER_AGENT', '').lower()
        if 'iphone' in ua or 'ipad' in ua:
            return 'ios'
        elif 'android' in ua:
            return 'android'
        return 'web'
```

---

### 1.4 PrivacyRequest Model

**Location:** `backend/core/domains/users/models.py`

Tracks all Data Subject Rights requests for compliance.

```python
class PrivacyRequest(BaseModel):
    """
    Track Data Subject Rights requests per DPA requirements.
    Response timeframe: 30 working days (extendable by 15 days).
    """

    REQUEST_TYPE_CHOICES = [
        ('ACCESS', 'Data Access'),
        ('EXPORT', 'Data Export/Portability'),
        ('DELETION', 'Account Deletion/Erasure'),
        ('CORRECTION', 'Data Correction'),
        ('OBJECTION', 'Processing Objection'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled by User'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,  # Keep record even if user deleted
        null=True,
        related_name='privacy_requests'
    )
    user_email = models.EmailField(
        help_text="Preserved for audit even after user deletion"
    )

    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    # Request details
    request_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional data submitted with request (e.g., corrections)"
    )

    # Response details
    response_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Result data (e.g., export download URL)"
    )
    rejection_reason = models.TextField(blank=True)

    # Processing
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_privacy_requests'
    )

    # For deletion requests - track what was deleted
    deletion_summary = models.JSONField(
        default=dict,
        blank=True,
        help_text="Summary of deleted, anonymized, and retained data"
    )

    # Audit
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['request_type', 'status']),
        ]

    def __str__(self):
        return f"{self.request_type} - {self.user_email} - {self.status}"

    def days_since_submission(self):
        """Calculate working days since submission"""
        from django.utils import timezone
        delta = timezone.now() - self.created_at
        return delta.days

    def is_overdue(self):
        """Check if 30 working day deadline is passed"""
        return self.days_since_submission() > 30 and self.status in ['PENDING', 'PROCESSING']

    def complete(self, processed_by=None, response_data=None):
        """Mark request as completed"""
        from django.utils import timezone
        self.status = 'COMPLETED'
        self.processed_at = timezone.now()
        self.processed_by = processed_by
        if response_data:
            self.response_data = response_data
        self.save()

    def reject(self, reason, processed_by=None):
        """Mark request as rejected"""
        from django.utils import timezone
        self.status = 'REJECTED'
        self.rejection_reason = reason
        self.processed_at = timezone.now()
        self.processed_by = processed_by
        self.save()
```

---

## Phase 2: DPA Compliance APIs (Days 3-5)

### 2.1 Data Subject Rights Service

**File:** `backend/core/domains/users/services/data_subject_rights.py` (new file)

```python
"""
Data Subject Rights Service
Implements DPA-compliant data access, export, erasure, correction, and objection.
"""

import json
import csv
import io
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


class DataSubjectRightsService:
    """Service for handling Data Subject Rights requests per Philippines DPA"""

    # Fields that can be corrected by user
    CORRECTABLE_FIELDS = ['first_name', 'last_name', 'phone', 'company']

    # Fields that require verification to change
    VERIFICATION_REQUIRED_FIELDS = ['email']

    # Data types for third-party sharing disclosure
    THIRD_PARTY_DISCLOSURES = [
        {
            "recipient": "Stripe Inc.",
            "purpose": "Payment processing",
            "data_shared": ["email", "name", "payment details"]
        },
        {
            "recipient": "Brevo (Sendinblue)",
            "purpose": "Email and SMS communications",
            "data_shared": ["email", "name", "phone"]
        },
        {
            "recipient": "Expo",
            "purpose": "Push notifications",
            "data_shared": ["device tokens"]
        }
    ]

    @classmethod
    def generate_data_access_report(cls, user) -> dict:
        """
        Generate comprehensive data access report for Right to Access.
        Returns all personal data collected about the user.
        """
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment, Invoice
        from core.domains.contracts.models import Contract
        from core.domains.questionnaires.models import QuestionnaireResponse
        from core.domains.notifications.models import NotificationPreference, DevicePushToken

        report = {
            "request_id": str(uuid.uuid4()),
            "generated_at": timezone.now().isoformat(),
            "data_subject": {
                "id": user.id,
                "email": user.email
            },
            "personal_data": {
                "account": {
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "date_joined": user.date_joined.isoformat(),
                    "last_login": user.last_login.isoformat() if user.last_login else None,
                    "role": user.role
                },
                "profile": {},
                "events": [],
                "contracts": [],
                "payments": [],
                "questionnaire_responses": [],
                "notification_preferences": {},
                "devices": []
            },
            "processing_purposes": {
                "account": "Contract fulfillment - providing booking services",
                "events": "Contract fulfillment - event management",
                "payments": "Contract and legal obligation - financial records",
                "marketing": "Consent - promotional communications (if consented)"
            },
            "data_retention": {
                "account": f"{settings.DATA_RETENTION_ACCOUNT} years after account deletion",
                "financial_records": f"{settings.DATA_RETENTION_FINANCIAL} years (BIR requirement)",
                "contracts": f"{settings.DATA_RETENTION_CONTRACTS} years (legal evidentiary value)"
            },
            "third_party_sharing": cls.THIRD_PARTY_DISCLOSURES
        }

        # Profile data
        if hasattr(user, 'profile'):
            profile = user.profile
            report["personal_data"]["profile"] = {
                "phone": profile.phone,
                "company": profile.company,
                "timezone": profile.display_timezone
            }

        # Events
        events = Event.objects.filter(client=user).values(
            'id', 'name', 'status', 'start_date', 'venue__name'
        )
        report["personal_data"]["events"] = list(events)

        # Contracts
        contracts = Contract.objects.filter(event__client=user).values(
            'id', 'event_id', 'status', 'signed_at'
        )
        report["personal_data"]["contracts"] = list(contracts)

        # Payments
        payments = Payment.objects.filter(event__client=user).values(
            'id', 'amount', 'currency', 'status', 'created_at'
        )
        report["personal_data"]["payments"] = list(payments)

        # Questionnaire responses
        responses = QuestionnaireResponse.objects.filter(
            booking_session__user=user
        ).values('id', 'questionnaire__title', 'responses', 'created_at')
        report["personal_data"]["questionnaire_responses"] = list(responses)

        # Notification preferences
        try:
            prefs = NotificationPreference.objects.get(user=user)
            report["personal_data"]["notification_preferences"] = {
                "email_enabled": prefs.email_enabled,
                "sms_enabled": prefs.sms_enabled,
                "push_enabled": prefs.push_enabled,
                "marketing_email": prefs.marketing_email,
                "marketing_sms": prefs.marketing_sms,
                "marketing_push": prefs.marketing_push
            }
        except NotificationPreference.DoesNotExist:
            pass

        # Devices
        devices = DevicePushToken.objects.filter(user=user, is_active=True).values(
            'device_type', 'device_name', 'created_at', 'last_used_at'
        )
        report["personal_data"]["devices"] = list(devices)

        return report

    @classmethod
    def generate_data_export(cls, user, format='json') -> tuple:
        """
        Generate portable data export for Right to Portability.
        Returns (content, filename, content_type)
        """
        report = cls.generate_data_access_report(user)

        # Restructure for portability
        export_data = {
            "export_metadata": {
                "generated_at": report["generated_at"],
                "format": format,
                "schema_version": "1.0"
            },
            "user": report["personal_data"]["account"],
            "profile": report["personal_data"]["profile"],
            "events": report["personal_data"]["events"],
            "payments": report["personal_data"]["payments"],
            "questionnaire_responses": report["personal_data"]["questionnaire_responses"],
            "notification_preferences": report["personal_data"]["notification_preferences"]
        }

        timestamp = timezone.now().strftime('%Y-%m-%d')

        if format == 'json':
            content = json.dumps(export_data, indent=2, default=str)
            filename = f"lifeplace_data_export_{timestamp}.json"
            content_type = "application/json"
        elif format == 'csv':
            # Flatten for CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # User data
            writer.writerow(['Section', 'Field', 'Value'])
            for field, value in export_data["user"].items():
                writer.writerow(['Account', field, value])
            for field, value in export_data["profile"].items():
                writer.writerow(['Profile', field, value])

            content = output.getvalue()
            filename = f"lifeplace_data_export_{timestamp}.csv"
            content_type = "text/csv"
        else:
            raise ValueError(f"Unsupported format: {format}")

        return content, filename, content_type

    @classmethod
    def check_deletion_blockers(cls, user) -> list:
        """
        Check for conditions that block account deletion.
        Returns list of blocking reasons.
        """
        from core.domains.events.models import Event
        from core.domains.payments.models import Invoice

        blockers = []

        # Check for unpaid invoices
        unpaid = Invoice.objects.filter(
            event__client=user,
            status__in=['PENDING', 'OVERDUE']
        ).aggregate(
            count=models.Count('id'),
            total=models.Sum('total_amount')
        )

        if unpaid['count'] and unpaid['count'] > 0:
            blockers.append({
                "type": "unpaid_invoice",
                "description": f"You have {unpaid['count']} unpaid invoice(s) totaling {unpaid['total']}",
                "resolution": "Please settle outstanding payments before requesting deletion"
            })

        # Check for upcoming events
        upcoming = Event.objects.filter(
            client=user,
            start_date__gt=timezone.now(),
            status__in=['CONFIRMED', 'IN_PROGRESS']
        ).first()

        if upcoming:
            blockers.append({
                "type": "upcoming_event",
                "description": f"You have an event scheduled for {upcoming.start_date.date()}",
                "resolution": "Please cancel or complete the event before requesting deletion"
            })

        return blockers

    @classmethod
    @transaction.atomic
    def process_deletion(cls, user, request=None) -> dict:
        """
        Process account deletion with proper anonymization.
        Returns summary of actions taken.
        """
        from core.domains.events.models import Event
        from core.domains.bookingflow.models import BookingSession
        from core.domains.notifications.models import DevicePushToken, NotificationPreference
        from core.domains.contracts.models import Contract
        from core.domains.payments.models import Payment

        summary = {
            "deleted": [],
            "anonymized": [],
            "retained": []
        }

        user_email = user.email
        user_id = user.id

        # 1. Delete device tokens
        DevicePushToken.objects.filter(user=user).delete()
        summary["deleted"].append("Device tokens")

        # 2. Delete notification preferences
        NotificationPreference.objects.filter(user=user).delete()
        summary["deleted"].append("Notification preferences")

        # 3. Anonymize booking sessions
        BookingSession.objects.filter(user=user).update(
            user=None,
            contact_info={}  # Clear PII
        )
        summary["anonymized"].append("Booking sessions")

        # 4. Anonymize event references (keep event for venue records)
        Event.objects.filter(client=user).update(
            client=None,
            # Keep event data but remove client reference
        )
        summary["anonymized"].append("Event records (client reference removed)")

        # 5. Retain financial records with note
        payment_count = Payment.objects.filter(event__client_id=user_id).count()
        contract_count = Contract.objects.filter(event__client_id=user_id).count()

        retention_date = timezone.now() + timedelta(days=365 * settings.DATA_RETENTION_FINANCIAL)

        if payment_count > 0:
            summary["retained"].append({
                "data": "Payment records",
                "count": payment_count,
                "reason": f"Legal obligation (BIR - {settings.DATA_RETENTION_FINANCIAL} year retention)",
                "retention_until": retention_date.date().isoformat()
            })

        if contract_count > 0:
            summary["retained"].append({
                "data": "Contract signatures",
                "count": contract_count,
                "reason": f"Legal evidentiary value ({settings.DATA_RETENTION_CONTRACTS} year retention)",
                "retention_until": retention_date.date().isoformat()
            })

        # 6. Delete user account
        user.is_active = False
        user.email = f"deleted_{user_id}@deleted.local"
        user.first_name = "Deleted"
        user.last_name = "User"
        user.save()

        # Also anonymize profile
        if hasattr(user, 'profile'):
            user.profile.phone = ""
            user.profile.company = ""
            user.profile.save()

        summary["deleted"].append("User account")
        summary["deleted"].append("Profile information")

        # 7. Log the deletion
        logger.info(
            f"User deletion processed: {user_email} (ID: {user_id})",
            extra={
                'user_id': user_id,
                'email': user_email,
                'summary': summary
            }
        )

        return summary

    @classmethod
    def process_correction(cls, user, corrections: list) -> dict:
        """
        Process data correction requests.
        Returns results of corrections.
        """
        results = {
            "applied": [],
            "pending": [],
            "rejected": []
        }

        for correction in corrections:
            field = correction.get('field')
            new_value = correction.get('corrected_value')

            if field in cls.CORRECTABLE_FIELDS:
                # Direct update
                if field in ['first_name', 'last_name']:
                    setattr(user, field, new_value)
                elif field in ['phone', 'company'] and hasattr(user, 'profile'):
                    setattr(user.profile, field, new_value)

                results["applied"].append({
                    "field": field,
                    "old_value": correction.get('current_value'),
                    "new_value": new_value,
                    "applied_at": timezone.now().isoformat()
                })

            elif field in cls.VERIFICATION_REQUIRED_FIELDS:
                # Requires verification (e.g., email)
                results["pending"].append({
                    "field": field,
                    "reason": f"{field.title()} change requires verification. Check your new {field} for a verification link."
                })

            else:
                results["rejected"].append({
                    "field": field,
                    "reason": "This field cannot be corrected by user request"
                })

        # Save changes
        user.save()
        if hasattr(user, 'profile'):
            user.profile.save()

        return results

    @classmethod
    def process_objection(cls, user, objection_type: str) -> dict:
        """
        Process objection to processing.
        Returns changes applied.
        """
        from core.domains.notifications.models import NotificationPreference
        from .models import ConsentRecord

        changes = {}
        cannot_object = []

        prefs, _ = NotificationPreference.objects.get_or_create(user=user)

        if objection_type in ['marketing', 'all_non_essential']:
            prefs.marketing_email = False
            prefs.marketing_sms = False
            prefs.marketing_push = False
            changes.update({
                "marketing_email": False,
                "marketing_sms": False,
                "marketing_push": False
            })

            # Record consent withdrawal
            for consent_type in ['MARKETING_EMAIL', 'MARKETING_SMS', 'MARKETING_PUSH']:
                ConsentRecord.record_consent(
                    user=user,
                    consent_type=consent_type,
                    granted=False,
                    source='PRIVACY_DASHBOARD'
                )

        if objection_type in ['analytics', 'all_non_essential']:
            # Disable analytics tracking
            changes["analytics_tracking"] = False
            ConsentRecord.record_consent(
                user=user,
                consent_type='ANALYTICS',
                granted=False,
                source='PRIVACY_DASHBOARD'
            )

        prefs.save()

        # Things user cannot object to
        cannot_object = [
            {
                "processing": "Contract fulfillment",
                "reason": "Necessary for providing booked services"
            },
            {
                "processing": "Legal obligations",
                "reason": "Required by law (BIR, NPC)"
            }
        ]

        return {
            "changes_applied": changes,
            "cannot_object": cannot_object
        }
```

---

### 2.2 DPA Views

**File:** `backend/core/domains/users/views.py` (append)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.http import HttpResponse
from .services.data_subject_rights import DataSubjectRightsService
from .models import PrivacyRequest, ConsentRecord


class DataAccessView(APIView):
    """
    GET /api/users/me/data/
    Right to Access - View all personal data
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report = DataSubjectRightsService.generate_data_access_report(request.user)

        # Log the access request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type='ACCESS',
            status='COMPLETED',
            processed_at=timezone.now(),
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response(report)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class DataExportView(APIView):
    """
    GET /api/users/me/export/?format=json
    Right to Portability - Export personal data
    """
    permission_classes = [IsAuthenticated]
    throttle_scope = 'data_export'  # Limit to 1/day

    def get(self, request):
        format = request.query_params.get('format', 'json')

        if format not in ['json', 'csv']:
            return Response(
                {"error": "Invalid format. Use 'json' or 'csv'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        content, filename, content_type = DataSubjectRightsService.generate_data_export(
            request.user, format
        )

        # Log the export request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type='EXPORT',
            status='COMPLETED',
            processed_at=timezone.now(),
            response_data={"format": format, "filename": filename}
        )

        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AccountDeletionView(APIView):
    """
    DELETE /api/users/me/
    Right to Erasure - Delete account
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user

        # Validate request body
        confirmation = request.data.get('confirmation')
        password = request.data.get('password')

        if confirmation != 'DELETE MY ACCOUNT':
            return Response(
                {"error": "Please type 'DELETE MY ACCOUNT' to confirm"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(password):
            return Response(
                {"error": "Invalid password"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for blockers
        blockers = DataSubjectRightsService.check_deletion_blockers(user)

        if blockers:
            return Response({
                "status": "blocked",
                "message": "Deletion cannot proceed due to active obligations.",
                "blocking_reasons": blockers
            }, status=status.HTTP_409_CONFLICT)

        # Create privacy request record
        privacy_request = PrivacyRequest.objects.create(
            user=user,
            user_email=user.email,
            request_type='DELETION',
            status='PROCESSING',
            request_data={"reason": request.data.get('reason', '')}
        )

        # Process deletion
        summary = DataSubjectRightsService.process_deletion(user, request)

        # Update privacy request
        privacy_request.status = 'COMPLETED'
        privacy_request.processed_at = timezone.now()
        privacy_request.deletion_summary = summary
        privacy_request.save()

        return Response({
            "status": "completed",
            "request_id": str(privacy_request.id),
            "message": "Your account has been deleted.",
            "actions": summary,
            "appeal_contact": settings.DPO_EMAIL
        })


class DataCorrectionView(APIView):
    """
    PATCH /api/users/me/correct/
    Right to Correction - Correct personal data
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        corrections = request.data.get('corrections', [])

        if not corrections:
            return Response(
                {"error": "No corrections provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = DataSubjectRightsService.process_correction(
            request.user, corrections
        )

        # Log the correction request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type='CORRECTION',
            status='COMPLETED',
            processed_at=timezone.now(),
            request_data={"corrections": corrections},
            response_data=results
        )

        return Response({
            "status": "completed",
            "corrections_applied": results["applied"],
            "corrections_pending": results["pending"],
            "corrections_rejected": results["rejected"],
            "third_party_notification": "Corrected data will be shared with relevant third parties within 30 days."
        })


class ProcessingObjectionView(APIView):
    """
    POST /api/users/me/object/
    Right to Object - Object to processing
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        objection_type = request.data.get('objection_type')

        valid_types = ['marketing', 'profiling', 'analytics', 'all_non_essential']
        if objection_type not in valid_types:
            return Response(
                {"error": f"Invalid objection type. Use one of: {valid_types}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = DataSubjectRightsService.process_objection(
            request.user, objection_type
        )

        # Log the objection
        privacy_request = PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type='OBJECTION',
            status='COMPLETED',
            processed_at=timezone.now(),
            request_data={"objection_type": objection_type},
            response_data=results
        )

        return Response({
            "status": "accepted",
            "objection_id": str(privacy_request.id),
            "changes_applied": results["changes_applied"],
            "cannot_object": results["cannot_object"]
        })


class ConsentListView(APIView):
    """
    GET /api/users/me/consents/
    View all active consents
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        consent_types = [
            ('MARKETING_EMAIL', 'Marketing emails', True),
            ('MARKETING_SMS', 'Marketing SMS', True),
            ('MARKETING_PUSH', 'Marketing push notifications', True),
            ('ANALYTICS', 'Usage analytics', True),
            ('THIRD_PARTY_SHARING', 'Third-party data sharing', True),
            ('PRIVACY_POLICY', 'Privacy Policy', False),
            ('TERMS_OF_SERVICE', 'Terms of Service', False),
        ]

        consents = []
        for consent_type, purpose, can_withdraw in consent_types:
            record = ConsentRecord.get_current_consent(user, consent_type)
            consents.append({
                "consent_type": consent_type,
                "purpose": purpose,
                "status": "granted" if (record and record.action == 'GRANT') else "not_granted",
                "granted_at": record.created_at.isoformat() if record else None,
                "can_withdraw": can_withdraw
            })

        return Response({"consents": consents})


class ConsentWithdrawView(APIView):
    """
    POST /api/users/me/consents/{consent_type}/withdraw/
    Withdraw a specific consent
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, consent_type):
        user = request.user

        # Check if consent can be withdrawn
        non_withdrawable = ['PRIVACY_POLICY', 'TERMS_OF_SERVICE']
        if consent_type in non_withdrawable:
            return Response(
                {"error": "This consent cannot be withdrawn while maintaining an account"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Record withdrawal
        record = ConsentRecord.record_consent(
            user=user,
            consent_type=consent_type,
            granted=False,
            request=request,
            source='PRIVACY_DASHBOARD'
        )

        return Response({
            "status": "withdrawn",
            "consent_type": consent_type,
            "withdrawn_at": record.created_at.isoformat(),
            "effective_immediately": True
        })


class PrivacyRequestListView(APIView):
    """
    GET /api/users/me/privacy-requests/
    View status of all privacy requests
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        requests = PrivacyRequest.objects.filter(
            user=request.user
        ).order_by('-created_at')[:20]

        return Response({
            "requests": [
                {
                    "id": str(req.id),
                    "type": req.request_type,
                    "status": req.status,
                    "submitted_at": req.created_at.isoformat(),
                    "completed_at": req.processed_at.isoformat() if req.processed_at else None,
                    "response_data": req.response_data if req.status == 'COMPLETED' else None
                }
                for req in requests
            ]
        })
```

---

### 2.3 URL Configuration for DPA Endpoints

**File:** `backend/core/domains/users/urls.py` (append)

```python
from .views import (
    DataAccessView, DataExportView, AccountDeletionView,
    DataCorrectionView, ProcessingObjectionView,
    ConsentListView, ConsentWithdrawView, PrivacyRequestListView
)

urlpatterns += [
    # Data Subject Rights
    path('me/data/', DataAccessView.as_view(), name='data-access'),
    path('me/export/', DataExportView.as_view(), name='data-export'),
    path('me/correct/', DataCorrectionView.as_view(), name='data-correction'),
    path('me/object/', ProcessingObjectionView.as_view(), name='processing-objection'),

    # Consent Management
    path('me/consents/', ConsentListView.as_view(), name='consent-list'),
    path('me/consents/<str:consent_type>/withdraw/', ConsentWithdrawView.as_view(), name='consent-withdraw'),

    # Privacy Request Tracking
    path('me/privacy-requests/', PrivacyRequestListView.as_view(), name='privacy-requests'),
]

# Note: DELETE /api/users/me/ is already the AccountDeletionView
```

---

## Phase 3: Security Domain (Days 6-8)

### 3.1 Create Security Domain Structure

```bash
mkdir -p backend/core/domains/security
touch backend/core/domains/security/__init__.py
touch backend/core/domains/security/models.py
touch backend/core/domains/security/serializers.py
touch backend/core/domains/security/views.py
touch backend/core/domains/security/services.py
touch backend/core/domains/security/tasks.py
touch backend/core/domains/security/urls.py
touch backend/core/domains/security/admin.py
```

### 3.2 Models

**File:** `backend/core/domains/security/models.py`

Copy the models from `docs/security/BREACH_NOTIFICATION.md`:
- `SecurityBreach`
- `BreachNotification`
- `AffectedUser`

### 3.3 Services

**File:** `backend/core/domains/security/services.py`

Copy `BreachNotificationService` from `docs/security/BREACH_NOTIFICATION.md`.

### 3.4 Celery Tasks

**File:** `backend/core/domains/security/tasks.py`

```python
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger('security')


@shared_task
def check_notification_deadlines():
    """
    Check for breaches approaching 72-hour notification deadline.
    Runs hourly via Celery Beat.
    """
    from .models import SecurityBreach

    breaches = SecurityBreach.objects.filter(
        status__in=['DETECTED', 'INVESTIGATING', 'CONFIRMED'],
        npc_notified=False
    )

    for breach in breaches:
        hours = breach.hours_since_detection()

        if hours >= 72:
            # OVERDUE - urgent alert
            send_deadline_alert(
                breach,
                "OVERDUE: 72-hour notification deadline PASSED!",
                urgent=True
            )
        elif hours >= 48:
            # WARNING - 24 hours left
            send_deadline_alert(
                breach,
                "WARNING: Only 24 hours until notification deadline",
                urgent=True
            )
        elif hours >= 24:
            # REMINDER - 48 hours left
            send_deadline_alert(
                breach,
                "REMINDER: 48 hours until notification deadline",
                urgent=False
            )


@shared_task
def send_deadline_alert(breach_id, message, urgent=False):
    """Send deadline alert to security team"""
    from .models import SecurityBreach

    try:
        breach = SecurityBreach.objects.get(id=breach_id)
    except SecurityBreach.DoesNotExist:
        return

    subject_prefix = "[URGENT]" if urgent else "[ALERT]"

    send_mail(
        subject=f"{subject_prefix} Breach {breach.breach_id}: {message}",
        message=f"""
Breach ID: {breach.breach_id}
Title: {breach.title}
Detected: {breach.detected_at}
Hours since detection: {breach.hours_since_detection():.1f}

Status: {breach.status}
Severity: {breach.severity}
Affected Users: {breach.affected_users_count}
Involves SPI: {'Yes' if breach.involves_spi else 'No'}

Action Required: {"NPC notification OVERDUE" if breach.hours_since_detection() >= 72 else "NPC notification required within deadline"}

Manage this breach: {settings.ADMIN_FRONTEND_URL}/security/breaches/{breach.id}/
        """,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.SECURITY_TEAM_EMAIL, settings.DPO_EMAIL],
        fail_silently=False,
    )

    logger.warning(
        f"Breach deadline alert sent: {breach.breach_id}",
        extra={'breach_id': breach.breach_id, 'hours': breach.hours_since_detection()}
    )


@shared_task
def send_daily_breach_summary():
    """
    Send daily summary of active breaches.
    Runs daily at 9 AM via Celery Beat.
    """
    from .models import SecurityBreach

    active_breaches = SecurityBreach.objects.exclude(
        status__in=['RESOLVED', 'FALSE_POSITIVE']
    ).order_by('-detected_at')

    if not active_breaches.exists():
        return

    summary_lines = []
    for breach in active_breaches:
        summary_lines.append(
            f"- {breach.breach_id}: {breach.title} ({breach.status}) - "
            f"{breach.hours_since_detection():.0f}h since detection"
        )

    send_mail(
        subject=f"[Daily] {active_breaches.count()} Active Security Breach(es)",
        message=f"""
Daily Security Breach Summary
Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')} PHT

Active Breaches:
{chr(10).join(summary_lines)}

Manage breaches: {settings.ADMIN_FRONTEND_URL}/security/breaches/
        """,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.SECURITY_TEAM_EMAIL],
        fail_silently=True,
    )
```

### 3.5 Celery Beat Configuration

**File:** `backend/core/celery.py` (update)

```python
app.conf.beat_schedule.update({
    'check-breach-notification-deadlines': {
        'task': 'core.domains.security.tasks.check_notification_deadlines',
        'schedule': crontab(minute=0),  # Every hour
    },
    'send-daily-breach-summary': {
        'task': 'core.domains.security.tasks.send_daily_breach_summary',
        'schedule': crontab(hour=9, minute=0),  # 9 AM daily
    },
})
```

### 3.6 Admin Registration

**File:** `backend/core/domains/security/admin.py`

```python
from django.contrib import admin
from .models import SecurityBreach, BreachNotification, AffectedUser


class BreachNotificationInline(admin.TabularInline):
    model = BreachNotification
    extra = 0
    readonly_fields = ['sent_at', 'delivery_status']


class AffectedUserInline(admin.TabularInline):
    model = AffectedUser
    extra = 0
    readonly_fields = ['notified', 'notified_at']
    raw_id_fields = ['user']


@admin.register(SecurityBreach)
class SecurityBreachAdmin(admin.ModelAdmin):
    list_display = [
        'breach_id', 'title', 'severity', 'status',
        'detected_at', 'affected_users_count', 'npc_notified'
    ]
    list_filter = ['severity', 'status', 'breach_type', 'npc_notified', 'involves_spi']
    search_fields = ['breach_id', 'title', 'description']
    readonly_fields = ['breach_id', 'created_at', 'updated_at']
    inlines = [AffectedUserInline, BreachNotificationInline]

    fieldsets = (
        ('Identification', {
            'fields': ('breach_id', 'title', 'description')
        }),
        ('Classification', {
            'fields': ('breach_type', 'severity', 'status')
        }),
        ('Timeline', {
            'fields': ('detected_at', 'confirmed_at', 'contained_at', 'resolved_at')
        }),
        ('Impact', {
            'fields': ('affected_users_count', 'affected_records_count', 'involves_spi', 'data_types_affected')
        }),
        ('Root Cause', {
            'fields': ('attack_vector', 'vulnerabilities_exploited'),
            'classes': ('collapse',)
        }),
        ('Response', {
            'fields': ('containment_actions', 'remediation_steps', 'prevention_measures'),
            'classes': ('collapse',)
        }),
        ('Notifications', {
            'fields': ('npc_notified', 'npc_notified_at', 'npc_reference_number', 'users_notified', 'users_notified_at')
        }),
        ('Assignment', {
            'fields': ('incident_lead',)
        }),
    )
```

### 3.7 URL Configuration

**File:** `backend/core/urls.py` (add)

```python
path('api/security/', include('core.domains.security.urls')),
```

---

## Phase 4: Integration & Testing (Days 9-10)

### 4.1 Rate Limiting Configuration

**File:** `backend/core/settings.py` (update REST_FRAMEWORK)

```python
REST_FRAMEWORK = {
    # ... existing config ...
    'DEFAULT_THROTTLE_RATES': {
        # ... existing rates ...
        'data_export': '1/day',      # Data export limit
        'deletion_request': '1/month', # Deletion request limit
        'data_access': '10/hour',     # Data access limit
    },
}
```

### 4.2 Migrations

```bash
cd backend
python manage.py makemigrations users  # ConsentRecord, PrivacyRequest
python manage.py makemigrations settings  # MobileAppVersion
python manage.py makemigrations security  # SecurityBreach, etc.
python manage.py migrate
```

### 4.3 Test Data Setup

**File:** `backend/core/domains/settings/management/commands/setup_mobile_version.py`

```python
from django.core.management.base import BaseCommand
from core.domains.settings.models import MobileAppVersion


class Command(BaseCommand):
    help = 'Setup initial mobile app version configuration'

    def handle(self, *args, **options):
        # iOS config
        MobileAppVersion.objects.update_or_create(
            platform='ios',
            defaults={
                'minimum_required_version': '1.0.0',
                'recommended_version': '1.0.0',
                'latest_version': '1.0.0',
                'ios_store_url': 'https://apps.apple.com/app/lifeplace/id000000000',
                'is_active': True,
                'feature_flags': {
                    'biometric_login_enabled': True,
                    'push_notifications_enabled': True,
                    'offline_mode_enabled': False,
                    'stripe_enabled': True
                }
            }
        )

        # Android config
        MobileAppVersion.objects.update_or_create(
            platform='android',
            defaults={
                'minimum_required_version': '1.0.0',
                'recommended_version': '1.0.0',
                'latest_version': '1.0.0',
                'android_store_url': 'https://play.google.com/store/apps/details?id=com.lifeplace.app',
                'is_active': True,
                'feature_flags': {
                    'biometric_login_enabled': True,
                    'push_notifications_enabled': True,
                    'offline_mode_enabled': False,
                    'stripe_enabled': True
                }
            }
        )

        self.stdout.write(self.style.SUCCESS('Mobile version config created'))
```

---

## Summary Checklist

### Phase 1: Foundation (Days 1-2)
- [ ] Add environment variables to settings.py
- [ ] Update ENV_VARS.md documentation
- [ ] Create MobileAppVersion model
- [ ] Create MobileVersionCheckView
- [ ] Add /api/mobile/version/ endpoint
- [ ] Register MobileAppVersion in admin
- [ ] Add `packaging` to requirements.txt
- [ ] Create ConsentRecord model
- [ ] Create PrivacyRequest model
- [ ] Run migrations

### Phase 2: DPA Compliance (Days 3-5)
- [ ] Create DataSubjectRightsService
- [ ] Implement generate_data_access_report()
- [ ] Implement generate_data_export()
- [ ] Implement check_deletion_blockers()
- [ ] Implement process_deletion()
- [ ] Implement process_correction()
- [ ] Implement process_objection()
- [ ] Create all DPA views (7 endpoints)
- [ ] Add URL routes
- [ ] Add rate limiting for sensitive endpoints

### Phase 3: Security Domain (Days 6-8)
- [ ] Create security domain directory structure
- [ ] Create SecurityBreach model
- [ ] Create BreachNotification model
- [ ] Create AffectedUser model
- [ ] Create BreachNotificationService
- [ ] Create Celery tasks for deadline monitoring
- [ ] Configure Celery Beat schedule
- [ ] Register models in admin
- [ ] Create admin views for breach management

### Phase 4: Integration (Days 9-10)
- [ ] Run all migrations
- [ ] Create setup_mobile_version management command
- [ ] Write unit tests for critical paths
- [ ] Test mobile version API
- [ ] Test DPA endpoints
- [ ] Test breach notification flow
- [ ] Update API documentation

---

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/mobile/version/` | GET | Public | Mobile app version check |
| `/api/users/me/data/` | GET | JWT | Right to Access |
| `/api/users/me/export/` | GET | JWT | Right to Portability |
| `/api/users/me/` | DELETE | JWT | Right to Erasure |
| `/api/users/me/correct/` | PATCH | JWT | Right to Correction |
| `/api/users/me/object/` | POST | JWT | Right to Object |
| `/api/users/me/consents/` | GET | JWT | List consents |
| `/api/users/me/consents/{type}/withdraw/` | POST | JWT | Withdraw consent |
| `/api/users/me/privacy-requests/` | GET | JWT | Privacy request history |
| `/api/security/breaches/` | GET/POST | Admin | Breach management |
| `/api/security/breaches/{id}/` | GET/PUT | Admin | Breach detail |
| `/api/security/breaches/{id}/notify-npc/` | POST | Admin | Trigger NPC notification |
| `/api/security/breaches/{id}/notify-users/` | POST | Admin | Trigger user notifications |

---

## Notes

1. **Testing Priority**: Focus tests on deletion flow (most complex) and mobile version API (most used)
2. **Security**: All DPA endpoints require password confirmation for destructive actions
3. **Logging**: All privacy requests are logged for audit compliance
4. **Retention**: Financial and contract data retained per BIR requirements even after deletion
