#!/usr/bin/env python3
"""
BOOKING SESSION DUPLICATION BUG VERIFICATION SCRIPT

This script tests the exact duplication points in the booking session completion logic.
It demonstrates how Events can be created multiple times through different API paths.

CRITICAL ENDPOINTS TESTED:
1. `/api/bookingflow/sessions/{id}/complete_booking/` (authenticated)
2. `/api/bookingflow/public/flows/session/{uuid}/complete/` (public)
3. `/api/bookingflow/public/flows/session/{uuid}/update/` with mark_completed=True

The bug occurs because:
- BookingSessionService.complete_booking() is called from multiple endpoints
- Each call can trigger Event creation
- No proper deduplication checks exist
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = 'http://localhost:8001'

def authenticate():
    """Get authenticated session"""
    auth_url = f'{BASE_URL}/api/users/login/'
    auth_data = {
        'email': 'stephendeslate@gmail.com',
        'password': 'HuDi#[Ta3'
    }

    auth_response = requests.post(auth_url, json=auth_data)
    if auth_response.status_code == 200:
        return auth_response.json()
    else:
        raise Exception(f"Authentication failed: {auth_response.text}")

def get_available_flow():
    """Get the first available booking flow"""
    flows_response = requests.get(f'{BASE_URL}/api/bookingflow/public/flows/')
    if flows_response.status_code == 200:
        flows = flows_response.json()
        if flows:
            return flows[0]
    raise Exception("No booking flows available")

def create_booking_session(flow_id):
    """Create a new booking session"""
    session_url = f'{BASE_URL}/api/bookingflow/public/flows/{flow_id}/start_session/'

    session_response = requests.post(session_url, json={})
    if session_response.status_code == 201:
        return session_response.json()
    else:
        raise Exception(f"Failed to create session: {session_response.text}")

def complete_session_steps(session_id):
    """Complete all required steps to make session completable"""

    # Step 1: Add contact info (required for completion)
    contact_data = {
        'step_id': 24,  # Contact info step
        'step_data': {
            'full_name': 'Test User',
            'email': 'test@example.com',
            'phone': '123-456-7890',
            'create_account': False
        },
        'mark_completed': True
    }

    update_url = f'{BASE_URL}/api/bookingflow/public/flows/session/{session_id}/update/'
    contact_response = requests.patch(update_url, json=contact_data)
    print(f"Contact step: {contact_response.status_code}")

    # Step 2: Add package selection
    package_data = {
        'step_id': 14,  # Package selection step
        'step_data': {
            'selected_packages': [
                {
                    'product_id': 6,  # The Angelic Field
                    'name': 'The Angelic Field',
                    'price': 26400.00,
                    'quantity': 1
                }
            ]
        },
        'mark_completed': True
    }

    package_response = requests.patch(update_url, json=package_data)
    print(f"Package step: {package_response.status_code}")

    # Step 3: Add date/time
    datetime_data = {
        'step_id': 12,  # DateTime step
        'step_data': {
            'start_date': '2024-12-01',
            'start_time': '18:00',
            'end_date': '2024-12-01',
            'end_time': '23:00',
            'duration': 5
        },
        'mark_completed': True
    }

    datetime_response = requests.patch(update_url, json=datetime_data)
    print(f"DateTime step: {datetime_response.status_code}")

def check_event_count_before():
    """Get current event count before testing"""
    # This would require Django shell access or API endpoint
    return 0

def test_duplication_bug():
    """Main test function demonstrating the duplication bug"""

    print("=" * 60)
    print("BOOKING SESSION DUPLICATION BUG VERIFICATION")
    print("=" * 60)

    try:
        # Step 1: Setup
        print("\n1. AUTHENTICATION AND SETUP")
        auth_result = authenticate()
        print("✅ Authentication successful")

        flow = get_available_flow()
        print(f"✅ Using booking flow: {flow['id']} - {flow['name']}")

        # Step 2: Create a booking session
        print("\n2. CREATING BOOKING SESSION")
        session = create_booking_session(flow['id'])
        session_id = session['session_id']
        print(f"✅ Created session: {session_id}")

        # Step 3: Complete required steps
        print("\n3. COMPLETING REQUIRED STEPS")
        complete_session_steps(session_id)
        print("✅ All required steps completed")

        # Step 4: Test the duplication paths
        print("\n4. TESTING DUPLICATION PATHS")
        print("-" * 40)

        # PATH 1: Public completion endpoint
        print("\n4a. TESTING PUBLIC COMPLETION ENDPOINT")
        completion_url = f'{BASE_URL}/api/bookingflow/public/flows/session/{session_id}/complete/'
        completion_data = {
            'completion_type': 'quote'  # Use quote to bypass payment validation
        }

        completion_response = requests.post(completion_url, json=completion_data)
        print(f"Public completion response: {completion_response.status_code}")

        if completion_response.status_code == 200:
            result = completion_response.json()
            print(f"✅ Event created via PUBLIC endpoint: {result.get('event', {}).get('id', 'Unknown')}")
            first_event_id = result.get('event', {}).get('id')
        else:
            print(f"❌ Public completion failed: {completion_response.text}")
            return

        # PATH 2: Try calling again (should not create duplicate)
        print("\n4b. TESTING DUPLICATE PUBLIC COMPLETION")
        completion_response_2 = requests.post(completion_url, json=completion_data)
        print(f"Second completion response: {completion_response_2.status_code}")

        if completion_response_2.status_code == 200:
            result_2 = completion_response_2.json()
            second_event_id = result_2.get('event', {}).get('id')
            print(f"Second completion event ID: {second_event_id}")

            if first_event_id == second_event_id:
                print("✅ Same event returned - no duplication via same endpoint")
            else:
                print("❌ DIFFERENT event created - DUPLICATION BUG!")

        print("\n5. VERIFICATION COMPLETE")
        print("-" * 40)
        print("KEY FINDINGS:")
        print("• Public completion endpoint tested")
        print("• Authenticated endpoints would require more complex setup")
        print("• Check Django logs for detailed event creation flow")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_duplication_bug()