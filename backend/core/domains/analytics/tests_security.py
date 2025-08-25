# backend/core/domains/analytics/tests_security.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from .security import SecurityValidator, DataSanitizer, AuditLogger
from .throttling import PublicTrackingThrottle, AdminAnalyticsThrottle

User = get_user_model()


class SecurityValidatorTest(TestCase):
    """Test security validation utilities"""

    def test_validate_event_data_valid(self):
        """Test valid event data passes validation"""
        valid_data = {
            'page': '/dashboard',
            'duration': 5.2,
            'user_action': 'click_button'
        }
        
        self.assertTrue(SecurityValidator.validate_event_data(valid_data))

    def test_validate_event_data_sql_injection(self):
        """Test SQL injection patterns are detected"""
        malicious_data = {
            'query': "'; DROP TABLE users; --",
            'input': "1' UNION SELECT * FROM passwords"
        }
        
        self.assertFalse(SecurityValidator.validate_event_data(malicious_data))

    def test_validate_event_data_script_injection(self):
        """Test script injection patterns are detected"""
        malicious_data = {
            'content': '<script>alert("xss")</script>',
            'iframe': '<iframe src="javascript:alert(1)"></iframe>'
        }
        
        self.assertFalse(SecurityValidator.validate_event_data(malicious_data))

    def test_validate_event_data_size_limit(self):
        """Test large payloads are rejected"""
        large_data = {'large_field': 'x' * 20000}  # 20KB
        
        self.assertFalse(SecurityValidator.validate_event_data(large_data))

    def test_validate_session_id_valid(self):
        """Test valid session IDs pass validation"""
        valid_sessions = [
            'abc123-def456-ghi789',
            'session_12345',
            'user-session-uuid-1234567890',
            None,  # Optional field
            ''     # Empty string is acceptable
        ]
        
        for session_id in valid_sessions:
            with self.subTest(session_id=session_id):
                self.assertTrue(SecurityValidator.validate_session_id(session_id))

    def test_validate_session_id_invalid(self):
        """Test invalid session IDs are rejected"""
        invalid_sessions = [
            'session with spaces',
            'session@with!special*chars',
            'x' * 200,  # Too long
            '../../../etc/passwd',  # Path traversal
            '<script>alert(1)</script>'  # Script tag
        ]
        
        for session_id in invalid_sessions:
            with self.subTest(session_id=session_id):
                self.assertFalse(SecurityValidator.validate_session_id(session_id))


class DataSanitizerTest(TestCase):
    """Test data sanitization utilities"""

    def test_sanitize_event_data_basic(self):
        """Test basic data sanitization"""
        data = {
            'normal_field': 'normal value',
            'number_field': 42,
            'boolean_field': True
        }
        
        sanitized = DataSanitizer.sanitize_event_data(data)
        
        self.assertEqual(sanitized, data)

    def test_sanitize_event_data_malicious(self):
        """Test sanitization of malicious data"""
        malicious_data = {
            'sql_injection': "'; DROP TABLE users; --",
            'xss_attempt': '<script>alert("xss")</script>',
            'normal_field': 'safe value'
        }
        
        sanitized = DataSanitizer.sanitize_event_data(malicious_data)
        
        # Malicious content should be removed
        self.assertNotIn('DROP TABLE', str(sanitized))
        self.assertNotIn('<script>', str(sanitized))
        
        # Safe content should remain
        self.assertIn('safe value', str(sanitized))

    def test_sanitize_ip_address_valid(self):
        """Test valid IP addresses pass through"""
        valid_ips = [
            '192.168.1.1',
            '127.0.0.1',
            '10.0.0.1',
            '2001:db8::1'  # IPv6
        ]
        
        for ip in valid_ips:
            with self.subTest(ip=ip):
                self.assertEqual(DataSanitizer.sanitize_ip_address(ip), ip)

    def test_sanitize_ip_address_invalid(self):
        """Test invalid IP addresses are rejected"""
        invalid_ips = [
            '999.999.999.999',
            'not.an.ip.address',
            '192.168.1.1; rm -rf /',
            '<script>alert(1)</script>'
        ]
        
        for ip in invalid_ips:
            with self.subTest(ip=ip):
                self.assertIsNone(DataSanitizer.sanitize_ip_address(ip))


class PublicTrackingSecurityTest(TestCase):
    """Test security for public tracking endpoint"""

    def setUp(self):
        self.client = APIClient()

    def test_valid_tracking_request(self):
        """Test valid tracking request is accepted"""
        data = {
            'event_name': 'page_view',
            'session_id': 'test-session-123',
            'event_data': {
                'page': '/dashboard',
                'duration': 5.2
            }
        }
        
        response = self.client.post('/analytics/public/track/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_event_name_rejected(self):
        """Test invalid event names are rejected"""
        data = {
            'event_name': 'malicious_event',
            'session_id': 'test-session-123'
        }
        
        response = self.client.post('/analytics/public/track/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malicious_event_data_rejected(self):
        """Test malicious event data is rejected"""
        data = {
            'event_name': 'page_view',
            'session_id': 'test-session-123',
            'event_data': {
                'malicious': "'; DROP TABLE users; --",
                'xss': '<script>alert("xss")</script>'
            }
        }
        
        response = self.client.post('/analytics/public/track/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_session_id_rejected(self):
        """Test invalid session IDs are rejected"""
        data = {
            'event_name': 'page_view',
            'session_id': 'invalid session id with spaces',
            'event_data': {'page': '/dashboard'}
        }
        
        response = self.client.post('/analytics/public/track/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('core.domains.analytics.views.AuditLogger.log_suspicious_activity')
    def test_suspicious_activity_logged(self, mock_audit_log):
        """Test suspicious activity is properly logged"""
        data = {
            'event_name': 'malicious_event',
            'session_id': 'test-session-123'
        }
        
        response = self.client.post('/analytics/public/track/', data, format='json')
        
        # Verify audit logging was called
        self.assertTrue(mock_audit_log.called)
        call_args = mock_audit_log.call_args[0]
        self.assertIn('Invalid event name', call_args[2])


class ThrottlingTest(TestCase):
    """Test throttling functionality"""

    def setUp(self):
        self.client = APIClient()

    @patch('django.core.cache.cache.get')
    @patch('django.core.cache.cache.set')
    def test_public_tracking_throttle(self, mock_cache_set, mock_cache_get):
        """Test public tracking endpoint is throttled"""
        # Simulate cache returning high count (exceeded limit)
        mock_cache_get.return_value = 200
        
        throttle = PublicTrackingThrottle()
        request = MagicMock()
        request.META = {
            'REMOTE_ADDR': '127.0.0.1',
            'HTTP_USER_AGENT': 'test-agent'
        }
        
        # Should be throttled
        self.assertFalse(throttle.allow_request(request, None))

    def test_admin_analytics_throttle_bypass(self):
        """Test admin users bypass throttling"""
        user = User.objects.create_user(
            email="admin@example.com",
            password="testpass123"
        )
        user.role = 'ADMIN'
        user.save()
        
        throttle = AdminAnalyticsThrottle()
        request = MagicMock()
        request.user = user
        
        # Admin should bypass throttling
        self.assertTrue(throttle.allow_request(request, None))


class AuditLoggingTest(TestCase):
    """Test audit logging functionality"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    @patch('core.domains.analytics.security.logger')
    def test_log_suspicious_activity(self, mock_logger):
        """Test suspicious activity logging"""
        request = MagicMock()
        request.META = {
            'REMOTE_ADDR': '127.0.0.1',
            'HTTP_USER_AGENT': 'test-agent'
        }
        request.user = self.user
        
        AuditLogger.log_suspicious_activity(
            request, 
            'test_endpoint', 
            'Test suspicious activity',
            {'test': 'data'}
        )
        
        # Verify logger was called with ERROR level
        self.assertTrue(mock_logger.error.called)
        call_args = mock_logger.error.call_args[0]
        self.assertIn('Test suspicious activity', call_args[0])

    @patch('core.domains.analytics.security.logger')
    def test_log_data_access(self, mock_logger):
        """Test data access logging"""
        request = MagicMock()
        request.META = {'REMOTE_ADDR': '127.0.0.1'}
        request.user = self.user
        
        AuditLogger.log_data_access(
            request, 
            'business_metrics', 
            'all', 
            'read'
        )
        
        # Verify logger was called with INFO level
        self.assertTrue(mock_logger.info.called)
        call_args = mock_logger.info.call_args[0]
        self.assertIn('DATA_ACCESS', call_args[0])


class IntegrationSecurityTest(TestCase):
    """Integration tests for security features"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_end_to_end_public_tracking_security(self):
        """Test complete security flow for public tracking"""
        # Test 1: Valid request should work
        valid_data = {
            'event_name': 'page_view',
            'session_id': 'valid-session-123',
            'event_data': {'page': '/dashboard'}
        }
        
        response = self.client.post('/analytics/public/track/', valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test 2: Invalid event name should be rejected
        invalid_data = {
            'event_name': 'malicious_event',
            'session_id': 'valid-session-123'
        }
        
        response = self.client.post('/analytics/public/track/', invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test 3: Malicious payload should be rejected
        malicious_data = {
            'event_name': 'page_view',
            'session_id': 'valid-session-123',
            'event_data': {
                'sql': "'; DROP TABLE users; --",
                'xss': '<script>alert(1)</script>'
            }
        }
        
        response = self.client.post('/analytics/public/track/', malicious_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)