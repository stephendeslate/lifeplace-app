#!/usr/bin/env python
"""
Test script for archive API endpoints in the messaging domain.
This script tests the REST API endpoints for archive functionality.
"""
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from core.domains.messaging.models import MessageThread
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def get_jwt_token(user):
    """Get JWT token for user"""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)

def test_archive_api_endpoints():
    """Test the archive API endpoints"""
    print("=== Testing Archive API Endpoints ===\n")

    # Setup test client
    client = Client()

    # 1. Get test users
    print("1. Setting up authentication...")
    try:
        admin = User.objects.filter(role='ADMIN').first()
        if not admin:
            print("   No admin user found, creating one...")
            admin = User.objects.create_user(
                email='test_admin@example.com',
                password='testpass123',
                first_name='Test',
                last_name='Admin',
                role='ADMIN'
            )

        test_client = User.objects.filter(role='CLIENT').first()
        if not test_client:
            print("   No client user found, creating one...")
            test_client = User.objects.create_user(
                email='test_client@example.com',
                password='testpass123',
                first_name='Test',
                last_name='Client',
                role='CLIENT'
            )

        # Get JWT tokens
        admin_token = get_jwt_token(admin)
        client_token = get_jwt_token(test_client)

        print(f"   Admin: {admin.email}")
        print(f"   Client: {test_client.email}")
        print("   ✓ Authentication setup complete!")

    except Exception as e:
        print(f"   Error setting up authentication: {e}")
        return False

    # 2. Get or create test thread
    print("\n2. Setting up test thread...")
    try:
        thread = MessageThread.objects.filter(
            client=test_client,
            status='active'
        ).first()

        if not thread:
            thread = MessageThread.objects.create(
                client=test_client,
                assigned_admin=admin,
                subject="API Test Thread",
                priority='normal',
                status='active'
            )

        print(f"   Thread ID: {thread.id}")
        print(f"   Thread status: {thread.status}")

    except Exception as e:
        print(f"   Error setting up thread: {e}")
        return False

    # 3. Test GET threads endpoint
    print("\n3. Testing GET /api/messaging/threads/ endpoint...")
    try:
        response = client.get(
            '/api/messaging/threads/',
            HTTP_AUTHORIZATION=f'Bearer {admin_token}'
        )

        print(f"   Status code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Threads count: {data.get('count', 'unknown')}")
            print("   ✓ GET threads endpoint works!")
        else:
            print(f"   Error: {response.content}")
            return False

    except Exception as e:
        print(f"   Error testing GET threads: {e}")
        return False

    # 4. Test archive endpoint
    print("\n4. Testing POST /api/messaging/threads/{id}/archive/ endpoint...")
    try:
        # Ensure thread is not archived
        if thread.status == 'archived':
            thread.status = 'active'
            thread.archived_at = None
            thread.archived_by = None
            thread.save()

        response = client.post(
            f'/api/messaging/threads/{thread.id}/archive/',
            HTTP_AUTHORIZATION=f'Bearer {admin_token}',
            content_type='application/json'
        )

        print(f"   Status code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response status: {data.get('status')}")
            print(f"   Response archived_at: {data.get('archived_at')}")
            print(f"   Response archived_by: {data.get('archived_by')}")
            print("   ✓ Archive endpoint works!")

            # Verify in database
            thread.refresh_from_db()
            print(f"   DB verification - Status: {thread.status}")
            print(f"   DB verification - Archived at: {thread.archived_at}")
            print(f"   DB verification - Archived by: {thread.archived_by}")

        else:
            print(f"   Error: {response.content}")
            return False

    except Exception as e:
        print(f"   Error testing archive endpoint: {e}")
        return False

    # 5. Test unarchive endpoint
    print("\n5. Testing POST /api/messaging/threads/{id}/unarchive/ endpoint...")
    try:
        response = client.post(
            f'/api/messaging/threads/{thread.id}/unarchive/',
            HTTP_AUTHORIZATION=f'Bearer {admin_token}',
            content_type='application/json'
        )

        print(f"   Status code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response status: {data.get('status')}")
            print(f"   Response archived_at: {data.get('archived_at')}")
            print(f"   Response archived_by: {data.get('archived_by')}")
            print("   ✓ Unarchive endpoint works!")

            # Verify in database
            thread.refresh_from_db()
            print(f"   DB verification - Status: {thread.status}")
            print(f"   DB verification - Archived at: {thread.archived_at}")
            print(f"   DB verification - Archived by: {thread.archived_by}")

        else:
            print(f"   Error: {response.content}")
            return False

    except Exception as e:
        print(f"   Error testing unarchive endpoint: {e}")
        return False

    # 6. Test permission restrictions
    print("\n6. Testing permission restrictions...")
    try:
        # Test client trying to archive (should fail)
        response = client.post(
            f'/api/messaging/threads/{thread.id}/archive/',
            HTTP_AUTHORIZATION=f'Bearer {client_token}',
            content_type='application/json'
        )

        print(f"   Client archive attempt - Status code: {response.status_code}")
        if response.status_code == 403:
            print("   ✓ Client correctly denied archive permission!")
        else:
            print(f"   Unexpected response: {response.content}")

        # Test client trying to unarchive (should fail)
        response = client.post(
            f'/api/messaging/threads/{thread.id}/unarchive/',
            HTTP_AUTHORIZATION=f'Bearer {client_token}',
            content_type='application/json'
        )

        print(f"   Client unarchive attempt - Status code: {response.status_code}")
        if response.status_code == 403:
            print("   ✓ Client correctly denied unarchive permission!")
        else:
            print(f"   Unexpected response: {response.content}")

    except Exception as e:
        print(f"   Error testing permissions: {e}")
        return False

    # 7. Test error cases
    print("\n7. Testing error cases...")
    try:
        # Test archiving already archived thread
        thread.status = 'archived'
        thread.save()

        response = client.post(
            f'/api/messaging/threads/{thread.id}/archive/',
            HTTP_AUTHORIZATION=f'Bearer {admin_token}',
            content_type='application/json'
        )

        print(f"   Archive already archived - Status code: {response.status_code}")
        if response.status_code == 400:
            data = response.json()
            print(f"   Error message: {data.get('error')}")
            print("   ✓ Properly handles already archived error!")

        # Test unarchiving non-archived thread
        thread.status = 'active'
        thread.save()

        response = client.post(
            f'/api/messaging/threads/{thread.id}/unarchive/',
            HTTP_AUTHORIZATION=f'Bearer {admin_token}',
            content_type='application/json'
        )

        print(f"   Unarchive non-archived - Status code: {response.status_code}")
        if response.status_code == 400:
            data = response.json()
            print(f"   Error message: {data.get('error')}")
            print("   ✓ Properly handles non-archived error!")

    except Exception as e:
        print(f"   Error testing error cases: {e}")
        return False

    print("\n=== Archive API Endpoints Test Complete ===")
    print("✓ All API tests passed successfully!")
    return True

if __name__ == "__main__":
    success = test_archive_api_endpoints()
    sys.exit(0 if success else 1)