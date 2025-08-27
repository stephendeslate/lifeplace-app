# backend/core/domains/notifications/views.py
from core.utils.permissions import IsAdmin, IsAdminOrClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .models import (
    Notification,
    NotificationPreference,
    NotificationType,
)
from .serializers import (
    CreateNotificationSerializer,
    NotificationBulkActionSerializer,
    NotificationCountSerializer,
    NotificationListSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
    NotificationStatsSerializer,
    NotificationTypeSerializer,
)
from .services import (
    NotificationService,
    NotificationStatsService,
    NotificationTypeService,
)
from .security import (
    NotificationThrottle,
    NotificationAdminThrottle,
    NotificationRateLimiter,
)

User = get_user_model()


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user notifications"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [NotificationThrottle]
    
    def get_queryset(self):
        """Get notifications for the current user with filtering"""
        user = self.request.user
        
        # Base queryset - users can only see their own notifications
        if user.role == 'CLIENT':
            queryset = Notification.objects.filter(recipient=user)
        else:
            # Admins can see all notifications, but default to their own
            user_filter = self.request.query_params.get('user_id')
            if user_filter and user.role == 'ADMIN':
                queryset = Notification.objects.filter(recipient_id=user_filter)
            else:
                queryset = Notification.objects.filter(recipient=user)
        
        # Apply filters
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            is_read = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read)
        
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type__code=notification_type)
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(notification_type__category=category)
        
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(notification_type__priority=priority)
        
        return queryset.select_related(
            'notification_type', 'recipient', 'event', 'client'
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return NotificationListSerializer
        elif self.action == 'create_notification':
            return CreateNotificationSerializer
        return NotificationSerializer
    
    def list(self, request, *args, **kwargs):
        """Get notifications for the current user"""
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """Get a specific notification and mark it as read"""
        notification = self.get_object()
        
        # Ensure user can only access their own notifications (unless admin)
        if notification.recipient != request.user and request.user.role != 'ADMIN':
            return Response(
                {"detail": "You do not have permission to access this notification."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark as read if not already read and user is the recipient
        if not notification.is_read and notification.recipient == request.user:
            notification.mark_as_read()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create notification - restricted to admin users"""
        if not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to create notifications."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update notification - restricted to admin users"""
        if not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to update notifications."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a notification"""
        notification = self.get_object()
        
        # Allow users to delete their own notifications, admins can delete any
        if notification.recipient != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to delete this notification."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        try:
            notification = NotificationService.mark_as_read(pk, request.user)
            serializer = self.get_serializer(notification)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def mark_unread(self, request, pk=None):
        """Mark a notification as unread"""
        try:
            notification = NotificationService.mark_as_unread(pk, request.user)
            serializer = self.get_serializer(notification)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user"""
        try:
            count = NotificationService.mark_all_as_read(request.user)
            return Response({'marked_read': count})
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Perform bulk actions on notifications"""
        serializer = NotificationBulkActionSerializer(
            data=request.data, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        try:
            count = NotificationService.bulk_action(
                request.user.id,
                serializer.validated_data['notification_ids'],
                serializer.validated_data['action']
            )
            
            return Response({
                'action': serializer.validated_data['action'],
                'count': count,
                'message': f"Successfully {serializer.validated_data['action'].replace('_', ' ')} {count} notifications"
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def counts(self, request):
        """Get notification counts for the current user"""
        try:
            counts = NotificationService.get_notification_counts(request.user.id)
            serializer = NotificationCountSerializer(counts)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications for the current user"""
        try:
            limit = int(request.query_params.get('limit', 20))
            notifications = NotificationService.get_notifications(
                request.user, 
                is_read=False, 
                limit=limit
            )
            
            serializer = NotificationListSerializer(notifications, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent notifications for the current user"""
        try:
            limit = int(request.query_params.get('limit', 5))
            notifications = NotificationService.get_notifications(
                request.user, 
                limit=limit
            )
            
            serializer = NotificationListSerializer(notifications, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], throttle_classes=[NotificationAdminThrottle])
    def create_notification(self, request):
        """Create notifications for multiple recipients - admin only"""
        if request.user.role != 'ADMIN':
            return Response(
                {"detail": "Only administrators can create notifications."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            recipient_ids = serializer.validated_data['recipient_ids']
            notification_type_code = serializer.validated_data['notification_type_code']
            context_data = serializer.validated_data.get('context_data', {})
            force_delivery = serializer.validated_data.get('force_delivery_methods', [])
            
            # Security: Check bulk creation limits
            can_bulk, bulk_message = NotificationRateLimiter.check_bulk_limit(
                user_id=request.user.id,
                recipient_count=len(recipient_ids)
            )
            
            if not can_bulk:
                return Response(
                    {"detail": f"Bulk creation limit exceeded: {bulk_message}"},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            recipients = User.objects.filter(id__in=recipient_ids)
            created_notifications = []
            
            for recipient in recipients:
                try:
                    notification = NotificationService.create_notification(
                        recipient=recipient,
                        notification_type_code=notification_type_code,
                        context=context_data,
                        delivery_methods=force_delivery if force_delivery else None
                    )
                    if notification:
                        created_notifications.append(notification)
                except Exception as e:
                    # Continue with other recipients if one fails
                    pass
            
            # Security: Record bulk creation
            NotificationRateLimiter.record_bulk_creation(
                user_id=request.user.id,
                recipient_count=len(recipients)
            )
            
            return Response({
                'created_count': len(created_notifications),
                'total_recipients': len(recipients),
                'notifications': NotificationListSerializer(created_notifications, many=True).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get notification statistics for the current user"""
        try:
            days = int(request.query_params.get('days', 30))
            stats = NotificationStatsService.get_user_stats(request.user.id, days)
            serializer = NotificationStatsSerializer(stats)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdmin])
    def system_metrics(self, request):
        """Get system-wide notification metrics - admin only"""
        try:
            from .monitoring import NotificationMetrics
            
            hours = int(request.query_params.get('hours', 24))
            metric_type = request.query_params.get('type', 'all')
            
            response_data = {}
            
            if metric_type in ['all', 'delivery']:
                response_data['delivery_stats'] = NotificationMetrics.get_delivery_stats(hours)
            
            if metric_type in ['all', 'categories']:
                response_data['category_breakdown'] = NotificationMetrics.get_category_breakdown(hours)
            
            if metric_type in ['all', 'engagement']:
                response_data['user_engagement'] = NotificationMetrics.get_user_engagement_stats(hours)
            
            if metric_type in ['all', 'health']:
                response_data['system_health'] = NotificationMetrics.get_system_health()
            
            if metric_type in ['all', 'performance']:
                response_data['performance'] = NotificationMetrics.get_performance_metrics(hours)
            
            return Response(response_data)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdmin])
    def system_alerts(self, request):
        """Get system alerts - admin only"""
        try:
            from .monitoring import NotificationAlerts
            
            alerts = NotificationAlerts.get_all_alerts()
            
            return Response({
                'alerts': alerts,
                'alert_count': len(alerts),
                'has_critical': any(alert.get('severity') == 'critical' for alert in alerts),
                'checked_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def clear_metrics_cache(self, request):
        """Clear metrics cache - admin only"""
        try:
            from .monitoring import NotificationMetrics
            
            NotificationMetrics.clear_cache()
            
            return Response({
                'message': 'Metrics cache cleared successfully',
                'cleared_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class NotificationTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification types - admin only"""
    queryset = NotificationType.objects.all()
    serializer_class = NotificationTypeSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        """Filter notification types based on query parameters"""
        queryset = super().get_queryset()
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        # Filter by system status
        is_system = self.request.query_params.get('is_system')
        if is_system is not None:
            is_system = is_system.lower() == 'true'
            queryset = queryset.filter(is_system=is_system)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get available notification categories"""
        categories = [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationType._meta.get_field('category').choices
        ]
        return Response(categories)
    
    @action(detail=False, methods=['get'])
    def priorities(self, request):
        """Get available notification priorities"""
        priorities = [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationType._meta.get_field('priority').choices
        ]
        return Response(priorities)


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification preferences"""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own preferences, admins can see all"""
        if not self.request.user.is_staff:
            return NotificationPreference.objects.filter(user=self.request.user)
        
        # Admins can see all preferences, optionally filtered by user
        queryset = NotificationPreference.objects.all()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
            
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Prevent manual creation - preferences are auto-created"""
        return Response(
            {"detail": "Notification preferences are automatically created for users."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of preferences"""
        return Response(
            {"detail": "Notification preferences cannot be deleted."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def my_preferences(self, request):
        """Get preferences for the current user"""
        try:
            preferences = NotificationService.get_or_create_user_preferences(request.user.id)
            serializer = self.get_serializer(preferences)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['put', 'patch'])
    def update_preferences(self, request):
        """Update preferences for the current user"""
        try:
            preferences = NotificationService.update_user_preferences(
                request.user.id, 
                request.data
            )
            serializer = self.get_serializer(preferences)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def reset_to_defaults(self, request):
        """Reset preferences to default values"""
        try:
            preferences = NotificationService.get_or_create_user_preferences(request.user.id)
            
            # Reset to default values
            default_data = {
                'email_enabled': True,
                'sms_enabled': False,
                'in_app_enabled': True,
                'system_email': True,
                'system_sms': False,
                'system_in_app': True,
                'event_email': True,
                'event_sms': False,
                'event_in_app': True,
                'task_email': True,
                'task_sms': False,
                'task_in_app': True,
                'payment_email': True,
                'payment_sms': True,
                'payment_in_app': True,
                'client_email': True,
                'client_sms': False,
                'client_in_app': True,
                'contract_email': True,
                'contract_sms': False,
                'contract_in_app': True,
                'workflow_email': False,
                'workflow_sms': False,
                'workflow_in_app': True,
                'communication_email': False,
                'communication_sms': False,
                'communication_in_app': True,
                'quiet_hours_enabled': False,
                'digest_frequency': 'IMMEDIATE',
                'disabled_types': []
            }
            
            preferences = NotificationService.update_user_preferences(
                request.user.id, 
                default_data
            )
            
            serializer = self.get_serializer(preferences)
            return Response({
                'message': 'Preferences reset to defaults',
                'preferences': serializer.data
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def digest_frequencies(self, request):
        """Get available digest frequency options"""
        frequencies = [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationPreference._meta.get_field('digest_frequency').choices
        ]
        return Response(frequencies)