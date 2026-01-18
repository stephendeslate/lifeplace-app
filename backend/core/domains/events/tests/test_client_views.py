"""
Unit tests for events domain client-facing API views.

Tests:
- ClientEventViewSet (list, retrieve, timeline, documents, tasks, feedback, etc.)
- Client permissions and access control
- Rebooking functionality
- Self check-in functionality
"""

import pytest
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from core.domains.events.models import (
    Event,
    EventTask,
    EventTimeline,
    EventFile,
    EventFeedback,
)


@pytest.fixture
def api_client():
    """Return a DRF API client instance."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user_factory):
    """Return a factory for creating authenticated client users."""
    from rest_framework_simplejwt.tokens import RefreshToken

    def _get_client(user=None):
        if user is None:
            user = user_factory(role='CLIENT')
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        api_client.user = user
        return api_client

    return _get_client


@pytest.fixture
def client_with_events(user_factory, event_factory):
    """Create a client user with events."""
    client_user = user_factory(role='CLIENT')

    # Create events for this client
    event1 = event_factory(client=client_user, name='Event 1', confirmed=True)
    event2 = event_factory(client=client_user, name='Event 2', status='LEAD')
    event3 = event_factory(
        client=client_user,
        name='Past Event',
        completed=True,
    )

    return {
        'user': client_user,
        'events': [event1, event2, event3],
    }


# =============================================================================
# ClientEventViewSet Tests
# =============================================================================


@pytest.mark.django_db
class TestClientEventList:
    """Tests for client event listing."""

    def test_list_requires_auth(self, api_client):
        """Test that listing events requires authentication."""
        response = api_client.get('/api/client/events/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_returns_own_events_only(
        self, authenticated_client, event_factory, user_factory
    ):
        """Test client only sees their own events."""
        # Create events for different clients
        client_user = user_factory(role='CLIENT')
        other_client = user_factory(role='CLIENT')

        event_factory(client=client_user, name='My Event')
        event_factory(client=other_client, name='Other Event')

        api = authenticated_client(client_user)
        response = api.get('/api/client/events/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == 'My Event'

    def test_list_filter_by_status(
        self, authenticated_client, client_with_events
    ):
        """Test filtering events by status."""
        api = authenticated_client(client_with_events['user'])

        response = api.get('/api/client/events/', {'status': 'CONFIRMED'})

        assert response.status_code == status.HTTP_200_OK
        for event in response.data['results']:
            assert event['status'] == 'CONFIRMED'

    def test_list_filter_upcoming_only(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test filtering for upcoming events only."""
        client_user = user_factory(role='CLIENT')

        # Create past and future events
        event_factory(
            client=client_user,
            start_date=timezone.now() + timedelta(days=10),
            confirmed=True,
        )
        event_factory(
            client=client_user,
            start_date=timezone.now() - timedelta(days=10),
            completed=True,
        )

        api = authenticated_client(client_user)
        response = api.get('/api/client/events/', {'upcoming_only': 'true'})

        assert response.status_code == status.HTTP_200_OK
        # Only upcoming event should be returned
        for event in response.data['results']:
            assert event['status'] != 'COMPLETED'


@pytest.mark.django_db
class TestClientEventRetrieve:
    """Tests for client event retrieval."""

    def test_retrieve_own_event(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can retrieve their own event."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user, name='My Event')

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'My Event'

    def test_cannot_retrieve_other_client_event(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client cannot retrieve another client's event."""
        client_user = user_factory(role='CLIENT')
        other_client = user_factory(role='CLIENT')
        event = event_factory(client=other_client, name='Other Event')

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_returns_detail_serializer(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test retrieve returns detailed event data."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user, confirmed=True)

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/')

        assert response.status_code == status.HTTP_200_OK
        # Detail serializer includes extra fields
        assert 'upcoming_tasks' in response.data
        assert 'recent_updates' in response.data


@pytest.mark.django_db
class TestClientEventTimeline:
    """Tests for client event timeline."""

    def test_timeline_returns_public_entries_only(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test timeline returns only public entries."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        # Create public and private timeline entries
        EventTimeline.objects.create(
            event=event,
            action_type='STATUS_CHANGE',
            description='Public update',
            is_public=True,
        )
        EventTimeline.objects.create(
            event=event,
            action_type='NOTE_ADDED',
            description='Internal note',
            is_public=False,
        )

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/timeline/')

        assert response.status_code == status.HTTP_200_OK
        # Only public entry should be returned
        descriptions = [e['description'] for e in response.data]
        assert 'Public update' in descriptions
        assert 'Internal note' not in descriptions


@pytest.mark.django_db
class TestClientEventDocuments:
    """Tests for client event documents."""

    def test_documents_returns_public_files_only(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test documents returns only public files."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        test_file = SimpleUploadedFile(
            "test.pdf", b"content", content_type="application/pdf"
        )

        # Create public and private files
        EventFile.objects.create(
            event=event,
            category='CONTRACT',
            file=test_file,
            name='Public Doc',
            mime_type='application/pdf',
            size=100,
            is_public=True,
        )
        EventFile.objects.create(
            event=event,
            category='OTHER',
            file=test_file,
            name='Private Doc',
            mime_type='application/pdf',
            size=100,
            is_public=False,
        )

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/documents/')

        assert response.status_code == status.HTTP_200_OK
        # Only public file should be returned
        names = [f['name'] for f in response.data]
        assert 'Public Doc' in names
        assert 'Private Doc' not in names


@pytest.mark.django_db
class TestClientEventTasks:
    """Tests for client event tasks."""

    def test_tasks_returns_visible_tasks_only(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test tasks returns only client-visible tasks."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        # Create visible and hidden tasks
        EventTask.objects.create(
            event=event,
            title='Visible Task',
            due_date=timezone.now() + timedelta(days=3),
            priority='HIGH',
            status='PENDING',
            is_visible_to_client=True,
        )
        EventTask.objects.create(
            event=event,
            title='Hidden Task',
            due_date=timezone.now() + timedelta(days=3),
            priority='HIGH',
            status='PENDING',
            is_visible_to_client=False,
        )

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/tasks/')

        assert response.status_code == status.HTTP_200_OK
        titles = [t['title'] for t in response.data]
        assert 'Visible Task' in titles
        assert 'Hidden Task' not in titles

    def test_update_task_requires_client_input(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can only update tasks requiring client input."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        # Task that requires client input
        task = EventTask.objects.create(
            event=event,
            title='Client Task',
            due_date=timezone.now() + timedelta(days=3),
            priority='HIGH',
            status='PENDING',
            is_visible_to_client=True,
            requires_client_input=True,
        )

        api = authenticated_client(client_user)
        response = api.patch(
            f'/api/client/events/{event.id}/tasks/{task.id}/',
            {'status': 'COMPLETED', 'completion_notes': 'Done'}
        )

        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.status == 'COMPLETED'

    def test_cannot_update_task_not_requiring_input(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client cannot update tasks not requiring input."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        # Task that doesn't require client input
        task = EventTask.objects.create(
            event=event,
            title='Admin Task',
            due_date=timezone.now() + timedelta(days=3),
            priority='HIGH',
            status='PENDING',
            is_visible_to_client=True,
            requires_client_input=False,
        )

        api = authenticated_client(client_user)
        response = api.patch(
            f'/api/client/events/{event.id}/tasks/{task.id}/',
            {'status': 'COMPLETED'}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestClientEventPreferences:
    """Tests for client event preferences."""

    def test_update_preferences(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can update event preferences."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        api = authenticated_client(client_user)
        response = api.patch(
            f'/api/client/events/{event.id}/update_preferences/',
            {
                'preferences': {
                    'theme': 'elegant',
                    'special_requests': ['vegetarian menu'],
                }
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
@pytest.mark.skip(reason="Requires python-magic module not installed")
class TestClientEventFileUpload:
    """Tests for client file uploads."""

    def test_upload_file(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can upload files."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        test_file = SimpleUploadedFile(
            "document.pdf",
            b"file content",
            content_type="application/pdf"
        )

        api = authenticated_client(client_user)
        response = api.post(
            f'/api/client/events/{event.id}/upload_file/',
            {
                'name': 'My Document',
                'category': 'REQUIREMENTS',
                'file': test_file,
            },
            format='multipart',
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'My Document'
        assert EventFile.objects.filter(event=event, name='My Document').exists()


@pytest.mark.django_db
class TestClientEventFeedback:
    """Tests for client event feedback."""

    def test_submit_feedback_completed_event(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can submit feedback for completed event."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user, completed=True)

        api = authenticated_client(client_user)
        response = api.post(
            f'/api/client/events/{event.id}/feedback/',
            {
                'overall_rating': 5,
                'comments': 'Excellent service!',
                'testimonial': 'Highly recommend!',
            },
            format='json',
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['overall_rating'] == 5

    def test_cannot_submit_feedback_non_completed(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test cannot submit feedback for non-completed event."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user, confirmed=True)

        api = authenticated_client(client_user)
        response = api.post(
            f'/api/client/events/{event.id}/feedback/',
            {'overall_rating': 5},
            format='json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_submit_duplicate_feedback(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test cannot submit feedback twice."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user, completed=True)

        # Create existing feedback
        EventFeedback.objects.create(
            event=event,
            submitted_by=client_user,
            overall_rating=4,
        )

        api = authenticated_client(client_user)
        response = api.post(
            f'/api/client/events/{event.id}/feedback/',
            {'overall_rating': 5},
            format='json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_existing_feedback(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can retrieve their feedback."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user, completed=True)

        feedback = EventFeedback.objects.create(
            event=event,
            submitted_by=client_user,
            overall_rating=5,
            comments='Great!',
        )

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/feedback/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['overall_rating'] == 5

    def test_update_feedback_without_response(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can update feedback before admin responds."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user, completed=True)

        feedback = EventFeedback.objects.create(
            event=event,
            submitted_by=client_user,
            overall_rating=4,
        )

        api = authenticated_client(client_user)
        response = api.patch(
            f'/api/client/events/{event.id}/feedback/{feedback.id}/',
            {'overall_rating': 5},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        feedback.refresh_from_db()
        assert feedback.overall_rating == 5

    def test_cannot_update_feedback_with_response(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test cannot update feedback after admin response."""
        client_user = user_factory(role='CLIENT')
        admin = user_factory(admin=True)
        event = event_factory(client=client_user, completed=True)

        feedback = EventFeedback.objects.create(
            event=event,
            submitted_by=client_user,
            overall_rating=4,
            response='Thank you!',
            response_by=admin,
        )

        api = authenticated_client(client_user)
        response = api.patch(
            f'/api/client/events/{event.id}/feedback/{feedback.id}/',
            {'overall_rating': 5},
            format='json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestClientEventRebooking:
    """Tests for client event rebooking functionality."""

    def test_rebookable_events_list(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test listing rebookable events."""
        client_user = user_factory(role='CLIENT')

        # Create a rebookable cancelled event
        event_factory(
            client=client_user,
            cancelled=True,
            can_rebook=True,
        )

        api = authenticated_client(client_user)
        response = api.get('/api/client/events/rebookable/')

        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data

    def test_rebook_info(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test getting rebook info for an event."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(
            client=client_user,
            cancelled=True,
            can_rebook=True,
        )

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/rebook_info/')

        assert response.status_code == status.HTTP_200_OK
        assert 'can_rebook' in response.data

    def test_rebook_event(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test rebooking an event."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(
            client=client_user,
            cancelled=True,
            can_rebook=True,
        )

        api = authenticated_client(client_user)

        with patch(
            'core.domains.events.services.rebook_service.EventRebookService.can_rebook'
        ) as mock_can:
            mock_can.return_value = (True, None)

            with patch(
                'core.domains.events.services.rebook_service.EventRebookService.create_rebook_session'
            ) as mock_create:
                mock_session = MagicMock()
                mock_session.session_id = 'test-session-123'
                mock_session.booking_flow_id = 1
                mock_create.return_value = mock_session

                response = api.post(f'/api/client/events/{event.id}/rebook/')

                assert response.status_code == status.HTTP_201_CREATED
                assert 'session_id' in response.data

    def test_rebook_not_allowed(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test rebooking fails when not allowed."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(
            client=client_user,
            cancelled=True,
            can_rebook=False,
        )

        api = authenticated_client(client_user)

        with patch(
            'core.domains.events.services.rebook_service.EventRebookService.can_rebook'
        ) as mock_can:
            mock_can.return_value = (False, 'Event cannot be rebooked')

            response = api.post(f'/api/client/events/{event.id}/rebook/')

            assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestClientSelfCheckIn:
    """Tests for client self check-in functionality."""

    def test_self_check_in_success(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test successful self check-in."""
        client_user = user_factory(role='CLIENT')

        # Create event for today
        today = timezone.now().replace(hour=14, minute=0, second=0)
        event = event_factory(
            client=client_user,
            confirmed=True,
            start_date=today,
        )
        event.check_in_status = 'PENDING'
        event.scheduled_check_in_time = today
        event.save()

        api = authenticated_client(client_user)

        with patch(
            'core.domains.events.services.CheckInService.check_in'
        ) as mock_check_in:
            mock_check_in.return_value = {'success': True}

            response = api.post(f'/api/client/events/{event.id}/self_check_in/')

            assert response.status_code == status.HTTP_200_OK
            mock_check_in.assert_called_once()

    def test_self_check_in_not_confirmed(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test self check-in fails for non-confirmed event."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user, status='LEAD')

        api = authenticated_client(client_user)
        response = api.post(f'/api/client/events/{event.id}/self_check_in/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_self_check_in_already_checked_in(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test self check-in fails if already checked in."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(
            client=client_user,
            confirmed=True,
        )
        event.check_in_status = 'CHECKED_IN'
        event.save()

        api = authenticated_client(client_user)
        response = api.post(f'/api/client/events/{event.id}/self_check_in/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_self_check_in_wrong_day(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test self check-in fails on wrong day."""
        client_user = user_factory(role='CLIENT')

        # Event for tomorrow
        tomorrow = timezone.now() + timedelta(days=1)
        event = event_factory(
            client=client_user,
            confirmed=True,
            start_date=tomorrow,
        )
        event.check_in_status = 'PENDING'
        event.save()

        api = authenticated_client(client_user)
        response = api.post(f'/api/client/events/{event.id}/self_check_in/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestClientNotes:
    """Tests for client notes functionality."""

    def test_get_notes_returns_client_visible(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test getting notes returns only client-visible notes."""
        from core.domains.notes.models import Note
        from django.contrib.contenttypes.models import ContentType

        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        event_ct = ContentType.objects.get_for_model(Event)

        # Create visible and hidden notes
        Note.objects.create(
            content_type=event_ct,
            object_id=event.id,
            title='Visible Note',
            content='Client can see this',
            is_client_visible=True,
            created_by=client_user,
        )
        Note.objects.create(
            content_type=event_ct,
            object_id=event.id,
            title='Hidden Note',
            content='Internal only',
            is_client_visible=False,
            created_by=client_user,
        )

        api = authenticated_client(client_user)
        response = api.get(f'/api/client/events/{event.id}/notes/')

        assert response.status_code == status.HTTP_200_OK
        titles = [n['title'] for n in response.data]
        assert 'Visible Note' in titles
        assert 'Hidden Note' not in titles

    def test_create_note(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can create a note."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        api = authenticated_client(client_user)
        response = api.post(
            f'/api/client/events/{event.id}/notes/',
            {
                'title': 'My Note',
                'content': 'Note content here',
            },
            format='json',
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'My Note'

    def test_create_note_requires_content(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test creating note requires content."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        api = authenticated_client(client_user)
        response = api.post(
            f'/api/client/events/{event.id}/notes/',
            {'title': 'Empty Note'},
            format='json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestClientDocumentDownload:
    """Tests for client document download."""

    def test_download_public_document(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client can download public documents."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        test_file = SimpleUploadedFile(
            "test.pdf",
            b"file content",
            content_type="application/pdf"
        )

        event_file = EventFile.objects.create(
            event=event,
            category='CONTRACT',
            file=test_file,
            name='Contract',
            mime_type='application/pdf',
            size=100,
            is_public=True,
        )

        api = authenticated_client(client_user)
        response = api.get(
            f'/api/client/events/{event.id}/documents/{event_file.id}/download/'
        )

        assert response.status_code == status.HTTP_200_OK

    def test_cannot_download_private_document(
        self, authenticated_client, user_factory, event_factory
    ):
        """Test client cannot download private documents."""
        client_user = user_factory(role='CLIENT')
        event = event_factory(client=client_user)

        test_file = SimpleUploadedFile(
            "test.pdf",
            b"file content",
            content_type="application/pdf"
        )

        event_file = EventFile.objects.create(
            event=event,
            category='OTHER',
            file=test_file,
            name='Private Doc',
            mime_type='application/pdf',
            size=100,
            is_public=False,
        )

        api = authenticated_client(client_user)
        response = api.get(
            f'/api/client/events/{event.id}/documents/{event_file.id}/download/'
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
