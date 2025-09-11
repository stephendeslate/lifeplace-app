"""
Message Encryption Service
Provides field-level encryption for sensitive message content using AES encryption
"""

import base64
import hashlib
import logging
from typing import Optional, Union, Dict, Any
from datetime import datetime

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from core.utils.security_logging import SecurityLogger, SecurityEventType, SecuritySeverity

logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


class MessageEncryptionError(Exception):
    """Custom exception for encryption-related errors"""
    pass


class MessageEncryption:
    """
    Message encryption service using Fernet (AES 128 in CBC mode)
    Provides field-level encryption for sensitive message content
    """
    
    def __init__(self):
        self._fernet = None
        self._initialize_encryption()
    
    def _initialize_encryption(self):
        """Initialize encryption with key from settings"""
        encryption_key = getattr(settings, 'FIELD_ENCRYPTION_KEY', None)
        
        if not encryption_key:
            if settings.DEBUG:
                # Generate a warning key for development
                logger.warning("No FIELD_ENCRYPTION_KEY found. Using development key.")
                encryption_key = 'dev-key-not-for-production-use-only'
            else:
                raise ImproperlyConfigured(
                    "FIELD_ENCRYPTION_KEY setting is required for message encryption"
                )
        
        # Derive a proper Fernet key from the provided key
        self._fernet = self._create_fernet_key(encryption_key)
    
    def _create_fernet_key(self, password: str) -> Fernet:
        """Create a Fernet encryption key from password"""
        # Use a fixed salt for consistency (in production, you might want per-message salts)
        salt = b'lifeplace_messaging_salt_2024'
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return Fernet(key)
    
    def encrypt_message_content(self, content: str, context: Optional[Dict] = None) -> str:
        """
        Encrypt message content
        
        Args:
            content: Plain text message content
            context: Additional context for logging
            
        Returns:
            Encrypted content as base64 string
        """
        if not content:
            return content
        
        try:
            # Encrypt the content
            encrypted_bytes = self._fernet.encrypt(content.encode('utf-8'))
            encrypted_content = base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
            
            # Log encryption (without content for security)
            self._log_encryption_event(
                "Message content encrypted",
                SecuritySeverity.LOW,
                context or {},
                success=True
            )
            
            return encrypted_content
            
        except Exception as e:
            logger.error(f"Failed to encrypt message content: {str(e)}")
            self._log_encryption_event(
                f"Message encryption failed: {str(e)}",
                SecuritySeverity.HIGH,
                context or {},
                success=False
            )
            raise MessageEncryptionError(f"Encryption failed: {str(e)}")
    
    def decrypt_message_content(self, encrypted_content: str, context: Optional[Dict] = None) -> str:
        """
        Decrypt message content
        
        Args:
            encrypted_content: Encrypted content as base64 string
            context: Additional context for logging
            
        Returns:
            Decrypted plain text content
        """
        if not encrypted_content:
            return encrypted_content
        
        try:
            # Decode from base64 and decrypt
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_content.encode('utf-8'))
            decrypted_bytes = self._fernet.decrypt(encrypted_bytes)
            decrypted_content = decrypted_bytes.decode('utf-8')
            
            # Log decryption (without content for security)
            self._log_encryption_event(
                "Message content decrypted",
                SecuritySeverity.LOW,
                context or {},
                success=True
            )
            
            return decrypted_content
            
        except InvalidToken:
            logger.error("Invalid token during message decryption")
            self._log_encryption_event(
                "Message decryption failed: Invalid token",
                SecuritySeverity.HIGH,
                context or {},
                success=False
            )
            raise MessageEncryptionError("Invalid encryption token")
        except Exception as e:
            logger.error(f"Failed to decrypt message content: {str(e)}")
            self._log_encryption_event(
                f"Message decryption failed: {str(e)}",
                SecuritySeverity.HIGH,
                context or {},
                success=False
            )
            raise MessageEncryptionError(f"Decryption failed: {str(e)}")
    
    def encrypt_sensitive_data(self, data: Dict[str, Any], fields_to_encrypt: list) -> Dict[str, Any]:
        """
        Encrypt specific fields in a data dictionary
        
        Args:
            data: Dictionary containing data
            fields_to_encrypt: List of field names to encrypt
            
        Returns:
            Dictionary with specified fields encrypted
        """
        encrypted_data = data.copy()
        
        for field in fields_to_encrypt:
            if field in encrypted_data and encrypted_data[field]:
                try:
                    encrypted_data[field] = self.encrypt_message_content(
                        str(encrypted_data[field]),
                        context={'field': field, 'action': 'field_encryption'}
                    )
                except MessageEncryptionError:
                    # Log error but don't fail the entire operation
                    logger.error(f"Failed to encrypt field: {field}")
                    # Keep original value or remove field based on your security policy
                    # For now, we'll keep the original value
                    pass
        
        return encrypted_data
    
    def decrypt_sensitive_data(self, data: Dict[str, Any], fields_to_decrypt: list) -> Dict[str, Any]:
        """
        Decrypt specific fields in a data dictionary
        
        Args:
            data: Dictionary containing encrypted data
            fields_to_decrypt: List of field names to decrypt
            
        Returns:
            Dictionary with specified fields decrypted
        """
        decrypted_data = data.copy()
        
        for field in fields_to_decrypt:
            if field in decrypted_data and decrypted_data[field]:
                try:
                    decrypted_data[field] = self.decrypt_message_content(
                        decrypted_data[field],
                        context={'field': field, 'action': 'field_decryption'}
                    )
                except MessageEncryptionError:
                    # Log error but don't fail the entire operation
                    logger.error(f"Failed to decrypt field: {field}")
                    # Keep encrypted value or set to placeholder
                    decrypted_data[field] = "[DECRYPTION_ERROR]"
        
        return decrypted_data
    
    def is_encrypted(self, content: str) -> bool:
        """
        Check if content appears to be encrypted
        
        Args:
            content: Content to check
            
        Returns:
            True if content appears encrypted, False otherwise
        """
        if not content:
            return False
        
        try:
            # Try to decode as base64
            decoded = base64.urlsafe_b64decode(content.encode('utf-8'))
            # If it decodes and has reasonable length, might be encrypted
            return len(decoded) > 16  # Fernet adds overhead
        except Exception:
            return False
    
    def get_content_hash(self, content: str) -> str:
        """
        Get a hash of content for integrity checking
        
        Args:
            content: Content to hash
            
        Returns:
            SHA-256 hash of content
        """
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def _log_encryption_event(self, description: str, severity: str, context: Dict, success: bool):
        """Log encryption/decryption events"""
        security_logger.log_event(
            event_type=SecurityEventType.DATA_MODIFICATION if success else SecurityEventType.SUSPICIOUS_ACTIVITY,
            description=description,
            user=context.get('user'),
            severity=severity,
            details={
                'encryption_operation': True,
                'success': success,
                'context': {k: v for k, v in context.items() if k != 'user'},
                'timestamp': datetime.now().isoformat(),
            },
            risk_score=5 if success else 50
        )


class EncryptedField:
    """
    Field descriptor for automatic encryption/decryption of model fields
    Can be used with Django models to automatically encrypt/decrypt fields
    """
    
    def __init__(self, field_name: str):
        self.field_name = field_name
        self.encrypted_field_name = f"{field_name}_encrypted"
        self.encryption_service = MessageEncryption()
    
    def __get__(self, instance, owner):
        if instance is None:
            return self
        
        # Get encrypted value from the model
        encrypted_value = getattr(instance, self.encrypted_field_name, None)
        
        if not encrypted_value:
            return None
        
        try:
            return self.encryption_service.decrypt_message_content(
                encrypted_value,
                context={'model': owner.__name__, 'field': self.field_name}
            )
        except MessageEncryptionError:
            logger.error(f"Failed to decrypt {self.field_name} for {owner.__name__}")
            return "[DECRYPTION_ERROR]"
    
    def __set__(self, instance, value):
        if value is None:
            setattr(instance, self.encrypted_field_name, None)
            return
        
        try:
            encrypted_value = self.encryption_service.encrypt_message_content(
                str(value),
                context={'model': type(instance).__name__, 'field': self.field_name}
            )
            setattr(instance, self.encrypted_field_name, encrypted_value)
        except MessageEncryptionError:
            logger.error(f"Failed to encrypt {self.field_name} for {type(instance).__name__}")
            # In case of encryption failure, you might want to:
            # 1. Store as plain text (security risk)
            # 2. Raise an exception (might break functionality)
            # 3. Store a placeholder (data loss)
            # For now, we'll raise an exception
            raise


# Global encryption service instance
message_encryption = MessageEncryption()


# Utility functions for common operations
def encrypt_message(content: str, user=None, thread_id=None) -> str:
    """
    Convenience function to encrypt message content
    
    Args:
        content: Message content to encrypt
        user: User performing the action (for logging)
        thread_id: Thread ID (for logging)
        
    Returns:
        Encrypted content
    """
    context = {}
    if user:
        context['user'] = user
    if thread_id:
        context['thread_id'] = thread_id
    
    return message_encryption.encrypt_message_content(content, context)


def decrypt_message(encrypted_content: str, user=None, thread_id=None) -> str:
    """
    Convenience function to decrypt message content
    
    Args:
        encrypted_content: Encrypted message content
        user: User performing the action (for logging)
        thread_id: Thread ID (for logging)
        
    Returns:
        Decrypted content
    """
    context = {}
    if user:
        context['user'] = user
    if thread_id:
        context['thread_id'] = thread_id
    
    return message_encryption.decrypt_message_content(encrypted_content, context)


def is_content_encrypted(content: str) -> bool:
    """Check if content is encrypted"""
    return message_encryption.is_encrypted(content)


# Key rotation utilities (for future use)
class KeyRotationManager:
    """
    Manager for encryption key rotation
    This is a placeholder for future key rotation functionality
    """
    
    def __init__(self):
        self.current_key_version = 1
    
    def rotate_keys(self):
        """Rotate encryption keys"""
        # This would implement key rotation logic
        # - Generate new key
        # - Re-encrypt existing data
        # - Update key version
        pass
    
    def get_key_for_version(self, version: int):
        """Get encryption key for specific version"""
        # This would return the appropriate key for a given version
        pass