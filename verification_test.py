#!/usr/bin/env python3
"""
Verification test for duplicate event creation bug fix.
This test simulates multiple rapid completions of a booking session to verify
that no duplicate Events are created.
"""

import requests
import time
import json
import threading
from concurrent.futures import ThreadPoolExecutor
import datetime

BASE_URL = "http://localhost:8000/api"

def get_auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/users/token/",
                           json={'email': 'stephendeslate@gmail.com', 'password': 'HuDi#[Ta3'},
                           headers={'Content-Type': 'application/json'})
    if response.status_code == 200:
        return response.json()['access']
    else:
        print(f"Failed to get auth token: {response.status_code}")
        print(response.text)
        return None

def create_booking_session(token):
    """Create a new booking session"""
    headers = {'Authorization': f'Bearer {token}'}

    # First get booking flows
    flows_response = requests.get(f"{BASE_URL}/bookingflow/flows/", headers=headers)
    if flows_response.status_code != 200:
        print(f"Failed to get booking flows: {flows_response.status_code}")
        return None

    flows = flows_response.json()
    if not flows['results']:
        print("No booking flows available")
        return None

    flow_id = flows['results'][0]['id']

    # Create session
    session_data = {
        'booking_flow': flow_id,
        'ip_address': '127.0.0.1',
        'user_agent': 'VerificationTest/1.0',
        'referrer_url': ''
    }

    response = requests.post(f"{BASE_URL}/bookingflow/sessions/",
                           json=session_data, headers=headers)

    if response.status_code == 201:
        return response.json()
    else:
        print(f"Failed to create session: {response.status_code}")
        print(response.text)
        return None

def complete_booking_flow(token, session_uuid):
    """Complete all steps of a booking flow"""
    headers = {'Authorization': f'Bearer {token}'}

    try:
        # Get session details
        session_response = requests.get(f"{BASE_URL}/bookingflow/sessions/{session_uuid}/", headers=headers)
        if session_response.status_code != 200:
            return {"error": f"Failed to get session: {session_response.status_code}"}

        session = session_response.json()
        flow_id = session['booking_flow']

        # Get flow steps
        flow_response = requests.get(f"{BASE_URL}/bookingflow/flows/{flow_id}/", headers=headers)
        if flow_response.status_code != 200:
            return {"error": f"Failed to get flow: {flow_response.status_code}"}

        flow = flow_response.json()
        steps = flow['enabled_steps']

        print(f"Thread {threading.current_thread().ident}: Completing {len(steps)} steps for session {session_uuid}")

        # Complete each step
        for i, step in enumerate(steps):
            step_data = {}

            # Generate step data based on step type
            if step['step_type'] == 'introduction':
                step_data = {'acknowledged': True}
            elif step['step_type'] == 'date_time':
                step_data = {
                    'start_date': '2026-03-22',
                    'start_time': '14:00',
                    'duration_hours': 10,
                    'selected_date': '2026-03-22',
                    'selected_time': '14:00'
                }
            elif step['step_type'] == 'package_selection':
                # Get products to select
                products_response = requests.get(f"{BASE_URL}/products/", headers=headers)
                if products_response.status_code == 200:
                    products = products_response.json()
                    package_products = [p for p in products['results'] if 'package' in p['name'].lower()]
                    if package_products:
                        step_data = {
                            'selected_packages': [{
                                'product_id': package_products[0]['id'],
                                'name': package_products[0]['name'],
                                'price': float(package_products[0]['base_price']),
                                'quantity': 1
                            }]
                        }
            elif step['step_type'] == 'addon_selection':
                # Get addon products
                products_response = requests.get(f"{BASE_URL}/products/", headers=headers)
                if products_response.status_code == 200:
                    products = products_response.json()
                    addon_products = [p for p in products['results'] if 'addon' in p['name'].lower() or 'decoration' in p['name'].lower()][:2]
                    if addon_products:
                        step_data = {
                            'selected_addons': [{
                                'product_id': p['id'],
                                'name': p['name'],
                                'price': float(p['base_price']),
                                'quantity': 1
                            } for p in addon_products]
                        }
            elif step['step_type'] == 'contact_info':
                thread_id = threading.current_thread().ident
                step_data = {
                    'first_name': 'Test',
                    'last_name': 'User',
                    'full_name': 'Test User',
                    'email': f'test.user.{thread_id}@verification.com',
                    'phone': '+639171234567',
                    'address': '123 Test Address',
                    'partner_name': 'Test Partner',
                    'event_name': f'Test Event {thread_id}',
                    'create_account': False
                }
            elif step['step_type'] == 'questionnaire':
                step_data = {
                    'field_1': '150',
                    'field_2': 'Test Response',
                    'field_3': 'Blue and white',
                    'field_4': 'No special requirements'
                }
            elif step['step_type'] == 'confirmation':
                step_data = {}

            # Submit step
            step_url = f"{BASE_URL}/bookingflow/sessions/{session_uuid}/steps/{step['id']}/"
            step_response = requests.post(step_url,
                                        json={'step_data': step_data, 'mark_completed': True},
                                        headers=headers)

            if step_response.status_code != 200:
                return {"error": f"Failed to complete step {step['name']}: {step_response.status_code} - {step_response.text}"}

            step_result = step_response.json()
            print(f"Thread {threading.current_thread().ident}: Completed step {i+1}/{len(steps)}: {step['name']}")

            # Small delay between steps to simulate realistic flow
            time.sleep(0.1)

        return {"success": True, "session_id": session_uuid}

    except Exception as e:
        return {"error": f"Exception in booking completion: {str(e)}"}

def simulate_rapid_completions(token, num_threads=5):
    """Simulate multiple rapid completions to test for race conditions"""
    print(f"\n{'='*60}")
    print(f"SIMULATING {num_threads} RAPID BOOKING COMPLETIONS")
    print(f"{'='*60}")

    # Create booking sessions
    sessions = []
    for i in range(num_threads):
        session = create_booking_session(token)
        if session:
            sessions.append(session['session_id'])
            print(f"Created session {i+1}: {session['session_id']}")
        else:
            print(f"Failed to create session {i+1}")

    if not sessions:
        print("No sessions created, aborting test")
        return []

    print(f"\nStarting concurrent completion of {len(sessions)} booking flows...")

    # Execute completions concurrently
    results = []
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(complete_booking_flow, token, session_uuid)
                  for session_uuid in sessions]

        for i, future in enumerate(futures):
            try:
                result = future.result(timeout=60)  # 60 second timeout per completion
                results.append(result)
                print(f"Completion {i+1} finished: {result}")
            except Exception as e:
                error_result = {"error": f"Thread {i+1} exception: {str(e)}"}
                results.append(error_result)
                print(f"Completion {i+1} failed: {error_result}")

    return results

def verify_no_duplicate_events(token, results):
    """Verify that no duplicate events were created"""
    print(f"\n{'='*60}")
    print("VERIFYING NO DUPLICATE EVENTS CREATED")
    print(f"{'='*60}")

    headers = {'Authorization': f'Bearer {token}'}

    # Get all events created in the last minute
    now = datetime.datetime.now()
    one_minute_ago = now - datetime.timedelta(minutes=1)

    events_response = requests.get(f"{BASE_URL}/events/", headers=headers)
    if events_response.status_code != 200:
        print(f"Failed to get events: {events_response.status_code}")
        return False

    events = events_response.json()

    # Filter recent events
    recent_events = []
    for event in events['results']:
        event_time = datetime.datetime.fromisoformat(event['created_at'].replace('Z', '+00:00'))
        if event_time.replace(tzinfo=None) >= one_minute_ago:
            recent_events.append(event)

    print(f"Found {len(recent_events)} events created in the last minute")

    # Check for successful completions
    successful_completions = [r for r in results if r.get('success')]
    failed_completions = [r for r in results if r.get('error')]

    print(f"Successful booking completions: {len(successful_completions)}")
    print(f"Failed booking completions: {len(failed_completions)}")

    # Log failed completions
    if failed_completions:
        print("\nFailed completions:")
        for i, failure in enumerate(failed_completions):
            print(f"  {i+1}. {failure['error']}")

    # Verify: Number of recent events should equal number of successful completions
    events_count = len(recent_events)
    expected_count = len(successful_completions)

    print(f"\nRESULT: {events_count} events created from {expected_count} successful completions")

    if events_count == expected_count:
        print("✅ SUCCESS: No duplicate events detected!")
        return True
    elif events_count < expected_count:
        print("⚠️ WARNING: Fewer events than completions (some may have failed)")
        return False
    else:
        print("❌ FAILURE: More events than completions (duplicates detected!)")
        print(f"Duplicate events: {events_count - expected_count}")

        # Show event details
        print("\nRecent events:")
        for i, event in enumerate(recent_events):
            print(f"  {i+1}. Event {event['id']}: {event['name']} - {event['client_email']}")

        return False

def main():
    print("VERIFICATION TEST: Duplicate Event Creation Bug Fix")
    print("="*60)

    # Get authentication token
    token = get_auth_token()
    if not token:
        print("❌ Failed to authenticate")
        return

    print("✅ Authentication successful")

    # Test 1: Simulate rapid completions
    results = simulate_rapid_completions(token, num_threads=3)

    # Test 2: Verify no duplicates
    verification_passed = verify_no_duplicate_events(token, results)

    # Final summary
    print(f"\n{'='*60}")
    print("FINAL VERIFICATION RESULT")
    print(f"{'='*60}")

    if verification_passed:
        print("✅ DUPLICATE EVENT CREATION BUG FIX VERIFIED")
        print("✅ No duplicate events were created during concurrent booking completions")
    else:
        print("❌ VERIFICATION FAILED")
        print("❌ Duplicate events may still be created or other issues detected")

    return verification_passed

if __name__ == "__main__":
    main()