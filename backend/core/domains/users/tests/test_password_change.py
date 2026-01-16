"""
Tests for change password functionality.

Tests:
- Authenticated user can change password with correct current password
- Fails with incorrect current password
- Fails with mismatched new passwords
- Fails with weak password
- Requires authentication
"""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestChangePassword:
    """Tests for POST /api/users/me/change-password/"""

    def test_change_password_success(self, authenticated_client, user_factory):
        """Test successfully changing password with valid current password."""
        user = user_factory(password='OldPass123!')
        client = authenticated_client(user=user)

        url = reverse('users:change_password')
        response = client.post(url, {
            'current_password': 'OldPass123!',
            'new_password': 'NewStrongPass123!',
            'confirm_password': 'NewStrongPass123!'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'successfully' in response.data['detail'].lower()

        # Verify password was changed
        user.refresh_from_db()
        assert user.check_password('NewStrongPass123!')
        assert not user.check_password('OldPass123!')

    def test_change_password_wrong_current(self, authenticated_client, user_factory):
        """Test change password fails with incorrect current password."""
        user = user_factory(password='OldPass123!')
        client = authenticated_client(user=user)

        url = reverse('users:change_password')
        response = client.post(url, {
            'current_password': 'WrongPassword!',
            'new_password': 'NewStrongPass123!',
            'confirm_password': 'NewStrongPass123!'
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'incorrect' in response.data['detail'].lower()

        # Verify password was NOT changed
        user.refresh_from_db()
        assert user.check_password('OldPass123!')

    def test_change_password_mismatch(self, authenticated_client, user_factory):
        """Test change password fails when new passwords don't match."""
        user = user_factory(password='OldPass123!')
        client = authenticated_client(user=user)

        url = reverse('users:change_password')
        response = client.post(url, {
            'current_password': 'OldPass123!',
            'new_password': 'NewStrongPass123!',
            'confirm_password': 'DifferentPass123!'
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'confirm_password' in response.data or 'match' in str(response.data).lower()

    def test_change_password_weak_password(self, authenticated_client, user_factory):
        """Test change password fails with weak new password."""
        user = user_factory(password='OldPass123!')
        client = authenticated_client(user=user)

        url = reverse('users:change_password')
        response = client.post(url, {
            'current_password': 'OldPass123!',
            'new_password': '123',
            'confirm_password': '123'
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Should have password validation errors
        assert 'new_password' in response.data or 'password' in str(response.data).lower()

    def test_change_password_unauthenticated(self, api_client):
        """Test change password requires authentication."""
        url = reverse('users:change_password')
        response = api_client.post(url, {
            'current_password': 'OldPass123!',
            'new_password': 'NewStrongPass123!',
            'confirm_password': 'NewStrongPass123!'
        }, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_change_password_missing_fields(self, authenticated_client, user_factory):
        """Test change password fails with missing fields."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:change_password')

        # Missing current_password
        response = client.post(url, {
            'new_password': 'NewStrongPass123!',
            'confirm_password': 'NewStrongPass123!'
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Missing new_password
        response = client.post(url, {
            'current_password': 'testpass123',
            'confirm_password': 'NewStrongPass123!'
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Missing confirm_password
        response = client.post(url, {
            'current_password': 'testpass123',
            'new_password': 'NewStrongPass123!'
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
