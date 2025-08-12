# backend/core/domains/analytics/views.py
from core.utils.pagination import StandardResultsSetPagination
from core.utils.permissions import IsAdmin, IsAdminOrClient
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import (
    AlertRule,
    AnalyticsEvent,
    AnalyticsReport,
    ConversionFunnel,
    Dashboard,
    EventAggregation,
    MetricDefinition,
    ReportExecution,
    Widget,
)
from .serializers import (
    AlertRuleCreateSerializer,
    AlertRuleSerializer,
    AlertRuleTestSerializer,
    AnalyticsEventSerializer,
    AnalyticsReportCreateSerializer,
    AnalyticsReportDetailSerializer,
    AnalyticsReportSerializer,
    BusinessMetricsSerializer,
    ConversionFunnelSerializer,
    DashboardCreateSerializer,
    DashboardDataRequestSerializer,
    DashboardDataSerializer,
    DashboardDetailSerializer,
    DashboardSerializer,
    EventAggregationSerializer,
    EventTrackingRequestSerializer,
    FunnelAnalyticsSerializer,
    FunnelTrackingRequestSerializer,
    MetricCalculationRequestSerializer,
    MetricDefinitionCreateSerializer,
    MetricDefinitionSerializer,
    MetricDefinitionUpdateSerializer,
    MetricValueSerializer,
    ReportExecutionRequestSerializer,
    ReportExecutionSerializer,
    WidgetCreateSerializer,
    WidgetSerializer,
)
from .services import (
    AlertService,
    ConversionFunnelService,
    DashboardService,
    DataAggregationService,
    EventTrackingService,
    MetricDefinitionService,
    ReportService,
)

class MetricDefinitionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing metric definitions
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        source_domain = self.request.query_params.get('source_domain')
        is_active = self.request.query_params.get('is_active')
        search_query = self.request.query_params.get('search')
        
        # Convert is_active to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return MetricDefinitionService.get_all_metrics(
            search_query=search_query,
            source_domain=source_domain,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MetricDefinitionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MetricDefinitionUpdateSerializer
        return MetricDefinitionSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            metric = MetricDefinitionService.create_metric(serializer.validated_data)
            return Response(
                MetricDefinitionSerializer(metric, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            metric = MetricDefinitionService.update_metric(
                instance.id,
                serializer.validated_data
            )
            return Response(
                MetricDefinitionSerializer(metric, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            MetricDefinitionService.delete_metric(instance.id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """Calculate metric value for a time period"""
        serializer = MetricCalculationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            metric = self.get_object()
            value = MetricDefinitionService.calculate_metric(
                metric.id,
                start_date=serializer.validated_data.get('start_date'),
                end_date=serializer.validated_data.get('end_date'),
                filters=serializer.validated_data.get('filters')
            )
            
            result_data = {
                'metric_id': metric.id,
                'metric_name': metric.name,
                'value': str(value),
                'display_format': metric.display_format,
                'calculation_time': timezone.now().isoformat(),
                'time_range': {
                    'start_date': serializer.validated_data.get('start_date').isoformat() if serializer.validated_data.get('start_date') else None,
                    'end_date': serializer.validated_data.get('end_date').isoformat() if serializer.validated_data.get('end_date') else None
                }
            }
            
            result_serializer = MetricValueSerializer(result_data)
            return Response(result_serializer.data)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active metric definitions"""
        metrics = MetricDefinitionService.get_all_metrics(is_active=True)
        page = self.paginate_queryset(metrics)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(metrics, many=True)
        return Response(serializer.data)


class DashboardViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dashboards
    """
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        dashboard_type = self.request.query_params.get('dashboard_type')
        is_active = self.request.query_params.get('is_active')
        
        # Convert is_active to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return DashboardService.get_all_dashboards(
            user=self.request.user,
            dashboard_type=dashboard_type,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DashboardDetailSerializer
        elif self.action == 'create':
            return DashboardCreateSerializer
        return DashboardSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            dashboard = DashboardService.create_dashboard(
                serializer.validated_data,
                request.user
            )
            return Response(
                DashboardDetailSerializer(dashboard, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            dashboard = DashboardService.update_dashboard(
                instance.id,
                serializer.validated_data,
                request.user
            )
            return Response(
                DashboardDetailSerializer(dashboard, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            DashboardService.delete_dashboard(instance.id, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def get_data(self, request, pk=None):
        """Get dashboard data with calculated metrics"""
        serializer = DashboardDataRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            dashboard_data = DashboardService.get_dashboard_data(
                pk,
                request.user,
                time_range=serializer.validated_data.get('time_range', 'last_30_days')
            )
            
            dashboard_data['last_updated'] = timezone.now().isoformat()
            result_serializer = DashboardDataSerializer(dashboard_data)
            return Response(result_serializer.data)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def add_widget(self, request, pk=None):
        """Add a widget to the dashboard"""
        serializer = WidgetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            widget = DashboardService.add_widget(
                pk,
                serializer.validated_data,
                request.user
            )
            return Response(
                WidgetSerializer(widget, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class WidgetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing widgets
    """
    permission_classes = [IsAdminOrClient]
    serializer_class = WidgetSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        dashboard_id = self.request.query_params.get('dashboard_id')
        
        if dashboard_id:
            # Check if user has access to the dashboard
            try:
                DashboardService.get_dashboard_by_id(dashboard_id, self.request.user)
                return Widget.objects.filter(dashboard_id=dashboard_id).order_by('order')
            except:
                return Widget.objects.none()
        
        # For admins, show all widgets; for others, show only accessible ones
        if getattr(self.request.user, 'role', None) == 'ADMIN':
            return Widget.objects.all().order_by('dashboard__name', 'order')
        else:
            # Get dashboards accessible to user
            accessible_dashboards = DashboardService.get_all_dashboards(self.request.user)
            return Widget.objects.filter(
                dashboard__in=accessible_dashboards
            ).order_by('dashboard__name', 'order')
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            widget = DashboardService.update_widget(
                instance.id,
                serializer.validated_data,
                request.user
            )
            return Response(
                WidgetSerializer(widget, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            DashboardService.delete_widget(instance.id, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AnalyticsReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing analytics reports
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        report_type = self.request.query_params.get('report_type')
        is_active = self.request.query_params.get('is_active')
        
        # Convert is_active to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return ReportService.get_all_reports(
            user=self.request.user,
            report_type=report_type,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AnalyticsReportDetailSerializer
        elif self.action == 'create':
            return AnalyticsReportCreateSerializer
        return AnalyticsReportSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            report = ReportService.create_report(
                serializer.validated_data,
                request.user
            )
            return Response(
                AnalyticsReportDetailSerializer(report, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            report = ReportService.update_report(
                instance.id,
                serializer.validated_data,
                request.user
            )
            return Response(
                AnalyticsReportDetailSerializer(report, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            ReportService.delete_report(instance.id, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a report"""
        serializer = ReportExecutionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            execution = ReportService.execute_report(
                pk,
                request.user,
                start_date=serializer.validated_data.get('start_date'),
                end_date=serializer.validated_data.get('end_date'),
                custom_filters=serializer.validated_data.get('custom_filters')
            )
            
            return Response(
                ReportExecutionSerializer(execution, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def executions(self, request, pk=None):
        """Get report executions"""
        try:
            report = ReportService.get_report_by_id(pk, request.user)
            executions = report.executions.order_by('-created_at')
            
            page = self.paginate_queryset(executions)
            if page is not None:
                serializer = ReportExecutionSerializer(page, many=True, context=self.get_serializer_context())
                return self.get_paginated_response(serializer.data)
            
            serializer = ReportExecutionSerializer(executions, many=True, context=self.get_serializer_context())
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ReportExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing report executions
    """
    permission_classes = [IsAdmin]
    serializer_class = ReportExecutionSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        return ReportExecution.objects.filter(
            requested_by=self.request.user
        ).order_by('-created_at')
    
    def retrieve(self, request, *args, **kwargs):
        # Use execution_id instead of pk for lookup
        execution_id = kwargs.get('pk')
        
        try:
            execution = ReportService.get_report_execution(execution_id, request.user)
            serializer = self.get_serializer(execution)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )


class AnalyticsEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for analytics events
    """
    permission_classes = [IsAdmin]
    serializer_class = AnalyticsEventSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['event_name', 'source_domain', 'source_model']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        event_category = self.request.query_params.get('event_category')
        source_domain = self.request.query_params.get('source_domain')
        user_id = self.request.query_params.get('user_id')
        
        queryset = AnalyticsEvent.objects.all()
        
        if event_category:
            queryset = queryset.filter(event_category=event_category)
        if source_domain:
            queryset = queryset.filter(source_domain=source_domain)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-event_timestamp')
    
    def create(self, request, *args, **kwargs):
        """Track a new analytics event"""
        serializer = EventTrackingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            event = EventTrackingService.track_event(
                event_name=serializer.validated_data['event_name'],
                event_category=serializer.validated_data.get('event_category', 'USER_ACTION'),
                source_domain=serializer.validated_data.get('source_domain'),
                source_model=serializer.validated_data.get('source_model'),
                source_id=serializer.validated_data.get('source_id'),
                user=request.user if request.user.is_authenticated else None,
                session_id=serializer.validated_data.get('session_id'),
                event_data=serializer.validated_data.get('event_data'),
                numeric_value=serializer.validated_data.get('numeric_value'),
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            if event:
                return Response(
                    AnalyticsEventSerializer(event, context=self.get_serializer_context()).data,
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"detail": "Event tracking failed"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ConversionFunnelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversion funnels
    """
    permission_classes = [IsAdmin]
    serializer_class = ConversionFunnelSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        is_active = self.request.query_params.get('is_active')
        
        # Convert is_active to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return ConversionFunnelService.get_all_funnels(is_active=is_active)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            funnel = ConversionFunnelService.create_funnel(serializer.validated_data)
            return Response(
                ConversionFunnelSerializer(funnel, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            funnel = ConversionFunnelService.update_funnel(
                instance.id,
                serializer.validated_data
            )
            return Response(
                ConversionFunnelSerializer(funnel, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            ConversionFunnelService.delete_funnel(instance.id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def track(self, request, pk=None):
        """Track an event in the funnel"""
        serializer = FunnelTrackingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            conversion = ConversionFunnelService.track_funnel_event(
                funnel_id=pk,
                user=request.user if request.user.is_authenticated else None,
                session_id=serializer.validated_data.get('session_id'),
                event_name=serializer.validated_data['event_name'],
                event_data=serializer.validated_data.get('event_data')
            )
            
            if conversion:
                from .serializers import FunnelConversionSerializer
                return Response(
                    FunnelConversionSerializer(conversion, context=self.get_serializer_context()).data
                )
            else:
                return Response(
                    {"success": False},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get funnel analytics"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Parse dates if provided
        if start_date:
            start_date = timezone.datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            end_date = timezone.datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        try:
            analytics = ConversionFunnelService.get_funnel_analytics(
                pk,
                start_date=start_date,
                end_date=end_date
            )
            
            serializer = FunnelAnalyticsSerializer(analytics)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AlertRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing alert rules
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        is_active = self.request.query_params.get('is_active')
        
        # Convert is_active to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return AlertService.get_all_alert_rules(
            user=self.request.user,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AlertRuleCreateSerializer
        return AlertRuleSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            alert_rule = AlertService.create_alert_rule(
                serializer.validated_data,
                request.user
            )
            return Response(
                AlertRuleSerializer(alert_rule, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            alert_rule = AlertService.update_alert_rule(
                instance.id,
                serializer.validated_data,
                request.user
            )
            return Response(
                AlertRuleSerializer(alert_rule, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            AlertService.delete_alert_rule(instance.id, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test an alert rule"""
        serializer = AlertRuleTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            alert_rule = self.get_object()
            
            # Calculate current metric value
            from datetime import timedelta
            end_date = timezone.now()
            start_date = end_date - timedelta(hours=1)  # Default test period
            
            current_value = MetricDefinitionService.calculate_metric(
                alert_rule.metric_definition.id,
                start_date=start_date,
                end_date=end_date
            )
            
            threshold_met = AlertService._check_threshold(alert_rule, current_value)
            
            return Response({
                'alert_rule': alert_rule.name,
                'current_value': float(current_value),
                'threshold_value': float(alert_rule.threshold_value),
                'operator': alert_rule.operator,
                'threshold_met': threshold_met,
                'test_time': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class EventAggregationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing event aggregations
    """
    permission_classes = [IsAdmin]
    serializer_class = EventAggregationSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        metric_id = self.request.query_params.get('metric_id')
        aggregation_type = self.request.query_params.get('aggregation_type')
        
        queryset = EventAggregation.objects.filter(is_complete=True)
        
        if metric_id:
            queryset = queryset.filter(metric_definition_id=metric_id)
        if aggregation_type:
            queryset = queryset.filter(aggregation_type=aggregation_type)
        
        return queryset.order_by('-period_start')


class AnalyticsAPIViewSet(viewsets.ViewSet):
    """
    ViewSet for general analytics API endpoints
    """
    permission_classes = [IsAdminOrClient]
    
    @action(detail=False, methods=['get'])
    def business_metrics(self, request):
        """Get aggregated business metrics"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Parse dates if provided
        if start_date:
            start_date = timezone.datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            end_date = timezone.datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        try:
            metrics = DataAggregationService.aggregate_business_metrics(
                start_date=start_date,
                end_date=end_date
            )
            
            # Add metadata
            metrics['calculation_time'] = timezone.now().isoformat()
            metrics['time_range'] = {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None
            }
            
            serializer = BusinessMetricsSerializer(metrics)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def track_event(self, request):
        """Track an analytics event (public endpoint for client-side tracking)"""
        serializer = EventTrackingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            event = EventTrackingService.track_event(
                event_name=serializer.validated_data['event_name'],
                event_category=serializer.validated_data.get('event_category', 'USER_ACTION'),
                source_domain=serializer.validated_data.get('source_domain'),
                source_model=serializer.validated_data.get('source_model'),
                source_id=serializer.validated_data.get('source_id'),
                user=request.user if request.user.is_authenticated else None,
                session_id=serializer.validated_data.get('session_id'),
                event_data=serializer.validated_data.get('event_data'),
                numeric_value=serializer.validated_data.get('numeric_value'),
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(
                {"success": True, "event_tracked": event is not None},
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def create_daily_aggregations(self, request):
        """Create daily aggregations for metrics"""
        date_str = request.data.get('date')
        
        if date_str:
            try:
                date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"detail": "Invalid date format. Use YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = timezone.now().date()
        
        try:
            DataAggregationService.create_daily_aggregations(date)
            return Response(
                {"success": True, "date": date.isoformat()},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def cleanup_events(self, request):
        """Clean up old analytics events"""
        days_to_keep = request.data.get('days_to_keep', 90)
        
        try:
            days_to_keep = int(days_to_keep)
            if days_to_keep < 1:
                raise ValueError("days_to_keep must be at least 1")
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid days_to_keep value"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            deleted_count = DataAggregationService.cleanup_old_events(days_to_keep)
            return Response(
                {"success": True, "deleted_count": deleted_count},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def evaluate_alerts(self, request):
        """Manually trigger alert rule evaluation"""
        try:
            AlertService.evaluate_alert_rules()
            return Response(
                {"success": True, "message": "Alert rules evaluated"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# Public tracking endpoint for client-side analytics
class PublicAnalyticsViewSet(viewsets.ViewSet):
    """
    Public ViewSet for client-side analytics tracking
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def track(self, request):
        """Public endpoint for tracking analytics events"""
        # Basic validation to prevent abuse
        if not request.data.get('event_name'):
            return Response(
                {"detail": "event_name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limit event names to prevent spam
        allowed_events = [
            'page_view', 'button_click', 'form_submit', 'booking_step_completed',
            'booking_abandoned', 'contact_form_submitted', 'quote_requested'
        ]
        
        event_name = request.data.get('event_name')
        if event_name not in allowed_events:
            return Response(
                {"detail": "Invalid event name"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            event = EventTrackingService.track_event(
                event_name=event_name,
                event_category='USER_ACTION',
                source_domain='public',
                user=request.user if request.user.is_authenticated else None,
                session_id=request.data.get('session_id'),
                event_data=request.data.get('event_data', {}),
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(
                {"success": True},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            # Don't expose internal errors to public endpoint
            return Response(
                {"success": False},
                status=status.HTTP_400_BAD_REQUEST
            )