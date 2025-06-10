# backend/core/domains/clients/services.py
import logging
import secrets
import uuid
from datetime import datetime, timedelta

from core.domains.communications.services import CommunicationService
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.template import Context, Template
from django.utils import timezone

from .exceptions import (
    ClientAlreadyActive,
    ClientDeactivationError,
    ClientInvitationError,
    ClientNotFound,
    EmailAlreadyExists,
)

User = get_user_model()
logger = logging.getLogger(__name__)

class ClientInvitationService:
    """Service for client invitations"""
    
    @staticmethod
    def send_client_invitation(client_id, invited_by_id):
        """
        Send invitation to a client who doesn't have an active account
        
        Args:
            client_id (int): ID of the client to invite
            invited_by_id (int): ID of the admin sending the invitation
            
        Returns:
            ClientInvitation: Created invitation
            
        Raises:
            ClientNotFound: If the client doesn't exist
            ClientAlreadyActive: If the client already has an active account
            ClientInvitationError: If there's an error sending the invitation
        """
        from .models import ClientInvitation

        # Get client user
        try:
            client = User.objects.get(id=client_id, role='CLIENT')
        except User.DoesNotExist:
            raise ClientNotFound()
        
        # FIXED: Check if client already has an account using the correct method
        if client.is_active and client.has_usable_password():
            raise ClientAlreadyActive(detail="Client already has an active account")
        
        # Get inviting admin
        try:
            invited_by = User.objects.get(id=invited_by_id, role='ADMIN')
        except User.DoesNotExist:
            logger.error(f"Admin with ID {invited_by_id} not found")
            raise ClientInvitationError(detail="Invalid admin ID")
    
    @staticmethod
    def get_invitation_by_id(invitation_id):
        """
        Get a client invitation by ID
        
        Args:
            invitation_id (str): ID of the invitation
            
        Returns:
            ClientInvitation: The invitation object
            
        Raises:
            ClientInvitationError: If the invitation doesn't exist or is expired
        """
        from .models import ClientInvitation
        
        try:
            invitation = ClientInvitation.objects.get(id=invitation_id)
        except ClientInvitation.DoesNotExist:
            raise ClientInvitationError(detail="Invitation not found")
        
        # Check if invitation is expired
        if invitation.is_expired():
            raise ClientInvitationError(detail="Invitation has expired")
        
        # Check if invitation is already accepted
        if invitation.is_accepted:
            raise ClientInvitationError(detail="Invitation has already been accepted")
            
        return invitation
    
    @staticmethod
    def accept_invitation(invitation_id, password):
        """
        Accept a client invitation and activate the account
        
        Args:
            invitation_id (str): ID of the invitation
            password (str): New password for the client account
            
        Returns:
            User: The activated client user
            
        Raises:
            ClientInvitationError: If there's an error accepting the invitation
        """
        with transaction.atomic():
            # Get invitation
            invitation = ClientInvitationService.get_invitation_by_id(invitation_id)
            
            # Activate the client account
            client = invitation.client
            client.is_active = True
            client.set_password(password)
            client.save()
            
            # Mark invitation as accepted
            invitation.is_accepted = True
            invitation.save()
            
            logger.info(f"Client account activated: {client.email}")
            return client
        
class ClientService:
    """Service for client operations"""
    
    @staticmethod
    def get_all_clients(search_query=None, is_active=None):
        """
        Get all clients with optional filtering
        
        Args:
            search_query (str, optional): Search term for filtering clients
            is_active (bool, optional): Filter by active status
            
        Returns:
            QuerySet: Filtered queryset of clients
        """
        # Filter users with CLIENT role
        queryset = User.objects.filter(role='CLIENT')
        
        # Apply additional filters if provided
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(profile__company__icontains=search_query) |
                Q(profile__phone__icontains=search_query)
            )
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
            
        return queryset.order_by('-date_joined')
    
    @staticmethod
    def get_client_by_id(client_id):
        """
        Get a client by ID
        
        Args:
            client_id (int): ID of the client
            
        Returns:
            User: Client user object
            
        Raises:
            ClientNotFound: If the client doesn't exist
        """
        try:
            return User.objects.get(id=client_id, role='CLIENT')
        except User.DoesNotExist:
            raise ClientNotFound()
    
    @staticmethod
    def create_client(client_data):
        """
        Create a new client
        
        Args:
            client_data (dict): Client data including profile information
            
        Returns:
            User: Created client user object
            
        Raises:
            EmailAlreadyExists: If a user with the email already exists
        """
        email = client_data.get('email')
        
        # Check if email exists
        if User.objects.filter(email=email).exists():
            raise EmailAlreadyExists()
        
        # Ensure role is CLIENT
        client_data['role'] = 'CLIENT'
        
        with transaction.atomic():
            # Extract profile data
            profile_data = client_data.pop('profile', {})
            password = client_data.pop('password', None)
            
            # REMOVED: Don't set is_active=False here automatically
            # The is_active field should be respected from the form data
            
            # Create user
            client = User.objects.create_user(**client_data)
            
            # FIXED: Handle password properly
            if password:
                # Set usable password
                client.set_password(password)
            else:
                # Set unusable password for clients without accounts
                client.set_unusable_password()
            
            client.save()
            
            # Update profile
            if hasattr(client, 'profile') and profile_data:
                for key, value in profile_data.items():
                    setattr(client.profile, key, value)
                client.profile.save()
            
            logger.info(f"Created new client: {client.email}")
            return client
    
    @staticmethod
    def update_client(client_id, client_data):
        """
        Update an existing client
        
        Args:
            client_id (int): ID of the client to update
            client_data (dict): Updated client data
            
        Returns:
            User: Updated client user object
            
        Raises:
            ClientNotFound: If the client doesn't exist
            EmailAlreadyExists: If the new email already exists for another user
        """
        client = ClientService.get_client_by_id(client_id)
        
        # Check if email exists and is not for this client
        email = client_data.get('email')
        if email and email != client.email and User.objects.filter(email=email).exists():
            raise EmailAlreadyExists()
        
        with transaction.atomic():
            # Extract profile data
            profile_data = client_data.pop('profile', {})
            password = client_data.pop('password', None)
            
            # Update user fields
            for key, value in client_data.items():
                setattr(client, key, value)
            
            # Update password if provided
            if password:
                client.set_password(password)
            
            client.save()
            
            # Update profile
            if hasattr(client, 'profile') and profile_data:
                for key, value in profile_data.items():
                    setattr(client.profile, key, value)
                client.profile.save()
            
            logger.info(f"Updated client: {client.email}")
            return client
    
    @staticmethod
    def deactivate_client(client_id):
        """
        Deactivate a client
        
        Args:
            client_id (int): ID of the client to deactivate
            
        Returns:
            bool: True if deactivation was successful
            
        Raises:
            ClientNotFound: If the client doesn't exist
            ClientDeactivationError: If the client has active events
        """
        client = ClientService.get_client_by_id(client_id)
        
        # Check if client has active events
        active_events = client.events.exclude(status='COMPLETED').exclude(status='CANCELLED')
        if active_events.exists():
            raise ClientDeactivationError(
                detail="Cannot deactivate client with active events. Please complete or cancel all events first."
            )
        
        client.is_active = False
        client.save()
        
        logger.info(f"Deactivated client: {client.email}")
        return True
    
    @staticmethod
    def get_client_events(client_id):
        """
        Get all events for a client
        
        Args:
            client_id (int): ID of the client
            
        Returns:
            QuerySet: Client's events
            
        Raises:
            ClientNotFound: If the client doesn't exist
        """
        client = ClientService.get_client_by_id(client_id)
        return client.events.all().order_by('-start_date')