"""
Unit tests for communications providers.

Tests:
- CommunicationProvider (abstract base class)
- MockProvider (development/testing provider)
- BrevoProvider (production email/SMS provider)
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from django.conf import settings
from django.utils import timezone

from core.domains.communications.providers import (
    CommunicationProvider,
    MockProvider,
    BrevoProvider,
)
from core.domains.communications.exceptions import CommunicationProviderError


class TestCommunicationProviderInterface:
    """Tests for CommunicationProvider abstract interface."""

    def test_provider_is_abstract(self):
        """Test CommunicationProvider cannot be instantiated directly."""
        with pytest.raises(TypeError):
            CommunicationProvider()

    def test_provider_requires_send_email(self):
        """Test subclasses must implement send_email."""
        class IncompleteProvider(CommunicationProvider):
            def send_sms(self, recipient, body, **kwargs):
                pass

            def get_delivery_status(self, message_id):
                pass

        with pytest.raises(TypeError):
            IncompleteProvider()

    def test_provider_requires_send_sms(self):
        """Test subclasses must implement send_sms."""
        class IncompleteProvider(CommunicationProvider):
            def send_email(self, recipient, subject, body, **kwargs):
                pass

            def get_delivery_status(self, message_id):
                pass

        with pytest.raises(TypeError):
            IncompleteProvider()

    def test_provider_requires_get_delivery_status(self):
        """Test subclasses must implement get_delivery_status."""
        class IncompleteProvider(CommunicationProvider):
            def send_email(self, recipient, subject, body, **kwargs):
                pass

            def send_sms(self, recipient, body, **kwargs):
                pass

        with pytest.raises(TypeError):
            IncompleteProvider()


class TestMockProvider:
    """Tests for MockProvider."""

    def test_mock_provider_instantiation(self):
        """Test MockProvider can be instantiated."""
        provider = MockProvider()
        assert provider is not None

    def test_send_email_returns_message_id(self):
        """Test send_email returns a mock message ID."""
        provider = MockProvider()

        message_id = provider.send_email(
            recipient='test@example.com',
            subject='Test Subject',
            body='<p>Test Body</p>',
        )

        assert message_id is not None
        assert 'mock_email_' in message_id

    def test_send_email_message_id_is_unique(self):
        """Test each send_email call returns unique message ID."""
        provider = MockProvider()

        message_id1 = provider.send_email(
            recipient='test1@example.com',
            subject='Subject 1',
            body='Body 1',
        )
        message_id2 = provider.send_email(
            recipient='test2@example.com',
            subject='Subject 2',
            body='Body 2',
        )

        assert message_id1 != message_id2

    def test_send_sms_returns_message_id(self):
        """Test send_sms returns a mock message ID."""
        provider = MockProvider()

        message_id = provider.send_sms(
            recipient='+1234567890',
            body='Test SMS message',
        )

        assert message_id is not None
        assert 'mock_sms_' in message_id

    def test_send_sms_truncates_body_in_log(self):
        """Test send_sms handles long message bodies."""
        provider = MockProvider()

        long_body = 'A' * 100
        message_id = provider.send_sms(
            recipient='+1234567890',
            body=long_body,
        )

        assert message_id is not None

    def test_get_delivery_status_returns_delivered(self):
        """Test get_delivery_status always returns DELIVERED for mock."""
        provider = MockProvider()

        status = provider.get_delivery_status('mock_email_123')

        assert status == 'DELIVERED'

    def test_html_to_text_conversion(self):
        """Test _html_to_text removes HTML tags."""
        provider = MockProvider()

        html = '<p>Hello <strong>World</strong>!</p>'
        text = provider._html_to_text(html)

        assert '<p>' not in text
        assert '<strong>' not in text
        assert 'Hello' in text
        assert 'World' in text

    def test_html_to_text_handles_entities(self):
        """Test _html_to_text handles HTML entities."""
        provider = MockProvider()

        html = '&lt;script&gt;alert()&lt;/script&gt;'
        text = provider._html_to_text(html)

        assert '<script>' in text  # Unescaped

    @patch('django.core.mail.send_mail')
    def test_send_email_uses_django_backend_when_configured(self, mock_send_mail, settings):
        """Test send_email uses Django email backend when configured."""
        settings.EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
        provider = MockProvider()

        provider.send_email(
            recipient='test@example.com',
            subject='Test Subject',
            body='<p>Test Body</p>',
        )

        mock_send_mail.assert_called_once()


@pytest.mark.django_db
class TestBrevoProvider:
    """Tests for BrevoProvider."""

    def test_brevo_provider_instantiation(self):
        """Test BrevoProvider can be instantiated."""
        provider = BrevoProvider()
        assert provider is not None

    def test_brevo_provider_warns_without_api_key(self, caplog):
        """Test BrevoProvider logs warning without API key."""
        with patch.object(settings, 'BREVO_API_KEY', None):
            provider = BrevoProvider()
            # Should log warning about missing API key

    @patch('requests.post')
    def test_send_email_success(self, mock_post):
        """Test successful email sending via Brevo."""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {'messageId': '<msg_123@brevo.com>'}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"messageId": "<msg_123@brevo.com>"}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        message_id = provider.send_email(
            recipient='test@example.com',
            subject='Test Subject',
            body='<p>Test Body</p>',
        )

        assert message_id == '<msg_123@brevo.com>'
        mock_post.assert_called_once()

    @patch('requests.post')
    def test_send_email_with_sender_info(self, mock_post):
        """Test email sending includes sender information."""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {'messageId': '<msg_456@brevo.com>'}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"messageId": "<msg_456@brevo.com>"}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        provider.send_email(
            recipient='test@example.com',
            subject='Test Subject',
            body='<p>Test Body</p>',
            sender_email='sender@example.com',
            sender_name='Custom Sender',
        )

        call_args = mock_post.call_args
        request_data = call_args[1]['json']
        assert request_data['sender']['email'] == 'sender@example.com'
        assert request_data['sender']['name'] == 'Custom Sender'

    @patch('requests.post')
    def test_send_email_with_reply_to(self, mock_post):
        """Test email sending includes reply-to header."""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {'messageId': '<msg_789@brevo.com>'}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"messageId": "<msg_789@brevo.com>"}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        provider.send_email(
            recipient='test@example.com',
            subject='Test Subject',
            body='<p>Test Body</p>',
            reply_to='reply@example.com',
        )

        call_args = mock_post.call_args
        request_data = call_args[1]['json']
        assert 'replyTo' in request_data
        assert request_data['replyTo']['email'] == 'reply@example.com'

    @patch('requests.post')
    def test_send_email_failure_raises_error(self, mock_post):
        """Test email sending failure raises CommunicationProviderError."""
        import requests
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError()
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        with pytest.raises(CommunicationProviderError):
            provider.send_email(
                recipient='test@example.com',
                subject='Test Subject',
                body='<p>Test Body</p>',
            )

    @patch('requests.post')
    def test_send_email_missing_message_id_raises_error(self, mock_post):
        """Test email sending without message ID in response raises error."""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {}  # No messageId
        mock_response.raise_for_status = Mock()
        mock_response.text = '{}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        with pytest.raises(CommunicationProviderError):
            provider.send_email(
                recipient='test@example.com',
                subject='Test Subject',
                body='<p>Test Body</p>',
            )

    @patch('requests.post')
    def test_send_sms_success(self, mock_post):
        """Test successful SMS sending via Brevo."""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {'reference': 'sms_ref_123'}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"reference": "sms_ref_123"}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        reference = provider.send_sms(
            recipient='+1234567890',
            body='Test SMS message',
        )

        assert reference == 'sms_ref_123'
        mock_post.assert_called_once()

    @patch('requests.post')
    def test_send_sms_with_custom_sender(self, mock_post):
        """Test SMS sending with custom sender ID."""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {'reference': 'sms_ref_456'}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"reference": "sms_ref_456"}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        provider.send_sms(
            recipient='+1234567890',
            body='Test SMS message',
            sender='MyCompany',
        )

        call_args = mock_post.call_args
        request_data = call_args[1]['json']
        assert request_data['sender'] == 'MyCompany'

    @patch('requests.post')
    def test_send_sms_truncates_sender_id(self, mock_post):
        """Test SMS sender ID is truncated to 11 characters."""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {'reference': 'sms_ref_789'}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"reference": "sms_ref_789"}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        provider.send_sms(
            recipient='+1234567890',
            body='Test SMS message',
            sender='VeryLongCompanyName',  # More than 11 chars
        )

        call_args = mock_post.call_args
        request_data = call_args[1]['json']
        assert len(request_data['sender']) <= 11

    @patch('requests.post')
    def test_send_sms_failure_raises_error(self, mock_post):
        """Test SMS sending failure raises CommunicationProviderError."""
        import requests
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = 'Invalid phone number'
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError()
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        with pytest.raises(CommunicationProviderError):
            provider.send_sms(
                recipient='invalid',
                body='Test SMS message',
            )

    @patch('requests.get')
    def test_get_delivery_status_email(self, mock_get):
        """Test get_delivery_status returns SENT for email message IDs."""
        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        # Email message IDs typically have angle brackets
        status = provider.get_delivery_status('<msg_123@brevo.com>')

        assert status == 'SENT'

    @patch('requests.get')
    def test_get_delivery_status_sms_delivered(self, mock_get):
        """Test get_delivery_status returns DELIVERED for delivered SMS."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'status': 'delivered'}
        mock_get.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        status = provider.get_delivery_status('sms_ref_123')

        assert status == 'DELIVERED'

    @patch('requests.get')
    def test_get_delivery_status_sms_failed(self, mock_get):
        """Test get_delivery_status returns FAILED for failed SMS."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'status': 'failed'}
        mock_get.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        status = provider.get_delivery_status('sms_ref_456')

        assert status == 'FAILED'

    @patch('requests.get')
    def test_get_delivery_status_handles_error(self, mock_get):
        """Test get_delivery_status returns PENDING on error."""
        mock_get.side_effect = Exception('Network error')

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        status = provider.get_delivery_status('sms_ref_789')

        assert status == 'PENDING'

    def test_html_to_text_conversion(self):
        """Test _html_to_text removes HTML tags."""
        provider = BrevoProvider()

        html = '<div><p>Hello <strong>World</strong>!</p></div>'
        text = provider._html_to_text(html)

        assert '<div>' not in text
        assert '<p>' not in text
        assert '<strong>' not in text
        assert 'Hello' in text
        assert 'World' in text

    def test_html_to_text_handles_whitespace(self):
        """Test _html_to_text normalizes whitespace."""
        provider = BrevoProvider()

        html = '<p>Hello</p>\n\n<p>World</p>'
        text = provider._html_to_text(html)

        # Should be normalized to single spaces
        assert '\n\n' not in text

    @patch('requests.get')
    def test_verify_domain(self, mock_get):
        """Test verify_domain returns domain status."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'domains': [
                {
                    'domain': 'example.com',
                    'verified': True,
                    'dkim': {'status': 'verified'},
                    'spf': {'status': 'verified'},
                }
            ]
        }
        mock_get.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        result = provider.verify_domain('example.com')

        assert result['domain'] == 'example.com'
        assert result['verified'] is True

    @patch('requests.get')
    def test_verify_domain_not_found(self, mock_get):
        """Test verify_domain returns not found for unknown domain."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'domains': []}
        mock_get.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        result = provider.verify_domain('unknown.com')

        assert result['domain'] == 'unknown.com'
        assert result['verified'] is False
        assert 'not found' in result.get('message', '').lower()

    @patch('requests.get')
    def test_verify_domain_handles_error(self, mock_get):
        """Test verify_domain handles API errors gracefully."""
        mock_get.side_effect = Exception('API error')

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        result = provider.verify_domain('error.com')

        assert result['domain'] == 'error.com'
        assert result['verified'] is False
        assert 'error' in result


class TestBrevoProviderMakeRequest:
    """Tests for BrevoProvider._make_request helper method."""

    @patch('requests.post')
    def test_make_request_post(self, mock_post):
        """Test _make_request handles POST requests."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'success': True}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"success": true}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        result = provider._make_request('smtp/email', 'POST', {'data': 'value'})

        assert result == {'success': True}
        mock_post.assert_called_once()

    @patch('requests.get')
    def test_make_request_get(self, mock_get):
        """Test _make_request handles GET requests."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'data': 'value'}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"data": "value"}'
        mock_get.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        result = provider._make_request('endpoint', 'GET')

        assert result == {'data': 'value'}
        mock_get.assert_called_once()

    def test_make_request_invalid_method(self):
        """Test _make_request raises error for invalid HTTP method."""
        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        with pytest.raises(ValueError):
            provider._make_request('endpoint', 'DELETE')

    @patch('requests.post')
    def test_make_request_includes_headers(self, mock_post):
        """Test _make_request includes correct headers."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        provider._make_request('endpoint', 'POST', {})

        call_args = mock_post.call_args
        headers = call_args[1]['headers']
        assert headers['api-key'] == 'test_api_key'
        assert headers['Content-Type'] == 'application/json'
        assert headers['Accept'] == 'application/json'

    @patch('requests.post')
    def test_make_request_timeout(self, mock_post):
        """Test _make_request uses timeout."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}
        mock_response.raise_for_status = Mock()
        mock_response.text = '{}'
        mock_post.return_value = mock_response

        provider = BrevoProvider()
        provider.api_key = 'test_api_key'

        provider._make_request('endpoint', 'POST', {})

        call_args = mock_post.call_args
        assert call_args[1]['timeout'] == 30
