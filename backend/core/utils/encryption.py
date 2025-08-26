# backend/core/utils/encryption.py
import json
import base64
import logging
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    _instance = None
    _fernet = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._fernet is None:
            self._initialize_encryption()
    
    def _initialize_encryption(self):
        """Initialize the encryption service with a key derived from settings"""
        encryption_key = getattr(settings, 'FIELD_ENCRYPTION_KEY', None)
        
        if not encryption_key:
            # For development, we'll generate a key based on SECRET_KEY
            # In production, this should be a dedicated environment variable
            if hasattr(settings, 'SECRET_KEY') and settings.SECRET_KEY:
                encryption_key = settings.SECRET_KEY
                logger.warning("Using SECRET_KEY for field encryption. Set FIELD_ENCRYPTION_KEY in production.")
            else:
                raise ImproperlyConfigured("No encryption key available. Set FIELD_ENCRYPTION_KEY or SECRET_KEY.")
        
        # Derive a proper encryption key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'lifeplace_encryption_salt',  # In production, use a random salt stored securely
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(encryption_key.encode()))
        self._fernet = Fernet(key)
    
    def encrypt(self, data: Any) -> str:
        """
        Encrypt data (converts to JSON if not string)
        
        Args:
            data: Data to encrypt
            
        Returns:
            str: Base64 encoded encrypted data
        """
        if data is None:
            return ""
        
        try:
            # Convert data to JSON string if it's not already a string
            if isinstance(data, str):
                json_data = data
            else:
                json_data = json.dumps(data, sort_keys=True)
            
            # Encrypt the data
            encrypted_data = self._fernet.encrypt(json_data.encode())
            
            # Return as base64 string for database storage
            return base64.urlsafe_b64encode(encrypted_data).decode()
            
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise ValueError("Data encryption failed")
    
    def decrypt(self, encrypted_data: str, return_json: bool = True) -> Any:
        """
        Decrypt data
        
        Args:
            encrypted_data: Base64 encoded encrypted data
            return_json: Whether to parse as JSON (default: True)
            
        Returns:
            Decrypted data (parsed as JSON if return_json=True)
        """
        if not encrypted_data:
            return {} if return_json else ""
        
        try:
            # Decode from base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            
            # Decrypt the data
            decrypted_data = self._fernet.decrypt(encrypted_bytes)
            json_data = decrypted_data.decode()
            
            if return_json:
                return json.loads(json_data)
            else:
                return json_data
                
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            # Return empty dict/string instead of raising to prevent data loss
            return {} if return_json else ""
    
    def is_encrypted(self, data: str) -> bool:
        """
        Check if data appears to be encrypted
        
        Args:
            data: String to check
            
        Returns:
            bool: True if data appears encrypted
        """
        try:
            # Try to base64 decode - encrypted data should be valid base64
            base64.urlsafe_b64decode(data.encode())
            return True
        except:
            return False


# Global encryption service instance
encryption_service = EncryptionService()


def encrypt_data(data: Any) -> str:
    """Convenience function to encrypt data"""
    return encryption_service.encrypt(data)


def decrypt_data(encrypted_data: str, return_json: bool = True) -> Any:
    """Convenience function to decrypt data"""
    return encryption_service.decrypt(encrypted_data, return_json)


class EncryptedJSONField:
    """Custom descriptor for encrypted JSON fields"""
    
    def __init__(self, field_name: str):
        self.field_name = field_name
        self.encrypted_field_name = f"_{field_name}_encrypted"
    
    def __get__(self, instance, owner):
        if instance is None:
            return self
        
        # Get encrypted data from the actual database field
        encrypted_data = getattr(instance, self.encrypted_field_name, "")
        
        # Decrypt and return
        return decrypt_data(encrypted_data)
    
    def __set__(self, instance, value):
        # Encrypt and store in the actual database field
        encrypted_data = encrypt_data(value)
        setattr(instance, self.encrypted_field_name, encrypted_data)
    
    def __delete__(self, instance):
        setattr(instance, self.encrypted_field_name, "")


# Django model field for encrypted JSON
from django.db import models


class EncryptedJSONField(models.TextField):
    """Django model field for encrypted JSON data"""
    
    def __init__(self, *args, **kwargs):
        # Store original default
        self._original_default = kwargs.get('default', dict)
        
        # Set database field default to empty string
        kwargs['default'] = ""
        kwargs['blank'] = True
        
        super().__init__(*args, **kwargs)
    
    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return self._original_default() if callable(self._original_default) else self._original_default
        
        return decrypt_data(value)
    
    def to_python(self, value):
        if value is None or value == "":
            return self._original_default() if callable(self._original_default) else self._original_default
        
        if isinstance(value, dict):
            return value
        
        # If it's a string, it might be encrypted or JSON
        if isinstance(value, str):
            if encryption_service.is_encrypted(value):
                return decrypt_data(value)
            else:
                # Try to parse as JSON (for migration compatibility)
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return self._original_default() if callable(self._original_default) else self._original_default
        
        return value
    
    def get_prep_value(self, value):
        if value is None:
            return ""
        
        # Encrypt the value before saving to database
        return encrypt_data(value)
    
    def value_to_string(self, obj):
        """Used for serialization"""
        value = self.value_from_object(obj)
        return encrypt_data(value)