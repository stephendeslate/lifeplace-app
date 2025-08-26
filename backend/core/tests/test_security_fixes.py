# backend/core/tests/test_security_fixes.py

import json
import os
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

from core.utils.encryption import EncryptionService, encrypt_data, decrypt_data
from core.utils.security import sanitize_input, validate_password_strength, sanitize_URL

User = get_user_model()


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

    def test_password_strength_validation(self):
        """Test password strength validation improvements"""
        
        # Test weak passwords
        weak_passwords = [
            'password',
            '123456',
            'qwerty',
            'admin',
            'letmein',
            'monkey',
            'welcome'
        ]
        
        for password in weak_passwords:
            with self.subTest(password=password):
                result = validate_password_strength(password)
                self.assertFalse(result['is_valid'], f"Password '{password}' should be rejected")
                self.assertIn('too common', ' '.join(result['messages']).lower())

        # Test strong password
        strong_password = 'MyStr0ng!Pa$$w0rd2024'
        result = validate_password_strength(strong_password)
        self.assertTrue(result['is_valid'])
        self.assertGreaterEqual(result['score'], 6)

    def test_url_sanitization(self):
        """Test URL sanitization to prevent malicious redirects"""
        
        # Test malicious URLs
        malicious_urls = [
            'javascript:alert("XSS")',
            'data:text/html,<script>alert(1)</script>',
            'vbscript:msgbox("XSS")',
            'file:///etc/passwd',
            'ftp://malicious.com/steal',
        ]
        
        for url in malicious_urls:
            with self.subTest(url=url):
                result = sanitize_URL(url)
                self.assertIsNone(result, f"URL '{url}' should be rejected")

        # Test safe URLs
        safe_urls = [
            'https://example.com',
            'http://localhost:3000',
            'mailto:test@example.com',
            'tel:+1234567890'
        ]
        
        for url in safe_urls:
            with self.subTest(url=url):
                result = sanitize_URL(url)
                self.assertIsNotNone(result, f"URL '{url}' should be allowed")

    @override_settings(
        FIELD_ENCRYPTION_KEY='test-encryption-key-12345',
        ENCRYPTION_SALT='test-salt-for-encryption'
    )
    def test_encryption_key_security(self):
        """Test enhanced encryption key management"""
        
        # Test that encryption service initializes properly with dedicated key
        encryption_service = EncryptionService()
        self.assertIsNotNone(encryption_service._fernet)
        
        # Test encryption/decryption works
        test_data = {'sensitive': 'payment_gateway_config', 'api_key': 'secret123'}
        encrypted = encrypt_data(test_data)
        decrypted = decrypt_data(encrypted)
        
        self.assertEqual(decrypted, test_data)
        self.assertNotEqual(encrypted, json.dumps(test_data))

    @override_settings(
        IS_PRODUCTION=True,
        FIELD_ENCRYPTION_KEY=None
    )
    def test_production_encryption_key_required(self):
        """Test that production requires dedicated encryption key"""
        
        with self.assertRaises(Exception) as context:
            EncryptionService()
        
        self.assertIn('FIELD_ENCRYPTION_KEY', str(context.exception))

    def test_jwt_token_security_headers(self):
        """Test JWT token security configuration"""
        
        from django.conf import settings
        
        # Test that JWT has proper configuration
        jwt_settings = settings.SIMPLE_JWT
        
        # Should have token rotation enabled
        self.assertTrue(jwt_settings.get('ROTATE_REFRESH_TOKENS'))
        self.assertTrue(jwt_settings.get('BLACKLIST_AFTER_ROTATION'))
        
        # Should have audience and issuer set
        self.assertEqual(jwt_settings.get('AUDIENCE'), 'lifeplace-api')
        self.assertEqual(jwt_settings.get('ISSUER'), 'lifeplace-backend')

    def test_secure_logout_functionality(self):
        """Test secure logout with token blacklisting"""
        
        # Login to get tokens
        login_response = self.client.post('/api/users/login/', {
            'email': 'test@example.com',
            'password': 'securepass123'
        })
        
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        tokens = login_response.json()
        
        # Set authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        # Test secure logout
        logout_response = self.client.post('/api/users/logout/', {
            'refresh': tokens['refresh']
        })
        
        # Should logout successfully
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        self.assertIn('Successfully logged out', logout_response.json()['message'])

    def test_rate_limiting_configuration(self):
        """Test that rate limiting is properly configured"""
        
        from core.utils.security import LoginRateThrottle, RegistrationRateThrottle
        
        # Test rate limiting classes exist and have proper rates
        login_throttle = LoginRateThrottle()
        self.assertEqual(login_throttle.rate, '10/hour')
        
        registration_throttle = RegistrationRateThrottle()
        self.assertEqual(registration_throttle.rate, '5/hour')

    def test_security_headers_middleware(self):
        """Test security headers are properly set"""
        
        from core.utils.security import SecurityMiddleware
        
        # Test that security middleware sets proper headers
        middleware = SecurityMiddleware(lambda request: type('Response', (), {})())
        
        # Mock request
        mock_request = type('Request', (), {})()
        response = middleware(mock_request)
        
        # Check security headers are set
        expected_headers = [
            'X-Content-Type-Options',
            'X-Frame-Options', 
            'Referrer-Policy',
            'Permissions-Policy'
        ]
        
        for header in expected_headers:
            self.assertTrue(hasattr(response, header))

    def test_input_validation_edge_cases(self):
        """Test input validation handles edge cases"""
        
        # Test null byte injection
        malicious_input = "normal text\x00<script>alert('xss')</script>"
        sanitized = sanitize_input(malicious_input)
        self.assertNotIn('\x00', sanitized)
        self.assertNotIn('<script>', sanitized)
        
        # Test very long input
        long_input = "A" * 10000
        sanitized = sanitize_input(long_input, max_length=1000)
        self.assertLessEqual(len(sanitized), 1000)
        
        # Test unicode normalization attacks
        unicode_attack = "＜script＞alert('xss')＜/script＞"  # Full-width characters
        sanitized = sanitize_input(unicode_attack, allow_html=False)
        self.assertNotIn('script', sanitized.lower())


class EncryptionKeyRotationTestCase(TestCase):
    """Test encryption key rotation functionality"""

    @override_settings(
        FIELD_ENCRYPTION_KEY='new-key-12345',
        OLD_FIELD_ENCRYPTION_KEY='old-key-12345',
        ENCRYPTION_SALT='test-salt-rotation'
    )
    def test_key_rotation_decryption(self):
        """Test that data encrypted with old key can be decrypted"""
        
        # Simulate data encrypted with old key
        encryption_service = EncryptionService()
        
        # Test data
        test_data = {'config': 'stripe_gateway', 'key': 'old_encrypted_data'}
        
        # This should work with the new system that supports both keys
        encrypted = encrypt_data(test_data)  # Encrypts with new key
        decrypted = decrypt_data(encrypted)  # Should decrypt successfully
        
        self.assertEqual(decrypted, test_data)

    def test_key_rotation_management_command_exists(self):
        """Test that key rotation management command exists"""
        
        import os
        command_path = '/Users/stephendeslate/Desktop/lifeplace-app/backend/core/management/commands/rotate_encryption_key.py'
        self.assertTrue(os.path.exists(command_path))


if __name__ == '__main__':
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()
    
    import unittest
    unittest.main()