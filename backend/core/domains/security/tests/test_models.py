"""
Unit tests for security domain models.

Tests:
- SecurityBreach model (breach tracking, notification requirements, timelines)
- BreachNotification model (notification tracking)
- AffectedUser model (affected user tracking)
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


@pytest.mark.django_db
class TestSecurityBreachModel:
    """Unit tests for the SecurityBreach model."""

    def test_create_security_breach(self, user_factory):
        """Test creating a security breach with required fields."""
        lead_user = user_factory(admin=True)
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-001',
            title='Test Data Breach',
            description='Test breach description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            status='DETECTED',
            detected_at=timezone.now(),
            incident_lead=lead_user,
        )

        assert breach.breach_id == 'BREACH-2025-001'
        assert breach.title == 'Test Data Breach'
        assert breach.breach_type == 'DATA_LEAK'
        assert breach.severity == 'HIGH'
        assert breach.status == 'DETECTED'
        assert breach.incident_lead == lead_user

    def test_breach_string_representation(self):
        """Test SecurityBreach __str__ returns breach_id and title."""
        breach = SecurityBreach(
            breach_id='BREACH-2025-001',
            title='Test Breach'
        )

        assert str(breach) == 'BREACH-2025-001: Test Breach'

    def test_breach_default_status(self):
        """Test breach default status is DETECTED."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-002',
            title='Test Breach',
            description='Description',
            breach_type='UNAUTHORIZED_ACCESS',
            severity='MEDIUM',
            detected_at=timezone.now(),
        )

        assert breach.status == 'DETECTED'

    def test_breach_default_values(self):
        """Test breach default values for counts and flags."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-003',
            title='Test Breach',
            description='Description',
            breach_type='PHISHING',
            severity='LOW',
            detected_at=timezone.now(),
        )

        assert breach.affected_users_count == 0
        assert breach.affected_records_count == 0
        assert breach.involves_spi is False
        assert breach.data_types_affected == []
        assert breach.npc_notified is False
        assert breach.users_notified is False

    def test_breach_requires_notification_with_spi(self):
        """Test requires_notification returns True when SPI is involved."""
        breach = SecurityBreach(
            breach_id='BREACH-2025-004',
            involves_spi=True,
            data_types_affected=[],
            affected_users_count=1,
        )

        assert breach.requires_notification() is True

    def test_breach_requires_notification_with_high_user_count(self):
        """Test requires_notification returns True with 100+ affected users."""
        breach = SecurityBreach(
            breach_id='BREACH-2025-005',
            involves_spi=False,
            data_types_affected=[],
            affected_users_count=100,
        )

        assert breach.requires_notification() is True

    def test_breach_requires_notification_with_payment_data(self):
        """Test requires_notification returns True with payment data exposed."""
        breach = SecurityBreach(
            breach_id='BREACH-2025-006',
            involves_spi=False,
            data_types_affected=['email', 'payment'],
            affected_users_count=1,
        )

        assert breach.requires_notification() is True

    def test_breach_requires_notification_with_government_id(self):
        """Test requires_notification returns True with government_id exposed."""
        breach = SecurityBreach(
            breach_id='BREACH-2025-007',
            involves_spi=False,
            data_types_affected=['government_id'],
            affected_users_count=1,
        )

        assert breach.requires_notification() is True

    def test_breach_does_not_require_notification_minor_incident(self):
        """Test requires_notification returns False for minor incidents."""
        breach = SecurityBreach(
            breach_id='BREACH-2025-008',
            involves_spi=False,
            data_types_affected=['email'],
            affected_users_count=10,
        )

        assert breach.requires_notification() is False

    @freeze_time('2025-01-15 10:00:00')
    def test_hours_since_detection(self):
        """Test hours_since_detection calculation."""
        detected_time = timezone.now() - timedelta(hours=24)
        breach = SecurityBreach(
            breach_id='BREACH-2025-009',
            detected_at=detected_time,
        )

        assert breach.hours_since_detection() == 24.0

    def test_hours_since_detection_with_no_detected_at(self):
        """Test hours_since_detection returns 0 when detected_at is None."""
        breach = SecurityBreach(
            breach_id='BREACH-2025-010',
            detected_at=None,
        )

        assert breach.hours_since_detection() == 0

    @freeze_time('2025-01-15 10:00:00')
    def test_is_notification_overdue_after_72_hours(self):
        """Test is_notification_overdue returns True after 72 hours."""
        detected_time = timezone.now() - timedelta(hours=73)
        breach = SecurityBreach(
            breach_id='BREACH-2025-011',
            detected_at=detected_time,
            npc_notified=False,
        )

        assert breach.is_notification_overdue() is True

    @freeze_time('2025-01-15 10:00:00')
    def test_is_notification_not_overdue_before_72_hours(self):
        """Test is_notification_overdue returns False before 72 hours."""
        detected_time = timezone.now() - timedelta(hours=71)
        breach = SecurityBreach(
            breach_id='BREACH-2025-012',
            detected_at=detected_time,
            npc_notified=False,
        )

        assert breach.is_notification_overdue() is False

    @freeze_time('2025-01-15 10:00:00')
    def test_is_notification_not_overdue_when_already_notified(self):
        """Test is_notification_overdue returns False when NPC already notified."""
        detected_time = timezone.now() - timedelta(hours=100)
        breach = SecurityBreach(
            breach_id='BREACH-2025-013',
            detected_at=detected_time,
            npc_notified=True,
        )

        assert breach.is_notification_overdue() is False

    def test_breach_ordering_by_detected_at(self):
        """Test breaches are ordered by detected_at descending."""
        now = timezone.now()

        breach1 = SecurityBreach.objects.create(
            breach_id='BREACH-2025-014',
            title='Older Breach',
            description='Description',
            breach_type='OTHER',
            severity='LOW',
            detected_at=now - timedelta(days=2),
        )
        breach2 = SecurityBreach.objects.create(
            breach_id='BREACH-2025-015',
            title='Newer Breach',
            description='Description',
            breach_type='OTHER',
            severity='LOW',
            detected_at=now - timedelta(days=1),
        )

        breaches = list(SecurityBreach.objects.all())
        assert breaches[0] == breach2
        assert breaches[1] == breach1

    def test_breach_severity_choices(self):
        """Test all severity choices are valid."""
        valid_severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

        for severity in valid_severities:
            breach = SecurityBreach(
                breach_id=f'BREACH-SEV-{severity}',
                severity=severity,
            )
            assert breach.severity == severity

    def test_breach_status_choices(self):
        """Test all status choices are valid."""
        valid_statuses = [
            'DETECTED', 'INVESTIGATING', 'CONFIRMED', 'CONTAINED',
            'NOTIFYING', 'RESOLVED', 'FALSE_POSITIVE'
        ]

        for status in valid_statuses:
            breach = SecurityBreach(
                breach_id=f'BREACH-STATUS-{status}',
                status=status,
            )
            assert breach.status == status

    def test_breach_type_choices(self):
        """Test all breach type choices are valid."""
        valid_types = [
            'UNAUTHORIZED_ACCESS', 'DATA_THEFT', 'DATA_LEAK', 'RANSOMWARE',
            'PHISHING', 'INSIDER_THREAT', 'SYSTEM_COMPROMISE', 'OTHER'
        ]

        for breach_type in valid_types:
            breach = SecurityBreach(
                breach_id=f'BREACH-TYPE-{breach_type}',
                breach_type=breach_type,
            )
            assert breach.breach_type == breach_type


@pytest.mark.django_db
class TestBreachNotificationModel:
    """Unit tests for the BreachNotification model."""

    def test_create_breach_notification(self):
        """Test creating a breach notification."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-020',
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
            content='Initial NPC notification content',
            delivery_status='SENT',
        )

        assert notification.breach == breach
        assert notification.notification_type == 'NPC_INITIAL'
        assert notification.recipient == 'complaints@privacy.gov.ph'
        assert notification.delivery_status == 'SENT'

    def test_notification_string_representation(self):
        """Test BreachNotification __str__ returns informative string."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-021',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        notification = BreachNotification.objects.create(
            breach=breach,
            notification_type='USER_EMAIL',
            recipient='user@example.com',
            content='Content',
        )

        expected = 'BREACH-2025-021 - USER_EMAIL to user@example.com'
        assert str(notification) == expected

    def test_notification_sent_at_auto_set(self):
        """Test sent_at is automatically set on creation."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-022',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        notification = BreachNotification.objects.create(
            breach=breach,
            notification_type='USER_EMAIL',
            recipient='user@example.com',
            content='Content',
        )

        assert notification.sent_at is not None

    def test_notification_default_delivery_status(self):
        """Test notification default delivery status is SENT."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-023',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        notification = BreachNotification.objects.create(
            breach=breach,
            notification_type='USER_EMAIL',
            recipient='user@example.com',
            content='Content',
        )

        assert notification.delivery_status == 'SENT'

    def test_notification_type_choices(self):
        """Test all notification type choices are valid."""
        valid_types = [
            'NPC_INITIAL', 'NPC_FULL_REPORT', 'USER_EMAIL',
            'USER_SMS', 'USER_IN_APP', 'INTERNAL'
        ]

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-024',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        for notif_type in valid_types:
            notification = BreachNotification(
                breach=breach,
                notification_type=notif_type,
                recipient='test@example.com',
                content='Content',
            )
            assert notification.notification_type == notif_type

    def test_notification_ordering_by_sent_at(self):
        """Test notifications are ordered by sent_at descending."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-025',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        # Create notifications
        notif1 = BreachNotification.objects.create(
            breach=breach,
            notification_type='USER_EMAIL',
            recipient='first@example.com',
            content='First',
        )
        notif2 = BreachNotification.objects.create(
            breach=breach,
            notification_type='USER_EMAIL',
            recipient='second@example.com',
            content='Second',
        )

        notifications = list(BreachNotification.objects.all())
        # Most recent first
        assert notifications[0] == notif2
        assert notifications[1] == notif1

    def test_breach_cascade_deletes_notifications(self):
        """Test that deleting a breach deletes its notifications."""
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-026',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        BreachNotification.objects.create(
            breach=breach,
            notification_type='USER_EMAIL',
            recipient='user@example.com',
            content='Content',
        )

        breach_id = breach.id
        breach.delete()

        assert not BreachNotification.objects.filter(breach_id=breach_id).exists()


@pytest.mark.django_db
class TestAffectedUserModel:
    """Unit tests for the AffectedUser model."""

    def test_create_affected_user(self, user_factory):
        """Test creating an affected user record."""
        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-030',
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

        assert affected.breach == breach
        assert affected.user == user
        assert affected.data_exposed == ['email', 'phone']
        assert affected.notified is False
        assert affected.notified_at is None

    def test_affected_user_string_representation(self, user_factory):
        """Test AffectedUser __str__ returns informative string."""
        user = user_factory(email='affected@example.com')
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-031',
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

        expected = 'BREACH-2025-031 - User affected@example.com'
        assert str(affected) == expected

    def test_affected_user_default_notified_false(self, user_factory):
        """Test affected user default notified is False."""
        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-032',
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

        assert affected.notified is False

    def test_affected_user_unique_together_constraint(self, user_factory):
        """Test unique_together constraint on breach and user."""
        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-033',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        AffectedUser.objects.create(
            breach=breach,
            user=user,
            data_exposed=['email'],
        )

        # Attempt to create duplicate should raise error
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            AffectedUser.objects.create(
                breach=breach,
                user=user,
                data_exposed=['phone'],
            )

    def test_affected_user_mark_as_notified(self, user_factory):
        """Test marking affected user as notified."""
        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-034',
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

        affected.notified = True
        affected.notified_at = timezone.now()
        affected.save()

        affected.refresh_from_db()
        assert affected.notified is True
        assert affected.notified_at is not None

    def test_breach_cascade_deletes_affected_users(self, user_factory):
        """Test that deleting a breach deletes its affected users."""
        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-035',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        AffectedUser.objects.create(
            breach=breach,
            user=user,
            data_exposed=['email'],
        )

        breach_id = breach.id
        breach.delete()

        assert not AffectedUser.objects.filter(breach_id=breach_id).exists()

    def test_user_cascade_deletes_affected_user_records(self, user_factory, ensure_security_events_table):
        """Test that deleting a user deletes their affected user records."""
        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-036',
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

        affected_id = affected.id
        user.delete()

        assert not AffectedUser.objects.filter(id=affected_id).exists()

    def test_multiple_users_affected_by_same_breach(self, user_factory):
        """Test multiple users can be affected by the same breach."""
        user1 = user_factory()
        user2 = user_factory()
        user3 = user_factory()

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-037',
            title='Test Breach',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )

        AffectedUser.objects.create(breach=breach, user=user1, data_exposed=['email'])
        AffectedUser.objects.create(breach=breach, user=user2, data_exposed=['email', 'phone'])
        AffectedUser.objects.create(breach=breach, user=user3, data_exposed=['payment'])

        assert breach.affected_users.count() == 3

    def test_same_user_affected_by_multiple_breaches(self, user_factory):
        """Test same user can be affected by multiple breaches."""
        user = user_factory()

        breach1 = SecurityBreach.objects.create(
            breach_id='BREACH-2025-038',
            title='Breach 1',
            description='Description',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now(),
        )
        breach2 = SecurityBreach.objects.create(
            breach_id='BREACH-2025-039',
            title='Breach 2',
            description='Description',
            breach_type='PHISHING',
            severity='MEDIUM',
            detected_at=timezone.now(),
        )

        AffectedUser.objects.create(breach=breach1, user=user, data_exposed=['email'])
        AffectedUser.objects.create(breach=breach2, user=user, data_exposed=['phone'])

        assert AffectedUser.objects.filter(user=user).count() == 2
