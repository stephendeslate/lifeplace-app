#!/usr/bin/env python
"""
Stripe Gateway Configuration Script

This script helps you configure your Stripe payment gateway with real test API keys.
Run this script to set up your PaymentGateway instance with your Stripe credentials.

Usage:
    python setup_stripe_gateway.py

You'll be prompted to enter your Stripe test API keys.
Get them from: https://dashboard.stripe.com/test/apikeys
"""

import os
import django
import sys
import getpass

# Setup Django
sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.domains.payments.models import PaymentGateway


def setup_stripe_gateway():
    """Set up Stripe gateway with user-provided credentials"""
    
    print("🔧 Stripe Gateway Configuration")
    print("=" * 50)
    print()
    print("This script will configure your Stripe payment gateway with test API keys.")
    print("You can get your test keys from: https://dashboard.stripe.com/test/apikeys")
    print()
    
    # Check if gateway already exists
    try:
        gateway = PaymentGateway.objects.get(code='stripe')
        print(f"✅ Found existing Stripe gateway: {gateway.name}")
        
        config = gateway.config
        if config and config.get('secret_key', '').startswith('sk_test_'):
            print("⚠️  Gateway already has test keys configured.")
            overwrite = input("Do you want to update the configuration? (y/n): ").lower().strip()
            if overwrite != 'y':
                print("Configuration cancelled.")
                return
        
    except PaymentGateway.DoesNotExist:
        print("Creating new Stripe gateway...")
        gateway = PaymentGateway(
            name='Stripe',
            code='stripe',
            is_active=True
        )
    
    print()
    print("Please enter your Stripe test API keys:")
    print("(Keys starting with 'pk_test_' and 'sk_test_')")
    print()
    
    # Get publishable key
    while True:
        publishable_key = input("Publishable Key (pk_test_...): ").strip()
        if publishable_key.startswith('pk_test_'):
            break
        print("❌ Please enter a valid test publishable key (starts with 'pk_test_')")
    
    # Get secret key
    while True:
        secret_key = getpass.getpass("Secret Key (sk_test_...): ").strip()
        if secret_key.startswith('sk_test_'):
            break
        print("❌ Please enter a valid test secret key (starts with 'sk_test_')")
    
    # Get webhook secret (optional)
    print("\nWebhook Secret (optional - for webhook verification):")
    webhook_secret = getpass.getpass("Webhook Secret (whsec_... or press Enter to skip): ").strip()
    
    if webhook_secret and not webhook_secret.startswith('whsec_'):
        print("⚠️  Warning: Webhook secret should start with 'whsec_'")
    
    # Configure gateway
    gateway.config = {
        'publishable_key': publishable_key,
        'secret_key': secret_key,
        'webhook_secret': webhook_secret if webhook_secret else '',
        'test_mode': True,
        'configured_at': str(django.utils.timezone.now())
    }
    gateway.is_active = True
    gateway.save()
    
    print()
    print("✅ Stripe gateway configured successfully!")
    print(f"   Gateway ID: {gateway.id}")
    print(f"   Gateway Name: {gateway.name}")
    print(f"   Test Mode: {gateway.config['test_mode']}")
    print(f"   Publishable Key: {publishable_key[:20]}...")
    print(f"   Secret Key: {secret_key[:20]}...")
    if webhook_secret:
        print(f"   Webhook Secret: {webhook_secret[:20]}...")
    print()
    
    print("🧪 Next steps:")
    print("1. Run payment tests to verify configuration:")
    print("   python manage.py test core.domains.payments.tests.test_stripe_real_api")
    print()
    print("2. Test a real payment flow:")
    print("   python manage.py test core.domains.payments.tests.test_integration")
    print()
    print("3. Test webhook handling:")
    print("   python manage.py test core.domains.payments.tests.test_webhooks")
    print()


def check_current_configuration():
    """Check and display current gateway configuration"""
    
    try:
        gateway = PaymentGateway.objects.get(code='stripe')
        config = gateway.config
        
        print("📋 Current Stripe Gateway Configuration:")
        print("=" * 45)
        print(f"Gateway: {gateway.name}")
        print(f"Active: {'✅' if gateway.is_active else '❌'}")
        
        if config:
            print(f"Publishable Key: {'✅' if config.get('publishable_key', '').startswith('pk_test_') else '❌'}")
            print(f"Secret Key: {'✅' if config.get('secret_key', '').startswith('sk_test_') else '❌'}")
            print(f"Webhook Secret: {'✅' if config.get('webhook_secret', '').startswith('whsec_') else '❌ (optional)'}")
            print(f"Test Mode: {'✅' if config.get('test_mode') else '❌'}")
            
            if config.get('configured_at'):
                print(f"Configured: {config['configured_at']}")
        else:
            print("❌ No configuration found")
            
    except PaymentGateway.DoesNotExist:
        print("❌ No Stripe gateway found in database")
    
    print()


if __name__ == '__main__':
    print()
    
    # Check current configuration first
    check_current_configuration()
    
    # Ask if user wants to configure
    if len(sys.argv) > 1 and sys.argv[1] == '--check-only':
        sys.exit(0)
    
    configure = input("Do you want to configure/update Stripe gateway? (y/n): ").lower().strip()
    
    if configure == 'y':
        try:
            setup_stripe_gateway()
        except KeyboardInterrupt:
            print("\n⚠️  Configuration cancelled by user")
        except Exception as e:
            print(f"\n❌ Error configuring gateway: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("Configuration skipped.")
        print("\nTo configure later, run: python setup_stripe_gateway.py")
    
    print()