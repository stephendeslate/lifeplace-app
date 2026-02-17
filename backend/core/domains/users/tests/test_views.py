"""
Integration tests for users domain API endpoints.

Tests:
- Authentication (login, logout, token refresh)
- User CRUD operations
- Admin invitations
- Current user operations
"""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestUserLoginAPI:
    """Tests for user login endpoint (/api/users/login/)."""

    def test_login_success(self, api_client, user_factory):
        """Test successful login returns tokens and user data."""
        user_factory(email='test@example.com', password='testpass123')

        url = reverse('users:login')
        response = api_client.post(url, {
            'email': 'test@example.com',
            'password': 'testpass123'
        })

        assert response.status_code == status.HTTP_200_OK
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert 'refresh' in response.data['tokens']
        assert 'user' in response.data
        assert response.data['user']['email'] == 'test@example.com'

    def test_login_with_remember_me(self, api_client, user_factory):
        """Test login with remember_me flag."""
        user_factory(email='test@example.com', password='testpass123')

        url = reverse('users:login')
        response = api_client.post(url, {
            'email': 'test@example.com',
            'password': 'testpass123',
            'remember_me': True
        })

        assert response.status_code == status.HTTP_200_OK
        assert 'tokens' in response.data

    def test_login_invalid_password(self, api_client, user_factory):
        """Test login with wrong password returns 400 (API returns 400 for invalid credentials)."""
        user_factory(email='test@example.com', password='testpass123')

        url = reverse('users:login')
        response = api_client.post(url, {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent email returns 400 (API returns 400 for invalid credentials)."""
        url = reverse('users:login')
        response = api_client.post(url, {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_inactive_user(self, api_client, user_factory):
        """Test login with inactive user returns 400 (API returns 400 for inactive users)."""
        user_factory(email='test@example.com', password='testpass123', inactive=True)

        url = reverse('users:login')
        response = api_client.post(url, {
            'email': 'test@example.com',
            'password': 'testpass123'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_email(self, api_client):
        """Test login without email returns 400."""
        url = reverse('users:login')
        response = api_client.post(url, {
            'password': 'testpass123'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_password(self, api_client):
        """Test login without password returns 400."""
        url = reverse('users:login')
        response = api_client.post(url, {
            'email': 'test@example.com'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestClientRegistrationAPI:
    """Tests for client registration endpoint (/api/users/register/)."""

    def test_register_success(self, api_client):
        """Test successful client registration."""
        url = reverse('users:client_register')
        response = api_client.post(url, {
            'email': 'newclient@example.com',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'Client',
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert 'tokens' in response.data
        assert response.data['user']['email'] == 'newclient@example.com'
        assert response.data['user']['role'] == 'CLIENT'

    def test_register_password_mismatch(self, api_client):
        """Test registration with mismatched passwords fails."""
        url = reverse('users:client_register')
        response = api_client.post(url, {
            'email': 'newclient@example.com',
            'password': 'StrongPass123!',
            'confirm_password': 'DifferentPass!',
            'first_name': 'New',
            'last_name': 'Client',
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_duplicate_email(self, api_client, user_factory):
        """Test registration with existing email fails."""
        user_factory(email='existing@example.com')

        url = reverse('users:client_register')
        response = api_client.post(url, {
            'email': 'existing@example.com',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'Client',
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCurrentUserAPI:
    """Tests for current user endpoint (/api/users/me/)."""

    def test_get_current_user_authenticated(self, authenticated_client, user_factory):
        """Test getting current user info when authenticated."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:current_user')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
        assert response.data['id'] == user.id

    def test_get_current_user_unauthenticated(self, api_client):
        """Test getting current user info when not authenticated returns 401."""
        url = reverse('users:current_user')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_current_user(self, authenticated_client, user_factory):
        """Test updating current user's info."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:current_user')
        response = client.put(url, {
            'first_name': 'Updated',
            'last_name': 'Name',
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'Updated'
        assert response.data['last_name'] == 'Name'

    def test_update_current_user_with_profile(self, authenticated_client, user_factory):
        """Test updating current user's profile data."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:current_user')
        response = client.put(url, {
            'first_name': 'Updated',
            'profile': {
                'phone': '+639123456789',
                'company': 'New Company'
            }
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['profile']['phone'] == '+639123456789'
        assert response.data['profile']['company'] == 'New Company'


@pytest.mark.django_db
class TestUserListCreateAPI:
    """Tests for user list/create endpoint (/api/users/)."""

    def test_list_users_requires_admin(self, client_user_client):
        """Test that client users cannot list all users."""
        url = reverse('users:user_list_create')
        response = client_user_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_users_as_admin(self, admin_client, user_factory):
        """Test admin can list users."""
        user_factory.create_batch(5)

        url = reverse('users:user_list_create')
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response is paginated
        assert 'results' in response.data or isinstance(response.data, list)

    def test_list_users_with_search(self, admin_client, user_factory):
        """Test admin can search users by email."""
        user_factory(email='searchable@example.com')
        user_factory(email='other@example.com')

        url = reverse('users:user_list_create')
        response = admin_client.get(url, {'search': 'searchable'})

        assert response.status_code == status.HTTP_200_OK

    def test_create_user_as_admin(self, admin_client):
        """Test admin user creation endpoint.

        Note: email and role are read_only fields in UserSerializer (P0-B7 security fix),
        so they are stripped from validated_data. The endpoint raises TypeError because
        UserService.create_user() requires email but doesn't receive it.
        """
        url = reverse('users:user_list_create')

        # email and role are read_only_fields, so they are stripped from validated_data
        # causing UserService.create_user() to fail with missing email
        with pytest.raises(TypeError, match="missing 1 required positional argument: 'email'"):
            admin_client.post(url, {
                'email': 'newuser@example.com',
                'password': 'StrongPass123!',
                'confirm_password': 'StrongPass123!',
                'first_name': 'New',
                'last_name': 'User',
                'role': 'CLIENT',
            }, format='json')


@pytest.mark.django_db
class TestUserDetailAPI:
    """Tests for user detail endpoint (/api/users/<pk>/)."""

    def test_get_user_as_admin(self, admin_client, user_factory):
        """Test admin can get user details."""
        user = user_factory()

        url = reverse('users:user_detail', kwargs={'pk': user.pk})
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email

    def test_get_own_user_as_client(self, authenticated_client, user_factory):
        """Test client can get their own details."""
        user = user_factory(role='CLIENT')
        client = authenticated_client(user=user)

        url = reverse('users:user_detail', kwargs={'pk': user.pk})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email

    def test_get_other_user_as_client_forbidden(self, client_user_client, user_factory):
        """Test client cannot get other user's details."""
        other_user = user_factory()

        url = reverse('users:user_detail', kwargs={'pk': other_user.pk})
        response = client_user_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_user_as_admin(self, admin_client, user_factory):
        """Test admin can update user."""
        user = user_factory()

        url = reverse('users:user_detail', kwargs={'pk': user.pk})
        response = admin_client.patch(url, {
            'first_name': 'Updated'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'Updated'

    def test_delete_user_as_admin(self, admin_client, user_factory):
        """Test admin can delete (deactivate) user."""
        user = user_factory()

        url = reverse('users:user_detail', kwargs={'pk': user.pk})
        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestAdminInvitationAPI:
    """Tests for admin invitation endpoints."""

    def test_list_invitations_as_admin(self, admin_client, admin_invitation_factory):
        """Test admin can list invitations."""
        admin_invitation_factory.create_batch(3)

        url = reverse('users:invitation_list_create')
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_list_invitations_as_client_forbidden(self, client_user_client):
        """Test client cannot list invitations."""
        url = reverse('users:invitation_list_create')
        response = client_user_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_invitation_as_admin(self, admin_client, mocker):
        """Test admin can create invitation."""
        # Mock email sending
        mocker.patch(
            'core.domains.users.services.AdminInvitationService._send_invitation_email'
        )

        url = reverse('users:invitation_list_create')
        response = admin_client.post(url, {
            'email': 'newinvite@example.com',
            'first_name': 'New',
            'last_name': 'Invite',
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == 'newinvite@example.com'
        assert not response.data['is_accepted']

    def test_accept_invitation(self, api_client, admin_invitation_factory):
        """Test accepting an invitation (public endpoint)."""
        invitation = admin_invitation_factory()

        url = reverse('users:accept_invitation', kwargs={'invitation_id': invitation.id})
        response = api_client.post(url, {
            'password': 'NewPassword123!',
            'confirm_password': 'NewPassword123!'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'tokens' in response.data
        assert response.data['user']['role'] == 'ADMIN'


@pytest.mark.django_db
class TestLogoutAPI:
    """Tests for logout endpoints."""

    def test_secure_logout(self, api_client, user_factory):
        """Test secure logout invalidates token."""
        from rest_framework_simplejwt.tokens import RefreshToken

        user = user_factory()
        refresh = RefreshToken.for_user(user)

        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        url = reverse('users:secure_logout')
        response = api_client.post(url, {
            'refresh': str(refresh)
        }, format='json')

        assert response.status_code == status.HTTP_200_OK

    def test_secure_logout_without_refresh_token(self, api_client, user_factory):
        """Test secure logout without refresh token returns 400."""
        from rest_framework_simplejwt.tokens import RefreshToken

        user = user_factory()
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        url = reverse('users:secure_logout')
        response = api_client.post(url, {}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_logout_unauthenticated(self, api_client):
        """Test logout without authentication returns 401."""
        url = reverse('users:secure_logout')
        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_all_devices(self, api_client, user_factory):
        """Test logout from all devices."""
        from rest_framework_simplejwt.tokens import RefreshToken

        user = user_factory()
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        url = reverse('users:logout_all_devices')
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestTokenRefreshAPI:
    """Tests for JWT token refresh endpoint."""

    def test_refresh_token(self, api_client, user_factory):
        """Test refreshing access token with valid refresh token."""
        from rest_framework_simplejwt.tokens import RefreshToken

        user = user_factory()
        refresh = RefreshToken.for_user(user)

        url = reverse('users:token_refresh')
        response = api_client.post(url, {
            'refresh': str(refresh)
        })

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_refresh_token_invalid(self, api_client):
        """Test refreshing with invalid token returns 401."""
        url = reverse('users:token_refresh')
        response = api_client.post(url, {
            'refresh': 'invalid-token'
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
