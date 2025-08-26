#!/usr/bin/env python3
"""
Test script to reproduce and verify the authenticated user contact info step bug

This script tests the specific issue where authenticated users cannot proceed
past the contact info step due to backend validation requiring fields that
are disabled on the frontend for authenticated users.

Run with: python test_bookingflow_authenticated_user_bug.py
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
from core.domains.events.models import EventType
from core.domains.users.services import UserService

User = get_user_model()

class BookingFlowAuthenticatedUserTester:
    """Test authenticated user booking flow issues"""
    
    def __init__(self):
        self.test_user = None
        self.test_flow = None
        self.test_session = None
        self.results = {
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'issues_found': [],
            'critical_errors': []
        }
    
    def setup_test_data(self):
        """Create test user and booking flow"""
        print("Setting up test data...")
        
        # Create test user
        try:
            self.test_user = User.objects.filter(email='test_authenticated@example.com').first()
            if not self.test_user:
                user_data = {
                    'email': 'test_authenticated@example.com',
                    'first_name': 'Test',
                    'last_name': 'User',
                    'password': 'testpass123',
                    'role': 'CLIENT',
                    'is_active': True,
                    'profile': {
                        'phone': '+63912345678',
                        'company': 'Test Company',
                    }
                }
                self.test_user = UserService.create_user(user_data)
            print(f"✓ Test user created/found: {self.test_user.email}")
        except Exception as e:
            print(f"✗ Failed to create test user: {e}")
            return False
        
        # Find or create test booking flow
        try:
            self.test_flow = BookingFlow.objects.filter(is_active=True).first()
            if not self.test_flow:
                # Create a basic flow for testing
                event_type = EventType.objects.first()
                self.test_flow = BookingFlow.objects.create(
                    name='Test Flow',
                    description='Test booking flow',
                    event_type=event_type,
                    is_active=True,
                    allow_guest_booking=True,
                    require_account_creation=False
                )
                
                # Add contact info step
                contact_step = BookingFlowStep.objects.create(
                    booking_flow=self.test_flow,
                    step_type='contact_info',
                    name='Contact Information',
                    order=1,
                    is_enabled=True,
                    is_required=True
                )
                
                from core.domains.bookingflow.models import ContactInfoStepConfiguration
                ContactInfoStepConfiguration.objects.create(
                    step=contact_step,
                    require_full_name=True,
                    require_email=True,
                    require_phone=True,
                    offer_account_creation=True,
                    require_account_creation=False
                )
                
            print(f"✓ Test booking flow ready: {self.test_flow.name}")
        except Exception as e:
            print(f"✗ Failed to setup booking flow: {e}")
            return False
        
        return True
    
    def test_authenticated_user_session_creation(self):
        """Test 1: Verify authenticated user session creation works"""
        print("\n=== Test 1: Authenticated User Session Creation ===")
        self.results['tests_run'] += 1
        
        try:
            # Create session for authenticated user
            self.test_session = BookingSessionService.create_session(
                booking_flow_id=self.test_flow.id,
                client_id=self.test_user.id
            )
            
            # Verify session was created with user association
            assert self.test_session is not None
            assert self.test_session.client == self.test_user
            assert self.test_session.booking_flow == self.test_flow
            
            print(f"✓ Session created with ID: {self.test_session.session_id}")
            print(f"✓ Session associated with user: {self.test_session.client.email}")
            self.results['tests_passed'] += 1
            
        except Exception as e:
            print(f"✗ Session creation failed: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Session creation failed: {e}")
            return False
        
        return True
    
    def test_contact_info_step_validation_bug(self):
        """Test 2: Reproduce the contact info step validation bug"""
        print("\n=== Test 2: Contact Info Step Validation Bug ===")
        self.results['tests_run'] += 1
        
        if not self.test_session:
            print("✗ No test session available")
            self.results['tests_failed'] += 1
            return False
        
        try:
            # Find contact info step
            contact_step = self.test_flow.steps.filter(step_type='contact_info').first()
            if not contact_step:
                print("✗ No contact info step found in test flow")
                self.results['tests_failed'] += 1
                return False
            
            # Navigate to contact info step
            self.test_session.current_step = contact_step
            self.test_session.save()
            
            print(f"✓ Navigated to contact info step: {contact_step.name}")
            
            # TEST CASE 1: Simulate frontend behavior - empty step_data (fields disabled for auth users)
            print("\n--- Testing with empty step_data (simulates disabled frontend fields) ---")
            empty_step_data = {}
            
            validation_errors = BookingSessionService._validate_step_data(
                contact_step, 
                empty_step_data
            )
            
            if validation_errors:
                print(f"✗ CRITICAL BUG CONFIRMED: Backend validation fails for authenticated users")
                print(f"   Validation errors: {validation_errors}")
                self.results['critical_errors'].append(
                    "Contact info step validation fails for authenticated users with empty step_data"
                )
                self.results['issues_found'].append({
                    'issue': 'Backend validation requires fields that are disabled for authenticated users',
                    'location': 'booking_session_service.py:612-623',
                    'impact': 'Authenticated users cannot proceed past contact info step',
                    'validation_errors': validation_errors
                })
            else:
                print("✓ No validation errors with empty step_data")
            
            # TEST CASE 2: Test with user data included in step_data
            print("\n--- Testing with user data in step_data ---")
            user_step_data = {
                'full_name': f"{self.test_user.first_name} {self.test_user.last_name}",
                'email': self.test_user.email,
                'phone': getattr(self.test_user.profile, 'phone', '') if hasattr(self.test_user, 'profile') and self.test_user.profile else '',
                'company': getattr(self.test_user.profile, 'company', '') if hasattr(self.test_user, 'profile') and self.test_user.profile else '',
            }
            
            validation_errors = BookingSessionService._validate_step_data(
                contact_step, 
                user_step_data
            )
            
            if validation_errors:
                print(f"✗ Validation still fails with user data: {validation_errors}")
            else:
                print("✓ Validation passes with user data in step_data")
            
            # TEST CASE 3: Try to proceed to next step with empty data
            print("\n--- Testing step progression with empty step_data ---")
            try:
                updated_session = BookingSessionService.update_session_data(
                    session_id=str(self.test_session.session_id),
                    step_data=empty_step_data,
                    mark_completed=True
                )
                print("✓ Step progression succeeded (unexpected - might be a different issue)")
            except Exception as e:
                print(f"✗ Step progression failed as expected: {e}")
                self.results['issues_found'].append({
                    'issue': 'Cannot progress from contact info step with empty data',
                    'error': str(e),
                    'expected': 'Should use authenticated user data for validation'
                })
            
            if validation_errors or any('contact_info' in error.get('issue', '') for error in self.results['issues_found']):
                self.results['tests_failed'] += 1
                return False
            else:
                self.results['tests_passed'] += 1
                return True
                
        except Exception as e:
            print(f"✗ Test failed with exception: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Contact info test exception: {e}")
            return False
    
    def test_frontend_backend_integration(self):
        """Test 3: Check frontend-backend integration issues"""
        print("\n=== Test 3: Frontend-Backend Integration ===")
        self.results['tests_run'] += 1
        
        try:
            # Simulate how frontend sends data for authenticated users
            print("Testing frontend data format expectations...")
            
            # The frontend ContactInfoStep component should send this data structure
            frontend_data_authenticated = {
                # Email is disabled for authenticated users, so it's not included
                'full_name': f"{self.test_user.first_name} {self.test_user.last_name}",
                'phone': '+63912345678',
                'address': '',
                'company': 'Test Company',
                'create_account': False,  # Already authenticated
                'password': '',
            }
            
            # Check if backend can handle this
            contact_step = self.test_flow.steps.filter(step_type='contact_info').first()
            validation_errors = BookingSessionService._validate_step_data(
                contact_step,
                frontend_data_authenticated
            )
            
            if 'email' in validation_errors:
                print(f"✗ INTEGRATION BUG: Frontend doesn't send email for auth users, backend requires it")
                self.results['issues_found'].append({
                    'issue': 'Frontend-backend mismatch for authenticated user email handling',
                    'frontend_behavior': 'Email field disabled, not sent in request',
                    'backend_expectation': 'Email field required in step_data',
                    'suggested_fix': 'Backend should use session.client.email when user is authenticated'
                })
                self.results['tests_failed'] += 1
                return False
            else:
                print("✓ Integration works correctly")
                self.results['tests_passed'] += 1
                return True
                
        except Exception as e:
            print(f"✗ Integration test failed: {e}")
            self.results['tests_failed'] += 1
            return False
    
    def test_proposed_solution(self):
        """Test 4: Verify proposed solution works"""
        print("\n=== Test 4: Testing Proposed Solution ===")
        self.results['tests_run'] += 1
        
        try:
            # This tests what the fix should do:
            # Use authenticated user's data when validating contact info step
            
            contact_step = self.test_flow.steps.filter(step_type='contact_info').first()
            config = contact_step.contact_config
            
            # Simulate the fixed validation logic
            step_data = {}  # Empty data from frontend (email field disabled)
            errors = {}
            
            print("Testing improved validation logic...")
            
            # Proposed fix: Check session user data when step_data is missing required fields
            session_user = self.test_session.client
            
            # Full name validation
            if config.require_full_name and not step_data.get('full_name'):
                if session_user and session_user.first_name and session_user.last_name:
                    print("✓ Using session user's full name instead of requiring step_data")
                else:
                    errors['full_name'] = ["Full name is required"]
            
            # Email validation  
            if config.require_email and not step_data.get('email'):
                if session_user and session_user.email:
                    print("✓ Using session user's email instead of requiring step_data")
                else:
                    errors['email'] = ["Email is required"]
            
            # Phone validation
            if config.require_phone and not step_data.get('phone'):
                if session_user and hasattr(session_user, 'profile') and session_user.profile and getattr(session_user.profile, 'phone', ''):
                    print("✓ Using session user's phone instead of requiring step_data")
                else:
                    # This might still require user input if not in profile
                    errors['phone'] = ["Phone number is required"]
            
            if not errors:
                print("✓ Proposed solution would resolve the validation issue")
                self.results['tests_passed'] += 1
                return True
            else:
                print(f"✗ Proposed solution still has issues: {errors}")
                self.results['tests_failed'] += 1
                return False
                
        except Exception as e:
            print(f"✗ Solution test failed: {e}")
            self.results['tests_failed'] += 1
            return False
    
    def cleanup(self):
        """Clean up test data"""
        print("\nCleaning up test data...")
        try:
            if self.test_session:
                self.test_session.delete()
                print("✓ Test session deleted")
            
            # Don't delete test user - might be reused
            print("✓ Test user preserved for future tests")
            
        except Exception as e:
            print(f"Warning: Cleanup failed: {e}")
    
    def run_all_tests(self):
        """Run all tests and report results"""
        print("🚀 Starting BookingFlow Authenticated User Bug Testing")
        print("="*60)
        
        if not self.setup_test_data():
            print("❌ Test setup failed, aborting")
            return False
        
        # Run tests in order
        tests = [
            self.test_authenticated_user_session_creation,
            self.test_contact_info_step_validation_bug,
            self.test_frontend_backend_integration,
            self.test_proposed_solution
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"✗ Test failed with unexpected error: {e}")
                self.results['tests_failed'] += 1
                self.results['critical_errors'].append(f"Unexpected test failure: {e}")
        
        # Report results
        self.print_final_report()
        
        # Cleanup
        self.cleanup()
        
        return self.results['tests_passed'] > 0 and len(self.results['critical_errors']) == 0
    
    def print_final_report(self):
        """Print comprehensive test results"""
        print("\n" + "="*60)
        print("📊 FINAL TEST REPORT")
        print("="*60)
        print(f"Tests Run: {self.results['tests_run']}")
        print(f"Tests Passed: {self.results['tests_passed']}")
        print(f"Tests Failed: {self.results['tests_failed']}")
        
        if self.results['critical_errors']:
            print(f"\n❌ CRITICAL ERRORS FOUND ({len(self.results['critical_errors'])}):")
            for i, error in enumerate(self.results['critical_errors'], 1):
                print(f"   {i}. {error}")
        
        if self.results['issues_found']:
            print(f"\n🐛 ISSUES IDENTIFIED ({len(self.results['issues_found'])}):")
            for i, issue in enumerate(self.results['issues_found'], 1):
                print(f"\n   Issue #{i}: {issue['issue']}")
                if 'location' in issue:
                    print(f"   Location: {issue['location']}")
                if 'impact' in issue:
                    print(f"   Impact: {issue['impact']}")
                if 'suggested_fix' in issue:
                    print(f"   Suggested Fix: {issue['suggested_fix']}")
        
        print(f"\n{'✅ ALL TESTS PASSED' if self.results['tests_failed'] == 0 else '❌ ISSUES FOUND'}")
        
        if self.results['issues_found']:
            print("\n🔧 RECOMMENDED ACTIONS:")
            print("1. Fix backend validation in booking_session_service.py:612-623")
            print("2. Use authenticated user data when step_data is missing required fields")
            print("3. Update ContactInfoStep frontend to handle validation properly")
            print("4. Add integration tests for authenticated user booking flows")

def main():
    """Main test execution"""
    tester = BookingFlowAuthenticatedUserTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Testing completed successfully")
        sys.exit(0)
    else:
        print("\n❌ Critical issues found - see report above")
        sys.exit(1)

if __name__ == '__main__':
    main()