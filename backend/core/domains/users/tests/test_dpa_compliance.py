"""
Tests for DPA (Data Privacy Act) compliance endpoints.

Tests Data Subject Rights:
- Right to Access (GET /me/data/)
- Right to Portability/Export (GET /me/export/)
- Right to Erasure/Deletion (DELETE /me/delete/)
- Right to Correction (PATCH /me/correct/)
- Right to Object (POST /me/object/)
"""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestDataAccess:
    """Tests for GET /api/users/me/data/ - Right to Access"""

    def test_data_access_success(self, authenticated_client, user_factory):
        """Test authenticated user can access their data report."""
        user = user_factory(
            email='test@example.com',
            first_name='John',
            last_name='Doe'
        )
        client = authenticated_client(user=user)

        url = reverse('users:data-access')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'personal_data' in response.data
        assert 'request_id' in response.data
        assert response.data['data_subject']['email'] == 'test@example.com'
        assert response.data['personal_data']['account']['first_name'] == 'John'

    def test_data_access_includes_processing_purposes(self, authenticated_client, user_factory):
        """Test data access report includes processing purposes."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-access')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'processing_purposes' in response.data
        assert 'data_retention' in response.data
        assert 'third_party_sharing' in response.data

    def test_data_access_creates_privacy_request(self, authenticated_client, user_factory):
        """Test data access creates a privacy request record."""
        from core.domains.users.models import PrivacyRequest

        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-access')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Verify privacy request was created
        request = PrivacyRequest.objects.filter(user=user, request_type='ACCESS').first()
        assert request is not None
        assert request.status == 'COMPLETED'

    def test_data_access_unauthenticated(self, api_client):
        """Test data access requires authentication."""
        url = reverse('users:data-access')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestDataExport:
    """Tests for GET /api/users/me/export/ - Right to Portability"""

    def test_export_json_format(self, authenticated_client, user_factory):
        """Test exporting data in JSON format."""
        user = user_factory(email='export@example.com')
        client = authenticated_client(user=user)

        url = reverse('users:data-export')
        response = client.get(url, {'export_format': 'json'})

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/json'
        assert 'attachment' in response['Content-Disposition']
        assert '.json' in response['Content-Disposition']

    def test_export_csv_format(self, authenticated_client, user_factory):
        """Test exporting data in CSV format."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-export')
        response = client.get(url, {'export_format': 'csv'})

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv'
        assert 'attachment' in response['Content-Disposition']
        assert '.csv' in response['Content-Disposition']

    def test_export_default_json(self, authenticated_client, user_factory):
        """Test export defaults to JSON format."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-export')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/json'

    def test_export_invalid_format(self, authenticated_client, user_factory):
        """Test export with invalid format returns error."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-export')
        response = client.get(url, {'export_format': 'xml'})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'format' in response.data.get('error', '').lower()

    def test_export_creates_privacy_request(self, authenticated_client, user_factory):
        """Test export creates a privacy request record."""
        from core.domains.users.models import PrivacyRequest

        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-export')
        client.get(url)

        request = PrivacyRequest.objects.filter(user=user, request_type='EXPORT').first()
        assert request is not None
        assert request.status == 'COMPLETED'

    def test_export_unauthenticated(self, api_client):
        """Test export requires authentication."""
        url = reverse('users:data-export')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestAccountDeletion:
    """Tests for DELETE /api/users/me/delete/ - Right to Erasure"""

    def test_deletion_success(self, authenticated_client, user_factory):
        """Test successful account deletion with proper confirmation."""
        user = user_factory(password='TestPass123!')
        client = authenticated_client(user=user)

        url = reverse('users:account-deletion')
        response = client.delete(url, {
            'confirmation': 'DELETE MY ACCOUNT',
            'password': 'TestPass123!'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'completed'
        assert 'actions' in response.data

        # Verify user was deactivated
        user.refresh_from_db()
        assert not user.is_active

    def test_deletion_wrong_confirmation(self, authenticated_client, user_factory):
        """Test deletion fails with wrong confirmation text."""
        user = user_factory(password='TestPass123!')
        client = authenticated_client(user=user)

        url = reverse('users:account-deletion')
        response = client.delete(url, {
            'confirmation': 'delete my account',  # lowercase
            'password': 'TestPass123!'
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'DELETE MY ACCOUNT' in response.data.get('error', '')

    def test_deletion_wrong_password(self, authenticated_client, user_factory):
        """Test deletion fails with wrong password."""
        user = user_factory(password='TestPass123!')
        client = authenticated_client(user=user)

        url = reverse('users:account-deletion')
        response = client.delete(url, {
            'confirmation': 'DELETE MY ACCOUNT',
            'password': 'WrongPassword!'
        }, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data.get('error', '').lower()

    def test_deletion_unauthenticated(self, api_client):
        """Test deletion requires authentication."""
        url = reverse('users:account-deletion')
        response = api_client.delete(url, {
            'confirmation': 'DELETE MY ACCOUNT',
            'password': 'TestPass123!'
        }, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestDataCorrection:
    """Tests for PATCH /api/users/me/correct/ - Right to Correction"""

    def test_correction_success(self, authenticated_client, user_factory):
        """Test successfully correcting user data."""
        user = user_factory(first_name='John')
        client = authenticated_client(user=user)

        url = reverse('users:data-correction')
        response = client.patch(url, {
            'corrections': [
                {
                    'field': 'first_name',
                    'current_value': 'John',
                    'corrected_value': 'Jonathan'
                }
            ]
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'completed'
        assert len(response.data['corrections_applied']) == 1

        # Verify correction was applied
        user.refresh_from_db()
        assert user.first_name == 'Jonathan'

    def test_correction_multiple_fields(self, authenticated_client, user_factory):
        """Test correcting multiple fields at once."""
        user = user_factory(first_name='John', last_name='Doe')
        client = authenticated_client(user=user)

        url = reverse('users:data-correction')
        response = client.patch(url, {
            'corrections': [
                {'field': 'first_name', 'current_value': 'John', 'corrected_value': 'Jane'},
                {'field': 'last_name', 'current_value': 'Doe', 'corrected_value': 'Smith'}
            ]
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['corrections_applied']) == 2

        user.refresh_from_db()
        assert user.first_name == 'Jane'
        assert user.last_name == 'Smith'

    def test_correction_non_correctable_field(self, authenticated_client, user_factory):
        """Test correcting non-correctable field is rejected."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-correction')
        response = client.patch(url, {
            'corrections': [
                {'field': 'role', 'current_value': 'CLIENT', 'corrected_value': 'ADMIN'}
            ]
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['corrections_rejected']) == 1
        assert len(response.data['corrections_applied']) == 0

    def test_correction_email_requires_verification(self, authenticated_client, user_factory):
        """Test email correction requires verification (pending state)."""
        user = user_factory(email='old@example.com')
        client = authenticated_client(user=user)

        url = reverse('users:data-correction')
        response = client.patch(url, {
            'corrections': [
                {'field': 'email', 'current_value': 'old@example.com', 'corrected_value': 'new@example.com'}
            ]
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['corrections_pending']) == 1
        assert 'verification' in response.data['corrections_pending'][0]['reason'].lower()

    def test_correction_no_corrections_provided(self, authenticated_client, user_factory):
        """Test error when no corrections provided."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-correction')
        response = client.patch(url, {'corrections': []}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_correction_creates_privacy_request(self, authenticated_client, user_factory):
        """Test correction creates a privacy request record."""
        from core.domains.users.models import PrivacyRequest

        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:data-correction')
        client.patch(url, {
            'corrections': [{'field': 'first_name', 'current_value': '', 'corrected_value': 'Updated'}]
        }, format='json')

        request = PrivacyRequest.objects.filter(user=user, request_type='CORRECTION').first()
        assert request is not None

    def test_correction_unauthenticated(self, api_client):
        """Test correction requires authentication."""
        url = reverse('users:data-correction')
        response = api_client.patch(url, {
            'corrections': [{'field': 'first_name', 'corrected_value': 'Test'}]
        }, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestProcessingObjection:
    """Tests for POST /api/users/me/object/ - Right to Object"""

    def test_objection_marketing(self, authenticated_client, user_factory):
        """Test objecting to marketing processing."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:processing-objection')
        response = client.post(url, {'objection_type': 'marketing'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'accepted'
        assert 'marketing_email' in response.data['changes_applied']
        assert response.data['changes_applied']['marketing_email'] is False

    def test_objection_analytics(self, authenticated_client, user_factory):
        """Test objecting to analytics processing."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:processing-objection')
        response = client.post(url, {'objection_type': 'analytics'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'accepted'
        assert 'analytics_tracking' in response.data['changes_applied']

    def test_objection_all_non_essential(self, authenticated_client, user_factory):
        """Test objecting to all non-essential processing."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:processing-objection')
        response = client.post(url, {'objection_type': 'all_non_essential'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'accepted'
        # Should disable marketing and analytics
        assert 'marketing_email' in response.data['changes_applied']
        assert 'analytics_tracking' in response.data['changes_applied']

    def test_objection_invalid_type(self, authenticated_client, user_factory):
        """Test objection with invalid type returns error."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:processing-objection')
        response = client.post(url, {'objection_type': 'invalid_type'}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_objection_cannot_object_to_essential(self, authenticated_client, user_factory):
        """Test that response includes what cannot be objected to."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:processing-objection')
        response = client.post(url, {'objection_type': 'marketing'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'cannot_object' in response.data
        assert len(response.data['cannot_object']) > 0  # Should list essential processing

    def test_objection_creates_privacy_request(self, authenticated_client, user_factory):
        """Test objection creates a privacy request record."""
        from core.domains.users.models import PrivacyRequest

        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse('users:processing-objection')
        client.post(url, {'objection_type': 'marketing'}, format='json')

        request = PrivacyRequest.objects.filter(user=user, request_type='OBJECTION').first()
        assert request is not None
        assert request.status == 'COMPLETED'

    def test_objection_unauthenticated(self, api_client):
        """Test objection requires authentication."""
        url = reverse('users:processing-objection')
        response = api_client.post(url, {'objection_type': 'marketing'}, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
