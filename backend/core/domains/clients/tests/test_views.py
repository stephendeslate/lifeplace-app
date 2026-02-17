"""
Unit tests for clients domain views.

Tests:
- ClientViewSet (CRUD endpoints, events, send_invitation, active)
- ClientInvitationViewSet (retrieve, accept)
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status

from core.domains.clients.models import ClientInvitation

User = get_user_model()


@pytest.mark.django_db
class TestClientViewSetList:
    """Tests for ClientViewSet list endpoint."""

    def test_list_clients_as_admin(self, admin_client, user_factory):
        """Test listing clients as admin."""
        client1 = user_factory(role='CLIENT')
        client2 = user_factory(role='CLIENT')

        response = admin_client.get('/api/clients/')

        assert response.status_code == status.HTTP_200_OK
        # Paginated response
        assert 'results' in response.data
        client_ids = [c['id'] for c in response.data['results']]
        assert client1.id in client_ids
        assert client2.id in client_ids

    def test_list_clients_unauthorized(self, api_client, user_factory):
        """Test listing clients without authentication."""
        user_factory(role='CLIENT')

        response = api_client.get('/api/clients/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_clients_as_client_forbidden(self, client_user_client, user_factory):
        """Test listing clients as CLIENT user is forbidden."""
        user_factory(role='CLIENT')

        response = client_user_client.get('/api/clients/')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_clients_filter_by_active(self, admin_client, user_factory):
        """Test filtering clients by active status."""
        active_client = user_factory(role='CLIENT', is_active=True)
        inactive_client = user_factory(role='CLIENT', is_active=False)

        response = admin_client.get('/api/clients/?is_active=true')

        assert response.status_code == status.HTTP_200_OK
        client_ids = [c['id'] for c in response.data['results']]
        assert active_client.id in client_ids
        assert inactive_client.id not in client_ids

    def test_list_clients_filter_by_has_account(self, admin_client, user_factory):
        """Test filtering clients by has_account (auth_method)."""
        client_with_password = user_factory(role='CLIENT', password='testpass123')
        client_with_password.auth_method = 'password'
        client_with_password.save()

        client_with_google = user_factory(role='CLIENT')
        client_with_google.set_unusable_password()
        client_with_google.auth_method = 'google'
        client_with_google.save()

        client_without_account = user_factory(role='CLIENT')
        client_without_account.set_unusable_password()
        client_without_account.auth_method = 'invitation_pending'
        client_without_account.save()

        # Test has_account=true returns password and google users
        response = admin_client.get('/api/clients/?has_account=true')

        assert response.status_code == status.HTTP_200_OK
        client_ids = [c['id'] for c in response.data['results']]
        assert client_with_password.id in client_ids
        assert client_with_google.id in client_ids
        assert client_without_account.id not in client_ids

        # Test has_account=false returns only invitation_pending users
        response = admin_client.get('/api/clients/?has_account=false')

        assert response.status_code == status.HTTP_200_OK
        client_ids = [c['id'] for c in response.data['results']]
        assert client_with_password.id not in client_ids
        assert client_with_google.id not in client_ids
        assert client_without_account.id in client_ids

    def test_list_clients_search(self, admin_client, user_factory):
        """Test searching clients."""
        john = user_factory(role='CLIENT', first_name='John', last_name='Doe')
        jane = user_factory(role='CLIENT', first_name='Jane', last_name='Smith')

        response = admin_client.get('/api/clients/?search=John')

        assert response.status_code == status.HTTP_200_OK
        client_ids = [c['id'] for c in response.data['results']]
        assert john.id in client_ids
        assert jane.id not in client_ids


@pytest.mark.django_db
class TestClientViewSetRetrieve:
    """Tests for ClientViewSet retrieve endpoint."""

    def test_retrieve_client_as_admin(self, admin_client, user_factory):
        """Test retrieving a client as admin."""
        client = user_factory(
            role='CLIENT',
            email='client@example.com',
            first_name='John',
            last_name='Doe'
        )

        response = admin_client.get(f'/api/clients/{client.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == client.id
        assert response.data['email'] == 'client@example.com'
        assert response.data['first_name'] == 'John'
        assert response.data['last_name'] == 'Doe'
        assert 'has_account' in response.data

    def test_retrieve_nonexistent_client(self, admin_client):
        """Test retrieving nonexistent client returns 404."""
        response = admin_client.get('/api/clients/99999/')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_client_unauthorized(self, api_client, user_factory):
        """Test retrieving client without authentication."""
        client = user_factory(role='CLIENT')

        response = api_client.get(f'/api/clients/{client.id}/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestClientViewSetCreate:
    """Tests for ClientViewSet create endpoint."""

    def test_create_client_as_admin(self, admin_client):
        """Test creating a client as admin."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client',
            'is_active': True
        }

        response = admin_client.post('/api/clients/', data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == 'newclient@example.com'
        assert response.data['first_name'] == 'New'
        assert response.data['last_name'] == 'Client'
        assert User.objects.filter(email='newclient@example.com').exists()

    def test_create_client_with_profile(self, admin_client):
        """Test creating a client with profile data."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client',
            'profile': {
                'phone': '+639123456789',
                'company': 'Test Company'
            }
        }

        response = admin_client.post('/api/clients/', data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['profile']['phone'] == '+639123456789'
        assert response.data['profile']['company'] == 'Test Company'

    def test_create_client_with_password(self, admin_client):
        """Test creating a client with password sets auth_method to password."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client',
            'password': 'securepass123'
        }

        response = admin_client.post('/api/clients/', data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email='newclient@example.com')
        assert user.has_usable_password()
        assert user.check_password('securepass123')
        assert user.auth_method == 'password'

    def test_create_client_without_password(self, admin_client):
        """Test creating a client without password sets auth_method to invitation_pending."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client'
        }

        response = admin_client.post('/api/clients/', data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email='newclient@example.com')
        assert not user.has_usable_password()
        assert user.auth_method == 'invitation_pending'

    def test_create_client_duplicate_email_fails(self, admin_client, user_factory):
        """Test creating client with duplicate email fails."""
        user_factory(email='existing@example.com')

        data = {
            'email': 'existing@example.com',
            'first_name': 'New',
            'last_name': 'Client'
        }

        response = admin_client.post('/api/clients/', data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_client_unauthorized(self, api_client):
        """Test creating client without authentication."""
        data = {
            'email': 'newclient@example.com',
            'first_name': 'New',
            'last_name': 'Client'
        }

        response = api_client.post('/api/clients/', data, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestClientViewSetUpdate:
    """Tests for ClientViewSet update endpoint."""

    def test_update_client_as_admin(self, admin_client, user_factory):
        """Test updating a client as admin."""
        client = user_factory(role='CLIENT', first_name='Old', last_name='Name')

        data = {
            'email': client.email,
            'first_name': 'New',
            'last_name': 'Name'
        }

        response = admin_client.put(f'/api/clients/{client.id}/', data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'New'

    def test_partial_update_client(self, admin_client, user_factory):
        """Test partial update of client."""
        client = user_factory(role='CLIENT', first_name='Old', last_name='Name')

        data = {'first_name': 'New'}

        response = admin_client.patch(f'/api/clients/{client.id}/', data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'New'
        assert response.data['last_name'] == 'Name'

    def test_update_client_profile(self, admin_client, user_factory):
        """Test updating client profile."""
        client = user_factory(role='CLIENT')

        data = {
            'profile': {
                'phone': '+639987654321',
                'company': 'Updated Company'
            }
        }

        response = admin_client.patch(f'/api/clients/{client.id}/', data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['profile']['phone'] == '+639987654321'
        assert response.data['profile']['company'] == 'Updated Company'

    def test_update_nonexistent_client(self, admin_client):
        """Test updating nonexistent client returns 404."""
        data = {'first_name': 'New'}

        response = admin_client.patch('/api/clients/99999/', data, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestClientViewSetDestroy:
    """Tests for ClientViewSet destroy (deactivate) endpoint."""

    def test_destroy_client_deactivates(self, admin_client, user_factory):
        """Test destroying a client deactivates instead of deleting."""
        client = user_factory(role='CLIENT', is_active=True)

        response = admin_client.delete(f'/api/clients/{client.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        client.refresh_from_db()
        assert client.is_active is False
        # User should still exist
        assert User.objects.filter(id=client.id).exists()

    def test_destroy_client_with_active_events_fails(self, admin_client, user_factory, event_factory):
        """Test destroying client with active events fails."""
        client = user_factory(role='CLIENT')
        event_factory(client=client, status='CONFIRMED')

        response = admin_client.delete(f'/api/clients/{client.id}/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_destroy_nonexistent_client(self, admin_client):
        """Test destroying nonexistent client returns 404."""
        response = admin_client.delete('/api/clients/99999/')

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestClientViewSetEvents:
    """Tests for ClientViewSet events action."""

    def test_get_client_events(self, admin_client, user_factory, event_factory):
        """Test getting events for a client."""
        client = user_factory(role='CLIENT')
        event1 = event_factory(client=client)
        event2 = event_factory(client=client)

        response = admin_client.get(f'/api/clients/{client.id}/events/')

        assert response.status_code == status.HTTP_200_OK
        event_ids = [e['id'] for e in response.data]
        assert event1.id in event_ids
        assert event2.id in event_ids

    def test_get_events_for_nonexistent_client(self, admin_client):
        """Test getting events for nonexistent client returns 404."""
        response = admin_client.get('/api/clients/99999/events/')

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestClientViewSetActive:
    """Tests for ClientViewSet active action."""

    def test_get_active_clients(self, admin_client, user_factory):
        """Test getting only active clients."""
        active_client = user_factory(role='CLIENT', is_active=True)
        inactive_client = user_factory(role='CLIENT', is_active=False)

        response = admin_client.get('/api/clients/active/')

        assert response.status_code == status.HTTP_200_OK
        client_ids = [c['id'] for c in response.data['results']]
        assert active_client.id in client_ids
        assert inactive_client.id not in client_ids


@pytest.mark.django_db
class TestClientViewSetSendInvitation:
    """Tests for ClientViewSet send_invitation action."""

    def test_send_invitation_to_client_without_account(self, admin_client, user_factory, mock_brevo_email):
        """Test sending invitation to client without account."""
        client = user_factory(role='CLIENT', is_active=False)
        client.set_unusable_password()
        client.auth_method = 'invitation_pending'
        client.save()

        response = admin_client.post(f'/api/clients/{client.id}/send_invitation/')

        assert response.status_code == status.HTTP_200_OK
        assert 'id' in response.data
        assert response.data['client'] == client.email
        assert response.data['is_accepted'] is False

    def test_send_invitation_to_client_with_account_fails(self, admin_client, user_factory):
        """Test sending invitation to client with active account fails."""
        client = user_factory(role='CLIENT', is_active=True, password='testpass123')
        client.auth_method = 'password'
        client.save()

        response = admin_client.post(f'/api/clients/{client.id}/send_invitation/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_send_invitation_to_nonexistent_client_fails(self, admin_client):
        """Test sending invitation to nonexistent client fails."""
        response = admin_client.post('/api/clients/99999/send_invitation/')

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]


@pytest.mark.django_db
class TestClientInvitationViewSetRetrieve:
    """Tests for ClientInvitationViewSet retrieve endpoint."""

    def test_retrieve_invitation_public(self, api_client, user_factory):
        """Test retrieving invitation is public (no auth required)."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        response = api_client.get(f'/api/clients/invitations/{invitation.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert str(response.data['id']) == str(invitation.id)
        assert response.data['client'] == client.email

    def test_retrieve_nonexistent_invitation(self, api_client):
        """Test retrieving nonexistent invitation returns error."""
        import uuid
        fake_id = uuid.uuid4()

        response = api_client.get(f'/api/clients/invitations/{fake_id}/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_expired_invitation(self, api_client, user_factory):
        """Test retrieving expired invitation returns error."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() - timedelta(days=1)
        )

        response = api_client.get(f'/api/clients/invitations/{invitation.id}/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expired' in response.data['detail'].lower()

    def test_retrieve_accepted_invitation(self, api_client, user_factory):
        """Test retrieving already accepted invitation returns error."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7),
            is_accepted=True
        )

        response = api_client.get(f'/api/clients/invitations/{invitation.id}/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'accepted' in response.data['detail'].lower()


@pytest.mark.django_db
class TestClientInvitationViewSetAccept:
    """Tests for ClientInvitationViewSet accept action."""

    def test_accept_invitation(self, api_client, user_factory):
        """Test accepting invitation successfully sets auth_method to password."""
        client = user_factory(role='CLIENT', is_active=False)
        client.set_unusable_password()
        client.auth_method = 'invitation_pending'
        client.save()
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        data = {
            'password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }

        response = api_client.post(
            f'/api/clients/invitations/{invitation.id}/accept/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert 'refresh' in response.data['tokens']
        assert 'user' in response.data
        assert response.data['message'] == 'Account activated successfully'

        # Verify client is activated with correct auth_method
        client.refresh_from_db()
        assert client.is_active is True
        assert client.check_password('newpassword123')
        assert client.auth_method == 'password'

        # Verify invitation is marked as accepted
        invitation.refresh_from_db()
        assert invitation.is_accepted is True

    def test_accept_invitation_password_mismatch(self, api_client, user_factory):
        """Test accepting invitation with password mismatch fails."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        data = {
            'password': 'password123',
            'confirm_password': 'differentpassword'
        }

        response = api_client.post(
            f'/api/clients/invitations/{invitation.id}/accept/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'confirm_password' in response.data

    def test_accept_invitation_password_too_short(self, api_client, user_factory):
        """Test accepting invitation with short password fails."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7)
        )

        data = {
            'password': 'short',
            'confirm_password': 'short'
        }

        response = api_client.post(
            f'/api/clients/invitations/{invitation.id}/accept/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data

    def test_accept_expired_invitation_fails(self, api_client, user_factory):
        """Test accepting expired invitation fails."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() - timedelta(days=1)
        )

        data = {
            'password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }

        response = api_client.post(
            f'/api/clients/invitations/{invitation.id}/accept/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expired' in response.data['detail'].lower()

    def test_accept_already_accepted_invitation_fails(self, api_client, user_factory):
        """Test accepting already accepted invitation fails."""
        client = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        invitation = ClientInvitation.objects.create(
            client=client,
            invited_by=admin,
            expires_at=timezone.now() + timedelta(days=7),
            is_accepted=True
        )

        data = {
            'password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }

        response = api_client.post(
            f'/api/clients/invitations/{invitation.id}/accept/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'accepted' in response.data['detail'].lower()

    def test_accept_nonexistent_invitation_fails(self, api_client):
        """Test accepting nonexistent invitation fails."""
        import uuid
        fake_id = uuid.uuid4()

        data = {
            'password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }

        response = api_client.post(
            f'/api/clients/invitations/{fake_id}/accept/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestClientViewSetPagination:
    """Tests for ClientViewSet pagination."""

    def test_list_clients_is_paginated(self, admin_client, user_factory):
        """Test that client list is paginated."""
        for _ in range(15):
            user_factory(role='CLIENT')

        response = admin_client.get('/api/clients/')

        assert response.status_code == status.HTTP_200_OK
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert 'results' in response.data

    def test_active_clients_is_paginated(self, admin_client, user_factory):
        """Test that active clients list is paginated."""
        for _ in range(15):
            user_factory(role='CLIENT', is_active=True)

        response = admin_client.get('/api/clients/active/')

        assert response.status_code == status.HTTP_200_OK
        assert 'count' in response.data
        assert 'results' in response.data


@pytest.mark.django_db
class TestClientViewSetPermissions:
    """Tests for ClientViewSet permission checks."""

    def test_all_actions_require_admin(self, client_user_client, user_factory):
        """Test that all client management actions require admin role."""
        client = user_factory(role='CLIENT')

        # List
        assert client_user_client.get('/api/clients/').status_code == status.HTTP_403_FORBIDDEN

        # Create
        assert client_user_client.post(
            '/api/clients/',
            {'email': 'new@example.com', 'first_name': 'New', 'last_name': 'Client'},
            format='json'
        ).status_code == status.HTTP_403_FORBIDDEN

        # Retrieve
        assert client_user_client.get(f'/api/clients/{client.id}/').status_code == status.HTTP_403_FORBIDDEN

        # Update
        assert client_user_client.patch(
            f'/api/clients/{client.id}/',
            {'first_name': 'Updated'},
            format='json'
        ).status_code == status.HTTP_403_FORBIDDEN

        # Delete
        assert client_user_client.delete(f'/api/clients/{client.id}/').status_code == status.HTTP_403_FORBIDDEN

        # Events
        assert client_user_client.get(f'/api/clients/{client.id}/events/').status_code == status.HTTP_403_FORBIDDEN

        # Active
        assert client_user_client.get('/api/clients/active/').status_code == status.HTTP_403_FORBIDDEN

        # Send invitation
        assert client_user_client.post(
            f'/api/clients/{client.id}/send_invitation/'
        ).status_code == status.HTTP_403_FORBIDDEN
