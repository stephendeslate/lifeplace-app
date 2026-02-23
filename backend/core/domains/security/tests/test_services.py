"""
Unit tests for security domain services.

Tests:
- BreachNotificationService.create_breach
- BreachNotificationService.assess_impact
- BreachNotificationService.notify_npc
- BreachNotificationService.notify_affected_users
- Internal notification generation methods
"""

from datetime import timedelta

from django.core import mail
from django.utils import timezone

import pytest

from core.domains.security.models import (
    AffectedUser,
    BreachNotification,
    SecurityBreach,
)
from core.domains.security.services import BreachNotificationService


@pytest.mark.django_db
class TestBreachNotificationServiceCreateBreach:
    """Unit tests for BreachNotificationService.create_breach method."""

    def test_create_breach_generates_breach_id(self, mocker):
        """Test create_breach generates a proper breach ID."""
        mocker.patch.object(BreachNotificationService, "_send_internal_alert")

        breach = BreachNotificationService.create_breach(
            title="Test Breach",
            description="Test description",
            breach_type="DATA_LEAK",
            severity="HIGH",
        )

        year = timezone.now().year
        assert breach.breach_id.startswith(f"BREACH-{year}-")
        assert len(breach.breach_id) == len(f"BREACH-{year}-001")

    def test_create_breach_sets_default_values(self, mocker):
        """Test create_breach sets proper default values."""
        mocker.patch.object(BreachNotificationService, "_send_internal_alert")

        breach = BreachNotificationService.create_breach(
            title="Test Breach",
            description="Test description",
            breach_type="UNAUTHORIZED_ACCESS",
            severity="CRITICAL",
        )

        assert breach.status == "DETECTED"
        assert breach.affected_users_count == 0
        assert breach.npc_notified is False
        assert breach.users_notified is False

    def test_create_breach_with_custom_detected_at(self, mocker):
        """Test create_breach with custom detected_at time."""
        mocker.patch.object(BreachNotificationService, "_send_internal_alert")

        custom_time = timezone.now() - timedelta(hours=5)
        breach = BreachNotificationService.create_breach(
            title="Past Breach",
            description="Detected earlier",
            breach_type="PHISHING",
            severity="MEDIUM",
            detected_at=custom_time,
        )

        assert breach.detected_at == custom_time

    def test_create_breach_uses_current_time_if_not_provided(self, mocker):
        """Test create_breach uses current time when detected_at not provided."""
        mocker.patch.object(BreachNotificationService, "_send_internal_alert")

        before = timezone.now()
        breach = BreachNotificationService.create_breach(
            title="New Breach",
            description="Just detected",
            breach_type="RANSOMWARE",
            severity="CRITICAL",
        )
        after = timezone.now()

        assert before <= breach.detected_at <= after

    def test_create_breach_increments_breach_number(self, mocker):
        """Test create_breach increments breach number for same year."""
        mocker.patch.object(BreachNotificationService, "_send_internal_alert")

        breach1 = BreachNotificationService.create_breach(
            title="First Breach",
            description="First",
            breach_type="DATA_LEAK",
            severity="HIGH",
        )
        breach2 = BreachNotificationService.create_breach(
            title="Second Breach",
            description="Second",
            breach_type="DATA_LEAK",
            severity="HIGH",
        )

        # Extract numbers from breach IDs
        num1 = int(breach1.breach_id.split("-")[-1])
        num2 = int(breach2.breach_id.split("-")[-1])

        assert num2 == num1 + 1

    def test_create_breach_sends_internal_alert(self, mocker, settings):
        """Test create_breach sends internal alert to security team."""
        settings.SECURITY_TEAM_EMAIL = "security@company.com"
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"

        mock_alert = mocker.patch.object(BreachNotificationService, "_send_internal_alert")

        breach = BreachNotificationService.create_breach(
            title="Alert Test",
            description="Should trigger alert",
            breach_type="SYSTEM_COMPROMISE",
            severity="CRITICAL",
        )

        mock_alert.assert_called_once_with(breach)

    def test_create_breach_logs_critical(self, mocker):
        """Test create_breach logs at critical level."""
        mocker.patch.object(BreachNotificationService, "_send_internal_alert")

        # The 'security' logger has propagate=False, so use mocker instead of caplog
        mock_logger = mocker.patch("core.domains.security.services.logger")

        BreachNotificationService.create_breach(
            title="Log Test",
            description="Should log",
            breach_type="DATA_THEFT",
            severity="CRITICAL",
        )

        # Check that critical logging occurred
        mock_logger.critical.assert_called_once()
        assert "Security breach detected" in mock_logger.critical.call_args[0][0]


@pytest.mark.django_db
class TestBreachNotificationServiceAssessImpact:
    """Unit tests for BreachNotificationService.assess_impact method."""

    def test_assess_impact_updates_breach(self, user_factory):
        """Test assess_impact updates breach fields."""
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-200",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        user1 = user_factory()
        user2 = user_factory()

        BreachNotificationService.assess_impact(
            breach,
            affected_user_ids=[user1.id, user2.id],
            data_types=["email", "phone"],
        )

        breach.refresh_from_db()
        assert breach.affected_users_count == 2
        assert breach.data_types_affected == ["email", "phone"]
        assert breach.involves_spi is False

    def test_assess_impact_detects_spi_health(self, user_factory):
        """Test assess_impact detects SPI when health data is involved."""
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-201",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        user = user_factory()

        BreachNotificationService.assess_impact(
            breach,
            affected_user_ids=[user.id],
            data_types=["email", "health"],
        )

        breach.refresh_from_db()
        assert breach.involves_spi is True

    def test_assess_impact_detects_spi_government_id(self, user_factory):
        """Test assess_impact detects SPI when government_id is involved."""
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-202",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        user = user_factory()

        BreachNotificationService.assess_impact(
            breach,
            affected_user_ids=[user.id],
            data_types=["government_id"],
        )

        breach.refresh_from_db()
        assert breach.involves_spi is True

    def test_assess_impact_detects_spi_all_types(self, user_factory):
        """Test assess_impact detects all SPI types."""
        spi_types = ["health", "religion", "political", "genetic", "government_id", "criminal_record"]

        for spi_type in spi_types:
            breach = SecurityBreach.objects.create(
                breach_id=f"BREACH-2025-SPI-{spi_type}",
                title="Test Breach",
                description="Description",
                breach_type="DATA_LEAK",
                severity="HIGH",
                detected_at=timezone.now(),
            )
            user = user_factory()

            BreachNotificationService.assess_impact(
                breach,
                affected_user_ids=[user.id],
                data_types=[spi_type],
            )

            breach.refresh_from_db()
            assert breach.involves_spi is True, f"Failed to detect SPI for {spi_type}"

    def test_assess_impact_creates_affected_user_records(self, user_factory):
        """Test assess_impact creates AffectedUser records."""
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-203",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        user1 = user_factory()
        user2 = user_factory()

        BreachNotificationService.assess_impact(
            breach,
            affected_user_ids=[user1.id, user2.id],
            data_types=["email", "phone"],
        )

        assert AffectedUser.objects.filter(breach=breach).count() == 2
        assert AffectedUser.objects.filter(breach=breach, user=user1).exists()
        assert AffectedUser.objects.filter(breach=breach, user=user2).exists()

    def test_assess_impact_sets_data_exposed_on_affected_users(self, user_factory):
        """Test assess_impact sets data_exposed on AffectedUser records."""
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-204",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        user = user_factory()

        BreachNotificationService.assess_impact(
            breach,
            affected_user_ids=[user.id],
            data_types=["email", "phone", "address"],
        )

        affected = AffectedUser.objects.get(breach=breach, user=user)
        assert affected.data_exposed == ["email", "phone", "address"]

    def test_assess_impact_uses_get_or_create(self, user_factory):
        """Test assess_impact uses get_or_create to avoid duplicates."""
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-205",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        user = user_factory()

        # First assessment
        BreachNotificationService.assess_impact(
            breach,
            affected_user_ids=[user.id],
            data_types=["email"],
        )

        # Second assessment with same user - should not create duplicate
        BreachNotificationService.assess_impact(
            breach,
            affected_user_ids=[user.id],
            data_types=["phone"],
        )

        # Should still only have one record
        assert AffectedUser.objects.filter(breach=breach, user=user).count() == 1

    def test_assess_impact_returns_breach(self, user_factory):
        """Test assess_impact returns the updated breach."""
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-206",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        user = user_factory()

        result = BreachNotificationService.assess_impact(
            breach,
            affected_user_ids=[user.id],
            data_types=["email"],
        )

        assert result == breach
        assert result.affected_users_count == 1


@pytest.mark.django_db
class TestBreachNotificationServiceNotifyNPC:
    """Unit tests for BreachNotificationService.notify_npc method."""

    def test_notify_npc_sends_email_to_dpo(self, settings):
        """Test notify_npc sends email to DPO."""
        settings.DPO_EMAIL = "dpo@company.com"
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-300",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )

        BreachNotificationService.notify_npc(breach)

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["dpo@company.com"]
        assert "NPC Breach Notification" in mail.outbox[0].subject
        assert breach.breach_id in mail.outbox[0].subject

    def test_notify_npc_creates_notification_record(self, settings):
        """Test notify_npc creates a BreachNotification record."""
        settings.DPO_EMAIL = "dpo@company.com"
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-301",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )

        BreachNotificationService.notify_npc(breach)

        notification = BreachNotification.objects.get(breach=breach)
        assert notification.notification_type == "NPC_INITIAL"
        assert notification.recipient == BreachNotificationService.NPC_EMAIL
        assert notification.delivery_status == "PENDING_MANUAL_SUBMISSION"

    def test_notify_npc_updates_breach_flags(self, settings):
        """Test notify_npc updates breach notification flags."""
        settings.DPO_EMAIL = "dpo@company.com"
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-302",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
            npc_notified=False,
        )

        BreachNotificationService.notify_npc(breach)

        breach.refresh_from_db()
        assert breach.npc_notified is True
        assert breach.npc_notified_at is not None
        assert breach.status == "NOTIFYING"

    def test_notify_npc_skips_if_already_notified(self, settings):
        """Test notify_npc does nothing if NPC already notified."""
        settings.DPO_EMAIL = "dpo@company.com"
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-303",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
            npc_notified=True,
            npc_notified_at=timezone.now(),
        )

        BreachNotificationService.notify_npc(breach)

        # No email should be sent
        assert len(mail.outbox) == 0
        # No new notification records
        assert BreachNotification.objects.filter(breach=breach).count() == 0

    def test_notify_npc_content_includes_required_info(self, settings):
        """Test NPC notification content includes required information."""
        settings.DPO_EMAIL = "dpo@company.com"
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"
        settings.DPO_PHONE = "+1234567890"

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-304",
            title="Test Breach",
            description="Detailed description of breach",
            breach_type="UNAUTHORIZED_ACCESS",
            severity="CRITICAL",
            detected_at=timezone.now(),
            data_types_affected=["email", "phone"],
            involves_spi=True,
            affected_users_count=100,
        )

        BreachNotificationService.notify_npc(breach)

        notification = BreachNotification.objects.get(breach=breach)
        content = notification.content

        # Check required NPC Circular 16-03 fields
        assert "PERSONAL DATA BREACH NOTIFICATION" in content
        assert "NPC Circular No. 16-03" in content
        assert "PERSONAL INFORMATION CONTROLLER" in content
        assert "DATE AND TIME OF BREACH" in content
        assert "NATURE OF BREACH" in content
        assert "PERSONAL DATA INVOLVED" in content
        assert "NUMBER OF AFFECTED DATA SUBJECTS" in content
        assert "Unauthorized Access" in content
        assert "100" in content


@pytest.mark.django_db
class TestBreachNotificationServiceNotifyAffectedUsers:
    """Unit tests for BreachNotificationService.notify_affected_users method."""

    def test_notify_affected_users_sends_emails(self, user_factory, settings):
        """Test notify_affected_users sends emails to affected users."""
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"
        settings.DPO_EMAIL = "dpo@company.com"

        user1 = user_factory(email="user1@example.com")
        user2 = user_factory(email="user2@example.com")

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-400",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )

        AffectedUser.objects.create(breach=breach, user=user1, data_exposed=["email"])
        AffectedUser.objects.create(breach=breach, user=user2, data_exposed=["email", "phone"])

        BreachNotificationService.notify_affected_users(breach)

        assert len(mail.outbox) == 2
        recipients = [email.to[0] for email in mail.outbox]
        assert "user1@example.com" in recipients
        assert "user2@example.com" in recipients

    def test_notify_affected_users_creates_notification_records(self, user_factory, settings):
        """Test notify_affected_users creates notification records."""
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"
        settings.DPO_EMAIL = "dpo@company.com"

        user = user_factory(email="user@example.com")
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-401",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        AffectedUser.objects.create(breach=breach, user=user, data_exposed=["email"])

        BreachNotificationService.notify_affected_users(breach)

        notification = BreachNotification.objects.get(breach=breach, notification_type="USER_EMAIL")
        assert notification.recipient == "user@example.com"
        assert notification.delivery_status == "SENT"

    def test_notify_affected_users_marks_users_as_notified(self, user_factory, settings):
        """Test notify_affected_users marks affected users as notified."""
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"
        settings.DPO_EMAIL = "dpo@company.com"

        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-402",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        affected = AffectedUser.objects.create(breach=breach, user=user, data_exposed=["email"])

        BreachNotificationService.notify_affected_users(breach)

        affected.refresh_from_db()
        assert affected.notified is True
        assert affected.notified_at is not None

    def test_notify_affected_users_updates_breach_when_all_notified(self, user_factory, settings):
        """Test breach flags are updated when all users notified."""
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"
        settings.DPO_EMAIL = "dpo@company.com"

        user = user_factory()
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-403",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
            users_notified=False,
        )
        AffectedUser.objects.create(breach=breach, user=user, data_exposed=["email"])

        BreachNotificationService.notify_affected_users(breach)

        breach.refresh_from_db()
        assert breach.users_notified is True
        assert breach.users_notified_at is not None

    def test_notify_affected_users_skips_already_notified(self, user_factory, settings):
        """Test notify_affected_users skips already notified users."""
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"
        settings.DPO_EMAIL = "dpo@company.com"

        user1 = user_factory(email="already@example.com")
        user2 = user_factory(email="pending@example.com")

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-404",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        AffectedUser.objects.create(
            breach=breach, user=user1, data_exposed=["email"], notified=True, notified_at=timezone.now()
        )
        AffectedUser.objects.create(breach=breach, user=user2, data_exposed=["email"], notified=False)

        BreachNotificationService.notify_affected_users(breach)

        # Only one email should be sent (to pending user)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["pending@example.com"]

    def test_notify_affected_users_content_includes_exposed_data(self, user_factory, settings):
        """Test user notification content includes exposed data types."""
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"
        settings.DPO_EMAIL = "dpo@company.com"

        user = user_factory(first_name="John")
        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-405",
            title="Test Breach",
            description="Breach description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
            containment_actions="Actions taken",
        )
        AffectedUser.objects.create(breach=breach, user=user, data_exposed=["email", "phone", "address"])

        BreachNotificationService.notify_affected_users(breach)

        notification = BreachNotification.objects.get(breach=breach)
        content = notification.content

        assert "John" in content
        assert "WHAT HAPPENED" in content
        assert "WHAT INFORMATION WAS INVOLVED" in content
        assert "Email" in content
        assert "Phone" in content
        assert "Address" in content

    def test_notify_affected_users_handles_email_failure(self, user_factory, settings, mocker):
        """Test notify_affected_users handles email sending failures."""
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"
        settings.DPO_EMAIL = "dpo@company.com"

        user1 = user_factory(email="fail@example.com")
        user2 = user_factory(email="success@example.com")

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-406",
            title="Test Breach",
            description="Description",
            breach_type="DATA_LEAK",
            severity="HIGH",
            detected_at=timezone.now(),
        )
        AffectedUser.objects.create(breach=breach, user=user1, data_exposed=["email"])
        AffectedUser.objects.create(breach=breach, user=user2, data_exposed=["email"])

        # Mock send_mail to fail for first user
        original_send_mail = mail.send_mail
        call_count = [0]

        def mock_send_mail(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise Exception("Email failed")
            return original_send_mail(*args, **kwargs)

        mocker.patch("core.domains.security.services.send_mail", side_effect=mock_send_mail)

        # Should not raise exception
        BreachNotificationService.notify_affected_users(breach)

        # First user should not be marked as notified
        affected1 = AffectedUser.objects.get(breach=breach, user=user1)
        assert affected1.notified is False


@pytest.mark.django_db
class TestBreachNotificationServiceInternalAlert:
    """Unit tests for internal alert functionality."""

    def test_send_internal_alert_sends_email(self, mocker, settings):
        """Test _send_internal_alert sends email to security team."""
        settings.SECURITY_TEAM_EMAIL = "security@company.com"
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-500",
            title="Alert Test",
            description="Test description",
            breach_type="SYSTEM_COMPROMISE",
            severity="CRITICAL",
            detected_at=timezone.now(),
        )

        BreachNotificationService._send_internal_alert(breach)

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["security@company.com"]
        assert "[ALERT]" in mail.outbox[0].subject
        assert breach.breach_id in mail.outbox[0].subject

    def test_send_internal_alert_skips_when_no_email_configured(self, mocker, settings):
        """Test _send_internal_alert skips when SECURITY_TEAM_EMAIL not set."""
        settings.SECURITY_TEAM_EMAIL = None

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-501",
            title="Alert Test",
            description="Test description",
            breach_type="SYSTEM_COMPROMISE",
            severity="CRITICAL",
            detected_at=timezone.now(),
        )

        # Should not raise exception
        BreachNotificationService._send_internal_alert(breach)

        # No email should be sent
        assert len(mail.outbox) == 0

    def test_send_internal_alert_content_includes_details(self, settings):
        """Test internal alert includes breach details."""
        settings.SECURITY_TEAM_EMAIL = "security@company.com"
        settings.DEFAULT_FROM_EMAIL = "noreply@company.com"

        breach = SecurityBreach.objects.create(
            breach_id="BREACH-2025-502",
            title="Critical Security Breach",
            description="Detailed breach description",
            breach_type="RANSOMWARE",
            severity="CRITICAL",
            detected_at=timezone.now(),
        )

        BreachNotificationService._send_internal_alert(breach)

        email_body = mail.outbox[0].body
        assert "BREACH-2025-502" in email_body
        assert "CRITICAL" in email_body
        assert "Ransomware" in email_body
        assert "Detailed breach description" in email_body
