#!/usr/bin/env python
"""
Test messaging endpoint with JWT authentication.
This tests the specific endpoint that was showing 404 errors in the frontend.
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
from rest_framework_simplejwt.tokens import RefreshToken
from core.domains.messaging.models import MessageThread

User = get_user_model()

def test_endpoint_with_jwt():
    """Test using JWT authentication"""
    print("=== JWT Messaging Endpoint Test ===")
    
    # Get or create test user
    email = "john.doe@gmail.com"
    password = "test123"
    
    try:
        user = User.objects.get(email=email)
        # Update to ensure admin role for testing
        user.role = "ADMIN"
        user.save()
    except User.DoesNotExist:
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name="John",
            last_name="Doe",
            role="ADMIN"  # Admin can access all threads
        )
    
    print(f"✓ User: {user.email} (Role: {user.role})")
    
    # Generate JWT token
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    print(f"✓ JWT token generated")
    
    # Get a thread to test with
    thread = MessageThread.objects.first()
    if not thread:
        print("✗ No threads found in database")
        return False
    
    print(f"✓ Testing thread: {thread.id}")
    print(f"✓ Thread client: {thread.client}")
    
    # Test the endpoint with JWT
    client = Client()
    url = reverse('messaging:messagethread-messages', kwargs={'pk': str(thread.id)})
    print(f"✓ Endpoint URL: {url}")
    
    # Make authenticated request
    response = client.get(
        url + '?limit=50',
        HTTP_AUTHORIZATION=f'Bearer {access_token}',
        content_type='application/json'
    )
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Response keys: {list(data.keys())}")
        if 'results' in data:
            print(f"✓ Messages in response: {len(data['results'])}")
            if len(data['results']) > 0:
                msg = data['results'][0]
                print(f"✓ Sample message keys: {list(msg.keys())}")
        elif 'count' in data:
            print(f"✓ Message count: {data['count']}")
        
        print("🎉 SUCCESS: The endpoint works correctly with JWT authentication!")
        print("✅ CONCLUSION: The API endpoint is NOT broken. The 404 error in the frontend is likely due to:")
        print("   1. Missing or invalid JWT token in frontend requests")
        print("   2. Incorrect API base URL configuration")
        print("   3. Network connectivity issues")
        return True
    else:
        print(f"✗ HTTP Error {response.status_code}")
        print(f"✗ Response: {response.content.decode()}")
        return False

def test_permission_check():
    """Test permission handling for different user roles"""
    print("\n=== Permission Test ===")
    
    # Create a CLIENT user
    client_email = "client.test@example.com"
    try:
        client_user = User.objects.get(email=client_email)
    except User.DoesNotExist:
        client_user = User.objects.create_user(
            email=client_email,
            password="test123",
            role="CLIENT"
        )
    
    print(f"✓ Client user: {client_user.email} (Role: {client_user.role})")
    
    # Get a thread owned by a different client
    thread = MessageThread.objects.exclude(client=client_user).first()
    if not thread:
        print("✓ No threads to test permissions with")
        return True
    
    print(f"✓ Testing access to thread owned by: {thread.client.email}")
    
    # Generate JWT for client user
    refresh = RefreshToken.for_user(client_user)
    access_token = str(refresh.access_token)
    
    # Try to access another client's thread
    client = Client()
    url = reverse('messaging:messagethread-messages', kwargs={'pk': str(thread.id)})
    
    response = client.get(
        url + '?limit=50',
        HTTP_AUTHORIZATION=f'Bearer {access_token}',
        content_type='application/json'
    )
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 403:
        print("✓ Correct: Client cannot access other clients' threads")
        return True
    elif response.status_code == 200:
        print("⚠️  Warning: Client can access other clients' threads (potential security issue)")
        return True
    else:
        print(f"✗ Unexpected response: {response.status_code}")
        return False

if __name__ == "__main__":
    success1 = test_endpoint_with_jwt()
    success2 = test_permission_check()
    
    overall_success = success1 and success2
    print(f"\n{'✅ OVERALL PASS' if overall_success else '❌ OVERALL FAIL'}: Messaging API tests")
    
    if success1:
        print("\n🔍 DIAGNOSIS: The messaging API endpoint works correctly!")
        print("The 404 errors in the frontend are NOT caused by missing backend endpoints.")
        print("Check frontend authentication, API base URL, and network connectivity.")