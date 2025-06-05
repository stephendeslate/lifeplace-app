# backend/core/domains/users/tests.py
import uuid
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .exceptions import (
    EmailAlreadyExists,
    InvitationAlreadyAccepted,
    InvitationExpired,
    InvalidCredentials,
    UserNotFound,
)
from .models import AdminInvitation, User, UserProfile
from .services import AdminInvitationService, UserService

User = get_user_model()

# Frontend Architecture Notes:
# ADMIN_FRONTEND_URL = admin-crm React app (http://localhost:5173)
# CLIENT_FRONTEND_URL = client-portal React app (http://localhost:5174)
# These are NOT Django admin URLs - they're your React applications


class UserModelTests(TestCase):
    """Test User model functionality"""
    
    def setUp(self):
        self.user_data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
    
    def test_create_user(self):
        """Test creating a regular user"""
        user = User.objects.create_user(**self.user_data)
        
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.role, 'CLIENT')
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password('testpass123'))
        self.assertIsNone(user.username)
    
    def test_create_superuser(self):
        """Test creating a superuser"""
        admin = User.objects.create_superuser(**self.user_data)
        
        self.assertEqual(admin.email, 'test@example.com')
        self.assertEqual(admin.role, 'ADMIN')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
    
    def test_create_user_without_email_raises_error(self):
        """Test that creating user without email raises ValueError"""
        with self.assertRaises(ValueError):
            User.objects.create_user(email='', password='testpass123')
    
    def test_user_string_representation(self):
        """Test user string representation"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(str(user), 'test@example.com')
    
    def test_get_full_name(self):
        """Test get_full_name method"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.get_full_name(), 'Test User')
        
        # Test with only first name
        user.last_name = ''
        self.assertEqual(user.get_full_name(), 'Test')
    
    def test_get_display_name(self):
        """Test get_display_name method"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.get_display_name(), 'Test User')
        
        # Test with no names - should return email
        user.first_name = ''
        user.last_name = ''
        self.assertEqual(user.get_display_name(), 'test@example.com')


class UserProfileModelTests(TestCase):
    """Test UserProfile model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_profile_creation(self):
        """Test UserProfile creation via signal"""
        # Profile should be created automatically by signal
        self.assertTrue(hasattr(self.user, 'profile'))
        self.assertIsNotNone(self.user.profile)
        
        # Update the profile
        profile = self.user.profile
        profile.phone = '+1234567890'
        profile.company = 'Test Company'
        profile.save()
        
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.phone, '+1234567890')
        self.assertEqual(profile.company, 'Test Company')
        self.assertEqual(str(profile), f'Profile for {self.user.email}')
    
    def test_profile_auto_creation_signal(self):
        """Test that profile is automatically created for new users"""
        new_user = User.objects.create_user(
            email='newuser@example.com',
            password='testpass123'
        )
        
        # Profile should be created automatically by signal
        self.assertTrue(hasattr(new_user, 'profile'))
        self.assertIsNotNone(new_user.profile)


class AdminInvitationModelTests(TestCase):
    """Test AdminInvitation model functionality"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role='ADMIN'
        )
    
    def test_admin_invitation_creation(self):
        """Test AdminInvitation creation"""
        invitation = AdminInvitation.objects.create(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user
        )
        
        self.assertEqual(invitation.email, 'invite@example.com')
        self.assertEqual(invitation.first_name, 'Invited')
        self.assertEqual(invitation.invited_by, self.admin_user)
        self.assertFalse(invitation.is_accepted)
        self.assertIsNotNone(invitation.expires_at)
        self.assertFalse(invitation.is_expired())
    
    def test_invitation_expiry(self):
        """Test invitation expiry functionality"""
        # Create expired invitation
        invitation = AdminInvitation.objects.create(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user,
            expires_at=timezone.now() - timedelta(days=1)
        )
        
        self.assertTrue(invitation.is_expired())
    
    def test_invitation_string_representation(self):
        """Test invitation string representation"""
        invitation = AdminInvitation.objects.create(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user
        )
        
        self.assertEqual(str(invitation), 'Invitation for invite@example.com')


class UserServiceTests(TestCase):
    """Test UserService functionality"""
    
    def setUp(self):
        self.user_data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        self.user = User.objects.create_user(**self.user_data)
    
    def test_get_users(self):
        """Test getting users list"""
        users = UserService.get_users()
        self.assertIn(self.user, users)
    
    def test_get_users_with_search(self):
        """Test searching users"""
        # Create another user
        User.objects.create_user(
            email='another@example.com',
            first_name='Another',
            last_name='Person'
        )
        
        # Search by email
        users = UserService.get_users(search_query='test@')
        self.assertEqual(users.count(), 1)
        self.assertEqual(users.first(), self.user)
        
        # Search by name
        users = UserService.get_users(search_query='Test')
        self.assertEqual(users.count(), 1)
    
    def test_get_user_by_id(self):
        """Test getting user by ID"""
        retrieved_user = UserService.get_user_by_id(self.user.id)
        self.assertEqual(retrieved_user, self.user)
    
    def test_get_user_by_id_not_found(self):
        """Test getting non-existent user by ID raises exception"""
        with self.assertRaises(UserNotFound):
            UserService.get_user_by_id(99999)
    
    def test_get_user_by_email(self):
        """Test getting user by email"""
        retrieved_user = UserService.get_user_by_email(self.user.email)
        self.assertEqual(retrieved_user, self.user)
    
    def test_get_user_by_email_not_found(self):
        """Test getting non-existent user by email raises exception"""
        with self.assertRaises(UserNotFound):
            UserService.get_user_by_email('nonexistent@example.com')
    
    def test_create_user(self):
        """Test creating user through service"""
        new_user_data = {
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'first_name': 'New',
            'last_name': 'User',
            'profile': {
                'phone': '+1234567890',
                'company': 'Test Company'
            }
        }
        
        user = UserService.create_user(new_user_data)
        
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertEqual(user.profile.phone, '+1234567890')
        self.assertEqual(user.profile.company, 'Test Company')
    
    def test_create_user_duplicate_email(self):
        """Test creating user with duplicate email raises exception"""
        with self.assertRaises(EmailAlreadyExists):
            UserService.create_user(self.user_data)
    
    def test_update_user(self):
        """Test updating user through service"""
        update_data = {
            'first_name': 'Updated',
            'profile': {
                'phone': '+9876543210'
            }
        }
        
        updated_user = UserService.update_user(self.user, update_data)
        
        self.assertEqual(updated_user.first_name, 'Updated')
        self.assertEqual(updated_user.profile.phone, '+9876543210')
    
    def test_delete_user(self):
        """Test soft deleting user"""
        result = UserService.delete_user(self.user)
        
        self.assertTrue(result)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
    
    def test_get_tokens_for_user(self):
        """Test JWT token generation"""
        tokens = UserService.get_tokens_for_user(self.user)
        
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)
        self.assertIsInstance(tokens['access'], str)
        self.assertIsInstance(tokens['refresh'], str)
    
    def test_get_tokens_for_user_remember_me(self):
        """Test JWT token generation with remember_me"""
        tokens = UserService.get_tokens_for_user(self.user, remember_me=True)
        
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)


@override_settings(ADMIN_FRONTEND_URL='http://localhost:5173')  # admin-crm React app
class AdminInvitationServiceTests(TestCase):
    """
    Test AdminInvitationService functionality
    
    Note: ADMIN_FRONTEND_URL points to the admin-crm React application,
    not Django's admin interface. Invitation emails will link to
    the React app where admins can accept invitations.
    """
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role='ADMIN'
        )
    
    @patch('core.domains.users.services.send_mail')
    def test_create_invitation(self, mock_send_mail):
        """Test creating admin invitation with email link to admin-crm React app"""
        invitation = AdminInvitationService.create_invitation(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user
        )
        
        self.assertEqual(invitation.email, 'invite@example.com')
        self.assertEqual(invitation.invited_by, self.admin_user)
        self.assertFalse(invitation.is_accepted)
        
        # Check that email was sent
        mock_send_mail.assert_called_once()
        
        # Verify the email content includes correct admin-crm URL
        call_args = mock_send_mail.call_args
        email_html = call_args[1]['html_message']  # Get the html_message from kwargs
        expected_url = f"http://localhost:5173/accept-invitation/{invitation.id}"
        self.assertIn(expected_url, email_html)
    
    def test_create_invitation_duplicate_email_user_exists(self):
        """Test creating invitation for existing user email"""
        User.objects.create_user(
            email='existing@example.com',
            password='testpass123'
        )
        
        with self.assertRaises(EmailAlreadyExists):
            AdminInvitationService.create_invitation(
                email='existing@example.com',
                first_name='Test',
                last_name='User',
                invited_by=self.admin_user
            )
    
    @patch('core.domains.users.services.send_mail')
    def test_create_invitation_replaces_existing(self, mock_send_mail):
        """Test creating invitation replaces existing pending invitation"""
        # Create first invitation
        AdminInvitation.objects.create(
            email='test@example.com',
            first_name='First',
            last_name='User',
            invited_by=self.admin_user
        )
        
        # Create second invitation for same email
        invitation = AdminInvitationService.create_invitation(
            email='test@example.com',
            first_name='Second',
            last_name='User',
            invited_by=self.admin_user
        )
        
        # Should only have one invitation
        invitations = AdminInvitation.objects.filter(email='test@example.com')
        self.assertEqual(invitations.count(), 1)
        self.assertEqual(invitations.first().first_name, 'Second')
        
        # Verify email contains correct admin-crm URL
        call_args = mock_send_mail.call_args
        email_html = call_args[1]['html_message']
        expected_url = f"http://localhost:5173/accept-invitation/{invitation.id}"
        self.assertIn(expected_url, email_html)
    
    def test_accept_invitation(self):
        """Test accepting invitation"""
        invitation = AdminInvitation.objects.create(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user
        )
        
        user = AdminInvitationService.accept_invitation(
            invitation.id,
            'newpassword123'
        )
        
        self.assertEqual(user.email, 'invite@example.com')
        self.assertEqual(user.role, 'ADMIN')
        self.assertTrue(user.is_staff)
        
        invitation.refresh_from_db()
        self.assertTrue(invitation.is_accepted)
    
    def test_accept_invitation_not_found(self):
        """Test accepting non-existent invitation"""
        with self.assertRaises(UserNotFound):
            AdminInvitationService.accept_invitation(
                uuid.uuid4(),
                'password123'
            )
    
    def test_accept_invitation_expired(self):
        """Test accepting expired invitation"""
        invitation = AdminInvitation.objects.create(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user,
            expires_at=timezone.now() - timedelta(days=1)
        )
        
        with self.assertRaises(InvitationExpired):
            AdminInvitationService.accept_invitation(
                invitation.id,
                'password123'
            )
    
    def test_get_invitation_by_id(self):
        """Test getting invitation by ID"""
        invitation = AdminInvitation.objects.create(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user
        )
        
        retrieved = AdminInvitationService.get_invitation_by_id(invitation.id)
        self.assertEqual(retrieved, invitation)
    
    def test_get_invitation_by_id_not_found(self):
        """Test getting non-existent invitation"""
        with self.assertRaises(UserNotFound):
            AdminInvitationService.get_invitation_by_id(uuid.uuid4())
    
    @patch('core.domains.users.services.send_mail')
    def test_invitation_email_contains_admin_crm_url(self, mock_send_mail):
        """Test that invitation emails contain correct admin-crm React app URL"""
        invitation = AdminInvitationService.create_invitation(
            email='test-url@example.com',
            first_name='URL',
            last_name='Test',
            invited_by=self.admin_user
        )
        
        # Verify email was sent
        mock_send_mail.assert_called_once()
        
        # Check the email content contains the correct admin-crm URL
        call_args = mock_send_mail.call_args
        email_html = call_args[1]['html_message']
        email_text = call_args[1]['message']
        
        expected_url = f"http://localhost:5173/accept-invitation/{invitation.id}"
        
        # URL should be in both HTML and plain text versions
        self.assertIn(expected_url, email_html)
        self.assertIn(expected_url, email_text)
        
        # Verify URL structure is correct for admin-crm React app
        self.assertIn('/accept-invitation/', expected_url)
        self.assertNotIn('/admin/', expected_url)  # Not Django admin
        self.assertTrue(expected_url.startswith('http://localhost:5173'))


class UserAPITests(APITestCase):
    """Test User API endpoints"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role='ADMIN',
            is_staff=True
        )
        self.client_user = User.objects.create_user(
            email='client@example.com',
            password='testpass123',
            role='CLIENT'
        )
    
    def get_admin_token(self):
        """Get JWT token for admin user"""
        refresh = RefreshToken.for_user(self.admin_user)
        return str(refresh.access_token)
    
    def get_client_token(self):
        """Get JWT token for client user"""
        refresh = RefreshToken.for_user(self.client_user)
        return str(refresh.access_token)
    
    def test_user_login(self):
        """Test user login endpoint"""
        url = reverse('users:login')
        data = {
            'email': 'admin@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
    
    def test_user_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        url = reverse('users:login')
        data = {
            'email': 'admin@example.com',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_client_register(self):
        """Test client registration endpoint"""
        url = reverse('users:client_register')
        data = {
            'email': 'newclient@example.com',
            'password': 'newpass123',
            'confirm_password': 'newpass123',
            'first_name': 'New',
            'last_name': 'Client',
            'profile': {
                'phone': '+1234567890',
                'company': 'Test Company'
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        
        # Verify user was created
        user = User.objects.get(email='newclient@example.com')
        self.assertEqual(user.role, 'CLIENT')
        self.assertEqual(user.profile.company, 'Test Company')
    
    def test_client_register_password_mismatch(self):
        """Test client registration with password mismatch"""
        url = reverse('users:client_register')
        data = {
            'email': 'newclient@example.com',
            'password': 'newpass123',
            'confirm_password': 'differentpass',
            'first_name': 'New',
            'last_name': 'Client'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_current_user_get(self):
        """Test getting current user info"""
        url = reverse('users:current_user')
        token = self.get_admin_token()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.admin_user.email)
    
    def test_current_user_update(self):
        """Test updating current user"""
        url = reverse('users:current_user')
        token = self.get_admin_token()
        data = {
            'first_name': 'Updated',
            'profile': {
                'phone': '+9876543210'
            }
        }
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')
    
    def test_user_list_admin_only(self):
        """Test user list endpoint requires admin permissions"""
        url = reverse('users:user_list_create')
        
        # Try with client token
        client_token = self.get_client_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {client_token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try with admin token
        admin_token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_user_detail_owner_or_admin(self):
        """Test user detail endpoint permissions"""
        url = reverse('users:user_detail', kwargs={'pk': self.client_user.id})
        
        # Client can access their own record
        client_token = self.get_client_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {client_token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Admin can access any record
        admin_token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_change_password(self):
        """Test password change endpoint"""
        url = reverse('users:change_password')
        token = self.get_admin_token()
        data = {
            'current_password': 'testpass123',
            'new_password': 'newpass456',
            'confirm_password': 'newpass456'
        }
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify password was changed
        self.admin_user.refresh_from_db()
        self.assertTrue(self.admin_user.check_password('newpass456'))
    
    def test_change_password_wrong_current(self):
        """Test password change with wrong current password"""
        url = reverse('users:change_password')
        token = self.get_admin_token()
        data = {
            'current_password': 'wrongpass',
            'new_password': 'newpass456',
            'confirm_password': 'newpass456'
        }
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AdminInvitationAPITests(APITestCase):
    """
    Test AdminInvitation API endpoints
    
    These endpoints handle the invitation workflow where:
    1. Admins create invitations via API (admin-crm → backend)
    2. Email sent with link to admin-crm React app
    3. Invitees accept via admin-crm interface
    """
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role='ADMIN',
            is_staff=True
        )
        self.client_user = User.objects.create_user(
            email='client@example.com',
            password='testpass123',
            role='CLIENT'
        )
    
    def get_admin_token(self):
        """Get JWT token for admin user"""
        refresh = RefreshToken.for_user(self.admin_user)
        return str(refresh.access_token)
    
    def get_client_token(self):
        """Get JWT token for client user"""
        refresh = RefreshToken.for_user(self.client_user)
        return str(refresh.access_token)
    
    @override_settings(ADMIN_FRONTEND_URL='http://localhost:5173')
    @patch('core.domains.users.services.send_mail')
    def test_create_invitation_admin_only(self, mock_send_mail):
        """Test creating invitation requires admin permissions"""
        url = reverse('users:invitation_list_create')
        data = {
            'email': 'invite@example.com',
            'first_name': 'Invited',
            'last_name': 'User'
        }
        
        # Try with client token
        client_token = self.get_client_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {client_token}')
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try with admin token
        admin_token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_send_mail.assert_called_once()
    
    def test_accept_invitation_public(self):
        """
        Test accepting invitation (public endpoint)
        
        This endpoint would be called by the admin-crm React app
        when an invited admin clicks the invitation link and 
        completes the signup form.
        """
        invitation = AdminInvitation.objects.create(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user
        )
        
        url = reverse('users:accept_invitation', kwargs={'invitation_id': invitation.id})
        data = {
            'password': 'newpass123',
            'confirm_password': 'newpass123'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        
        # Verify user was created
        user = User.objects.get(email='invite@example.com')
        self.assertEqual(user.role, 'ADMIN')
    
    def test_accept_invitation_password_mismatch(self):
        """Test accepting invitation with password mismatch"""
        invitation = AdminInvitation.objects.create(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=self.admin_user
        )
        
        url = reverse('users:accept_invitation', kwargs={'invitation_id': invitation.id})
        data = {
            'password': 'newpass123',
            'confirm_password': 'differentpass'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(ADMIN_FRONTEND_URL='http://localhost:5173')  # admin-crm React app
class IntegrationTests(TestCase):
    """
    Integration tests for complete user workflows
    
    Tests the full flow from backend API → email → admin-crm React app
    """
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role='ADMIN',
            is_staff=True
        )
    
    @patch('core.domains.users.services.send_mail')
    def test_complete_admin_invitation_workflow(self, mock_send_mail):
        """
        Test complete admin invitation and acceptance workflow
        
        Workflow:
        1. Admin creates invitation via admin-crm → backend API
        2. Backend sends email with link to admin-crm React app
        3. Invitee clicks link, goes to admin-crm signup page
        4. Invitee submits form → backend API accepts invitation
        5. New admin user created, can login to admin-crm
        """
        # Create invitation
        invitation = AdminInvitationService.create_invitation(
            email='newadmin@example.com',
            first_name='New',
            last_name='Admin',
            invited_by=self.admin_user
        )
        
        # Verify invitation was created and email sent
        self.assertFalse(invitation.is_accepted)
        mock_send_mail.assert_called_once()
        
        # Accept invitation
        user = AdminInvitationService.accept_invitation(
            invitation.id,
            'newpass123'
        )
        
        # Verify user creation and invitation status
        self.assertEqual(user.email, 'newadmin@example.com')
        self.assertEqual(user.role, 'ADMIN')
        self.assertTrue(user.is_staff)
        
        invitation.refresh_from_db()
        self.assertTrue(invitation.is_accepted)
        
        # Verify user can get tokens
        tokens = UserService.get_tokens_for_user(user)
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)
    
    def test_client_registration_workflow(self):
        """
        Test complete client registration workflow
        
        Workflow:
        1. Client visits client-portal React app
        2. Client fills registration form → backend API
        3. Backend creates client user account
        4. Client can login to client-portal for event registration
        """
        user_data = {
            'email': 'client@example.com',
            'password': 'clientpass123',
            'first_name': 'Test',
            'last_name': 'Client',
            'profile': {
                'phone': '+1234567890',
                'company': 'Client Company'
            }
        }
        
        # Create user
        user = UserService.create_user(user_data)
        
        # Verify user and profile creation
        self.assertEqual(user.email, 'client@example.com')
        self.assertEqual(user.role, 'CLIENT')
        self.assertEqual(user.profile.company, 'Client Company')
        
        # Verify tokens can be generated
        tokens = UserService.get_tokens_for_user(user)
        self.assertIn('access', tokens)
        
        # Verify user update
        update_data = {
            'first_name': 'Updated',
            'profile': {
                'phone': '+9876543210'
            }
        }
        
        updated_user = UserService.update_user(user, update_data)
        self.assertEqual(updated_user.first_name, 'Updated')
        self.assertEqual(updated_user.profile.phone, '+9876543210')


# Test runner command
if __name__ == '__main__':
    import django
    from django.test.utils import get_runner
    from django.conf import settings
    
    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["core.domains.users.tests"])

"""
LifePlace Frontend Architecture Reference:

admin-crm (http://localhost:5173)
├── Admin user management
├── Event management 
├── System configuration
├── Invitation acceptance flow
└── Analytics & reporting

client-portal (http://localhost:5174)  
├── Event browsing & registration
├── Client profile management
├── Booking history
├── Payment processing
└── Client authentication

Email flows:
- Admin invitations → admin-crm/accept-invitation/{uuid}
- Client password resets → client-portal/reset-password/{token}
- Event confirmations → client-portal/events/{event-id}
"""