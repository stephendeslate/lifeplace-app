"""
Comprehensive test suite for messaging security implementation
Tests authentication, permissions, encryption, rate limiting, and audit logging
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken

from ..auth import JWTAuthMiddleware, JWTAuthMiddlewareStack
from ..permissions import ThreadPermission, WebSocketPermission, MessageAction
from ..encryption import MessageEncryption, encrypt_message, decrypt_message
from ..security_middleware import SecurityMiddleware, RateLimiter, MessageContentValidator
from ..security_audit import WebSocketAuditor, AuditContext, MessageAuditLog, ConnectionAuditLog

User = get_user_model()


class SecurityTestCase(TransactionTestCase):
    """Base test case for security tests"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN'
        )
        
        self.client_user = User.objects.create_user(
            email='client@test.com',
            password='testpass123',
            role='CLIENT'
        )
        
        # Clear cache
        cache.clear()
        
        # Create test tokens
        self.admin_token = str(AccessToken.for_user(self.admin_user))
        self.client_token = str(AccessToken.for_user(self.client_user))


class JWTAuthenticationTest(SecurityTestCase):
    """Test JWT WebSocket authentication"""
    
    def test_valid_token_authentication(self):
        """Test authentication with valid JWT token"""
        middleware = JWTAuthMiddleware(None)
        
        # Create scope with valid token
        scope = {
            'type': 'websocket',
            'query_string': f'token={self.client_token}'.encode(),
            'headers': [],
            'client': ['127.0.0.1', 12345],
        }
        
        # Test token extraction
        token = middleware._extract_token(scope)
        self.assertEqual(token, self.client_token)
    
    def test_invalid_token_authentication(self):
        """Test authentication with invalid JWT token"""
        middleware = JWTAuthMiddleware(None)
        
        scope = {
            'type': 'websocket',
            'query_string': b'token=invalid.token.here',
            'headers': [],
            'client': ['127.0.0.1', 12345],
        }
        
        async def test_auth():
            client_info = middleware._extract_client_info(scope)
            with self.assertRaises(Exception):
                await middleware._authenticate_user(scope, client_info)
        
        asyncio.run(test_auth())
    
    def test_authorization_header_extraction(self):
        """Test token extraction from Authorization header"""
        middleware = JWTAuthMiddleware(None)
        
        scope = {
            'type': 'websocket',
            'query_string': b'',
            'headers': [
                (b'authorization', f'Bearer {self.client_token}'.encode()),
            ],
            'client': ['127.0.0.1', 12345],
        }
        
        token = middleware._extract_token(scope)
        self.assertEqual(token, self.client_token)
    
    def test_no_token_anonymous_access(self):
        """Test anonymous access when no token provided"""
        middleware = JWTAuthMiddleware(None)
        
        scope = {
            'type': 'websocket',
            'query_string': b'',
            'headers': [],
            'client': ['127.0.0.1', 12345],
        }
        
        async def test_anonymous():
            client_info = middleware._extract_client_info(scope)
            user, token_info = await middleware._authenticate_user(scope, client_info)
            self.assertTrue(user.is_anonymous)
            self.assertIsNone(token_info)
        
        asyncio.run(test_anonymous())


class PermissionSystemTest(SecurityTestCase):
    """Test permission system"""
    
    def test_admin_permissions(self):
        """Test admin user permissions"""
        async def test():
            permission_checker = ThreadPermission(self.admin_user)
            
            # Admin should have all permissions
            self.assertTrue(await permission_checker.has_permission(MessageAction.VIEW_ALL_THREADS))
            self.assertTrue(await permission_checker.has_permission(MessageAction.MODERATE_CONTENT))
            self.assertTrue(await permission_checker.has_permission(MessageAction.MANAGE_THREAD, thread_id=1))
            self.assertTrue(await permission_checker.has_permission(MessageAction.VIEW_THREAD, thread_id=1))
            self.assertTrue(await permission_checker.has_permission(MessageAction.SEND_MESSAGE, thread_id=1))
        
        asyncio.run(test())
    
    def test_client_permissions(self):
        """Test client user permissions"""
        async def test():
            permission_checker = ThreadPermission(self.client_user)
            
            # Client should not have admin permissions
            self.assertFalse(await permission_checker.has_permission(MessageAction.VIEW_ALL_THREADS))
            self.assertFalse(await permission_checker.has_permission(MessageAction.MODERATE_CONTENT))
            self.assertFalse(await permission_checker.has_permission(MessageAction.MANAGE_THREAD, thread_id=1))
        
        asyncio.run(test())
    
    def test_websocket_room_permissions(self):
        """Test WebSocket room access permissions"""
        async def test():
            # Admin permissions
            admin_permission = WebSocketPermission(self.admin_user)
            self.assertTrue(await admin_permission.can_connect('admin_dashboard'))
            self.assertTrue(await admin_permission.can_connect('thread_123'))
            self.assertTrue(await admin_permission.can_connect(f'user_{self.client_user.id}'))
            
            # Client permissions
            client_permission = WebSocketPermission(self.client_user)
            self.assertFalse(await client_permission.can_connect('admin_dashboard'))
            self.assertTrue(await client_permission.can_connect(f'user_{self.client_user.id}'))
            self.assertFalse(await client_permission.can_connect(f'user_{self.admin_user.id}'))
        
        asyncio.run(test())
    
    def test_anonymous_permissions(self):
        """Test anonymous user permissions"""
        from django.contrib.auth.models import AnonymousUser
        
        async def test():
            anonymous_user = AnonymousUser()
            permission_checker = ThreadPermission(anonymous_user)
            
            # Anonymous users should have no permissions
            self.assertFalse(await permission_checker.has_permission(MessageAction.VIEW_THREAD, thread_id=1))
            self.assertFalse(await permission_checker.has_permission(MessageAction.SEND_MESSAGE, thread_id=1))
        
        asyncio.run(test())


class EncryptionTest(SecurityTestCase):
    """Test message encryption"""
    
    def setUp(self):
        super().setUp()
        self.encryption = MessageEncryption()
    
    def test_message_encryption_decryption(self):
        """Test basic encryption and decryption"""
        original_message = "This is a confidential message"
        
        # Encrypt
        encrypted = self.encryption.encrypt_message_content(original_message)
        self.assertNotEqual(encrypted, original_message)
        self.assertTrue(len(encrypted) > 0)
        
        # Decrypt
        decrypted = self.encryption.decrypt_message_content(encrypted)
        self.assertEqual(decrypted, original_message)
    
    def test_empty_message_encryption(self):
        """Test encryption of empty messages"""
        encrypted = self.encryption.encrypt_message_content("")
        self.assertEqual(encrypted, "")
        
        encrypted_none = self.encryption.encrypt_message_content(None)
        self.assertIsNone(encrypted_none)
    
    def test_unicode_message_encryption(self):
        """Test encryption of unicode messages"""
        unicode_message = "Hello 🌍! This contains émojis and spéciål characters"
        
        encrypted = self.encryption.encrypt_message_content(unicode_message)
        decrypted = self.encryption.decrypt_message_content(encrypted)
        
        self.assertEqual(decrypted, unicode_message)
    
    def test_long_message_encryption(self):
        """Test encryption of long messages"""
        long_message = "A" * 10000  # 10KB message
        
        encrypted = self.encryption.encrypt_message_content(long_message)
        decrypted = self.encryption.decrypt_message_content(encrypted)
        
        self.assertEqual(decrypted, long_message)
    
    def test_sensitive_data_encryption(self):
        """Test encryption of sensitive data fields"""
        sensitive_data = {
            'message': 'Confidential information',
            'metadata': 'Some metadata',
            'public_field': 'Public information'
        }
        
        encrypted_data = self.encryption.encrypt_sensitive_data(
            sensitive_data, 
            ['message', 'metadata']
        )
        
        # Check that specified fields are encrypted
        self.assertNotEqual(encrypted_data['message'], sensitive_data['message'])
        self.assertNotEqual(encrypted_data['metadata'], sensitive_data['metadata'])
        # Public field should remain unchanged
        self.assertEqual(encrypted_data['public_field'], sensitive_data['public_field'])
        
        # Decrypt and verify
        decrypted_data = self.encryption.decrypt_sensitive_data(
            encrypted_data,
            ['message', 'metadata']
        )
        
        self.assertEqual(decrypted_data['message'], sensitive_data['message'])
        self.assertEqual(decrypted_data['metadata'], sensitive_data['metadata'])
    
    def test_encryption_error_handling(self):
        """Test encryption error handling"""
        # Test decryption of invalid data
        with self.assertRaises(Exception):
            self.encryption.decrypt_message_content("invalid_encrypted_data")
    
    def test_is_encrypted_detection(self):
        """Test encrypted content detection"""
        plain_text = "This is plain text"
        encrypted_text = self.encryption.encrypt_message_content(plain_text)
        
        self.assertFalse(self.encryption.is_encrypted(plain_text))
        self.assertTrue(self.encryption.is_encrypted(encrypted_text))
    
    def test_convenience_functions(self):
        """Test convenience encryption functions"""
        message = "Test message for convenience functions"
        
        encrypted = encrypt_message(message, user=self.client_user, thread_id=123)
        decrypted = decrypt_message(encrypted, user=self.client_user, thread_id=123)
        
        self.assertEqual(decrypted, message)


class RateLimitingTest(SecurityTestCase):
    """Test rate limiting functionality"""
    
    def setUp(self):
        super().setUp()
        from ..security_middleware import RateLimitConfig
        self.rate_config = RateLimitConfig(
            messages_per_minute=5,
            connections_per_hour=10,
            burst_limit=3,
            burst_window=10
        )
        self.rate_limiter = RateLimiter(self.rate_config)
    
    def test_message_rate_limiting(self):
        """Test message rate limiting"""
        async def test():
            identifier = f"user:{self.client_user.id}"
            
            # First few messages should be allowed
            for i in range(3):
                allowed = await self.rate_limiter.check_message_rate(identifier)
                self.assertTrue(allowed, f"Message {i+1} should be allowed")
            
            # Burst limit should kick in
            allowed = await self.rate_limiter.check_message_rate(identifier)
            self.assertFalse(allowed, "Message should be rate limited (burst)")
        
        asyncio.run(test())
    
    def test_connection_rate_limiting(self):
        """Test connection rate limiting"""
        async def test():
            identifier = f"ip:127.0.0.1"
            
            # First few connections should be allowed
            for i in range(5):
                allowed = await self.rate_limiter.check_connection_rate(identifier)
                self.assertTrue(allowed, f"Connection {i+1} should be allowed")
        
        asyncio.run(test())
    
    def test_burst_rate_limiting(self):
        """Test burst rate limiting with time windows"""
        async def test():
            identifier = f"user:{self.client_user.id}"
            
            # Send burst limit messages
            for i in range(self.rate_config.burst_limit):
                allowed = await self.rate_limiter.check_message_rate(identifier)
                self.assertTrue(allowed)
            
            # Next message should be blocked
            allowed = await self.rate_limiter.check_message_rate(identifier)
            self.assertFalse(allowed)
        
        asyncio.run(test())


class ContentValidationTest(SecurityTestCase):
    """Test message content validation"""
    
    def setUp(self):
        super().setUp()
        self.validator = MessageContentValidator()
    
    def test_valid_content(self):
        """Test validation of valid content"""
        valid_messages = [
            "Hello, how are you?",
            "This is a normal message with some numbers 123",
            "Message with emoji 😊",
            "https://example.com is a valid URL"
        ]
        
        for message in valid_messages:
            is_valid, violations = self.validator.validate_content(message, self.client_user)
            self.assertTrue(is_valid, f"Message should be valid: {message}")
            self.assertEqual(len(violations), 0)
    
    def test_malicious_content_detection(self):
        """Test detection of malicious content"""
        malicious_messages = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<iframe src='evil.com'></iframe>",
            "onclick='alert(1)'",
            "eval(maliciousCode())",
        ]
        
        for message in malicious_messages:
            is_valid, violations = self.validator.validate_content(message, self.client_user)
            self.assertFalse(is_valid, f"Message should be invalid: {message}")
            self.assertGreater(len(violations), 0)
    
    def test_spam_content_detection(self):
        """Test detection of spam content"""
        spam_messages = [
            "AAAAAAAAAAAAAAAAAAA",  # Repeated characters
            "BUY NOW BUY NOW BUY NOW BUY NOW BUY NOW BUY NOW",  # Repeated words
            "THIS IS ALL CAPS MESSAGE SPAM",  # All caps
        ]
        
        for message in spam_messages:
            is_valid, violations = self.validator.validate_content(message, self.client_user)
            self.assertFalse(is_valid, f"Message should be flagged as spam: {message}")
            self.assertGreater(len(violations), 0)
    
    def test_message_length_validation(self):
        """Test message length validation"""
        # Create a very long message
        long_message = "A" * 10000
        
        is_valid, violations = self.validator.validate_content(long_message, self.client_user)
        self.assertFalse(is_valid)
        self.assertTrue(any("too long" in v.lower() for v in violations))
    
    def test_url_count_validation(self):
        """Test validation of excessive URLs"""
        message_with_many_urls = " ".join([
            "https://example1.com",
            "https://example2.com", 
            "https://example3.com",
            "https://example4.com",  # This should trigger the limit
        ])
        
        is_valid, violations = self.validator.validate_content(message_with_many_urls, self.client_user)
        self.assertFalse(is_valid)
        self.assertTrue(any("url" in v.lower() for v in violations))


class AuditLoggingTest(SecurityTestCase):
    """Test audit logging functionality"""
    
    def setUp(self):
        super().setUp()
        self.auditor = WebSocketAuditor()
    
    def test_connection_event_logging(self):
        """Test logging of connection events"""
        async def test():
            context = AuditContext(
                user=self.client_user,
                connection_id="test_conn_123",
                ip_address="127.0.0.1",
                user_agent="Test Agent"
            )
            
            # Log connection opened
            await self.auditor.log_connection_event(
                "CONNECTION_OPENED",
                context,
                {"test_data": "value"}
            )
            
            # Check that audit log was created
            audit_logs = await database_sync_to_async(list)(
                MessageAuditLog.objects.filter(connection_id="test_conn_123")
            )
            self.assertEqual(len(audit_logs), 1)
            self.assertEqual(audit_logs[0].event_type, "CONNECTION_OPENED")
            self.assertEqual(audit_logs[0].user, self.client_user)
        
        asyncio.run(test())
    
    def test_message_event_logging(self):
        """Test logging of message events"""
        async def test():
            context = AuditContext(
                user=self.client_user,
                connection_id="test_conn_456",
                thread_id=123,
                message_id=456
            )
            
            message_content = "Test message for audit logging"
            
            # Log message sent
            await self.auditor.log_message_event(
                "MESSAGE_SENT",
                context,
                message_content,
                {"additional": "data"}
            )
            
            # Check audit log
            audit_logs = await database_sync_to_async(list)(
                MessageAuditLog.objects.filter(
                    connection_id="test_conn_456",
                    event_type="MESSAGE_SENT"
                )
            )
            self.assertEqual(len(audit_logs), 1)
            self.assertEqual(audit_logs[0].thread_id, 123)
            self.assertEqual(audit_logs[0].message_id, 456)
            self.assertEqual(audit_logs[0].content_length, len(message_content))
        
        asyncio.run(test())
    
    def test_security_event_logging(self):
        """Test logging of security events"""
        async def test():
            context = AuditContext(
                user=self.client_user,
                connection_id="test_conn_789",
                ip_address="192.168.1.100"
            )
            
            # Log security event
            await self.auditor.log_security_event(
                "RATE_LIMITED",
                context,
                "User exceeded rate limit",
                {"limit_type": "message", "count": 15},
                severity="HIGH",
                risk_score=80
            )
            
            # Check audit log
            audit_logs = await database_sync_to_async(list)(
                MessageAuditLog.objects.filter(
                    connection_id="test_conn_789",
                    is_suspicious=True
                )
            )
            self.assertEqual(len(audit_logs), 1)
            self.assertEqual(audit_logs[0].risk_score, 80)
            self.assertTrue(audit_logs[0].is_suspicious)
        
        asyncio.run(test())
    
    def test_connection_audit_log_creation(self):
        """Test creation of connection audit logs"""
        async def test():
            context = AuditContext(
                user=self.admin_user,
                connection_id="audit_test_conn",
                ip_address="10.0.0.1",
                user_agent="Test Browser",
                origin="https://test.com"
            )
            
            # Log connection opened (should create connection record)
            await self.auditor.log_connection_event(
                "CONNECTION_OPENED",
                context,
                {"session_data": "test"}
            )
            
            # Check connection audit log
            conn_logs = await database_sync_to_async(list)(
                ConnectionAuditLog.objects.filter(connection_id="audit_test_conn")
            )
            self.assertEqual(len(conn_logs), 1)
            self.assertEqual(conn_logs[0].user, self.admin_user)
            self.assertEqual(conn_logs[0].ip_address, "10.0.0.1")
        
        asyncio.run(test())


class IntegrationTest(SecurityTestCase):
    """Integration tests for complete security stack"""
    
    def test_security_middleware_integration(self):
        """Test security middleware with all components"""
        async def test():
            # Mock scope with all security components
            scope = {
                'type': 'websocket',
                'user': self.client_user,
                'client_info': {
                    'ip_address': '127.0.0.1',
                    'user_agent': 'Test Client',
                    'origin': 'https://test.com'
                }
            }
            
            # Create security middleware
            from ..security_middleware import SecurityMiddleware
            middleware = SecurityMiddleware(None)
            
            # Test message validation
            message_data = {
                'content': 'This is a valid test message',
                'type': 'message'
            }
            
            is_valid = await middleware.validate_message(
                message_data,
                self.client_user,
                scope['client_info']
            )
            
            self.assertTrue(is_valid)
            
            # Test with malicious content
            malicious_message = {
                'content': '<script>alert("xss")</script>',
                'type': 'message'
            }
            
            is_malicious_valid = await middleware.validate_message(
                malicious_message,
                self.client_user,
                scope['client_info']
            )
            
            self.assertFalse(is_malicious_valid)
        
        asyncio.run(test())
    
    def test_end_to_end_security_flow(self):
        """Test complete security flow from authentication to audit"""
        async def test():
            # 1. Authenticate user
            middleware = JWTAuthMiddleware(None)
            scope = {
                'type': 'websocket',
                'query_string': f'token={self.admin_token}'.encode(),
                'headers': [],
                'client': ['127.0.0.1', 12345],
            }
            
            client_info = middleware._extract_client_info(scope)
            user, token_info = await middleware._authenticate_user(scope, client_info)
            
            self.assertEqual(user, self.admin_user)
            self.assertIsNotNone(token_info)
            
            # 2. Check permissions
            permission_checker = ThreadPermission(user)
            can_view_thread = await permission_checker.has_permission(
                MessageAction.VIEW_THREAD,
                thread_id=123
            )
            self.assertTrue(can_view_thread)
            
            # 3. Encrypt message
            message_content = "Confidential admin message"
            encrypted_content = encrypt_message(
                message_content,
                user=user,
                thread_id=123
            )
            self.assertNotEqual(encrypted_content, message_content)
            
            # 4. Decrypt message
            decrypted_content = decrypt_message(
                encrypted_content,
                user=user,
                thread_id=123
            )
            self.assertEqual(decrypted_content, message_content)
            
            # 5. Audit logging
            auditor = WebSocketAuditor()
            context = AuditContext(
                user=user,
                connection_id="e2e_test_conn",
                thread_id=123,
                ip_address="127.0.0.1"
            )
            
            await auditor.log_message_event(
                "MESSAGE_SENT",
                context,
                message_content,
                {"encrypted": True}
            )
            
            # Verify audit log
            audit_logs = await database_sync_to_async(list)(
                MessageAuditLog.objects.filter(connection_id="e2e_test_conn")
            )
            self.assertEqual(len(audit_logs), 1)
            self.assertEqual(audit_logs[0].user, user)
            self.assertEqual(audit_logs[0].thread_id, 123)
        
        asyncio.run(test())


# Performance and stress tests
class SecurityPerformanceTest(SecurityTestCase):
    """Performance tests for security components"""
    
    def test_encryption_performance(self):
        """Test encryption performance with various message sizes"""
        encryption = MessageEncryption()
        
        # Test different message sizes
        sizes = [100, 1000, 10000, 50000]  # bytes
        
        for size in sizes:
            message = "A" * size
            
            start_time = time.time()
            encrypted = encryption.encrypt_message_content(message)
            encrypt_time = time.time() - start_time
            
            start_time = time.time()
            decrypted = encryption.decrypt_message_content(encrypted)
            decrypt_time = time.time() - start_time
            
            self.assertEqual(decrypted, message)
            
            # Performance assertions (adjust based on requirements)
            self.assertLess(encrypt_time, 1.0, f"Encryption too slow for {size} bytes")
            self.assertLess(decrypt_time, 1.0, f"Decryption too slow for {size} bytes")
    
    def test_rate_limiter_performance(self):
        """Test rate limiter performance under load"""
        async def test():
            from ..security_middleware import RateLimitConfig
            config = RateLimitConfig(messages_per_minute=100, burst_limit=20)
            rate_limiter = RateLimiter(config)
            
            identifier = "performance_test_user"
            
            start_time = time.time()
            
            # Simulate high load
            for i in range(50):
                await rate_limiter.check_message_rate(identifier)
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Should handle 50 rate limit checks in reasonable time
            self.assertLess(total_time, 2.0, "Rate limiter performance too slow")
        
        asyncio.run(test())


if __name__ == '__main__':
    import unittest
    unittest.main()