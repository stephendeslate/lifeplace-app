# backend/core/domains/analytics/views_client.py
"""
Client-facing analytics API views.
All views require authentication and scope data to the authenticated client.
"""
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .services import ClientAnalyticsService


def parse_date_range(request):
    """Parse date range from query params, defaulting to last year."""
    end_date = request.query_params.get('end_date')
    start_date = request.query_params.get('start_date')

    if end_date:
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            if timezone.is_naive(end_date):
                end_date = timezone.make_aware(end_date)
        except ValueError:
            end_date = timezone.now()
    else:
        end_date = timezone.now()

    if start_date:
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if timezone.is_naive(start_date):
                start_date = timezone.make_aware(start_date)
        except ValueError:
            start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=365)

    return start_date, end_date


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_dashboard(request):
    """
    Get dashboard KPIs for the authenticated client.

    Query params:
        - start_date: ISO date string (default: 1 year ago)
        - end_date: ISO date string (default: now)
    """
    # Ensure user is a client
    if request.user.role != 'CLIENT':
        return Response(
            {'detail': 'This endpoint is only available for clients'},
            status=status.HTTP_403_FORBIDDEN
        )

    start_date, end_date = parse_date_range(request)
    data = ClientAnalyticsService.get_client_dashboard(
        request.user.id, start_date, end_date
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_event_history(request):
    """
    Get event history for the authenticated client.

    Query params:
        - limit: Number of events to return (default: 10)
    """
    if request.user.role != 'CLIENT':
        return Response(
            {'detail': 'This endpoint is only available for clients'},
            status=status.HTTP_403_FORBIDDEN
        )

    limit = int(request.query_params.get('limit', 10))
    data = ClientAnalyticsService.get_client_event_history(request.user.id, limit)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_spending_trends(request):
    """
    Get monthly spending trends for the authenticated client.

    Query params:
        - months: Number of months to include (default: 12)
    """
    if request.user.role != 'CLIENT':
        return Response(
            {'detail': 'This endpoint is only available for clients'},
            status=status.HTTP_403_FORBIDDEN
        )

    months = int(request.query_params.get('months', 12))
    data = ClientAnalyticsService.get_client_spending_trends(request.user.id, months)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_deadlines(request):
    """
    Get upcoming deadlines for the authenticated client.

    Query params:
        - days: Number of days to look ahead (default: 30)
    """
    if request.user.role != 'CLIENT':
        return Response(
            {'detail': 'This endpoint is only available for clients'},
            status=status.HTTP_403_FORBIDDEN
        )

    days = int(request.query_params.get('days', 30))
    data = ClientAnalyticsService.get_client_upcoming_deadlines(request.user.id, days)
    return Response(data)
