# backend/core/domains/notifications/signals/notification_types_data.py
"""
Notification types data configuration

Contains all the default notification type definitions separated from signal logic.
"""


def get_default_notification_types():
    """Return the list of default notification types to create"""
    return [
        # System notifications
        {
            "code": "SYSTEM_NOTIFICATION",
            "name": "System Notification",
            "description": "General system notifications and announcements",
            "category": "SYSTEM",
            "priority": "NORMAL",
            "default_title_template": "System Notification",
            "default_content_template": "Your event planning has progressed to: {{ stage_name }}. {{ stage_description }}",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>We wanted to update you on the progress of your event planning:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Current Stage:</strong> {{ stage_name }}</li>
            </ul>
            <p>{{ stage_description }}</p>
            <p>You can view more details in your client portal.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Progress</a></p>{% endif %}
            """,
            "default_sms_template": "{{ event_name }} progress: {{ stage_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        # System management notifications
        {
            "code": "USER_DEACTIVATED",
            "name": "User Deactivated",
            "description": "Notification when a user account is deactivated",
            "category": "SYSTEM",
            "icon": "PersonOffIcon",
            "color": "#F44336",
            "priority": "HIGH",
            "default_title_template": "User Deactivated: {{ user_name }}",
            "default_content_template": "User account for {{ user_name }} ({{ user_email }}) has been deactivated.",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A user account has been deactivated:</p>
            <ul>
                <li><strong>Name:</strong> {{ user_name }}</li>
                <li><strong>Email:</strong> {{ user_email }}</li>
                <li><strong>Role:</strong> {{ user_role }}</li>
            </ul>
            <p>Please review if this action was intended.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View User</a></p>{% endif %}
            """,
            "default_sms_template": "User deactivated: {{ user_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "USER_REACTIVATED",
            "name": "User Reactivated",
            "description": "Notification when a user account is reactivated",
            "category": "SYSTEM",
            "icon": "PersonIcon",
            "color": "#4CAF50",
            "priority": "NORMAL",
            "default_title_template": "User Reactivated: {{ user_name }}",
            "default_content_template": "User account for {{ user_name }} ({{ user_email }}) has been reactivated.",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A user account has been reactivated:</p>
            <ul>
                <li><strong>Name:</strong> {{ user_name }}</li>
                <li><strong>Email:</strong> {{ user_email }}</li>
                <li><strong>Role:</strong> {{ user_role }}</li>
            </ul>
            {% if action_url %}<p><a href="{{ action_url }}">View User</a></p>{% endif %}
            """,
            "default_sms_template": "User reactivated: {{ user_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "SYSTEM_MAINTENANCE",
            "name": "System Maintenance",
            "description": "Notifications about system maintenance and updates",
            "category": "SYSTEM",
            "icon": "BuildIcon",
            "color": "#FF9800",
            "priority": "NORMAL",
            "default_title_template": "System Maintenance Scheduled",
            "default_content_template": "System maintenance is scheduled for {{ maintenance_date }}. Expected downtime: {{ duration }}.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>We wanted to inform you that system maintenance is scheduled for <strong>{{ maintenance_date }}</strong>.</p>
            <p>Expected downtime: {{ duration }}</p>
            <p>We apologize for any inconvenience this may cause.</p>
            <p>Best regards,<br>The {{ site_name }} Team</p>
            """,
            "default_sms_template": "System maintenance scheduled for {{ maintenance_date }}. - {{ site_name }}",
            "is_system": True,
            "supports_email": True,
            "supports_sms": False,
        },
        # User management notifications
        {
            "code": "CLIENT_CREATED",
            "name": "New Client Added",
            "description": "Notification when a new client is added to the system",
            "category": "CLIENT",
            "icon": "PersonAddIcon",
            "color": "#4CAF50",
            "priority": "NORMAL",
            "default_title_template": "New Client: {{ client_name }}",
            "default_content_template": "A new client {{ client_name }} ({{ client_email }}) has been added to the system.",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A new client has been added to the system:</p>
            <ul>
                <li><strong>Name:</strong> {{ client_name }}</li>
                <li><strong>Email:</strong> {{ client_email }}</li>
            </ul>
            <p>You can view the client details in the admin portal.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Client Profile</a></p>{% endif %}
            """,
            "default_sms_template": "New client: {{ client_name }} ({{ client_email }})",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "ADMIN_ADDED",
            "name": "New Administrator Added",
            "description": "Notification when a new admin user is added",
            "category": "SYSTEM",
            "icon": "AdminPanelSettingsIcon",
            "color": "#2196F3",
            "priority": "HIGH",
            "default_title_template": "New Administrator: {{ admin_name }}",
            "default_content_template": "A new administrator {{ admin_name }} ({{ admin_email }}) has been added to the system.",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A new administrator has been added to the system:</p>
            <ul>
                <li><strong>Name:</strong> {{ admin_name }}</li>
                <li><strong>Email:</strong> {{ admin_email }}</li>
            </ul>
            <p>Please ensure they have the appropriate access and training.</p>
            """,
            "default_sms_template": "New admin added: {{ admin_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        # Event management notifications
        {
            "code": "EVENT_CREATED",
            "name": "New Event Created",
            "description": "Notification when a new event is created",
            "category": "EVENT",
            "icon": "EventIcon",
            "color": "#9C27B0",
            "priority": "NORMAL",
            "default_title_template": "New Event: {{ event_name }}",
            "default_content_template": 'A new event "{{ event_name }}" has been created for {{ client_name }} on {{ event_date }}.',
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A new event has been created:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Client:</strong> {{ client_name }}</li>
                <li><strong>Date:</strong> {{ event_date }}</li>
            </ul>
            <p>Please review the event details and begin planning.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Event Details</a></p>{% endif %}
            """,
            "default_sms_template": "New event: {{ event_name }} for {{ client_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "EVENT_CONFIRMED",
            "name": "Event Confirmed",
            "description": "Notification when an event is confirmed",
            "category": "EVENT",
            "icon": "CheckCircleIcon",
            "color": "#4CAF50",
            "priority": "HIGH",
            "default_title_template": "Event Confirmed: {{ event_name }}",
            "default_content_template": 'The event "{{ event_name }}" for {{ client_name }} on {{ event_date }} has been confirmed.',
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>Great news! The following event has been confirmed:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Client:</strong> {{ client_name }}</li>
                <li><strong>Date:</strong> {{ event_date }}</li>
            </ul>
            <p>Please proceed with the next steps in the planning process.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Event Details</a></p>{% endif %}
            """,
            "default_sms_template": "Event confirmed: {{ event_name }} on {{ event_date }}",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "YOUR_EVENT_CONFIRMED",
            "name": "Your Event Confirmed",
            "description": "Notification to client when their event is confirmed",
            "category": "EVENT",
            "icon": "CheckCircleIcon",
            "color": "#4CAF50",
            "priority": "HIGH",
            "default_title_template": "Your Event is Confirmed!",
            "default_content_template": 'Great news! Your event "{{ event_name }}" on {{ event_date }} has been confirmed. We look forward to making it special!',
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>We're excited to confirm your upcoming event:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Date:</strong> {{ event_date }}</li>
            </ul>
            <p>Our team is already hard at work planning every detail to make your event unforgettable.</p>
            <p>You can track the progress of your event planning in your client portal.</p>
            <p>Thank you for choosing {{ site_name }}!</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Event Details</a></p>{% endif %}
            """,
            "default_sms_template": "Your event {{ event_name }} on {{ event_date }} is confirmed! Track progress at {{ site_name }}",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "EVENT_COMPLETED",
            "name": "Event Completed",
            "description": "Notification when an event is completed",
            "category": "EVENT",
            "icon": "CelebrationIcon",
            "color": "#FF5722",
            "priority": "NORMAL",
            "default_title_template": "Event Completed: {{ event_name }}",
            "default_content_template": 'Your event "{{ event_name }}" has been completed! We hope you had a wonderful time.',
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>We hope your event was everything you dreamed of and more!</p>
            <p><strong>Event:</strong> {{ event_name }}</p>
            <p>It was our pleasure to be part of your special day. We'd love to hear about your experience - please consider leaving us feedback.</p>
            <p>Thank you for choosing {{ site_name }}!</p>
            {% if action_url %}<p><a href="{{ action_url }}">Leave Feedback</a></p>{% endif %}
            """,
            "default_sms_template": "Your event {{ event_name }} is complete! Thank you!",
            "supports_email": True,
            "supports_sms": False,
        },
        # Task management notifications
        {
            "code": "TASK_ASSIGNED",
            "name": "Task Assigned",
            "description": "Notification when a task is assigned to you",
            "category": "TASK",
            "icon": "AssignmentIcon",
            "color": "#3F51B5",
            "priority": "HIGH",
            "default_title_template": "New Task: {{ task_title }}",
            "default_content_template": 'You have been assigned a new task "{{ task_title }}" for {{ event_name }}. Due: {{ due_date }}',
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>You have been assigned a new task:</p>
            <ul>
                <li><strong>Task:</strong> {{ task_title }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Due Date:</strong> {{ due_date }}</li>
                <li><strong>Priority:</strong> {{ priority }}</li>
            </ul>
            <p>Please review the task details and complete it by the due date.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Task</a></p>{% endif %}
            """,
            "default_sms_template": "Task assigned: {{ task_title }} due {{ due_date }}",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "TASK_COMPLETED",
            "name": "Task Completed",
            "description": "Notification when a task visible to clients is completed",
            "category": "TASK",
            "icon": "TaskAltIcon",
            "color": "#4CAF50",
            "priority": "NORMAL",
            "default_title_template": "Task Completed: {{ task_title }}",
            "default_content_template": 'Good news! The task "{{ task_title }}" for your event {{ event_name }} has been completed.',
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>We have some progress to share on your event planning:</p>
            <ul>
                <li><strong>Completed Task:</strong> {{ task_title }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
            </ul>
            <p>We're one step closer to making your event perfect!</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Progress</a></p>{% endif %}
            """,
            "default_sms_template": "Progress update: {{ task_title }} completed for {{ event_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "TASK_COMPLETED_ADMIN",
            "name": "Task Completed (Admin)",
            "description": "Notification to admins when any task is completed",
            "category": "TASK",
            "icon": "TaskAltIcon",
            "color": "#4CAF50",
            "priority": "NORMAL",
            "default_title_template": "Task Completed: {{ task_title }}",
            "default_content_template": '{{ assigned_to }} completed "{{ task_title }}" for {{ event_name }} ({{ client_name }}).',
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A task has been completed:</p>
            <ul>
                <li><strong>Task:</strong> {{ task_title }}</li>
                <li><strong>Completed by:</strong> {{ assigned_to }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Client:</strong> {{ client_name }}</li>
            </ul>
            {% if action_url %}<p><a href="{{ action_url }}">View Event</a></p>{% endif %}
            """,
            "default_sms_template": "Task completed: {{ task_title }} by {{ assigned_to }}",
            "supports_email": True,
            "supports_sms": False,
        },
        # Quote notifications
        {
            "code": "QUOTE_SENT",
            "name": "Quote Sent",
            "description": "Notification when a quote is sent to client",
            "category": "PAYMENT",
            "icon": "DescriptionIcon",
            "color": "#667eea",
            "priority": "HIGH",
            "default_title_template": "Quote Ready for Review",
            "default_content_template": "Your quote for {{ event_name }} is ready for review.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Your quote is ready for review:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Total:</strong> {{ total_amount }}</li>
                <li><strong>Valid Until:</strong> {{ valid_until }}</li>
            </ul>
            <p>Please review the quote and let us know if you have any questions.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Quote</a></p>{% endif %}
            """,
            "default_sms_template": "Quote ready for {{ event_name }}. Please review.",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "QUOTE_EXPIRED",
            "name": "Quote Expired",
            "description": "Notification when a quote has expired",
            "category": "PAYMENT",
            "icon": "EventBusyIcon",
            "color": "#F44336",
            "priority": "HIGH",
            "default_title_template": "Quote Has Expired",
            "default_content_template": "Your quote for {{ event_name }} has expired. Please contact us if you would like a new quote.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Unfortunately, your quote has expired:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Expired on:</strong> {{ valid_until }}</li>
            </ul>
            <p>If you would still like to proceed, please contact us to request a new quote.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Contact Us</a></p>{% endif %}
            """,
            "default_sms_template": "Your quote for {{ event_name }} has expired. Contact us for a new quote.",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "QUOTE_REJECTED",
            "name": "Quote Rejected",
            "description": "Notification when a client rejects a quote",
            "category": "PAYMENT",
            "icon": "CancelIcon",
            "color": "#F44336",
            "priority": "NORMAL",
            "default_title_template": "Quote Rejected: {{ event_name }}",
            "default_content_template": "{{ client_name }} has rejected the quote for {{ event_name }}.",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A quote has been rejected:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Client:</strong> {{ client_name }}</li>
            </ul>
            <p>Please follow up with the client to understand their concerns.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Quote</a></p>{% endif %}
            """,
            "default_sms_template": "Quote rejected by {{ client_name }} for {{ event_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        # Invoice notifications
        {
            "code": "INVOICE_SENT",
            "name": "Invoice Sent",
            "description": "Notification when an invoice is sent to client",
            "category": "PAYMENT",
            "icon": "ReceiptIcon",
            "color": "#667eea",
            "priority": "HIGH",
            "default_title_template": "Invoice Ready",
            "default_content_template": "Invoice #{{ invoice_number }} for {{ event_name }} is ready for payment.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Your invoice is ready:</p>
            <ul>
                <li><strong>Invoice:</strong> #{{ invoice_number }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Amount:</strong> {{ total_amount }}</li>
                <li><strong>Due Date:</strong> {{ due_date }}</li>
            </ul>
            <p>Please make payment by the due date.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Invoice</a></p>{% endif %}
            """,
            "default_sms_template": "Invoice #{{ invoice_number }} ready for {{ event_name }}. Amount: {{ total_amount }}",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "INVOICE_OVERDUE",
            "name": "Invoice Overdue",
            "description": "Notification when an invoice is overdue",
            "category": "PAYMENT",
            "icon": "WarningIcon",
            "color": "#F44336",
            "priority": "URGENT",
            "default_title_template": "Invoice Overdue",
            "default_content_template": "Invoice #{{ invoice_number }} for {{ event_name }} is overdue. Please make payment immediately.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Your invoice is overdue:</p>
            <ul>
                <li><strong>Invoice:</strong> #{{ invoice_number }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Amount:</strong> {{ total_amount }}</li>
                <li><strong>Original Due Date:</strong> {{ due_date }}</li>
            </ul>
            <p>Please make payment immediately to avoid any issues with your booking.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Pay Now</a></p>{% endif %}
            """,
            "default_sms_template": "OVERDUE: Invoice #{{ invoice_number }} for {{ event_name }}. Please pay immediately.",
            "supports_email": True,
            "supports_sms": True,
        },
        # Payment notifications
        {
            "code": "PAYMENT_RECEIVED",
            "name": "Payment Received",
            "description": "Notification when a payment is received",
            "category": "PAYMENT",
            "icon": "PaymentIcon",
            "color": "#4CAF50",
            "priority": "HIGH",
            "default_title_template": "Payment Received: {{ amount }}",
            "default_content_template": "Payment of {{ amount }} received for {{ event_name }} from {{ client_name }}.",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A payment has been received:</p>
            <ul>
                <li><strong>Amount:</strong> {{ amount }}</li>
                <li><strong>Payment Number:</strong> {{ payment_number }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Client:</strong> {{ client_name }}</li>
            </ul>
            <p>The payment has been processed successfully.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Payment Details</a></p>{% endif %}
            """,
            "default_sms_template": "Payment received: {{ amount }} from {{ client_name }}",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "PAYMENT_CONFIRMED",
            "name": "Payment Confirmed",
            "description": "Notification to client when payment is confirmed",
            "category": "PAYMENT",
            "icon": "CheckCircleIcon",
            "color": "#4CAF50",
            "priority": "HIGH",
            "default_title_template": "Payment Confirmed",
            "default_content_template": "Your payment of {{ amount }} for {{ event_name }} has been confirmed. Thank you!",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Thank you! Your payment has been confirmed:</p>
            <ul>
                <li><strong>Amount:</strong> {{ amount }}</li>
                <li><strong>Payment Number:</strong> {{ payment_number }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
            </ul>
            <p>You can view your payment history in your client portal.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Receipt</a></p>{% endif %}
            """,
            "default_sms_template": "Payment confirmed: {{ amount }} for {{ event_name }}. Thank you! - {{ site_name }}",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "PAYMENT_FAILED",
            "name": "Payment Failed",
            "description": "Notification when a payment fails",
            "category": "PAYMENT",
            "icon": "ErrorIcon",
            "color": "#F44336",
            "priority": "URGENT",
            "default_title_template": "Payment Failed",
            "default_content_template": "Your payment of {{ amount }} for {{ event_name }} could not be processed. Please try again.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>We were unable to process your payment:</p>
            <ul>
                <li><strong>Amount:</strong> {{ amount }}</li>
                <li><strong>Payment Number:</strong> {{ payment_number }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
            </ul>
            <p>Please check your payment information and try again, or contact us for assistance.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Retry Payment</a></p>{% endif %}
            """,
            "default_sms_template": "Payment failed for {{ event_name }}. Please retry or contact us. - {{ site_name }}",
            "supports_email": True,
            "supports_sms": True,
        },
        # Contract notifications
        {
            "code": "CONTRACT_SENT",
            "name": "Contract Sent",
            "description": "Notification when a contract is sent to client",
            "category": "CONTRACT",
            "icon": "DescriptionIcon",
            "color": "#795548",
            "priority": "HIGH",
            "default_title_template": "Contract Ready for Signature",
            "default_content_template": "Your contract for {{ event_name }} is ready for review and signature.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Your contract is ready for review and signature:</p>
            <ul>
                <li><strong>Contract:</strong> {{ contract_name }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
            </ul>
            <p>Please review the contract carefully and sign it at your earliest convenience.</p>
            <p>You can access the contract through your client portal.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Review Contract</a></p>{% endif %}
            """,
            "default_sms_template": "Contract ready for {{ event_name }}. Please review and sign.",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "CONTRACT_SIGNED",
            "name": "Contract Signed",
            "description": "Notification when a contract is signed",
            "category": "CONTRACT",
            "icon": "CheckCircleIcon",
            "color": "#4CAF50",
            "priority": "HIGH",
            "default_title_template": "Contract Signed: {{ contract_name }}",
            "default_content_template": 'The contract "{{ contract_name }}" for {{ event_name }} has been signed by {{ client_name }}.',
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A contract has been signed:</p>
            <ul>
                <li><strong>Contract:</strong> {{ contract_name }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Client:</strong> {{ client_name }}</li>
            </ul>
            <p>You can now proceed with the confirmed event planning.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Contract</a></p>{% endif %}
            """,
            "default_sms_template": "Contract signed by {{ client_name }} for {{ event_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "CONTRACT_EXPIRING_SOON",
            "name": "Contract Expiring Soon",
            "description": "Notification when a contract is about to expire",
            "category": "CONTRACT",
            "icon": "AccessTimeIcon",
            "color": "#FF9800",
            "priority": "HIGH",
            "default_title_template": "Contract Expires in {{ days_remaining }} Day(s)",
            "default_content_template": "Your contract for {{ event_name }} expires on {{ valid_until }}. Please sign the contract before it expires to secure your booking.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Your contract is expiring soon:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Expires:</strong> {{ valid_until }}</li>
                <li><strong>Days Remaining:</strong> {{ days_remaining }}</li>
            </ul>
            <p>Please sign the contract before it expires to secure your booking date.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Sign Contract Now</a></p>{% endif %}
            """,
            "default_sms_template": "Your contract for {{ event_name }} expires in {{ days_remaining }} day(s). Please sign soon.",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "CONTRACT_EXPIRED",
            "name": "Contract Expired",
            "description": "Notification when a contract has expired",
            "category": "CONTRACT",
            "icon": "EventBusyIcon",
            "color": "#F44336",
            "priority": "HIGH",
            "default_title_template": "Contract Has Expired",
            "default_content_template": "The contract for {{ event_name }} expired on {{ valid_until }}. Please contact us if you would like to request a new contract.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Unfortunately, your contract has expired:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Expired on:</strong> {{ valid_until }}</li>
            </ul>
            <p>If you would still like to proceed with your booking, please contact us to request a new contract.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Contact Us</a></p>{% endif %}
            """,
            "default_sms_template": "Your contract for {{ event_name }} has expired. Contact us for a new contract.",
            "supports_email": True,
            "supports_sms": True,
        },
        # Communication notifications
        {
            "code": "MESSAGE_RECEIVED",
            "name": "Message Received",
            "description": "Notification when a message is received",
            "category": "COMMUNICATION",
            "icon": "MailIcon",
            "color": "#2196F3",
            "priority": "NORMAL",
            "default_title_template": "New Message: {{ subject }}",
            "default_content_template": "You have received a new {{ channel }} message from {{ sender_name }}: {{ subject }}",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>You have received a new message:</p>
            <ul>
                <li><strong>From:</strong> {{ sender_name }}</li>
                <li><strong>Subject:</strong> {{ subject }}</li>
                <li><strong>Method:</strong> {{ channel }}</li>
            </ul>
            <p>You can view the full message in your client portal.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Message</a></p>{% endif %}
            """,
            "default_sms_template": "New message from {{ sender_name }}: {{ subject }}",
            "supports_email": True,
            "supports_sms": False,
        },
        # Client invitation notifications
        {
            "code": "CLIENT_INVITATION_SENT",
            "name": "Client Invitation Sent",
            "description": "Notification when a client invitation is sent",
            "category": "CLIENT",
            "icon": "SendIcon",
            "color": "#FF9800",
            "priority": "NORMAL",
            "default_title_template": "Client Invitation Sent",
            "default_content_template": "{{ invited_by }} sent an invitation to {{ client_name }} ({{ client_email }}).",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A client invitation has been sent:</p>
            <ul>
                <li><strong>Client:</strong> {{ client_name }}</li>
                <li><strong>Email:</strong> {{ client_email }}</li>
                <li><strong>Sent by:</strong> {{ invited_by }}</li>
            </ul>
            {% if action_url %}<p><a href="{{ action_url }}">View Client</a></p>{% endif %}
            """,
            "default_sms_template": "Invitation sent to {{ client_name }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "CLIENT_INVITATION_ACCEPTED",
            "name": "Client Invitation Accepted",
            "description": "Notification when a client accepts an invitation",
            "category": "CLIENT",
            "icon": "PersonAddIcon",
            "color": "#4CAF50",
            "priority": "NORMAL",
            "default_title_template": "Client Invitation Accepted",
            "default_content_template": "{{ client_name }} ({{ client_email }}) has accepted their invitation and created an account.",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>Great news! A client has accepted their invitation:</p>
            <ul>
                <li><strong>Client:</strong> {{ client_name }}</li>
                <li><strong>Email:</strong> {{ client_email }}</li>
            </ul>
            <p>They now have access to their client portal.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Client Profile</a></p>{% endif %}
            """,
            "default_sms_template": "{{ client_name }} accepted invitation",
            "supports_email": True,
            "supports_sms": False,
        },
        # Workflow notifications
        {
            "code": "WORKFLOW_STAGE_CHANGED",
            "name": "Workflow Stage Changed",
            "description": "Notification when an event workflow stage changes",
            "category": "WORKFLOW",
            "icon": "TimelineIcon",
            "color": "#607D8B",
            "priority": "NORMAL",
            "default_title_template": "Workflow Update: {{ event_name }}",
            "default_content_template": "{{ event_name }} for {{ client_name }} has progressed to {{ new_stage }} ({{ workflow_name }}).",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>An event has progressed in its workflow:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Client:</strong> {{ client_name }}</li>
                <li><strong>New Stage:</strong> {{ new_stage }}</li>
                <li><strong>Workflow:</strong> {{ workflow_name }}</li>
            </ul>
            {% if action_url %}<p><a href="{{ action_url }}">View Event</a></p>{% endif %}
            """,
            "default_sms_template": "{{ event_name }} moved to {{ new_stage }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "EVENT_PROGRESS_UPDATE",
            "name": "Event Progress Update",
            "description": "Notification about event planning progress",
            "category": "WORKFLOW",
            "icon": "TimelineIcon",
            "color": "#607D8B",
            "priority": "NORMAL",
            "default_title_template": "Progress Update: {{ event_name }}",
            "default_content_template": "Your event {{ event_name }} has a new progress update: {{ progress_description }}",
            "default_email_template": """
                    <p>Hello {{ recipient_name }},</p>
                    <p>There is a new update on your event:</p>
                    <ul>
                        <li><strong>Event:</strong> {{ event_name }}</li>
                        <li><strong>Update:</strong> {{ progress_description }}</li>
                    </ul>
                    {% if action_url %}<p><a href="{{ action_url }}">View Details</a></p>{% endif %}
                    """,
            "default_sms_template": "Update: {{ event_name }} - {{ progress_description }}",
            "supports_email": True,
            "supports_sms": False,
        },
        # Support inquiry notifications
        {
            "code": "SUPPORT_INQUIRY_CREATED",
            "name": "New Support Inquiry",
            "description": "Notification when a client creates a support inquiry",
            "category": "COMMUNICATION",
            "icon": "SupportAgentIcon",
            "color": "#E91E63",
            "priority": "HIGH",
            "default_title_template": "New Support Inquiry: {{ subject }}",
            "default_content_template": "{{ client_name }} submitted a support inquiry: {{ subject }}",
            "default_email_template": """
            <p>Hello {{ recipient_name }},</p>
            <p>A new support inquiry has been submitted:</p>
            <ul>
                <li><strong>From:</strong> {{ client_name }} ({{ client_email }})</li>
                <li><strong>Subject:</strong> {{ subject }}</li>
                <li><strong>Category:</strong> {{ category }}</li>
                <li><strong>Priority:</strong> {{ priority }}</li>
            </ul>
            <p>Please respond promptly.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Inquiry</a></p>{% endif %}
            """,
            "default_sms_template": "New support inquiry from {{ client_name }}: {{ subject }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "SUPPORT_INQUIRY_REPLY",
            "name": "Support Reply Received",
            "description": "Notification when an admin replies to a support inquiry",
            "category": "COMMUNICATION",
            "icon": "ReplyIcon",
            "color": "#2196F3",
            "priority": "NORMAL",
            "default_title_template": "Reply to Your Support Inquiry",
            "default_content_template": "You have received a reply to your support inquiry: {{ subject }}",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>You have received a reply to your support inquiry:</p>
            <ul>
                <li><strong>Subject:</strong> {{ subject }}</li>
            </ul>
            <p>Please log in to your client portal to view the full response.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Response</a></p>{% endif %}
            """,
            "default_sms_template": "Reply received for your inquiry: {{ subject }}",
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "SUPPORT_INQUIRY_RESOLVED",
            "name": "Support Inquiry Resolved",
            "description": "Notification when a support inquiry is marked resolved",
            "category": "COMMUNICATION",
            "icon": "CheckCircleIcon",
            "color": "#4CAF50",
            "priority": "NORMAL",
            "default_title_template": "Support Inquiry Resolved",
            "default_content_template": 'Your support inquiry "{{ subject }}" has been resolved.',
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Your support inquiry has been resolved:</p>
            <ul>
                <li><strong>Subject:</strong> {{ subject }}</li>
            </ul>
            <p>If you have any further questions, please don't hesitate to contact us again.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Inquiry</a></p>{% endif %}
            """,
            "default_sms_template": 'Your inquiry "{{ subject }}" has been resolved.',
            "supports_email": True,
            "supports_sms": False,
        },
        # Payment reminder notifications
        {
            "code": "PAYMENT_REMINDER",
            "name": "Payment Deadline Reminder",
            "description": "Reminder about approaching payment deadline",
            "category": "PAYMENT",
            "icon": "PaymentIcon",
            "color": "#FF9800",
            "priority": "HIGH",
            "default_title_template": "Payment Deadline Reminder",
            "default_content_template": "Your booking for {{ event_name }} requires payment by {{ deadline }}. Please complete your payment to secure your date.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>This is a reminder that your booking requires payment:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Event Date:</strong> {{ event_date }}</li>
                <li><strong>Payment Deadline:</strong> {{ deadline }}</li>
            </ul>
            <p>Please complete your payment to secure your date.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Make Payment</a></p>{% endif %}
            """,
            "default_sms_template": "Payment reminder: {{ event_name }} deadline {{ deadline }}. Please pay to secure your date.",
            "supports_email": True,
            "supports_sms": True,
        },
        # Event cancellation notifications
        {
            "code": "EVENT_CANCELLED",
            "name": "Event Cancelled",
            "description": "Notification when an event is cancelled",
            "category": "EVENT",
            "icon": "CancelIcon",
            "color": "#F44336",
            "priority": "HIGH",
            "default_title_template": "Booking Cancelled",
            "default_content_template": "Your booking for {{ event_name }} on {{ event_date }} has been cancelled.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>We regret to inform you that your booking has been cancelled:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Date:</strong> {{ event_date }}</li>
                {% if reason %}<li><strong>Reason:</strong> {{ reason }}</li>{% endif %}
            </ul>
            <p>You can rebook for a different date through your account.</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Details</a></p>{% endif %}
            """,
            "default_sms_template": "Your booking for {{ event_name }} on {{ event_date }} has been cancelled.",
            "supports_email": True,
            "supports_sms": True,
        },
        # Date hold expiration notifications
        {
            "code": "DATE_HOLD_EXPIRED",
            "name": "Date Hold Expired",
            "description": "Notification when a temporary date hold expires",
            "category": "EVENT",
            "icon": "EventBusyIcon",
            "color": "#F44336",
            "priority": "HIGH",
            "default_title_template": "Date Hold Expired",
            "default_content_template": "Your hold on {{ event_date }} has expired. The date is now available for other bookings.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Your temporary date hold has expired:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Date:</strong> {{ event_date }}</li>
            </ul>
            <p>The date is now available for other bookings. To secure this date, please complete your booking with payment.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Complete Booking</a></p>{% endif %}
            """,
            "default_sms_template": "Your hold on {{ event_date }} has expired. Complete your booking to secure this date.",
            "supports_email": True,
            "supports_sms": True,
        },
        {
            "code": "HOLD_EXPIRING_REMINDER",
            "name": "Date Hold Expiring Soon",
            "description": "Reminder that a date hold is about to expire",
            "category": "EVENT",
            "icon": "AccessTimeIcon",
            "color": "#FF9800",
            "priority": "HIGH",
            "default_title_template": "Date Hold Expiring Soon",
            "default_content_template": "Your hold on {{ event_date }} expires in {{ hours_remaining }} hours. Complete your payment to secure this date.",
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>Your date hold is expiring soon:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Date:</strong> {{ event_date }}</li>
                <li><strong>Expires in:</strong> {{ hours_remaining }} hours</li>
            </ul>
            <p>Complete your payment now to secure this date before the hold expires.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Complete Payment</a></p>{% endif %}
            """,
            "default_sms_template": "Your hold on {{ event_date }} expires in {{ hours_remaining }} hrs. Pay now to secure your date.",
            "supports_email": True,
            "supports_sms": True,
        },
        # Event date reminder notifications
        {
            "code": "EVENT_REMINDER",
            "name": "Upcoming Event Reminder",
            "description": "Reminder about an upcoming event date",
            "category": "EVENT",
            "icon": "NotificationsActiveIcon",
            "color": "#2196F3",
            "priority": "NORMAL",
            "default_title_template": "Upcoming Event Reminder",
            "default_content_template": 'Your event "{{ event_name }}" is scheduled for {{ event_date }}. We look forward to seeing you!',
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>This is a friendly reminder about your upcoming event:</p>
            <ul>
                <li><strong>Event:</strong> {{ event_name }}</li>
                <li><strong>Date:</strong> {{ event_date }}</li>
            </ul>
            <p>We look forward to making your event special!</p>
            {% if action_url %}<p><a href="{{ action_url }}">View Event Details</a></p>{% endif %}
            """,
            "default_sms_template": "Reminder: {{ event_name }} on {{ event_date }}. We look forward to seeing you!",
            "supports_email": True,
            "supports_sms": True,
        },
        # Questionnaire notifications
        {
            "code": "QUESTIONNAIRE_SENT",
            "name": "Questionnaire Sent",
            "description": "Notification when a questionnaire is sent to client",
            "category": "EVENT",
            "icon": "AssignmentIcon",
            "color": "#3F51B5",
            "priority": "NORMAL",
            "default_title_template": "New Questionnaire to Complete",
            "default_content_template": 'A questionnaire "{{ questionnaire_name }}" has been sent for {{ event_name }}. Please complete it at your earliest convenience.',
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>A questionnaire has been sent for your event:</p>
            <ul>
                <li><strong>Questionnaire:</strong> {{ questionnaire_name }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
                {% if due_date %}<li><strong>Due Date:</strong> {{ due_date }}</li>{% endif %}
            </ul>
            <p>Please complete the questionnaire at your earliest convenience.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Complete Questionnaire</a></p>{% endif %}
            """,
            "default_sms_template": 'Questionnaire "{{ questionnaire_name }}" sent for {{ event_name }}. Please complete it soon.',
            "supports_email": True,
            "supports_sms": False,
        },
        {
            "code": "QUESTIONNAIRE_REMINDER",
            "name": "Questionnaire Reminder",
            "description": "Reminder to complete a pending questionnaire",
            "category": "EVENT",
            "icon": "AssignmentLateIcon",
            "color": "#FF9800",
            "priority": "HIGH",
            "default_title_template": "Questionnaire Reminder",
            "default_content_template": 'Reminder: Please complete the questionnaire "{{ questionnaire_name }}" for {{ event_name }}.',
            "default_email_template": """
            <p>Dear {{ recipient_name }},</p>
            <p>This is a reminder to complete your questionnaire:</p>
            <ul>
                <li><strong>Questionnaire:</strong> {{ questionnaire_name }}</li>
                <li><strong>Event:</strong> {{ event_name }}</li>
                {% if due_date %}<li><strong>Due Date:</strong> {{ due_date }}</li>{% endif %}
            </ul>
            <p>Please complete the questionnaire as soon as possible to help us plan your event.</p>
            {% if action_url %}<p><a href="{{ action_url }}">Complete Questionnaire</a></p>{% endif %}
            """,
            "default_sms_template": 'Reminder: Complete questionnaire "{{ questionnaire_name }}" for {{ event_name }}.',
            "supports_email": True,
            "supports_sms": False,
        },
    ]
