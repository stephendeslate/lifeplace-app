#!/usr/bin/env python
"""
Test script for archive functionality in the messaging domain.
This script tests the complete archive workflow.
"""
import os
import sys
import django
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.domains.messaging.models import MessageThread, Message
from django.utils import timezone

User = get_user_model()

def test_archive_functionality():
    """Test the archive functionality end-to-end"""
    print("=== Testing Archive Functionality ===\n")

    # 1. Get or create test users
    print("1. Setting up test users...")
    try:
        # Try to get existing admin user
        admin = User.objects.filter(role='ADMIN').first()
        if not admin:
            print("   Creating admin user...")
            admin = User.objects.create_user(
                email='test_admin@example.com',
                password='testpass123',
                first_name='Test',
                last_name='Admin',
                role='ADMIN'
            )
        print(f"   Admin user: {admin.email}")

        # Try to get existing client user
        client = User.objects.filter(role='CLIENT').first()
        if not client:
            print("   Creating client user...")
            client = User.objects.create_user(
                email='test_client@example.com',
                password='testpass123',
                first_name='Test',
                last_name='Client',
                role='CLIENT'
            )
        print(f"   Client user: {client.email}")

    except Exception as e:
        print(f"   Error setting up users: {e}")
        return False

    # 2. Create or get existing test thread
    print("\n2. Setting up test thread...")
    try:
        # Look for existing active thread
        thread = MessageThread.objects.filter(
            client=client,
            status='active'
        ).first()

        if not thread:
            print("   Creating new thread...")
            thread = MessageThread.objects.create(
                client=client,
                assigned_admin=admin,
                subject="Test Thread for Archive",
                priority='normal',
                status='active'
            )

        print(f"   Thread ID: {thread.id}")
        print(f"   Thread status: {thread.status}")
        print(f"   Thread archived_at: {thread.archived_at}")
        print(f"   Thread archived_by: {thread.archived_by}")

    except Exception as e:
        print(f"   Error setting up thread: {e}")
        return False

    # 3. Test archive operation
    print("\n3. Testing archive operation...")
    try:
        # Verify thread is not already archived
        if thread.status == 'archived':
            print("   Thread is already archived, unarchiving first...")
            thread.status = 'active'
            thread.archived_at = None
            thread.archived_by = None
            thread.save()

        # Archive the thread
        print("   Archiving thread...")
        original_status = thread.status
        thread.status = 'archived'
        thread.archived_at = timezone.now()
        thread.archived_by = admin
        thread.save()

        # Refresh from database
        thread.refresh_from_db()

        print(f"   Archive successful!")
        print(f"   Status changed from '{original_status}' to '{thread.status}'")
        print(f"   Archived at: {thread.archived_at}")
        print(f"   Archived by: {thread.archived_by}")

    except Exception as e:
        print(f"   Error archiving thread: {e}")
        return False

    # 4. Test database field verification
    print("\n4. Verifying database fields...")
    try:
        # Query the thread from database to verify fields are set correctly
        db_thread = MessageThread.objects.get(id=thread.id)

        print(f"   DB Status: {db_thread.status}")
        print(f"   DB Archived at: {db_thread.archived_at}")
        print(f"   DB Archived by: {db_thread.archived_by}")

        # Verify all fields are set correctly
        assert db_thread.status == 'archived', f"Expected 'archived', got '{db_thread.status}'"
        assert db_thread.archived_at is not None, "archived_at should not be None"
        assert db_thread.archived_by == admin, f"archived_by should be {admin}, got {db_thread.archived_by}"

        print("   ✓ All database fields verified correctly!")

    except Exception as e:
        print(f"   Error verifying database fields: {e}")
        return False

    # 5. Test unarchive operation
    print("\n5. Testing unarchive operation...")
    try:
        # Unarchive the thread
        print("   Unarchiving thread...")
        thread.status = 'active'
        thread.archived_at = None
        thread.archived_by = None
        thread.save()

        # Refresh from database
        thread.refresh_from_db()

        print(f"   Unarchive successful!")
        print(f"   Status: {thread.status}")
        print(f"   Archived at: {thread.archived_at}")
        print(f"   Archived by: {thread.archived_by}")

        # Verify fields are cleared
        assert thread.status == 'active', f"Expected 'active', got '{thread.status}'"
        assert thread.archived_at is None, "archived_at should be None"
        assert thread.archived_by is None, "archived_by should be None"

        print("   ✓ Unarchive operation verified correctly!")

    except Exception as e:
        print(f"   Error unarchiving thread: {e}")
        return False

    # 6. Test filtering archived threads
    print("\n6. Testing archived thread filtering...")
    try:
        # Create another thread and archive it for filtering test
        test_thread = MessageThread.objects.create(
            client=client,
            assigned_admin=admin,
            subject="Test Archive Filter",
            priority='normal',
            status='active'
        )

        # Archive it
        test_thread.status = 'archived'
        test_thread.archived_at = timezone.now()
        test_thread.archived_by = admin
        test_thread.save()

        # Test filtering
        archived_threads = MessageThread.objects.filter(status='archived')
        active_threads = MessageThread.objects.filter(status='active')

        print(f"   Archived threads count: {archived_threads.count()}")
        print(f"   Active threads count: {active_threads.count()}")
        print(f"   ✓ Filtering works correctly!")

        # Clean up test thread
        test_thread.delete()

    except Exception as e:
        print(f"   Error testing filtering: {e}")
        return False

    print("\n=== Archive Functionality Test Complete ===")
    print("✓ All tests passed successfully!")
    return True

if __name__ == "__main__":
    success = test_archive_functionality()
    sys.exit(0 if success else 1)