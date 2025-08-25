# backend/core/domains/analytics/export_service.py
import csv
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from io import StringIO
from django.http import HttpResponse
from django.contrib.auth import get_user_model

from .models import MetricDefinition, Dashboard, Widget, AlertRule, AnalyticsEvent
from .security import AuditLogger

User = get_user_model()


class DataExportService:
    """Service for exporting analytics data and configurations"""

    @staticmethod
    def export_metrics_configuration(user: User, format: str = 'json') -> Dict[str, Any]:
        """Export all metrics configuration"""
        AuditLogger.log_data_access(
            type('MockRequest', (), {
                'META': {'REMOTE_ADDR': '127.0.0.1'},
                'user': user
            })(), 
            'metrics_configuration', 
            'all', 
            'export'
        )
        
        metrics = MetricDefinition.objects.all().values(
            'name', 'description', 'metric_type', 'source_domain', 
            'source_model', 'source_field', 'calculation_rules', 
            'filters', 'aggregation_period', 'is_real_time', 
            'display_format', 'decimal_places', 'is_active'
        )
        
        export_data = {
            'export_type': 'metrics_configuration',
            'exported_at': datetime.now().isoformat(),
            'exported_by': user.email,
            'metrics': list(metrics)
        }
        
        return export_data

    @staticmethod
    def export_dashboard_settings(user: User, format: str = 'json') -> Dict[str, Any]:
        """Export dashboard configurations and widgets"""
        AuditLogger.log_data_access(
            type('MockRequest', (), {
                'META': {'REMOTE_ADDR': '127.0.0.1'},
                'user': user
            })(), 
            'dashboard_settings', 
            'all', 
            'export'
        )
        
        dashboards = []
        for dashboard in Dashboard.objects.all():
            widgets = list(dashboard.widgets.all().values(
                'widget_type', 'title', 'size', 'position_x', 'position_y',
                'order', 'chart_config', 'time_range', 'data_filters',
                'comparison_enabled', 'comparison_period', 'is_visible'
            ))
            
            dashboard_data = {
                'name': dashboard.name,
                'description': dashboard.description,
                'dashboard_type': dashboard.dashboard_type,
                'is_public': dashboard.is_public,
                'allowed_roles': dashboard.allowed_roles,
                'layout_config': dashboard.layout_config,
                'auto_refresh_interval': dashboard.auto_refresh_interval,
                'is_active': dashboard.is_active,
                'is_default': dashboard.is_default,
                'widgets': widgets
            }
            dashboards.append(dashboard_data)
        
        export_data = {
            'export_type': 'dashboard_settings',
            'exported_at': datetime.now().isoformat(),
            'exported_by': user.email,
            'dashboards': dashboards
        }
        
        return export_data

    @staticmethod
    def export_alert_rules(user: User, format: str = 'json') -> Dict[str, Any]:
        """Export alert rule configurations"""
        AuditLogger.log_data_access(
            type('MockRequest', (), {
                'META': {'REMOTE_ADDR': '127.0.0.1'},
                'user': user
            })(), 
            'alert_rules', 
            'all', 
            'export'
        )
        
        alert_rules = AlertRule.objects.all().values(
            'name', 'description', 'operator', 'threshold_value',
            'evaluation_period', 'evaluation_frequency', 'notification_methods',
            'recipients', 'is_active', 'cooldown_minutes'
        )
        
        export_data = {
            'export_type': 'alert_rules',
            'exported_at': datetime.now().isoformat(),
            'exported_by': user.email,
            'alert_rules': list(alert_rules)
        }
        
        return export_data

    @staticmethod
    def export_analytics_events(
        user: User, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_category: Optional[str] = None,
        format: str = 'json'
    ) -> Dict[str, Any]:
        """Export analytics events data"""
        AuditLogger.log_data_access(
            type('MockRequest', (), {
                'META': {'REMOTE_ADDR': '127.0.0.1'},
                'user': user
            })(), 
            'analytics_events', 
            f'{start_date}_to_{end_date}', 
            'export'
        )
        
        queryset = AnalyticsEvent.objects.all()
        
        if start_date:
            queryset = queryset.filter(event_timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(event_timestamp__lte=end_date)
        if event_category:
            queryset = queryset.filter(event_category=event_category)
        
        # Limit to prevent huge exports
        queryset = queryset[:10000]
        
        events = queryset.values(
            'event_name', 'event_category', 'source_domain', 'source_model',
            'source_id', 'session_id', 'event_data', 'numeric_value',
            'event_timestamp'
        )
        
        export_data = {
            'export_type': 'analytics_events',
            'exported_at': datetime.now().isoformat(),
            'exported_by': user.email,
            'filters': {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None,
                'event_category': event_category
            },
            'events': list(events)
        }
        
        return export_data

    @staticmethod
    def create_export_response(data: Dict[str, Any], format: str, filename: str) -> HttpResponse:
        """Create HTTP response for export data"""
        if format.lower() == 'csv':
            return DataExportService._create_csv_response(data, filename)
        elif format.lower() == 'json':
            return DataExportService._create_json_response(data, filename)
        else:
            raise ValueError(f"Unsupported format: {format}")

    @staticmethod
    def _create_json_response(data: Dict[str, Any], filename: str) -> HttpResponse:
        """Create JSON export response"""
        response = HttpResponse(
            json.dumps(data, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}.json"'
        return response

    @staticmethod
    def _create_csv_response(data: Dict[str, Any], filename: str) -> HttpResponse:
        """Create CSV export response"""
        output = StringIO()
        
        # Handle different export types
        if data['export_type'] == 'metrics_configuration':
            writer = csv.DictWriter(output, fieldnames=[
                'name', 'description', 'metric_type', 'source_domain',
                'source_model', 'source_field', 'aggregation_period',
                'is_real_time', 'display_format', 'is_active'
            ])
            writer.writeheader()
            for metric in data['metrics']:
                # Flatten complex fields for CSV
                row = {k: v for k, v in metric.items() if k not in ['calculation_rules', 'filters']}
                writer.writerow(row)
        
        elif data['export_type'] == 'alert_rules':
            writer = csv.DictWriter(output, fieldnames=[
                'name', 'description', 'operator', 'threshold_value',
                'evaluation_period', 'evaluation_frequency', 'is_active',
                'cooldown_minutes'
            ])
            writer.writeheader()
            for rule in data['alert_rules']:
                # Flatten complex fields for CSV
                row = {k: v for k, v in rule.items() if k not in ['notification_methods', 'recipients']}
                writer.writerow(row)
        
        elif data['export_type'] == 'analytics_events':
            writer = csv.DictWriter(output, fieldnames=[
                'event_name', 'event_category', 'source_domain', 'source_model',
                'source_id', 'session_id', 'numeric_value', 'event_timestamp'
            ])
            writer.writeheader()
            for event in data['events']:
                # Flatten complex fields for CSV
                row = {k: v for k, v in event.items() if k not in ['event_data']}
                writer.writerow(row)
        
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
        return response


class BackupService:
    """Service for creating complete analytics system backups"""

    @staticmethod
    def create_full_backup(user: User) -> Dict[str, Any]:
        """Create a complete backup of analytics system"""
        AuditLogger.log_data_access(
            type('MockRequest', (), {
                'META': {'REMOTE_ADDR': '127.0.0.1'},
                'user': user
            })(), 
            'full_backup', 
            'all', 
            'export'
        )
        
        backup_data = {
            'backup_type': 'full_analytics_backup',
            'created_at': datetime.now().isoformat(),
            'created_by': user.email,
            'version': '1.0',
            'metrics': DataExportService.export_metrics_configuration(user)['metrics'],
            'dashboards': DataExportService.export_dashboard_settings(user)['dashboards'],
            'alert_rules': DataExportService.export_alert_rules(user)['alert_rules'],
        }
        
        return backup_data

    @staticmethod
    def restore_from_backup(backup_data: Dict[str, Any], user: User) -> Dict[str, str]:
        """Restore analytics system from backup (placeholder for future implementation)"""
        # This would be a complex operation requiring careful validation
        # and potentially destructive changes, so it's left as a placeholder
        AuditLogger.log_data_access(
            type('MockRequest', (), {
                'META': {'REMOTE_ADDR': '127.0.0.1'},
                'user': user
            })(), 
            'backup_restore', 
            'system', 
            'write'
        )
        
        return {
            'status': 'not_implemented',
            'message': 'Backup restore functionality is planned for future release'
        }