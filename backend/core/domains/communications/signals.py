# backend/core/domains/communications/signals.py (Updated)

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
    
    if created:
        print(f"Created system communication templates")