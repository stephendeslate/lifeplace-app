#!/usr/bin/env python
"""
Test script to verify the messaging endpoint works with authentication.
This tests the specific endpoint that was showing 404 errors in the frontend.
"""
import os
import sys
import django
import json
import requests
from django.contrib.auth import authenticate
from django.test import Client
from django.urls import reverse

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append('/Users/stephendeslate/Desktop/lifeplace-app/backend')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from core.domains.messaging.models import MessageThread, Message

User = get_user_model()

def create_test_user():
    """Create or get test user"""
    email = "john.doe@gmail.com"
    password = "test123"
    
    try:
        user = User.objects.get(email=email)
        print(f"✓ Found existing user: {user.email}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name="John",
            last_name="Doe",
            role="ADMIN"  # Admin can access all threads
        )
        print(f"✓ Created new user: {user.email}")
    
    return user, password

def get_jwt_token(user):
    """Get JWT token for user"""
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    print(f"✓ Generated JWT token for {user.email}")
    return access_token

def test_endpoint_with_client():
    """Test using Django test client"""
    print("\n=== Testing with Django Test Client ===")
    
    user, password = create_test_user()
    client = Client()
    
    # Login
    login_success = client.login(email=user.email, password=password)
    print(f"✓ Django client login: {login_success}")
    
    # Get a thread to test with
    thread = MessageThread.objects.first()
    if not thread:
        print("✗ No threads found in database")
        return False
    
    print(f"✓ Testing with thread: {thread.id}")
    
    # Test the endpoint
    url = reverse('messaging:messagethread-messages', kwargs={'pk': str(thread.id)})
    print(f"✓ Endpoint URL: {url}")
    
    response = client.get(url + '?limit=50')
    print(f"✓ Response status: {response.status_code}")
    print(f"✓ Response headers: {dict(response.items())}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Response data keys: {list(data.keys())}")
        if 'results' in data:
            print(f"✓ Messages count: {len(data['results'])}")
        return True
    else:
        print(f"✗ Error response: {response.content.decode()}")
        return False

def test_endpoint_with_requests():
    """Test using requests library (like frontend would)"""
    print("\n=== Testing with Requests Library ===")
    
    user, password = create_test_user()
    token = get_jwt_token(user)
    
    # Get a thread to test with
    thread = MessageThread.objects.first()
    if not thread:
        print("✗ No threads found in database")
        return False
    
    print(f"✓ Testing with thread: {thread.id}")
    
    # Test the endpoint
    url = f"http://localhost:8000/api/messaging/threads/{thread.id}/messages/"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    params = {'limit': 50}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        print(f"✓ Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Response data keys: {list(data.keys())}")
            if 'results' in data:
                print(f"✓ Messages count: {len(data['results'])}")
            return True
        else:
            print(f"✗ Error response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Could not connect to server. Is Django server running on port 8000?")
        return False
    except Exception as e:
        print(f"✗ Request failed: {e}")
        return False

def create_test_messages():
    """Create some test messages for testing"""
    print("\n=== Creating Test Data ===")
    
    user, _ = create_test_user()
    thread = MessageThread.objects.first()
    
    if not thread:
        print("✗ No threads available")
        return False
    
    # Create a few test messages
    messages_created = 0
    for i in range(3):
        message, created = Message.objects.get_or_create(
            thread=thread,
            sender=user,
            content=f"Test message {i+1} from automated test",
            defaults={'message_type': 'text'}
        )
        if created:
            messages_created += 1
    
    print(f"✓ Created {messages_created} new test messages")
    total_messages = Message.objects.filter(thread=thread).count()
    print(f"✓ Total messages in thread: {total_messages}")
    return True

def main():
    """Run all tests"""
    print("=== Messaging Endpoint Authentication Test ===")
    print(f"Django version: {django.get_version()}")
    
    # Create test data
    create_test_messages()
    
    # Run tests
    client_test = test_endpoint_with_client()
    requests_test = test_endpoint_with_requests()
    
    print("\n=== Test Results ===")
    print(f"Django Client Test: {'✓ PASS' if client_test else '✗ FAIL'}")
    print(f"Requests Test: {'✓ PASS' if requests_test else '✗ FAIL'}")
    
    if client_test and requests_test:
        print("\n🎉 All tests passed! The messaging endpoint works correctly with authentication.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
    
    return client_test and requests_test

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)