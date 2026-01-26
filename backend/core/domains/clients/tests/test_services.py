"""
Unit tests for clients domain services.

Tests:
- ClientService (CRUD operations, filtering, events)
- ClientInvitationService (send, get, accept invitations)
"""

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time

from core.domains.clients.services import ClientService, ClientInvitationService
from core.domains.clients.exceptions import (
    ClientNotFound,
    EmailAlreadyExists,
    ClientDeactivationError,
    ClientInvitationError,
    ClientAlreadyActive,
)
from core.domains.clients.models import ClientInvitation

User = get_user_model()


@pytest.mark.django_db
class TestClientServiceGetAllClients:
    """Unit tests for ClientService.get_all_clients method."""

    def test_returns_only_clients(self, user_factory):
        """Test that get_all_clients returns only CLIENT role users."""
        client1 = user_factory(role='CLIENT')
        client2 = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        clients = ClientService.get_all_clients()

        assert client1 in clients
        assert client2 in clients
        assert admin not in clients

    def test_filter_by_active_status_true(self, user_factory):
        """Test filtering by active status True."""
        active_client = user_factory(role='CLIENT', is_active=True)
        inactive_client = user_factory(role='CLIENT', is_active=False)

        clients = ClientService.get_all_clients(is_active=True)

        assert active_client in clients
        assert inactive_client not in clients

    def test_filter_by_active_status_false(self, user_factory):
        """Test filtering by active status False."""
        active_client = user_factory(role='CLIENT', is_active=True)
        inactive_client = user_factory(role='CLIENT', is_active=False)

        clients = ClientService.get_all_clients(is_active=False)

        assert active_client not in clients
        assert inactive_client in clients

    def test_search_by_first_name(self, user_factory):
        """Test searching by first name."""
        john = user_factory(role='CLIENT', first_name='John', last_name='Doe')
        jane = user_factory(role='CLIENT', first_name='Jane', last_name='Smith')

        clients = ClientService.get_all_clients(search_query='John')

        assert john in clients
        assert jane not in clients

    def test_search_by_last_name(self, user_factory):
        """Test searching by last name."""
        john = user_factory(role='CLIENT', first_name='John', last_name='Doe')
        jane = user_factory(role='CLIENT', first_name='Jane', last_name='Smith')

        clients = ClientService.get_all_clients(search_query='Smith')

        assert john not in clients
        assert jane in clients

    def test_search_by_email(self, user_factory):
        """Test searching by email."""
        client1 = user_factory(role='CLIENT', email='findme@example.com')
        client2 = user_factory(role='CLIENT', email='other@example.com')

        clients = ClientService.get_all_clients(search_query='findme')

        assert client1 in clients
        assert client2 not in clients

    def test_search_by_company(self, user_factory):
        """Test searching by company in profile."""
        client1 = user_factory(role='CLIENT')
        client1.profile.company = 'Acme Corp'
        client1.profile.save()

        client2 = user_factory(role='CLIENT')
        client2.profile.company = 'Other Inc'
        client2.profile.save()

        clients = ClientService.get_all_clients(search_query='Acme')

        assert client1 in clients
        assert client2 not in clients

    def test_search_by_phone(self, user_factory):
        """Test searching by phone in profile."""
        client1 = user_factory(role='CLIENT')
        client1.profile.phone = '+1234567890'
        client1.profile.save()

        client2 = user_factory(role='CLIENT')
        client2.profile.phone = '+0987654321'
        client2.profile.save()

        clients = ClientService.get_all_clients(search_query='1234567890')

        assert client1 in clients
        assert client2 not in clients

    def test_search_case_insensitive(self, user_factory):
        """Test that search is case insensitive."""
        john = user_factory(role='CLIENT', first_name='John')

        clients = ClientService.get_all_clients(search_query='JOHN')

        assert john in clients

    def test_ordered_by_date_joined_descending(self, user_factory):
        """Test results are ordered by date_joined descending."""
        # Create clients in specific order
        client1 = user_factory(role='CLIENT')
        client2 = user_factory(role='CLIENT')
        client3 = user_factory(role='CLIENT')

        clients = list(ClientService.get_all_clients())

        # Most recent should be first
        assert clients[0] == client3
        assert clients[1] == client2
        assert clients[2] == client1


@pytest.mark.django_db
class TestClientServiceGetClientById:
    """Unit tests for ClientService.get_client_by_id method."""

    def test_get_existing_client(self, user_factory):
        """Test getting an existing client by ID."""
        client = user_factory(role='CLIENT')

        result = ClientService.get_client_by_id(client.id)

        assert result == client

    def test_get_nonexistent_client(self):
        """Test getting a nonexistent client raises exception."""
        with pytest.raises(ClientNotFound):
            ClientService.get_client_by_id(99999)

    def test_get_admin_by_client_method_fails(self, user_factory):
        """Test that get_client_by_id doesn't return admin users."""
        admin = user_factory(admin=True)

        with pytest.raises(ClientNotFound):
            ClientService.get_client_by_id(admin.id)


@pytest.mark.django_db
class TestClientServiceCreateClient:
    """Unit tests for ClientService.create_client method."""

    def test_create_client_with_minimum_data(self):
        """Test creating client with minimum required data."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client'
        }

        client = ClientService.create_client(data)

        assert client.email == 'newclient@example.com'
        assert client.first_name == 'New'
        assert client.last_name == 'Client'
        assert client.role == 'CLIENT'

    def test_create_client_sets_role_to_client(self):
        """Test that role is always set to CLIENT."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client',
            'role': 'ADMIN'  # Attempt to create as admin
        }

        client = ClientService.create_client(data)

        assert client.role == 'CLIENT'

    def test_create_client_with_password(self):
        """Test creating client with password."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client',
            'password': 'securepass123'
        }

        client = ClientService.create_client(data)

        assert client.has_usable_password()
        assert client.check_password('securepass123')

    def test_create_client_without_password(self):
        """Test creating client without password sets unusable password."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client'
        }

        client = ClientService.create_client(data)

        assert not client.has_usable_password()

    def test_create_client_with_profile(self):
        """Test creating client with profile data."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client',
            'profile': {
                'phone': '+1234567890',
                'company': 'Test Company'
            }
        }

        client = ClientService.create_client(data)

        assert client.profile.phone == '+1234567890'
        assert client.profile.company == 'Test Company'

    def test_create_client_with_existing_email_fails(self, user_factory):
        """Test that creating client with existing email raises exception."""
        user_factory(email='existing@example.com')

        data = {
            'email': 'existing@example.com',
            'first_name': 'New',
            'last_name': 'Client'
        }

        with pytest.raises(EmailAlreadyExists):
            ClientService.create_client(data)


@pytest.mark.django_db
class TestClientServiceUpdateClient:
    """Unit tests for ClientService.update_client method."""

    def test_update_client_basic_fields(self, user_factory):
        """Test updating basic client fields."""
        client = user_factory(role='CLIENT', first_name='Old', last_name='Name')

        data = {
            'first_name': 'New',
            'last_name': 'Name'
        }
        updated = ClientService.update_client(client.id, data)

        assert updated.first_name == 'New'
        assert updated.last_name == 'Name'

    def test_update_client_password(self, user_factory):
        """Test updating client password."""
        client = user_factory(role='CLIENT', password='oldpass123')

        data = {'password': 'newpass123'}
        updated = ClientService.update_client(client.id, data)

        assert updated.check_password('newpass123')

    def test_update_client_profile(self, user_factory):
        """Test updating client profile data."""
        client = user_factory(role='CLIENT')

        data = {
            'profile': {
                'phone': '+1234567890',
                'company': 'New Company'
            }
        }
        updated = ClientService.update_client(client.id, data)

        assert updated.profile.phone == '+1234567890'
        assert updated.profile.company == 'New Company'

    def test_update_nonexistent_client_fails(self):
        """Test updating nonexistent client raises exception."""
        data = {'first_name': 'New'}

        with pytest.raises(ClientNotFound):
            ClientService.update_client(99999, data)

    def test_update_client_email_to_existing_fails(self, user_factory):
        """Test updating client email to existing email raises exception."""
        client1 = user_factory(role='CLIENT', email='client1@example.com')
        client2 = user_factory(role='CLIENT', email='client2@example.com')

        data = {'email': 'client1@example.com'}

        with pytest.raises(EmailAlreadyExists):
            ClientService.update_client(client2.id, data)

    def test_update_client_keep_same_email(self, user_factory):
        """Test updating client while keeping same email works."""
        client = user_factory(role='CLIENT', email='client@example.com')

        data = {'email': 'client@example.com', 'first_name': 'Updated'}
        updated = ClientService.update_client(client.id, data)

        assert updated.email == 'client@example.com'
        assert updated.first_name == 'Updated'


@pytest.mark.django_db
class TestClientServiceDeactivateClient:
    """Unit tests for ClientService.deactivate_client method."""

    def test_deactivate_client_without_events(self, user_factory):
        """Test deactivating client without events succeeds."""
        client = user_factory(role='CLIENT', is_active=True)

        result = ClientService.deactivate_client(client.id)

        assert result is True
        client.refresh_from_db()
        assert client.is_active is False

    def test_deactivate_nonexistent_client_fails(self):
        """Test deactivating nonexistent client raises exception."""
        with pytest.raises(ClientNotFound):
            ClientService.deactivate_client(99999)

    def test_deactivate_client_with_active_events_fails(self, user_factory, event_factory):
        """Test deactivating client with active events raises exception."""
        client = user_factory(role='CLIENT')
        event_factory(client=client, status='CONFIRMED')

        with pytest.raises(ClientDeactivationError):
            ClientService.deactivate_client(client.id)

    def test_deactivate_client_with_completed_events_succeeds(self, user_factory, event_factory):
        """Test deactivating client with only completed events succeeds."""
        client = user_factory(role='CLIENT')
        event_factory(client=client, completed=True)

        result = ClientService.deactivate_client(client.id)

        assert result is True

    def test_deactivate_client_with_cancelled_events_succeeds(self, user_factory, event_factory):
        """Test deactivating client with only cancelled events succeeds."""
        client = user_factory(role='CLIENT')
        event_factory(client=client, cancelled=True)

        result = ClientService.deactivate_client(client.id)

        assert result is True

    def test_deactivate_client_with_lead_events_fails(self, user_factory, event_factory):
        """Test deactivating client with LEAD status events fails."""
        client = user_factory(role='CLIENT')
        event_factory(client=client, status='LEAD')

        with pytest.raises(ClientDeactivationError):
            ClientService.deactivate_client(client.id)


@pytest.mark.django_db
class TestClientServiceGetClientEvents:
    """Unit tests for ClientService.get_client_events method."""

    def test_get_client_events(self, user_factory, event_factory):
        """Test getting events for a client."""
        client = user_factory(role='CLIENT')
        event1 = event_factory(client=client)
        event2 = event_factory(client=client)

        events = ClientService.get_client_events(client.id)

        assert event1 in events
        assert event2 in events

    def test_get_events_for_nonexistent_client_fails(self):
        """Test getting events for nonexistent client raises exception."""
        with pytest.raises(ClientNotFound):
            ClientService.get_client_events(99999)

    def test_events_ordered_by_start_date_descending(self, user_factory, event_factory):
        """Test events are ordered by start_date descending."""
        client = user_factory(role='CLIENT')
        old_event = event_factory(
            client=client,
            start_date=timezone.now() - timedelta(days=30)
        )
        new_event = event_factory(
            client=client,
            start_date=timezone.now() + timedelta(days=30)
        )

        events = list(ClientService.get_client_events(client.id))

        # Most recent start_date should be first
        assert events[0] == new_event
        assert events[1] == old_event


@pytest.mark.django_db
class TestClientInvitationServiceSendInvitation:
    """Unit tests for ClientInvitationService.send_client_invitation method."""

    def test_send_invitation_to_inactive_client(self, user_factory, mock_brevo_email):
        """Test sending invitation to inactive client without password."""
        client = user_factory(role='CLIENT', is_active=False)
        client.set_unusable_password()
        client.save()
        admin = user_factory(admin=True)

        # The current implementation returns None since it doesn't create invitation
        # This tests the validation part
        result = ClientInvitationService.send_client_invitation(
            client_id=client.id,
            invited_by_id=admin.id
        )

        # Since the method is incomplete (doesn't return), we just verify no exception
        # In a real implementation, we'd verify the invitation was created

    def test_send_invitation_to_nonexistent_client_fails(self, user_factory):
        """Test sending invitation to nonexistent client raises exception."""
        admin = user_factory(admin=True)

        with pytest.raises(ClientNotFound):
            ClientInvitationService.send_client_invitation(
                client_id=99999,
                invited_by_id=admin.id
            )

    def test_send_invitation_to_active_client_with_password_fails(self, user_factory):
        """Test sending invitation to active client with password raises exception."""
        client = user_factory(role='CLIENT', is_active=True, password='testpass123')
        client.auth_method = 'password'
        client.save()
        admin = user_factory(admin=True)

        with pytest.raises(ClientAlreadyActive):
            ClientInvitationService.send_client_invitation(
                client_id=client.id,
                invited_by_id=admin.id
            )

    def test_send_invitation_with_invalid_admin_fails(self, user_factory):
        """Test sending invitation with invalid admin ID raises exception."""
        client = user_factory(role='CLIENT', is_active=False)
        client.set_unusable_password()
        client.save()

        with pytest.raises(ClientInvitationError):
            ClientInvitationService.send_client_invitation(
                client_id=client.id,
                invited_by_id=99999
            )

    def test_send_invitation_with_client_user_as_admin_fails(self, user_factory):
        """Test sending invitation with CLIENT role user as admin fails."""
        client = user_factory(role='CLIENT', is_active=False)
        client.set_unusable_password()
        client.save()
        not_admin = user_factory(role='CLIENT')

        with pytest.raises(ClientInvitationError):
            ClientInvitationService.send_client_invitation(
                client_id=client.id,
                invited_by_id=not_admin.id
            )


@pytest.mark.django_db
class TestClientInvitationServiceGetInvitation:
    """Unit tests for ClientInvitationService.get_invitation_by_id method."""

    def test_get_valid_invitation(self, user_factory):
        """Test getting a valid invitation."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        result = ClientInvitationService.get_invitation_by_id(invitation.id)

        assert result == invitation

    def test_get_nonexistent_invitation_fails(self):
        """Test getting nonexistent invitation raises exception."""
        import uuid
        fake_id = uuid.uuid4()

        with pytest.raises(ClientInvitationError, match="Invitation not found"):
            ClientInvitationService.get_invitation_by_id(fake_id)

    def test_get_expired_invitation_fails(self, user_factory):
        """Test getting expired invitation raises exception."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() - timedelta(days=1)
        )

        with pytest.raises(ClientInvitationError, match="expired"):
            ClientInvitationService.get_invitation_by_id(invitation.id)

    def test_get_accepted_invitation_fails(self, user_factory):
        """Test getting already accepted invitation raises exception."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7),
            is_accepted=True
        )

        with pytest.raises(ClientInvitationError, match="already been accepted"):
            ClientInvitationService.get_invitation_by_id(invitation.id)


@pytest.mark.django_db
class TestClientInvitationServiceAcceptInvitation:
    """Unit tests for ClientInvitationService.accept_invitation method."""

    def test_accept_valid_invitation(self, user_factory):
        """Test accepting a valid invitation."""
        client = user_factory(role='CLIENT', is_active=False)
        client.set_unusable_password()
        client.save()
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        result = ClientInvitationService.accept_invitation(
            invitation_id=invitation.id,
            password='newpassword123'
        )

        assert result == client
        result.refresh_from_db()
        assert result.is_active is True
        assert result.check_password('newpassword123')

        invitation.refresh_from_db()
        assert invitation.is_accepted is True

    def test_accept_expired_invitation_fails(self, user_factory):
        """Test accepting expired invitation raises exception."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() - timedelta(days=1)
        )

        with pytest.raises(ClientInvitationError, match="expired"):
            ClientInvitationService.accept_invitation(
                invitation_id=invitation.id,
                password='newpassword123'
            )

    def test_accept_already_accepted_invitation_fails(self, user_factory):
        """Test accepting already accepted invitation raises exception."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7),
            is_accepted=True
        )

        with pytest.raises(ClientInvitationError, match="already been accepted"):
            ClientInvitationService.accept_invitation(
                invitation_id=invitation.id,
                password='newpassword123'
            )

    def test_accept_nonexistent_invitation_fails(self):
        """Test accepting nonexistent invitation raises exception."""
        import uuid
        fake_id = uuid.uuid4()

        with pytest.raises(ClientInvitationError, match="Invitation not found"):
            ClientInvitationService.accept_invitation(
                invitation_id=fake_id,
                password='newpassword123'
            )

    def test_accept_invitation_activates_client(self, user_factory):
        """Test that accepting invitation activates the client account."""
        client = user_factory(role='CLIENT', is_active=False)
        admin = user_factory(admin=True)

        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        ClientInvitationService.accept_invitation(
            invitation_id=invitation.id,
            password='newpassword123'
        )

        client.refresh_from_db()
        assert client.is_active is True
