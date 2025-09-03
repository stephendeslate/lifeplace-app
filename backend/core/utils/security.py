# backend/core/utils/security.py
import re
import logging
import hashlib
import hmac
from typing import Any, Dict, List, Optional, Union
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags
from django.conf import settings
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

logger = logging.getLogger(__name__)


class LoginRateThrottle(AnonRateThrottle):
    """Rate limiting for login attempts"""
    
    def __init__(self):
        super().__init__()
        # Disable throttling in development
        if settings.DEBUG:
            self.rate = '999999/hour'
        else:
            self.rate = '10/hour'  # 10 login attempts per hour per IP


class RegistrationRateThrottle(AnonRateThrottle):
    """Rate limiting for registration attempts"""
    
    def __init__(self):
        super().__init__()
        # Disable throttling in development
        if settings.DEBUG:
            self.rate = '999999/hour'
        else:
            self.rate = '5/hour'  # 5 registrations per hour per IP


class AdminActionThrottle(UserRateThrottle):
    """Rate limiting for admin actions"""
    
    def __init__(self):
        super().__init__()
        # Disable throttling in development
        if settings.DEBUG:
            self.rate = '999999/hour'
        else:
            self.rate = '200/hour'  # 200 admin actions per hour per user


def sanitize_input(value: Any, max_length: int = None, allow_html: bool = False) -> str:
    """
    Sanitize user input to prevent XSS and other injection attacks
    
    Args:
        value: Input value to sanitize
        max_length: Maximum allowed length
        allow_html: Whether to allow HTML tags (default: False)
    
    Returns:
        Sanitized string
    """
    if value is None:
        return ""
    
    # Convert to string
    sanitized = str(value).strip()
    
    # Strip HTML tags unless explicitly allowed
    if not allow_html:
        sanitized = strip_tags(sanitized)
    
    # Limit length if specified
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
        logger.warning(f"Input truncated to {max_length} characters")
    
    # Remove null bytes and control characters
    sanitized = ''.join(char for char in sanitized if ord(char) > 31 or char in '\t\n\r')
    
    return sanitized


def validate_email_format(email: str) -> bool:
    """
    Validate email format using comprehensive regex
    
    Args:
        email: Email address to validate
    
    Returns:
        bool: True if email format is valid
    """
    if not email or len(email) > 254:  # RFC 5321 limit
        return False
    
    # Comprehensive email regex
    email_pattern = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    return bool(email_pattern.match(email))


def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Validate password strength and return detailed feedback
    
    Args:
        password: Password to validate
    
    Returns:
        dict: Validation result with is_valid flag and messages
    """
    result = {
        'is_valid': True,
        'messages': [],
        'score': 0  # Score out of 10
    }
    
    if not password:
        result['is_valid'] = False
        result['messages'].append("Password is required")
        return result
    
    # Length check
    if len(password) < 8:
        result['is_valid'] = False
        result['messages'].append("Password must be at least 8 characters long")
    elif len(password) >= 12:
        result['score'] += 2
    else:
        result['score'] += 1
    
    # Character variety checks
    if re.search(r'[a-z]', password):
        result['score'] += 1
    else:
        result['messages'].append("Password should contain lowercase letters")
    
    if re.search(r'[A-Z]', password):
        result['score'] += 1
    else:
        result['messages'].append("Password should contain uppercase letters")
    
    if re.search(r'\d', password):
        result['score'] += 1
    else:
        result['messages'].append("Password should contain numbers")
    
    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        result['score'] += 1
        result['messages'].append("Great! Password contains special characters")
    else:
        result['messages'].append("Password should contain special characters")
    
    # Common password check
    common_passwords = [
        'password', '123456', 'password123', 'admin', 'qwerty',
        'letmein', 'welcome', 'monkey', '1234567890'
    ]
    if password.lower() in common_passwords:
        result['is_valid'] = False
        result['messages'].append("Password is too common")
        result['score'] -= 2
    
    # Sequential or repeated characters
    if re.search(r'(.)\1{2,}', password):  # 3+ repeated characters
        result['messages'].append("Avoid repeated characters")
        result['score'] -= 1
    
    if re.search(r'(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)', password.lower()):
        result['messages'].append("Avoid sequential characters")
        result['score'] -= 1
    
    # Set overall validity based on score
    if result['score'] < 4:
        result['is_valid'] = False
        result['messages'].insert(0, "Password is too weak")
    
    return result


def validate_phone_number(phone: str) -> bool:
    """
    Validate phone number format
    
    Args:
        phone: Phone number to validate
    
    Returns:
        bool: True if phone format is valid
    """
    if not phone:
        return False
    
    # Remove common formatting
    cleaned = re.sub(r'[^\d+]', '', phone)
    
    # Basic validation - adjust pattern as needed
    phone_pattern = re.compile(r'^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$|^\+?[\d\-\s\(\)]{10,15}$')
    
    return bool(phone_pattern.match(cleaned))


def validate_file_upload(file, allowed_types: List[str] = None, max_size_mb: int = 10) -> Dict[str, Any]:
    """
    Validate uploaded file for security
    
    Args:
        file: Uploaded file object
        allowed_types: List of allowed MIME types
        max_size_mb: Maximum file size in MB
    
    Returns:
        dict: Validation result
    """
    result = {
        'is_valid': True,
        'messages': []
    }
    
    if not file:
        result['is_valid'] = False
        result['messages'].append("No file provided")
        return result
    
    # Check file size
    max_size_bytes = max_size_mb * 1024 * 1024
    if file.size > max_size_bytes:
        result['is_valid'] = False
        result['messages'].append(f"File size exceeds {max_size_mb}MB limit")
    
    # Check file type if specified
    if allowed_types:
        file_type = getattr(file, 'content_type', '')
        if file_type not in allowed_types:
            result['is_valid'] = False
            result['messages'].append(f"File type '{file_type}' not allowed")
    
    # Check for potentially dangerous file extensions
    dangerous_extensions = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.sh'
    ]
    
    filename = getattr(file, 'name', '').lower()
    if any(filename.endswith(ext) for ext in dangerous_extensions):
        result['is_valid'] = False
        result['messages'].append("File type not allowed for security reasons")
    
    # Additional security checks could be added here:
    # - Virus scanning
    # - File content validation
    # - Image validation for image files
    
    return result


def secure_compare(a: str, b: str) -> bool:
    """
    Timing-safe string comparison
    
    Args:
        a: First string
        b: Second string
    
    Returns:
        bool: True if strings are equal
    """
    return hmac.compare_digest(str(a), str(b))


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token
    
    Args:
        length: Length of the token in bytes
    
    Returns:
        str: Hex-encoded secure token
    """
    import secrets
    return secrets.token_hex(length)


def validate_request_data(data: Dict[str, Any], required_fields: List[str] = None, 
                         optional_fields: List[str] = None) -> Dict[str, Any]:
    """
    Validate request data structure and required fields
    
    Args:
        data: Request data dictionary
        required_fields: List of required field names
        optional_fields: List of optional field names
    
    Returns:
        dict: Validation result
    """
    result = {
        'is_valid': True,
        'messages': [],
        'cleaned_data': {}
    }
    
    required_fields = required_fields or []
    optional_fields = optional_fields or []
    allowed_fields = required_fields + optional_fields
    
    # Check for required fields
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == '':
            result['is_valid'] = False
            result['messages'].append(f"Field '{field}' is required")
        else:
            result['cleaned_data'][field] = sanitize_input(data[field])
    
    # Process optional fields
    for field in optional_fields:
        if field in data and data[field] is not None:
            result['cleaned_data'][field] = sanitize_input(data[field])
    
    # Check for unexpected fields (potential injection attempt)
    unexpected_fields = set(data.keys()) - set(allowed_fields)
    if unexpected_fields:
        logger.warning(f"Unexpected fields in request: {unexpected_fields}")
        result['messages'].append("Request contains unexpected fields")
        # Don't fail validation, just log and warn
    
    return result


class SecurityMiddleware:
    """Custom security middleware for additional protection"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Add security headers
        response = self.get_response(request)
        
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        return response