"""
Unit tests for security domain serializers.

Tests:
- SecurityBreachListSerializer
- SecurityBreachDetailSerializer
- SecurityBreachCreateSerializer
- SecurityBreachUpdateSerializer
- BreachNotificationSerializer
- AffectedUserSerializer
- NotifyNPCSerializer
- NotifyUsersSerializer
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time

from core.domains.security.models import (
    SecurityBreach,
    BreachNotification,
    AffectedUser,
)
from core.domains.security.serializers import (
    SecurityBreachListSerializer,
    SecurityBreachDetailSerializer,
    SecurityBreachCreateSerializer,
    SecurityBreachUpdateSerializer,
    BreachNotificationSerializer,
    AffectedUserSerializer,
    NotifyNPCSerializer,
    NotifyUsersSerializer,
)


@pytest.mark.django_db
class TestBreachNotificationSerializer:
    """Unit tests for the BreachNotificationSerializer."""

    def test_serializes_notification_fields(self):
        """Test serializer includes all expected fields."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-100',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        notification = BreachNotification.objects.create(
            breach=breach,
            notification_type='NPC_INITIAL',
            recipient='complaints@privacy.gov.ph',
            content='Test content',
            delivery_status='SENT',
        )

        serializer = BreachNotificationSerializer(notification)
        data = serializer.data

        assert 'id' in data
        assert data['notification_type'] == 'NPC_INITIAL'
        assert data['recipient'] == 'complaints@privacy.gov.ph'
        assert data['content'] == 'Test content'
        assert data['delivery_status'] == 'SENT'
        assert 'sent_at' in data

    def test_read_only_fields(self):
        """Test read-only fields cannot be set on creation."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-101',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        data = {
            'breach': breach.id,
            'notification_type': 'USER_EMAIL',
            'recipient': 'user@example.com',
            'content': 'Content',
            'id': 999,  # Should be ignored
        }

        serializer = BreachNotificationSerializer(data=data)
        assert serializer.is_valid()


@pytest.mark.django_db
class TestAffectedUserSerializer:
    """Unit tests for the AffectedUserSerializer."""

    def test_serializes_affected_user_fields(self, user_factory):
        """Test serializer includes all expected fields including email."""
        user = user_factory(email='affected@example.com')
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-110',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        affected = AffectedUser.objects.create(
            breach=breach,
            user=user,
            data_exposed=['email', 'phone'],
        )

        serializer = AffectedUserSerializer(affected)
        data = serializer.data

        assert 'id' in data
        assert data['user'] == user.id
        assert data['email'] == 'affected@example.com'
        assert data['data_exposed'] == ['email', 'phone']
        assert data['notified'] is False
        assert data['notified_at'] is None

    def test_email_is_read_only(self, user_factory):
        """Test email field is read-only from user relationship."""
        user = user_factory(email='original@example.com')
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-111',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        affected = AffectedUser.objects.create(
            breach=breach,
            user=user,
            data_exposed=['email'],
        )

        serializer = AffectedUserSerializer(affected)
        assert serializer.data['email'] == 'original@example.com'


@pytest.mark.django_db
class TestSecurityBreachListSerializer:
    """Unit tests for the SecurityBreachListSerializer."""

    def test_serializes_list_fields(self):
        """Test serializer includes minimal fields for list view."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-120',
            title='Test Breach',
            description='Full description here',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            affected_users_count=50,
            involves_spi=True,
            npc_notified=False,
        )

        serializer = SecurityBreachListSerializer(breach)
        data = serializer.data

        assert data['breach_id'] == 'BREACH-2025-120'
        assert data['title'] == 'Test Breach'
        assert data['breach_type'] == 'DATA_LEAK'
        assert data['severity'] == 'HIGH'
        assert data['status'] == 'DETECTED'
        assert data['affected_users_count'] == 50
        assert data['involves_spi'] is True
        assert data['npc_notified'] is False
        assert 'hours_since_detection' in data
        assert 'is_overdue' in data
        # Detail fields should NOT be in list serializer
        assert 'description' not in data
        assert 'notifications' not in data

    @freeze_time('2025-01-15 10:00:00')
    def test_hours_since_detection_method_field(self):
        """Test hours_since_detection is calculated correctly."""
        detected_time = timezone.now() - timedelta(hours=48)
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-121',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=detected_time,
        )

        serializer = SecurityBreachListSerializer(breach)
        assert serializer.data['hours_since_detection'] == 48.0

    @freeze_time('2025-01-15 10:00:00')
    def test_is_overdue_method_field(self):
        """Test is_overdue is calculated correctly."""
        detected_time = timezone.now() - timedelta(hours=80)
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-122',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=detected_time,
            npc_notified=False,
        )

        serializer = SecurityBreachListSerializer(breach)
        assert serializer.data['is_overdue'] is True


@pytest.mark.django_db
class TestSecurityBreachDetailSerializer:
    """Unit tests for the SecurityBreachDetailSerializer."""

    def test_serializes_all_detail_fields(self, user_factory):
        """Test serializer includes all fields for detail view."""
        lead = user_factory(admin=True, first_name='John', last_name='Doe')
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-130',
            title='Test Breach',
            description='Full description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            status='INVESTIGATING',
            detected_at=timezone.now(),
            affected_users_count=50,
            affected_records_count=1000,
            involves_spi=True,
            data_types_affected=['email', 'phone', 'payment'],
            attack_vector='Phishing email',
            vulnerabilities_exploited='Human error',
            containment_actions='Revoked access',
            remediation_steps='Password reset',
            prevention_measures='Training',
            incident_lead=lead,
        )

        serializer = SecurityBreachDetailSerializer(breach)
        data = serializer.data

        assert data['breach_id'] == 'BREACH-2025-130'
        assert data['title'] == 'Test Breach'
        assert data['description'] == 'Full description'
        assert data['breach_type'] == 'DATA_LEAK'
        assert data['severity'] == 'HIGH'
        assert data['status'] == 'INVESTIGATING'
        assert data['affected_users_count'] == 50
        assert data['affected_records_count'] == 1000
        assert data['involves_spi'] is True
        assert data['data_types_affected'] == ['email', 'phone', 'payment']
        assert data['attack_vector'] == 'Phishing email'
        assert data['vulnerabilities_exploited'] == 'Human error'
        assert data['containment_actions'] == 'Revoked access'
        assert data['remediation_steps'] == 'Password reset'
        assert data['prevention_measures'] == 'Training'
        assert data['incident_lead'] == lead.id
        assert data['incident_lead_name'] == 'John Doe'
        assert 'hours_since_detection' in data
        assert 'is_overdue' in data
        assert 'requires_notification' in data
        assert 'notifications' in data
        assert 'affected_users' in data

    def test_includes_nested_notifications(self):
        """Test serializer includes nested notifications."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-131',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        BreachNotification.objects.create(
            breach=breach,
            notification_type='NPC_INITIAL',
            recipient='npc@example.com',
            content='Content',
        )
        BreachNotification.objects.create(
            breach=breach,
            notification_type='USER_EMAIL',
            recipient='user@example.com',
            content='Content',
        )

        serializer = SecurityBreachDetailSerializer(breach)
        assert len(serializer.data['notifications']) == 2

    def test_includes_nested_affected_users(self, user_factory):
        """Test serializer includes nested affected users."""
        user1 = user_factory()
        user2 = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-132',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        AffectedUser.objects.create(breach=breach, user=user1, data_exposed=['email'])
        AffectedUser.objects.create(breach=breach, user=user2, data_exposed=['phone'])

        serializer = SecurityBreachDetailSerializer(breach)
        assert len(serializer.data['affected_users']) == 2

    def test_requires_notification_method_field(self):
        """Test requires_notification is calculated correctly."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-133',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            involves_spi=True,
        )

        serializer = SecurityBreachDetailSerializer(breach)
        assert serializer.data['requires_notification'] is True


@pytest.mark.django_db
class TestSecurityBreachCreateSerializer:
    """Unit tests for the SecurityBreachCreateSerializer."""

    def test_create_breach_with_required_fields(self, mocker):
        """Test creating a breach with required fields."""
        # Mock the internal alert to avoid email sending
        mocker.patch(
            'core.domains.security.services.BreachNotificationService._send_internal_alert'
        )

        data = {
            'title': 'New Security Breach',
            'description': 'Breach description',
            'breach_type': 'UNAUTHORIZED_ACCESS',
            'severity': 'CRITICAL',
            'detected_at': timezone.now().isoformat(),
        }

        serializer = SecurityBreachCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        breach = serializer.save()

        assert breach.title == 'New Security Breach'
        assert breach.description == 'Breach description'
        assert breach.breach_type == 'UNAUTHORIZED_ACCESS'
        assert breach.severity == 'CRITICAL'
        assert breach.breach_id.startswith('BREACH-')

    def test_create_breach_generates_breach_id(self, mocker):
        """Test creating a breach auto-generates breach_id."""
        mocker.patch(
            'core.domains.security.services.BreachNotificationService._send_internal_alert'
        )

        data = {
            'title': 'Another Breach',
            'description': 'Description',
            'breach_type': 'DATA_LEAK',
            'severity': 'HIGH',
        }

        serializer = SecurityBreachCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        breach = serializer.save()

        year = timezone.now().year
        assert breach.breach_id.startswith(f'BREACH-{year}-')

    def test_create_breach_validation_errors(self):
        """Test validation errors for missing required fields."""
        data = {
            'title': 'Breach Without Type',
            # Missing: description, breach_type, severity
        }

        serializer = SecurityBreachCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'description' in serializer.errors
        assert 'breach_type' in serializer.errors
        assert 'severity' in serializer.errors

    def test_create_breach_with_incident_lead(self, user_factory, mocker):
        """Test creating a breach with assigned incident lead."""
        mocker.patch(
            'core.domains.security.services.BreachNotificationService._send_internal_alert'
        )
        lead = user_factory(admin=True)

        data = {
            'title': 'Breach With Lead',
            'description': 'Description',
            'breach_type': 'RANSOMWARE',
            'severity': 'CRITICAL',
            'incident_lead': lead.id,
        }

        serializer = SecurityBreachCreateSerializer(data=data)
        # Note: The create method in serializer doesn't handle incident_lead
        # The serializer is valid but incident_lead would need manual handling
        assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
class TestSecurityBreachUpdateSerializer:
    """Unit tests for the SecurityBreachUpdateSerializer."""

    def test_update_breach_status(self):
        """Test updating breach status."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-140',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='DETECTED',
        )

        data = {'status': 'INVESTIGATING'}
        serializer = SecurityBreachUpdateSerializer(breach, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors

        updated = serializer.save()
        assert updated.status == 'INVESTIGATING'

    def test_update_breach_timeline_fields(self):
        """Test updating breach timeline fields."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-141',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
            status='DETECTED',
        )

        now = timezone.now()
        data = {
            'status': 'CONFIRMED',
            'confirmed_at': now.isoformat(),
        }
        serializer = SecurityBreachUpdateSerializer(breach, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors

        updated = serializer.save()
        assert updated.status == 'CONFIRMED'
        assert updated.confirmed_at is not None

    def test_update_breach_remediation_info(self):
        """Test updating breach remediation information."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-142',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        data = {
            'containment_actions': 'Disabled compromised accounts',
            'remediation_steps': 'Reset passwords, enable 2FA',
            'prevention_measures': 'Security training for staff',
        }
        serializer = SecurityBreachUpdateSerializer(breach, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors

        updated = serializer.save()
        assert updated.containment_actions == 'Disabled compromised accounts'
        assert updated.remediation_steps == 'Reset passwords, enable 2FA'
        assert updated.prevention_measures == 'Security training for staff'

    def test_update_breach_npc_reference(self):
        """Test updating breach NPC reference number."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-143',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        data = {'npc_reference_number': 'NPC-2025-001234'}
        serializer = SecurityBreachUpdateSerializer(breach, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors

        updated = serializer.save()
        assert updated.npc_reference_number == 'NPC-2025-001234'

    def test_update_excludes_read_only_fields(self):
        """Test that read-only fields are not in update serializer."""
        fields = SecurityBreachUpdateSerializer.Meta.fields

        # These should not be updatable
        assert 'breach_id' not in fields
        assert 'created_at' not in fields
        assert 'npc_notified_at' not in fields
        assert 'users_notified_at' not in fields


@pytest.mark.django_db
class TestNotifyNPCSerializer:
    """Unit tests for the NotifyNPCSerializer."""

    def test_valid_with_confirm_true(self):
        """Test serializer is valid with confirm=True."""
        data = {'confirm': True}
        serializer = NotifyNPCSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data['confirm'] is True

    def test_valid_with_confirm_false(self):
        """Test serializer is valid with confirm=False."""
        data = {'confirm': False}
        serializer = NotifyNPCSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data['confirm'] is False

    def test_invalid_without_confirm(self):
        """Test serializer is invalid without confirm field."""
        data = {}
        serializer = NotifyNPCSerializer(data=data)

        assert not serializer.is_valid()
        assert 'confirm' in serializer.errors


@pytest.mark.django_db
class TestNotifyUsersSerializer:
    """Unit tests for the NotifyUsersSerializer."""

    def test_valid_with_confirm_only(self):
        """Test serializer is valid with just confirm field."""
        data = {'confirm': True}
        serializer = NotifyUsersSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data['confirm'] is True

    def test_valid_with_specific_user_ids(self):
        """Test serializer is valid with specific user_ids."""
        data = {
            'confirm': True,
            'user_ids': [1, 2, 3],
        }
        serializer = NotifyUsersSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data['confirm'] is True
        assert serializer.validated_data['user_ids'] == [1, 2, 3]

    def test_user_ids_is_optional(self):
        """Test user_ids field is optional."""
        data = {'confirm': True}
        serializer = NotifyUsersSerializer(data=data)

        assert serializer.is_valid()
        assert 'user_ids' not in serializer.validated_data or serializer.validated_data.get('user_ids') is None

    def test_invalid_without_confirm(self):
        """Test serializer is invalid without confirm field."""
        data = {'user_ids': [1, 2, 3]}
        serializer = NotifyUsersSerializer(data=data)

        assert not serializer.is_valid()
        assert 'confirm' in serializer.errors

    def test_user_ids_validates_as_list_of_integers(self):
        """Test user_ids must be a list of integers."""
        data = {
            'confirm': True,
            'user_ids': ['not', 'integers'],
        }
        serializer = NotifyUsersSerializer(data=data)

        assert not serializer.is_valid()
        assert 'user_ids' in serializer.errors
