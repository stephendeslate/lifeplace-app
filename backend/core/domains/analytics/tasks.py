# backend/core/domains/analytics/tasks.py
import logging
from datetime import timedelta
from django.utils import timezone
from celery import shared_task

from .services import AlertService, DataAggregationService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def create_daily_aggregations(self, date_str=None):
    """
    Celery task to create daily aggregations for all active metrics
    """
    try:
        if date_str:
            date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            date = timezone.now().date()
        
        DataAggregationService.create_daily_aggregations(date)
        logger.info(f"Successfully created daily aggregations for {date}")
        
        return {
            'success': True,
            'date': date.isoformat(),
            'message': f"Daily aggregations created for {date}"
        }
        
    except Exception as e:
        logger.error(f"Error creating daily aggregations: {str(e)}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            retry_countdown = 60 * (2 ** self.request.retries)  # 60s, 120s, 240s
            raise self.retry(countdown=retry_countdown, exc=e)
        
        return {
            'success': False,
            'error': str(e),
            'message': "Failed to create daily aggregations after retries"
        }


@shared_task(bind=True, max_retries=2)
def evaluate_alert_rules(self):
    """
    Celery task to evaluate all active alert rules
    """
    try:
        AlertService.evaluate_alert_rules()
        logger.info("Successfully evaluated all alert rules")
        
        return {
            'success': True,
            'message': "Alert rules evaluated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error evaluating alert rules: {str(e)}")
        
        # Retry with shorter backoff for alerts
        if self.request.retries < self.max_retries:
            retry_countdown = 30 * (2 ** self.request.retries)  # 30s, 60s
            raise self.retry(countdown=retry_countdown, exc=e)
        
        return {
            'success': False,
            'error': str(e),
            'message': "Failed to evaluate alert rules after retries"
        }


@shared_task(bind=True)
def cleanup_old_events(self, days_to_keep=90):
    """
    Celery task to clean up old analytics events
    """
    try:
        deleted_count = DataAggregationService.cleanup_old_events(days_to_keep)
        logger.info(f"Successfully cleaned up {deleted_count} old analytics events")
        
        return {
            'success': True,
            'deleted_count': deleted_count,
            'days_to_keep': days_to_keep,
            'message': f"Cleaned up {deleted_count} events older than {days_to_keep} days"
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up old events: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'message': "Failed to clean up old events"
        }


@shared_task(bind=True)
def generate_scheduled_report(self, report_id):
    """
    Celery task to generate a scheduled report
    """
    try:
        from .services import ReportService
        from .models import AnalyticsReport
        
        # Get the report
        report = AnalyticsReport.objects.get(id=report_id)
        
        # Execute the report
        execution = ReportService.execute_report(
            report_id,
            user=report.created_by  # Use report creator as the user
        )
        
        logger.info(f"Successfully generated scheduled report: {report.name}")
        
        return {
            'success': True,
            'report_id': report_id,
            'execution_id': str(execution.execution_id),
            'message': f"Scheduled report '{report.name}' generated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error generating scheduled report {report_id}: {str(e)}")
        return {
            'success': False,
            'report_id': report_id,
            'error': str(e),
            'message': f"Failed to generate scheduled report"
        }


@shared_task(bind=True)
def send_report_notification(self, execution_id, report_name, recipients):
    """
    Celery task to send report completion notifications
    """
    try:
        from core.domains.communications.services import CommunicationService
        
        subject = f"Analytics Report Ready: {report_name}"
        message = f"""
        Your analytics report "{report_name}" has been generated and is ready for download.
        
        Execution ID: {execution_id}
        Generated at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        You can access the report through the LifePlace admin dashboard.
        """
        
        # Send email to all recipients
        for recipient_email in recipients:
            try:
                CommunicationService.send_manual_message(
                    recipient_email=recipient_email,
                    subject=subject,
                    message=message,
                    channel='EMAIL'
                )
            except Exception as e:
                logger.error(f"Failed to send report notification to {recipient_email}: {str(e)}")
        
        logger.info(f"Sent report notifications for execution {execution_id}")
        
        return {
            'success': True,
            'execution_id': execution_id,
            'recipients_count': len(recipients),
            'message': f"Report notifications sent to {len(recipients)} recipients"
        }
        
    except Exception as e:
        logger.error(f"Error sending report notifications: {str(e)}")
        return {
            'success': False,
            'execution_id': execution_id,
            'error': str(e),
            'message': "Failed to send report notifications"
        }


@shared_task(bind=True)
def calculate_metric_batch(self, metric_ids, start_date_str, end_date_str):
    """
    Celery task to calculate multiple metrics in batch
    """
    try:
        from .services import MetricDefinitionService
        
        start_date = timezone.datetime.fromisoformat(start_date_str)
        end_date = timezone.datetime.fromisoformat(end_date_str)
        
        results = {}
        errors = {}
        
        for metric_id in metric_ids:
            try:
                value = MetricDefinitionService.calculate_metric(
                    metric_id,
                    start_date=start_date,
                    end_date=end_date
                )
                results[metric_id] = str(value)  # Convert Decimal to string for JSON serialization
            except Exception as e:
                errors[metric_id] = str(e)
                logger.error(f"Error calculating metric {metric_id}: {str(e)}")
        
        logger.info(f"Batch calculated {len(results)} metrics, {len(errors)} errors")
        
        return {
            'success': True,
            'results': results,
            'errors': errors,
            'calculated_count': len(results),
            'error_count': len(errors),
            'message': f"Batch calculation completed: {len(results)} success, {len(errors)} errors"
        }
        
    except Exception as e:
        logger.error(f"Error in batch metric calculation: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'message': "Failed to complete batch metric calculation"
        }


@shared_task(bind=True)
def update_funnel_analytics(self, funnel_id, date_str=None):
    """
    Celery task to update conversion funnel analytics
    """
    try:
        from .services import ConversionFunnelService
        
        if date_str:
            date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
            start_date = timezone.make_aware(timezone.datetime.combine(date, timezone.datetime.min.time()))
            end_date = start_date + timedelta(days=1)
        else:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=1)
        
        analytics = ConversionFunnelService.get_funnel_analytics(
            funnel_id,
            start_date=start_date,
            end_date=end_date
        )
        
        logger.info(f"Updated funnel analytics for funnel {funnel_id}")
        
        return {
            'success': True,
            'funnel_id': funnel_id,
            'total_started': analytics['total_started'],
            'total_completed': analytics['total_completed'],
            'conversion_rate': float(analytics['overall_conversion_rate']),
            'message': f"Funnel analytics updated for funnel {funnel_id}"
        }
        
    except Exception as e:
        logger.error(f"Error updating funnel analytics for funnel {funnel_id}: {str(e)}")
        return {
            'success': False,
            'funnel_id': funnel_id,
            'error': str(e),
            'message': f"Failed to update funnel analytics"
        }