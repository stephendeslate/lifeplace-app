# backend/core/domains/communications/signals.py
# Complete file with all existing functionality + Booking Confirmation template

from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.apps import apps


@receiver(post_migrate)
def create_system_templates(sender, **kwargs):
    """Create system communication templates after migrations"""
    if sender.name != 'core.domains.communications':
        return
    
    CommunicationTemplate = apps.get_model('communications', 'CommunicationTemplate')
    
    # Manual Email Template - serves as layout for custom messages
    manual_email_template, created = CommunicationTemplate.objects.get_or_create(
        name='Manual Email Layout',
        defaults={
            'channel': 'EMAIL',
            'category': 'MANUAL',
            'is_system': False,  # Allow editing
            'subject_template': 'Custom Message from LifePlace',
            'body_template': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">{{ site_name }}</h1>
    </div>
    
    <div style="padding: 32px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="color: #666; line-height: 1.5;">Hello <strong>{{ first_name }} {{ last_name }}</strong>,</p>
            
            <div style="margin: 24px 0; color: #333; line-height: 1.6;">
                {{ message }}
            </div>
            
            <p style="color: #666; line-height: 1.5; margin-top: 32px;">
                Best regards,<br>
                The {{ site_name }} Team
            </p>
        </div>
    </div>
    
    <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2024 {{ site_name }}. All rights reserved.</p>
    </div>
</div>
            ''',
            'variables_schema': {
                'required': ['first_name', 'last_name', 'message', 'site_name'],
                'optional': ['company', 'phone']
            }
        }
    )
    
    # Manual SMS Template - serves as layout for custom SMS messages
    manual_sms_template, created = CommunicationTemplate.objects.get_or_create(
        name='Manual SMS Layout',
        defaults={
            'channel': 'SMS',
            'category': 'MANUAL',
            'is_system': False,  # Allow editing
            'subject_template': '',  # SMS doesn't use subject
            'body_template': 'Hi {{ first_name }}! {{ message }} - {{ site_name }}',
            'variables_schema': {
                'required': ['first_name', 'message', 'site_name'],
                'optional': ['last_name']
            }
        }
    )
    
    # Professional Email Template - alternative layout
    professional_email_template, created = CommunicationTemplate.objects.get_or_create(
        name='Professional Email Layout',
        defaults={
            'channel': 'EMAIL',
            'category': 'MANUAL',
            'is_system': False,
            'subject_template': 'Message from {{ site_name }}',
            'body_template': '''
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="border-bottom: 3px solid #1976d2; padding: 20px;">
        <h2 style="margin: 0; color: #1976d2; font-weight: 300;">{{ site_name }}</h2>
    </div>
    
    <div style="padding: 40px 20px;">
        <p style="color: #333; font-size: 16px; margin-bottom: 8px;">Dear {{ first_name }},</p>
        
        <div style="color: #555; font-size: 14px; line-height: 1.6; margin: 20px 0;">
            {{ message }}
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #777; font-size: 14px; margin: 0;">
                Sincerely,<br>
                <strong>{{ site_name }} Team</strong>
            </p>
        </div>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 15px 20px; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
            This message was sent by {{ site_name }}. 
            If you have any questions, please contact us at {{ support_email }}.
        </p>
    </div>
</div>
            ''',
            'variables_schema': {
                'required': ['first_name', 'message', 'site_name'],
                'optional': ['last_name', 'support_email']
            }
        }
    )
    
    # Client invitation email template
    client_invitation_template, created = CommunicationTemplate.objects.get_or_create(
        name='Client Invitation',
        defaults={
            'channel': 'EMAIL',
            'category': 'SYSTEM',
            'is_system': True,
            'subject_template': 'You\'ve been invited to join {{ site_name }}',
            'body_template': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">{{ site_name }}</h1>
    </div>
    
    <div style="padding: 32px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">You've been invited to join {{ site_name }}</h2>
            
            <p style="color: #666; line-height: 1.5;">Hello <strong>{{ first_name }} {{ last_name }}</strong>,</p>
            
            <p style="color: #666; line-height: 1.5;">
                <strong>{{ invited_by }}</strong> has invited you to join {{ site_name }} as a client.
            </p>
            
            <p style="color: #666; line-height: 1.5;">
                Click the button below to accept the invitation and set up your account:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{ invitation_link }}" 
                   style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Accept Invitation
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5;">
                This invitation will expire in {{ expiry_date }}. 
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>
    </div>
    
    <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2024 {{ site_name }}. All rights reserved.</p>
    </div>
</div>
            ''',
            'variables_schema': {
                'required': ['first_name', 'last_name', 'invited_by', 'invitation_link', 'expiry_date', 'site_name'],
                'optional': []
            }
        }
    )

    # Admin invitation email template
    admin_invitation_template, created = CommunicationTemplate.objects.get_or_create(
        name='Admin Invitation',
        defaults={
            'channel': 'EMAIL',
            'category': 'SYSTEM',
            'is_system': True,
            'subject_template': 'You\'ve been invited to join LifePlace Admin',
            'body_template': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">LifePlace Admin</h1>
    </div>
    
    <div style="padding: 32px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">You've been invited to join LifePlace Admin</h2>
            
            <p style="color: #666; line-height: 1.5;">Hello <strong>{{ first_name }} {{ last_name }}</strong>,</p>
            
            <p style="color: #666; line-height: 1.5;">
                <strong>{{ invited_by }}</strong> has invited you to join LifePlace as an administrator.
            </p>
            
            <div style="margin: 24px 0; padding: 16px; background-color: #e3f2fd; border-left: 4px solid #1976d2; border-radius: 4px;">
                <p style="margin: 0; color: #1565c0;">
                    <strong>Role:</strong> Administrator
                </p>
            </div>
            
            <p style="color: #666; line-height: 1.5;">
                Click the button below to accept the invitation and set up your account:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{ invitation_link }}" 
                   style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Accept Invitation
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5;">
                This invitation will expire on {{ expiry_date }}. 
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>
    </div>
    
    <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2024 LifePlace. All rights reserved.</p>
    </div>
</div>
            ''',
            'variables_schema': {
                'required': ['first_name', 'last_name', 'invited_by', 'invitation_link', 'expiry_date'],
                'optional': []
            }
        }
    )

    # Welcome email template
    welcome_template, created = CommunicationTemplate.objects.get_or_create(
        name='Welcome Email',
        defaults={
            'channel': 'EMAIL',
            'category': 'SYSTEM',
            'is_system': True,
            'subject_template': 'Welcome to LifePlace!',
            'body_template': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Welcome to LifePlace!</h1>
    </div>
    
    <div style="padding: 32px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Welcome {{ first_name }}!</h2>
            
            <p style="color: #666; line-height: 1.5;">
                Thank you for joining LifePlace. We're excited to help you manage your events and create memorable experiences.
            </p>
            
            <p style="color: #666; line-height: 1.5;">
                Your account has been successfully created and you can now start using our platform.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{ login_link }}" 
                   style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Get Started
                </a>
            </div>
            
            <p style="color: #666; line-height: 1.5;">
                If you have any questions, feel free to contact our support team.
            </p>
        </div>
    </div>
    
    <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2024 LifePlace. All rights reserved.</p>
    </div>
</div>
            ''',
            'variables_schema': {
                'required': ['first_name', 'login_link'],
                'optional': ['last_name']
            }
        }
    )
    
    # NEW: Booking Confirmation email template
    booking_confirmation_template, created = CommunicationTemplate.objects.get_or_create(
        name='Booking Confirmation',
        defaults={
            'channel': 'EMAIL',
            'category': 'SYSTEM',
            'is_system': True,
            'subject_template': 'Booking Confirmed - {{ event_type }}',
            'body_template': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
    </div>
    
    <div style="padding: 32px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Thank you for your booking, {{ client_name }}!</h2>
            
            <p style="color: #666; line-height: 1.5;">
                Your booking has been confirmed. Here are your booking details:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Booking Reference:</strong> {{ booking_reference }}</p>
                <p style="margin: 5px 0;"><strong>Event Type:</strong> {{ event_type }}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {{ event_date }}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> {{ event_time }}</p>
                {% if duration %}<p style="margin: 5px 0;"><strong>Duration:</strong> {{ duration }} hours</p>{% endif %}
                {% if total_price %}<p style="margin: 5px 0;"><strong>Total Price:</strong> ${{ total_price }}</p>{% endif %}
            </div>
            
            {% if selected_packages %}
            <h3 style="color: #333;">Selected Packages:</h3>
            <ul style="color: #666;">
                {% for package in selected_packages %}
                <li>{{ package.name }} - ${{ package.price }}</li>
                {% endfor %}
            </ul>
            {% endif %}
            
            {% if selected_addons %}
            <h3 style="color: #333;">Selected Add-ons:</h3>
            <ul style="color: #666;">
                {% for addon in selected_addons %}
                <li>{{ addon.name }} - ${{ addon.price }}</li>
                {% endfor %}
            </ul>
            {% endif %}
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{ dashboard_url }}" 
                   style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    View Your Booking
                </a>
            </div>
            
            <p style="color: #666; line-height: 1.5;">
                If you have any questions about your booking, please don't hesitate to contact us.
            </p>
        </div>
    </div>
    
    <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2024 LifePlace. All rights reserved.</p>
    </div>
</div>
            ''',
            'variables_schema': {
                'required': ['client_name', 'booking_reference', 'event_type', 'event_date', 'event_time'],
                'optional': ['duration', 'total_price', 'selected_packages', 'selected_addons', 'dashboard_url', 'phone', 'email', 'questionnaire_responses']
            }
        }
    )
    
    # NEW: Booking Reminder email template
    booking_reminder_template, created = CommunicationTemplate.objects.get_or_create(
        name='Booking Reminder',
        defaults={
            'channel': 'EMAIL',
            'category': 'SYSTEM',
            'is_system': True,
            'subject_template': 'Reminder: Your {{ event_type }} is Tomorrow',
            'body_template': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Event Reminder</h1>
    </div>
    
    <div style="padding: 32px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi {{ client_name }}!</h2>
            
            <p style="color: #666; line-height: 1.5;">
                This is a friendly reminder about your upcoming event tomorrow:
            </p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Event:</strong> {{ event_type }}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {{ event_date }}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> {{ event_time }}</p>
                {% if venue %}<p style="margin: 5px 0;"><strong>Location:</strong> {{ venue }}</p>{% endif %}
                <p style="margin: 5px 0;"><strong>Reference:</strong> {{ booking_reference }}</p>
            </div>
            
            <p style="color: #666; line-height: 1.5;">
                We look forward to seeing you! If you need to make any changes or have questions, please contact us as soon as possible.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{ dashboard_url }}" 
                   style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    View Booking Details
                </a>
            </div>
        </div>
    </div>
    
    <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2024 LifePlace. All rights reserved.</p>
    </div>
</div>
            ''',
            'variables_schema': {
                'required': ['client_name', 'event_type', 'event_date', 'event_time', 'booking_reference'],
                'optional': ['venue', 'dashboard_url']
            }
        }
    )
    
    # Password Reset email template
    password_reset_template, created = CommunicationTemplate.objects.get_or_create(
        name='Password Reset',
        defaults={
            'channel': 'EMAIL',
            'category': 'SYSTEM',
            'is_system': True,
            'subject_template': 'Reset Your LifePlace Password',
            'body_template': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
    </div>
    
    <div style="padding: 32px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hello {{ first_name }}!</h2>
            
            <p style="color: #666; line-height: 1.5;">
                We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
            </p>
            
            <p style="color: #666; line-height: 1.5;">
                To reset your password, click the button below:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{ reset_link }}" 
                   style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Reset Password
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5;">
                This link will expire in 24 hours. If you need a new link, please request another password reset.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 12px; border-radius: 4px; margin-top: 20px;">
                <p style="color: #666; font-size: 13px; margin: 0;">
                    <strong>Security tip:</strong> Never share your password with anyone, and make sure to use a strong, unique password for your account.
                </p>
            </div>
        </div>
    </div>
    
    <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2024 LifePlace. All rights reserved.</p>
    </div>
</div>
            ''',
            'variables_schema': {
                'required': ['first_name', 'reset_link'],
                'optional': ['last_name']
            }
        }
    )
    
    if created:
        print(f"Created system communication templates including booking confirmation")


# === CACHE INVALIDATION SIGNALS ===

from django.db.models.signals import post_save, post_delete
import logging

logger = logging.getLogger(__name__)


@receiver([post_save, post_delete], sender='communications.CommunicationTemplate')
def invalidate_template_caches(sender, instance, **kwargs):
    """Invalidate template-related caches when templates are modified"""
    try:
        from .cache_service import communications_cache_service
        communications_cache_service.invalidate_template_caches(
            template_id=instance.id, 
            template_name=instance.name
        )
        logger.info(f"Invalidated template caches for: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to invalidate template caches: {e}")


@receiver([post_save, post_delete], sender='communications.CommunicationRecord')
def invalidate_record_caches(sender, instance, **kwargs):
    """Invalidate record-related caches when records are modified"""
    try:
        from .cache_service import communications_cache_service
        communications_cache_service.invalidate_record_caches(
            record_id=str(instance.id), 
            client_id=instance.client.id if instance.client else None,
            template_name=instance.template_name
        )
        logger.info(f"Invalidated record caches for: {instance.template_name}")
    except Exception as e:
        logger.error(f"Failed to invalidate record caches: {e}")


def connect_communication_signals():
    """Connect all communication domain cache invalidation signals"""
    logger.info("Successfully connected all communication domain signals")