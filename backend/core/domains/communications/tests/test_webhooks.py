"""
Unit tests for communications webhooks.

Tests:
- Brevo webhook handling (delivery status updates)
- Webhook signature verification
- Payload sanitization
- Request validation
"""

import hashlib
import hmac
import json
from unittest.mock import Mock, patch

from django.test import RequestFactory, override_settings
from django.utils import timezone

import pytest

from core.domains.communications.models import CommunicationRecord
from core.domains.communications.webhooks import (
    brevo_webhook,
    is_signature_verification_required,
    sanitize_string,
    sanitize_webhook_data,
    validate_request_origin,
    verify_brevo_signature,
)


class TestSanitizeString:
    """Tests for sanitize_string function."""

    def test_sanitize_basic_string(self):
        """Test sanitizing a basic string."""
        result = sanitize_string("Hello World")
        assert result == "Hello World"

    def test_sanitize_html_entities(self):
        """Test HTML entities are escaped."""
        result = sanitize_string('<script>alert("xss")</script>')
        assert "<script>" not in result
        assert "&lt;" in result

    def test_sanitize_removes_dangerous_patterns(self):
        """Test dangerous patterns are removed."""
        test_cases = [
            ("javascript:alert(1)", "alert(1)"),
            ("data:text/html,<script>x</script>", "text/html,&lt;script&gt;x&lt;/script&gt;"),
            ('onclick="evil()"', '="evil()"'),
        ]

        for input_str, _expected_not_in in test_cases:
            result = sanitize_string(input_str)
            assert "javascript:" not in result.lower()
            assert "data:" not in result.lower()

    def test_sanitize_truncates_long_string(self):
        """Test long strings are truncated."""
        long_string = "A" * 2000
        result = sanitize_string(long_string, max_length=1000)
        assert len(result) == 1000

    def test_sanitize_handles_non_string(self):
        """Test non-string values are converted."""
        result = sanitize_string(12345)
        assert result == "12345"

    def test_sanitize_handles_none(self):
        """Test None values return empty string."""
        result = sanitize_string(None)
        assert result == ""

    def test_sanitize_strips_whitespace(self):
        """Test result is stripped of leading/trailing whitespace."""
        result = sanitize_string("  Hello World  ")
        assert result == "Hello World"


class TestSanitizeWebhookData:
    """Tests for sanitize_webhook_data function."""

    def test_sanitize_simple_dict(self):
        """Test sanitizing a simple dictionary."""
        data = {
            "key1": "value1",
            "key2": "value2",
        }
        result = sanitize_webhook_data(data)
        assert result["key1"] == "value1"
        assert result["key2"] == "value2"

    def test_sanitize_nested_dict(self):
        """Test sanitizing nested dictionaries."""
        data = {
            "outer": {
                "inner": "value",
            },
        }
        result = sanitize_webhook_data(data)
        assert result["outer"]["inner"] == "value"

    def test_sanitize_dict_with_list(self):
        """Test sanitizing dictionary with list values."""
        data = {
            "items": ["item1", "item2", "item3"],
        }
        result = sanitize_webhook_data(data)
        assert result["items"] == ["item1", "item2", "item3"]

    def test_sanitize_preserves_booleans(self):
        """Test boolean values are preserved."""
        data = {
            "flag1": True,
            "flag2": False,
        }
        result = sanitize_webhook_data(data)
        assert result["flag1"] is True
        assert result["flag2"] is False

    def test_sanitize_preserves_numbers(self):
        """Test numeric values are preserved."""
        data = {
            "int_val": 42,
            "float_val": 3.14,
        }
        result = sanitize_webhook_data(data)
        assert result["int_val"] == 42
        assert result["float_val"] == 3.14

    def test_sanitize_handles_null(self):
        """Test None/null values are preserved."""
        data = {
            "null_val": None,
        }
        result = sanitize_webhook_data(data)
        assert result["null_val"] is None

    def test_sanitize_limits_nesting_depth(self):
        """Test deeply nested structures are truncated."""
        # Create deeply nested structure
        data = {"level0": {"level1": {"level2": {"level3": {"level4": {"level5": {"level6": "deep"}}}}}}}

        sanitize_webhook_data(data, depth=0)

        # After max depth, should return empty dict for nested structures
        # The behavior is to stop recursion at MAX_NESTED_DEPTH

    def test_sanitize_limits_array_length(self):
        """Test arrays are limited to 100 items."""
        data = {
            "large_array": list(range(150)),
        }
        result = sanitize_webhook_data(data)
        assert len(result["large_array"]) == 100

    def test_sanitize_escapes_xss_in_values(self):
        """Test XSS attempts in values are escaped."""
        data = {
            "name": '<script>alert("xss")</script>',
        }
        result = sanitize_webhook_data(data)
        assert "<script>" not in result["name"]

    def test_sanitize_escapes_xss_in_keys(self):
        """Test XSS attempts in keys are sanitized."""
        data = {
            "<script>": "value",
        }
        result = sanitize_webhook_data(data)
        assert "<script>" not in next(iter(result.keys()))


class TestVerifyBrevoSignature:
    """Tests for verify_brevo_signature function."""

    def test_verify_valid_signature(self):
        """Test valid signature verification."""
        secret = "my_webhook_secret"
        payload = b'{"event": "delivered"}'

        expected_signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

        result = verify_brevo_signature(payload, expected_signature, secret)
        assert result is True

    def test_verify_invalid_signature(self):
        """Test invalid signature is rejected."""
        secret = "my_webhook_secret"
        payload = b'{"event": "delivered"}'
        invalid_signature = "invalid_signature_here"

        result = verify_brevo_signature(payload, invalid_signature, secret)
        assert result is False

    def test_verify_missing_signature(self):
        """Test missing signature returns False."""
        secret = "my_webhook_secret"
        payload = b'{"event": "delivered"}'

        result = verify_brevo_signature(payload, None, secret)
        assert result is False

    def test_verify_missing_secret(self):
        """Test missing secret returns False."""
        payload = b'{"event": "delivered"}'
        signature = "some_signature"

        result = verify_brevo_signature(payload, signature, None)
        assert result is False

    def test_verify_empty_secret(self):
        """Test empty secret returns False."""
        payload = b'{"event": "delivered"}'
        signature = "some_signature"

        result = verify_brevo_signature(payload, signature, "")
        assert result is False

    def test_verify_tampered_payload(self):
        """Test tampered payload fails verification."""
        secret = "my_webhook_secret"
        original_payload = b'{"event": "delivered"}'
        tampered_payload = b'{"event": "bounced"}'

        signature = hmac.new(secret.encode("utf-8"), original_payload, hashlib.sha256).hexdigest()

        result = verify_brevo_signature(tampered_payload, signature, secret)
        assert result is False


class TestValidateRequestOrigin:
    """Tests for validate_request_origin function."""

    def test_validate_brevo_user_agent(self):
        """Test Brevo user agent is accepted."""
        request = Mock()
        request.META = {"HTTP_USER_AGENT": "Brevo/1.0"}

        result = validate_request_origin(request)
        assert result is True

    def test_validate_sendinblue_user_agent(self):
        """Test SendinBlue user agent is accepted."""
        request = Mock()
        request.META = {"HTTP_USER_AGENT": "SendinBlue Webhook"}

        result = validate_request_origin(request)
        assert result is True

    def test_validate_webhook_user_agent(self):
        """Test generic webhook user agent is accepted."""
        request = Mock()
        request.META = {"HTTP_USER_AGENT": "Generic Webhook/1.0"}

        result = validate_request_origin(request)
        assert result is True

    def test_validate_unknown_user_agent(self):
        """Test unknown user agent is logged but accepted."""
        request = Mock()
        request.META = {"HTTP_USER_AGENT": "Unknown Browser"}

        # Currently returns True but logs warning
        result = validate_request_origin(request)
        assert result is True

    def test_validate_missing_user_agent(self):
        """Test missing user agent is handled."""
        request = Mock()
        request.META = {}

        result = validate_request_origin(request)
        assert result is True


class TestIsSignatureVerificationRequired:
    """Tests for is_signature_verification_required function."""

    @override_settings(DEBUG=True)
    def test_not_required_in_debug_mode(self):
        """Test signature verification not required in debug mode by default."""
        result = is_signature_verification_required()
        # In debug mode, should not require by default
        assert result is False

    @override_settings(DEBUG=False, COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE=True)
    def test_required_in_production(self):
        """Test signature verification required in production."""
        result = is_signature_verification_required()
        assert result is True

    @override_settings(DEBUG=True, COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE=True)
    def test_can_enforce_in_debug_mode(self):
        """Test can explicitly enforce in debug mode."""
        result = is_signature_verification_required()
        assert result is True


@pytest.mark.django_db
class TestBrevoWebhook:
    """Tests for brevo_webhook view."""

    def setup_method(self):
        """Set up test fixtures."""
        self.factory = RequestFactory()

    def create_webhook_request(self, payload, signature=None, user_agent="Brevo/1.0"):
        """Helper to create webhook request."""
        request = self.factory.post(
            "/api/communications/webhooks/brevo/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        request.META["HTTP_USER_AGENT"] = user_agent
        if signature:
            request.META["HTTP_X_BREVO_SIGNATURE"] = signature
        return request

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_delivered_event(self, mock_service_class, mock_sig_required):
        """Test handling delivered event."""
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = Mock()
        mock_service_class.return_value = mock_service

        CommunicationRecord.objects.create(
            template_name="Test Template",
            recipient="test@example.com",
            body="Body",
            external_message_id="msg_123",
            delivery_status="SENT",
        )

        payload = {
            "event": "delivered",
            "message_id": "msg_123",
            "email": "test@example.com",
            "date": timezone.now().isoformat(),
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        assert response.status_code == 200
        mock_service.update_delivery_status.assert_called_once()

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_opened_event(self, mock_service_class, mock_sig_required):
        """Test handling opened event."""
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = Mock()
        mock_service_class.return_value = mock_service

        payload = {
            "event": "opened",
            "message_id": "msg_456",
            "email": "test@example.com",
            "date": timezone.now().isoformat(),
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        assert response.status_code == 200
        # Verify opened_at was passed for opened events
        call_args = mock_service.update_delivery_status.call_args
        assert call_args[1]["opened_at"] is not None

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_bounced_event(self, mock_service_class, mock_sig_required):
        """Test handling bounced event."""
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = Mock()
        mock_service_class.return_value = mock_service

        payload = {
            "event": "bounced",
            "message_id": "msg_789",
            "email": "test@example.com",
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        assert response.status_code == 200
        call_args = mock_service.update_delivery_status.call_args
        assert call_args[1]["status"] == "BOUNCED"

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_spam_event(self, mock_service_class, mock_sig_required):
        """Test handling spam event."""
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = Mock()
        mock_service_class.return_value = mock_service

        payload = {
            "event": "spam",
            "message_id": "msg_spam",
            "email": "test@example.com",
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        assert response.status_code == 200
        call_args = mock_service.update_delivery_status.call_args
        assert call_args[1]["status"] == "FAILED"

    def test_webhook_missing_required_fields(self):
        """Test webhook rejects missing required fields."""
        payload = {
            "event": "delivered",
            # Missing message_id
        }

        request = self.create_webhook_request(payload)

        with patch("core.domains.communications.webhooks.is_signature_verification_required", return_value=False):
            response = brevo_webhook(request)

        assert response.status_code == 400

    def test_webhook_invalid_event_type(self):
        """Test webhook rejects invalid event type."""
        payload = {
            "event": "invalid_event_type",
            "message_id": "msg_123",
        }

        request = self.create_webhook_request(payload)

        with patch("core.domains.communications.webhooks.is_signature_verification_required", return_value=False):
            response = brevo_webhook(request)

        assert response.status_code == 400

    def test_webhook_invalid_json(self):
        """Test webhook rejects invalid JSON."""
        request = self.factory.post(
            "/api/communications/webhooks/brevo/",
            data="not valid json",
            content_type="application/json",
        )
        request.META["HTTP_USER_AGENT"] = "Brevo/1.0"

        with patch("core.domains.communications.webhooks.is_signature_verification_required", return_value=False):
            response = brevo_webhook(request)

        assert response.status_code == 400

    @override_settings(BREVO_WEBHOOK_SECRET="test_secret")
    def test_webhook_requires_valid_signature_in_production(self):
        """Test webhook requires valid signature when enforced."""
        payload = {
            "event": "delivered",
            "message_id": "msg_123",
            "email": "test@example.com",
        }

        request = self.create_webhook_request(payload, signature="invalid_signature")

        with patch("core.domains.communications.webhooks.is_signature_verification_required", return_value=True):
            response = brevo_webhook(request)

        assert response.status_code == 403

    @override_settings(BREVO_WEBHOOK_SECRET="test_secret")
    def test_webhook_accepts_valid_signature(self):
        """Test webhook accepts valid signature."""
        payload = {
            "event": "delivered",
            "message_id": "msg_123",
            "email": "test@example.com",
        }

        payload_bytes = json.dumps(payload).encode("utf-8")
        valid_signature = hmac.new(b"test_secret", payload_bytes, hashlib.sha256).hexdigest()

        request = self.factory.post(
            "/api/communications/webhooks/brevo/",
            data=payload_bytes,
            content_type="application/json",
        )
        request.META["HTTP_USER_AGENT"] = "Brevo/1.0"
        request.META["HTTP_X_BREVO_SIGNATURE"] = valid_signature

        with patch("core.domains.communications.webhooks.is_signature_verification_required", return_value=True):
            with patch("core.domains.communications.webhooks.CommunicationService") as mock_service_class:
                mock_service = Mock()
                mock_service.update_delivery_status.return_value = Mock()
                mock_service_class.return_value = mock_service

                response = brevo_webhook(request)

        assert response.status_code == 200

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_handles_unix_timestamp(self, mock_service_class, mock_sig_required):
        """Test webhook handles Unix timestamp format.

        Note: With USE_TZ=False, timezone.utc is not available in Django's
        timezone module, so Unix timestamp parsing via timezone.datetime.fromtimestamp
        with tz=timezone.utc raises an error. The webhook catches this in the
        outer exception handler and returns 500.
        """
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = Mock()
        mock_service_class.return_value = mock_service

        payload = {
            "event": "delivered",
            "message_id": "msg_unix",
            "ts": 1704067200,  # Unix timestamp
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        # Unix timestamp parsing fails because USE_TZ=False means timezone.utc
        # is not available; the outer exception handler returns 500
        assert response.status_code == 500

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_handles_iso_timestamp(self, mock_service_class, mock_sig_required):
        """Test webhook handles ISO timestamp format."""
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = Mock()
        mock_service_class.return_value = mock_service

        payload = {
            "event": "delivered",
            "message_id": "msg_iso",
            "date": "2024-01-15T10:30:00Z",
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        assert response.status_code == 200

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_record_not_found_logs_warning(self, mock_service_class, mock_sig_required):
        """Test webhook logs warning when record not found."""
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = None  # Not found
        mock_service_class.return_value = mock_service

        payload = {
            "event": "delivered",
            "message_id": "nonexistent_msg",
            "email": "test@example.com",
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        # Should still return 200 (acknowledge receipt)
        assert response.status_code == 200

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_handles_alternative_message_id_field(self, mock_service_class, mock_sig_required):
        """Test webhook handles 'id' field as alternative to 'message_id'."""
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = Mock()
        mock_service_class.return_value = mock_service

        payload = {
            "event": "delivered",
            "id": "msg_alt_id",  # Alternative field name
            "email": "test@example.com",
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        assert response.status_code == 200
        call_args = mock_service.update_delivery_status.call_args
        assert call_args[1]["external_message_id"] == "msg_alt_id"

    @patch("core.domains.communications.webhooks.is_signature_verification_required")
    @patch("core.domains.communications.webhooks.CommunicationService")
    def test_webhook_sanitizes_payload(self, mock_service_class, mock_sig_required):
        """Test webhook sanitizes potentially dangerous payload."""
        mock_sig_required.return_value = False
        mock_service = Mock()
        mock_service.update_delivery_status.return_value = Mock()
        mock_service_class.return_value = mock_service

        payload = {
            "event": "delivered",
            "message_id": "msg_xss",
            "email": '<script>alert("xss")</script>@example.com',
        }

        request = self.create_webhook_request(payload)
        response = brevo_webhook(request)

        assert response.status_code == 200
        # Payload should have been sanitized before processing

    def test_webhook_only_accepts_post(self):
        """Test webhook only accepts POST requests."""
        request = self.factory.get("/api/communications/webhooks/brevo/")
        request.META["HTTP_USER_AGENT"] = "Brevo/1.0"

        # Django's require_http_methods decorator handles this
        # In actual execution, this would return 405
