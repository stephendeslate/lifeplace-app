# backend/core/domains/settings/views.py

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import AppSettings, CurrencySettings, LegalDocument
from .serializers import (
    CurrencySettingsSerializer,
    CurrencySettingsCreateSerializer,
    CurrencySettingsUpdateSerializer,
    SystemCurrencySettingsSerializer,
    SupportedCurrenciesSerializer,
    LegalDocumentSerializer,
    LegalDocumentUpdateSerializer,
    PublicLegalDocumentSerializer,
)
from .services import AppSettingsService, CurrencySettingsService
import logging

logger = logging.getLogger(__name__)


class CurrencySettingsView(APIView):
    """API for managing currency settings"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get user's currency settings"""
        try:
            settings = CurrencySettingsService.get_user_settings(request.user)
            serializer = CurrencySettingsSerializer(settings)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': "Currency settings retrieved successfully"
            })
        except Exception as e:
            logger.error(f"Failed to get currency settings: {e}")
            return Response({
                'success': False,
                'message': "Failed to retrieve currency settings"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                        data=serializer.validated_data,
                        user=request.user
                    )
                    response_serializer = CurrencySettingsSerializer(settings)
                    return Response({
                        'success': True,
                        'data': response_serializer.data,
                        'message': "Currency settings created successfully"
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'success': False,
                        'message': "Invalid data",
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                serializer = CurrencySettingsUpdateSerializer(data=request.data)
                if serializer.is_valid():
                    updated_settings = CurrencySettingsService.update_currency_settings(
                        settings_id=settings_id,
                        data=serializer.validated_data,
                        user=request.user
                    )
                    response_serializer = CurrencySettingsSerializer(updated_settings)
                    return Response({
                        'success': True,
                        'data': response_serializer.data,
                        'message': "Currency settings updated successfully"
                    })
                else:
                    return Response({
                        'success': False,
                        'message': "Invalid data",
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Failed to update currency settings: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Reset currency settings to defaults"""
        try:
            settings = CurrencySettingsService.reset_to_defaults(user=request.user)
            serializer = CurrencySettingsSerializer(settings)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': "Currency settings reset to defaults"
            })
        except Exception as e:
            logger.error(f"Failed to reset currency settings: {e}")
            return Response({
                'success': False,
                'message': "Failed to reset currency settings"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SystemCurrencySettingsView(APIView):
    """API for system-wide currency settings (admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get system-wide currency settings"""
        try:
            settings = CurrencySettingsService.get_system_settings()
            serializer = CurrencySettingsSerializer(settings)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': "System currency settings retrieved successfully"
            })
        except Exception as e:
            logger.error(f"Failed to get system currency settings: {e}")
            return Response({
                'success': False,
                'message': "Failed to retrieve system currency settings"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        """Update system-wide currency settings"""
        try:
            serializer = SystemCurrencySettingsSerializer(data=request.data)
            if serializer.is_valid():
                settings = CurrencySettingsService.update_system_settings(
                    data=serializer.validated_data
                )
                response_serializer = CurrencySettingsSerializer(settings)
                return Response({
                    'success': True,
                    'data': response_serializer.data,
                    'message': "System currency settings updated successfully"
                })
            return Response({
                'success': False,
                'message': "Invalid data",
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to update system currency settings: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def supported_currencies_view(request):
    """Get list of supported currencies"""
    try:
        currencies = CurrencySettingsService.get_supported_currencies()
        return Response({
            'success': True,
            'data': currencies,
            'message': 'Supported currencies retrieved successfully'
        })
    except Exception as e:
        logger.error(f"Failed to get supported currencies: {e}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve supported currencies'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def currency_format_settings_view(request):
    """Get currency formatting settings"""
    try:
        format_settings = CurrencySettingsService.get_currency_format_settings(request.user)
        return Response({
            'success': True,
            'data': format_settings,
            'message': 'Currency format settings retrieved successfully'
        })
    except Exception as e:
        logger.error(f"Failed to get currency format settings: {e}")
        return Response({
            'success': False,
            'message': 'Failed to retrieve currency format settings'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LegalDocumentViewSet(APIView):
    """API for managing legal documents (admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, document_type=None):
        """Get legal documents - list or detail"""
        try:
            if document_type:
                # Get specific document by type (auto-creates if not exists)
                document = LegalDocument.get_document(document_type)
                serializer = LegalDocumentSerializer(document)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Legal document retrieved successfully'
                })
            else:
                # Get all documents - auto-create both document types if they don't exist
                LegalDocument.get_terms_of_service()
                LegalDocument.get_privacy_policy()

                documents = LegalDocument.objects.all().order_by('document_type')
                serializer = LegalDocumentSerializer(documents, many=True)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Legal documents retrieved successfully'
                })
        except ValueError as e:
            # Invalid document type
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to get legal documents: {e}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve legal documents'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, document_type=None):
        """Update a legal document"""
        if not document_type:
            return Response({
                'success': False,
                'message': 'Document type is required for updates'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate document type before proceeding
        valid_types = LegalDocument.get_valid_document_types()
        if document_type not in valid_types:
            return Response({
                'success': False,
                'message': f"Invalid document type: '{document_type}'. Must be one of: {valid_types}"
            }, status=status.HTTP_400_BAD_REQUEST)

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
                return Response({
                    'success': True,
                    'data': response_serializer.data,
                    'message': 'Legal document updated successfully'
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Invalid data',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to update legal document: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


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
                return Response({
                    'success': False,
                    'message': 'Document not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if document is published
            if not document.is_published:
                return Response({
                    'success': False,
                    'message': 'Document not published'
                }, status=status.HTTP_404_NOT_FOUND)

            # Return published document
            serializer = PublicLegalDocumentSerializer(document)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Legal document retrieved successfully'
            })
        except Exception as e:
            logger.error(f"Failed to get public legal document: {e}")
            return Response({
                'success': False,
                'message': 'Failed to retrieve legal document'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)