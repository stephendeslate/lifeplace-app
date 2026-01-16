"""
Unit tests for users domain services.

Tests:
- UserService: CRUD operations, token generation
- AdminInvitationService: invitation creation, acceptance, upgrade flow
"""

import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time

from core.domains.users.services import UserService, AdminInvitationService
from core.domains.users.exceptions import (
    EmailAlreadyExists,
    UserNotFound,
    InvitationExpired,
    UserAlreadyAdmin,
)

User = get_user_model()


@pytest.mark.django_db
class TestUserService:
    """Tests for UserService."""

    def test_create_user_success(self):
        """Test creating a user through the service."""
        user_data = {
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'first_name': 'New',
            'last_name': 'User',
        }

        user = UserService.create_user(user_data)

        assert user.email == 'newuser@example.com'
        assert user.first_name == 'New'
        assert user.last_name == 'User'
        assert user.check_password('newpass123')

    def test_create_user_with_profile(self):
        """Test creating a user with profile data."""
        user_data = {
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'first_name': 'New',
            'last_name': 'User',
            'profile': {
                'phone': '+1234567890',
                'company': 'Test Company',
            }
        }

        user = UserService.create_user(user_data)

        assert user.profile.phone == '+1234567890'
        assert user.profile.company == 'Test Company'

    def test_create_user_duplicate_email_raises_error(self, user_factory):
        """Test creating user with duplicate email raises EmailAlreadyExists."""
        user_factory(email='existing@example.com')

        with pytest.raises(EmailAlreadyExists):
            UserService.create_user({
                'email': 'existing@example.com',
                'password': 'testpass123'
            })

    def test_get_user_by_id_success(self, user_factory):
        """Test retrieving user by ID."""
        user = user_factory()

        retrieved = UserService.get_user_by_id(user.id)

        assert retrieved == user
        assert retrieved.email == user.email

    def test_get_user_by_id_not_found(self):
        """Test UserNotFound exception for non-existent user ID."""
        with pytest.raises(UserNotFound):
            UserService.get_user_by_id(99999)

    def test_get_user_by_email_success(self, user_factory):
        """Test retrieving user by email."""
        user = user_factory(email='test@example.com')

        retrieved = UserService.get_user_by_email('test@example.com')

        assert retrieved == user

    def test_get_user_by_email_not_found(self):
        """Test UserNotFound exception for non-existent email."""
        with pytest.raises(UserNotFound):
            UserService.get_user_by_email('nonexistent@example.com')

    def test_update_user_basic_fields(self, user_factory):
        """Test updating user's basic fields."""
        user = user_factory(first_name='Original')

        updated = UserService.update_user(user, {'first_name': 'Updated'})

        assert updated.first_name == 'Updated'

    def test_update_user_password(self, user_factory):
        """Test updating user's password."""
        user = user_factory(password='oldpass123')

        UserService.update_user(user, {'password': 'newpass123'})

        user.refresh_from_db()
        assert user.check_password('newpass123')
        assert not user.check_password('oldpass123')

    def test_update_user_profile(self, user_factory):
        """Test updating user's profile through service."""
        user = user_factory()

        UserService.update_user(user, {
            'profile': {
                'phone': '+9876543210',
                'company': 'New Company'
            }
        })

        user.refresh_from_db()
        assert user.profile.phone == '+9876543210'
        assert user.profile.company == 'New Company'

    def test_delete_user_soft_deletes(self, user_factory):
        """Test deleting user sets is_active to False (soft delete)."""
        user = user_factory()
        assert user.is_active

        result = UserService.delete_user(user)

        assert result is True
        user.refresh_from_db()
        assert not user.is_active

    def test_get_tokens_for_user(self, user_factory):
        """Test JWT token generation for user."""
        user = user_factory()

        tokens = UserService.get_tokens_for_user(user)

        assert 'access' in tokens
        assert 'refresh' in tokens
        assert len(tokens['access']) > 0
        assert len(tokens['refresh']) > 0

    def test_get_tokens_with_remember_me(self, user_factory):
        """Test JWT token generation with remember_me extends lifetime."""
        user = user_factory()

        tokens = UserService.get_tokens_for_user(user, remember_me=True)

        # Tokens should still be generated (lifetime is extended internally)
        assert 'access' in tokens
        assert 'refresh' in tokens

    def test_get_users_returns_all(self, user_factory):
        """Test get_users returns all users when no search query."""
        user_factory.create_batch(5)

        users = UserService.get_users()

        assert users.count() >= 5

    def test_get_users_with_search_email(self, user_factory):
        """Test get_users filters by email."""
        user_factory(email='searchable@example.com')
        user_factory(email='other@example.com')

        users = UserService.get_users(search_query='searchable')

        assert users.count() == 1
        assert users.first().email == 'searchable@example.com'

    def test_get_users_with_search_name(self, user_factory):
        """Test get_users filters by first/last name."""
        user_factory(first_name='Searchable', last_name='User')
        user_factory(first_name='Other', last_name='Person')

        users = UserService.get_users(search_query='Searchable')

        assert users.count() == 1
        assert users.first().first_name == 'Searchable'


@pytest.mark.django_db
class TestAdminInvitationService:
    """Tests for AdminInvitationService."""

    @patch.object(AdminInvitationService, '_send_invitation_email')
    def test_create_invitation_for_new_user(self, mock_send_email, user_factory):
        """Test creating invitation for a new user (email doesn't exist)."""
        admin = user_factory(admin=True)

        invitation = AdminInvitationService.create_invitation(
            email='newinvite@example.com',
            first_name='New',
            last_name='Invite',
            invited_by=admin
        )

        assert invitation.email == 'newinvite@example.com'
        assert invitation.first_name == 'New'
        assert invitation.last_name == 'Invite'
        assert not invitation.is_upgrade
        assert invitation.user is None
        mock_send_email.assert_called_once()

    @patch.object(AdminInvitationService, '_send_invitation_email')
    def test_create_invitation_for_existing_client(self, mock_send_email, user_factory):
        """Test creating upgrade invitation for existing CLIENT user."""
        admin = user_factory(admin=True)
        client = user_factory(role='CLIENT', email='client@example.com')

        invitation = AdminInvitationService.create_invitation(
            email='client@example.com',
            first_name='Client',
            last_name='User',
            invited_by=admin
        )

        assert invitation.is_upgrade
        assert invitation.user == client
        mock_send_email.assert_called_once()

    @patch.object(AdminInvitationService, '_send_invitation_email')
    def test_create_invitation_for_existing_admin_raises_error(
        self, mock_send_email, user_factory
    ):
        """Test creating invitation for existing ADMIN raises UserAlreadyAdmin."""
        admin = user_factory(admin=True)
        existing_admin = user_factory(admin=True, email='existingadmin@example.com')

        with pytest.raises(UserAlreadyAdmin):
            AdminInvitationService.create_invitation(
                email='existingadmin@example.com',
                first_name='Existing',
                last_name='Admin',
                invited_by=admin
            )

        mock_send_email.assert_not_called()

    @patch.object(AdminInvitationService, '_send_invitation_email')
    def test_create_invitation_with_permissions(self, mock_send_email, user_factory):
        """Test creating invitation with specific permissions."""
        admin = user_factory(admin=True)

        permissions = {
            'can_manage_company_settings': True,
            'can_manage_workflows': True,
        }

        invitation = AdminInvitationService.create_invitation(
            email='newinvite@example.com',
            first_name='New',
            last_name='Invite',
            invited_by=admin,
            permissions=permissions
        )

        assert invitation.permissions.get('can_manage_company_settings') is True
        assert invitation.permissions.get('can_manage_workflows') is True

    @patch.object(AdminInvitationService, '_send_invitation_email')
    def test_create_invitation_replaces_existing_pending(
        self, mock_send_email, user_factory, admin_invitation_factory
    ):
        """Test creating invitation deletes existing pending invitation."""
        admin = user_factory(admin=True)
        # Create existing pending invitation
        old_invitation = admin_invitation_factory(
            email='invite@example.com',
            invited_by=admin
        )
        old_id = old_invitation.id

        # Create new invitation for same email
        new_invitation = AdminInvitationService.create_invitation(
            email='invite@example.com',
            first_name='New',
            last_name='Name',
            invited_by=admin
        )

        # Old invitation should be deleted
        from core.domains.users.models import AdminInvitation
        assert not AdminInvitation.objects.filter(id=old_id).exists()
        assert new_invitation.id != old_id

    def test_accept_invitation_creates_new_admin(self, admin_invitation_factory):
        """Test accepting invitation creates new admin user."""
        invitation = admin_invitation_factory(
            email='newinvite@example.com',
            first_name='New',
            last_name='Admin'
        )

        user = AdminInvitationService.accept_invitation(
            invitation_id=invitation.id,
            password='newpassword123'
        )

        assert user.email == 'newinvite@example.com'
        assert user.role == 'ADMIN'
        assert user.is_staff
        assert user.check_password('newpassword123')

        invitation.refresh_from_db()
        assert invitation.is_accepted

    def test_accept_upgrade_invitation(self, admin_invitation_factory, user_factory):
        """Test accepting upgrade invitation upgrades CLIENT to ADMIN."""
        client = user_factory(role='CLIENT', email='client@example.com')
        invitation = admin_invitation_factory(
            email='client@example.com',
            is_upgrade=True,
            user=client
        )

        user = AdminInvitationService.accept_invitation(
            invitation_id=invitation.id,
            password='newpassword123'
        )

        assert user.id == client.id  # Same user
        assert user.role == 'ADMIN'
        assert user.is_staff
        assert user.check_password('newpassword123')

    def test_accept_invitation_applies_permissions(self, admin_invitation_factory):
        """Test accepted invitation applies permissions to user."""
        invitation = admin_invitation_factory(
            permissions={
                'can_manage_company_settings': True,
                'can_manage_admins': False,
            }
        )

        user = AdminInvitationService.accept_invitation(
            invitation_id=invitation.id,
            password='newpassword123'
        )

        assert user.admin_permissions.get('can_manage_company_settings') is True
        assert user.admin_permissions.get('can_manage_admins') is False

    def test_accept_expired_invitation_raises_error(self, admin_invitation_factory):
        """Test accepting expired invitation raises InvitationExpired."""
        invitation = admin_invitation_factory(expired=True)

        with pytest.raises(InvitationExpired):
            AdminInvitationService.accept_invitation(
                invitation_id=invitation.id,
                password='password123'
            )

    def test_accept_already_accepted_invitation_raises_error(
        self, admin_invitation_factory
    ):
        """Test accepting already accepted invitation raises error."""
        invitation = admin_invitation_factory(accepted=True)

        with pytest.raises(UserNotFound):
            AdminInvitationService.accept_invitation(
                invitation_id=invitation.id,
                password='password123'
            )

    def test_accept_nonexistent_invitation_raises_error(self):
        """Test accepting non-existent invitation raises UserNotFound."""
        import uuid
        fake_id = uuid.uuid4()

        with pytest.raises(UserNotFound):
            AdminInvitationService.accept_invitation(
                invitation_id=fake_id,
                password='password123'
            )

    def test_get_invitation_by_id_success(self, admin_invitation_factory):
        """Test retrieving invitation by ID."""
        invitation = admin_invitation_factory()

        retrieved = AdminInvitationService.get_invitation_by_id(invitation.id)

        assert retrieved == invitation

    def test_get_invitation_by_id_not_found(self):
        """Test UserNotFound for non-existent invitation."""
        import uuid
        fake_id = uuid.uuid4()

        with pytest.raises(UserNotFound, match='Invitation not found'):
            AdminInvitationService.get_invitation_by_id(fake_id)
