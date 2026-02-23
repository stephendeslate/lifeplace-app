"""
Unit tests for clients domain serializers.

Tests:
- ClientProfileSerializer
- ClientListSerializer
- ClientDetailSerializer
- ClientCreateUpdateSerializer
- ClientInvitationSerializer
- ClientInvitationDetailSerializer
- AcceptClientInvitationSerializer
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

import pytest

from core.domains.clients.models import ClientInvitation
from core.domains.clients.serializers import (
    AcceptClientInvitationSerializer,
    ClientCreateUpdateSerializer,
    ClientDetailSerializer,
    ClientInvitationDetailSerializer,
    ClientInvitationSerializer,
    ClientListSerializer,
    ClientProfileSerializer,
)

User = get_user_model()


@pytest.mark.django_db
class TestClientProfileSerializer:
    """Unit tests for ClientProfileSerializer."""

    def test_serialize_profile_data(self, user_factory):
        """Test serializing profile data."""
        user = user_factory(role="CLIENT")
        user.profile.phone = "+639123456789"
        user.profile.company = "Test Company"
        user.profile.save()

        serializer = ClientProfileSerializer(user.profile)

        assert serializer.data["phone"] == "+639123456789"
        assert serializer.data["company"] == "Test Company"

    def test_deserialize_profile_data(self):
        """Test deserializing profile data."""
        data = {"phone": "+639123456789", "company": "Test Company"}
        serializer = ClientProfileSerializer(data=data)

        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["phone"] == "+639123456789"
        assert serializer.validated_data["company"] == "Test Company"

    def test_allow_blank_phone(self):
        """Test that phone can be blank."""
        data = {"phone": "", "company": "Test Company"}
        serializer = ClientProfileSerializer(data=data)

        assert serializer.is_valid()

    def test_allow_blank_company(self):
        """Test that company can be blank."""
        data = {"phone": "+639123456789", "company": ""}
        serializer = ClientProfileSerializer(data=data)

        assert serializer.is_valid(), serializer.errors

    def test_allow_empty_data(self):
        """Test that empty data is valid."""
        data = {}
        serializer = ClientProfileSerializer(data=data)

        assert serializer.is_valid()


@pytest.mark.django_db
class TestClientListSerializer:
    """Unit tests for ClientListSerializer."""

    def test_serialize_client_list(self, user_factory):
        """Test serializing client for list view."""
        user = user_factory(email="client@example.com", first_name="John", last_name="Doe", role="CLIENT")
        user.profile.phone = "+639123456789"
        user.profile.company = "Test Company"
        user.profile.save()

        serializer = ClientListSerializer(user)

        assert serializer.data["id"] == user.id
        assert serializer.data["email"] == "client@example.com"
        assert serializer.data["first_name"] == "John"
        assert serializer.data["last_name"] == "Doe"
        assert serializer.data["is_active"] is True
        assert "profile" in serializer.data
        assert "date_joined" in serializer.data
        assert "has_account" in serializer.data

    def test_has_account_true_for_user_with_password(self, user_factory):
        """Test has_account returns True for user with password auth_method."""
        user = user_factory(role="CLIENT", password="testpass123")
        user.auth_method = "password"
        user.save()

        serializer = ClientListSerializer(user)

        assert serializer.data["has_account"] is True

    def test_has_account_true_for_google_oauth_user(self, user_factory):
        """Test has_account returns True for user with google auth_method."""
        user = user_factory(role="CLIENT")
        user.set_unusable_password()
        user.auth_method = "google"
        user.save()

        serializer = ClientListSerializer(user)

        assert serializer.data["has_account"] is True

    def test_has_account_false_for_invitation_pending(self, user_factory):
        """Test has_account returns False for user with invitation_pending auth_method."""
        user = user_factory(role="CLIENT")
        user.set_unusable_password()
        user.auth_method = "invitation_pending"
        user.save()

        serializer = ClientListSerializer(user)

        assert serializer.data["has_account"] is False

    def test_read_only_fields(self, user_factory):
        """Test that read_only_fields are correctly set."""
        user = user_factory(role="CLIENT")

        serializer = ClientListSerializer(
            user,
            data={"id": 999, "email": "changed@example.com", "date_joined": timezone.now(), "first_name": "Changed"},
            partial=True,
        )

        assert serializer.is_valid()
        # read_only fields should not be in validated_data
        assert "id" not in serializer.validated_data
        assert "email" not in serializer.validated_data
        assert "date_joined" not in serializer.validated_data


@pytest.mark.django_db
class TestClientDetailSerializer:
    """Unit tests for ClientDetailSerializer."""

    def test_serialize_client_detail(self, user_factory):
        """Test serializing client for detail view."""
        user = user_factory(email="client@example.com", first_name="John", last_name="Doe", role="CLIENT")

        serializer = ClientDetailSerializer(user)

        assert serializer.data["id"] == user.id
        assert serializer.data["email"] == "client@example.com"
        assert serializer.data["first_name"] == "John"
        assert serializer.data["last_name"] == "Doe"
        assert "has_account" in serializer.data

    def test_has_account_field(self, user_factory):
        """Test has_account field in detail view."""
        user = user_factory(role="CLIENT", password="testpass123")
        user.auth_method = "password"
        user.save()

        serializer = ClientDetailSerializer(user)

        assert "has_account" in serializer.data
        assert serializer.data["has_account"] is True


@pytest.mark.django_db
class TestClientCreateUpdateSerializer:
    """Unit tests for ClientCreateUpdateSerializer."""

    def test_create_client_with_minimum_data(self):
        """Test creating client with minimum required data."""
        data = {"email": "newclient@example.com", "first_name": "New", "last_name": "Client"}
        serializer = ClientCreateUpdateSerializer(data=data)

        assert serializer.is_valid(), serializer.errors
        client = serializer.save()

        assert client.email == "newclient@example.com"
        assert client.first_name == "New"
        assert client.last_name == "Client"
        assert client.role == "CLIENT"
        assert not client.has_usable_password()
        assert client.auth_method == "invitation_pending"

    def test_create_client_with_password(self):
        """Test creating client with password sets usable password and auth_method."""
        data = {
            "email": "newclient@example.com",
            "first_name": "New",
            "last_name": "Client",
            "password": "securepass123",
        }
        serializer = ClientCreateUpdateSerializer(data=data)

        assert serializer.is_valid(), serializer.errors
        client = serializer.save()

        assert client.has_usable_password()
        assert client.check_password("securepass123")
        assert client.auth_method == "password"

    def test_create_client_with_profile(self):
        """Test creating client with profile data."""
        data = {
            "email": "newclient@example.com",
            "first_name": "New",
            "last_name": "Client",
            "profile": {"phone": "+639123456789", "company": "Test Company"},
        }
        serializer = ClientCreateUpdateSerializer(data=data)

        assert serializer.is_valid(), serializer.errors
        client = serializer.save()

        assert client.profile.phone == "+639123456789"
        assert client.profile.company == "Test Company"

    def test_update_client(self, user_factory):
        """Test updating existing client."""
        user = user_factory(role="CLIENT", first_name="Old", last_name="Name")

        data = {"first_name": "New", "last_name": "Name"}
        serializer = ClientCreateUpdateSerializer(user, data=data, partial=True)

        assert serializer.is_valid(), serializer.errors
        client = serializer.save()

        assert client.first_name == "New"
        assert client.last_name == "Name"

    def test_update_client_password(self, user_factory):
        """Test updating client password sets auth_method to password."""
        user = user_factory(role="CLIENT", password="oldpass123")
        user.auth_method = "invitation_pending"  # Start with pending
        user.save()
        assert user.check_password("oldpass123")

        data = {"password": "newpass123"}
        serializer = ClientCreateUpdateSerializer(user, data=data, partial=True)

        assert serializer.is_valid(), serializer.errors
        client = serializer.save()

        assert client.check_password("newpass123")
        assert client.auth_method == "password"

    def test_update_client_profile(self, user_factory):
        """Test updating client profile data."""
        user = user_factory(role="CLIENT")
        user.profile.phone = "old-phone"
        user.profile.save()

        data = {"profile": {"phone": "+639123456789", "company": "New Company"}}
        serializer = ClientCreateUpdateSerializer(user, data=data, partial=True)

        assert serializer.is_valid(), serializer.errors
        client = serializer.save()
        client.profile.refresh_from_db()

        assert client.profile.phone == "+639123456789"
        assert client.profile.company == "New Company"

    def test_email_is_required(self):
        """Test that email is required for creation."""
        data = {"first_name": "New", "last_name": "Client"}
        serializer = ClientCreateUpdateSerializer(data=data)

        assert not serializer.is_valid()
        assert "email" in serializer.errors

    def test_password_is_write_only(self):
        """Test that password is write-only."""
        data = {
            "email": "newclient@example.com",
            "first_name": "New",
            "last_name": "Client",
            "password": "securepass123",
        }
        serializer = ClientCreateUpdateSerializer(data=data)
        serializer.is_valid()
        client = serializer.save()

        # Re-serialize and check password is not included
        output_serializer = ClientCreateUpdateSerializer(client)
        assert "password" not in output_serializer.data


@pytest.mark.django_db
class TestClientInvitationSerializer:
    """Unit tests for ClientInvitationSerializer."""

    def test_valid_client_id(self):
        """Test serializer with valid client_id."""
        data = {"client_id": 123}
        serializer = ClientInvitationSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["client_id"] == 123

    def test_client_id_required(self):
        """Test that client_id is required."""
        data = {}
        serializer = ClientInvitationSerializer(data=data)

        assert not serializer.is_valid()
        assert "client_id" in serializer.errors


@pytest.mark.django_db
class TestClientInvitationDetailSerializer:
    """Unit tests for ClientInvitationDetailSerializer."""

    def test_serialize_invitation(self, user_factory):
        """Test serializing invitation details."""
        client = user_factory(email="client@example.com", first_name="John", last_name="Doe", role="CLIENT")
        admin = user_factory(email="admin@example.com", admin=True)
        expires_at = timezone.now() + timedelta(days=7)

        invitation = ClientInvitation.objects.create(client=client, invited_by=admin, expires_at=expires_at)

        serializer = ClientInvitationDetailSerializer(invitation)

        assert str(serializer.data["id"]) == str(invitation.id)
        assert serializer.data["client"] == "client@example.com"
        assert serializer.data["client_name"] == "John Doe"
        assert serializer.data["invited_by"] == "admin@example.com"
        assert serializer.data["is_accepted"] is False
        assert "expires_at" in serializer.data
        assert "created_at" in serializer.data

    def test_client_name_with_email_fallback(self, user_factory):
        """Test client_name falls back to email when no name."""
        client = user_factory(email="client@example.com", first_name="", last_name="", role="CLIENT")
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client, invited_by=admin, expires_at=timezone.now() + timedelta(days=7)
        )

        serializer = ClientInvitationDetailSerializer(invitation)

        assert serializer.data["client_name"] == "client@example.com"

    def test_client_name_strips_whitespace(self, user_factory):
        """Test client_name strips whitespace properly."""
        client = user_factory(email="client@example.com", first_name="John", last_name="", role="CLIENT")
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client, invited_by=admin, expires_at=timezone.now() + timedelta(days=7)
        )

        serializer = ClientInvitationDetailSerializer(invitation)

        assert serializer.data["client_name"] == "John"


@pytest.mark.django_db
class TestAcceptClientInvitationSerializer:
    """Unit tests for AcceptClientInvitationSerializer."""

    def test_valid_matching_passwords(self):
        """Test serializer with matching passwords."""
        data = {"password": "securepass123", "confirm_password": "securepass123"}
        serializer = AcceptClientInvitationSerializer(data=data)

        assert serializer.is_valid()

    def test_password_mismatch(self):
        """Test serializer rejects mismatched passwords."""
        data = {"password": "securepass123", "confirm_password": "differentpass"}
        serializer = AcceptClientInvitationSerializer(data=data)

        assert not serializer.is_valid()
        assert "confirm_password" in serializer.errors

    def test_password_minimum_length(self):
        """Test that password has minimum length of 8."""
        data = {"password": "short", "confirm_password": "short"}
        serializer = AcceptClientInvitationSerializer(data=data)

        assert not serializer.is_valid()
        assert "password" in serializer.errors

    def test_password_required(self):
        """Test that password is required."""
        data = {"confirm_password": "securepass123"}
        serializer = AcceptClientInvitationSerializer(data=data)

        assert not serializer.is_valid()
        assert "password" in serializer.errors

    def test_confirm_password_required(self):
        """Test that confirm_password is required."""
        data = {"password": "securepass123"}
        serializer = AcceptClientInvitationSerializer(data=data)

        assert not serializer.is_valid()
        assert "confirm_password" in serializer.errors

    def test_passwords_are_write_only(self):
        """Test that password fields are write-only."""
        data = {"password": "securepass123", "confirm_password": "securepass123"}
        serializer = AcceptClientInvitationSerializer(data=data)
        serializer.is_valid()

        # Serialized data should not contain passwords
        assert "password" not in serializer.data
        assert "confirm_password" not in serializer.data
