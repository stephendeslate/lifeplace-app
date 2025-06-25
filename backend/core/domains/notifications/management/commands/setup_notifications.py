# backend/core/domains/notifications/management/commands/setup_notifications.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.domains.notifications.models import NotificationTemplate, NotificationRule
from core.domains.notifications.services import NotificationTemplateService, NotificationRuleService

User = get_user_model()


class Command(BaseCommand):
    help = 'Setup notification templates and rules'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--create-templates',
            action='store_true',
            help='Create default notification templates',
        )
        parser.add_argument(
            '--create-rules',
            action='store_true',
            help='Create default notification rules',
        )
        parser.add_argument(
            '--create-test-notifications',
            action='store_true',
            help='Create test notifications for development',
        )
    
    def handle(self, *args, **options):
        if options['create_templates']:
            self.create_templates()
        
        if options['create_rules']:
            self.create_rules()
        
        if options['create_test_notifications']:
            self.create_test_notifications()
        
        if not any([options['create_templates'], options['create_rules'], options['create_test_notifications']]):
            self.stdout.write(
                self.style.WARNING('No action specified. Use --help to see available options.')
            )
    
    def create_templates(self):
        """Create additional notification templates"""
        templates = [
            {
                'name': 'Task Overdue Alert',
                'notification_type': 'TASK_OVERDUE',
                'channels': ['EMAIL', 'IN_APP'],
                'email_subject': 'Overdue Task Alert - {{ task_title }}',
                'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #f44336;">
    <div style="background-color: #f44336; color: white; padding: 16px;">
        <h2 style="margin: 0;">⚠️ Task Overdue</h2>
    </div>
    <div style="padding: 24px;">
        <p>The following task is overdue and requires immediate attention:</p>
        <ul>
            <li><strong>Task:</strong> {{ task_title }}</li>
            <li><strong>Event:</strong> {{ event_name }}</li>
            <li><strong>Client:</strong> {{ client_name }}</li>
            <li><strong>Due Date:</strong> {{ due_date }}</li>
            <li><strong>Days Overdue:</strong> {{ days_overdue }}</li>
            {% if assigned_to_name %}<li><strong>Assigned To:</strong> {{ assigned_to_name }}</li>{% endif %}
        </ul>
        {% if task_description %}
        <p><strong>Description:</strong> {{ task_description }}</p>
        {% endif %}
        <p style="color: #f44336; font-weight: bold;">Please complete this task as soon as possible.</p>
    </div>
</div>
                ''',
                'in_app_title': 'Task Overdue',
                'in_app_body': 'Task "{{ task_title }}" is {{ days_overdue }} days overdue',
                'priority': 'URGENT',
                'is_system': True,
                'variables_schema': {
                    'required': ['task_title', 'event_name', 'client_name', 'due_date', 'days_overdue'],
                    'optional': ['task_description', 'assigned_to_name', 'priority']
                }
            },
            {
                'name': 'Event Deadline Approaching',
                'notification_type': 'EVENT_DEADLINE_APPROACHING',
                'channels': ['EMAIL', 'IN_APP'],
                'email_subject': 'Event Deadline Approaching - {{ event_name }}',
                'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ff9800;">
    <div style="background-color: #ff9800; color: white; padding: 16px;">
        <h2 style="margin: 0;">⏰ Event Deadline Approaching</h2>
    </div>
    <div style="padding: 24px;">
        <p>An event is starting soon and may need final preparations:</p>
        <ul>
            <li><strong>Event:</strong> {{ event_name }}</li>
            <li><strong>Client:</strong> {{ client_name }}</li>
            <li><strong>Type:</strong> {{ event_type }}</li>
            <li><strong>Start Date:</strong> {{ start_date }}</li>
            <li><strong>Hours Until Start:</strong> {{ hours_until }}</li>
            <li><strong>Status:</strong> {{ status }}</li>
        </ul>
        <p style="color: #ff9800; font-weight: bold;">Please ensure all preparations are complete.</p>
    </div>
</div>
                ''',
                'in_app_title': 'Event Deadline Approaching',
                'in_app_body': '{{ event_name }} starts in {{ hours_until }} hours',
                'priority': 'HIGH',
                'is_system': True,
                'variables_schema': {
                    'required': ['event_name', 'client_name', 'start_date', 'hours_until'],
                    'optional': ['event_type', 'status', 'total_price']
                }
            },
            {
                'name': 'Payment Received',
                'notification_type': 'PAYMENT_RECEIVED',
                'channels': ['EMAIL', 'IN_APP'],
                'email_subject': 'Payment Received - {{ event_name }}',
                'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #4caf50;">
    <div style="background-color: #4caf50; color: white; padding: 16px;">
        <h2 style="margin: 0;">✅ Payment Received</h2>
    </div>
    <div style="padding: 24px;">
        <p>A payment has been received:</p>
        <ul>
            <li><strong>Event:</strong> {{ event_name }}</li>
            <li><strong>Client:</strong> {{ client_name }}</li>
            <li><strong>Amount:</strong> ${{ payment_amount }}</li>
            <li><strong>Payment Method:</strong> {{ payment_method }}</li>
            <li><strong>Transaction ID:</strong> {{ transaction_id }}</li>
            <li><strong>Date:</strong> {{ payment_date }}</li>
        </ul>
        {% if remaining_balance %}
        <p><strong>Remaining Balance:</strong> ${{ remaining_balance }}</p>
        {% else %}
        <p style="color: #4caf50; font-weight: bold;">Event is now fully paid!</p>
        {% endif %}
    </div>
</div>
                ''',
                'in_app_title': 'Payment Received',
                'in_app_body': 'Payment of ${{ payment_amount }} received for {{ event_name }}',
                'priority': 'MEDIUM',
                'is_system': True,
                'variables_schema': {
                    'required': ['event_name', 'client_name', 'payment_amount'],
                    'optional': ['payment_method', 'transaction_id', 'payment_date', 'remaining_balance']
                }
            },
            {
                'name': 'Weekly Report',
                'notification_type': 'WEEKLY_REPORT',
                'channels': ['EMAIL'],
                'email_subject': 'Weekly Notification Report - {{ week_start }} to {{ week_end }}',
                'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Weekly Notification Report</h2>
    <p><strong>Week:</strong> {{ week_start }} to {{ week_end }}</p>
    
    <h3>Overall Statistics</h3>
    <ul>
        <li><strong>Total Notifications Sent:</strong> {{ total_sent }}</li>
        <li><strong>Delivery Rate:</strong> {{ delivery_rate }}%</li>
        <li><strong>Open Rate:</strong> {{ open_rate }}%</li>
        <li><strong>Failure Rate:</strong> {{ failure_rate }}%</li>
    </ul>
    
    {% if channel_performance %}
    <h3>Channel Performance</h3>
    <ul>
    {% for channel in channel_performance %}
        <li><strong>{{ channel.channel }}:</strong> {{ channel.total }} sent, {{ channel.delivered }} delivered</li>
    {% endfor %}
    </ul>
    {% endif %}
    
    <p>This automated report helps you monitor notification system performance.</p>
</div>
                ''',
                'priority': 'LOW',
                'is_system': True,
                'variables_schema': {
                    'required': ['week_start', 'week_end', 'total_sent', 'delivery_rate', 'open_rate', 'failure_rate'],
                    'optional': ['channel_performance']
                }
            }
        ]
        
        created_count = 0
        for template_data in templates:
            template, created = NotificationTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created template: {template.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Template already exists: {template.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Template creation complete. Created {created_count} new templates.')
        )
    
    def create_rules(self):
        """Create additional notification rules"""
        rules = [
            {
                'name': 'Overdue Task Alert',
                'event_type': 'task.overdue',
                'template_name': 'Task Overdue Alert',
                'target_roles': ['ADMIN'],
                'conditions': {},
                'delay_minutes': 0,
                'max_frequency_hours': 24,  # Max once per day per task
                'is_active': True
            },
            {
                'name': 'Event Deadline Alert',
                'event_type': 'event.deadline_approaching',
                'template_name': 'Event Deadline Approaching',
                'target_roles': ['ADMIN'],
                'conditions': {},
                'delay_minutes': 0,
                'max_frequency_hours': 12,  # Max twice per day
                'is_active': True
            },
            {
                'name': 'Payment Received Alert',
                'event_type': 'payment.received',
                'template_name': 'Payment Received',
                'target_roles': ['ADMIN'],
                'conditions': {},
                'delay_minutes': 5,  # Small delay to ensure payment is processed
                'max_frequency_hours': 0,
                'is_active': True
            }
        ]
        
        created_count = 0
        for rule_data in rules:
            try:
                template = NotificationTemplate.objects.get(name=rule_data['template_name'])
                
                rule, created = NotificationRule.objects.get_or_create(
                    name=rule_data['name'],
                    event_type=rule_data['event_type'],
                    defaults={
                        'template': template,
                        'target_roles': rule_data['target_roles'],
                        'conditions': rule_data['conditions'],
                        'delay_minutes': rule_data['delay_minutes'],
                        'max_frequency_hours': rule_data['max_frequency_hours'],
                        'is_active': rule_data['is_active']
                    }
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Created rule: {rule.name}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Rule already exists: {rule.name}')
                    )
                    
            except NotificationTemplate.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Template not found for rule: {rule_data["name"]}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Rule creation complete. Created {created_count} new rules.')
        )
    
    def create_test_notifications(self):
        """Create test notifications for development"""
        from core.domains.notifications.services import NotificationDispatchService
        
        # Get admin users
        admin_users = User.objects.filter(role='ADMIN', is_active=True)
        
        if not admin_users.exists():
            self.stdout.write(
                self.style.ERROR('No admin users found. Create an admin user first.')
            )
            return
        
        test_notifications = [
            {
                'type': 'CLIENT_NEW',
                'context': {
                    'client_id': 999,
                    'client_name': 'Test Client',
                    'client_email': 'test@example.com',
                    'client_first_name': 'Test',
                    'client_last_name': 'Client',
                    'date_joined': '2024-01-01T00:00:00Z',
                }
            },
            {
                'type': 'TASK_OVERDUE',
                'context': {
                    'task_id': 999,
                    'task_title': 'Complete Event Setup',
                    'task_description': 'Finalize all event preparations',
                    'event_name': 'Test Wedding Event',
                    'client_name': 'Test Client',
                    'due_date': '2024-01-01T00:00:00Z',
                    'days_overdue': 3,
                    'assigned_to_name': 'Test Admin',
                    'priority': 'HIGH'
                }
            },
            {
                'type': 'EVENT_DEADLINE_APPROACHING',
                'context': {
                    'event_id': 999,
                    'event_name': 'Test Corporate Event',
                    'client_name': 'Test Client',
                    'event_type': 'Corporate',
                    'start_date': '2024-01-15T18:00:00Z',
                    'hours_until': 24,
                    'status': 'CONFIRMED'
                }
            },
            {
                'type': 'FEEDBACK_RECEIVED',
                'context': {
                    'feedback_id': 999,
                    'event_name': 'Test Birthday Party',
                    'client_name': 'Happy Client',
                    'overall_rating': 5,
                    'comments': 'Everything was perfect! Amazing service and attention to detail.',
                    'testimonial': 'I would definitely recommend this company to anyone!',
                    'submitted_by_name': 'Happy Client'
                }
            }
        ]
        
        sent_count = 0
        for test_notif in test_notifications:
            try:
                notifications = NotificationDispatchService.dispatch_notification(
                    notification_type=test_notif['type'],
                    recipients=list(admin_users),
                    context_data=test_notif['context'],
                    priority='LOW'
                )
                
                sent_count += len(notifications)
                self.stdout.write(
                    self.style.SUCCESS(f'Created test notification: {test_notif["type"]}')
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to create {test_notif["type"]}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Test notification creation complete. Sent {sent_count} notifications.')
        )