import logging

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..dpa_service import DataSubjectRightsService
from ..models import ConsentRecord, PrivacyRequest
from ..throttling import (
    AccountDeletionThrottle,
    ConsentManagementThrottle,
    DataAccessThrottle,
    DataCorrectionThrottle,
    DataExportThrottle,
    ProcessingObjectionThrottle,
)

logger = logging.getLogger(__name__)


# ============================================================================
# DPA Compliance Views - Data Subject Rights
# ============================================================================


class DataAccessView(APIView):
    """
    GET /api/users/me/data/
    Right to Access - View all personal data
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [DataAccessThrottle]

    def get(self, request):
        report = DataSubjectRightsService.generate_data_access_report(request.user)

        # Log the access request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type="ACCESS",
            status="COMPLETED",
            processed_at=timezone.now(),
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(report)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class DataExportView(APIView):
    """
    GET /api/users/me/export/?export_format=json
    Right to Portability - Export personal data
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [DataExportThrottle]  # Limit to 1/day

    def get(self, request):
        # Use 'export_format' instead of 'format' to avoid DRF content negotiation conflict
        export_format = request.query_params.get("export_format", "json")

        if export_format not in ["json", "csv"]:
            return Response({"error": "Invalid format. Use 'json' or 'csv'"}, status=status.HTTP_400_BAD_REQUEST)

        content, filename, content_type = DataSubjectRightsService.generate_data_export(request.user, export_format)

        # Log the export request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type="EXPORT",
            status="COMPLETED",
            processed_at=timezone.now(),
            response_data={"format": export_format, "filename": filename},
        )

        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class AccountDeletionView(APIView):
    """
    DELETE /api/users/me/
    Right to Erasure - Delete account
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AccountDeletionThrottle]

    def delete(self, request):
        user = request.user

        # Validate request body
        confirmation = request.data.get("confirmation")
        password = request.data.get("password")

        if confirmation != "DELETE MY ACCOUNT":
            return Response({"error": "Please type 'DELETE MY ACCOUNT' to confirm"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(password):
            return Response({"error": "Invalid password"}, status=status.HTTP_400_BAD_REQUEST)

        # Check for blockers
        blockers = DataSubjectRightsService.check_deletion_blockers(user)

        if blockers:
            return Response(
                {
                    "status": "blocked",
                    "message": "Deletion cannot proceed due to active obligations.",
                    "blocking_reasons": blockers,
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Create privacy request record
        privacy_request = PrivacyRequest.objects.create(
            user=user,
            user_email=user.email,
            request_type="DELETION",
            status="PROCESSING",
            request_data={"reason": request.data.get("reason", "")},
        )

        # Process deletion
        summary = DataSubjectRightsService.process_deletion(user, request)

        # Update privacy request
        privacy_request.status = "COMPLETED"
        privacy_request.processed_at = timezone.now()
        privacy_request.deletion_summary = summary
        privacy_request.save()

        return Response(
            {
                "status": "completed",
                "request_id": str(privacy_request.id),
                "message": "Your account has been deleted.",
                "actions": summary,
                "appeal_contact": settings.DPO_EMAIL,
            }
        )


class DataCorrectionView(APIView):
    """
    PATCH /api/users/me/correct/
    Right to Correction - Correct personal data
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [DataCorrectionThrottle]

    def patch(self, request):
        corrections = request.data.get("corrections", [])

        if not corrections:
            return Response({"error": "No corrections provided"}, status=status.HTTP_400_BAD_REQUEST)

        results = DataSubjectRightsService.process_correction(request.user, corrections)

        # Log the correction request
        PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type="CORRECTION",
            status="COMPLETED",
            processed_at=timezone.now(),
            request_data={"corrections": corrections},
            response_data=results,
        )

        return Response(
            {
                "status": "completed",
                "corrections_applied": results["applied"],
                "corrections_pending": results["pending"],
                "corrections_rejected": results["rejected"],
                "third_party_notification": "Corrected data will be shared with relevant third parties within 30 days.",
            }
        )


class ProcessingObjectionView(APIView):
    """
    POST /api/users/me/object/
    Right to Object - Object to processing
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ProcessingObjectionThrottle]

    def post(self, request):
        objection_type = request.data.get("objection_type")

        valid_types = ["marketing", "profiling", "analytics", "all_non_essential"]
        if objection_type not in valid_types:
            return Response(
                {"error": f"Invalid objection type. Use one of: {valid_types}"}, status=status.HTTP_400_BAD_REQUEST
            )

        results = DataSubjectRightsService.process_objection(request.user, objection_type)

        # Log the objection
        privacy_request = PrivacyRequest.objects.create(
            user=request.user,
            user_email=request.user.email,
            request_type="OBJECTION",
            status="COMPLETED",
            processed_at=timezone.now(),
            request_data={"objection_type": objection_type},
            response_data=results,
        )

        return Response(
            {
                "status": "accepted",
                "objection_id": str(privacy_request.id),
                "changes_applied": results["changes_applied"],
                "cannot_object": results["cannot_object"],
            }
        )


class ConsentListView(APIView):
    """
    GET /api/users/me/consents/
    View all active consents
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ConsentManagementThrottle]

    def get(self, request):
        user = request.user
        consent_types = [
            ("MARKETING_EMAIL", "Marketing emails", True),
            ("MARKETING_SMS", "Marketing SMS", True),
            ("MARKETING_PUSH", "Marketing push notifications", True),
            ("ANALYTICS", "Usage analytics", True),
            ("THIRD_PARTY_SHARING", "Third-party data sharing", True),
            ("PRIVACY_POLICY", "Privacy Policy", False),
            ("TERMS_OF_SERVICE", "Terms of Service", False),
        ]

        consents = []
        for consent_type, purpose, can_withdraw in consent_types:
            record = ConsentRecord.get_current_consent(user, consent_type)
            consents.append(
                {
                    "consent_type": consent_type,
                    "purpose": purpose,
                    "status": "granted" if (record and record.action == "GRANT") else "not_granted",
                    "granted_at": record.created_at.isoformat() if record else None,
                    "can_withdraw": can_withdraw,
                }
            )

        return Response({"consents": consents})


class ConsentWithdrawView(APIView):
    """
    POST /api/users/me/consents/{consent_type}/withdraw/
    Withdraw a specific consent
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ConsentManagementThrottle]

    def post(self, request, consent_type):
        user = request.user

        # Check if consent can be withdrawn
        non_withdrawable = ["PRIVACY_POLICY", "TERMS_OF_SERVICE"]
        if consent_type in non_withdrawable:
            return Response(
                {"error": "This consent cannot be withdrawn while maintaining an account"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Record withdrawal
        record = ConsentRecord.record_consent(
            user=user, consent_type=consent_type, granted=False, request=request, source="PRIVACY_DASHBOARD"
        )

        return Response(
            {
                "status": "withdrawn",
                "consent_type": consent_type,
                "withdrawn_at": record.created_at.isoformat(),
                "effective_immediately": True,
            }
        )


class PrivacyRequestListView(APIView):
    """
    GET /api/users/me/privacy-requests/
    View status of all privacy requests
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        requests = PrivacyRequest.objects.filter(user=request.user).order_by("-created_at")[:20]

        return Response(
            {
                "requests": [
                    {
                        "id": str(req.id),
                        "type": req.request_type,
                        "status": req.status,
                        "submitted_at": req.created_at.isoformat(),
                        "completed_at": req.processed_at.isoformat() if req.processed_at else None,
                        "response_data": req.response_data if req.status == "COMPLETED" else None,
                    }
                    for req in requests
                ]
            }
        )
