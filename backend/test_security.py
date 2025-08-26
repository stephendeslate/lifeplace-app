#!/usr/bin/env python3
"""
Simple security functionality test script
Tests the basic functionality of our security improvements
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

def test_encryption():
    """Test the encryption utilities"""
    print("Testing encryption functionality...")
    
    try:
        # Mock Django settings for testing
        class MockSettings:
            SECRET_KEY = "test-secret-key-for-testing-purposes"
        
        import sys
        sys.modules['django.conf'] = type('MockModule', (), {'settings': MockSettings()})
        
        from core.utils.encryption import encrypt_data, decrypt_data
        
        # Test data
        test_data = {'stripe_secret': 'sk_test_123456789', 'publishable_key': 'pk_test_987654321'}
        
        # Encrypt
        encrypted = encrypt_data(test_data)
        print(f"✓ Encryption successful: {len(encrypted)} characters")
        
        # Decrypt  
        decrypted = decrypt_data(encrypted)
        print(f"✓ Decryption successful: {decrypted}")
        
        # Verify data integrity
        assert decrypted == test_data, "Decrypted data doesn't match original"
        print("✓ Data integrity verified")
        
        return True
        
    except Exception as e:
        print(f"✗ Encryption test failed: {str(e)}")
        return False

def test_input_validation():
    """Test the input validation utilities"""
    print("\nTesting input validation...")
    
    try:
        from core.utils.security import (
            validate_email_format, 
            validate_password_strength,
            sanitize_input
        )
        
        # Test email validation
        assert validate_email_format("test@example.com"), "Valid email should pass"
        assert not validate_email_format("invalid-email"), "Invalid email should fail"
        assert not validate_email_format("test@"), "Incomplete email should fail"
        print("✓ Email validation working")
        
        # Test password strength
        weak_result = validate_password_strength("123")
        assert not weak_result['is_valid'], "Weak password should fail"
        print("✓ Weak password detection working")
        
        strong_result = validate_password_strength("StrongP@ssw0rd123")
        assert strong_result['is_valid'], "Strong password should pass"
        print("✓ Strong password detection working")
        
        # Test input sanitization
        dirty_input = "<script>alert('xss')</script>Normal text"
        clean_output = sanitize_input(dirty_input)
        assert "<script>" not in clean_output, "Script tags should be removed"
        assert "Normal text" in clean_output, "Safe text should remain"
        print("✓ Input sanitization working")
        
        return True
        
    except Exception as e:
        print(f"✗ Input validation test failed: {str(e)}")
        return False

def test_file_validation():
    """Test file upload validation"""
    print("\nTesting file validation...")
    
    try:
        from core.utils.security import validate_file_upload
        
        # Mock file object
        class MockFile:
            def __init__(self, name, content_type, size):
                self.name = name
                self.content_type = content_type
                self.size = size
        
        # Test allowed file types
        pdf_file = MockFile("document.pdf", "application/pdf", 1024*1024)  # 1MB
        result = validate_file_upload(pdf_file, allowed_types=["application/pdf"], max_size_mb=10)
        assert result['is_valid'], "PDF should be allowed"
        print("✓ Allowed file type validation working")
        
        # Test disallowed file types
        exe_file = MockFile("malware.exe", "application/x-executable", 1024*1024)
        result = validate_file_upload(exe_file, allowed_types=["application/pdf"], max_size_mb=10)
        assert not result['is_valid'], "Executable should be rejected"
        print("✓ Disallowed file type rejection working")
        
        # Test file size limits
        large_file = MockFile("huge.pdf", "application/pdf", 100*1024*1024)  # 100MB
        result = validate_file_upload(large_file, max_size_mb=10)
        assert not result['is_valid'], "Large file should be rejected"
        print("✓ File size validation working")
        
        return True
        
    except Exception as e:
        print(f"✗ File validation test failed: {str(e)}")
        return False

def test_security_logging():
    """Test security logging structure"""
    print("\nTesting security logging...")
    
    try:
        from core.utils.security_logging import SecurityEventType, SecuritySeverity
        
        # Test that enum values are accessible
        assert hasattr(SecurityEventType, 'LOGIN_SUCCESS'), "LOGIN_SUCCESS should exist"
        assert hasattr(SecurityEventType, 'LOGIN_FAILURE'), "LOGIN_FAILURE should exist"
        assert hasattr(SecuritySeverity, 'HIGH'), "HIGH severity should exist"
        print("✓ Security event types and severities defined")
        
        # Test logging structure (without database)
        from core.utils.security_logging import SecurityLogger
        logger = SecurityLogger()
        assert hasattr(logger, 'log_event'), "log_event method should exist"
        print("✓ Security logger structure valid")
        
        return True
        
    except Exception as e:
        print(f"✗ Security logging test failed: {str(e)}")
        return False

def main():
    """Run all security tests"""
    print("🔒 Running Security Validation Tests")
    print("=" * 50)
    
    tests = [
        test_encryption,
        test_input_validation, 
        test_file_validation,
        test_security_logging
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"Security Tests: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All security improvements validated successfully!")
        return 0
    else:
        print("⚠️  Some tests failed - review implementation")
        return 1

if __name__ == "__main__":
    sys.exit(main())