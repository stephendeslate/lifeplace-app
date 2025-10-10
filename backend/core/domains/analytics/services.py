# backend/core/domains/analytics/services.py
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.apps import apps
from django.db import models, transaction
from django.db.models import Avg, Count, Max, Min, Q, Sum
from django.utils import timezone
from django.core.cache import cache

from .exceptions import (
    AlertRuleNotFound,
    ConversionFunnelNotFound,
    DashboardNotFound,
    DataSourceNotAvailable,
    DuplicateDashboardName,
    DuplicateMetricName,
    DuplicateReportName,
    InvalidMetricConfiguration,
    MetricCalculationError,
    MetricDefinitionNotFound,
    ReportExecutionNotFound,
    ReportGenerationFailed,
    ReportNotFound,
    UnauthorizedDashboardAccess,
    WidgetNotFound,
)
from .models import (
    AlertRule,
    AnalyticsEvent,
    AnalyticsReport,
    ConversionFunnel,
    Dashboard,
    EventAggregation,
    FunnelConversion,
    MetricDefinition,
    ReportExecution,
    Widget,
)

logger = logging.getLogger(__name__)


class MetricDefinitionService:
    """Service for managing metric definitions"""
    
    @staticmethod
    def get_all_metrics(search_query=None, source_domain=None, is_active=None):
        """Get all metric definitions with optional filtering"""
        queryset = MetricDefinition.objects.all()
        
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        if source_domain:
            queryset = queryset.filter(source_domain=source_domain)
            
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
            
        return queryset.order_by('name')
    
    @staticmethod
    def get_metric_by_id(metric_id):
        """Get a metric definition by ID"""
        try:
            return MetricDefinition.objects.get(id=metric_id)
        except MetricDefinition.DoesNotExist:
            raise MetricDefinitionNotFound()
    
    @staticmethod
    def create_metric(metric_data):
        """Create a new metric definition"""
        # Check for duplicate name
        if MetricDefinition.objects.filter(name=metric_data['name']).exists():
            raise DuplicateMetricName()
        
        # Validate source domain and model
        MetricDefinitionService._validate_data_source(
            metric_data['source_domain'], 
            metric_data['source_model']
        )
        
        with transaction.atomic():
            metric = MetricDefinition.objects.create(**metric_data)
            logger.info(f"Created new metric definition: {metric.name}")
            return metric
    
    @staticmethod
    def update_metric(metric_id, metric_data):
        """Update an existing metric definition"""
        metric = MetricDefinitionService.get_metric_by_id(metric_id)
        
        # Check for duplicate name if name is being changed
        if 'name' in metric_data and metric_data['name'] != metric.name:
            if MetricDefinition.objects.filter(name=metric_data['name']).exists():
                raise DuplicateMetricName()
        
        # Validate data source if being changed
        if 'source_domain' in metric_data or 'source_model' in metric_data:
            source_domain = metric_data.get('source_domain', metric.source_domain)
            source_model = metric_data.get('source_model', metric.source_model)
            MetricDefinitionService._validate_data_source(source_domain, source_model)
        
        with transaction.atomic():
            for key, value in metric_data.items():
                setattr(metric, key, value)
            
            metric.save()
            
            # Clear related cached data
            cache_pattern = f"metric_{metric.id}_*"
            cache.delete_pattern(cache_pattern)
            
            logger.info(f"Updated metric definition: {metric.name}")
            return metric
    
    @staticmethod
    def delete_metric(metric_id):
        """Delete a metric definition"""
        metric = MetricDefinitionService.get_metric_by_id(metric_id)
        
        with transaction.atomic():
            metric_name = metric.name
            
            # Clear related cached data
            cache_pattern = f"metric_{metric.id}_*"
            cache.delete_pattern(cache_pattern)
            
            metric.delete()
            logger.info(f"Deleted metric definition: {metric_name}")
            return True
    
    @staticmethod
    def calculate_metric(metric_id, start_date=None, end_date=None, filters=None):
        """Calculate a metric value for a given time period"""
        metric = MetricDefinitionService.get_metric_by_id(metric_id)
        
        # Set default time range if not provided
        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Generate cache key
        cache_key = f"metric_{metric_id}_{start_date.date()}_{end_date.date()}"
        if filters:
            # Add filters to cache key
            import hashlib
            filter_hash = hashlib.md5(str(sorted(filters.items())).encode()).hexdigest()[:8]
            cache_key += f"_{filter_hash}"
        
        # Check cache first
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return cached_result
        
        try:
            # Get the source model with enhanced error handling
            model = MetricDefinitionService._get_source_model(metric.source_domain, metric.source_model)
            
            # Verify the model exists and is accessible
            if not model:
                raise DataSourceNotAvailable(f"Model is None for {metric.source_domain}.{metric.source_model}")
            
            # Build the queryset with error checking
            try:
                queryset = model.objects.all()
            except Exception as e:
                logger.error(f"Failed to create queryset for {model}: {str(e)}")
                raise MetricCalculationError(f"Database access failed for {metric.source_domain}.{metric.source_model}: {str(e)}")
            
            # Apply time filters with fallback field names
            time_field = None
            for field_name in ['created_at', 'timestamp', 'date_created', 'created']:
                if hasattr(model, field_name):
                    time_field = field_name
                    break
            
            if time_field:
                try:
                    queryset = queryset.filter(**{
                        f'{time_field}__gte': start_date,
                        f'{time_field}__lte': end_date
                    })
                except Exception as e:
                    logger.warning(f"Time filtering failed on {time_field}: {str(e)}")
                    # Continue without time filtering rather than fail
            else:
                logger.warning(f"No time field found for model {model}. Metric calculation may be inaccurate.")
            
            # Apply metric-specific filters
            if metric.filters:
                queryset = MetricDefinitionService._apply_filters(queryset, metric.filters)
            
            # Apply additional filters
            if filters:
                queryset = MetricDefinitionService._apply_filters(queryset, filters)
            
            # Calculate the metric value based on type
            result = MetricDefinitionService._calculate_metric_value(metric, queryset)
            
            # Cache the result for 5 minutes
            cache.set(cache_key, result, 300)
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating metric {metric.name}: {str(e)}")
            raise MetricCalculationError(f"Failed to calculate metric: {str(e)}")
    
    @staticmethod
    def _validate_data_source(source_domain, source_model):
        """Validate that the data source exists"""
        try:
            app_config = apps.get_app_config(f'core.domains.{source_domain}')
            model = app_config.get_model(source_model)
            return model
        except (LookupError, AttributeError):
            raise InvalidMetricConfiguration(f"Invalid data source: {source_domain}.{source_model}")
    
    @staticmethod
    def _get_source_model(source_domain, source_model):
        """Get the Django model for the data source with enhanced error handling"""
        try:
            # First try the standard app label format
            return apps.get_model(f'core.domains.{source_domain}', source_model)
        except LookupError:
            try:
                # Try alternative app label format (without 'core.domains' prefix)
                return apps.get_model(source_domain, source_model)
            except LookupError:
                try:
                    # Try with just the domain name as app label
                    return apps.get_model(f'{source_domain}', source_model)
                except LookupError:
                    # Log available apps and models for debugging
                    available_apps = [app.label for app in apps.get_app_configs()]
                    logger.error(f"Failed to find model {source_model} in domain {source_domain}")
                    logger.error(f"Available apps: {available_apps}")
                    raise DataSourceNotAvailable(
                        f"Data source not available: {source_domain}.{source_model}. "
                        f"Available apps: {available_apps}"
                    )
    
    @staticmethod
    def _apply_filters(queryset, filters):
        """Apply filters to a queryset"""
        try:
            for field, value in filters.items():
                if isinstance(value, dict):
                    # Handle complex filters like {"gte": 100}
                    for lookup, lookup_value in value.items():
                        queryset = queryset.filter(**{f"{field}__{lookup}": lookup_value})
                else:
                    # Handle simple filters
                    queryset = queryset.filter(**{field: value})
            return queryset
        except Exception as e:
            logger.error(f"Error applying filters: {str(e)}")
            return queryset
    
    @staticmethod
    def _calculate_metric_value(metric, queryset):
        """Calculate the actual metric value"""
        try:
            if metric.metric_type == 'COUNT':
                return queryset.count()
            
            elif metric.metric_type == 'SUM':
                if not metric.source_field:
                    raise InvalidMetricConfiguration("SUM metrics require a source_field")
                result = queryset.aggregate(total=Sum(metric.source_field))
                return result['total'] or Decimal('0.00')
            
            elif metric.metric_type == 'AVERAGE':
                if not metric.source_field:
                    raise InvalidMetricConfiguration("AVERAGE metrics require a source_field")
                result = queryset.aggregate(avg=Avg(metric.source_field))
                return result['avg'] or Decimal('0.00')
            
            elif metric.metric_type == 'PERCENTAGE':
                # Calculate percentage based on calculation_rules
                total_queryset = queryset
                filtered_queryset = queryset
                
                if 'percentage_filter' in metric.calculation_rules:
                    filtered_queryset = MetricDefinitionService._apply_filters(
                        queryset, metric.calculation_rules['percentage_filter']
                    )
                
                total = total_queryset.count()
                filtered = filtered_queryset.count()
                
                if total == 0:
                    return Decimal('0.00')
                
                return Decimal(str((filtered / total) * 100))
            
            elif metric.metric_type == 'CONVERSION_RATE':
                # Calculate conversion rate based on calculation_rules
                numerator_filter = metric.calculation_rules.get('numerator_filter', {})
                denominator_filter = metric.calculation_rules.get('denominator_filter', {})
                
                numerator_qs = MetricDefinitionService._apply_filters(queryset, numerator_filter)
                denominator_qs = MetricDefinitionService._apply_filters(queryset, denominator_filter)
                
                numerator = numerator_qs.count()
                denominator = denominator_qs.count()
                
                if denominator == 0:
                    return Decimal('0.00')
                
                return Decimal(str((numerator / denominator) * 100))
            
            elif metric.metric_type == 'REVENUE':
                # Sum revenue field or calculate from related models
                if metric.source_field:
                    result = queryset.aggregate(total=Sum(metric.source_field))
                    return result['total'] or Decimal('0.00')
                else:
                    # Custom revenue calculation logic can be added here
                    return Decimal('0.00')
            
            else:
                # Custom calculation logic
                return Decimal('0.00')
                
        except Exception as e:
            logger.error(f"Error in metric calculation: {str(e)}")
            raise MetricCalculationError(str(e))


class DashboardService:
    """Service for managing dashboards"""
    
    @staticmethod
    def get_all_dashboards(user, dashboard_type=None, is_active=None):
        """Get all dashboards accessible to the user"""
        queryset = Dashboard.objects.all()
        
        # Filter by type
        if dashboard_type:
            queryset = queryset.filter(dashboard_type=dashboard_type)
        
        # Filter by active status
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        # Apply access control
        user_role = getattr(user, 'role', 'CLIENT')
        queryset = queryset.filter(
            Q(is_public=True) |
            Q(created_by=user) |
            Q(allowed_roles__contains=[user_role])
        )
        
        return queryset.order_by('name')
    
    @staticmethod
    def get_dashboard_by_id(dashboard_id, user=None):
        """Get a dashboard by ID with optional access control"""
        try:
            dashboard = Dashboard.objects.prefetch_related('widgets__metric_definition').get(id=dashboard_id)
        except Dashboard.DoesNotExist:
            raise DashboardNotFound()
        
        # Check access only if user is provided
        if user:
            user_role = getattr(user, 'role', 'CLIENT')
            if not (dashboard.is_public or 
                    dashboard.created_by == user or 
                    user_role in dashboard.allowed_roles):
                raise UnauthorizedDashboardAccess()
        
        return dashboard
    
    @staticmethod
    def create_dashboard(dashboard_data, user=None):
        """Create a new dashboard"""
        # Check for duplicate name
        if Dashboard.objects.filter(name=dashboard_data['name']).exists():
            raise DuplicateDashboardName()
        
        if user:
            dashboard_data['created_by'] = user
        
        with transaction.atomic():
            dashboard = Dashboard.objects.create(**dashboard_data)
            logger.info(f"Created new dashboard: {dashboard.name}")
            return dashboard
    
    @staticmethod
    def update_dashboard(dashboard_id, dashboard_data, user):
        """Update an existing dashboard"""
        dashboard = DashboardService.get_dashboard_by_id(dashboard_id, user)
        
        # Check for duplicate name if name is being changed
        if 'name' in dashboard_data and dashboard_data['name'] != dashboard.name:
            if Dashboard.objects.filter(name=dashboard_data['name']).exists():
                raise DuplicateDashboardName()
        
        with transaction.atomic():
            for key, value in dashboard_data.items():
                if key != 'created_by':  # Don't allow changing creator
                    setattr(dashboard, key, value)
            
            dashboard.save()
            logger.info(f"Updated dashboard: {dashboard.name}")
            return dashboard
    
    @staticmethod
    def delete_dashboard(dashboard_id, user):
        """Delete a dashboard"""
        dashboard = DashboardService.get_dashboard_by_id(dashboard_id, user)
        
        with transaction.atomic():
            dashboard_name = dashboard.name
            dashboard.delete()
            logger.info(f"Deleted dashboard: {dashboard_name}")
            return True
    
    @staticmethod
    def add_widget(dashboard_id, widget_data, user):
        """Add a widget to a dashboard"""
        dashboard = DashboardService.get_dashboard_by_id(dashboard_id, user)
        
        widget_data['dashboard'] = dashboard
        
        with transaction.atomic():
            widget = Widget.objects.create(**widget_data)
            logger.info(f"Added widget {widget.title} to dashboard {dashboard.name}")
            return widget
    
    @staticmethod
    def update_widget(widget_id, widget_data, user):
        """Update a widget"""
        try:
            widget = Widget.objects.select_related('dashboard').get(id=widget_id)
        except Widget.DoesNotExist:
            raise WidgetNotFound()
        
        # Check dashboard access
        DashboardService.get_dashboard_by_id(widget.dashboard.id, user)
        
        with transaction.atomic():
            for key, value in widget_data.items():
                if key != 'dashboard':  # Don't allow changing dashboard
                    setattr(widget, key, value)
            
            widget.save()
            logger.info(f"Updated widget: {widget.title}")
            return widget
    
    @staticmethod
    def delete_widget(widget_id, user):
        """Delete a widget"""
        try:
            widget = Widget.objects.select_related('dashboard').get(id=widget_id)
        except Widget.DoesNotExist:
            raise WidgetNotFound()
        
        # Check dashboard access
        DashboardService.get_dashboard_by_id(widget.dashboard.id, user)
        
        with transaction.atomic():
            widget_title = widget.title
            widget.delete()
            logger.info(f"Deleted widget: {widget_title}")
            return True
    
    @staticmethod
    def get_dashboard_data(dashboard_id, user, time_range='last_30_days'):
        """Get all data for a dashboard"""
        from .serializers import WidgetSerializer
        
        dashboard = DashboardService.get_dashboard_by_id(dashboard_id, user)
        
        # Parse time range
        start_date, end_date = DashboardService._parse_time_range(time_range)
        
        # Get data for each widget
        widgets_data = []
        for widget in dashboard.widgets.filter(is_visible=True).order_by('order'):
            try:
                metric_value = MetricDefinitionService.calculate_metric(
                    widget.metric_definition.id,
                    start_date=start_date,
                    end_date=end_date,
                    filters=widget.data_filters
                )
                
                # Serialize the widget to avoid JSON serialization issues
                widget_data = WidgetSerializer(widget).data
                
                widgets_data.append({
                    'widget': widget_data,
                    'value': str(metric_value) if metric_value is not None else None,
                    'error': None
                })
            except Exception as e:
                logger.error(f"Error calculating widget {widget.title}: {str(e)}")
                
                # Serialize the widget to avoid JSON serialization issues
                widget_data = WidgetSerializer(widget).data
                
                widgets_data.append({
                    'widget': widget_data,
                    'value': None,
                    'error': str(e)
                })
        
        return {
            'dashboard': dashboard,
            'widgets_data': widgets_data,
            'time_range': {
                'start_date': start_date,
                'end_date': end_date,
                'label': time_range
            }
        }
    
    @staticmethod
    def _parse_time_range(time_range):
        """Parse time range string into start and end dates"""
        end_date = timezone.now()
        
        if time_range == 'last_24_hours':
            start_date = end_date - timedelta(days=1)
        elif time_range == 'last_7_days':
            start_date = end_date - timedelta(days=7)
        elif time_range == 'last_30_days':
            start_date = end_date - timedelta(days=30)
        elif time_range == 'last_90_days':
            start_date = end_date - timedelta(days=90)
        elif time_range == 'last_year':
            start_date = end_date - timedelta(days=365)
        elif time_range == 'this_month':
            start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif time_range == 'this_year':
            start_date = end_date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            # Default to last 30 days
            start_date = end_date - timedelta(days=30)
        
        return start_date, end_date


class ReportService:
    """Service for managing reports"""
    
    @staticmethod
    def get_all_reports(user, report_type=None, is_active=None):
        """Get all reports accessible to the user"""
        queryset = AnalyticsReport.objects.all()
        
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        # Apply access control (users can see reports they created or public ones)
        queryset = queryset.filter(
            Q(created_by=user) |
            Q(recipients__contains=[user.email])
        )
        
        return queryset.order_by('name')
    
    @staticmethod
    def get_report_by_id(report_id, user=None):
        """Get a report by ID with optional access control"""
        try:
            report = AnalyticsReport.objects.prefetch_related('metrics').get(id=report_id)
        except AnalyticsReport.DoesNotExist:
            raise ReportNotFound()
        
        # Check access only if user is provided
        if user and not (report.created_by == user or user.email in report.recipients):
            raise ReportNotFound()  # Don't reveal existence
        
        return report
    
    @staticmethod
    def create_report(report_data, user):
        """Create a new report"""
        # Check for duplicate name
        if AnalyticsReport.objects.filter(name=report_data['name']).exists():
            raise DuplicateReportName()
        
        metrics = report_data.pop('metrics', [])
        report_data['created_by'] = user
        
        with transaction.atomic():
            report = AnalyticsReport.objects.create(**report_data)
            
            if metrics:
                report.metrics.set(metrics)
            
            logger.info(f"Created new report: {report.name}")
            return report
    
    @staticmethod
    def get_execution_by_id(execution_id):
        """Get a report execution by ID"""
        try:
            return ReportExecution.objects.get(execution_id=execution_id)
        except ReportExecution.DoesNotExist:
            raise ReportExecutionNotFound()
    
    @staticmethod
    def update_report(report_id, report_data, user):
        """Update an existing report"""
        report = ReportService.get_report_by_id(report_id, user)
        
        # Check for duplicate name if name is being changed
        if 'name' in report_data and report_data['name'] != report.name:
            if AnalyticsReport.objects.filter(name=report_data['name']).exists():
                raise DuplicateReportName()
        
        metrics = report_data.pop('metrics', None)
        
        with transaction.atomic():
            for key, value in report_data.items():
                if key != 'created_by':  # Don't allow changing creator
                    setattr(report, key, value)
            
            if metrics is not None:
                report.metrics.set(metrics)
            
            report.save()
            logger.info(f"Updated report: {report.name}")
            return report
    
    @staticmethod
    def delete_report(report_id, user):
        """Delete a report"""
        report = ReportService.get_report_by_id(report_id, user)
        
        with transaction.atomic():
            report_name = report.name
            report.delete()
            logger.info(f"Deleted report: {report_name}")
            return True
    
    @staticmethod
    def execute_report(report_id, user, start_date=None, end_date=None, custom_filters=None):
        """Execute a report and create a report execution record"""
        report = ReportService.get_report_by_id(report_id, user)
        
        # Set default time range if not provided
        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Check for existing running execution
        existing_execution = ReportExecution.objects.filter(
            report=report,
            status='RUNNING'
        ).first()
        
        if existing_execution:
            return existing_execution
        
        with transaction.atomic():
            # Create execution record
            execution = ReportExecution.objects.create(
                report=report,
                status='PENDING',
                date_range_start=start_date,
                date_range_end=end_date,
                execution_params={
                    'custom_filters': custom_filters or {},
                    'requested_format': report.output_format
                },
                requested_by=user
            )
            
            try:
                # Start execution
                execution.status = 'RUNNING'
                execution.started_at = timezone.now()
                execution.save()
                
                # Calculate all metrics for the report
                result_data = {}
                for metric in report.metrics.all():
                    try:
                        filters = {**report.filters, **(custom_filters or {})}
                        value = MetricDefinitionService.calculate_metric(
                            metric.id,
                            start_date=start_date,
                            end_date=end_date,
                            filters=filters
                        )
                        result_data[metric.name] = {
                            'value': str(value),
                            'metric_type': metric.metric_type,
                            'display_format': metric.display_format
                        }
                    except Exception as e:
                        logger.error(f"Error calculating metric {metric.name} for report: {str(e)}")
                        result_data[metric.name] = {
                            'value': None,
                            'error': str(e)
                        }
                
                # Complete execution
                execution.status = 'COMPLETED'
                execution.completed_at = timezone.now()
                execution.result_data = result_data
                execution.execution_time_seconds = (
                    execution.completed_at - execution.started_at
                ).total_seconds()
                execution.save()
                
                # Update report last generated time
                report.last_generated = execution.completed_at
                report.save()
                
                logger.info(f"Completed report execution: {report.name}")
                return execution
                
            except Exception as e:
                logger.error(f"Report execution failed: {str(e)}")
                execution.status = 'FAILED'
                execution.error_message = str(e)
                execution.completed_at = timezone.now()
                execution.save()
                raise ReportGenerationFailed(str(e))
    
    @staticmethod
    def get_report_execution(execution_id, user):
        """Get a report execution by ID"""
        try:
            execution = ReportExecution.objects.select_related('report').get(execution_id=execution_id)
        except ReportExecution.DoesNotExist:
            raise ReportExecutionNotFound()
        
        # Check access through report
        ReportService.get_report_by_id(execution.report.id, user)
        
        return execution


class EventTrackingService:
    """Service for real-time event tracking"""
    
    @staticmethod
    def track_event(event_name, event_category='USER_ACTION', source_domain=None, 
                   source_model=None, source_id=None, user=None, session_id=None,
                   event_data=None, numeric_value=None, ip_address=None, user_agent=None):
        """Track an analytics event"""
        try:
            # Handle UUID or non-integer source_id values
            processed_source_id = None
            processed_event_data = event_data or {}
            
            if source_id is not None:
                # Handle UUID objects and other non-integer types
                if hasattr(source_id, 'hex'):  # UUID object
                    processed_event_data = processed_event_data.copy()  # Don't mutate original
                    processed_event_data['original_source_id'] = str(source_id)
                    logger.debug(f"UUID source_id {source_id} stored in event_data")
                else:
                    try:
                        # Try to convert to integer for PositiveIntegerField
                        processed_source_id = int(source_id)
                        # Check if the integer is within valid range for PositiveIntegerField
                        if processed_source_id > 2147483647 or processed_source_id < 0:
                            raise ValueError(f"Integer {processed_source_id} out of range for PositiveIntegerField")
                    except (ValueError, TypeError, OverflowError) as e:
                        # If it's not an integer or out of range, store it in event_data instead
                        processed_event_data = processed_event_data.copy()  # Don't mutate original
                        processed_event_data['original_source_id'] = str(source_id)
                        logger.debug(f"Non-integer or out-of-range source_id {source_id} stored in event_data: {e}")
            
            event = AnalyticsEvent.objects.create(
                event_name=event_name,
                event_category=event_category,
                source_domain=source_domain or '',
                source_model=source_model or '',
                source_id=processed_source_id,
                user=user,
                session_id=session_id or '',
                ip_address=ip_address,
                user_agent=user_agent or '',
                event_data=processed_event_data,
                numeric_value=numeric_value
            )
            
            # Trigger real-time metric updates if needed
            EventTrackingService._update_real_time_metrics(event)
            
            return event
            
        except Exception as e:
            # Log more detailed error information for debugging
            error_details = {
                'event_name': event_name,
                'event_category': event_category,
                'source_domain': source_domain,
                'source_model': source_model,
                'source_id': source_id,
                'source_id_type': type(source_id).__name__,
                'error': str(e),
                'error_type': type(e).__name__
            }
            logger.error(f"Error tracking event {event_name}: {str(e)} - Details: {error_details}")
            # Don't raise exception to avoid breaking the main flow
            return None
    
    @staticmethod
    def _update_real_time_metrics(event):
        """Update real-time metrics based on the event"""
        # Find metrics that should be updated for this event
        relevant_metrics = MetricDefinition.objects.filter(
            is_real_time=True,
            is_active=True,
            source_domain=event.source_domain
        )
        
        for metric in relevant_metrics:
            try:
                # Calculate and cache the updated metric value
                current_value = MetricDefinitionService.calculate_metric(metric.id)
                cache_key = f"real_time_metric_{metric.id}"
                cache.set(cache_key, current_value, 300)  # Cache for 5 minutes
            except Exception as e:
                logger.error(f"Error updating real-time metric {metric.name}: {str(e)}")


class AlertService:
    """Service for managing alerts"""
    
    @staticmethod
    def get_all_alert_rules(user, is_active=None):
        """Get all alert rules for the user"""
        queryset = AlertRule.objects.filter(created_by=user)
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        return queryset.order_by('name')
    
    @staticmethod
    def get_alert_rule_by_id(rule_id, user=None):
        """Get an alert rule by ID"""
        try:
            if user:
                return AlertRule.objects.get(id=rule_id, created_by=user)
            else:
                return AlertRule.objects.get(id=rule_id)
        except AlertRule.DoesNotExist:
            raise AlertRuleNotFound()
    
    @staticmethod
    def create_alert_rule(rule_data, user):
        """Create a new alert rule"""
        rule_data['created_by'] = user
        
        with transaction.atomic():
            alert_rule = AlertRule.objects.create(**rule_data)
            logger.info(f"Created new alert rule: {alert_rule.name}")
            return alert_rule
    
    @staticmethod
    def update_alert_rule(rule_id, rule_data, user):
        """Update an existing alert rule"""
        alert_rule = AlertService.get_alert_rule_by_id(rule_id, user)
        
        with transaction.atomic():
            for key, value in rule_data.items():
                if key != 'created_by':
                    setattr(alert_rule, key, value)
            
            alert_rule.save()
            logger.info(f"Updated alert rule: {alert_rule.name}")
            return alert_rule
    
    @staticmethod
    def delete_alert_rule(rule_id, user):
        """Delete an alert rule"""
        alert_rule = AlertService.get_alert_rule_by_id(rule_id, user)
        
        with transaction.atomic():
            rule_name = alert_rule.name
            alert_rule.delete()
            logger.info(f"Deleted alert rule: {rule_name}")
            return True
    
    @staticmethod
    def evaluate_alert_rules():
        """Evaluate all active alert rules"""
        active_rules = AlertRule.objects.filter(is_active=True)
        
        for rule in active_rules:
            try:
                AlertService._evaluate_single_rule(rule)
            except Exception as e:
                logger.error(f"Error evaluating alert rule {rule.name}: {str(e)}")
    
    @staticmethod
    def _evaluate_single_rule(rule):
        """Evaluate a single alert rule"""
        # Check cooldown period
        if rule.last_triggered:
            cooldown_until = rule.last_triggered + timedelta(minutes=rule.cooldown_minutes)
            if timezone.now() < cooldown_until:
                return  # Still in cooldown
        
        # Calculate current metric value
        start_date, end_date = AlertService._parse_evaluation_period(rule.evaluation_period)
        current_value = MetricDefinitionService.calculate_metric(
            rule.metric_definition.id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Check if threshold is met
        threshold_met = AlertService._check_threshold(rule, current_value)
        
        if threshold_met:
            # Trigger alert
            AlertService._trigger_alert(rule, current_value)
        
        # Update last evaluated time
        rule.last_evaluated = timezone.now()
        rule.save(update_fields=['last_evaluated'])
    
    @staticmethod
    def _parse_evaluation_period(period):
        """Parse evaluation period into start and end dates"""
        end_date = timezone.now()
        
        if period == 'last_hour':
            start_date = end_date - timedelta(hours=1)
        elif period == 'last_day':
            start_date = end_date - timedelta(days=1)
        elif period == 'last_week':
            start_date = end_date - timedelta(weeks=1)
        elif period == 'last_month':
            start_date = end_date - timedelta(days=30)
        else:
            # Default to last hour
            start_date = end_date - timedelta(hours=1)
        
        return start_date, end_date
    
    @staticmethod
    def _check_threshold(rule, current_value):
        """Check if the current value meets the threshold condition"""
        threshold = rule.threshold_value
        
        if rule.operator == 'GT':
            return current_value > threshold
        elif rule.operator == 'GTE':
            return current_value >= threshold
        elif rule.operator == 'LT':
            return current_value < threshold
        elif rule.operator == 'LTE':
            return current_value <= threshold
        elif rule.operator == 'EQ':
            return current_value == threshold
        elif rule.operator == 'NE':
            return current_value != threshold
        else:
            return False
    
    @staticmethod
    def _trigger_alert(rule, current_value):
        """Trigger an alert notification"""
        try:
            # Create notification message
            message = f"Alert: {rule.name}\n"
            message += f"Metric: {rule.metric_definition.name}\n"
            message += f"Current Value: {current_value}\n"
            message += f"Threshold: {rule.operator} {rule.threshold_value}\n"
            message += f"Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}"
            
            # Send notifications based on configured methods
            for method in rule.notification_methods:
                if method == 'EMAIL':
                    AlertService._send_email_alert(rule, message)
                elif method == 'IN_APP':
                    AlertService._send_in_app_notification(rule, message)
            
            # Update last triggered time
            rule.last_triggered = timezone.now()
            rule.save(update_fields=['last_triggered'])
            
            logger.info(f"Alert triggered: {rule.name}")
            
        except Exception as e:
            logger.error(f"Error triggering alert {rule.name}: {str(e)}")
    
    @staticmethod
    def _send_email_alert(rule, message):
        """Send email alert notification"""
        try:
            from core.domains.communications.services import CommunicationService
            
            for email in rule.recipients:
                CommunicationService.send_manual_message(
                    recipient_email=email,
                    subject=f"Analytics Alert: {rule.name}",
                    message=message,
                    channel='EMAIL'
                )
        except Exception as e:
            logger.error(f"Error sending email alert: {str(e)}")
    
    @staticmethod
    def _send_in_app_notification(rule, message):
        """Send in-app notification"""
        try:
            from core.domains.notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=rule.created_by,
                notification_type_code='ANALYTICS_ALERT',
                context={
                    'alert_name': rule.name,
                    'alert_message': message,
                }
            )
        except Exception as e:
            logger.error(f"Error sending in-app notification: {str(e)}")


class ConversionFunnelService:
    """Service for managing conversion funnels"""
    
    @staticmethod
    def get_all_funnels(is_active=None):
        """Get all conversion funnels"""
        queryset = ConversionFunnel.objects.all()
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        return queryset.order_by('name')
    
    @staticmethod
    def get_funnel_by_id(funnel_id):
        """Get a conversion funnel by ID"""
        try:
            return ConversionFunnel.objects.get(id=funnel_id)
        except ConversionFunnel.DoesNotExist:
            raise ConversionFunnelNotFound()
    
    @staticmethod
    def create_funnel(funnel_data):
        """Create a new conversion funnel"""
        with transaction.atomic():
            funnel = ConversionFunnel.objects.create(**funnel_data)
            logger.info(f"Created new conversion funnel: {funnel.name}")
            return funnel
    
    @staticmethod
    def update_funnel(funnel_id, funnel_data):
        """Update an existing conversion funnel"""
        funnel = ConversionFunnelService.get_funnel_by_id(funnel_id)
        
        with transaction.atomic():
            for key, value in funnel_data.items():
                setattr(funnel, key, value)
            
            funnel.save()
            logger.info(f"Updated conversion funnel: {funnel.name}")
            return funnel
    
    @staticmethod
    def delete_funnel(funnel_id):
        """Delete a conversion funnel"""
        funnel = ConversionFunnelService.get_funnel_by_id(funnel_id)
        
        with transaction.atomic():
            funnel_name = funnel.name
            funnel.delete()
            logger.info(f"Deleted conversion funnel: {funnel_name}")
            return True
    
    @staticmethod
    def track_funnel_event(funnel_id, user=None, session_id=None, event_name=None, event_data=None):
        """Track an event in a conversion funnel"""
        funnel = ConversionFunnelService.get_funnel_by_id(funnel_id)
        
        if not funnel.is_active:
            return None
        
        # Find or create conversion record
        conversion = ConversionFunnelService._get_or_create_conversion(
            funnel, user, session_id
        )
        
        if conversion.is_completed:
            return conversion  # Already completed
        
        # Find which step this event corresponds to
        step_index = ConversionFunnelService._find_step_index(funnel, event_name)
        
        if step_index is not None and step_index == conversion.current_step:
            # User completed the current step
            with transaction.atomic():
                conversion.completed_steps.append({
                    'step_index': step_index,
                    'timestamp': timezone.now().isoformat(),
                    'event_data': event_data or {}
                })
                conversion.current_step = step_index + 1
                
                # Update conversion data
                if event_data:
                    conversion.conversion_data.update(event_data)
                
                # Check if funnel is completed
                if conversion.current_step >= len(funnel.steps):
                    conversion.is_completed = True
                    conversion.completed_at = timezone.now()
                
                conversion.save()
                
                logger.info(f"Funnel step completed: {funnel.name} step {step_index}")
        
        return conversion
    
    @staticmethod
    def _get_or_create_conversion(funnel, user, session_id):
        """Get or create a conversion record"""
        # Try to find existing conversion
        filters = {'funnel': funnel, 'is_completed': False}
        
        if user:
            filters['user'] = user
        elif session_id:
            filters['session_id'] = session_id
        else:
            return None  # Need either user or session
        
        # Check for recent incomplete conversion
        time_window = timezone.now() - timedelta(hours=funnel.time_window_hours)
        conversion = FunnelConversion.objects.filter(
            **filters,
            started_at__gte=time_window
        ).first()
        
        if not conversion:
            # Create new conversion
            conversion = FunnelConversion.objects.create(
                funnel=funnel,
                user=user,
                session_id=session_id or '',
                started_at=timezone.now()
            )
        
        return conversion
    
    @staticmethod
    def _find_step_index(funnel, event_name):
        """Find the step index for an event name"""
        for i, step in enumerate(funnel.steps):
            if step.get('event_name') == event_name:
                return i
        return None
    
    @staticmethod
    def get_funnel_analytics(funnel_id, start_date=None, end_date=None):
        """Get analytics for a conversion funnel"""
        funnel = ConversionFunnelService.get_funnel_by_id(funnel_id)
        
        # Set default time range
        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get conversions in time range
        conversions = FunnelConversion.objects.filter(
            funnel=funnel,
            started_at__gte=start_date,
            started_at__lte=end_date
        )
        
        total_started = conversions.count()
        total_completed = conversions.filter(is_completed=True).count()
        
        # Calculate step-by-step conversion rates
        step_analytics = []
        for i, step in enumerate(funnel.steps):
            completed_this_step = conversions.filter(
                current_step__gt=i
            ).count()
            
            if total_started > 0:
                conversion_rate = (completed_this_step / total_started) * 100
            else:
                conversion_rate = 0
            
            step_analytics.append({
                'step_index': i,
                'step_name': step.get('name', f'Step {i + 1}'),
                'completed_count': completed_this_step,
                'conversion_rate': conversion_rate
            })
        
        overall_conversion_rate = (total_completed / total_started * 100) if total_started > 0 else 0
        
        return {
            'funnel': funnel,
            'total_started': total_started,
            'total_completed': total_completed,
            'overall_conversion_rate': overall_conversion_rate,
            'step_analytics': step_analytics,
            'time_range': {
                'start_date': start_date,
                'end_date': end_date
            }
        }


class DataAggregationService:
    """Service for cross-domain data aggregation"""
    
    @staticmethod
    def aggregate_business_metrics(start_date=None, end_date=None):
        """Aggregate key business metrics across all domains"""
        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Initialize all metrics with default values to ensure they exist
        metrics = {
            'total_events': 0,
            'confirmed_events': 0,
            'completed_events': 0,
            'event_conversion_rate': Decimal('0.00'),
            'total_payments': 0,
            'completed_payments': 0,
            'total_revenue': Decimal('0.00'),
            'average_payment_value': Decimal('0.00'),
            'total_booking_sessions': 0,
            'completed_booking_sessions': 0,
            'abandoned_booking_sessions': 0,
            'booking_conversion_rate': Decimal('0.00'),
            'new_users': 0,
            'new_clients': 0,
        }
        
        try:
            # Events domain metrics
            # Try multiple possible model names/locations
            Event = None
            try:
                Event = apps.get_model('events', 'Event')
            except LookupError:
                try:
                    Event = apps.get_model('core.domains.events', 'Event')
                except LookupError:
                    logger.warning("Event model not found, skipping events metrics")
            
            if Event:
                events_qs = Event.objects.filter(
                    created_at__gte=start_date,
                    created_at__lte=end_date
                )
                
                metrics['total_events'] = events_qs.count()
                metrics['confirmed_events'] = events_qs.filter(status='CONFIRMED').count()
                metrics['completed_events'] = events_qs.filter(status='COMPLETED').count()
                
                # Calculate event conversion rate
                if metrics['total_events'] > 0:
                    metrics['event_conversion_rate'] = Decimal(str(
                        (metrics['confirmed_events'] / metrics['total_events']) * 100
                    ))
                
        except Exception as e:
            logger.error(f"Error aggregating events metrics: {str(e)}")
        
        try:
            # Payments domain metrics
            Payment = None
            try:
                Payment = apps.get_model('payments', 'Payment')
            except LookupError:
                try:
                    Payment = apps.get_model('core.domains.payments', 'Payment')
                except LookupError:
                    logger.warning("Payment model not found, skipping payments metrics")
            
            if Payment:
                # For revenue metrics, use paid_on date for completed payments
                # This shows actual revenue received during the period
                payments_qs = Payment.objects.filter(
                    created_at__gte=start_date,
                    created_at__lte=end_date
                )
                
                # Count all payments created in the period
                metrics['total_payments'] = payments_qs.count()
                
                # For completed payments and revenue, use paid_on date
                # This reflects actual money received during the period
                completed_payments_qs = Payment.objects.filter(
                    status='COMPLETED',
                    paid_on__gte=start_date.date() if hasattr(start_date, 'date') else start_date,
                    paid_on__lte=end_date.date() if hasattr(end_date, 'date') else end_date
                )
                
                metrics['completed_payments'] = completed_payments_qs.count()
                
                # Calculate total revenue from payments actually paid during the period
                total_revenue = completed_payments_qs.aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00')
                metrics['total_revenue'] = total_revenue
                
                # Calculate average payment value
                if metrics['completed_payments'] > 0:
                    metrics['average_payment_value'] = total_revenue / metrics['completed_payments']
                
        except Exception as e:
            logger.error(f"Error aggregating payments metrics: {str(e)}")
        
        try:
            # Booking flow metrics
            BookingSession = None
            try:
                BookingSession = apps.get_model('bookingflow', 'BookingSession')
            except LookupError:
                try:
                    BookingSession = apps.get_model('core.domains.bookingflow', 'BookingSession')
                except LookupError:
                    logger.warning("BookingSession model not found, skipping booking metrics")
            
            if BookingSession:
                sessions_qs = BookingSession.objects.filter(
                    created_at__gte=start_date,
                    created_at__lte=end_date
                )
                
                metrics['total_booking_sessions'] = sessions_qs.count()
                metrics['completed_booking_sessions'] = sessions_qs.filter(is_completed=True).count()
                metrics['abandoned_booking_sessions'] = sessions_qs.filter(is_abandoned=True).count()
                
                # Calculate booking conversion rate
                if metrics['total_booking_sessions'] > 0:
                    metrics['booking_conversion_rate'] = Decimal(str(
                        (metrics['completed_booking_sessions'] / metrics['total_booking_sessions']) * 100
                    ))
                
        except Exception as e:
            logger.error(f"Error aggregating booking flow metrics: {str(e)}")
        
        try:
            # Users domain metrics
            User = None
            try:
                User = apps.get_model('users', 'User')
            except LookupError:
                try:
                    User = apps.get_model('core.domains.users', 'User')
                except LookupError:
                    try:
                        # Try the auth user model
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                    except:
                        logger.warning("User model not found, skipping user metrics")
            
            if User:
                # Check if the User model has the expected fields
                if hasattr(User, 'date_joined'):
                    date_field = 'date_joined'
                elif hasattr(User, 'created_at'):
                    date_field = 'created_at'
                else:
                    logger.warning("User model missing date field, skipping user metrics")
                    User = None
                
                if User:
                    users_qs = User.objects.filter(
                        **{f'{date_field}__gte': start_date, f'{date_field}__lte': end_date}
                    )
                    
                    metrics['new_users'] = users_qs.count()
                    
                    # Check if role field exists
                    if hasattr(User, 'role'):
                        metrics['new_clients'] = users_qs.filter(role='CLIENT').count()
                    else:
                        # Fallback: assume all non-staff users are clients
                        if hasattr(User, 'is_staff'):
                            metrics['new_clients'] = users_qs.filter(is_staff=False).count()
                        else:
                            metrics['new_clients'] = metrics['new_users']  # Fallback
                
        except Exception as e:
            logger.error(f"Error aggregating users metrics: {str(e)}")
        
        # Ensure all values are properly typed for serialization
        for key, value in metrics.items():
            if isinstance(value, Decimal):
                # Keep Decimal for numeric calculations but ensure it's JSON serializable
                metrics[key] = value
            elif key.endswith('_rate') and not isinstance(value, Decimal):
                # Convert rate percentages to Decimal
                metrics[key] = Decimal(str(value))
        
        logger.info(f"Aggregated business metrics: {metrics}")
        return metrics
    
    @staticmethod
    def create_daily_aggregations(date=None):
        """Create daily aggregations for all active metrics"""
        if not date:
            date = timezone.now().date()
        
        start_datetime = timezone.make_aware(datetime.combine(date, datetime.min.time()))
        end_datetime = start_datetime + timedelta(days=1)
        
        # Get all active metrics that need daily aggregation
        metrics = MetricDefinition.objects.filter(
            is_active=True,
            aggregation_period='DAILY'
        )
        
        for metric in metrics:
            try:
                # Check if aggregation already exists
                existing = EventAggregation.objects.filter(
                    metric_definition=metric,
                    aggregation_type='DAILY',
                    period_start=start_datetime
                ).first()
                
                if existing and existing.is_complete:
                    continue  # Already processed
                
                # Calculate metric value for the day
                value = MetricDefinitionService.calculate_metric(
                    metric.id,
                    start_date=start_datetime,
                    end_date=end_datetime
                )
                
                # Create or update aggregation
                aggregation, created = EventAggregation.objects.update_or_create(
                    metric_definition=metric,
                    aggregation_type='DAILY',
                    period_start=start_datetime,
                    defaults={
                        'period_end': end_datetime,
                        'total_sum': value if metric.metric_type in ['SUM', 'REVENUE'] else Decimal('0.00'),
                        'total_count': int(value) if metric.metric_type == 'COUNT' else 0,
                        'average_value': value if metric.metric_type == 'AVERAGE' else None,
                        'is_complete': True,
                        'aggregated_data': {
                            'calculated_value': str(value),
                            'metric_type': metric.metric_type
                        }
                    }
                )
                
                if created:
                    logger.info(f"Created daily aggregation for {metric.name} on {date}")
                else:
                    logger.info(f"Updated daily aggregation for {metric.name} on {date}")
                    
            except Exception as e:
                logger.error(f"Error creating daily aggregation for {metric.name}: {str(e)}")
    
    @staticmethod
    def cleanup_old_events(days_to_keep=90):
        """Clean up old analytics events to manage database size"""
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)
        
        deleted_count = AnalyticsEvent.objects.filter(
            event_timestamp__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old analytics events")
        return deleted_count