"""
Unit tests for messaging domain views.

Tests API endpoints for:
- MessageThreadViewSet (CRUD operations, filtering, actions)
- MessageViewSet (CRUD operations, actions)
- MessageThreadAdminViewSet (admin-only operations)
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.domains.messaging.models import MessageThread, Message, MessageReadStatus


# =============================================================================
# HELPER FIXTURES
# =============================================================================

@pytest.fixture
def api_client():
    """Return a DRF API client instance."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """
    Return a factory function for creating authenticated API clients.
    """
    def _get_client(user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        api_client.user = user
        return api_client

    return _get_client


# =============================================================================
# MESSAGE THREAD VIEWSET TESTS
# =============================================================================

@pytest.mark.django_db
class TestMessageThreadViewSetList:
    """Tests for MessageThreadViewSet list endpoint."""

    def test_list_threads_as_admin(self, authenticated_client, user_factory, message_thread_factory):
        """Admin users can see all message threads."""
        admin = user_factory(admin=True)
        client = authenticated_client(admin)

        # Create threads for different clients
        message_thread_factory()
        message_thread_factory()
        message_thread_factory()

        url = reverse('messagethread-list')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3

    def test_list_threads_as_client_only_own(self, authenticated_client, user_factory, message_thread_factory):
        """Client users can only see their own threads."""
        client_user = user_factory(role='CLIENT')
        other_client = user_factory(role='CLIENT')
        client = authenticated_client(client_user)

        # Create threads for different clients
        message_thread_factory(client=client_user)
        message_thread_factory(client=client_user)
        message_thread_factory(client=other_client)  # Should not be visible

        url = reverse('messagethread-list')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_list_threads_unauthenticated(self, api_client):
        """Unauthenticated users cannot access threads."""
        url = reverse('messagethread-list')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_filter_threads_by_status(self, authenticated_client, user_factory, message_thread_factory):
        """Test filtering threads by status."""
        admin = user_factory(admin=True)
        client = authenticated_client(admin)

        message_thread_factory(status='active')
        message_thread_factory(status='active')
        message_thread_factory(status='resolved')

        url = reverse('messagethread-list')
        response = client.get(url, {'status': 'active'})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_filter_threads_by_priority(self, authenticated_client, user_factory, message_thread_factory):
        """Test filtering threads by priority."""
        admin = user_factory(admin=True)
        client = authenticated_client(admin)

        message_thread_factory(priority='urgent')
        message_thread_factory(priority='normal')
        message_thread_factory(priority='low')

        url = reverse('messagethread-list')
        response = client.get(url, {'priority': 'urgent'})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['priority'] == 'urgent'

    def test_filter_threads_by_assigned_admin(self, authenticated_client, user_factory, message_thread_factory):
        """Test filtering threads by assigned admin."""
        admin1 = user_factory(admin=True)
        admin2 = user_factory(admin=True)
        client = authenticated_client(admin1)

        message_thread_factory(assigned_admin=admin1)
        message_thread_factory(assigned_admin=admin2)

        url = reverse('messagethread-list')
        response = client.get(url, {'assigned_admin': str(admin1.id)})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_search_threads_by_subject(self, authenticated_client, user_factory, message_thread_factory):
        """Test searching threads by subject."""
        admin = user_factory(admin=True)
        client = authenticated_client(admin)

        message_thread_factory(subject='Payment question about invoice')
        message_thread_factory(subject='Event details inquiry')
        message_thread_factory(subject='Invoice issue')

        url = reverse('messagethread-list')
        response = client.get(url, {'search': 'invoice'})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_search_threads_by_client_name(self, authenticated_client, user_factory, message_thread_factory):
        """Test searching threads by client name."""
        admin = user_factory(admin=True)
        client_john = user_factory(first_name='John', last_name='Doe', role='CLIENT')
        client_jane = user_factory(first_name='Jane', last_name='Smith', role='CLIENT')
        client = authenticated_client(admin)

        message_thread_factory(client=client_john)
        message_thread_factory(client=client_jane)

        url = reverse('messagethread-list')
        response = client.get(url, {'search': 'John'})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1


@pytest.mark.django_db
class TestMessageThreadViewSetCreate:
    """Tests for MessageThreadViewSet create endpoint."""

    def test_admin_create_thread_for_client(self, authenticated_client, user_factory):
        """Admin can create threads for any client."""
        admin = user_factory(admin=True)
        client_user = user_factory(role='CLIENT')
        client = authenticated_client(admin)

        url = reverse('messagethread-list')
        data = {
            'client': str(client_user.id),
            'subject': 'New support thread',
            'priority': 'high',
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['subject'] == 'New support thread'
        assert response.data['priority'] == 'high'

    def test_admin_auto_assigned_on_create(self, authenticated_client, user_factory):
        """Admin creating thread is auto-assigned if not specified."""
        admin = user_factory(admin=True)
        client_user = user_factory(role='CLIENT')
        client = authenticated_client(admin)

        url = reverse('messagethread-list')
        data = {
            'client': str(client_user.id),
            'subject': 'Support thread',
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        thread = MessageThread.objects.get(client=client_user, subject='Support thread')
        assert thread.assigned_admin == admin


@pytest.mark.django_db
class TestMessageThreadViewSetRetrieve:
    """Tests for MessageThreadViewSet retrieve endpoint."""

    def test_admin_retrieve_any_thread(self, authenticated_client, user_factory, message_thread_factory):
        """Admin can retrieve any thread."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        client = authenticated_client(admin)

        url = reverse('messagethread-detail', kwargs={'pk': thread.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(thread.id)

    def test_client_retrieve_own_thread(self, authenticated_client, user_factory, message_thread_factory):
        """Client can retrieve their own thread."""
        client_user = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client_user)
        client = authenticated_client(client_user)

        url = reverse('messagethread-detail', kwargs={'pk': thread.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(thread.id)

    def test_client_cannot_retrieve_other_thread(self, authenticated_client, user_factory, message_thread_factory):
        """Client cannot retrieve another client's thread."""
        client_user = user_factory(role='CLIENT')
        other_client = user_factory(role='CLIENT')
        thread = message_thread_factory(client=other_client)
        client = authenticated_client(client_user)

        url = reverse('messagethread-detail', kwargs={'pk': thread.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestMessageThreadViewSetUpdate:
    """Tests for MessageThreadViewSet update endpoint."""

    def test_admin_update_thread(self, authenticated_client, user_factory, message_thread_factory):
        """Admin can update threads."""
        admin = user_factory(admin=True)
        thread = message_thread_factory(status='active', priority='normal')
        client = authenticated_client(admin)

        url = reverse('messagethread-detail', kwargs={'pk': thread.id})
        data = {'status': 'resolved', 'priority': 'high'}
        response = client.patch(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        thread.refresh_from_db()
        assert thread.status == 'resolved'
        assert thread.priority == 'high'

    def test_client_cannot_update_thread(self, authenticated_client, user_factory, message_thread_factory):
        """Client cannot update threads."""
        client_user = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client_user)
        client = authenticated_client(client_user)

        url = reverse('messagethread-detail', kwargs={'pk': thread.id})
        data = {'status': 'resolved'}
        response = client.patch(url, data, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestMessageThreadViewSetActions:
    """Tests for MessageThreadViewSet custom actions."""

    def test_get_messages_action(self, authenticated_client, user_factory, message_thread_factory, message_factory):
        """Test getting messages for a thread."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        message_factory(thread=thread, content='Message 1')
        message_factory(thread=thread, content='Message 2')
        client = authenticated_client(admin)

        url = reverse('messagethread-messages', kwargs={'pk': thread.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_get_messages_filters_internal_notes_for_clients(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Internal notes are filtered out for client users."""
        client_user = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        thread = message_thread_factory(client=client_user)

        message_factory(thread=thread, content='Regular message')
        message_factory(thread=thread, sender=admin, content='Internal note', is_internal_note=True)

        client = authenticated_client(client_user)
        url = reverse('messagethread-messages', kwargs={'pk': thread.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['content'] == 'Regular message'

    def test_get_messages_shows_internal_notes_for_admin(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Admin can see internal notes."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()

        message_factory(thread=thread, content='Regular message')
        message_factory(thread=thread, sender=admin, content='Internal note', is_internal_note=True)

        client = authenticated_client(admin)
        url = reverse('messagethread-messages', kwargs={'pk': thread.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_get_messages_pagination(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Test message pagination with limit parameter."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()

        for i in range(10):
            message_factory(thread=thread, content=f'Message {i}')

        client = authenticated_client(admin)
        url = reverse('messagethread-messages', kwargs={'pk': thread.id})
        response = client.get(url, {'limit': 5})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 5

    def test_mark_as_read_action(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Test marking all messages in thread as read."""
        client_user = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client_user)

        message_factory(thread=thread, content='Message 1')
        message_factory(thread=thread, content='Message 2')

        client = authenticated_client(client_user)
        url = reverse('messagethread-mark-as-read', kwargs={'pk': thread.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        assert response.data['marked_read'] == 2

    def test_assign_action_admin_only(
        self, authenticated_client, user_factory, message_thread_factory
    ):
        """Test thread assignment (admin only)."""
        admin1 = user_factory(admin=True)
        admin2 = user_factory(admin=True)
        thread = message_thread_factory()
        client = authenticated_client(admin1)

        url = reverse('messagethread-assign', kwargs={'pk': thread.id})
        response = client.patch(url, {'admin_id': str(admin2.id)}, format='json')

        assert response.status_code == status.HTTP_200_OK
        thread.refresh_from_db()
        assert thread.assigned_admin == admin2

    def test_assign_action_client_forbidden(
        self, authenticated_client, user_factory, message_thread_factory
    ):
        """Clients cannot assign threads."""
        client_user = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        thread = message_thread_factory(client=client_user)
        client = authenticated_client(client_user)

        url = reverse('messagethread-assign', kwargs={'pk': thread.id})
        response = client.patch(url, {'admin_id': str(admin.id)}, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_assign_action_unassign(self, authenticated_client, user_factory, message_thread_factory):
        """Test unassigning a thread."""
        admin = user_factory(admin=True)
        thread = message_thread_factory(assigned_admin=admin)
        client = authenticated_client(admin)

        url = reverse('messagethread-assign', kwargs={'pk': thread.id})
        response = client.patch(url, {}, format='json')  # No admin_id to unassign

        assert response.status_code == status.HTTP_200_OK
        thread.refresh_from_db()
        assert thread.assigned_admin is None

    def test_assign_action_invalid_admin(self, authenticated_client, user_factory, message_thread_factory):
        """Test assigning to non-existent admin."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        client = authenticated_client(admin)

        url = reverse('messagethread-assign', kwargs={'pk': thread.id})
        response = client.patch(url, {'admin_id': '99999'}, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND


# =============================================================================
# MESSAGE VIEWSET TESTS
# =============================================================================

@pytest.mark.django_db
class TestMessageViewSetList:
    """Tests for MessageViewSet list endpoint."""

    def test_list_messages_as_admin(self, authenticated_client, user_factory, message_factory):
        """Admin can see all messages."""
        admin = user_factory(admin=True)
        message_factory()
        message_factory()
        client = authenticated_client(admin)

        url = reverse('message-list')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_list_messages_as_client_own_threads_only(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Client can only see messages from their own threads."""
        client_user = user_factory(role='CLIENT')
        other_client = user_factory(role='CLIENT')

        own_thread = message_thread_factory(client=client_user)
        other_thread = message_thread_factory(client=other_client)

        message_factory(thread=own_thread)
        message_factory(thread=other_thread)

        client = authenticated_client(client_user)
        url = reverse('message-list')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_list_messages_filters_internal_notes_for_clients(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Client cannot see internal notes."""
        client_user = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        thread = message_thread_factory(client=client_user)

        message_factory(thread=thread)
        message_factory(thread=thread, sender=admin, is_internal_note=True)

        client = authenticated_client(client_user)
        url = reverse('message-list')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_filter_messages_by_thread(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Test filtering messages by thread ID."""
        admin = user_factory(admin=True)
        thread1 = message_thread_factory()
        thread2 = message_thread_factory()

        message_factory(thread=thread1)
        message_factory(thread=thread1)
        message_factory(thread=thread2)

        client = authenticated_client(admin)
        url = reverse('message-list')
        response = client.get(url, {'thread_id': str(thread1.id)})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2


@pytest.mark.django_db
class TestMessageViewSetCreate:
    """Tests for MessageViewSet create endpoint."""

    def test_create_message(self, authenticated_client, user_factory, message_thread_factory):
        """Test creating a new message."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        client = authenticated_client(admin)

        url = reverse('message-list')
        data = {
            'thread': str(thread.id),
            'content': 'Hello, this is a test message',
            'message_type': 'text',
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['content'] == 'Hello, this is a test message'

    def test_create_message_auto_marks_as_read_for_sender(
        self, authenticated_client, user_factory, message_thread_factory
    ):
        """Message is auto-marked as read for the sender."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        client = authenticated_client(admin)

        url = reverse('message-list')
        data = {
            'thread': str(thread.id),
            'content': 'Test message',
            'message_type': 'text',
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        message = Message.objects.get(thread=thread, content='Test message')
        assert MessageReadStatus.objects.filter(message=message, user=admin).exists()

    def test_admin_create_internal_note(self, authenticated_client, user_factory, message_thread_factory):
        """Admin can create internal notes."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        client = authenticated_client(admin)

        url = reverse('message-list')
        data = {
            'thread': str(thread.id),
            'content': 'Internal note for admins only',
            'message_type': 'text',
            'is_internal_note': True,
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['is_internal_note'] is True

    def test_client_cannot_create_internal_note(
        self, authenticated_client, user_factory, message_thread_factory
    ):
        """Client cannot create internal notes."""
        client_user = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client_user)
        client = authenticated_client(client_user)

        url = reverse('message-list')
        data = {
            'thread': str(thread.id),
            'content': 'Trying to create internal note',
            'message_type': 'text',
            'is_internal_note': True,
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMessageViewSetActions:
    """Tests for MessageViewSet custom actions."""

    def test_mark_single_message_as_read(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Test marking a single message as read."""
        client_user = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client_user)
        message = message_factory(thread=thread)
        client = authenticated_client(client_user)

        url = reverse('message-mark-as-read', kwargs={'pk': message.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'read_at' in response.data

    def test_bulk_mark_as_read(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Test bulk marking messages as read."""
        client_user = user_factory(role='CLIENT')
        thread = message_thread_factory(client=client_user)

        message1 = message_factory(thread=thread)
        message2 = message_factory(thread=thread)
        message3 = message_factory(thread=thread)

        client = authenticated_client(client_user)
        url = reverse('message-bulk-mark-as-read')
        data = {'message_ids': [str(message1.id), str(message2.id), str(message3.id)]}
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['marked_read'] == 3

    def test_bulk_mark_as_read_requires_message_ids(self, authenticated_client, user_factory):
        """Test that bulk mark as read requires message_ids."""
        admin = user_factory(admin=True)
        client = authenticated_client(admin)

        url = reverse('message-bulk-mark-as-read')
        response = client.post(url, {}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'message_ids' in response.data['error']

    def test_bulk_mark_as_read_respects_permissions(
        self, authenticated_client, user_factory, message_thread_factory, message_factory
    ):
        """Bulk mark as read only marks accessible messages."""
        client_user = user_factory(role='CLIENT')
        other_client = user_factory(role='CLIENT')

        own_thread = message_thread_factory(client=client_user)
        other_thread = message_thread_factory(client=other_client)

        own_message = message_factory(thread=own_thread)
        other_message = message_factory(thread=other_thread)

        client = authenticated_client(client_user)
        url = reverse('message-bulk-mark-as-read')
        data = {'message_ids': [str(own_message.id), str(other_message.id)]}
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['marked_read'] == 1  # Only own message marked


# =============================================================================
# MESSAGE THREAD ADMIN VIEWSET TESTS
# =============================================================================

@pytest.mark.django_db
class TestMessageThreadAdminViewSet:
    """Tests for MessageThreadAdminViewSet (admin-only operations)."""

    def test_admin_can_access(self, authenticated_client, user_factory, message_thread_factory):
        """Admin can access admin viewset."""
        admin = user_factory(admin=True)
        message_thread_factory()
        client = authenticated_client(admin)

        url = reverse('admin-messagethread-list')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_client_cannot_access(self, authenticated_client, user_factory):
        """Client cannot access admin viewset."""
        client_user = user_factory(role='CLIENT')
        client = authenticated_client(client_user)

        url = reverse('admin-messagethread-list')
        response = client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_bulk_assign(self, authenticated_client, user_factory, message_thread_factory):
        """Test bulk assigning threads to an admin."""
        admin1 = user_factory(admin=True)
        admin2 = user_factory(admin=True)

        thread1 = message_thread_factory()
        thread2 = message_thread_factory()

        client = authenticated_client(admin1)
        url = reverse('admin-messagethread-bulk-assign')
        data = {
            'thread_ids': [str(thread1.id), str(thread2.id)],
            'admin_id': str(admin2.id),
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['updated_count'] == 2

        thread1.refresh_from_db()
        thread2.refresh_from_db()
        assert thread1.assigned_admin == admin2
        assert thread2.assigned_admin == admin2

    def test_bulk_assign_unassign(self, authenticated_client, user_factory, message_thread_factory):
        """Test bulk unassigning threads."""
        admin = user_factory(admin=True)

        thread1 = message_thread_factory(assigned_admin=admin)
        thread2 = message_thread_factory(assigned_admin=admin)

        client = authenticated_client(admin)
        url = reverse('admin-messagethread-bulk-assign')
        data = {
            'thread_ids': [str(thread1.id), str(thread2.id)],
            # No admin_id to unassign
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['assigned_to'] == 'Unassigned'

    def test_bulk_assign_requires_thread_ids(self, authenticated_client, user_factory):
        """Test that bulk assign requires thread_ids."""
        admin = user_factory(admin=True)
        client = authenticated_client(admin)

        url = reverse('admin-messagethread-bulk-assign')
        data = {'admin_id': str(admin.id)}
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_assign_invalid_admin(self, authenticated_client, user_factory, message_thread_factory):
        """Test bulk assign with invalid admin ID."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        client = authenticated_client(admin)

        url = reverse('admin-messagethread-bulk-assign')
        data = {
            'thread_ids': [str(thread.id)],
            'admin_id': '99999',
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_bulk_update_status(self, authenticated_client, user_factory, message_thread_factory):
        """Test bulk updating thread status."""
        admin = user_factory(admin=True)

        thread1 = message_thread_factory(status='active')
        thread2 = message_thread_factory(status='active')

        client = authenticated_client(admin)
        url = reverse('admin-messagethread-bulk-update-status')
        data = {
            'thread_ids': [str(thread1.id), str(thread2.id)],
            'status': 'resolved',
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['updated_count'] == 2

        thread1.refresh_from_db()
        thread2.refresh_from_db()
        assert thread1.status == 'resolved'
        assert thread2.status == 'resolved'

    def test_bulk_update_status_invalid_status(self, authenticated_client, user_factory, message_thread_factory):
        """Test bulk update with invalid status."""
        admin = user_factory(admin=True)
        thread = message_thread_factory()
        client = authenticated_client(admin)

        url = reverse('admin-messagethread-bulk-update-status')
        data = {
            'thread_ids': [str(thread.id)],
            'status': 'invalid_status',
        }
        response = client.post(url, data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_update_status_requires_fields(self, authenticated_client, user_factory):
        """Test that bulk update requires both thread_ids and status."""
        admin = user_factory(admin=True)
        client = authenticated_client(admin)

        url = reverse('admin-messagethread-bulk-update-status')
        response = client.post(url, {}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_stats_endpoint(self, authenticated_client, user_factory, message_thread_factory, message_factory):
        """Test messaging statistics endpoint."""
        admin = user_factory(admin=True)

        # Create some threads with different statuses
        message_thread_factory(status='active')
        message_thread_factory(status='active')
        message_thread_factory(status='resolved')
        message_thread_factory(priority='urgent')
        message_thread_factory(assigned_admin=None)  # Unassigned

        # Create some messages
        thread = message_thread_factory()
        message_factory(thread=thread)
        message_factory(thread=thread)

        client = authenticated_client(admin)
        url = reverse('admin-messagethread-stats')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'total_threads' in response.data
        assert 'active_threads' in response.data
        assert 'unassigned_threads' in response.data
        assert 'urgent_threads' in response.data
        assert 'total_messages' in response.data
        assert 'status_breakdown' in response.data
        assert 'priority_breakdown' in response.data


# =============================================================================
# PERMISSION EDGE CASES
# =============================================================================

@pytest.mark.django_db
class TestPermissionEdgeCases:
    """Test edge cases for permissions."""

    def test_superuser_has_full_access(
        self, authenticated_client, user_factory, message_thread_factory
    ):
        """Superuser has full access to all threads."""
        superuser = user_factory(superuser=True)
        thread = message_thread_factory()
        client = authenticated_client(superuser)

        url = reverse('messagethread-detail', kwargs={'pk': thread.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_client_mark_as_read_forbidden_on_other_thread(
        self, authenticated_client, user_factory, message_thread_factory
    ):
        """Client cannot mark messages as read in another client's thread."""
        client_user = user_factory(role='CLIENT')
        other_client = user_factory(role='CLIENT')
        thread = message_thread_factory(client=other_client)
        client = authenticated_client(client_user)

        url = reverse('messagethread-mark-as-read', kwargs={'pk': thread.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
