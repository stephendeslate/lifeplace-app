# Generated migration for encrypting payment gateway configurations

from django.db import migrations
from core.utils.encryption import encrypt_data
import json


def encrypt_existing_configs(apps, schema_editor):
    """Encrypt existing payment gateway configurations"""
    PaymentGateway = apps.get_model('payments', 'PaymentGateway')
    
    for gateway in PaymentGateway.objects.all():
        if gateway.config:
            # If config is already a string (potentially encrypted), skip
            if isinstance(gateway.config, str):
                try:
                    # Try to parse as JSON to see if it's unencrypted
                    json.loads(gateway.config)
                    # If successful, it's unencrypted JSON string, encrypt it
                    encrypted_config = encrypt_data(gateway.config)
                    gateway.config = encrypted_config
                    gateway.save(update_fields=['config'])
                except (json.JSONDecodeError, TypeError):
                    # If parsing fails, it might already be encrypted or invalid
                    # Leave as is to avoid data corruption
                    pass
            elif isinstance(gateway.config, dict):
                # If it's a dict, encrypt it
                encrypted_config = encrypt_data(gateway.config)
                gateway.config = encrypted_config
                gateway.save(update_fields=['config'])


def decrypt_existing_configs(apps, schema_editor):
    """Reverse migration - decrypt configurations back to JSON"""
    # Note: This is risky and should be used with caution
    # We'll leave configurations as-is for safety
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_invoice_quote_payment_quote_paymentplan_quote'),
    ]

    operations = [
        # First, run the data migration to encrypt existing data
        migrations.RunPython(encrypt_existing_configs, decrypt_existing_configs),
        
        # Then alter the field definition (this is handled by the custom field class)
        # No field alteration needed since EncryptedJSONField inherits from TextField
    ]