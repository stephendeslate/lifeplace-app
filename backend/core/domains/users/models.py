# core/domains/users/models.py
import uuid
from datetime import timedelta

from core.utils.models import BaseModel
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Manager for User model with email-based authentication"""
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')  # Ensure superusers are admins

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """User model with email-based authentication and role-based access"""
    username = None
    email = models.EmailField(_('email address'), unique=True)

    ROLE_CHOICES = (
        ('CLIENT', 'Client'),
        ('ADMIN', 'Admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CLIENT')

    # Granular admin permissions - only applies to ADMIN role users
    admin_permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Granular admin permissions stored as JSON. Only applies to ADMIN role users."
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()

    def get_display_name(self):
        """Returns user's full name if available, otherwise email"""
        if self.first_name or self.last_name:
            return self.get_full_name()
        return self.email

    def has_admin_permission(self, permission_key: str) -> bool:
        """
        Check if user has a specific admin permission.

        - Superusers always have all permissions.
        - Non-admin users always return False.
        - Empty admin_permissions means no permissions (security fix P0-B6).
        """
        if self.is_superuser:
            return True
        if self.role != 'ADMIN':
            return False

        # SECURITY FIX (P0-B6): Empty permissions = no access (removed backward compatibility bypass)
        if not self.admin_permissions:
            return False

        return self.admin_permissions.get(permission_key, False)

    def get_all_permissions_dict(self) -> dict:
        """
        Return all admin permissions with their current values.
        Useful for serialization to frontend.
        """
        from .permissions_constants import ADMIN_PERMISSIONS, FULL_ADMIN_PERMISSIONS

        if self.is_superuser:
            return FULL_ADMIN_PERMISSIONS.copy()
        if self.role != 'ADMIN':
            return {key: False for key in ADMIN_PERMISSIONS.keys()}

        # SECURITY FIX (P0-B6): Empty permissions = no access
        if not self.admin_permissions:
            return {key: False for key in ADMIN_PERMISSIONS.keys()}

        # Merge with defaults to ensure all keys exist
        result = {key: False for key in ADMIN_PERMISSIONS.keys()}
        result.update(self.admin_permissions)
        return result

    def is_full_admin(self) -> bool:
        """Check if user has all admin permissions."""
        from .permissions_constants import ADMIN_PERMISSIONS

        if self.is_superuser:
            return True
        if self.role != 'ADMIN':
            return False
        # SECURITY FIX (P0-B6): Empty permissions = no access
        if not self.admin_permissions:
            return False
        return all(self.admin_permissions.get(key, False) for key in ADMIN_PERMISSIONS.keys())

    def __str__(self):
        return self.email


class UserProfile(BaseModel):
    """Profile for User with role-specific fields"""
    TIMEZONE_DISPLAY_CHOICES = [
        ('business_only', 'Philippines Time Only'),
        ('business_with_local', 'Philippines + Local Time'),
        ('dual_display', 'Both Timezones Side by Side'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    company = models.CharField(max_length=200, blank=True, null=True)
    avatar = models.ImageField(
        upload_to='users/avatars/',
        null=True,
        blank=True,
        help_text='User profile picture'
    )
    google_picture_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Profile picture URL from Google OAuth (if signed up via Google)'
    )
    
    # Timezone preferences
    display_timezone = models.CharField(
        max_length=50,
        default='Asia/Manila',
        help_text="User's display timezone preference (for admin users)"
    )
    timezone_display_mode = models.CharField(
        max_length=20,
        choices=TIMEZONE_DISPLAY_CHOICES,
        default='business_only',
        help_text="How to display event times to this user"
    )
    
    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"Profile for {self.user.email}"


class AdminInvitation(BaseModel):
    """Invitations for new admin users or upgrading existing CLIENT users to ADMIN"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='admin_upgrade_invitation',
        null=True,
        blank=True,
        help_text="Link to existing user if this is a role upgrade invitation"
    )
    is_accepted = models.BooleanField(default=False)
    is_upgrade = models.BooleanField(
        default=False,
        help_text="True if this invitation is to upgrade an existing CLIENT to ADMIN"
    )
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Admin permissions to assign when invitation is accepted"
    )
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Invitation for {self.email}"


class PasswordResetToken(BaseModel):
    """Password reset tokens for secure password recovery"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Tokens expire after 1 hour
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)

    def is_expired(self):
        """Check if the token has expired"""
        return timezone.now() > self.expires_at

    def is_valid(self):
        """Check if token is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired()

    def __str__(self):
        return f"Password reset token for {self.user.email}"


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
        verbose_name = 'Consent Record'
        verbose_name_plural = 'Consent Records'

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
        verbose_name = 'Privacy Request'
        verbose_name_plural = 'Privacy Requests'

    def __str__(self):
        return f"{self.request_type} - {self.user_email} - {self.status}"

    def days_since_submission(self):
        """Calculate working days since submission"""
        delta = timezone.now() - self.created_at
        return delta.days

    def is_overdue(self):
        """Check if 30 working day deadline is passed"""
        return self.days_since_submission() > 30 and self.status in ['PENDING', 'PROCESSING']

    def complete(self, processed_by=None, response_data=None):
        """Mark request as completed"""
        self.status = 'COMPLETED'
        self.processed_at = timezone.now()
        self.processed_by = processed_by
        if response_data:
            self.response_data = response_data
        self.save()

    def reject(self, reason, processed_by=None):
        """Mark request as rejected"""
        self.status = 'REJECTED'
        self.rejection_reason = reason
        self.processed_at = timezone.now()
        self.processed_by = processed_by
        self.save()