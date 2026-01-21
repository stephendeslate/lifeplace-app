# backend/core/domains/users/services.py
import uuid
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from .exceptions import (
    EmailAlreadyExists,
    InvitationExpired,
    UserNotFound,
    UserAlreadyAdmin,
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
    def create_invitation(email, first_name, last_name, invited_by, permissions=None):
        """
        Create a new admin invitation or upgrade invitation for existing CLIENT users

        Handles three scenarios:
        1. New user (doesn't exist) → create regular invitation
        2. Existing CLIENT user → create upgrade invitation
        3. Existing ADMIN user → raise error (already admin)

        Args:
            email: Email address for the invitation
            first_name: First name of the invitee
            last_name: Last name of the invitee
            invited_by: User who is sending the invitation
            permissions: Optional dict of admin permissions to assign on acceptance
        """
        import logging
        from .permissions_constants import validate_permissions

        logger = logging.getLogger(__name__)

        # Check if user with email already exists
        existing_user = None
        try:
            existing_user = User.objects.get(email=email)
        except User.DoesNotExist:
            pass

        # Determine invitation type
        is_upgrade = False
        if existing_user:
            if existing_user.role == 'ADMIN':
                logger.warning(f"Attempted to invite existing admin user: {email}")
                raise UserAlreadyAdmin()
            elif existing_user.role == 'CLIENT':
                is_upgrade = True
                logger.info(f"Creating upgrade invitation for CLIENT user: {email}")

        # Check if there's an active invitation for this email
        if AdminInvitation.objects.filter(email=email, is_accepted=False).exists():
            # Cancel the existing invitation and create a new one
            AdminInvitation.objects.filter(email=email).delete()
            logger.info(f"Deleted existing pending invitation for {email}")

        # Validate and clean permissions
        validated_permissions = validate_permissions(permissions) if permissions else {}

        # Create new invitation
        invitation = AdminInvitation.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            invited_by=invited_by,
            user=existing_user if is_upgrade else None,
            is_upgrade=is_upgrade,
            permissions=validated_permissions,
            expires_at=timezone.now() + timedelta(days=7)
        )

        logger.info(f"Created {'upgrade' if is_upgrade else 'new'} invitation for {email}")

        # Try to send invitation email - but don't fail if it doesn't work
        try:
            AdminInvitationService._send_invitation_email(invitation)
            print(f"✅ {'Upgrade' if is_upgrade else 'New'} invitation created and email sent to {email}")
        except Exception as e:
            # Log the error but don't prevent invitation creation
            print(f"⚠️ Invitation created for {email} but email sending failed: {str(e)}")
            logger.error(f"Failed to send invitation email to {email}: {str(e)}")

        return invitation
    
    @staticmethod
    def accept_invitation(invitation_id, password):
        """
        Accept an invitation and create a user or upgrade existing user

        Handles two scenarios:
        1. New user invitation → create new ADMIN user
        2. Upgrade invitation → upgrade existing CLIENT to ADMIN and set password
        """
        import logging
        from core.utils.security_logging import SecurityLogger

        logger = logging.getLogger(__name__)
        security_logger = SecurityLogger()

        try:
            invitation = AdminInvitation.objects.get(id=invitation_id, is_accepted=False)
        except AdminInvitation.DoesNotExist:
            raise UserNotFound("Invitation not found or already accepted.")

        # Check if invitation is expired
        if invitation.is_expired():
            raise InvitationExpired()

        if invitation.is_upgrade and invitation.user:
            # Upgrade existing user scenario
            logger.info(f"Upgrading existing CLIENT user {invitation.email} to ADMIN")

            user = invitation.user
            old_role = user.role

            # Upgrade role and grant staff access
            user.role = 'ADMIN'
            user.is_staff = True
            user.set_password(password)

            # Apply permissions from invitation if specified
            if invitation.permissions:
                user.admin_permissions = invitation.permissions
                logger.info(f"Applied custom permissions to user {user.email}")

            user.save()

            # Log the role upgrade for security audit
            try:
                security_logger.log_event(
                    event_type='ROLE_UPGRADE',
                    description=f"User {user.email} upgraded from {old_role} to ADMIN",
                    user=user,
                    severity='MEDIUM',
                    details={
                        'old_role': old_role,
                        'new_role': 'ADMIN',
                        'invited_by': invitation.invited_by.email,
                        'invitation_id': str(invitation.id)
                    }
                )
            except Exception as log_error:
                logger.error(f"Failed to log role upgrade event: {str(log_error)}")

            # Invalidate user caches after role change
            try:
                from .cache_service import users_cache_service
                users_cache_service.invalidate_user_caches(
                    user_id=user.id,
                    email=user.email
                )
            except Exception as cache_error:
                logger.warning(f"Failed to invalidate user caches: {str(cache_error)}")

            logger.info(f"Successfully upgraded user {user.email} to ADMIN")

        else:
            # New user invitation scenario (existing behavior)
            logger.info(f"Creating new ADMIN user for {invitation.email}")

            user = User.objects.create_user(
                email=invitation.email,
                password=password,
                first_name=invitation.first_name,
                last_name=invitation.last_name,
                role='ADMIN',
                is_staff=True  # Admin users should have staff access
            )

            # Apply permissions from invitation if specified
            if invitation.permissions:
                user.admin_permissions = invitation.permissions
                user.save()
                logger.info(f"Applied custom permissions to new user {user.email}")

            logger.info(f"Successfully created new ADMIN user {user.email}")

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
        """
        Send invitation email using communication service

        Uses different email templates based on invitation type:
        - 'Admin Invitation' for new admin users
        - 'Admin Role Upgrade' for existing CLIENT users being upgraded to ADMIN
        """
        import logging

        logger = logging.getLogger(__name__)

        try:
            # Import here to avoid circular imports
            from core.domains.communications.services import CommunicationService
            from core.domains.communications.context_service import (
                CommunicationContextService, ContextType
            )

            communication_service = CommunicationService()

            # Generate context using the unified context service
            context_data = CommunicationContextService.generate_context(
                context_type=ContextType.ADMIN,
                admin_user=invitation.invited_by,
                invitation=invitation,
            )

            # Choose template based on invitation type
            if invitation.is_upgrade:
                template_name = 'Admin Role Upgrade'
                logger.info(f"Sending role upgrade email to {invitation.email}")
            else:
                template_name = 'Admin Invitation'
                logger.info(f"Sending new admin invitation email to {invitation.email}")

            # Send using communication service
            record = communication_service.send_communication(
                template_name=template_name,
                recipient=invitation.email,
                context_data=context_data,
                sent_by=invitation.invited_by
            )

            if record:
                print(f"✅ {template_name} email sent successfully via Brevo to {invitation.email}")
                print(f"   Record ID: {record.id}")
                print(f"   External ID: {record.external_message_id}")
                logger.info(f"{template_name} email sent to {invitation.email} - Record ID: {record.id}")
                return True
            else:
                error_msg = f"Communication service returned None - email not sent to {invitation.email}"
                print(f"❌ {error_msg}")
                logger.error(error_msg)
                raise Exception(error_msg)

        except ImportError:
            # Communications domain not available
            error_msg = f"Communications domain not available for {invitation.email}"
            print(f"❌ {error_msg}")
            logger.error(error_msg)
            raise Exception("Communications service not available")
        except Exception as e:
            # Re-raise the exception so the caller can handle it
            error_msg = f"Failed to send invitation via communication service: {str(e)}"
            print(f"❌ {error_msg}")
            logger.error(error_msg)
            raise e