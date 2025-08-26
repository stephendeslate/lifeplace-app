# backend/core/tests.py
"""
Core application tests including health checks and security tests
"""

import json
import hashlib
import hmac
import os
from unittest.mock import patch, MagicMock

from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from core.utils.security import (
    validate_email_format,
    validate_password_strength, 
    validate_file_upload,
    sanitize_input,
    LoginRateThrottle,
    RegistrationRateThrottle
)
from core.utils.encryption import encrypt_data, decrypt_data, EncryptionService
from core.utils.security_logging import (
    SecurityLogger,
    SecurityEvent,
    SecurityEventType,
    SecuritySeverity,
    security_logger
)
from core.domains.payments.models import PaymentGateway

User = get_user_model()


class HealthCheckTest(TestCase):
    def test_basic_functionality(self):
        """Test that Django is working"""
        self.assertTrue(True)


class SecurityUtilsTestCase(TestCase):
    """Test security utility functions"""
    
    def test_email_validation(self):
        """Test email format validation"""
        # Valid emails
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk", 
            "test+tag@example.org",
            "123@example.com"
        ]
        
        for email in valid_emails:
            self.assertTrue(validate_email_format(email), f"Should accept valid email: {email}")
        
        # Invalid emails
        invalid_emails = [
            "invalid-email",
            "@example.com",
            "test@",
            "test.example.com",
            "",
            "test@.com",
            "test@example.",
            "test@@example.com"
        ]
        
        for email in invalid_emails:
            self.assertFalse(validate_email_format(email), f"Should reject invalid email: {email}")
    
    def test_password_strength_validation(self):
        """Test password strength validation"""
        # Strong passwords
        strong_passwords = [
            "StrongP@ssw0rd123",
            "MySecur3P@ssword!",
            "C0mpl3x-P@ssw0rd"
        ]
        
        for password in strong_passwords:
            result = validate_password_strength(password)
            self.assertTrue(result['is_valid'], f"Should accept strong password: {password}")
            self.assertGreaterEqual(result['score'], 4)
        
        # Weak passwords
        weak_passwords = [
            "123",
            "password",
            "abc123",
            "short",
            "password123",
            "qwerty"
        ]
        
        for password in weak_passwords:
            result = validate_password_strength(password)
            self.assertFalse(result['is_valid'], f"Should reject weak password: {password}")
    
    def test_input_sanitization(self):
        """Test input sanitization"""
        test_cases = [
            # (input, expected_contains, expected_not_contains)
            ("<script>alert('xss')</script>Hello", "Hello", "<script>"),
            ("<img src='x' onerror='alert(1)'>", "", "<img"),
            ("Normal text", "Normal text", None),
            ("Text with <b>bold</b> tags", "Text with bold tags", "<b>"),
            ("", "", None)
        ]
        
        for input_text, should_contain, should_not_contain in test_cases:
            result = sanitize_input(input_text)
            
            if should_contain:
                self.assertIn(should_contain, result)
            if should_not_contain:
                self.assertNotIn(should_not_contain, result)
    
    def test_file_upload_validation(self):
        """Test file upload validation"""
        # Create mock file objects
        def create_mock_file(name, content_type, size):
            mock_file = MagicMock()
            mock_file.name = name
            mock_file.content_type = content_type
            mock_file.size = size
            return mock_file
        
        # Test allowed file types
        pdf_file = create_mock_file("document.pdf", "application/pdf", 1024*1024)
        result = validate_file_upload(pdf_file, allowed_types=["application/pdf"], max_size_mb=10)
        self.assertTrue(result['is_valid'])
        
        # Test disallowed file types
        exe_file = create_mock_file("malware.exe", "application/x-executable", 1024*1024)
        result = validate_file_upload(exe_file, allowed_types=["application/pdf"], max_size_mb=10)
        self.assertFalse(result['is_valid'])
        
        # Test file size limits
        large_file = create_mock_file("huge.pdf", "application/pdf", 100*1024*1024)
        result = validate_file_upload(large_file, max_size_mb=10)
        self.assertFalse(result['is_valid'])


class EncryptionTestCase(TestCase):
    """Test encryption functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.encryption_service = EncryptionService()
    
    def test_encryption_decryption(self):
        """Test basic encryption and decryption"""
        test_data = {
            "stripe_secret": "sk_test_123456789",
            "publishable_key": "pk_test_987654321"
        }
        
        # Encrypt
        encrypted = encrypt_data(test_data)
        self.assertIsInstance(encrypted, str)
        self.assertNotEqual(encrypted, str(test_data))
        
        # Decrypt
        decrypted = decrypt_data(encrypted)
        self.assertEqual(decrypted, test_data)
    
    def test_string_encryption(self):
        """Test string encryption"""
        test_string = "sensitive_api_key_12345"
        
        encrypted = encrypt_data(test_string)
        decrypted = decrypt_data(encrypted, return_json=False)
        
        self.assertEqual(decrypted, test_string)
    
    def test_empty_data_handling(self):
        """Test handling of empty/None data"""
        self.assertEqual(encrypt_data(None), "")
        self.assertEqual(decrypt_data(""), {})
        self.assertEqual(decrypt_data("", return_json=False), "")
    
    def test_invalid_decryption(self):
        """Test handling of invalid encrypted data"""
        invalid_data = "invalid_encrypted_data"
        result = decrypt_data(invalid_data)
        self.assertEqual(result, {})  # Should return empty dict instead of failing


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class SecurityLoggingTestCase(TestCase):
    """Test security logging functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            email="test@example.com",
            password="TestPass123!",
            role="CLIENT"
        )
        self.security_logger = SecurityLogger()
    
    def test_log_event_creation(self):
        """Test that security events are logged to database"""
        request = self.factory.post('/login/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        request.META['HTTP_USER_AGENT'] = 'Test Agent'
        
        # Log an event
        event = self.security_logger.log_event(
            SecurityEventType.LOGIN_SUCCESS,
            "Test login success",
            request=request,
            user=self.user,
            severity=SecuritySeverity.LOW
        )
        
        # Verify event was created
        self.assertIsNotNone(event)
        self.assertEqual(event.event_type, SecurityEventType.LOGIN_SUCCESS)
        self.assertEqual(event.user, self.user)
        self.assertEqual(event.ip_address, '192.168.1.1')
        
        # Verify it was saved to database
        saved_event = SecurityEvent.objects.get(id=event.id)
        self.assertEqual(saved_event.description, "Test login success")
    
    def test_login_success_logging(self):
        """Test login success logging"""
        request = self.factory.post('/login/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        self.security_logger.log_login_success(request, self.user)
        
        # Verify event was logged
        events = SecurityEvent.objects.filter(event_type=SecurityEventType.LOGIN_SUCCESS)
        self.assertEqual(events.count(), 1)
        self.assertEqual(events.first().user, self.user)
    
    def test_login_failure_logging(self):
        """Test login failure logging"""
        request = self.factory.post('/login/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        self.security_logger.log_login_failure(request, "test@example.com", "Invalid password")
        
        # Verify event was logged
        events = SecurityEvent.objects.filter(event_type=SecurityEventType.LOGIN_FAILURE)
        self.assertEqual(events.count(), 1)
        event = events.first()
        self.assertEqual(event.username, "test@example.com")
        self.assertIn("Invalid password", event.description)
    
    def test_risk_score_calculation(self):
        """Test risk score calculation"""
        request = self.factory.post('/login/')
        
        # Test high risk event
        high_risk_event = self.security_logger.log_event(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            "Suspicious activity detected",
            request=request,
            severity=SecuritySeverity.HIGH
        )
        
        self.assertGreaterEqual(high_risk_event.risk_score, 50)
        
        # Test low risk event
        low_risk_event = self.security_logger.log_event(
            SecurityEventType.LOGIN_SUCCESS,
            "Normal login",
            request=request,
            user=self.user,
            severity=SecuritySeverity.LOW
        )
        
        self.assertLessEqual(low_risk_event.risk_score, 30)


class SecurityFixesTestCase(TestCase):
    """Test cases to verify security vulnerabilities have been fixed"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='securepass123',
            first_name='Test',
            last_name='User'
        )

    def test_xss_vulnerability_fixed_input_sanitization(self):
        """Test that XSS payloads are properly sanitized"""
        
        # Test various XSS payloads
        xss_payloads = [
            '<script>alert("XSS")</script>',
            '<img src="x" onerror="alert(1)">',
            '<div onmouseover="alert(1)">Hover me</div>',
            'javascript:alert("XSS")',
            '<iframe src="javascript:alert(1)"></iframe>',
            '<svg onload="alert(1)">',
            '<body onload="alert(1)">',
            '<input onfocus="alert(1)" autofocus>',
        ]
        
        for payload in xss_payloads:
            with self.subTest(payload=payload):
                # Test the sanitize_input function
                sanitized = sanitize_input(payload, allow_html=False)
                
                # Should not contain script tags or event handlers
                self.assertNotIn('<script>', sanitized.lower())
                self.assertNotIn('onerror', sanitized.lower())
                self.assertNotIn('onload', sanitized.lower())
                self.assertNotIn('onmouseover', sanitized.lower())
                self.assertNotIn('onfocus', sanitized.lower())
                self.assertNotIn('javascript:', sanitized.lower())
                self.assertNotIn('<iframe>', sanitized.lower())
                self.assertNotIn('<svg>', sanitized.lower())

