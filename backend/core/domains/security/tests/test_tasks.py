"""
Unit tests for security domain Celery tasks.

Tests:
- check_notification_deadlines task
- send_deadline_alert task
- send_daily_breach_summary task
"""

import pytest
from django.utils import timezone
from django.core import mail
from datetime import timedelta
from unittest.mock import patch, MagicMock
from freezegun import freeze_time

from core.domains.security.models import SecurityBreach
from core.domains.security.tasks import (
    check_notification_deadlines,
    send_deadline_alert,
    send_daily_breach_summary,
)


@pytest.mark.django_db
class TestCheckNotificationDeadlinesTask:
    """Unit tests for check_notification_deadlines Celery task."""

    def test_no_breaches_pending_notification(self, mocker):
        """Test task does nothing when no breaches need notification."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        # No breaches exist
        check_notification_deadlines()

        mock_alert.assert_not_called()

    def test_resolved_breaches_not_checked(self, mocker):
        """Test resolved breaches are not included in check."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-001',
            title='Resolved Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=100),
            status='RESOLVED',
            npc_notified=False,
        )

        check_notification_deadlines()

        mock_alert.assert_not_called()

    def test_false_positive_breaches_not_checked(self, mocker):
        """Test false positive breaches are not included in check."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-002',
            title='False Positive',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=100),
            status='FALSE_POSITIVE',
            npc_notified=False,
        )

        check_notification_deadlines()

        mock_alert.assert_not_called()

    def test_already_notified_breaches_not_checked(self, mocker):
        """Test breaches already notified to NPC are not checked."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-003',
            title='Already Notified',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=100),
            status='INVESTIGATING',
            npc_notified=True,
            npc_notified_at=timezone.now() - timedelta(hours=50),
        )

        check_notification_deadlines()

        mock_alert.assert_not_called()

    def test_overdue_breach_triggers_urgent_alert(self, mocker):
        """Test breach over 72 hours triggers urgent overdue alert."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-010',
            title='Overdue Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=80),
            status='INVESTIGATING',
            npc_notified=False,
        )

        check_notification_deadlines()

        mock_alert.assert_called_once()
        call_args = mock_alert.call_args
        assert call_args[0][0] == str(breach.id)
        assert 'OVERDUE' in call_args[0][1]
        assert call_args[1]['urgent'] is True

    def test_48_hour_warning_triggers_urgent_alert(self, mocker):
        """Test breach at 48-72 hours triggers warning alert."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-020',
            title='Warning Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=60),
            status='INVESTIGATING',
            npc_notified=False,
        )

        check_notification_deadlines()

        mock_alert.assert_called_once()
        call_args = mock_alert.call_args
        assert call_args[0][0] == str(breach.id)
        assert 'WARNING' in call_args[0][1]
        assert '24 hours' in call_args[0][1]
        assert call_args[1]['urgent'] is True

    def test_24_hour_reminder_triggers_non_urgent_alert(self, mocker):
        """Test breach at 24-48 hours triggers reminder alert."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-030',
            title='Reminder Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=36),
            status='INVESTIGATING',
            npc_notified=False,
        )

        check_notification_deadlines()

        mock_alert.assert_called_once()
        call_args = mock_alert.call_args
        assert call_args[0][0] == str(breach.id)
        assert 'REMINDER' in call_args[0][1]
        assert '48 hours' in call_args[0][1]
        assert call_args[1]['urgent'] is False

    def test_recent_breach_no_alert(self, mocker):
        """Test breach under 24 hours does not trigger alert."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-040',
            title='Recent Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=12),
            status='INVESTIGATING',
            npc_notified=False,
        )

        check_notification_deadlines()

        mock_alert.assert_not_called()

    def test_multiple_breaches_at_different_stages(self, mocker):
        """Test multiple breaches at different deadline stages."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        # Overdue (80 hours)
        breach1 = SecurityBreach.objects.create(
            breach_id='BREACH-2025-050',
            title='Overdue Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=80),
            status='INVESTIGATING',
            npc_notified=False,
        )
        # Warning (60 hours)
        breach2 = SecurityBreach.objects.create(
            breach_id='BREACH-2025-051',
            title='Warning Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=60),
            status='INVESTIGATING',
            npc_notified=False,
        )
        # Recent (12 hours) - no alert
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-052',
            title='Recent Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=12),
            status='INVESTIGATING',
            npc_notified=False,
        )

        check_notification_deadlines()

        assert mock_alert.call_count == 2
        # Check both breach IDs were alerted
        alerted_ids = [call[0][0] for call in mock_alert.call_args_list]
        assert str(breach1.id) in alerted_ids
        assert str(breach2.id) in alerted_ids

    def test_all_valid_statuses_checked(self, mocker):
        """Test all valid statuses (DETECTED, INVESTIGATING, CONFIRMED) are checked."""
        mock_alert = mocker.patch(
            'core.domains.security.tasks.send_deadline_alert.delay'
        )

        for idx, breach_status in enumerate(['DETECTED', 'INVESTIGATING', 'CONFIRMED']):
            SecurityBreach.objects.create(
                breach_id=f'BREACH-2025-06{idx}',
                title=f'{breach_status} Breach',
                description='Desc',
                breach_type='DATA_LEAK',
                severity='HIGH',
                detected_at=timezone.now() - timedelta(hours=80),
                status=breach_status,
                npc_notified=False,
            )

        check_notification_deadlines()

        assert mock_alert.call_count == 3


@pytest.mark.django_db
class TestSendDeadlineAlertTask:
    """Unit tests for send_deadline_alert Celery task."""

    def test_send_alert_to_dpo(self, settings):
        """Test alert is sent to DPO email."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-100',
            title='Test Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=80),
            status='INVESTIGATING',
        )

        send_deadline_alert(str(breach.id), 'Test message', urgent=False)

        assert len(mail.outbox) == 1
        assert 'dpo@company.com' in mail.outbox[0].to

    def test_send_alert_to_security_team(self, settings):
        """Test alert is sent to security team when configured."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = 'security@company.com'
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-101',
            title='Test Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=80),
            status='INVESTIGATING',
        )

        send_deadline_alert(str(breach.id), 'Test message', urgent=False)

        assert len(mail.outbox) == 1
        assert 'dpo@company.com' in mail.outbox[0].to
        assert 'security@company.com' in mail.outbox[0].to

    def test_urgent_alert_has_urgent_prefix(self, settings):
        """Test urgent alert has [URGENT] prefix in subject."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-102',
            title='Test Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=80),
            status='INVESTIGATING',
        )

        send_deadline_alert(str(breach.id), 'Overdue message', urgent=True)

        assert len(mail.outbox) == 1
        assert '[URGENT]' in mail.outbox[0].subject

    def test_non_urgent_alert_has_alert_prefix(self, settings):
        """Test non-urgent alert has [ALERT] prefix in subject."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-103',
            title='Test Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=36),
            status='INVESTIGATING',
        )

        send_deadline_alert(str(breach.id), 'Reminder message', urgent=False)

        assert len(mail.outbox) == 1
        assert '[ALERT]' in mail.outbox[0].subject
        assert '[URGENT]' not in mail.outbox[0].subject

    def test_alert_contains_breach_details(self, settings):
        """Test alert email contains breach details."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-104',
            title='Critical Security Incident',
            description='Detailed description',
            breach_type='RANSOMWARE',
            severity='CRITICAL',
            detected_at=timezone.now() - timedelta(hours=80),
            status='INVESTIGATING',
            affected_users_count=500,
            involves_spi=True,
        )

        send_deadline_alert(str(breach.id), 'Test message', urgent=True)

        assert len(mail.outbox) == 1
        body = mail.outbox[0].body
        assert 'BREACH-2025-104' in body
        assert 'Critical Security Incident' in body
        assert 'INVESTIGATING' in body
        assert 'CRITICAL' in body
        assert '500' in body
        assert 'Yes' in body  # involves_spi

    def test_nonexistent_breach_returns_early(self, settings):
        """Test task returns early for nonexistent breach ID."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        # Use a fake UUID that doesn't exist
        send_deadline_alert('00000000-0000-0000-0000-000000000000', 'Test', urgent=False)

        # No email should be sent
        assert len(mail.outbox) == 0

    def test_alert_subject_contains_breach_id(self, settings):
        """Test alert subject contains breach ID."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-105',
            title='Test Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=80),
            status='INVESTIGATING',
        )

        send_deadline_alert(str(breach.id), 'Custom alert message', urgent=False)

        assert len(mail.outbox) == 1
        assert 'BREACH-2025-105' in mail.outbox[0].subject
        assert 'Custom alert message' in mail.outbox[0].subject

    def test_alert_includes_action_required_overdue(self, settings):
        """Test alert includes overdue action message when applicable."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-106',
            title='Overdue Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=80),
            status='INVESTIGATING',
        )

        send_deadline_alert(str(breach.id), 'Overdue message', urgent=True)

        body = mail.outbox[0].body
        assert 'NPC notification OVERDUE' in body

    def test_alert_includes_action_required_pending(self, settings):
        """Test alert includes pending action message when not overdue."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        breach = SecurityBreach.objects.create(
            breach_id='BREACH-2025-107',
            title='Warning Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=60),
            status='INVESTIGATING',
        )

        send_deadline_alert(str(breach.id), 'Warning message', urgent=True)

        body = mail.outbox[0].body
        assert 'NPC notification required within deadline' in body


@pytest.mark.django_db
class TestSendDailyBreachSummaryTask:
    """Unit tests for send_daily_breach_summary Celery task."""

    def test_no_active_breaches_no_email(self, settings):
        """Test no email is sent when no active breaches exist."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = 'security@company.com'
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        # Only resolved breaches
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-200',
            title='Resolved Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=48),
            status='RESOLVED',
        )

        send_daily_breach_summary()

        assert len(mail.outbox) == 0

    def test_summary_sent_for_active_breaches(self, settings):
        """Test summary is sent when active breaches exist."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = 'security@company.com'
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-210',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )

        send_daily_breach_summary()

        assert len(mail.outbox) == 1

    def test_summary_recipients(self, settings):
        """Test summary is sent to both DPO and security team."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = 'security@company.com'
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-220',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )

        send_daily_breach_summary()

        assert len(mail.outbox) == 1
        assert 'security@company.com' in mail.outbox[0].to
        assert 'dpo@company.com' in mail.outbox[0].to

    def test_summary_no_recipients_configured(self, settings, caplog):
        """Test no email when no recipients configured."""
        settings.DPO_EMAIL = None
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-230',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )

        import logging
        caplog.set_level(logging.WARNING, logger='security')

        send_daily_breach_summary()

        assert len(mail.outbox) == 0
        assert any('No recipients configured' in record.message for record in caplog.records)

    def test_summary_subject_contains_count(self, settings):
        """Test summary subject contains breach count."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-240',
            title='Active Breach 1',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-241',
            title='Active Breach 2',
            description='Desc',
            breach_type='PHISHING',
            severity='MEDIUM',
            detected_at=timezone.now() - timedelta(hours=12),
            status='DETECTED',
        )

        send_daily_breach_summary()

        assert len(mail.outbox) == 1
        assert '[Daily]' in mail.outbox[0].subject
        assert '2 Active Security Breach' in mail.outbox[0].subject

    def test_summary_contains_breach_details(self, settings):
        """Test summary body contains breach details."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-250',
            title='Important Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=48),
            status='INVESTIGATING',
        )

        send_daily_breach_summary()

        body = mail.outbox[0].body
        assert 'BREACH-2025-250' in body
        assert 'Important Breach' in body
        assert 'INVESTIGATING' in body
        assert 'Daily Security Breach Summary' in body

    def test_summary_excludes_resolved_breaches(self, settings):
        """Test summary excludes resolved breaches."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-260',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-261',
            title='Resolved Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=100),
            status='RESOLVED',
        )

        send_daily_breach_summary()

        body = mail.outbox[0].body
        assert 'BREACH-2025-260' in body
        assert 'BREACH-2025-261' not in body

    def test_summary_excludes_false_positive_breaches(self, settings):
        """Test summary excludes false positive breaches."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-270',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-271',
            title='False Positive',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=48),
            status='FALSE_POSITIVE',
        )

        send_daily_breach_summary()

        body = mail.outbox[0].body
        assert 'BREACH-2025-270' in body
        assert 'BREACH-2025-271' not in body

    def test_summary_ordered_by_detection_time(self, settings):
        """Test summary lists breaches ordered by detection time (newest first)."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-280',
            title='Older Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=48),
            status='INVESTIGATING',
        )
        SecurityBreach.objects.create(
            breach_id='BREACH-2025-281',
            title='Newer Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=12),
            status='INVESTIGATING',
        )

        send_daily_breach_summary()

        body = mail.outbox[0].body
        # Newer should appear before older in the body
        assert body.index('BREACH-2025-281') < body.index('BREACH-2025-280')

    def test_summary_shows_hours_since_detection(self, settings):
        """Test summary shows hours since detection for each breach."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-290',
            title='Recent Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )

        send_daily_breach_summary()

        body = mail.outbox[0].body
        # Should contain hours indicator
        assert 'h since detection' in body

    def test_summary_only_sends_to_configured_recipients(self, settings):
        """Test summary only sends to configured recipients."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None  # Not configured
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-300',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )

        send_daily_breach_summary()

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ['dpo@company.com']

    def test_summary_uses_fail_silently(self, settings, mocker):
        """Test summary uses fail_silently=True for email sending."""
        settings.DPO_EMAIL = 'dpo@company.com'
        settings.SECURITY_TEAM_EMAIL = None
        settings.DEFAULT_FROM_EMAIL = 'noreply@company.com'

        mock_send_mail = mocker.patch('core.domains.security.tasks.send_mail')

        SecurityBreach.objects.create(
            breach_id='BREACH-2025-310',
            title='Active Breach',
            description='Desc',
            breach_type='DATA_LEAK',
            severity='HIGH',
            detected_at=timezone.now() - timedelta(hours=24),
            status='INVESTIGATING',
        )

        send_daily_breach_summary()

        mock_send_mail.assert_called_once()
        assert mock_send_mail.call_args[1]['fail_silently'] is True
