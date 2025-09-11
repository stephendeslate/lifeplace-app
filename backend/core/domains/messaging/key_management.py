"""
Key Management System for Message Encryption
Handles encryption key lifecycle, rotation, and secure storage
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

from django.conf import settings
from django.core.cache import cache
from django.db import models, transaction
from django.utils import timezone

from core.utils.models import BaseModel
from core.utils.security_logging import SecurityLogger, SecurityEventType, SecuritySeverity

logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


class EncryptionKey(BaseModel):
    """Model to store encryption key metadata"""
    
    key_id = models.CharField(max_length=64, unique=True, db_index=True)
    version = models.IntegerField(db_index=True)
    algorithm = models.CharField(max_length=50, default='AES-256-GCM')
    purpose = models.CharField(max_length=100)  # 'message_content', 'file_storage', etc.
    
    # Key lifecycle
    created_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    retired_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Key status
    is_active = models.BooleanField(default=False)
    is_primary = models.BooleanField(default=False)  # Primary key for new encryptions
    
    # Security metadata
    rotation_reason = models.CharField(max_length=200, blank=True)
    security_level = models.CharField(max_length=20, default='STANDARD')
    
    # Key derivation info (for auditing, not the actual key)
    key_derivation_info = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'messaging_encryption_keys'
        ordering = ['-version']
        indexes = [
            models.Index(fields=['purpose', 'is_active']),
            models.Index(fields=['is_primary', 'purpose']),
            models.Index(fields=['version', 'purpose']),
        ]
    
    def __str__(self):
        return f"Key {self.key_id} v{self.version} ({self.purpose})"


class KeyRotationLog(BaseModel):
    """Log of key rotation events"""
    
    old_key = models.ForeignKey(EncryptionKey, on_delete=models.CASCADE, related_name='rotation_logs_old')
    new_key = models.ForeignKey(EncryptionKey, on_delete=models.CASCADE, related_name='rotation_logs_new')
    
    rotation_reason = models.CharField(max_length=200)
    initiated_by = models.CharField(max_length=150)  # User or system
    
    # Rotation statistics
    records_migrated = models.IntegerField(default=0)
    migration_duration = models.DurationField(null=True, blank=True)
    
    # Status
    rotation_status = models.CharField(
        max_length=20,
        choices=[
            ('INITIATED', 'Initiated'),
            ('IN_PROGRESS', 'In Progress'),
            ('COMPLETED', 'Completed'),
            ('FAILED', 'Failed'),
            ('ROLLED_BACK', 'Rolled Back'),
        ],
        default='INITIATED'
    )
    
    error_details = models.JSONField(default=dict, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'messaging_key_rotation_log'
        ordering = ['-created_at']


class KeyManager:
    """
    Manages encryption keys for the messaging system
    Handles key generation, rotation, and secure access
    """
    
    def __init__(self):
        self.cache_prefix = 'messaging_keys:'
        self.cache_timeout = 3600  # 1 hour
        self._current_keys = {}
    
    def get_primary_key(self, purpose: str = 'message_content') -> Fernet:
        """
        Get the primary encryption key for a specific purpose
        
        Args:
            purpose: Key purpose (e.g., 'message_content', 'file_storage')
            
        Returns:
            Fernet encryption object
        """
        cache_key = f"{self.cache_prefix}primary:{purpose}"
        
        # Try cache first
        cached_key = cache.get(cache_key)
        if cached_key:
            return Fernet(cached_key.encode())
        
        # Get from database
        try:
            key_record = EncryptionKey.objects.filter(
                purpose=purpose,
                is_primary=True,
                is_active=True
            ).first()
            
            if not key_record:
                # Auto-generate if no primary key exists
                logger.warning(f"No primary key found for {purpose}, generating new key")
                return self._generate_primary_key(purpose)
            
            # Derive the actual key
            fernet_key = self._derive_key(key_record)
            
            # Cache for performance
            cache.set(cache_key, fernet_key.decode(), timeout=self.cache_timeout)
            
            return Fernet(fernet_key)
            
        except Exception as e:
            logger.error(f"Failed to get primary key for {purpose}: {e}")
            # Fallback to settings-based key for development
            return self._get_fallback_key()
    
    def get_key_by_version(self, purpose: str, version: int) -> Optional[Fernet]:
        """
        Get a specific key version for decryption of old data
        
        Args:
            purpose: Key purpose
            version: Key version
            
        Returns:
            Fernet encryption object or None if not found
        """
        cache_key = f"{self.cache_prefix}version:{purpose}:{version}"
        
        # Try cache first
        cached_key = cache.get(cache_key)
        if cached_key:
            return Fernet(cached_key.encode())
        
        try:
            key_record = EncryptionKey.objects.filter(
                purpose=purpose,
                version=version,
                is_active=True
            ).first()
            
            if not key_record:
                logger.warning(f"Key not found: {purpose} v{version}")
                return None
            
            # Derive the actual key
            fernet_key = self._derive_key(key_record)
            
            # Cache for performance
            cache.set(cache_key, fernet_key.decode(), timeout=self.cache_timeout)
            
            return Fernet(fernet_key)
            
        except Exception as e:
            logger.error(f"Failed to get key {purpose} v{version}: {e}")
            return None
    
    def rotate_key(self, purpose: str, reason: str = "Scheduled rotation") -> EncryptionKey:
        """
        Rotate the encryption key for a specific purpose
        
        Args:
            purpose: Key purpose to rotate
            reason: Reason for rotation
            
        Returns:
            New encryption key record
        """
        try:
            with transaction.atomic():
                # Get current primary key
                old_key = EncryptionKey.objects.filter(
                    purpose=purpose,
                    is_primary=True,
                    is_active=True
                ).first()
                
                if not old_key:
                    logger.warning(f"No existing primary key for {purpose}, creating initial key")
                    return self._generate_primary_key(purpose)
                
                # Generate new key
                new_key = self._generate_new_key(purpose, old_key.version + 1)
                
                # Update old key status
                old_key.is_primary = False
                old_key.retired_at = timezone.now()
                old_key.rotation_reason = reason
                old_key.save()
                
                # Activate new key
                new_key.is_primary = True
                new_key.activated_at = timezone.now()
                new_key.save()
                
                # Log rotation
                rotation_log = KeyRotationLog.objects.create(
                    old_key=old_key,
                    new_key=new_key,
                    rotation_reason=reason,
                    initiated_by='system',  # Could be user if manually triggered
                    rotation_status='COMPLETED',
                    completed_at=timezone.now()
                )
                
                # Clear relevant caches
                self._clear_key_caches(purpose)
                
                # Log security event
                security_logger.log_event(
                    event_type=SecurityEventType.CONFIGURATION_CHANGED,
                    description=f"Encryption key rotated for {purpose}",
                    severity=SecuritySeverity.MEDIUM,
                    details={
                        'purpose': purpose,
                        'old_key_id': old_key.key_id,
                        'new_key_id': new_key.key_id,
                        'reason': reason,
                        'rotation_id': rotation_log.id
                    },
                    risk_score=20
                )
                
                logger.info(f"Key rotation completed for {purpose}: {old_key.key_id} -> {new_key.key_id}")
                return new_key
                
        except Exception as e:
            logger.error(f"Key rotation failed for {purpose}: {e}")
            # Log failure
            security_logger.log_event(
                event_type=SecurityEventType.CONFIGURATION_CHANGED,
                description=f"Encryption key rotation failed for {purpose}: {str(e)}",
                severity=SecuritySeverity.HIGH,
                details={
                    'purpose': purpose,
                    'reason': reason,
                    'error': str(e)
                },
                risk_score=70
            )
            raise
    
    def _generate_primary_key(self, purpose: str) -> Fernet:
        """Generate the first primary key for a purpose"""
        try:
            with transaction.atomic():
                key_record = self._generate_new_key(purpose, version=1)
                key_record.is_primary = True
                key_record.activated_at = timezone.now()
                key_record.save()
                
                logger.info(f"Generated initial primary key for {purpose}: {key_record.key_id}")
                return self._derive_key_fernet(key_record)
                
        except Exception as e:
            logger.error(f"Failed to generate primary key for {purpose}: {e}")
            raise
    
    def _generate_new_key(self, purpose: str, version: int) -> EncryptionKey:
        """Generate a new encryption key record"""
        # Generate a cryptographically secure key ID
        key_id = self._generate_key_id(purpose, version)
        
        # Create key record
        key_record = EncryptionKey.objects.create(
            key_id=key_id,
            version=version,
            purpose=purpose,
            algorithm='Fernet-AES-128-CBC',
            security_level='STANDARD',
            expires_at=timezone.now() + timedelta(days=365),  # 1 year expiry
            key_derivation_info={
                'method': 'PBKDF2-HMAC-SHA256',
                'iterations': 100000,
                'salt_length': 32,
                'key_length': 32
            }
        )
        
        return key_record
    
    def _derive_key(self, key_record: EncryptionKey) -> bytes:
        """Derive the actual encryption key from key record"""
        # Use key_id and settings to derive the actual key
        base_key = getattr(settings, 'FIELD_ENCRYPTION_KEY', 'development-key-only')
        
        # Create a deterministic but secure key derivation
        salt = f"lifeplace_messaging_{key_record.purpose}_{key_record.key_id}".encode()
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        derived_key = kdf.derive(base_key.encode())
        return base64.urlsafe_b64encode(derived_key)
    
    def _derive_key_fernet(self, key_record: EncryptionKey) -> Fernet:
        """Derive Fernet object from key record"""
        key_bytes = self._derive_key(key_record)
        return Fernet(key_bytes)
    
    def _generate_key_id(self, purpose: str, version: int) -> str:
        """Generate a unique key ID"""
        timestamp = datetime.now().isoformat()
        content = f"{purpose}_{version}_{timestamp}_{os.urandom(16).hex()}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]
    
    def _get_fallback_key(self) -> Fernet:
        """Get fallback key for development/emergency use"""
        base_key = getattr(settings, 'FIELD_ENCRYPTION_KEY', 'development-key-only')
        salt = b'lifeplace_messaging_fallback_salt'
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        derived_key = base64.urlsafe_b64encode(kdf.derive(base_key.encode()))
        return Fernet(derived_key)
    
    def _clear_key_caches(self, purpose: str):
        """Clear cached keys for a purpose"""
        cache_keys = [
            f"{self.cache_prefix}primary:{purpose}",
        ]
        
        # Also clear version-specific caches
        for version in range(1, 100):  # Reasonable range
            cache_keys.append(f"{self.cache_prefix}version:{purpose}:{version}")
        
        cache.delete_many(cache_keys)
    
    def get_key_info(self, purpose: str) -> Dict:
        """Get information about keys for a purpose"""
        keys = EncryptionKey.objects.filter(purpose=purpose).order_by('-version')
        
        return {
            'purpose': purpose,
            'total_keys': keys.count(),
            'active_keys': keys.filter(is_active=True).count(),
            'primary_key': {
                'key_id': keys.filter(is_primary=True).first().key_id if keys.filter(is_primary=True).exists() else None,
                'version': keys.filter(is_primary=True).first().version if keys.filter(is_primary=True).exists() else None,
            },
            'latest_version': keys.first().version if keys.exists() else 0,
            'rotation_history': list(KeyRotationLog.objects.filter(
                new_key__purpose=purpose
            ).order_by('-created_at')[:5].values(
                'rotation_reason', 'rotation_status', 'created_at'
            ))
        }
    
    def cleanup_old_keys(self, purpose: str, keep_versions: int = 5):
        """Clean up old, unused encryption keys"""
        try:
            # Get keys older than keep_versions, excluding primary
            old_keys = EncryptionKey.objects.filter(
                purpose=purpose,
                is_primary=False,
                is_active=True
            ).order_by('-version')[keep_versions:]
            
            if not old_keys:
                logger.info(f"No old keys to cleanup for {purpose}")
                return
            
            # Retire old keys (don't delete in case old data needs decryption)
            with transaction.atomic():
                for key in old_keys:
                    key.is_active = False
                    key.retired_at = timezone.now()
                    key.rotation_reason = 'Automated cleanup'
                    key.save()
                    
                    logger.info(f"Retired old key: {key.key_id}")
            
            # Clear caches
            self._clear_key_caches(purpose)
            
            logger.info(f"Cleaned up {len(old_keys)} old keys for {purpose}")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old keys for {purpose}: {e}")


# Global key manager instance
key_manager = KeyManager()


# Convenience functions
def get_message_encryption_key() -> Fernet:
    """Get the primary key for message content encryption"""
    return key_manager.get_primary_key('message_content')


def rotate_message_key(reason: str = "Manual rotation") -> EncryptionKey:
    """Rotate the message encryption key"""
    return key_manager.rotate_key('message_content', reason)


def get_key_info() -> Dict:
    """Get information about message encryption keys"""
    return key_manager.get_key_info('message_content')


# Management command utilities
class KeyManagementCommand:
    """Utilities for key management commands"""
    
    @staticmethod
    def auto_rotate_keys():
        """Automatically rotate keys based on age"""
        purposes = ['message_content']
        
        for purpose in purposes:
            try:
                primary_key = EncryptionKey.objects.filter(
                    purpose=purpose,
                    is_primary=True,
                    is_active=True
                ).first()
                
                if not primary_key:
                    logger.warning(f"No primary key found for {purpose}")
                    continue
                
                # Check if key is older than 90 days
                age = timezone.now() - primary_key.created_at
                if age > timedelta(days=90):
                    logger.info(f"Auto-rotating {purpose} key (age: {age.days} days)")
                    key_manager.rotate_key(purpose, "Automatic rotation - key age")
                else:
                    logger.info(f"Key {purpose} is current (age: {age.days} days)")
                    
            except Exception as e:
                logger.error(f"Auto-rotation failed for {purpose}: {e}")
    
    @staticmethod
    def emergency_key_rotation(purpose: str = 'message_content'):
        """Emergency key rotation (e.g., after security incident)"""
        try:
            logger.warning(f"Emergency key rotation initiated for {purpose}")
            new_key = key_manager.rotate_key(purpose, "Emergency rotation - security incident")
            
            # Additional security logging
            security_logger.log_event(
                event_type=SecurityEventType.CONFIGURATION_CHANGED,
                description=f"EMERGENCY key rotation completed for {purpose}",
                severity=SecuritySeverity.CRITICAL,
                details={
                    'purpose': purpose,
                    'new_key_id': new_key.key_id,
                    'rotation_type': 'emergency'
                },
                risk_score=90
            )
            
            return new_key
            
        except Exception as e:
            logger.error(f"Emergency key rotation failed: {e}")
            raise