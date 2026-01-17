"""
Unit tests for security domain views.

Tests:
- SecurityBreachViewSet CRUD operations
- SecurityBreachViewSet custom actions (notify_npc, notify_users, assess_impact, timeline, summary)
- Permission checks (admin-only access)
- Query parameter filtering
"""

import pytest
from django.utils import timezone
from django.urls import reverse
from datetime import timedelta
from rest_framework import status
from unittest.mock import patch, MagicMock

from core.domains.security.models import (
    SecurityBreach,
    BreachNotification,
    AffectedUser,
)


@pytest.mark.django_db
class TestSecurityBreachViewSetPermissions:
    """Test permission checks for SecurityBreachViewSet."""

    def test_list_requires_authentication(self, api_client):
        """Test that unauthenticated users cannot list breaches."""
        response = api_client.get('/api/security/breaches/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_requires_admin(self, client_user_client):
        """Test that non-admin users cannot list breaches."""
        response = client_user_client.get('/api/security/breaches/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_allowed_for_admin(self, admin_client):
        """Test that admin users can list breaches."""
        response = admin_client.get('/api/security/breaches/')
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_requires_authentication(self, api_client):
        """Test that unauthenticated users cannot retrieve breaches."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-001',
            title='Test',
            description='Test',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        response = api_client.get(f'/api/security/breaches/{breach.id}/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_requires_admin(self, client_user_client):
        """Test that non-admin users cannot retrieve breaches."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-002',
            title='Test',
            description='Test',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        response = client_user_client.get(f'/api/security/breaches/{breach.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_requires_admin(self, client_user_client, mocker):
        """Test that non-admin users cannot create breaches."""
        mocker.patch(
            'core.domains.security.services.BreachNotificationService._send_internal_alert'
        )
        data = {
            'title': 'New Breach',
            'description': 'Description',
            'breach_type': 'DATA_LEAK',
            'severity': 'HIGH',
            'detected_at': timezone.now().isoformat(),
        }
        response = client_user_client.post('/api/security/breaches/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_requires_admin(self, client_user_client):
        """Test that non-admin users cannot update breaches."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-003',
            title='Test',
            description='Test',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        response = client_user_client.patch(
            f'/api/security/breaches/{breach.id}/',
            {'title': 'Updated'}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_requires_admin(self, client_user_client):
        """Test that non-admin users cannot delete breaches."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-004',
            title='Test',
            description='Test',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        response = client_user_client.delete(f'/api/security/breaches/{breach.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSecurityBreachViewSetList:
    """Test SecurityBreachViewSet list action."""

    def test_list_returns_breaches(self, admin_client):
        """Test list returns all breaches."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-010',
            title='Breach 1',
            description='Desc 1',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-011',
            title='Breach 2',
            description='Desc 2',
            breach_type='PHISHING',
            severity='MEDIUM',
            detected_at=timezone.now(),
        )

        response = admin_client.get('/api/security/breaches/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_list_filter_by_status(self, admin_client):
        """Test list filters by status query parameter."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-020',
            title='Detected Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='DETECTED',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-021',
            title='Resolved Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='RESOLVED',
        )

        response = admin_client.get('/api/security/breaches/?status=DETECTED')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == 'DETECTED'

    def test_list_filter_by_severity(self, admin_client):
        """Test list filters by severity query parameter."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-030',
            title='Critical Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='CRITICAL',
            detected_at=timezone.now(),
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-031',
            title='Low Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='LOW',
            detected_at=timezone.now(),
        )

        response = admin_client.get('/api/security/breaches/?severity=CRITICAL')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['severity'] == 'CRITICAL'

    def test_list_filter_active_only(self, admin_client):
        """Test list filters active breaches only."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-040',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='INVESTIGATING',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-041',
            title='Resolved Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='RESOLVED',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-042',
            title='False Positive',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='FALSE_POSITIVE',
        )

        response = admin_client.get('/api/security/breaches/?active=true')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['breach_id'] == 'BREACH-2025-040'

    def test_list_ordered_by_detected_at_desc(self, admin_client):
        """Test list is ordered by detected_at descending."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-050',
            title='Older Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(days=2),
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-051',
            title='Newer Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.get('/api/security/breaches/')
        assert response.status_code == status.HTTP_200_OK
        # Newer should be first
        assert response.data['results'][0]['breach_id'] == 'BREACH-2025-051'


@pytest.mark.django_db
class TestSecurityBreachViewSetCreate:
    """Test SecurityBreachViewSet create action."""

    def test_create_breach(self, admin_client, mocker):
        """Test creating a new breach."""
        mocker.patch(
            'core.domains.security.services.BreachNotificationService._send_internal_alert'
        )

        data = {
            'title': 'New Security Breach',
            'description': 'A security incident was detected',
            'breach_type': 'UNAUTHORIZED_ACCESS',
            'severity': 'HIGH',
            'detected_at': timezone.now().isoformat(),
        }

        response = admin_client.post('/api/security/breaches/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'New Security Breach'
        assert response.data['breach_type'] == 'UNAUTHORIZED_ACCESS'
        assert SecurityBreach.objects.filter(title='New Security Breach').exists()

    def test_create_breach_validates_required_fields(self, admin_client, mocker):
        """Test that required fields are validated."""
        mocker.patch(
            'core.domains.security.services.BreachNotificationService._send_internal_alert'
        )

        data = {
            'title': 'Missing Fields',
        }

        response = admin_client.post('/api/security/breaches/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestSecurityBreachViewSetRetrieve:
    """Test SecurityBreachViewSet retrieve action."""

    def test_retrieve_breach(self, admin_client):
        """Test retrieving a single breach."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-100',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.get(f'/api/security/breaches/{breach.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['breach_id'] == 'BREACH-2025-100'
        assert response.data['title'] == 'Test Breach'

    def test_retrieve_includes_computed_fields(self, admin_client):
        """Test retrieve includes computed fields."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-101',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=100),
        )

        response = admin_client.get(f'/api/security/breaches/{breach.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'hours_since_detection' in response.data
        assert 'is_overdue' in response.data
        assert 'requires_notification' in response.data


@pytest.mark.django_db
class TestSecurityBreachViewSetUpdate:
    """Test SecurityBreachViewSet update action."""

    def test_update_breach(self, admin_client):
        """Test updating a breach."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-110',
            title='Original Title',
            description='Original description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.patch(
            f'/api/security/breaches/{breach.id}/',
            {'title': 'Updated Title', 'status': 'INVESTIGATING'},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK

        breach.refresh_from_db()
        assert breach.title == 'Updated Title'
        assert breach.status == 'INVESTIGATING'

    def test_partial_update_breach(self, admin_client):
        """Test partial update of a breach."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-111',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.patch(
            f'/api/security/breaches/{breach.id}/',
            {'containment_actions': 'Disabled affected accounts'},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK

        breach.refresh_from_db()
        assert breach.containment_actions == 'Disabled affected accounts'


@pytest.mark.django_db
class TestSecurityBreachViewSetNotifyNPC:
    """Test SecurityBreachViewSet notify_npc action."""

    def test_notify_npc_success(self, admin_client, settings, mocker):
        """Test successful NPC notification."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        mock_service = mocker.patch(
            'core.domains.security.views.BreachNotificationService.notify_npc'
        )

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-200',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            npc_notified=False,
        )

        # After service call, breach should be updated
        def side_effect(b):
            b.npc_notified = True
            b.npc_notified_at = timezone.now()
            b.save()

        mock_service.side_effect = side_effect

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-npc/',
            {'confirm': True},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        mock_service.assert_called_once_with(breach)

    def test_notify_npc_requires_confirmation(self, admin_client):
        """Test NPC notification requires confirmation."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-201',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-npc/',
            {'confirm': False},
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Confirmation required' in response.data['error']

    def test_notify_npc_already_notified(self, admin_client):
        """Test NPC notification fails if already notified."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-202',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            npc_notified=True,
            npc_notified_at=timezone.now(),
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-npc/',
            {'confirm': True},
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already been notified' in response.data['error']

    def test_notify_npc_handles_service_error(self, admin_client, mocker):
        """Test NPC notification handles service errors."""
        mock_service = mocker.patch(
            'core.domains.security.views.BreachNotificationService.notify_npc',
            side_effect=Exception('Service error')
        )

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-203',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            npc_notified=False,
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-npc/',
            {'confirm': True},
            format='json'
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert 'Service error' in response.data['error']


@pytest.mark.django_db
class TestSecurityBreachViewSetNotifyUsers:
    """Test SecurityBreachViewSet notify_users action."""

    def test_notify_users_success(self, admin_client, user_factory, mocker):
        """Test successful user notification."""
        mock_service = mocker.patch(
            'core.domains.security.views.BreachNotificationService.notify_affected_users'
        )

        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-300',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        AffectedUser.objects.create(
            breach=breach,
            user=user,
            data_exposed=['email'],
            notified=False
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-users/',
            {'confirm': True},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        assert response.data['users_notified'] == 1
        mock_service.assert_called_once_with(breach)

    def test_notify_users_requires_confirmation(self, admin_client, user_factory):
        """Test user notification requires confirmation."""
        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-301',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        AffectedUser.objects.create(
            breach=breach,
            user=user,
            data_exposed=['email'],
            notified=False
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-users/',
            {'confirm': False},
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Confirmation required' in response.data['error']

    def test_notify_users_no_pending_users(self, admin_client):
        """Test user notification fails if no users pending."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-302',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-users/',
            {'confirm': True},
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'No users pending notification' in response.data['error']

    def test_notify_users_skips_already_notified(self, admin_client, user_factory, mocker):
        """Test user notification counts only pending users."""
        mock_service = mocker.patch(
            'core.domains.security.views.BreachNotificationService.notify_affected_users'
        )

        user1 = user_factory()
        user2 = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-303',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        # Already notified
        AffectedUser.objects.create(
            breach=breach,
            user=user1,
            data_exposed=['email'],
            notified=True,
            notified_at=timezone.now()
        )
        # Pending notification
        AffectedUser.objects.create(
            breach=breach,
            user=user2,
            data_exposed=['email'],
            notified=False
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-users/',
            {'confirm': True},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['users_notified'] == 1  # Only the pending one

    def test_notify_users_handles_service_error(self, admin_client, user_factory, mocker):
        """Test user notification handles service errors."""
        mock_service = mocker.patch(
            'core.domains.security.views.BreachNotificationService.notify_affected_users',
            side_effect=Exception('Email service down')
        )

        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-304',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        AffectedUser.objects.create(
            breach=breach,
            user=user,
            data_exposed=['email'],
            notified=False
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/notify-users/',
            {'confirm': True},
            format='json'
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert 'Email service down' in response.data['error']


@pytest.mark.django_db
class TestSecurityBreachViewSetAssessImpact:
    """Test SecurityBreachViewSet assess_impact action."""

    def test_assess_impact_success(self, admin_client, user_factory, mocker):
        """Test successful impact assessment."""
        mock_service = mocker.patch(
            'core.domains.security.views.BreachNotificationService.assess_impact'
        )

        user1 = user_factory()
        user2 = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-400',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        # Mock service to update breach
        def side_effect(b, user_ids, data_types):
            b.affected_users_count = len(user_ids)
            b.involves_spi = 'health' in data_types
            b.save()
            return b

        mock_service.side_effect = side_effect

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/assess-impact/',
            {
                'user_ids': [user1.id, user2.id],
                'data_types': ['email', 'phone']
            },
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        assert response.data['affected_users_count'] == 2
        mock_service.assert_called_once()

    def test_assess_impact_requires_user_ids(self, admin_client):
        """Test impact assessment requires user_ids."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-401',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/assess-impact/',
            {'data_types': ['email']},
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'user_ids is required' in response.data['error']

    def test_assess_impact_empty_user_ids(self, admin_client):
        """Test impact assessment fails with empty user_ids."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-402',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/assess-impact/',
            {'user_ids': [], 'data_types': ['email']},
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'user_ids is required' in response.data['error']

    def test_assess_impact_handles_service_error(self, admin_client, user_factory, mocker):
        """Test impact assessment handles service errors."""
        mock_service = mocker.patch(
            'core.domains.security.views.BreachNotificationService.assess_impact',
            side_effect=Exception('Database error')
        )

        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-403',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.post(
            f'/api/security/breaches/{breach.id}/assess-impact/',
            {'user_ids': [user.id], 'data_types': ['email']},
            format='json'
        )
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert 'Database error' in response.data['error']


@pytest.mark.django_db
class TestSecurityBreachViewSetTimeline:
    """Test SecurityBreachViewSet timeline action."""

    def test_timeline_returns_events(self, admin_client):
        """Test timeline returns breach events."""
        detected_at = timezone.now() - timedelta(hours=48)
        confirmed_at = timezone.now() - timedelta(hours=36)

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-500',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=detected_at,
            confirmed_at=confirmed_at,
        )

        response = admin_client.get(f'/api/security/breaches/{breach.id}/timeline/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['breach_id'] == 'BREACH-2025-500'
        assert len(response.data['timeline']) == 2

        events = [e['event'] for e in response.data['timeline']]
        assert 'Breach Detected' in events
        assert 'Breach Confirmed' in events

    def test_timeline_includes_notification_events(self, admin_client):
        """Test timeline includes notification events."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-501',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
        )
        BreachNotification.objects.create(
            breach=breach,
            notification_type='NPC_INITIAL',
            recipient='npc@gov.ph',
            content='NPC notification content',
            delivery_status='SENT'
        )

        response = admin_client.get(f'/api/security/breaches/{breach.id}/timeline/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['timeline']) == 2  # Detected + notification

    def test_timeline_sorted_by_timestamp(self, admin_client):
        """Test timeline events are sorted by timestamp."""
        detected_at = timezone.now() - timedelta(hours=48)
        confirmed_at = timezone.now() - timedelta(hours=36)
        contained_at = timezone.now() - timedelta(hours=24)
        resolved_at = timezone.now() - timedelta(hours=12)

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-502',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=detected_at,
            confirmed_at=confirmed_at,
            contained_at=contained_at,
            resolved_at=resolved_at,
            status='RESOLVED',
        )

        response = admin_client.get(f'/api/security/breaches/{breach.id}/timeline/')
        assert response.status_code == status.HTTP_200_OK

        timeline = response.data['timeline']
        timestamps = [e['timestamp'] for e in timeline]
        assert timestamps == sorted(timestamps)

    def test_timeline_includes_overdue_status(self, admin_client):
        """Test timeline includes overdue notification status."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-503',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=100),
            npc_notified=False,
        )

        response = admin_client.get(f'/api/security/breaches/{breach.id}/timeline/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_overdue'] is True
        assert response.data['notification_deadline_hours'] == 72

    def test_timeline_hours_elapsed_calculation(self, admin_client):
        """Test timeline calculates hours elapsed correctly."""
        detected_at = timezone.now() - timedelta(hours=24)
        confirmed_at = timezone.now() - timedelta(hours=12)

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-504',
            title='Test Breach',
            description='Test description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=detected_at,
            confirmed_at=confirmed_at,
        )

        response = admin_client.get(f'/api/security/breaches/{breach.id}/timeline/')
        assert response.status_code == status.HTTP_200_OK

        detected_event = next(
            e for e in response.data['timeline'] if e['event'] == 'Breach Detected'
        )
        confirmed_event = next(
            e for e in response.data['timeline'] if e['event'] == 'Breach Confirmed'
        )

        assert detected_event['hours_elapsed'] == 0
        # Confirmed was 12 hours after detection (24 - 12 = 12)
        assert 11 <= confirmed_event['hours_elapsed'] <= 13


@pytest.mark.django_db
class TestSecurityBreachViewSetSummary:
    """Test SecurityBreachViewSet summary action."""

    def test_summary_returns_totals(self, admin_client):
        """Test summary returns breach totals."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-600',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='INVESTIGATING',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-601',
            title='Resolved Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='MEDIUM',
            detected_at=timezone.now(),
            status='RESOLVED',
        )

        response = admin_client.get('/api/security/breaches/summary/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_breaches'] == 2
        assert response.data['active_breaches'] == 1

    def test_summary_counts_overdue(self, admin_client):
        """Test summary counts overdue notifications."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-610',
            title='Overdue Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=100),
            status='INVESTIGATING',
            npc_notified=False,
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-611',
            title='Within Deadline',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
            npc_notified=False,
        )

        response = admin_client.get('/api/security/breaches/summary/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['overdue_notifications'] == 1

    def test_summary_by_severity(self, admin_client):
        """Test summary groups by severity."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-620',
            title='Critical Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='CRITICAL',
            detected_at=timezone.now(),
            status='INVESTIGATING',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-621',
            title='High Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='INVESTIGATING',
        )

        response = admin_client.get('/api/security/breaches/summary/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['by_severity']['CRITICAL'] == 1
        assert response.data['by_severity']['HIGH'] == 1
        assert response.data['by_severity']['MEDIUM'] == 0

    def test_summary_by_status(self, admin_client):
        """Test summary groups by status."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-630',
            title='Detected Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='DETECTED',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-631',
            title='Investigating Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='INVESTIGATING',
        )

        response = admin_client.get('/api/security/breaches/summary/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['by_status']['DETECTED'] == 1
        assert response.data['by_status']['INVESTIGATING'] == 1
        assert response.data['by_status']['RESOLVED'] == 0

    def test_summary_excludes_resolved_from_severity_counts(self, admin_client):
        """Test summary excludes resolved/false positive from severity counts."""
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-640',
            title='Active Critical',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='CRITICAL',
            detected_at=timezone.now(),
            status='INVESTIGATING',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-641',
            title='Resolved Critical',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='CRITICAL',
            detected_at=timezone.now(),
            status='RESOLVED',
        )

        response = admin_client.get('/api/security/breaches/summary/')
        assert response.status_code == status.HTTP_200_OK
        # by_severity only counts active breaches
        assert response.data['by_severity']['CRITICAL'] == 1


@pytest.mark.django_db
class TestSecurityBreachViewSetDelete:
    """Test SecurityBreachViewSet delete action."""

    def test_delete_breach(self, admin_client):
        """Test deleting a breach."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-700',
            title='To Delete',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        response = admin_client.delete(f'/api/security/breaches/{breach.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not SecurityBreach.objects.filter(id=breach.id).exists()

    def test_delete_cascades_to_related(self, admin_client, user_factory):
        """Test deleting a breach cascades to related records."""
        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-701',
            title='To Delete',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        AffectedUser.objects.create(
            breach=breach,
            user=user,
            data_exposed=['email']
        )
        BreachNotification.objects.create(
            breach=breach,
            notification_type='NPC_INITIAL',
            recipient='npc@gov.ph',
            content='Content'
        )

        response = admin_client.delete(f'/api/security/breaches/{breach.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert AffectedUser.objects.filter(breach_id=breach.id).count() == 0
        assert BreachNotification.objects.filter(breach_id=breach.id).count() == 0
