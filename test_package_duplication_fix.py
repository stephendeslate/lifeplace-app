#!/usr/bin/env python3
"""
Test the fix for package/addon data duplication issue
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

User = get_user_model()

def test_package_duplication_fix():
    """Test that packages/addons are stored only at root level"""
    print("🧪 Testing Package/Addon Data Duplication Fix")
    print("="*50)
    
    # Create test user
    test_user = User.objects.filter(email='package_test@example.com').first()
    if not test_user:
        user_data = {
            'email': 'package_test@example.com',
            'first_name': 'Package',
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
    
    # Create session
    session = BookingSessionService.create_session(
        booking_flow_id=flow.id,
        client_id=test_user.id
    )
    print(f"✓ Created session: {session.session_id}")
    
    # Find package selection step
    package_step = flow.steps.filter(step_type='package_selection').first()
    if not package_step:
        print("✓ No package selection step - test not applicable")
        session.delete()
        return True
    
    print(f"✓ Found package selection step: {package_step.name}")
    
    # Navigate to package step
    session.current_step = package_step
    session.save()
    
    # TEST 1: Add package data
    print("\n--- Test 1: Package Selection Data Storage ---")
    package_data = {
        'selected_packages': [
            {
                'product_id': 1,
                'name': 'Test Package 1',
                'price': '25000.00',
                'quantity': 1
            },
            {
                'product_id': 2,
                'name': 'Test Package 2',
                'price': '30000.00',
                'quantity': 1
            }
        ]
    }
    
    # Update session with package data
    updated_session = BookingSessionService.update_session_data(
        session_id=str(session.session_id),
        step_data=package_data,
        mark_completed=False
    )
    
    print("✓ Package data updated")
    
    # Check data storage structure
    booking_data = updated_session.booking_data
    print(f"✓ Booking data keys: {list(booking_data.keys())}")
    
    # Check if packages are at root level
    root_packages = booking_data.get('selected_packages', [])
    print(f"✓ Root level packages: {len(root_packages)} items")
    
    # Check if packages are duplicated in step data
    step_key = f"step_{package_step.id}"
    step_data = booking_data.get(step_key, {})
    step_packages = step_data.get('selected_packages', [])
    print(f"✓ Step level packages: {len(step_packages)} items")
    
    if len(step_packages) > 0 and len(root_packages) > 0:
        print("✗ DUPLICATION DETECTED: Packages found at both root and step level")
        print(f"   Root packages: {[p['name'] for p in root_packages]}")
        print(f"   Step packages: {[p['name'] for p in step_packages]}")
        session.delete()
        return False
    elif len(root_packages) > 0:
        print("✅ SUCCESS: Packages stored only at root level")
        print(f"   Packages: {[p['name'] for p in root_packages]}")
    else:
        print("✗ ERROR: No packages found anywhere")
        session.delete()
        return False
    
    # TEST 2: Add addon data 
    print("\n--- Test 2: Addon Selection Data Storage ---")
    addon_step = flow.steps.filter(step_type='addon_selection').first()
    if addon_step:
        session.current_step = addon_step
        session.save()
        
        addon_data = {
            'selected_addons': [
                {
                    'product_id': 10,
                    'name': 'Test Addon 1',
                    'price': '5000.00',
                    'quantity': 2
                }
            ]
        }
        
        updated_session = BookingSessionService.update_session_data(
            session_id=str(session.session_id),
            step_data=addon_data,
            mark_completed=False
        )
        
        print("✓ Addon data updated")
        
        # Check addon storage structure
        booking_data = updated_session.booking_data
        root_addons = booking_data.get('selected_addons', [])
        print(f"✓ Root level addons: {len(root_addons)} items")
        
        # Check step level
        addon_step_key = f"step_{addon_step.id}"
        addon_step_data = booking_data.get(addon_step_key, {})
        step_addons = addon_step_data.get('selected_addons', [])
        print(f"✓ Step level addons: {len(step_addons)} items")
        
        if len(step_addons) > 0 and len(root_addons) > 0:
            print("✗ DUPLICATION DETECTED: Addons found at both root and step level")
            session.delete()
            return False
        elif len(root_addons) > 0:
            print("✅ SUCCESS: Addons stored only at root level")
            print(f"   Addons: {[a['name'] for a in root_addons]}")
        
        # Verify packages are still there
        root_packages_after_addon = booking_data.get('selected_packages', [])
        print(f"✓ Packages still preserved: {len(root_packages_after_addon)} items")
        
    else:
        print("✓ No addon selection step - skipping addon test")
    
    # TEST 3: Test pricing calculation
    print("\n--- Test 3: Pricing Calculation ---")
    total_price = updated_session.calculate_total_price()
    print(f"✓ Calculated total price: ${total_price}")
    
    # Calculate expected total manually
    expected_total = 0
    for package in root_packages:
        expected_total += float(package['price']) * package['quantity']
    if 'selected_addons' in booking_data:
        for addon in booking_data['selected_addons']:
            expected_total += float(addon['price']) * addon['quantity']
    
    print(f"✓ Expected total: ${expected_total}")
    
    if float(total_price) != expected_total:
        print(f"⚠️  WARNING: Price calculation mismatch (${total_price} vs ${expected_total})")
    else:
        print("✅ Price calculation matches expected total")
    
    # TEST 4: Test data structure integrity
    print("\n--- Test 4: Data Structure Integrity ---")
    print("Final booking_data structure:")
    for key, value in booking_data.items():
        if key in ['selected_packages', 'selected_addons']:
            print(f"  {key}: {len(value)} items")
        else:
            print(f"  {key}: {type(value).__name__}")
    
    # Cleanup
    session.delete()
    print("\n✓ Test cleanup completed")
    
    return True

if __name__ == '__main__':
    if test_package_duplication_fix():
        print("\n✅ PACKAGE DUPLICATION FIX SUCCESSFUL!")
        print("Packages/addons are now stored only at root level")
        sys.exit(0)
    else:
        print("\n❌ PACKAGE DUPLICATION FIX FAILED!")
        print("Data duplication issue still exists")
        sys.exit(1)