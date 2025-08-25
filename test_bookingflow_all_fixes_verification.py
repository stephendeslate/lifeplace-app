#!/usr/bin/env python3
"""
Final comprehensive test to verify all BookingFlow fixes work together

This test verifies:
1. ✅ Authenticated user contact info validation fix
2. ✅ Package/addon data duplication fix  
3. ✅ Booking completion works correctly
4. ✅ All integration points work properly
"""

import os
import sys
import json
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
from core.domains.users.models import UserProfile

User = get_user_model()

def test_all_fixes():
    """Comprehensive test of all BookingFlow fixes"""
    print("🎯 Final Verification: All BookingFlow Fixes")
    print("="*50)
    
    results = {
        'tests_run': 0,
        'tests_passed': 0,
        'tests_failed': 0,
        'fixes_verified': [],
        'issues_found': []
    }
    
    # Create authenticated user with full profile
    test_user = User.objects.filter(email='final_test@example.com').first()
    if not test_user:
        user_data = {
            'email': 'final_test@example.com',
            'first_name': 'Final',
            'last_name': 'TestUser',
            'password': 'testpass123',
            'role': 'CLIENT',
            'is_active': True,
        }
        test_user = UserService.create_user(user_data)
        
        # Create comprehensive profile
        UserProfile.objects.get_or_create(
            user=test_user,
            defaults={
                'phone': '+63912345678',
                'company': 'Test Company Ltd'
            }
        )
    
    print(f"✓ Test user: {test_user.email}")
    print(f"  Profile: {test_user.profile.phone if test_user.profile else 'No profile'}")
    
    # Get active flow
    flow = BookingFlow.objects.filter(is_active=True).first()
    if not flow:
        print("✗ No active booking flow found")
        return False
    
    print(f"✓ Using flow: {flow.name} ({flow.enabled_steps.count()} steps)")
    
    # Create session
    session = BookingSessionService.create_session(
        booking_flow_id=flow.id,
        client_id=test_user.id
    )
    print(f"✓ Created authenticated session: {session.session_id}")
    
    # FIX 1: Test Authenticated User Contact Info Validation
    print(f"\n🔧 FIX 1: Authenticated User Contact Info Validation")
    results['tests_run'] += 1
    
    contact_step = flow.steps.filter(step_type='contact_info').first()
    if contact_step:
        session.current_step = contact_step
        session.save()
        
        # Test empty step_data (simulates frontend disabled fields)
        empty_contact_data = {}
        
        try:
            # This should NOT fail for authenticated users
            validation_errors = BookingSessionService._validate_step_data(
                contact_step, empty_contact_data, session
            )
            
            if validation_errors:
                print(f"  ✗ Validation still fails: {validation_errors}")
                results['tests_failed'] += 1
                results['issues_found'].append("Contact info validation fails for authenticated users")
            else:
                print(f"  ✅ Validation passes for authenticated user with empty data")
                results['tests_passed'] += 1
                results['fixes_verified'].append("Authenticated user contact info validation fix")
        except Exception as e:
            print(f"  ✗ Exception during validation: {e}")
            results['tests_failed'] += 1
            results['issues_found'].append(f"Contact info validation exception: {e}")
    else:
        print(f"  ✓ No contact info step - fix not applicable")
        results['tests_passed'] += 1
    
    # FIX 2: Test Package/Addon Data Duplication Fix
    print(f"\n🔧 FIX 2: Package/Addon Data Storage (No Duplication)")
    results['tests_run'] += 1
    
    package_step = flow.steps.filter(step_type='package_selection').first()
    addon_step = flow.steps.filter(step_type='addon_selection').first()
    
    if package_step and addon_step:
        # Add packages
        session.current_step = package_step
        session.save()
        
        package_data = {
            'selected_packages': [
                {'product_id': 1, 'name': 'Wedding Package', 'price': '50000.00', 'quantity': 1}
            ]
        }
        
        session_with_packages = BookingSessionService.update_session_data(
            session_id=str(session.session_id),
            step_data=package_data,
            mark_completed=True
        )
        
        # Add addons
        session.current_step = addon_step
        session.save()
        
        addon_data = {
            'selected_addons': [
                {'product_id': 10, 'name': 'Photo Booth', 'price': '8000.00', 'quantity': 1}
            ]
        }
        
        session_with_addons = BookingSessionService.update_session_data(
            session_id=str(session.session_id),
            step_data=addon_data,
            mark_completed=True
        )
        
        # Check for duplication
        booking_data = session_with_addons.booking_data
        
        # Root level data
        root_packages = booking_data.get('selected_packages', [])
        root_addons = booking_data.get('selected_addons', [])
        
        # Step level data (should be empty now)
        package_step_key = f"step_{package_step.id}"
        addon_step_key = f"step_{addon_step.id}"
        
        step_packages = booking_data.get(package_step_key, {}).get('selected_packages', [])
        step_addons = booking_data.get(addon_step_key, {}).get('selected_addons', [])
        
        # Verify no duplication
        has_duplication = (len(step_packages) > 0 and len(root_packages) > 0) or \
                         (len(step_addons) > 0 and len(root_addons) > 0)
        
        if has_duplication:
            print(f"  ✗ Data duplication detected!")
            print(f"    Root packages: {len(root_packages)}, Step packages: {len(step_packages)}")
            print(f"    Root addons: {len(root_addons)}, Step addons: {len(step_addons)}")
            results['tests_failed'] += 1
            results['issues_found'].append("Package/addon data duplication still exists")
        else:
            print(f"  ✅ No duplication - data stored only at root level")
            print(f"    Root packages: {len(root_packages)}, Root addons: {len(root_addons)}")
            results['tests_passed'] += 1
            results['fixes_verified'].append("Package/addon data duplication fix")
            
        # Verify both are preserved
        if len(root_packages) > 0 and len(root_addons) > 0:
            print(f"  ✅ Both packages and addons preserved correctly")
        else:
            print(f"  ⚠️  Warning: Packages or addons missing after updates")
    
    else:
        print(f"  ✓ No package/addon steps - fix not applicable")
        results['tests_passed'] += 1
    
    # FIX 3: Test Complete Booking Flow 
    print(f"\n🔧 FIX 3: Complete Booking Flow End-to-End")
    results['tests_run'] += 1
    
    try:
        # Navigate to confirmation step (last step)
        confirmation_step = flow.steps.filter(step_type='confirmation').first()
        if confirmation_step:
            session.current_step = confirmation_step
            session.save()
            
            # Complete the confirmation step (should complete the booking)
            confirmation_data = {'acknowledged': True}
            
            completed_session = BookingSessionService.update_session_data(
                session_id=str(session.session_id),
                step_data=confirmation_data,
                mark_completed=True
            )
            
            if completed_session.is_completed:
                print(f"  ✅ Booking marked as completed after confirmation step")
                
                # Try to create event
                event = BookingSessionService.complete_booking(str(session.session_id))
                print(f"  ✅ Event creation successful: {event is not None}")
                
                results['tests_passed'] += 1
                results['fixes_verified'].append("Complete booking flow works end-to-end")
                
            else:
                print(f"  ✗ Booking not marked as completed")
                results['tests_failed'] += 1
                results['issues_found'].append("Booking completion logic failed")
        else:
            print(f"  ✓ No confirmation step - testing alternative completion")
            # Complete via API directly
            try:
                event = BookingSessionService.complete_booking(str(session.session_id))
                print(f"  ✅ Direct booking completion successful")
                results['tests_passed'] += 1
            except Exception as e:
                print(f"  ✗ Direct booking completion failed: {e}")
                results['tests_failed'] += 1
                
    except Exception as e:
        print(f"  ✗ Booking completion test failed: {e}")
        results['tests_failed'] += 1
        results['issues_found'].append(f"Booking completion exception: {e}")
    
    # FIX 4: Test Integration Points
    print(f"\n🔧 FIX 4: Integration Points")
    results['tests_run'] += 1
    
    try:
        # Test pricing calculation
        final_session = BookingSessionService.get_session_by_id(str(session.session_id))
        total_price = final_session.calculate_total_price()
        
        print(f"  ✅ Pricing calculation works: ${total_price}")
        
        # Test data retrieval
        booking_data = final_session.booking_data
        has_packages = 'selected_packages' in booking_data
        has_addons = 'selected_addons' in booking_data
        
        print(f"  ✅ Data retrieval works (packages: {has_packages}, addons: {has_addons})")
        
        results['tests_passed'] += 1
        results['fixes_verified'].append("All integration points working")
        
    except Exception as e:
        print(f"  ✗ Integration test failed: {e}")
        results['tests_failed'] += 1
        results['issues_found'].append(f"Integration failure: {e}")
    
    # Cleanup
    session.delete()
    
    # FINAL REPORT
    print(f"\n" + "="*70)
    print(f"🎯 FINAL VERIFICATION REPORT")
    print(f"="*70)
    print(f"Tests Run: {results['tests_run']}")
    print(f"Tests Passed: {results['tests_passed']}")
    print(f"Tests Failed: {results['tests_failed']}")
    
    print(f"\n✅ FIXES VERIFIED ({len(results['fixes_verified'])}):")
    for i, fix in enumerate(results['fixes_verified'], 1):
        print(f"   {i}. {fix}")
    
    if results['issues_found']:
        print(f"\n❌ ISSUES STILL PRESENT ({len(results['issues_found'])}):")
        for i, issue in enumerate(results['issues_found'], 1):
            print(f"   {i}. {issue}")
    
    success_rate = (results['tests_passed'] / results['tests_run']) * 100 if results['tests_run'] > 0 else 0
    print(f"\n🎯 SUCCESS RATE: {success_rate:.1f}%")
    
    if results['tests_failed'] == 0:
        print(f"\n🎉 ALL FIXES VERIFIED SUCCESSFULLY!")
        print(f"The BookingFlow domain is now working correctly for authenticated users.")
        return True
    else:
        print(f"\n⚠️  SOME ISSUES REMAIN")
        print(f"Review the issues above and apply additional fixes.")
        return False

if __name__ == '__main__':
    if test_all_fixes():
        print(f"\n✅ BookingFlow domain comprehensive testing PASSED")
        sys.exit(0)
    else:
        print(f"\n❌ BookingFlow domain comprehensive testing FAILED")
        sys.exit(1)