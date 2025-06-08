# backend/core/domains/communications/signals.py
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.apps import apps


@receiver(post_migrate)
def create_system_templates(sender, **kwargs):
    """Create system communication templates after migrations"""
    if sender.name != 'core.domains.communications':
        return
    
    CommunicationTemplate = apps.get_model('communications', 'CommunicationTemplate')
    
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