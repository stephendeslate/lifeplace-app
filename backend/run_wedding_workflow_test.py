#!/usr/bin/env python
"""
Script to run comprehensive wedding workflow tests
This tests the entire LifePlace platform integration
"""

import os
import sys
import django
from django.conf import settings

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import TestCase
from django.test.runner import DiscoverRunner
try:
    from test_wedding_workflow_complete import TestWeddingWorkflowComplete, TestWeddingWorkflowEdgeCases
except ImportError as e:
    print(f"Error importing test modules: {e}")
    print("Make sure you're running this from the backend directory with proper Django setup.")
    sys.exit(1)

def run_comprehensive_test():
    """Run the comprehensive wedding workflow test"""
    
    print("\n" + "="*70)
    print(" LIFEPLACE PLATFORM - COMPREHENSIVE WEDDING WORKFLOW TEST ")
    print("="*70)
    print("\nThis test validates the entire wedding booking and management workflow")
    print("from initial customer booking through post-event feedback.\n")
    print("Components tested:")
    print("  • Booking Flow (7 steps)")
    print("  • Event Creation & Management")
    print("  • Workflow Automation")
    print("  • Quote Generation & Acceptance")
    print("  • Contract Creation & Signing")
    print("  • Payment Plans & Processing")
    print("  • Task Management")
    print("  • Client Portal Access")
    print("  • Communication Triggers")
    print("  • Analytics & Reporting")
    print("  • Error Handling & Validation")
    print("  • End-to-End Integration")
    print("\n" + "="*70 + "\n")
    
    # Create test runner
    runner = DiscoverRunner(verbosity=2, interactive=False, keepdb=False)
    
    # Run main workflow tests
    print("Starting comprehensive workflow tests...\n")
    test_suite = runner.test_loader.loadTestsFromTestCase(TestWeddingWorkflowComplete)
    result = runner.run_suite(test_suite)
    
    # Print results
    print("\n" + "="*70)
    print(" TEST RESULTS SUMMARY ")
    print("="*70)
    
    if result.wasSuccessful():
        print("\n✅ ALL TESTS PASSED!")
        print(f"\nTests run: {result.testsRun}")
        print(f"Failures: {len(result.failures)}")
        print(f"Errors: {len(result.errors)}")
        print("\nThe LifePlace platform wedding workflow is working correctly!")
    else:
        print("\n❌ SOME TESTS FAILED")
        print(f"\nTests run: {result.testsRun}")
        print(f"Failures: {len(result.failures)}")
        print(f"Errors: {len(result.errors)}")
        
        # Print failures
        if result.failures:
            print("\nFAILURES:")
            for test, traceback in result.failures:
                print(f"\n  • {test}")
                print(f"    {traceback[:200]}...")
        
        # Print errors
        if result.errors:
            print("\nERRORS:")
            for test, traceback in result.errors:
                print(f"\n  • {test}")
                print(f"    {traceback[:200]}...")
    
    print("\n" + "="*70)
    
    return result.wasSuccessful()

if __name__ == '__main__':
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)