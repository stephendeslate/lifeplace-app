#!/usr/bin/env python3
"""
Debug why packages disappear when addons are added
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

def debug_package_persistence():
    """Debug package persistence when adding addons"""
    print("🔍 Debugging Package Persistence Issue")
    print("="*45)
    
    # Create test user
    test_user = User.objects.filter(email='debug_test@example.com').first()
    if not test_user:
        user_data = {
            'email': 'debug_test@example.com',
            'first_name': 'Debug',
            'last_name': 'TestUser',
            'password': 'testpass123',
            'role': 'CLIENT',
            'is_active': True,
        }
        test_user = UserService.create_user(user_data)
    
    # Get active flow
    flow = BookingFlow.objects.filter(is_active=True).first()
    
    # Create session
    session = BookingSessionService.create_session(
        booking_flow_id=flow.id,
        client_id=test_user.id
    )
    print(f"✓ Created session: {session.session_id}")
    
    # Add packages first
    package_step = flow.steps.filter(step_type='package_selection').first()
    if package_step:
        session.current_step = package_step
        session.save()
        
        package_data = {
            'selected_packages': [
                {
                    'product_id': 1,
                    'name': 'Test Package 1',
                    'price': '25000.00',
                    'quantity': 1
                }
            ]
        }
        
        print("\n=== BEFORE PACKAGE UPDATE ===")
        print(f"Session booking_data: {json.dumps(session.booking_data, indent=2)}")
        
        updated_session_1 = BookingSessionService.update_session_data(
            session_id=str(session.session_id),
            step_data=package_data,
            mark_completed=False
        )
        
        print("\n=== AFTER PACKAGE UPDATE ===")
        print(f"Returned session booking_data: {json.dumps(updated_session_1.booking_data, indent=2)}")
        
        # Manually refresh from database
        fresh_session_1 = BookingSession.objects.get(session_id=session.session_id)
        print(f"Fresh from DB booking_data: {json.dumps(fresh_session_1.booking_data, indent=2)}")
        
        # Add addons
        addon_step = flow.steps.filter(step_type='addon_selection').first()
        if addon_step:
            # Make sure to use the fresh session
            fresh_session_1.current_step = addon_step
            fresh_session_1.save()
            
            addon_data = {
                'selected_addons': [
                    {
                        'product_id': 10,
                        'name': 'Test Addon 1',
                        'price': '5000.00',
                        'quantity': 1
                    }
                ]
            }
            
            print("\n=== BEFORE ADDON UPDATE ===")
            print(f"Session booking_data: {json.dumps(fresh_session_1.booking_data, indent=2)}")
            
            updated_session_2 = BookingSessionService.update_session_data(
                session_id=str(session.session_id),
                step_data=addon_data,
                mark_completed=False
            )
            
            print("\n=== AFTER ADDON UPDATE ===")
            print(f"Returned session booking_data: {json.dumps(updated_session_2.booking_data, indent=2)}")
            
            # Check if packages are still there
            packages_after_addon = updated_session_2.booking_data.get('selected_packages', [])
            addons_after_update = updated_session_2.booking_data.get('selected_addons', [])
            
            print(f"\n✓ Packages after addon: {len(packages_after_addon)}")
            print(f"✓ Addons after update: {len(addons_after_update)}")
            
            if len(packages_after_addon) == 0:
                print("❌ PACKAGES DISAPPEARED!")
                
                # Let's check the database directly
                fresh_session_2 = BookingSession.objects.get(session_id=session.session_id)
                print(f"DB booking_data: {json.dumps(fresh_session_2.booking_data, indent=2)}")
                
                if 'selected_packages' in fresh_session_2.booking_data:
                    print("✓ Packages ARE in database - issue with returned session")
                else:
                    print("❌ Packages NOT in database - issue with update logic")
    
    # Cleanup
    session.delete()
    
    return True

if __name__ == '__main__':
    debug_package_persistence()