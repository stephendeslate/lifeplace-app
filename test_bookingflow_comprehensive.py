#!/usr/bin/env python3
"""
Comprehensive BookingFlow domain testing focusing on the critical validation logic

This script directly tests the BookingFlow domain services and models to identify
the specific issues with authenticated user booking completion.

Run with: source venv/bin/activate && python test_bookingflow_comprehensive.py
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
from core.domains.events.models import EventType
from core.domains.users.services import UserService
from decimal import Decimal
import json

User = get_user_model()

class ComprehensiveBookingFlowTester:
    """Comprehensive testing of BookingFlow domain"""
    
    def __init__(self):
        self.test_user = None
        self.test_flow = None
        self.test_sessions = {}
        self.results = {
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'issues_found': [],
            'critical_errors': []
        }
    
    def setup_test_data(self):
        """Setup comprehensive test data"""
        print("Setting up test data...")
        
        # Create test user with profile
        try:
            self.test_user = User.objects.filter(email='comprehensive_test@example.com').first()
            if not self.test_user:
                user_data = {
                    'email': 'comprehensive_test@example.com',
                    'first_name': 'Comprehensive',
                    'last_name': 'TestUser',
                    'password': 'testpass123',
                    'role': 'CLIENT',
                    'is_active': True,
                }
                self.test_user = UserService.create_user(user_data)
                
                # Ensure profile is created with data
                from core.domains.users.models import UserProfile
                profile, created = UserProfile.objects.get_or_create(
                    user=self.test_user,
                    defaults={
                        'phone': '+63912345678',
                        'company': 'Test Company'
                    }
                )
                
            print(f"✓ Test user: {self.test_user.email}")
            print(f"  - Name: {self.test_user.first_name} {self.test_user.last_name}")
            print(f"  - Phone: {getattr(self.test_user.profile, 'phone', 'Not set') if hasattr(self.test_user, 'profile') and self.test_user.profile else 'No profile'}")
        except Exception as e:
            print(f"✗ Failed to create test user: {e}")
            return False
        
        # Find active booking flow
        try:
            self.test_flow = BookingFlow.objects.filter(is_active=True).first()
            if not self.test_flow:
                print("✗ No active booking flow found")
                return False
            print(f"✓ Using booking flow: {self.test_flow.name}")
            print(f"  - Allow guest booking: {self.test_flow.allow_guest_booking}")
            print(f"  - Require account creation: {self.test_flow.require_account_creation}")
            
            # Show enabled steps
            enabled_steps = self.test_flow.enabled_steps.all()
            print(f"  - Enabled steps ({len(enabled_steps)}):")
            for step in enabled_steps:
                print(f"    {step.order}. {step.name} ({step.step_type})")
                
        except Exception as e:
            print(f"✗ Failed to find booking flow: {e}")
            return False
        
        return True
    
    def test_contact_info_step_configurations(self):
        """Test contact info step configurations thoroughly"""
        print("\n=== Test 1: Contact Info Step Configuration Analysis ===")
        self.results['tests_run'] += 1
        
        try:
            contact_steps = self.test_flow.steps.filter(step_type='contact_info')
            
            if not contact_steps.exists():
                print("✓ No contact info step in this flow - skipping detailed analysis")
                self.results['tests_passed'] += 1
                return True
            
            contact_step = contact_steps.first()
            print(f"✓ Found contact info step: {contact_step.name}")
            print(f"  - Order: {contact_step.order}")
            print(f"  - Is required: {contact_step.is_required}")
            print(f"  - Is enabled: {contact_step.is_enabled}")
            
            # Check configuration
            try:
                config = contact_step.contact_config
                print(f"  - Configuration found:")
                print(f"    * Require full name: {config.require_full_name}")
                print(f"    * Require email: {config.require_email}")
                print(f"    * Require phone: {config.require_phone}")
                print(f"    * Require address: {config.require_address}")
                print(f"    * Require company: {config.require_company}")
                print(f"    * Offer account creation: {config.offer_account_creation}")
                print(f"    * Require account creation: {config.require_account_creation}")
                
                # This is a critical analysis: if backend requires email but frontend disables it for auth users
                if config.require_email:
                    print(f"  ⚠️  POTENTIAL ISSUE: Backend requires email field")
                    print(f"      Frontend ContactInfoStep.tsx:196 disables email field for authenticated users")
                    print(f"      This could cause validation failures!")
                    
                    self.results['issues_found'].append({
                        'issue': 'Potential email validation conflict',
                        'description': 'Backend requires email, frontend disables it for auth users',
                        'location': 'ContactInfoStep.tsx:196 vs contact_config.require_email=True',
                        'severity': 'High',
                        'impact': 'Authenticated users may not be able to complete contact info step'
                    })
                
            except Exception as e:
                print(f"  ✗ No contact config found or error accessing it: {e}")
                # This could be an issue too
                self.results['issues_found'].append({
                    'issue': 'Contact info step missing configuration',
                    'description': f'Contact info step exists but no configuration: {e}',
                    'severity': 'Medium'
                })
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Error analyzing contact info step: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Contact info analysis failed: {e}")
            return False
    
    def test_authenticated_user_complete_flow_simulation(self):
        """Simulate complete booking flow for authenticated user"""
        print("\n=== Test 2: Authenticated User Complete Flow Simulation ===")
        self.results['tests_run'] += 1
        
        try:
            # Create session for authenticated user
            session = BookingSessionService.create_session(
                booking_flow_id=self.test_flow.id,
                client_id=self.test_user.id
            )
            self.test_sessions['auth'] = session
            print(f"✓ Created authenticated session: {session.session_id}")
            print(f"  - Client: {session.client.email}")
            print(f"  - Current step: {session.current_step.name if session.current_step else 'None'}")
            
            # Step through each step
            steps = self.test_flow.enabled_steps.all()
            current_step_index = 0
            
            for step in steps:
                print(f"\n--- Processing Step: {step.name} ({step.step_type}) ---")
                
                # Navigate to this step
                session.current_step = step
                session.save()
                
                # Simulate step data based on step type
                step_data = self.generate_step_data(step.step_type, is_authenticated=True)
                print(f"  Generated step data: {json.dumps(step_data, indent=2, default=str)}")
                
                # Test validation
                try:
                    validation_errors = BookingSessionService._validate_step_data(step, step_data)
                    if validation_errors:
                        print(f"  ✗ VALIDATION FAILED: {validation_errors}")
                        
                        # This is critical for contact_info step
                        if step.step_type == 'contact_info':
                            print(f"  ❌ CRITICAL: Contact info validation failed for authenticated user!")
                            self.results['critical_errors'].append(
                                f"Contact info validation failed for authenticated user: {validation_errors}"
                            )
                            self.results['issues_found'].append({
                                'issue': 'Contact info validation failure for authenticated users',
                                'step': step.name,
                                'step_type': step.step_type,
                                'validation_errors': validation_errors,
                                'step_data_sent': step_data,
                                'user_email': self.test_user.email,
                                'user_has_profile': hasattr(self.test_user, 'profile') and self.test_user.profile is not None,
                                'severity': 'Critical',
                                'root_cause': 'Backend validation does not consider authenticated user data'
                            })
                    else:
                        print(f"  ✓ Step validation passed")
                    
                    # Try to update session data
                    updated_session = BookingSessionService.update_session_data(
                        session_id=str(session.session_id),
                        step_data=step_data,
                        mark_completed=True
                    )
                    
                    print(f"  ✓ Step data updated successfully")
                    print(f"  Current step after update: {updated_session.current_step.name if updated_session.current_step else 'Completed'}")
                    
                    session = updated_session  # Update local reference
                    
                except Exception as step_error:
                    print(f"  ✗ Step processing failed: {step_error}")
                    
                    if step.step_type == 'contact_info':
                        print(f"  ❌ CRITICAL: Contact info step failed for authenticated user!")
                        self.results['critical_errors'].append(
                            f"Contact info step processing failed: {step_error}"
                        )
                        self.results['issues_found'].append({
                            'issue': 'Contact info step processing failure',
                            'step': step.name,
                            'step_type': step.step_type,
                            'error': str(step_error),
                            'step_data_sent': step_data,
                            'severity': 'Critical'
                        })
                        # Don't continue if contact info fails
                        self.results['tests_failed'] += 1
                        return False
                    else:
                        # Non-critical step failure, log but continue
                        self.results['issues_found'].append({
                            'issue': f'Step processing failure: {step.step_type}',
                            'error': str(step_error),
                            'severity': 'Medium'
                        })
                        break  # Stop processing further steps
            
            # Try to complete booking if we got through all steps
            if session.current_step is None:  # All steps completed
                print(f"\n--- Attempting Booking Completion ---")
                try:
                    completed_event = BookingSessionService.complete_booking(str(session.session_id))
                    print(f"  ✓ Booking completed successfully! Event ID: {completed_event.id}")
                except Exception as completion_error:
                    print(f"  ✗ CRITICAL: Booking completion failed: {completion_error}")
                    self.results['critical_errors'].append(
                        f"Booking completion failed for authenticated user: {completion_error}"
                    )
                    self.results['tests_failed'] += 1
                    return False
            else:
                print(f"\n--- Could not complete booking - stuck at step: {session.current_step.name} ---")
                self.results['issues_found'].append({
                    'issue': 'Booking flow incomplete',
                    'stuck_at_step': session.current_step.name,
                    'severity': 'High'
                })
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Complete flow simulation failed: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Flow simulation exception: {e}")
            return False
    
    def test_guest_user_vs_authenticated_user_comparison(self):
        """Compare booking flow behavior between guest and authenticated users"""
        print("\n=== Test 3: Guest vs Authenticated User Comparison ===")
        self.results['tests_run'] += 1
        
        try:
            # Create guest session
            guest_session = BookingSessionService.create_session(
                booking_flow_id=self.test_flow.id,
                client_id=None  # No client for guest
            )
            self.test_sessions['guest'] = guest_session
            
            print(f"✓ Created guest session: {guest_session.session_id}")
            print(f"✓ Guest session client: {guest_session.client}")
            
            # Find contact info step
            contact_steps = self.test_flow.steps.filter(step_type='contact_info')
            if not contact_steps.exists():
                print("✓ No contact info step - skipping comparison")
                self.results['tests_passed'] += 1
                return True
            
            contact_step = contact_steps.first()
            
            print(f"\n--- Comparing Contact Info Step Behavior ---")
            
            # Test guest user contact info (should require all fields)
            guest_step_data = {
                'full_name': 'Guest User',
                'email': 'guest@example.com',
                'phone': '+63987654321',
                'company': 'Guest Company'
            }
            
            guest_errors = BookingSessionService._validate_step_data(contact_step, guest_step_data)
            print(f"Guest validation with full data: {'✓ Passed' if not guest_errors else f'✗ Failed: {guest_errors}'}")
            
            # Test guest with missing email (should fail)
            guest_no_email = {
                'full_name': 'Guest User',
                'phone': '+63987654321',
            }
            guest_no_email_errors = BookingSessionService._validate_step_data(contact_step, guest_no_email)
            print(f"Guest validation without email: {'✓ Failed as expected' if guest_no_email_errors else '✗ Unexpectedly passed'}")
            
            # Test authenticated user with empty data (this is the critical test)
            auth_session = self.test_sessions.get('auth')
            if auth_session:
                auth_session.current_step = contact_step
                auth_session.save()
                
                empty_step_data = {}  # Simulates frontend sending empty data for auth users
                auth_empty_errors = BookingSessionService._validate_step_data(contact_step, empty_step_data)
                
                print(f"Authenticated user validation with empty data: {'✗ FAILED' if auth_empty_errors else '✓ Passed'}")
                
                if auth_empty_errors:
                    print(f"  ❌ CRITICAL ISSUE: Authenticated user validation fails with empty data")
                    print(f"  Validation errors: {auth_empty_errors}")
                    print(f"  User email available: {self.test_user.email}")
                    print(f"  User name available: {self.test_user.first_name} {self.test_user.last_name}")
                    
                    self.results['critical_errors'].append(
                        "Authenticated user contact info validation fails with empty step_data"
                    )
                    
                    self.results['issues_found'].append({
                        'issue': 'Authenticated user contact info validation failure',
                        'description': 'Backend requires contact info fields even when user is authenticated',
                        'expected_behavior': 'Backend should use authenticated user data when step_data is empty',
                        'actual_behavior': f'Validation fails with errors: {auth_empty_errors}',
                        'severity': 'Critical',
                        'fix_needed': 'Modify _validate_step_data to use session.client data for authenticated users'
                    })
                    
                    self.results['tests_failed'] += 1
                    return False
                else:
                    print(f"  ✓ Authenticated user validation passes (good!)")
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Comparison test failed: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Comparison test exception: {e}")
            return False
    
    def test_data_storage_consistency(self):
        """Test that package/addon data is stored consistently"""
        print("\n=== Test 4: Data Storage Consistency ===")
        self.results['tests_run'] += 1
        
        try:
            session = self.test_sessions.get('auth')
            if not session:
                session = BookingSessionService.create_session(
                    booking_flow_id=self.test_flow.id,
                    client_id=self.test_user.id
                )
            
            # Test package selection data storage
            package_data = {
                'selected_packages': [
                    {
                        'product_id': 1,
                        'name': 'Basic Wedding Package',
                        'price': '50000.00',
                        'quantity': 1
                    }
                ]
            }
            
            print("Testing package data storage...")
            updated_session = BookingSessionService.update_session_data(
                session_id=str(session.session_id),
                step_data=package_data,
                mark_completed=False
            )
            
            # Check if data is stored both at root level and step level
            booking_data = updated_session.booking_data
            root_packages = booking_data.get('selected_packages', [])
            step_packages = None
            
            for key, value in booking_data.items():
                if isinstance(value, dict) and 'selected_packages' in value:
                    step_packages = value['selected_packages']
                    break
            
            print(f"  Root level packages: {len(root_packages)} items")
            print(f"  Step level packages: {len(step_packages) if step_packages else 0} items")
            
            if root_packages and step_packages and root_packages == step_packages:
                print(f"  ⚠️  WARNING: Package data duplicated at root and step level")
                self.results['issues_found'].append({
                    'issue': 'Package data duplication',
                    'description': 'Packages stored both at root level and step level',
                    'impact': 'Potential double-counting in pricing calculations',
                    'severity': 'Medium'
                })
            
            # Test pricing calculation consistency
            calculated_total = updated_session.calculate_total_price()
            print(f"  Calculated total: ${calculated_total}")
            
            if calculated_total == Decimal('0.00') and root_packages:
                print(f"  ✗ Pricing calculation returned zero despite having packages")
                self.results['issues_found'].append({
                    'issue': 'Pricing calculation failure',
                    'description': 'Total price is zero despite selected packages',
                    'severity': 'High'
                })
                self.results['tests_failed'] += 1
                return False
            
            self.results['tests_passed'] += 1
            return True
            
        except Exception as e:
            print(f"✗ Data storage test failed: {e}")
            self.results['tests_failed'] += 1
            self.results['critical_errors'].append(f"Data storage test exception: {e}")
            return False
    
    def generate_step_data(self, step_type, is_authenticated=False):
        """Generate appropriate step data for testing"""
        if step_type == 'introduction':
            return {'acknowledged': True}
        
        elif step_type == 'contact_info':
            if is_authenticated:
                # Simulate frontend behavior: empty data for authenticated users
                # because email field is disabled (ContactInfoStep.tsx:196)
                return {}
            else:
                # Guest users must provide all data
                return {
                    'full_name': 'Guest User',
                    'email': 'guest@example.com',
                    'phone': '+63987654321',
                    'company': 'Guest Company'
                }
        
        elif step_type == 'date_time':
            return {
                'start_date': '2025-09-15',
                'start_time': '14:00',
                'duration': 8
            }
        
        elif step_type == 'package_selection':
            return {
                'selected_packages': [
                    {
                        'product_id': 1,
                        'name': 'Test Package',
                        'price': '25000.00',
                        'quantity': 1
                    }
                ]
            }
        
        elif step_type == 'addon_selection':
            return {
                'selected_addons': [
                    {
                        'product_id': 2,
                        'name': 'Test Addon',
                        'price': '5000.00',
                        'quantity': 1
                    }
                ]
            }
        
        elif step_type == 'questionnaire':
            return {
                'field_1': 'Test response',
                'field_2': 'Another response'
            }
        
        elif step_type == 'payment_info':
            return {
                'gateway_id': 1,
                'payment_method_id': 'test_payment_method'
            }
        
        elif step_type == 'review_booking':
            return {
                'terms_accepted': True,
                'marketing_consent': False
            }
        
        else:
            return {}
    
    def cleanup(self):
        """Clean up test data"""
        print("\nCleaning up test data...")
        try:
            for session_type, session in self.test_sessions.items():
                if session:
                    try:
                        session.delete()
                        print(f"✓ {session_type} session deleted")
                    except Exception as e:
                        print(f"Warning: Failed to delete {session_type} session: {e}")
        except Exception as e:
            print(f"Warning: Cleanup failed: {e}")
    
    def run_all_tests(self):
        """Run all comprehensive tests"""
        print("🚀 Starting Comprehensive BookingFlow Domain Testing")
        print("="*60)
        
        if not self.setup_test_data():
            print("❌ Test setup failed, aborting")
            return False
        
        # Run tests
        tests = [
            self.test_contact_info_step_configurations,
            self.test_authenticated_user_complete_flow_simulation,
            self.test_guest_user_vs_authenticated_user_comparison,
            self.test_data_storage_consistency,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"✗ Test failed with unexpected error: {e}")
                self.results['tests_failed'] += 1
                self.results['critical_errors'].append(f"Unexpected failure in {test.__name__}: {e}")
        
        # Generate report
        self.print_comprehensive_report()
        
        # Cleanup
        self.cleanup()
        
        return len(self.results['critical_errors']) == 0
    
    def print_comprehensive_report(self):
        """Print detailed test results and recommendations"""
        print("\n" + "="*80)
        print("📊 COMPREHENSIVE BOOKINGFLOW DOMAIN TEST REPORT")
        print("="*80)
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
                print(f"   Severity: {issue.get('severity', 'Unknown')}")
                if 'description' in issue:
                    print(f"   Description: {issue['description']}")
                if 'location' in issue:
                    print(f"   Location: {issue['location']}")
                if 'impact' in issue:
                    print(f"   Impact: {issue['impact']}")
                if 'fix_needed' in issue:
                    print(f"   Fix Needed: {issue['fix_needed']}")
        
        if self.results['critical_errors'] or self.results['issues_found']:
            print(f"\n🔧 COMPREHENSIVE RECOMMENDATIONS:")
            print("1. BACKEND FIX: Update BookingSessionService._validate_step_data()")
            print("   - For contact_info step, check if user is authenticated (session.client)")
            print("   - Use session.client.email, first_name, last_name when step_data is empty")
            print("   - Only validate fields not available from authenticated user profile")
            print()
            print("2. FRONTEND FIX: Update ContactInfoStep.tsx")
            print("   - Either include user email in step_data for validation")
            print("   - Or handle validation errors gracefully for disabled fields")
            print()
            print("3. INTEGRATION: Add proper integration tests")
            print("   - Test authenticated vs guest user flows separately")
            print("   - Test all step types with both user types")
            print()
            print("4. DATA CONSISTENCY: Fix package/addon storage")
            print("   - Ensure single source of truth for selected products")
            print("   - Prevent duplication in pricing calculations")
        
        print(f"\n{'✅ ALL TESTS PASSED - DOMAIN IS HEALTHY' if len(self.results['critical_errors']) == 0 else '❌ CRITICAL ISSUES FOUND - REQUIRES IMMEDIATE ATTENTION'}")

def main():
    """Main test execution"""
    tester = ComprehensiveBookingFlowTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Comprehensive testing completed successfully")
        sys.exit(0)
    else:
        print("\n❌ Critical issues found - see detailed report above")
        sys.exit(1)

if __name__ == '__main__':
    main()