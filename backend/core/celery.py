# backend/core/celery.py

import os
import logging
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('lifeplace')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Configure Redis as the message broker for Celery
# Redis database allocation:
# DB 0: Django cache (default)
# DB 1: Celery broker
# DB 2: Celery results
# DB 3: Django Channels (WebSocket)
# DB 4: Sessions cache
# DB 5: Analytics cache
redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
app.conf.update(
    # Broker configuration
    broker_url=redis_url + '/1',  # Use Redis database 1 for Celery broker
    result_backend=redis_url + '/2',  # Use Redis database 2 for results
    
    # Task execution settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task routing
    task_routes={
        'core.domains.notifications.tasks.*': {'queue': 'notifications'},
        'core.domains.communications.tasks.*': {'queue': 'communications'},
        'core.domains.analytics.tasks.*': {'queue': 'analytics'},
        'core.domains.events.tasks.*': {'queue': 'events'},
        'core.domains.contracts.tasks.*': {'queue': 'contracts'},
        'core.domains.questionnaires.tasks.*': {'queue': 'events'},
        'core.domains.sales.tasks.*': {'queue': 'sales'},
        'core.domains.security.tasks.*': {'queue': 'notifications'},
        'sales.*': {'queue': 'sales'},
    },
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    
    # Task retry configuration
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Security
    task_reject_on_worker_lost=True,
    task_ignore_result=False,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        'cleanup-old-notifications': {
            'task': 'core.domains.notifications.tasks.cleanup_old_notifications',
            'schedule': 24 * 60 * 60,  # Daily
            'options': {'queue': 'notifications'}
        },
        'auto-expire-notifications': {
            'task': 'core.domains.notifications.tasks.auto_expire_notifications',
            'schedule': 60 * 60,  # Hourly
            'options': {'queue': 'notifications'}
        },
        'notification-delivery-stats': {
            'task': 'core.domains.notifications.tasks.collect_delivery_metrics',
            'schedule': 15 * 60,  # Every 15 minutes (was 5 min - saves 192 task executions/day)
            'options': {'queue': 'analytics'}
        },
        # Event deadline tasks
        'daily-deadline-sweep': {
            'task': 'core.domains.events.tasks.daily_deadline_sweep',
            'schedule': 60 * 60,  # Hourly (catches missed deadlines)
            'options': {'queue': 'events'}
        },
        'schedule-deadline-reminders': {
            'task': 'core.domains.events.tasks.schedule_deadline_reminders',
            'schedule': 24 * 60 * 60,  # Daily
            'options': {'queue': 'events'}
        },
        # Contract expiry tasks
        'expire-contracts': {
            'task': 'core.domains.contracts.tasks.expire_contracts',
            'schedule': 60 * 60,  # Hourly
            'options': {'queue': 'contracts'}
        },
        'schedule-contract-expiry-reminders': {
            'task': 'core.domains.contracts.tasks.schedule_contract_expiry_reminders',
            'schedule': 24 * 60 * 60,  # Daily
            'options': {'queue': 'contracts'}
        },
        # Quote expiry tasks
        'expire-quotes': {
            'task': 'sales.expire_sent_quotes',
            'schedule': 60 * 60,  # Hourly
            'options': {'queue': 'sales'}
        },
        'quote-expiry-reminders': {
            'task': 'sales.send_quote_expiry_reminders',
            'schedule': 24 * 60 * 60,  # Daily
            'options': {'queue': 'sales'}
        },
        # Questionnaire reminder tasks
        'schedule-questionnaire-reminders': {
            'task': 'core.domains.questionnaires.tasks.schedule_questionnaire_reminders',
            'schedule': 24 * 60 * 60,  # Daily
            'options': {'queue': 'events'}
        },
        # Security breach monitoring tasks
        'check-breach-notification-deadlines': {
            'task': 'core.domains.security.tasks.check_notification_deadlines',
            'schedule': 60 * 60,  # Hourly
            'options': {'queue': 'notifications'}
        },
        'send-daily-breach-summary': {
            'task': 'core.domains.security.tasks.send_daily_breach_summary',
            'schedule': 24 * 60 * 60,  # Daily
            'options': {'queue': 'notifications'}
        },
        # Push notification maintenance tasks
        'check-push-receipts': {
            'task': 'core.domains.notifications.tasks.check_push_receipts',
            'schedule': 30 * 60,  # Every 30 minutes (was 15 min - saves 48 task executions/day)
            'options': {'queue': 'notifications'}
        },
        'cleanup-inactive-push-tokens': {
            'task': 'core.domains.notifications.tasks.cleanup_inactive_push_tokens',
            'schedule': 24 * 60 * 60,  # Daily
            'options': {'queue': 'notifications'}
        },
    },
)

# Set up logging for Celery
@app.task(bind=True)
def debug_task(self):
    logger = logging.getLogger(__name__)
    logger.info(f'Request: {self.request!r}')

# Configure logging for Celery tasks
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    app.start()