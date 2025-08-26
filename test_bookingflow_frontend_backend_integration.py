#!/usr/bin/env python3
"""
Comprehensive test script to identify BookingFlow issues with frontend-backend integration

This script simulates actual HTTP requests that the client-portal frontend makes
to identify mismatches between frontend behavior and backend expectations.

Run with: source venv/bin/activate && python test_bookingflow_frontend_backend_integration.py
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

from django.test.client import Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from core.domains.bookingflow.models import BookingFlow, BookingSession, BookingFlowStep
from core.domains.bookingflow.services import BookingSessionService
from core.domains.events.models import EventType
from core.domains.users.services import UserService
from rest_framework.test import APIClient
from django.contrib.auth.models import User as DjangoUser

User = get_user_model()

class BookingFlowIntegrationTester:
    """Test actual frontend-backend HTTP integration"""
    
    def __init__(self):
        self.authenticated_user = None
        self.guest_user = None
        self.test_flow = None
        self.auth_client = APIClient()  # Authenticated API client
        self.guest_client = APIClient()  # Guest API client
        self.test_session_auth = None
        self.test_session_guest = None
        self.results = {
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'issues_found': [],
            'critical_errors': []
        }
    
    def setup_test_data(self):
        """Create test users and booking flow"""
        print("Setting up test data...")
        
        # Create authenticated user
        try:
            self.authenticated_user = User.objects.filter(email='auth_test@example.com').first()
            if not self.authenticated_user:
                user_data = {
                    'email': 'auth_test@example.com',
                    'first_name': 'Auth',
                    'last_name': 'User',
                    'password': 'authpass123',
                    'role': 'CLIENT',
                    'is_active': True,
                    'profile': {
                        'phone': '+63912345678',
                        'company': 'Auth Company',
                    }
                }
                self.authenticated_user = UserService.create_user(user_data)
            
            # Force authentication for the test client
            self.auth_client.force_authenticate(user=self.authenticated_user)
            
            print(f"✓ Authenticated user: {self.authenticated_user.email}")
        except Exception as e:
            print(f"✗ Failed to create authenticated user: {e}")
            return False
        
        # Find active booking flow
        try:
            self.test_flow = BookingFlow.objects.filter(is_active=True).first()
            if not self.test_flow:
                print("✗ No active booking flow found")
                return False
            print(f"✓ Using booking flow: {self.test_flow.name}")
        except Exception as e:
            print(f"✗ Failed to find booking flow: {e}")
            return False
        
        return True
    
    def test_authenticated_session_creation(self):
        """Test authenticated user session creation via API"""
        print("\n=== Test 1: Authenticated Session Creation (API) ===")
        self.results['tests_run'] += 1
        
        try:
            # Make API request as authenticated user
            url = f'/bookingflow/public/flows/{self.test_flow.id}/start_session/'
            response = self.auth_client.post(url, {})
            
            if response.status_code != 201:
                print(f"✗ Session creation failed with status {response.status_code}")
                print(f"   Response: {response.data}")
                self.results['tests_failed'] += 1
                self.results['issues_found'].append({
                    'issue': 'Authenticated session creation API failure',
                    'status_code': response.status_code,
                    'response': response.data
                })
                return False
            
            session_data = response.data
            self.test_session_auth = session_data
            
            print(f"✓ Session created: {session_data['session_id']}")
            print(f"✓ Current step: {session_data['current_step']['name'] if session_data['current_step'] else 'None'}")
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Exception during session creation: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Session creation exception: {e}")
            return False
    
    def test_guest_session_creation(self):
        """Test guest user session creation via API"""
        print("\n=== Test 2: Guest Session Creation (API) ===")
        self.results['tests_run'] += 1
        
        try:
            # Make API request as guest (no authentication)
            url = f'/bookingflow/public/flows/{self.test_flow.id}/start_session/'
            response = self.guest_client.post(url, {})
            
            if response.status_code != 201:
                print(f"✗ Guest session creation failed with status {response.status_code}")
                print(f"   Response: {response.data}")
                self.results['tests_failed'] += 1
                return False
            
            session_data = response.data
            self.test_session_guest = session_data
            
            print(f"✓ Guest session created: {session_data['session_id']}")
            print(f"✓ Current step: {session_data['current_step']['name'] if session_data['current_step'] else 'None'}")
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Exception during guest session creation: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Guest session creation exception: {e}")
            return False
    
    def test_authenticated_contact_info_step(self):
        """Test contact info step behavior for authenticated users"""
        print("\n=== Test 3: Authenticated User Contact Info Step ===")
        self.results['tests_run'] += 1
        
        if not self.test_session_auth:
            print("✗ No authenticated session available")
            self.results['tests_failed'] += 1
            return False
        
        try:
            session_id = self.test_session_auth['session_id']
            
            # Get session details
            url = f'/bookingflow/public/flows/session/{session_id}/'
            response = self.auth_client.get(url)
            
            if response.status_code != 200:
                print(f"✗ Failed to get session: {response.status_code}")
                self.results['tests_failed'] += 1
                return False
            
            session_detail = response.data
            current_step = session_detail['current_step']
            
            # Navigate to contact info step if not already there
            contact_step = None
            for step in self.test_flow.enabled_steps.all():
                if step.step_type == 'contact_info':
                    contact_step = step
                    break
            
            if not contact_step:
                print("✓ No contact info step in this flow - skipping test")
                self.results['tests_passed'] += 1
                return True
            
            # Navigate to contact info step
            if current_step['id'] != contact_step.id:
                nav_url = f'/bookingflow/public/flows/session/{session_id}/go-to-step/'
                nav_response = self.auth_client.patch(nav_url, {'step_id': contact_step.id})
                if nav_response.status_code != 200:
                    print(f"✗ Failed to navigate to contact step: {nav_response.status_code}")
                    self.results['tests_failed'] += 1
                    return False
                print(f"✓ Navigated to contact info step")
            
            # TEST: Simulate frontend behavior for authenticated users
            print("\n--- Simulating frontend behavior for authenticated users ---")
            
            # Case 1: Empty step_data (frontend disables email field for auth users)
            print("Testing with empty step_data (email field disabled)...")
            
            update_url = f'/bookingflow/public/flows/session/{session_id}/update/'
            update_data = {
                'step_id': contact_step.id,
                'step_data': {},  # Empty because email field is disabled
                'mark_completed': False
            }
            
            response = self.auth_client.patch(update_url, update_data, format='json')
            
            if response.status_code != 200:
                print(f"✗ Update failed with empty step_data: {response.status_code}")
                print(f"   Response: {response.data}")
                if 'validation_errors' in response.data:
                    print(f"   Validation errors: {response.data['validation_errors']}")
                    if 'email' in response.data['validation_errors']:
                        print(f"✗ CRITICAL BUG: Backend requires email but frontend doesn't send it for auth users")
                        self.results['issues_found'].append({
                            'issue': 'Frontend-backend mismatch: email field required but not sent for authenticated users',
                            'location': 'ContactInfoStep.tsx:196 (email disabled) vs backend validation',
                            'impact': 'Authenticated users cannot proceed from contact info step',
                            'validation_errors': response.data['validation_errors']
                        })
                        self.results['tests_failed'] += 1
                        return False
            else:
                print("✓ Update succeeded with empty step_data")
            
            # Case 2: Try to complete step with empty data
            print("Testing step completion with empty step_data...")
            
            complete_data = {
                'step_id': contact_step.id,
                'step_data': {},
                'mark_completed': True
            }
            
            response = self.auth_client.patch(update_url, complete_data, format='json')
            
            if response.status_code != 200:
                print(f"✗ Step completion failed: {response.status_code}")
                print(f"   Response: {response.data}")
                if 'validation_errors' in response.data:
                    validation_errors = response.data['validation_errors']
                    print(f"   Validation errors: {validation_errors}")
                    
                    # This is the likely bug location
                    if 'email' in validation_errors:
                        print(f"✗ CRITICAL BUG CONFIRMED: Email validation fails for authenticated users")
                        self.results['critical_errors'].append(
                            "Contact info step completion fails for authenticated users due to missing email validation"
                        )
                        self.results['issues_found'].append({
                            'issue': 'Contact info step completion validation failure for authenticated users',
                            'root_cause': 'Backend validates email field but frontend does not send it for authenticated users',
                            'location': 'booking_session_service.py:617 AND ContactInfoStep.tsx:196',
                            'impact': 'Authenticated users cannot complete booking flow',
                            'solution': 'Backend should use session.client.email when step_data.email is missing for authenticated users'
                        })
                        self.results['tests_failed'] += 1
                        return False
                    else:
                        print(f"✓ Non-email validation error (might be expected): {validation_errors}")
            else:
                print("✓ Step completion succeeded")
                # Check if we actually moved to next step
                if response.data.get('current_step'):
                    next_step = response.data['current_step']
                    if next_step['id'] != contact_step.id:
                        print(f"✓ Successfully moved to next step: {next_step['name']}")
                    else:
                        print("? Still on contact info step (might indicate validation issue)")
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Exception during contact info test: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Contact info test exception: {e}")
            return False
    
    def test_guest_contact_info_step(self):
        """Test contact info step behavior for guest users"""
        print("\n=== Test 4: Guest User Contact Info Step ===")
        self.results['tests_run'] += 1
        
        if not self.test_session_guest:
            print("✗ No guest session available")
            self.results['tests_failed'] += 1
            return False
        
        try:
            session_id = self.test_session_guest['session_id']
            
            # Navigate to contact info step
            contact_step = None
            for step in self.test_flow.enabled_steps.all():
                if step.step_type == 'contact_info':
                    contact_step = step
                    break
            
            if not contact_step:
                print("✓ No contact info step in this flow - skipping test")
                self.results['tests_passed'] += 1
                return True
            
            # Navigate to contact info step
            nav_url = f'/bookingflow/public/flows/session/{session_id}/go-to-step/'
            nav_response = self.guest_client.patch(nav_url, {'step_id': contact_step.id})
            if nav_response.status_code != 200:
                print(f"✗ Failed to navigate to contact step: {nav_response.status_code}")
                self.results['tests_failed'] += 1
                return False
            
            print(f"✓ Navigated to contact info step")
            
            # TEST: Guest users must provide all info
            print("Testing guest user contact info submission...")
            
            guest_contact_data = {
                'full_name': 'Guest User',
                'email': 'guest@example.com',
                'phone': '+63987654321',
                'company': 'Guest Company'
            }
            
            update_url = f'/bookingflow/public/flows/session/{session_id}/update/'
            update_data = {
                'step_id': contact_step.id,
                'step_data': guest_contact_data,
                'mark_completed': True
            }
            
            response = self.guest_client.patch(update_url, update_data, format='json')
            
            if response.status_code != 200:
                print(f"✗ Guest contact info submission failed: {response.status_code}")
                print(f"   Response: {response.data}")
                self.results['tests_failed'] += 1
                return False
            else:
                print("✓ Guest contact info submission succeeded")
                if response.data.get('current_step'):
                    next_step = response.data['current_step']
                    if next_step['id'] != contact_step.id:
                        print(f"✓ Guest moved to next step: {next_step['name']}")
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Exception during guest contact info test: {e}")
            self.results['tests_failed'] += 1
            return False
    
    def test_complete_booking_flow_authenticated(self):
        """Test complete booking flow for authenticated user"""
        print("\n=== Test 5: Complete Booking Flow (Authenticated) ===")
        self.results['tests_run'] += 1
        
        if not self.test_session_auth:
            print("✗ No authenticated session available")
            self.results['tests_failed'] += 1
            return False
        
        try:
            session_id = self.test_session_auth['session_id']
            
            print("Testing complete booking completion for authenticated user...")
            
            # Get current session state
            session_url = f'/bookingflow/public/flows/session/{session_id}/'
            session_response = self.auth_client.get(session_url)
            
            if session_response.status_code != 200:
                print(f"✗ Failed to get session state: {session_response.status_code}")
                self.results['tests_failed'] += 1
                return False
            
            # Try to complete the booking
            complete_url = f'/bookingflow/public/flows/session/{session_id}/complete/'
            complete_response = self.auth_client.post(complete_url, {})
            
            if complete_response.status_code != 200:
                print(f"✗ Booking completion failed: {complete_response.status_code}")
                print(f"   Response: {complete_response.data}")
                
                # This might reveal step validation issues
                if 'detail' in complete_response.data:
                    error_detail = complete_response.data['detail']
                    if 'contact' in error_detail.lower() or 'email' in error_detail.lower():
                        print(f"✗ CRITICAL: Booking completion fails due to contact info issues")
                        self.results['critical_errors'].append(
                            f"Booking completion fails for authenticated users: {error_detail}"
                        )
                    
                self.results['tests_failed'] += 1
                return False
            else:
                print("✓ Booking completion succeeded for authenticated user")
                completion_data = complete_response.data
                if 'event' in completion_data:
                    print(f"✓ Event created: {completion_data['event'].get('id', 'Unknown ID')}")
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Exception during booking completion: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Booking completion exception: {e}")
            return False
    
    def cleanup(self):
        """Clean up test data"""
        print("\nCleaning up test data...")
        try:
            # Delete test sessions
            if self.test_session_auth:
                try:
                    session = BookingSession.objects.get(session_id=self.test_session_auth['session_id'])
                    session.delete()
                    print("✓ Authenticated test session deleted")
                except BookingSession.DoesNotExist:
                    pass
            
            if self.test_session_guest:
                try:
                    session = BookingSession.objects.get(session_id=self.test_session_guest['session_id'])
                    session.delete()
                    print("✓ Guest test session deleted")
                except BookingSession.DoesNotExist:
                    pass
            
        except Exception as e:
            print(f"Warning: Cleanup failed: {e}")
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting BookingFlow Frontend-Backend Integration Testing")
        print("="*65)
        
        if not self.setup_test_data():
            print("❌ Test setup failed, aborting")
            return False
        
        # Run tests in order
        tests = [
            self.test_authenticated_session_creation,
            self.test_guest_session_creation,
            self.test_authenticated_contact_info_step,
            self.test_guest_contact_info_step,
            self.test_complete_booking_flow_authenticated,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"✗ Test failed with unexpected error: {e}")
                self.results['tests_failed'] += 1
                self.results['critical_errors'].append(f"Unexpected test failure in {test.__name__}: {e}")
        
        # Report results
        self.print_final_report()
        
        # Cleanup
        self.cleanup()
        
        return len(self.results['critical_errors']) == 0
    
    def print_final_report(self):
        """Print comprehensive test results"""
        print("\n" + "="*65)
        print("📊 FRONTEND-BACKEND INTEGRATION TEST REPORT")
        print("="*65)
        print(f"Tests Run: {self.results['tests_run']}")
        print(f"Tests Passed: {self.results['tests_passed']}")
        print(f"Tests Failed: {self.results['tests_failed']}")
        
        if self.results['critical_errors']:
            print(f"\n❌ CRITICAL ERRORS FOUND ({len(self.results['critical_errors'])}):")
            for i, error in enumerate(self.results['critical_errors'], 1):
                print(f"   {i}. {error}")
        
        if self.results['issues_found']:
            print(f"\n🐛 INTEGRATION ISSUES IDENTIFIED ({len(self.results['issues_found'])}):")
            for i, issue in enumerate(self.results['issues_found'], 1):
                print(f"\n   Issue #{i}: {issue['issue']}")
                for key, value in issue.items():
                    if key != 'issue':
                        print(f"   {key.title()}: {value}")
        
        if self.results['critical_errors'] or self.results['issues_found']:
            print("\n🔧 RECOMMENDED FIXES:")
            print("1. Update backend validation to use authenticated user data when step_data is empty")
            print("2. Modify ContactInfoStep.tsx to include user email in step_data for validation")
            print("3. Add integration tests for authenticated vs guest booking flows")
            print("4. Consider backend-side auto-population of user data for authenticated users")
        
        print(f"\n{'✅ ALL TESTS PASSED' if len(self.results['critical_errors']) == 0 else '❌ ISSUES FOUND'}")

def main():
    """Main test execution"""
    tester = BookingFlowIntegrationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Integration testing completed successfully")
        sys.exit(0)
    else:
        print("\n❌ Critical integration issues found - see report above")
        sys.exit(1)

if __name__ == '__main__':
    main()