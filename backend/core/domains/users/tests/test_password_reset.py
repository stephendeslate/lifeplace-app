"""
Tests for password reset flow.

Tests:
- Request password reset (email validation, rate limiting, no info disclosure)
- Validate reset token (valid, expired, used, not found)
- Confirm password reset (password validation, token invalidation)
"""

from django.urls import reverse
from rest_framework import status

import pytest


@pytest.mark.django_db
class TestRequestPasswordReset:
    """Tests for POST /api/users/password-reset/request/"""

    def test_request_reset_with_valid_email(self, api_client, user_factory, mocker):
        """Test requesting password reset for existing user."""
        mocker.patch("django.core.mail.send_mail")
        user_factory(email="test@example.com")

        url = reverse("users:password_reset_request")
        response = api_client.post(url, {"email": "test@example.com"})

        assert response.status_code == status.HTTP_200_OK
        assert "password reset link has been sent" in response.data["detail"].lower()

    def test_request_reset_with_nonexistent_email(self, api_client):
        """Test requesting reset for non-existent email returns same response (no info disclosure)."""
        url = reverse("users:password_reset_request")
        response = api_client.post(url, {"email": "nonexistent@example.com"})

        # Should return 200 to not reveal whether email exists
        assert response.status_code == status.HTTP_200_OK
        assert "password reset link has been sent" in response.data["detail"].lower()

    def test_request_reset_with_invalid_email_format(self, api_client):
        """Test requesting reset with invalid email format."""
        url = reverse("users:password_reset_request")
        response = api_client.post(url, {"email": "not-an-email"})

        # Should return 200 to not reveal email format validation
        assert response.status_code == status.HTTP_200_OK

    def test_request_reset_without_email(self, api_client):
        """Test requesting reset without email field."""
        url = reverse("users:password_reset_request")
        response = api_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_request_reset_invalidates_previous_tokens(
        self, api_client, user_factory, password_reset_token_factory, mocker
    ):
        """Test that requesting new reset invalidates previous tokens."""
        mocker.patch("django.core.mail.send_mail")
        user = user_factory(email="test@example.com")
        old_token = password_reset_token_factory(user=user)

        url = reverse("users:password_reset_request")
        api_client.post(url, {"email": "test@example.com"})

        old_token.refresh_from_db()
        assert old_token.is_used  # Previous token should be invalidated


@pytest.mark.django_db
class TestValidateResetToken:
    """Tests for GET /api/users/password-reset/validate/<token_id>/"""

    def test_validate_valid_token(self, api_client, password_reset_token_factory):
        """Test validating a valid (unused, not expired) token."""
        token = password_reset_token_factory()

        url = reverse("users:password_reset_validate", kwargs={"token_id": token.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["valid"] is True
        assert response.data["email"] == token.user.email

    def test_validate_expired_token(self, api_client, password_reset_token_factory):
        """Test validating an expired token."""
        token = password_reset_token_factory(expired=True)

        url = reverse("users:password_reset_validate", kwargs={"token_id": token.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["valid"] is False
        assert response.data["reason"] == "expired"

    def test_validate_used_token(self, api_client, password_reset_token_factory):
        """Test validating an already used token."""
        token = password_reset_token_factory(used=True)

        url = reverse("users:password_reset_validate", kwargs={"token_id": token.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["valid"] is False
        assert response.data["reason"] == "already_used"

    def test_validate_nonexistent_token(self, api_client):
        """Test validating a token that doesn't exist."""
        import uuid

        fake_id = uuid.uuid4()

        url = reverse("users:password_reset_validate", kwargs={"token_id": fake_id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["valid"] is False
        assert response.data["reason"] == "not_found"


@pytest.mark.django_db
class TestConfirmPasswordReset:
    """Tests for POST /api/users/password-reset/confirm/<token_id>/"""

    def test_confirm_reset_success(self, api_client, password_reset_token_factory):
        """Test successfully resetting password with valid token."""
        token = password_reset_token_factory()
        user = token.user

        url = reverse("users:password_reset_confirm", kwargs={"token_id": token.id})
        response = api_client.post(url, {"password": "NewStrongPass123!", "confirm_password": "NewStrongPass123!"})

        assert response.status_code == status.HTTP_200_OK
        assert "successfully" in response.data["detail"].lower()

        # Verify password was changed
        user.refresh_from_db()
        assert user.check_password("NewStrongPass123!")

        # Verify token was marked as used
        token.refresh_from_db()
        assert token.is_used

    def test_confirm_reset_password_mismatch(self, api_client, password_reset_token_factory):
        """Test reset fails when passwords don't match."""
        token = password_reset_token_factory()

        url = reverse("users:password_reset_confirm", kwargs={"token_id": token.id})
        response = api_client.post(url, {"password": "NewStrongPass123!", "confirm_password": "DifferentPass123!"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "match" in response.data["detail"].lower()

    def test_confirm_reset_weak_password(self, api_client, password_reset_token_factory):
        """Test reset fails with weak password."""
        token = password_reset_token_factory()

        url = reverse("users:password_reset_confirm", kwargs={"token_id": token.id})
        response = api_client.post(url, {"password": "123", "confirm_password": "123"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_feedback" in response.data or "security" in response.data.get("detail", "").lower()

    def test_confirm_reset_expired_token(self, api_client, password_reset_token_factory):
        """Test reset fails with expired token."""
        token = password_reset_token_factory(expired=True)

        url = reverse("users:password_reset_confirm", kwargs={"token_id": token.id})
        response = api_client.post(url, {"password": "NewStrongPass123!", "confirm_password": "NewStrongPass123!"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in response.data["detail"].lower()

    def test_confirm_reset_used_token(self, api_client, password_reset_token_factory):
        """Test reset fails with already used token."""
        token = password_reset_token_factory(used=True)

        url = reverse("users:password_reset_confirm", kwargs={"token_id": token.id})
        response = api_client.post(url, {"password": "NewStrongPass123!", "confirm_password": "NewStrongPass123!"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already been used" in response.data["detail"].lower()

    def test_confirm_reset_nonexistent_token(self, api_client):
        """Test reset fails with non-existent token."""
        import uuid

        fake_id = uuid.uuid4()

        url = reverse("users:password_reset_confirm", kwargs={"token_id": fake_id})
        response = api_client.post(url, {"password": "NewStrongPass123!", "confirm_password": "NewStrongPass123!"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_reset_missing_password(self, api_client, password_reset_token_factory):
        """Test reset fails without password fields."""
        token = password_reset_token_factory()

        url = reverse("users:password_reset_confirm", kwargs={"token_id": token.id})
        response = api_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
