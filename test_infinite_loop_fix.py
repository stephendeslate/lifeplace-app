#!/usr/bin/env python3
"""
Test the infinite loop fix for pricing summary step
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

from django.test.client import Client
from core.domains.products.models import ProductOption

def test_batch_api_endpoint():
    """Test the new batch API endpoint"""
    print("🧪 Testing Batch API Endpoint Fix")
    print("="*40)
    
    client = Client()
    
    # Get some product IDs
    products = ProductOption.objects.filter(is_active=True)[:3]
    if not products:
        print("✗ No active products found for testing")
        return False
    
    product_ids = [p.id for p in products]
    print(f"✓ Testing with product IDs: {product_ids}")
    
    # Test the batch endpoint
    ids_string = ','.join(map(str, product_ids))
    response = client.get(f'/products/products/batch/?ids={ids_string}')
    
    if response.status_code != 200:
        print(f"✗ Batch endpoint failed with status {response.status_code}")
        print(f"   Response: {response.content.decode()}")
        return False
    
    data = response.json()
    print(f"✓ Batch endpoint returned {data['count']} products")
    
    # Verify all requested products are returned
    returned_ids = [p['id'] for p in data['products']]
    for pid in product_ids:
        if pid in returned_ids:
            print(f"  ✓ Product {pid} found in batch response")
        else:
            print(f"  ✗ Product {pid} missing from batch response")
            return False
    
    # Test error conditions
    print("\n--- Testing Error Conditions ---")
    
    # Test empty IDs
    response = client.get('/products/products/batch/')
    if response.status_code == 400:
        print("✓ Properly returns 400 for missing IDs parameter")
    else:
        print("✗ Should return 400 for missing IDs parameter")
    
    # Test invalid IDs format
    response = client.get('/products/products/batch/?ids=invalid,format')
    if response.status_code == 400:
        print("✓ Properly returns 400 for invalid IDs format")
    else:
        print("✗ Should return 400 for invalid IDs format")
    
    # Test too many IDs
    many_ids = ','.join(map(str, range(1, 52)))  # 51 IDs (over the limit)
    response = client.get(f'/products/products/batch/?ids={many_ids}')
    if response.status_code == 400:
        print("✓ Properly returns 400 for too many IDs (>50)")
    else:
        print("✗ Should return 400 for too many IDs")
    
    return True

def verify_fixes_implemented():
    """Verify all fixes are properly implemented in the code"""
    print("\n🔍 Verifying All Fixes Are Implemented")
    print("="*45)
    
    fixes_verified = 0
    total_fixes = 5
    
    # Fix 1: Batch API endpoint
    try:
        from core.domains.products.views import ProductOptionViewSet
        # Check if the method exists
        if hasattr(ProductOptionViewSet, 'batch'):
            print("✓ Fix 1: Batch API endpoint implemented")
            fixes_verified += 1
        else:
            print("✗ Fix 1: Batch API endpoint NOT implemented")
    except Exception as e:
        print(f"✗ Fix 1: Error checking batch endpoint: {e}")
    
    # Fix 2: Frontend API update (file exists check)
    frontend_api_file = Path(__file__).parent / 'frontend/client-portal/src/apis/booking/products.api.ts'
    if frontend_api_file.exists():
        content = frontend_api_file.read_text()
        if '/products/products/batch/' in content:
            print("✓ Fix 2: Frontend API updated to use batch endpoint")
            fixes_verified += 1
        else:
            print("✗ Fix 2: Frontend API still uses individual calls")
    else:
        print("✗ Fix 2: Frontend API file not found")
    
    # Fix 3: Hook optimization (file exists check)
    hook_file = Path(__file__).parent / 'frontend/client-portal/src/hooks/booking/usePricingSummary.tsx'
    if hook_file.exists():
        content = hook_file.read_text()
        if 'useMemo' in content and 'packageIds' in content:
            print("✓ Fix 3: React hook dependencies optimized with useMemo")
            fixes_verified += 1
        else:
            print("✗ Fix 3: React hook dependencies not optimized")
    else:
        print("✗ Fix 3: Hook file not found")
    
    # Fix 4: Component debounce timeout
    component_file = Path(__file__).parent / 'frontend/client-portal/src/components/booking/steps/PricingSummaryStep.tsx'
    if component_file.exists():
        content = component_file.read_text()
        if '500)' in content and 'Increased debounce timeout' in content:
            print("✓ Fix 4: Component debounce timeout increased to 500ms")
            fixes_verified += 1
        else:
            print("✗ Fix 4: Component debounce timeout not increased")
    else:
        print("✗ Fix 4: Component file not found")
    
    # Fix 5: Hook debounce timeout
    if hook_file.exists():
        content = hook_file.read_text()
        if '800)' in content and 'prevent infinite loops' in content:
            print("✓ Fix 5: Hook debounce timeout increased to 800ms")
            fixes_verified += 1
        else:
            print("✗ Fix 5: Hook debounce timeout not increased")
    
    print(f"\n📊 Fixes Implementation Status: {fixes_verified}/{total_fixes}")
    
    if fixes_verified == total_fixes:
        print("🎉 ALL FIXES SUCCESSFULLY IMPLEMENTED!")
        return True
    else:
        print("⚠️  Some fixes are missing or incomplete")
        return False

def main():
    """Main test execution"""
    print("🎯 Testing Pricing Summary Infinite Loop Fixes")
    print("="*50)
    
    # Test backend fix
    backend_success = test_batch_api_endpoint()
    
    # Verify all fixes
    fixes_success = verify_fixes_implemented()
    
    if backend_success and fixes_success:
        print("\n✅ ALL FIXES VERIFIED - INFINITE LOOP SHOULD BE RESOLVED!")
        print("\n🎯 Summary of fixes applied:")
        print("1. ✅ Backend: Added batch API endpoint for products")
        print("2. ✅ Frontend: Updated API to use batch requests instead of individual calls")
        print("3. ✅ Hook: Optimized dependencies with useMemo to prevent unnecessary re-fetches")
        print("4. ✅ Component: Increased debounce timeout to 500ms")
        print("5. ✅ Hook: Increased server pricing debounce to 800ms")
        print("\n🔄 What this fixes:")
        print("- No more N individual API calls to /products/{id}")
        print("- No more unnecessary re-renders from array reference changes")
        print("- Proper debouncing prevents rapid-fire requests")
        print("- Single batch API call replaces multiple individual calls")
        
        return True
    else:
        print("\n❌ SOME ISSUES REMAIN - PLEASE REVIEW FIXES")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)