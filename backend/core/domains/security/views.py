# core/domains/security/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone

from .models import SecurityBreach, BreachNotification, AffectedUser
from .serializers import (
    SecurityBreachListSerializer,
    SecurityBreachDetailSerializer,
    SecurityBreachCreateSerializer,
    SecurityBreachUpdateSerializer,
    BreachNotificationSerializer,
    AffectedUserSerializer,
    NotifyNPCSerializer,
    NotifyUsersSerializer,
)
from .services import BreachNotificationService
import logging

logger = logging.getLogger('security')


class SecurityBreachViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing security breaches.

    Admin-only access for breach management operations.
    """
    queryset = SecurityBreach.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'list':
            return SecurityBreachListSerializer
        elif self.action == 'create':
            return SecurityBreachCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SecurityBreachUpdateSerializer
        return SecurityBreachDetailSerializer

    def get_queryset(self):
        queryset = SecurityBreach.objects.all()

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)

        # Filter active (not resolved or false positive)
        active_only = self.request.query_params.get('active')
        if active_only and active_only.lower() == 'true':
            queryset = queryset.exclude(status__in=['RESOLVED', 'FALSE_POSITIVE'])

        return queryset.order_by('-detected_at')

    @action(detail=True, methods=['post'], url_path='notify-npc')
    def notify_npc(self, request, pk=None):
        """
        Trigger NPC notification for a breach.

        POST /api/security/breaches/{id}/notify-npc/
        """
        breach = self.get_object()
        serializer = NotifyNPCSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not serializer.validated_data['confirm']:
            return Response(
                {'error': 'Confirmation required to send NPC notification'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if breach.npc_notified:
            return Response(
                {'error': 'NPC has already been notified for this breach'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            BreachNotificationService.notify_npc(breach)

            logger.info(
                f"NPC notification sent for breach {breach.breach_id} by {request.user.email}",
                extra={'breach_id': breach.breach_id, 'user': request.user.id}
            )

            return Response({
                'status': 'success',
                'message': 'NPC notification has been prepared and sent to DPO for submission',
                'breach_id': breach.breach_id,
                'notified_at': breach.npc_notified_at.isoformat()
            })
        except Exception as e:
            logger.error(f"Failed to send NPC notification: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='notify-users')
    def notify_users(self, request, pk=None):
        """
        Trigger user notifications for a breach.

        POST /api/security/breaches/{id}/notify-users/
        """
        breach = self.get_object()
        serializer = NotifyUsersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not serializer.validated_data['confirm']:
            return Response(
                {'error': 'Confirmation required to send user notifications'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get count of users to notify
        pending_count = AffectedUser.objects.filter(
            breach=breach,
            notified=False
        ).count()

        if pending_count == 0:
            return Response(
                {'error': 'No users pending notification'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            BreachNotificationService.notify_affected_users(breach)

            logger.info(
                f"User notifications sent for breach {breach.breach_id} by {request.user.email}",
                extra={'breach_id': breach.breach_id, 'user': request.user.id}
            )

            return Response({
                'status': 'success',
                'message': f'Notifications sent to {pending_count} affected users',
                'breach_id': breach.breach_id,
                'users_notified': pending_count
            })
        except Exception as e:
            logger.error(f"Failed to send user notifications: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='assess-impact')
    def assess_impact(self, request, pk=None):
        """
        Assess the impact of a breach by adding affected users.

        POST /api/security/breaches/{id}/assess-impact/
        {
            "user_ids": [1, 2, 3],
            "data_types": ["email", "phone", "payment"]
        }
        """
        breach = self.get_object()
        user_ids = request.data.get('user_ids', [])
        data_types = request.data.get('data_types', [])

        if not user_ids:
            return Response(
                {'error': 'user_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            BreachNotificationService.assess_impact(breach, user_ids, data_types)

            return Response({
                'status': 'success',
                'breach_id': breach.breach_id,
                'affected_users_count': breach.affected_users_count,
                'involves_spi': breach.involves_spi,
                'requires_notification': breach.requires_notification()
            })
        except Exception as e:
            logger.error(f"Failed to assess impact: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        Get the timeline of events for a breach.

        GET /api/security/breaches/{id}/timeline/
        """
        breach = self.get_object()

        timeline = []

        if breach.detected_at:
            timeline.append({
                'event': 'Breach Detected',
                'timestamp': breach.detected_at.isoformat(),
                'hours_elapsed': 0
            })

        if breach.confirmed_at:
            timeline.append({
                'event': 'Breach Confirmed',
                'timestamp': breach.confirmed_at.isoformat(),
                'hours_elapsed': round(
                    (breach.confirmed_at - breach.detected_at).total_seconds() / 3600, 1
                )
            })

        if breach.npc_notified_at:
            timeline.append({
                'event': 'NPC Notified',
                'timestamp': breach.npc_notified_at.isoformat(),
                'hours_elapsed': round(
                    (breach.npc_notified_at - breach.detected_at).total_seconds() / 3600, 1
                )
            })

        if breach.users_notified_at:
            timeline.append({
                'event': 'Users Notified',
                'timestamp': breach.users_notified_at.isoformat(),
                'hours_elapsed': round(
                    (breach.users_notified_at - breach.detected_at).total_seconds() / 3600, 1
                )
            })

        if breach.contained_at:
            timeline.append({
                'event': 'Breach Contained',
                'timestamp': breach.contained_at.isoformat(),
                'hours_elapsed': round(
                    (breach.contained_at - breach.detected_at).total_seconds() / 3600, 1
                )
            })

        if breach.resolved_at:
            timeline.append({
                'event': 'Breach Resolved',
                'timestamp': breach.resolved_at.isoformat(),
                'hours_elapsed': round(
                    (breach.resolved_at - breach.detected_at).total_seconds() / 3600, 1
                )
            })

        # Add notification events
        for notification in breach.notifications.all():
            timeline.append({
                'event': f'Notification: {notification.get_notification_type_display()}',
                'timestamp': notification.sent_at.isoformat(),
                'recipient': notification.recipient,
                'status': notification.delivery_status
            })

        # Sort by timestamp
        timeline.sort(key=lambda x: x['timestamp'])

        return Response({
            'breach_id': breach.breach_id,
            'current_status': breach.status,
            'hours_since_detection': round(breach.hours_since_detection(), 1),
            'notification_deadline_hours': 72,
            'is_overdue': breach.is_notification_overdue(),
            'timeline': timeline
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get a summary of all breaches.

        GET /api/security/breaches/summary/
        """
        total = SecurityBreach.objects.count()
        active = SecurityBreach.objects.exclude(
            status__in=['RESOLVED', 'FALSE_POSITIVE']
        ).count()

        overdue = sum(
            1 for b in SecurityBreach.objects.exclude(
                status__in=['RESOLVED', 'FALSE_POSITIVE']
            ) if b.is_notification_overdue()
        )

        by_severity = {}
        for severity, _ in SecurityBreach.SEVERITY_CHOICES:
            by_severity[severity] = SecurityBreach.objects.filter(
                severity=severity
            ).exclude(status__in=['RESOLVED', 'FALSE_POSITIVE']).count()

        by_status = {}
        for status_code, _ in SecurityBreach.STATUS_CHOICES:
            by_status[status_code] = SecurityBreach.objects.filter(
                status=status_code
            ).count()

        return Response({
            'total_breaches': total,
            'active_breaches': active,
            'overdue_notifications': overdue,
            'by_severity': by_severity,
            'by_status': by_status
        })
