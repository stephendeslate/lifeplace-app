# backend/core/domains/users/services.py
import uuid
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from .exceptions import (
    EmailAlreadyExists,
    InvitationAlreadyAccepted,
    InvitationExpired,
    UserNotFound,
)
from .models import AdminInvitation, User, UserProfile


class UserService:
    @staticmethod
    def get_users(search_query=None):
        """Get all users with optional search filter"""
        queryset = User.objects.all()
        
        if search_query:
            queryset = queryset.filter(
                Q(email__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query)
            )
            
        return queryset
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get a user by ID"""
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise UserNotFound()
    
    @staticmethod
    def get_user_by_email(email):
        """Get a user by email"""
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist:
            raise UserNotFound()
    
    
    @staticmethod
    def create_user(user_data):
        """Create a new user"""
        if User.objects.filter(email=user_data.get('email')).exists():
            raise EmailAlreadyExists()
            
        profile_data = user_data.pop('profile', {})
        user = User.objects.create_user(**user_data)
        
        # Update the profile created by signal instead of creating new one
        if profile_data and hasattr(user, 'profile'):
            for key, value in profile_data.items():
                setattr(user.profile, key, value)
            user.profile.save()
        
        return user
    
    @staticmethod
    def update_user(user, user_data):
        """Update a user"""
        profile_data = user_data.pop('profile', None)
        
        # Update user fields
        for key, value in user_data.items():
            if key != 'password':
                setattr(user, key, value)
            
        if 'password' in user_data:
            user.set_password(user_data['password'])
            
        user.save()
        
        # Update or create profile if data provided
        if profile_data:
            if hasattr(user, 'profile') and user.profile is not None:
                # Update existing profile
                for key, value in profile_data.items():
                    setattr(user.profile, key, value)
                user.profile.save()
            else:
                # Create new profile if it doesn't exist (shouldn't happen due to signal)
                UserProfile.objects.create(user=user, **profile_data)
            
        return user
    
    @staticmethod
    def delete_user(user):
        """Delete a user"""
        user.is_active = False
        user.save()
        return True

    @staticmethod
    def get_tokens_for_user(user, remember_me=False):
        """Get JWT tokens for a user"""
        refresh = RefreshToken.for_user(user)
        
        # If remember_me is True, extend the token lifetime
        if remember_me:
            refresh.set_exp(lifetime=timedelta(days=7))
        
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }


class AdminInvitationService:
    @staticmethod
    def create_invitation(email, first_name, last_name, invited_by):
        """Create a new admin invitation"""
        # Check if user with email already exists
        if User.objects.filter(email=email).exists():
            raise EmailAlreadyExists()
            
        # Check if there's an active invitation for this email
        if AdminInvitation.objects.filter(email=email, is_accepted=False).exists():
            # Cancel the existing invitation and create a new one
            AdminInvitation.objects.filter(email=email).delete()
        
        # Create new invitation
        invitation = AdminInvitation.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            invited_by=invited_by,
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        # Send invitation email using communications service
        AdminInvitationService._send_invitation_email(invitation)
        
        return invitation
    
    @staticmethod
    def accept_invitation(invitation_id, password):
        """Accept an invitation and create a user"""
        try:
            invitation = AdminInvitation.objects.get(id=invitation_id, is_accepted=False)
        except AdminInvitation.DoesNotExist:
            raise UserNotFound("Invitation not found or already accepted.")
        
        # Check if invitation is expired
        if invitation.is_expired():
            raise InvitationExpired()
            
        # Create new admin user
        user = User.objects.create_user(
            email=invitation.email,
            password=password,
            first_name=invitation.first_name,
            last_name=invitation.last_name,
            role='ADMIN',
            is_staff=True  # Admin users should have staff access
        )
        
        # Mark invitation as accepted
        invitation.is_accepted = True
        invitation.save()
        
        return user
    
    @staticmethod
    def get_invitation_by_id(invitation_id):
        """Get an invitation by ID"""
        try:
            return AdminInvitation.objects.get(id=invitation_id)
        except AdminInvitation.DoesNotExist:
            raise UserNotFound("Invitation not found.")
    
    @staticmethod
    def _send_invitation_email(invitation):
        """Send invitation email using communication service"""
        try:
            # Import here to avoid circular imports
            from core.domains.communications.services import CommunicationService
            
            communication_service = CommunicationService()
            
            # Get frontend URL from settings
            frontend_url = getattr(settings, 'ADMIN_FRONTEND_URL', 'http://localhost:5173')
            invitation_link = f"{frontend_url}/accept-invitation/{invitation.id}"
            
            # Prepare context data for template
            context_data = {
                'first_name': invitation.first_name,
                'last_name': invitation.last_name,
                'invited_by': invitation.invited_by.get_full_name(),
                'invitation_link': invitation_link,
                'expiry_date': invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')
            }
            
            # Send using communication service
            record = communication_service.send_communication(
                template_name='Admin Invitation',
                recipient=invitation.email,
                context_data=context_data,
                sent_by=invitation.invited_by
            )
            
            if not record:
                # Fallback to old email system if communication service fails
                print(f"Communication service failed, falling back to direct email for {invitation.email}")
                AdminInvitationService._send_fallback_email(invitation)
                
        except ImportError:
            # Communications domain not available, use fallback
            print(f"Communications domain not available, using fallback email for {invitation.email}")
            AdminInvitationService._send_fallback_email(invitation)
        except Exception as e:
            # Log error and use fallback
            print(f"Failed to send invitation via communication service: {str(e)}")
            AdminInvitationService._send_fallback_email(invitation)
    
    @staticmethod
    def _send_fallback_email(invitation):
        """Fallback email sending using Django's send_mail (original implementation)"""
        from django.core.mail import send_mail
        
        subject = "You've been invited to join LifePlace Admin"
        
        # Get frontend URL from settings
        frontend_url = getattr(settings, 'ADMIN_FRONTEND_URL', 'http://localhost:5173')
        invitation_link = f"{frontend_url}/accept-invitation/{invitation.id}"
        
        # Create email content (original template)
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">LifePlace Admin</h1>
            </div>
            
            <div style="padding: 32px; background-color: #f5f5f5;">
                <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; margin-top: 0;">You've been invited to join LifePlace Admin</h2>
                    
                    <p style="color: #666; line-height: 1.5;">Hello <strong>{invitation.first_name} {invitation.last_name}</strong>,</p>
                    
                    <p style="color: #666; line-height: 1.5;">
                        <strong>{invitation.invited_by.get_full_name()}</strong> has invited you to join LifePlace as an administrator.
                    </p>
                    
                    <div style="margin: 24px 0; padding: 16px; background-color: #e3f2fd; border-left: 4px solid #1976d2; border-radius: 4px;">
                        <p style="margin: 0; color: #1565c0;">
                            <strong>Email:</strong> {invitation.email}<br>
                            <strong>Role:</strong> Administrator
                        </p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.5;">
                        Click the button below to accept the invitation and set up your account:
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{invitation_link}" 
                           style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                            Accept Invitation
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 14px; line-height: 1.5;">
                        This invitation will expire on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}. 
                        If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
            </div>
            
            <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
                <p style="margin: 0;">
                    © 2024 LifePlace. All rights reserved.
                </p>
            </div>
        </div>
        """
        
        plain_message = f"""
        You've been invited to join LifePlace Admin
        
        Hello {invitation.first_name} {invitation.last_name},
        
        {invitation.invited_by.get_full_name()} has invited you to join LifePlace as an administrator.
        
        Email: {invitation.email}
        Role: Administrator
        
        Please click the link below to accept the invitation and set up your account:
        {invitation_link}
        
        This invitation will expire on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}.
        
        If you didn't expect this invitation, you can safely ignore this email.
        
        Thank you,
        The LifePlace Team
        """
        
        # Send email
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@lifeplace.com'),
                recipient_list=[invitation.email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as e:
            # Log the error but don't fail the invitation creation
            print(f"Failed to send fallback invitation email: {str(e)}")
            # In production, you might want to use proper logging
            # logger.error(f"Failed to send invitation email to {invitation.email}: {str(e)}")