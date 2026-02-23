"""
Unit tests for users domain models.

Tests:
- User model (email-based auth, roles, admin permissions)
- UserProfile model (auto-creation via signal)
- AdminInvitation model (expiration, acceptance)
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

import pytest
from freezegun import freeze_time

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Unit tests for the User model."""

    def test_create_user_with_email(self, user_factory):
        """Test creating a user with valid email."""
        user = user_factory(email="test@example.com")

        assert user.email == "test@example.com"
        assert user.role == "CLIENT"
        assert not user.is_staff
        assert user.is_active

    def test_create_admin_user(self, user_factory):
        """Test creating an admin user using the admin trait."""
        user = user_factory(admin=True)

        assert user.role == "ADMIN"
        assert user.is_staff

    def test_user_string_representation(self, user_factory):
        """Test User __str__ returns email."""
        user = user_factory(email="john@example.com")

        assert str(user) == "john@example.com"

    def test_get_full_name(self, user_factory):
        """Test get_full_name method returns first + last name."""
        user = user_factory(first_name="John", last_name="Doe")

        assert user.get_full_name() == "John Doe"

    def test_get_full_name_strips_whitespace(self, user_factory):
        """Test get_full_name handles missing name parts."""
        user = user_factory(first_name="John", last_name="")

        assert user.get_full_name() == "John"

    def test_get_display_name_with_full_name(self, user_factory):
        """Test get_display_name returns full name when available."""
        user = user_factory(email="john@example.com", first_name="John", last_name="Doe")

        assert user.get_display_name() == "John Doe"

    def test_get_display_name_falls_back_to_email(self, user_factory):
        """Test get_display_name returns email when no name set."""
        user = user_factory(email="john@example.com", first_name="", last_name="")

        assert user.get_display_name() == "john@example.com"

    def test_create_user_without_email_raises_error(self):
        """Test creating user without email raises ValueError."""
        with pytest.raises(ValueError, match="email must be set"):
            User.objects.create_user(email="", password="testpass123")

    def test_create_superuser(self, user_factory):
        """Test creating a superuser."""
        user = user_factory(superuser=True)

        assert user.is_superuser
        assert user.is_staff
        assert user.role == "ADMIN"

    def test_user_password_is_hashed(self, user_factory):
        """Test that password is properly hashed, not stored plaintext."""
        user = user_factory(password="testpass123")

        assert user.password != "testpass123"
        assert user.check_password("testpass123")


@pytest.mark.django_db
class TestUserAdminPermissions:
    """Tests for granular admin permissions system."""

    def test_superuser_has_all_permissions(self, user_factory):
        """Test that superusers always have all permissions."""
        user = user_factory(superuser=True)

        assert user.has_admin_permission("can_manage_admins")
        assert user.has_admin_permission("can_manage_company_settings")
        assert user.has_admin_permission("any_permission")

    def test_client_has_no_admin_permissions(self, user_factory):
        """Test that CLIENT users always return False for admin permissions."""
        user = user_factory(role="CLIENT")

        assert not user.has_admin_permission("can_manage_admins")
        assert not user.has_admin_permission("can_manage_company_settings")

    def test_admin_with_empty_permissions_has_none(self, user_factory):
        """
        SECURITY FIX (P0-B6): Test that admin with empty permissions has NO access.
        Empty permissions = no access (not full admin).
        This prevents privilege escalation through empty permission bypass.
        """
        user = user_factory(admin=True, admin_permissions={})

        # Empty permissions should deny all access
        assert not user.has_admin_permission("can_manage_admins")
        assert not user.is_full_admin()

    def test_admin_with_specific_permissions(self, user_factory):
        """Test admin with specific permissions set."""
        user = user_factory(
            admin=True,
            admin_permissions={
                "can_manage_admins": True,
                "can_manage_company_settings": False,
            },
        )

        assert user.has_admin_permission("can_manage_admins")
        assert not user.has_admin_permission("can_manage_company_settings")

    def test_is_full_admin_with_all_permissions(self, user_factory):
        """Test is_full_admin returns True when all permissions granted."""
        user = user_factory(with_full_permissions=True)

        assert user.is_full_admin()

    def test_is_full_admin_with_partial_permissions(self, user_factory):
        """Test is_full_admin returns False when some permissions missing."""
        user = user_factory(
            admin=True,
            admin_permissions={
                "can_manage_admins": True,
                "can_manage_company_settings": False,
            },
        )

        assert not user.is_full_admin()

    def test_get_all_permissions_dict_for_superuser(self, user_factory):
        """Test get_all_permissions_dict returns all True for superuser."""
        user = user_factory(superuser=True)
        permissions = user.get_all_permissions_dict()

        # All values should be True for superuser
        assert all(permissions.values())

    def test_get_all_permissions_dict_for_client(self, user_factory):
        """Test get_all_permissions_dict returns all False for client."""
        user = user_factory(role="CLIENT")
        permissions = user.get_all_permissions_dict()

        # All values should be False for client
        assert not any(permissions.values())


@pytest.mark.django_db
class TestUserProfile:
    """Tests for UserProfile model."""

    def test_profile_auto_created_on_user_creation(self, user_factory):
        """Test profile is automatically created via signal when user is created."""
        user = user_factory()

        assert hasattr(user, "profile")
        assert user.profile is not None

    def test_profile_string_representation(self, user_factory):
        """Test UserProfile __str__ returns informative string."""
        user = user_factory(email="john@example.com")

        assert str(user.profile) == "Profile for john@example.com"

    def test_profile_default_timezone(self, user_factory):
        """Test profile has default timezone of Asia/Manila."""
        user = user_factory()

        assert user.profile.display_timezone == "Asia/Manila"

    def test_profile_default_display_mode(self, user_factory):
        """Test profile has default timezone display mode."""
        user = user_factory()

        assert user.profile.timezone_display_mode == "business_only"

    def test_profile_update(self, user_factory):
        """Test profile fields can be updated."""
        user = user_factory()
        user.profile.phone = "+1234567890"
        user.profile.company = "Test Company"
        user.profile.save()

        user.refresh_from_db()
        assert user.profile.phone == "+1234567890"
        assert user.profile.company == "Test Company"


@pytest.mark.django_db
class TestAdminInvitation:
    """Tests for AdminInvitation model."""

    def test_invitation_creation(self, admin_invitation_factory):
        """Test creating an admin invitation."""
        invitation = admin_invitation_factory(email="invite@example.com")

        assert invitation.email == "invite@example.com"
        assert not invitation.is_accepted
        assert not invitation.is_upgrade

    def test_invitation_string_representation(self, admin_invitation_factory):
        """Test AdminInvitation __str__ returns informative string."""
        invitation = admin_invitation_factory(email="invite@example.com")

        assert str(invitation) == "Invitation for invite@example.com"

    def test_invitation_default_expiration(self, admin_invitation_factory):
        """Test invitation expires in 7 days by default."""
        invitation = admin_invitation_factory()

        # Expiration should be approximately 7 days from now
        expected_expiry = timezone.now() + timedelta(days=7)
        assert abs((invitation.expires_at - expected_expiry).total_seconds()) < 60

    def test_invitation_is_expired_before_expiration(self, admin_invitation_factory):
        """Test is_expired returns False before expiration date."""
        invitation = admin_invitation_factory()  # Default: expires in 7 days

        assert not invitation.is_expired()

    @freeze_time("2024-01-15 10:00:00")
    def test_invitation_is_expired_after_expiration(self, admin_invitation_factory):
        """Test is_expired returns True after expiration date."""
        # Create invitation that expired yesterday
        invitation = admin_invitation_factory(expired=True)

        assert invitation.is_expired()

    def test_invitation_upgrade_trait(self, admin_invitation_factory, user_factory):
        """Test creating an upgrade invitation for existing user."""
        existing_user = user_factory(role="CLIENT")
        invitation = admin_invitation_factory(email=existing_user.email, is_upgrade=True, user=existing_user)

        assert invitation.is_upgrade
        assert invitation.user == existing_user

    def test_invitation_with_permissions(self, admin_invitation_factory):
        """Test creating invitation with specific permissions."""
        invitation = admin_invitation_factory(with_permissions=True)

        assert "can_manage_company_settings" in invitation.permissions
        assert invitation.permissions["can_manage_company_settings"] is True
