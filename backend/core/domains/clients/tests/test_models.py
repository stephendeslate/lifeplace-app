"""
Unit tests for clients domain models.

Tests:
- ClientInvitation model (UUID primary key, expiration, acceptance)
"""

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time

from core.domains.clients.models import ClientInvitation

User = get_user_model()


@pytest.mark.django_db
class TestClientInvitationModel:
    """Unit tests for the ClientInvitation model."""

    def test_invitation_creation(self, user_factory):
        """Test creating a client invitation with required fields."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        expires_at = timezone.now() + timedelta(days=7)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=expires_at
        )

        assert invitation.id is not None
        assert invitation.client == client
        assert invitation.invited_by == admin
        assert invitation.is_accepted is False
        assert invitation.expires_at == expires_at

    def test_invitation_string_representation(self, user_factory):
        """Test ClientInvitation __str__ returns informative string."""
        client = user_factory(email='testclient@example.com', role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        assert str(invitation) == 'Invitation for testclient@example.com'

    def test_invitation_uuid_primary_key(self, user_factory):
        """Test that invitation uses UUID as primary key."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        # UUID should be 36 characters with hyphens or 32 without
        assert len(str(invitation.id)) in [32, 36]

    def test_invitation_is_expired_before_expiration(self, user_factory):
        """Test is_expired returns False before expiration date."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        assert not invitation.is_expired()

    @freeze_time('2024-01-15 10:00:00')
    def test_invitation_is_expired_after_expiration(self, user_factory):
        """Test is_expired returns True after expiration date."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        # Create invitation that expired yesterday
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() - timedelta(days=1)
        )

        assert invitation.is_expired()

    def test_invitation_is_expired_at_exact_expiration_time(self, user_factory):
        """Test is_expired returns True at exact expiration time."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        # Create invitation that expires right now (or slightly in the past)
        expires_at = timezone.now() - timedelta(seconds=1)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=expires_at
        )

        assert invitation.is_expired()

    def test_invitation_default_is_accepted_false(self, user_factory):
        """Test that is_accepted defaults to False."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        assert invitation.is_accepted is False

    def test_invitation_can_be_accepted(self, user_factory):
        """Test that invitation can be marked as accepted."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        invitation.is_accepted = True
        invitation.save()

        invitation.refresh_from_db()
        assert invitation.is_accepted is True

    def test_invitation_cascade_delete_on_client_delete(self, user_factory, ensure_security_events_table):
        """Test invitation is deleted when client is deleted."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )
        invitation_id = invitation.id

        client.delete()

        assert not ClientInvitation.objects.filter(id=invitation_id).exists()

    def test_invitation_set_null_on_admin_delete(self, user_factory, ensure_security_events_table):
        """Test invited_by is set to NULL when admin is deleted."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )
        invitation_id = invitation.id

        admin.delete()

        invitation.refresh_from_db()
        assert invitation.invited_by is None

    def test_client_can_have_multiple_invitations(self, user_factory):
        """Test a client can have multiple invitations."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation1 = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )
        invitation2 = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=14)
        )

        assert client.invitations.count() == 2
        assert invitation1 in client.invitations.all()
        assert invitation2 in client.invitations.all()

    def test_admin_sent_invitations_relation(self, user_factory):
        """Test admin can access sent invitations via related name."""
        client1 = user_factory(role='CLIENT')
        client2 = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation1 = ClientInvitation.objects.create(
            client=client1,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )
        invitation2 = ClientInvitation.objects.create(
            client=client2,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        assert admin.sent_client_invitations.count() == 2
        assert invitation1 in admin.sent_client_invitations.all()
        assert invitation2 in admin.sent_client_invitations.all()

    def test_invitation_inherits_from_base_model(self, user_factory):
        """Test that ClientInvitation inherits from BaseModel (has timestamps)."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        # BaseModel typically provides created_at and updated_at
        assert hasattr(invitation, 'created_at')
        assert hasattr(invitation, 'updated_at')
        assert invitation.created_at is not None
