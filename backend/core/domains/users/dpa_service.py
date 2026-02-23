# backend/core/domains/users/dpa_service.py
"""
Data Subject Rights Service
Implements DPA-compliant data access, export, erasure, correction, and objection.
"""

import csv
import io
import json
import logging
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class DataSubjectRightsService:
    """Service for handling Data Subject Rights requests per Philippines DPA"""

    # Fields that can be corrected by user
    CORRECTABLE_FIELDS = ["first_name", "last_name", "phone", "company"]

    # Fields that require verification to change
    VERIFICATION_REQUIRED_FIELDS = ["email"]

    # Data types for third-party sharing disclosure
    THIRD_PARTY_DISCLOSURES = [
        {
            "recipient": "Stripe Inc.",
            "purpose": "Payment processing",
            "data_shared": ["email", "name", "payment details"],
        },
        {
            "recipient": "Brevo (Sendinblue)",
            "purpose": "Email and SMS communications",
            "data_shared": ["email", "name", "phone"],
        },
        {"recipient": "Expo", "purpose": "Push notifications", "data_shared": ["device tokens"]},
    ]

    @classmethod
    def generate_data_access_report(cls, user) -> dict:
        """
        Generate comprehensive data access report for Right to Access.
        Returns all personal data collected about the user.
        """
        from core.domains.contracts.models import EventContract
        from core.domains.events.models import Event
        from core.domains.notifications.models import DevicePushToken, NotificationPreference
        from core.domains.payments.models import Payment
        from core.domains.questionnaires.models import QuestionnaireResponse

        report = {
            "request_id": str(uuid.uuid4()),
            "generated_at": timezone.now().isoformat(),
            "data_subject": {"id": user.id, "email": user.email},
            "personal_data": {
                "account": {
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "date_joined": user.date_joined.isoformat(),
                    "last_login": user.last_login.isoformat() if user.last_login else None,
                    "role": user.role,
                },
                "profile": {},
                "events": [],
                "contracts": [],
                "payments": [],
                "questionnaire_responses": [],
                "notification_preferences": {},
                "devices": [],
            },
            "processing_purposes": {
                "account": "Contract fulfillment - providing booking services",
                "events": "Contract fulfillment - event management",
                "payments": "Contract and legal obligation - financial records",
                "marketing": "Consent - promotional communications (if consented)",
            },
            "data_retention": {
                "account": f"{settings.DATA_RETENTION_ACCOUNT} years after account deletion",
                "financial_records": f"{settings.DATA_RETENTION_FINANCIAL} years (BIR requirement)",
                "contracts": f"{settings.DATA_RETENTION_CONTRACTS} years (legal evidentiary value)",
            },
            "third_party_sharing": cls.THIRD_PARTY_DISCLOSURES,
        }

        # Profile data
        if hasattr(user, "profile"):
            profile = user.profile
            report["personal_data"]["profile"] = {
                "phone": profile.phone,
                "company": profile.company,
                "timezone": profile.display_timezone,
            }

        # Events
        events = Event.objects.filter(client=user).values("id", "name", "status", "start_date")
        report["personal_data"]["events"] = list(events)

        # Contracts
        contracts = EventContract.objects.filter(event__client=user).values(
            "id", "event_id", "status", "fully_signed_at"
        )
        report["personal_data"]["contracts"] = list(contracts)

        # Payments
        payments = Payment.objects.filter(event__client=user).values("id", "amount", "currency", "status", "created_at")
        report["personal_data"]["payments"] = list(payments)

        # Questionnaire responses
        responses = QuestionnaireResponse.objects.filter(event__client=user).values(
            "id", "field__name", "value", "created_at"
        )
        report["personal_data"]["questionnaire_responses"] = list(responses)

        # Notification preferences
        try:
            prefs = NotificationPreference.objects.get(user=user)
            report["personal_data"]["notification_preferences"] = {
                "email_enabled": prefs.email_enabled,
                "sms_enabled": prefs.sms_enabled,
                "push_enabled": prefs.push_enabled,
                "marketing_email": prefs.marketing_email,
                "marketing_sms": prefs.marketing_sms,
                "marketing_push": prefs.marketing_push,
            }
        except NotificationPreference.DoesNotExist:
            pass

        # Devices
        devices = DevicePushToken.objects.filter(user=user, is_active=True).values(
            "device_type", "device_name", "created_at", "last_used_at"
        )
        report["personal_data"]["devices"] = list(devices)

        return report

    @classmethod
    def generate_data_export(cls, user, format="json") -> tuple:
        """
        Generate portable data export for Right to Portability.
        Returns (content, filename, content_type)
        """
        report = cls.generate_data_access_report(user)

        # Restructure for portability
        export_data = {
            "export_metadata": {"generated_at": report["generated_at"], "format": format, "schema_version": "1.0"},
            "user": report["personal_data"]["account"],
            "profile": report["personal_data"]["profile"],
            "events": report["personal_data"]["events"],
            "payments": report["personal_data"]["payments"],
            "questionnaire_responses": report["personal_data"]["questionnaire_responses"],
            "notification_preferences": report["personal_data"]["notification_preferences"],
        }

        timestamp = timezone.now().strftime("%Y-%m-%d")

        if format == "json":
            content = json.dumps(export_data, indent=2, default=str)
            filename = f"lifeplace_data_export_{timestamp}.json"
            content_type = "application/json"
        elif format == "csv":
            # Flatten for CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # User data
            writer.writerow(["Section", "Field", "Value"])
            for field, value in export_data["user"].items():
                writer.writerow(["Account", field, value])
            for field, value in export_data["profile"].items():
                writer.writerow(["Profile", field, value])

            content = output.getvalue()
            filename = f"lifeplace_data_export_{timestamp}.csv"
            content_type = "text/csv"
        else:
            raise ValueError(f"Unsupported format: {format}")

        return content, filename, content_type

    @classmethod
    def check_deletion_blockers(cls, user) -> list:
        """
        Check for conditions that block account deletion.
        Returns list of blocking reasons.
        """
        from core.domains.events.models import Event
        from core.domains.payments.models import Invoice

        blockers = []

        # Check for unpaid invoices
        unpaid = Invoice.objects.filter(event__client=user, status__in=["PENDING", "OVERDUE"]).aggregate(
            count=models.Count("id"), total=models.Sum("total_amount")
        )

        if unpaid["count"] and unpaid["count"] > 0:
            blockers.append(
                {
                    "type": "unpaid_invoice",
                    "description": f"You have {unpaid['count']} unpaid invoice(s) totaling {unpaid['total']}",
                    "resolution": "Please settle outstanding payments before requesting deletion",
                }
            )

        # Check for upcoming events
        upcoming = Event.objects.filter(
            client=user, start_date__gt=timezone.now(), status__in=["CONFIRMED", "IN_PROGRESS"]
        ).first()

        if upcoming:
            blockers.append(
                {
                    "type": "upcoming_event",
                    "description": f"You have an event scheduled for {upcoming.start_date.date()}",
                    "resolution": "Please cancel or complete the event before requesting deletion",
                }
            )

        return blockers

    @classmethod
    @transaction.atomic
    def process_deletion(cls, user, request=None) -> dict:
        """
        Process account deletion with proper anonymization.
        Returns summary of actions taken.
        """
        from core.domains.bookingflow.models import BookingSession
        from core.domains.contracts.models import EventContract
        from core.domains.events.models import Event
        from core.domains.notifications.models import DevicePushToken, NotificationPreference
        from core.domains.payments.models import Payment

        summary = {"deleted": [], "anonymized": [], "retained": []}

        user_email = user.email
        user_id = user.id

        # 1. Delete device tokens
        DevicePushToken.objects.filter(user=user).delete()
        summary["deleted"].append("Device tokens")

        # 2. Delete notification preferences
        NotificationPreference.objects.filter(user=user).delete()
        summary["deleted"].append("Notification preferences")

        # 3. Anonymize booking sessions
        BookingSession.objects.filter(client=user).update(
            client=None,
            booking_data={},  # Clear PII
        )
        summary["anonymized"].append("Booking sessions")

        # 4. Anonymize event references (keep event for venue records)
        Event.objects.filter(client=user).update(
            client=None,
            # Keep event data but remove client reference
        )
        summary["anonymized"].append("Event records (client reference removed)")

        # 5. Retain financial records with note
        payment_count = Payment.objects.filter(event__client_id=user_id).count()
        contract_count = EventContract.objects.filter(event__client_id=user_id).count()

        retention_date = timezone.now() + timedelta(days=365 * settings.DATA_RETENTION_FINANCIAL)

        if payment_count > 0:
            summary["retained"].append(
                {
                    "data": "Payment records",
                    "count": payment_count,
                    "reason": f"Legal obligation (BIR - {settings.DATA_RETENTION_FINANCIAL} year retention)",
                    "retention_until": retention_date.date().isoformat(),
                }
            )

        if contract_count > 0:
            summary["retained"].append(
                {
                    "data": "Contract signatures",
                    "count": contract_count,
                    "reason": f"Legal evidentiary value ({settings.DATA_RETENTION_CONTRACTS} year retention)",
                    "retention_until": retention_date.date().isoformat(),
                }
            )

        # 6. Delete user account
        user.is_active = False
        user.email = f"deleted_{user_id}@deleted.local"
        user.first_name = "Deleted"
        user.last_name = "User"
        user.save()

        # Also anonymize profile
        if hasattr(user, "profile"):
            user.profile.phone = ""
            user.profile.company = ""
            user.profile.save()

        summary["deleted"].append("User account")
        summary["deleted"].append("Profile information")

        # 7. Log the deletion
        logger.info(
            f"User deletion processed: {user_email} (ID: {user_id})",
            extra={"user_id": user_id, "email": user_email, "summary": summary},
        )

        return summary

    @classmethod
    def process_correction(cls, user, corrections: list) -> dict:
        """
        Process data correction requests.
        Returns results of corrections.
        """
        results = {"applied": [], "pending": [], "rejected": []}

        for correction in corrections:
            field = correction.get("field")
            new_value = correction.get("corrected_value")

            if field in cls.CORRECTABLE_FIELDS:
                # Direct update
                if field in ["first_name", "last_name"]:
                    setattr(user, field, new_value)
                elif field in ["phone", "company"] and hasattr(user, "profile"):
                    setattr(user.profile, field, new_value)

                results["applied"].append(
                    {
                        "field": field,
                        "old_value": correction.get("current_value"),
                        "new_value": new_value,
                        "applied_at": timezone.now().isoformat(),
                    }
                )

            elif field in cls.VERIFICATION_REQUIRED_FIELDS:
                # Requires verification (e.g., email)
                results["pending"].append(
                    {
                        "field": field,
                        "reason": f"{field.title()} change requires verification. Check your new {field} for a verification link.",
                    }
                )

            else:
                results["rejected"].append({"field": field, "reason": "This field cannot be corrected by user request"})

        # Save changes
        user.save()
        if hasattr(user, "profile"):
            user.profile.save()

        return results

    @classmethod
    def process_objection(cls, user, objection_type: str) -> dict:
        """
        Process objection to processing.
        Returns changes applied.
        """
        from core.domains.notifications.models import NotificationPreference
        from core.domains.users.models import ConsentRecord

        changes = {}

        prefs, _ = NotificationPreference.objects.get_or_create(user=user)

        if objection_type in ["marketing", "all_non_essential"]:
            prefs.marketing_email = False
            prefs.marketing_sms = False
            prefs.marketing_push = False
            changes.update({"marketing_email": False, "marketing_sms": False, "marketing_push": False})

            # Record consent withdrawal
            for consent_type in ["MARKETING_EMAIL", "MARKETING_SMS", "MARKETING_PUSH"]:
                ConsentRecord.record_consent(
                    user=user, consent_type=consent_type, granted=False, source="PRIVACY_DASHBOARD"
                )

        if objection_type in ["analytics", "all_non_essential"]:
            # Disable analytics tracking
            changes["analytics_tracking"] = False
            ConsentRecord.record_consent(user=user, consent_type="ANALYTICS", granted=False, source="PRIVACY_DASHBOARD")

        prefs.save()

        # Things user cannot object to
        cannot_object = [
            {"processing": "Contract fulfillment", "reason": "Necessary for providing booked services"},
            {"processing": "Legal obligations", "reason": "Required by law (BIR, NPC)"},
        ]

        return {"changes_applied": changes, "cannot_object": cannot_object}
