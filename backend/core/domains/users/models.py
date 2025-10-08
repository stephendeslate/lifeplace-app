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
    """Invitations for new admin users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    is_accepted = models.BooleanField(default=False)
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