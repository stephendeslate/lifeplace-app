# backend/core/domains/settings/views.py

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AppSettings, CurrencySettings
from .serializers import (
    CurrencySettingsSerializer,
    CurrencySettingsCreateSerializer,
    CurrencySettingsUpdateSerializer,
    SystemCurrencySettingsSerializer,
    SupportedCurrenciesSerializer,
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