#!/usr/bin/env python3
"""
Test that booking completion works properly for the confirmation step
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

def test_confirmation_completion():
    """Test that confirmation step properly completes the booking flow"""
    print("🧪 Testing Confirmation Step Completion")
    print("="*42)
    
    # Create test user
    test_user = User.objects.filter(email='confirmation_test@example.com').first()
    if not test_user:
        user_data = {
            'email': 'confirmation_test@example.com',
            'first_name': 'Confirmation',
            'last_name': 'TestUser',
            'password': 'testpass123',
            'role': 'CLIENT',
            'is_active': True,
        }
        test_user = UserService.create_user(user_data)
    
    print(f"✓ Test user: {test_user.email}")
    
    # Get active flow
    flow = BookingFlow.objects.filter(is_active=True).first()
    if not flow:
        print("✗ No active booking flow found")
        return False
    
    print(f"✓ Using flow: {flow.name}")
    print(f"✓ Flow steps: {flow.enabled_steps.count()}")
    
    # Create session
    session = BookingSessionService.create_session(
        booking_flow_id=flow.id,
        client_id=test_user.id
    )
    print(f"✓ Created session: {session.session_id}")
    
    # Find confirmation step
    confirmation_step = flow.steps.filter(step_type='confirmation').first()
    if not confirmation_step:
        print("✓ No confirmation step - test not applicable")
        session.delete()
        return True
    
    print(f"✓ Found confirmation step: {confirmation_step.name}")
    print(f"  Order: {confirmation_step.order}")
    
    # Check if confirmation is the last step
    last_step = flow.enabled_steps.last()
    is_last_step = confirmation_step.id == last_step.id
    print(f"✓ Confirmation is {'LAST' if is_last_step else 'NOT LAST'} step")
    
    # Navigate directly to confirmation step
    session.current_step = confirmation_step
    session.save()
    
    print(f"✓ Navigated to confirmation step")
    print(f"  Session is_completed before: {session.is_completed}")
    
    # TEST 1: Update confirmation step without marking completed
    print("\n--- Test 1: Update confirmation without completion ---")
    confirmation_data = {
        'acknowledged': True,
        'final_notes': 'Test completion'
    }
    
    updated_session = BookingSessionService.update_session_data(
        session_id=str(session.session_id),
        step_data=confirmation_data,
        mark_completed=False  # Don't mark as completed yet
    )
    
    print(f"✓ Updated session (not completed)")
    print(f"  Current step: {updated_session.current_step.name if updated_session.current_step else 'None'}")
    print(f"  Is completed: {updated_session.is_completed}")
    
    # TEST 2: Mark confirmation step as completed (should complete booking)
    print("\n--- Test 2: Complete confirmation step ---")
    
    completed_session = BookingSessionService.update_session_data(
        session_id=str(session.session_id),
        step_data=confirmation_data,
        mark_completed=True  # This should complete the booking
    )
    
    print(f"✓ Marked confirmation as completed")
    print(f"  Current step: {completed_session.current_step.name if completed_session.current_step else 'FLOW COMPLETE'}")
    print(f"  Is completed: {completed_session.is_completed}")
    print(f"  Completed at: {completed_session.completed_at}")
    
    if not completed_session.is_completed:
        print("✗ ISSUE: Session not marked as completed after confirmation step")
        
        # Debug: Check what get_next_step returns
        next_step = flow.get_next_step(confirmation_step.id, completed_session.booking_data)
        print(f"  Debug: get_next_step returned: {next_step}")
        
        if next_step:
            print(f"    Next step: {next_step.name} (order: {next_step.order})")
            print("    This explains why booking wasn't completed")
        else:
            print("    No next step found - should have completed")
            
        session.delete()
        return False
    
    # TEST 3: Try to complete the booking via complete_booking method
    print("\n--- Test 3: Complete booking via API ---")
    try:
        event = BookingSessionService.complete_booking(str(session.session_id))
        print(f"✓ Booking completed successfully!")
        print(f"  Event created: {event.id if event else 'None'}")
        print(f"  Event title: {getattr(event, 'title', 'No title')}")
    except Exception as e:
        print(f"✗ Booking completion failed: {e}")
        session.delete()
        return False
    
    # TEST 4: Verify session state after completion
    print("\n--- Test 4: Verify final session state ---")
    final_session = BookingSessionService.get_session_by_id(str(session.session_id))
    print(f"  Is completed: {final_session.is_completed}")
    print(f"  Completed at: {final_session.completed_at}")
    print(f"  Has created event: {hasattr(final_session, 'created_event') and final_session.created_event is not None}")
    
    # Cleanup
    session.delete()
    print("\n✓ Test cleanup completed")
    
    return True

if __name__ == '__main__':
    if test_confirmation_completion():
        print("\n✅ CONFIRMATION STEP COMPLETION WORKING!")
        print("Booking flow completes properly at confirmation step")
        sys.exit(0)
    else:
        print("\n❌ CONFIRMATION STEP COMPLETION FAILED!")
        print("Issue with booking flow completion logic")
        sys.exit(1)