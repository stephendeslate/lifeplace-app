#!/usr/bin/env python
"""
Simple test to verify the messaging endpoint works with authentication.
Tests the specific endpoint that was showing 404 errors in the frontend.
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append('/Users/stephendeslate/Desktop/lifeplace-app/backend')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
from core.domains.messaging.models import MessageThread

User = get_user_model()

def test_endpoint_simple():
    """Simple test using Django test client"""
    print("=== Simple Messaging Endpoint Test ===")
    
    # Get or create test user
    email = "john.doe@gmail.com"
    password = "test123"
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name="John",
            last_name="Doe",
            role="ADMIN"
        )
    
    print(f"✓ User: {user.email} (Role: {user.role})")
    
    # Login with Django test client
    client = Client()
    login_success = client.login(email=email, password=password)
    print(f"✓ Login successful: {login_success}")
    
    # Get a thread to test with
    thread = MessageThread.objects.first()
    if not thread:
        print("✗ No threads found in database")
        return False
    
    print(f"✓ Testing thread: {thread.id}")
    print(f"✓ Thread client: {thread.client}")
    print(f"✓ Thread event: {thread.event}")
    
    # Test the problematic endpoint
    url = reverse('messaging:messagethread-messages', kwargs={'pk': str(thread.id)})
    print(f"✓ Endpoint URL: {url}")
    
    response = client.get(url + '?limit=50')
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Response keys: {list(data.keys())}")
        if 'results' in data:
            print(f"✓ Messages in response: {len(data['results'])}")
        elif 'count' in data:
            print(f"✓ Message count: {data['count']}")
        
        print("🎉 SUCCESS: The endpoint works correctly!")
        return True
    else:
        print(f"✗ HTTP Error {response.status_code}")
        print(f"✗ Response: {response.content.decode()}")
        return False

if __name__ == "__main__":
    success = test_endpoint_simple()
    print(f"\n{'✅ PASS' if success else '❌ FAIL'}: Messaging endpoint test")