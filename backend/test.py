# backend/quick_test_final_fix.py

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_name_fix():
    """Test the recipient name fix"""
    
    print("🧪 Testing Recipient Name Fix")
    print("=" * 30)
    
    from core.domains.communications.services import BrevoProvider
    
    brevo = BrevoProvider()
    
    # Test 1: With explicit name
    print("Test 1: With explicit recipient name")
    try:
        result = brevo.send_email(
            recipient="stephendeslate@gmail.com",
            subject="Test with Name",
            body="<h1>Test 1</h1><p>Testing with explicit name.</p>",
            sender_email="stephendeslate@gmail.com",
            sender_name="LifePlace",
            recipient_name="Stephen Deslate"  # Explicit name
        )
        print(f"✅ Test 1 Success: {result}")
    except Exception as e:
        print(f"❌ Test 1 Failed: {e}")
    
    # Test 2: Without name (should auto-generate)
    print("\nTest 2: Without recipient name (auto-generate)")
    try:
        result = brevo.send_email(
            recipient="stephendeslate@gmail.com",
            subject="Test without Name",
            body="<h1>Test 2</h1><p>Testing without explicit name.</p>",
            sender_email="stephendeslate@gmail.com",
            sender_name="LifePlace"
            # No recipient_name - should auto-generate "Stephendeslate"
        )
        print(f"✅ Test 2 Success: {result}")
    except Exception as e:
        print(f"❌ Test 2 Failed: {e}")

if __name__ == "__main__":
    test_name_fix()
    
    print("\n🔧 What Changed:")
    print("- Fixed empty 'name' field in 'to' array")
    print("- Auto-generates name from email if not provided")
    print("- 'stephendeslate@gmail.com' becomes 'Stephendeslate'")
    
    print("\n📧 Expected Request Format:")
    print('''
    {
      "to": [
        {
          "email": "stephendeslate@gmail.com",
          "name": "Stephendeslate"  // ← FIXED: No longer empty
        }
      ]
    }
    ''')