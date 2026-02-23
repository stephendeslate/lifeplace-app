# backend/core/domains/settings/views.py

import logging

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from packaging import version as semver

from core.utils.permissions import CanManageCompanySettings, CanManageFinancialSettings, IsAdmin

from .models import CompanySettings, CurrencySettings, LegalDocument, MobileAppVersion
from .serializers import (
    CompanySettingsSerializer,
    CurrencySettingsCreateSerializer,
    CurrencySettingsSerializer,
    CurrencySettingsUpdateSerializer,
    LegalDocumentSerializer,
    LegalDocumentUpdateSerializer,
    PublicCompanySettingsSerializer,
    PublicLegalDocumentSerializer,
    SystemCurrencySettingsSerializer,
)
from .services import CurrencySettingsService

logger = logging.getLogger(__name__)


class CurrencySettingsView(APIView):
    """API for managing currency settings"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get user's currency settings"""
        try:
            settings = CurrencySettingsService.get_user_settings(request.user)
            serializer = CurrencySettingsSerializer(settings)
            return Response(
                {"success": True, "data": serializer.data, "message": "Currency settings retrieved successfully"}
            )
        except Exception as e:
            logger.error(f"Failed to get currency settings: {e}")
            return Response(
                {"success": False, "message": "Failed to retrieve currency settings"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request):
        """Update user currency settings"""
        try:
            # Get or create settings
            try:
                settings = CurrencySettings.objects.get(user=request.user)
                settings_id = settings.id
                is_new = False
            except CurrencySettings.DoesNotExist:
                is_new = True

            if is_new:
                serializer = CurrencySettingsCreateSerializer(data=request.data)
                if serializer.is_valid():
                    settings = CurrencySettingsService.create_currency_settings(
                        data=serializer.validated_data, user=request.user
                    )
                    response_serializer = CurrencySettingsSerializer(settings)
                    return Response(
                        {
                            "success": True,
                            "data": response_serializer.data,
                            "message": "Currency settings created successfully",
                        },
                        status=status.HTTP_201_CREATED,
                    )
                else:
                    return Response(
                        {"success": False, "message": "Invalid data", "errors": serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                serializer = CurrencySettingsUpdateSerializer(data=request.data)
                if serializer.is_valid():
                    updated_settings = CurrencySettingsService.update_currency_settings(
                        settings_id=settings_id, data=serializer.validated_data, user=request.user
                    )
                    response_serializer = CurrencySettingsSerializer(updated_settings)
                    return Response(
                        {
                            "success": True,
                            "data": response_serializer.data,
                            "message": "Currency settings updated successfully",
                        }
                    )
                else:
                    return Response(
                        {"success": False, "message": "Invalid data", "errors": serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        except Exception as e:
            logger.error(f"Failed to update currency settings: {e}")
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Reset currency settings to defaults"""
        try:
            settings = CurrencySettingsService.reset_to_defaults(user=request.user)
            serializer = CurrencySettingsSerializer(settings)
            return Response(
                {"success": True, "data": serializer.data, "message": "Currency settings reset to defaults"}
            )
        except Exception as e:
            logger.error(f"Failed to reset currency settings: {e}")
            return Response(
                {"success": False, "message": "Failed to reset currency settings"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SystemCurrencySettingsView(APIView):
    """API for system-wide currency settings (admin only)"""

    permission_classes = [permissions.IsAuthenticated, CanManageFinancialSettings]

    def get(self, request):
        """Get system-wide currency settings"""
        try:
            settings = CurrencySettingsService.get_system_settings()
            serializer = CurrencySettingsSerializer(settings)
            return Response(
                {"success": True, "data": serializer.data, "message": "System currency settings retrieved successfully"}
            )
        except Exception as e:
            logger.error(f"Failed to get system currency settings: {e}")
            return Response(
                {"success": False, "message": "Failed to retrieve system currency settings"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request):
        """Update system-wide currency settings"""
        try:
            serializer = SystemCurrencySettingsSerializer(data=request.data)
            if serializer.is_valid():
                settings = CurrencySettingsService.update_system_settings(data=serializer.validated_data)
                response_serializer = CurrencySettingsSerializer(settings)
                return Response(
                    {
                        "success": True,
                        "data": response_serializer.data,
                        "message": "System currency settings updated successfully",
                    }
                )
            return Response(
                {"success": False, "message": "Invalid data", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Failed to update system currency settings: {e}")
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def supported_currencies_view(request):
    """Get list of supported currencies"""
    try:
        currencies = CurrencySettingsService.get_supported_currencies()
        return Response({"success": True, "data": currencies, "message": "Supported currencies retrieved successfully"})
    except Exception as e:
        logger.error(f"Failed to get supported currencies: {e}")
        return Response(
            {"success": False, "message": "Failed to retrieve supported currencies"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def currency_format_settings_view(request):
    """Get currency formatting settings"""
    try:
        format_settings = CurrencySettingsService.get_currency_format_settings(request.user)
        return Response(
            {"success": True, "data": format_settings, "message": "Currency format settings retrieved successfully"}
        )
    except Exception as e:
        logger.error(f"Failed to get currency format settings: {e}")
        return Response(
            {"success": False, "message": "Failed to retrieve currency format settings"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class LegalDocumentViewSet(APIView):
    """API for managing legal documents (admin only)"""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request, document_type=None):
        """Get legal documents - list or detail"""
        try:
            if document_type:
                # Get specific document by type (auto-creates if not exists)
                document = LegalDocument.get_document(document_type)
                serializer = LegalDocumentSerializer(document)
                return Response(
                    {"success": True, "data": serializer.data, "message": "Legal document retrieved successfully"}
                )
            else:
                # Get all documents - auto-create both document types if they don't exist
                LegalDocument.get_terms_of_service()
                LegalDocument.get_privacy_policy()

                documents = LegalDocument.objects.all().order_by("document_type")
                serializer = LegalDocumentSerializer(documents, many=True)
                return Response(
                    {"success": True, "data": serializer.data, "message": "Legal documents retrieved successfully"}
                )
        except ValueError as e:
            # Invalid document type
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to get legal documents: {e}")
            return Response(
                {"success": False, "message": "Failed to retrieve legal documents"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request, document_type=None):
        """Update a legal document"""
        if not document_type:
            return Response(
                {"success": False, "message": "Document type is required for updates"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate document type before proceeding
        valid_types = LegalDocument.get_valid_document_types()
        if document_type not in valid_types:
            return Response(
                {
                    "success": False,
                    "message": f"Invalid document type: '{document_type}'. Must be one of: {valid_types}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get or create the document
            document = LegalDocument.get_document(document_type)

            # Validate and update
            serializer = LegalDocumentUpdateSerializer(data=request.data, partial=True)
            if serializer.is_valid():
                # Update fields
                for field, value in serializer.validated_data.items():
                    setattr(document, field, value)

                # Set last_updated_by to current user
                document.last_updated_by = request.user
                document.save()

                # Return updated document
                response_serializer = LegalDocumentSerializer(document)
                return Response(
                    {
                        "success": True,
                        "data": response_serializer.data,
                        "message": "Legal document updated successfully",
                    }
                )
            else:
                return Response(
                    {"success": False, "message": "Invalid data", "errors": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to update legal document: {e}")
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PublicLegalDocumentView(APIView):
    """Public API for viewing published legal documents"""

    permission_classes = [permissions.AllowAny]

    def get(self, request, document_type):
        """Get a published legal document"""
        try:
            # Try to get the document
            try:
                document = LegalDocument.objects.get(document_type=document_type)
            except LegalDocument.DoesNotExist:
                return Response({"success": False, "message": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

            # Check if document is published
            if not document.is_published:
                return Response(
                    {"success": False, "message": "Document not published"}, status=status.HTTP_404_NOT_FOUND
                )

            # Return published document
            serializer = PublicLegalDocumentSerializer(document)
            return Response(
                {"success": True, "data": serializer.data, "message": "Legal document retrieved successfully"}
            )
        except Exception as e:
            logger.error(f"Failed to get public legal document: {e}")
            return Response(
                {"success": False, "message": "Failed to retrieve legal document"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CompanySettingsView(APIView):
    """
    API for managing company settings (singleton).
    Used for branding, contact info, and PDF generation context.
    """

    permission_classes = [permissions.IsAuthenticated, CanManageCompanySettings]

    def get(self, request):
        """Get company settings (admin view with all fields)"""
        try:
            settings = CompanySettings.get_settings()
            serializer = CompanySettingsSerializer(settings)
            return Response(
                {"success": True, "data": serializer.data, "message": "Company settings retrieved successfully"}
            )
        except Exception as e:
            logger.error(f"Failed to get company settings: {e}")
            return Response(
                {"success": False, "message": "Failed to retrieve company settings"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request):
        """Update company settings"""
        try:
            settings = CompanySettings.get_settings()
            serializer = CompanySettingsSerializer(settings, data=request.data, partial=True)

            if serializer.is_valid():
                serializer.save()
                return Response(
                    {"success": True, "data": serializer.data, "message": "Company settings updated successfully"}
                )
            else:
                return Response(
                    {"success": False, "message": "Invalid data", "errors": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            logger.error(f"Failed to update company settings: {e}")
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PublicCompanySettingsView(APIView):
    """
    Public API for company branding information.
    Used by client-facing applications (excludes sensitive data).
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Get public company settings"""
        try:
            settings = CompanySettings.get_settings()
            serializer = PublicCompanySettingsSerializer(settings)
            return Response(
                {"success": True, "data": serializer.data, "message": "Company information retrieved successfully"}
            )
        except Exception as e:
            logger.error(f"Failed to get public company settings: {e}")
            return Response(
                {"success": False, "message": "Failed to retrieve company information"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MobileVersionCheckThrottle(AnonRateThrottle):
    """Rate limiting for mobile version check endpoint"""

    rate = "100/hour"


class MobileVersionCheckView(APIView):
    """
    Public endpoint for mobile app version checking.

    GET /api/mobile/version/?platform=ios&current_version=1.0.0
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [MobileVersionCheckThrottle]

    def get(self, request):
        platform = request.query_params.get("platform", "ios")
        current_version_str = request.query_params.get("current_version", "0.0.0")

        # Get active config for platform (or 'all')
        config = MobileAppVersion.objects.filter(platform__in=[platform, "all"], is_active=True).first()

        # No config - allow app to proceed
        if not config:
            return Response(
                {
                    "status": "ok",
                    "update_required": False,
                    "update_recommended": False,
                    "force_update": False,
                    "feature_flags": {},
                }
            )

        # Check maintenance mode first
        if config.is_maintenance_mode:
            return Response(
                {
                    "status": "maintenance",
                    "update_required": False,
                    "update_recommended": False,
                    "force_update": False,
                    "feature_flags": config.feature_flags or {},
                    "maintenance": {
                        "is_maintenance": True,
                        "message": config.maintenance_message,
                        "expected_end": config.maintenance_end.isoformat() if config.maintenance_end else None,
                    },
                }
            )

        # Parse and compare versions
        try:
            current = semver.parse(current_version_str)
            minimum = semver.parse(config.minimum_required_version)
            recommended = semver.parse(config.recommended_version)
        except Exception:
            return Response(
                {"status": "error", "message": "Invalid version format"}, status=status.HTTP_400_BAD_REQUEST
            )

        update_required = current < minimum
        update_recommended = current < recommended

        # Check deprecation
        is_deprecated = False
        if config.deprecation_date:
            is_deprecated = timezone.now().date() >= config.deprecation_date

        return Response(
            {
                "status": "update_required" if update_required else ("deprecated" if is_deprecated else "ok"),
                "platform": platform,
                "version_info": {
                    "minimum_required": config.minimum_required_version,
                    "recommended": config.recommended_version,
                    "latest": config.latest_version,
                    "current": current_version_str,
                },
                "update_required": update_required,
                "update_recommended": update_recommended,
                "force_update": update_required,
                "update_urls": {"ios": config.ios_store_url, "android": config.android_store_url},
                "messages": {
                    "update_title": config.update_title,
                    "update_message": config.update_message,
                    "force_title": config.force_title,
                    "force_message": config.force_message,
                },
                "deprecation": {
                    "is_deprecated": is_deprecated,
                    "deprecation_date": config.deprecation_date.isoformat() if config.deprecation_date else None,
                    "sunset_date": config.sunset_date.isoformat() if config.sunset_date else None,
                    "message": config.deprecation_message,
                },
                "feature_flags": config.feature_flags or {},
                "maintenance": {"is_maintenance": False, "message": None, "expected_end": None},
            }
        )
