# backend/core/domains/notifications/views.py
from core.utils import models
from core.utils.permissions import IsAdmin, IsAdminOrClient
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    NotificationTemplate,
    NotificationPreference,
    NotificationRule,
    NotificationQueue,
    NotificationHistory,
    InAppNotification
)
from .serializers import (
    NotificationTemplateSerializer,
    NotificationPreferenceSerializer,
    NotificationRuleSerializer,
    NotificationRuleCreateSerializer,
    NotificationQueueSerializer,
    NotificationHistorySerializer,
    InAppNotificationSerializer,
    SendNotificationSerializer,
    NotificationAnalyticsSerializer,
    ChannelPerformanceSerializer,
    UserEngagementSerializer,
    NotificationPreferenceUpdateSerializer,
    TestNotificationSerializer,
    BulkNotificationActionSerializer
)
from .services import (
    NotificationTemplateService,
    NotificationPreferenceService,
    NotificationRuleService,
    NotificationDispatchService,
    NotificationAnalyticsService,
    InAppNotificationService
)

User = get_user_model()


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification templates"""
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'notification_type']
    ordering_fields = ['name', 'notification_type', 'created_at']
    ordering = ['notification_type', 'name']
    
    def get_queryset(self):
        queryset = NotificationTemplate.objects.all()
        
        # Filter by notification type
        notification_type = self.request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        # Filter by channel
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(channels__contains=[channel])
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            template = NotificationTemplateService.create_template(serializer.validated_data)
        
        return Response(
            self.get_serializer(template).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            template = NotificationTemplateService.update_template(
                instance.id, serializer.validated_data
            )
        
        return Response(self.get_serializer(template).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            NotificationTemplateService.delete_template(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Preview template content for a specific channel"""
        template = self.get_object()
        channel = request.data.get('channel')
        context_data = request.data.get('context_data', {})
        
        if not channel:
            return Response(
                {'error': 'Channel is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            rendered = NotificationTemplateService.render_template_content(
                template, channel, context_data
            )
            return Response(rendered)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def test_send(self, request, pk=None):
        """Send a test notification"""
        serializer = TestNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        template = self.get_object()
        channel = serializer.validated_data['channel']
        recipient_email = serializer.validated_data['recipient_email']
        context_data = serializer.validated_data.get('context_data', {})
        
        try:
            # Get or create test user
            test_user, created = User.objects.get_or_create(
                email=recipient_email,
                defaults={
                    'first_name': 'Test',
                    'last_name': 'User',
                    'role': 'ADMIN',
                    'is_active': True
                }
            )
            
            # Send test notification
            notifications = NotificationDispatchService.dispatch_notification(
                notification_type=template.notification_type,
                recipients=[test_user],
                context_data=context_data,
                priority='LOW'
            )
            
            return Response({
                'message': 'Test notification sent successfully',
                'notifications_queued': len(notifications)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to send test notification: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def notification_types(self, request):
        """Get available notification types"""
        types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationTemplate.NOTIFICATION_TYPES
        ]
        return Response(types)
    
    @action(detail=False, methods=['get'])
    def channels(self, request):
        """Get available channels"""
        channels = [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationTemplate.CHANNEL_CHOICES
        ]
        return Response(channels)


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification preferences"""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Admins can see all preferences, users can only see their own
        if self.request.user.role == 'ADMIN':
            return NotificationPreference.objects.select_related('user').all()
        else:
            return NotificationPreference.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create preferences for the user"""
        if self.request.user.role == 'ADMIN' and 'pk' in self.kwargs:
            # Admin accessing specific user's preferences
            return super().get_object()
        else:
            # User accessing their own preferences
            preferences, created = NotificationPreference.objects.get_or_create(
                user=self.request.user
            )
            return preferences
    
    @action(detail=False, methods=['get', 'put'])
    def my_preferences(self, request):
        """Get or update current user's preferences"""
        preferences = NotificationPreferenceService.get_or_create_preferences(request.user)
        
        if request.method == 'GET':
            serializer = self.get_serializer(preferences)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            serializer = self.get_serializer(preferences, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                updated_preferences = NotificationPreferenceService.update_preferences(
                    request.user, serializer.validated_data
                )
            
            return Response(self.get_serializer(updated_preferences).data)
    
    @action(detail=False, methods=['post'])
    def update_notification_setting(self, request):
        """Update a specific notification setting"""
        serializer = NotificationPreferenceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_type = serializer.validated_data['notification_type']
        channel = serializer.validated_data['channel']
        enabled = serializer.validated_data['enabled']
        
        with transaction.atomic():
            preferences = NotificationPreferenceService.update_notification_setting(
                request.user, notification_type, channel, enabled
            )
        
        return Response(self.get_serializer(preferences).data)
    
    @action(detail=False, methods=['get'])
    def available_settings(self, request):
        """Get available notification types and channels for preferences"""
        notification_types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationTemplate.NOTIFICATION_TYPES
        ]
        
        channels = [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationTemplate.CHANNEL_CHOICES
        ]
        
        return Response({
            'notification_types': notification_types,
            'channels': channels
        })


class NotificationRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification rules"""
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'event_type']
    ordering_fields = ['name', 'event_type', 'created_at']
    ordering = ['event_type', 'name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return NotificationRuleCreateSerializer
        return NotificationRuleSerializer
    
    def get_queryset(self):
        queryset = NotificationRule.objects.select_related('template').prefetch_related('target_users')
        
        # Filter by event type
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        # Filter by template
        template_id = self.request.query_params.get('template_id')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            rule = NotificationRuleService.create_rule(serializer.validated_data)
        
        return Response(
            NotificationRuleSerializer(rule).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            rule = NotificationRuleService.update_rule(
                instance.id, serializer.validated_data
            )
        
        return Response(NotificationRuleSerializer(rule).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            NotificationRuleService.delete_rule(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def event_types(self, request):
        """Get available event types for rules"""
        # Define available event types from different domains
        event_types = [
            {'value': 'client.created', 'label': 'Client Created'},
            {'value': 'client.invitation_sent', 'label': 'Client Invitation Sent'},
            {'value': 'client.invitation_accepted', 'label': 'Client Invitation Accepted'},
            {'value': 'event.created', 'label': 'Event Created'},
            {'value': 'event.status_changed', 'label': 'Event Status Changed'},
            {'value': 'event.deadline_approaching', 'label': 'Event Deadline Approaching'},
            {'value': 'task.created', 'label': 'Task Created'},
            {'value': 'task.completed', 'label': 'Task Completed'},
            {'value': 'task.overdue', 'label': 'Task Overdue'},
            {'value': 'payment.received', 'label': 'Payment Received'},
            {'value': 'payment.failed', 'label': 'Payment Failed'},
            {'value': 'feedback.received', 'label': 'Feedback Received'},
            {'value': 'workflow.stage_changed', 'label': 'Workflow Stage Changed'},
            {'value': 'system.alert', 'label': 'System Alert'},
        ]
        return Response(event_types)


class NotificationQueueViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing notification queue (admin only)"""
    serializer_class = NotificationQueueSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['template__name', 'recipient__email', 'subject']
    ordering_fields = ['scheduled_at', 'priority', 'status', 'created_at']
    ordering = ['-priority', 'scheduled_at']
    
    def get_queryset(self):
        queryset = NotificationQueue.objects.select_related(
            'template', 'recipient', 'rule'
        ).all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by channel
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(channel=channel)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filter by recipient
        recipient_id = self.request.query_params.get('recipient_id')
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed notification"""
        notification = self.get_object()
        
        if notification.status not in ['FAILED', 'CANCELLED']:
            return Response(
                {'error': 'Only failed or cancelled notifications can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset notification for retry
        notification.status = 'PENDING'
        notification.attempts = 0
        notification.scheduled_at = timezone.now()
        notification.error_message = ''
        notification.save()
        
        # Trigger queue processing
        from .services import process_notification_queue
        process_notification_queue.delay()
        
        return Response({'message': 'Notification queued for retry'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending notification"""
        notification = self.get_object()
        
        if notification.status not in ['PENDING', 'PROCESSING']:
            return Response(
                {'error': 'Only pending or processing notifications can be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notification.status = 'CANCELLED'
        notification.save()
        
        return Response({'message': 'Notification cancelled'})


class NotificationHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing notification history"""
    serializer_class = NotificationHistorySerializer
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['template_name', 'subject', 'recipient__email']
    ordering_fields = ['sent_at', 'delivery_status', 'notification_type']
    ordering = ['-sent_at']
    
    def get_queryset(self):
        queryset = NotificationHistory.objects.select_related('recipient').all()
        
        # Clients can only see their own notification history
        if self.request.user.role == 'CLIENT':
            queryset = queryset.filter(recipient=self.request.user)
        
        # Filter by notification type
        notification_type = self.request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by channel
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(channel=channel)
        
        # Filter by delivery status
        delivery_status = self.request.query_params.get('delivery_status')
        if delivery_status:
            queryset = queryset.filter(delivery_status=delivery_status)
        
        # Filter by recipient (admin only)
        recipient_id = self.request.query_params.get('recipient_id')
        if recipient_id and self.request.user.role == 'ADMIN':
            queryset = queryset.filter(recipient_id=recipient_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(sent_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(sent_at__lte=end_date)
        
        return queryset


class InAppNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for in-app notifications"""
    serializer_class = InAppNotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'priority', 'is_read']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # Users can only see their own in-app notifications
        queryset = InAppNotification.objects.filter(recipient=self.request.user)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            is_read = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read)
        
        # Filter by notification type
        notification_type = self.request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Exclude expired notifications
        queryset = queryset.filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
        )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Only admins can create in-app notifications for other users"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can create notifications'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        
        return Response(self.get_serializer(notification).data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for current user"""
        count = InAppNotificationService.mark_all_as_read(request.user)
        return Response({'message': f'Marked {count} notifications as read'})
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Perform bulk actions on notifications"""
        serializer = BulkNotificationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data['notification_ids']
        action = serializer.validated_data['action']
        
        # Get notifications belonging to current user
        notifications = InAppNotification.objects.filter(
            id__in=notification_ids,
            recipient=request.user
        )
        
        if action == 'mark_read':
            count = notifications.update(is_read=True, read_at=timezone.now())
            message = f'Marked {count} notifications as read'
        elif action == 'mark_unread':
            count = notifications.update(is_read=False, read_at=None)
            message = f'Marked {count} notifications as unread'
        elif action == 'delete':
            count = notifications.count()
            notifications.delete()
            message = f'Deleted {count} notifications'
        
        return Response({'message': message})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = InAppNotification.objects.filter(
            recipient=request.user,
            is_read=False
        ).exclude(
            expires_at__lt=timezone.now()
        ).count()
        
        return Response({'unread_count': count})


class NotificationAnalyticsViewSet(viewsets.ViewSet):
    """ViewSet for notification analytics"""
    permission_classes = [IsAdmin]
    
    @action(detail=False, methods=['get'])
    def delivery_stats(self, request):
        """Get delivery statistics"""
        days = int(request.query_params.get('days', 30))
        notification_type = request.query_params.get('notification_type')
        user_id = request.query_params.get('user_id')
        
        stats = NotificationAnalyticsService.get_delivery_stats(
            days=days,
            notification_type=notification_type,
            user_id=user_id
        )
        
        serializer = NotificationAnalyticsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def channel_performance(self, request):
        """Get channel performance statistics"""
        days = int(request.query_params.get('days', 30))
        
        stats = NotificationAnalyticsService.get_channel_performance(days=days)
        serializer = ChannelPerformanceSerializer(stats, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def user_engagement(self, request):
        """Get user engagement statistics"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        days = int(request.query_params.get('days', 30))
        
        stats = NotificationAnalyticsService.get_user_engagement(
            user_id=user_id,
            days=days
        )
        
        serializer = UserEngagementSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def send_manual(self, request):
        """Send manual notification to specific users"""
        serializer = SendNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_type = serializer.validated_data['notification_type']
        recipient_ids = serializer.validated_data['recipients']
        context_data = serializer.validated_data.get('context_data', {})
        priority = serializer.validated_data.get('priority', 'MEDIUM')
        delay_minutes = serializer.validated_data.get('delay_minutes', 0)
        
        # Get recipients
        recipients = User.objects.filter(id__in=recipient_ids, is_active=True)
        
        try:
            notifications = NotificationDispatchService.dispatch_notification(
                notification_type=notification_type,
                recipients=recipients,
                context_data=context_data,
                priority=priority,
                delay_minutes=delay_minutes
            )
            
            return Response({
                'message': 'Notifications sent successfully',
                'notifications_queued': len(notifications),
                'recipients': len(recipients)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to send notifications: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )