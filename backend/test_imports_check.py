#!/usr/bin/env python
"""
Simple script to check if all imports are working correctly
for the LifePlace wedding workflow test
"""

import os
import sys
import django
from django.conf import settings

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

def check_imports():
    """Check if all required imports are available"""
    
    print("="*60)
    print(" LIFEPLACE PLATFORM - IMPORT VERIFICATION ")
    print("="*60)
    
    try:
        django.setup()
        print("✅ Django setup successful")
    except Exception as e:
        print(f"❌ Django setup failed: {e}")
        return False
    
    # Test core Django imports
    try:
        from django.contrib.auth import get_user_model
        from django.test import TestCase, TransactionTestCase
        from django.utils import timezone
        from django.db import transaction
        from django.core.exceptions import ValidationError
        from rest_framework.test import APIClient
        from rest_framework import status
        print("✅ Core Django/DRF imports successful")
    except ImportError as e:
        print(f"❌ Core imports failed: {e}")
        return False
    
    # Test domain imports
    domains_to_test = [
        ('bookingflow', ['BookingFlow', 'BookingFlowStep', 'BookingSession']),
        ('events', ['Event', 'EventType', 'EventTask', 'EventTimeline']),
        ('clients', ['ClientInvitation']),
        ('products', ['ProductCategory', 'ProductOption']),
        ('sales', ['EventQuote', 'QuoteTemplate', 'QuoteLineItem']),
        ('contracts', ['ContractTemplate', 'EventContract', 'ContractSignature']),
        ('payments', ['Payment', 'PaymentGateway', 'PaymentPlan']),
        ('workflows', ['WorkflowTemplate', 'WorkflowStage']),
        ('communications', ['CommunicationTemplate', 'CommunicationRecord']),
        ('questionnaires', ['Questionnaire', 'QuestionnaireField']),
        ('notes', ['Note']),
        ('notifications', ['Notification'])
    ]
    
    for domain, models in domains_to_test:
        try:
            module = __import__(f'core.domains.{domain}.models', fromlist=models)
            for model_name in models:
                if hasattr(module, model_name):
                    print(f"✅ {domain}.{model_name}")
                else:
                    print(f"⚠️  {domain}.{model_name} - not found but may be optional")
        except ImportError as e:
            print(f"❌ {domain} domain import failed: {e}")
            return False
    
    # Test User model
    try:
        User = get_user_model()
        print(f"✅ User model: {User.__name__}")
    except Exception as e:
        print(f"❌ User model failed: {e}")
        return False
    
    print("\n" + "="*60)
    print(" IMPORT VERIFICATION COMPLETE ")
    print("="*60)
    print("\n✅ All critical imports are working!")
    print("\nYou can now run the wedding workflow tests:")
    print("1. Simple test: python test_wedding_integration_simple.py")
    print("2. Full Django test: python manage.py test test_wedding_workflow_complete")
    
    return True

if __name__ == "__main__":
    success = check_imports()
    if not success:
        print("\n❌ Import verification failed!")
        print("Please check your Django setup and database configuration.")
        sys.exit(1)
    else:
        print("\n🚀 Ready to run wedding workflow tests!")
        sys.exit(0)