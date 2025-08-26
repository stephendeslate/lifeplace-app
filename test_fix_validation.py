#!/usr/bin/env python3
"""
Test the fix for authenticated user contact info validation
"""

import os
import sys
from pathlib import Path

# Add Django project to path  
project_root = Path(__file__).parent / 'backend'
sys.path.append(str(project_root))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from core.domains.bookingflow.models import BookingFlow, BookingSession, BookingFlowStep
from core.domains.bookingflow.services import BookingSessionService
from core.domains.users.services import UserService

User = get_user_model()

def test_validation_fix():
    """Test that the validation fix works for authenticated users"""
    print("🧪 Testing Validation Fix for Authenticated Users")
    print("="*55)
    
    # Create test user
    test_user = User.objects.filter(email='validation_test@example.com').first()
    if not test_user:
        user_data = {
            'email': 'validation_test@example.com',
            'first_name': 'Validation',
            'last_name': 'TestUser',
            'password': 'testpass123',
            'role': 'CLIENT',
            'is_active': True,
        }
        test_user = UserService.create_user(user_data)
        
        # Create profile with phone
        from core.domains.users.models import UserProfile
        UserProfile.objects.get_or_create(
            user=test_user,
            defaults={'phone': '+63912345678', 'company': 'Test Company'}
        )
    
    print(f"✓ Test user: {test_user.email}")
    
    # Get active flow
    flow = BookingFlow.objects.filter(is_active=True).first()
    if not flow:
        print("✗ No active booking flow found")
        return False
    
    print(f"✓ Using flow: {flow.name}")
    
    # Create session
    session = BookingSessionService.create_session(
        booking_flow_id=flow.id,
        client_id=test_user.id
    )
    print(f"✓ Created session: {session.session_id}")
    
    # Find contact info step
    contact_step = flow.steps.filter(step_type='contact_info').first()
    if not contact_step:
        print("✓ No contact info step - test not applicable")
        session.delete()
        return True
    
    print(f"✓ Found contact info step: {contact_step.name}")
    
    # Navigate to contact info step
    session.current_step = contact_step
    session.save()
    
    # TEST 1: Empty step data (simulates frontend behavior)
    print("\n--- Test 1: Empty step_data (frontend disables fields for auth users) ---")
    empty_step_data = {}
    
    validation_errors = BookingSessionService._validate_step_data(
        contact_step, empty_step_data, session
    )
    
    if validation_errors:
        print(f"✗ VALIDATION FAILED: {validation_errors}")
        if 'email' in validation_errors:
            print("✗ Critical bug still exists: email validation failure")
            session.delete()
            return False
    else:
        print("✓ Validation passed for authenticated user with empty step_data!")
    
    # TEST 2: Try to update session with empty data
    print("\n--- Test 2: Update session with empty step_data ---")
    try:
        updated_session = BookingSessionService.update_session_data(
            session_id=str(session.session_id),
            step_data=empty_step_data,
            mark_completed=True
        )
        print("✓ Session update succeeded!")
        print(f"✓ Moved to step: {updated_session.current_step.name if updated_session.current_step else 'Completed'}")
    except Exception as e:
        print(f"✗ Session update failed: {e}")
        session.delete()
        return False
    
    # TEST 3: Compare with guest user (should still require fields)
    print("\n--- Test 3: Compare with guest user validation ---")
    guest_session = BookingSessionService.create_session(
        booking_flow_id=flow.id,
        client_id=None  # Guest user
    )
    guest_session.current_step = contact_step
    guest_session.save()
    
    guest_validation_errors = BookingSessionService._validate_step_data(
        contact_step, empty_step_data, guest_session
    )
    
    if guest_validation_errors:
        print(f"✓ Guest validation properly fails with empty data: {guest_validation_errors}")
    else:
        print("⚠️  Warning: Guest validation passed with empty data (might be unexpected)")
    
    # Cleanup
    session.delete()
    guest_session.delete()
    print("\n✓ Test cleanup completed")
    
    return True

if __name__ == '__main__':
    if test_validation_fix():
        print("\n✅ VALIDATION FIX SUCCESSFUL!")
        print("Authenticated users can now proceed through contact info step")
        sys.exit(0)
    else:
        print("\n❌ VALIDATION FIX FAILED!")
        print("Issue still exists - requires further investigation")
        sys.exit(1)