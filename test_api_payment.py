#!/usr/bin/env python3
"""
Test the payment API endpoint directly via HTTP to simulate the frontend flow
"""
import requests
import json
import os
import sys
import django

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, os.path.abspath(backend_path))
os.chdir(backend_path)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.domains.payments.models import Invoice, PaymentMethod
from rest_framework_simplejwt.tokens import RefreshToken

def test_payment_api():
    """Test the payment API endpoint directly"""
    User = get_user_model()

    # Find test user
    user = User.objects.filter(email='john.doe@gmail.com').first()
    if not user:
        print("❌ User john.doe@gmail.com not found")
        return False

    print(f"✅ Found user: {user.email}")

    # Find an issued invoice
    invoice = Invoice.objects.filter(client=user, status='ISSUED').first()
    if not invoice:
        print("❌ No issued invoices found for user")
        return False

    print(f"✅ Found invoice: {invoice.invoice_id} - ${invoice.total_amount}")

    # Find a payment method for the user
    payment_method = PaymentMethod.objects.filter(user=user).first()
    if not payment_method:
        print("❌ No payment methods found for user")
        return False

    print(f"✅ Found payment method: {payment_method.type} (ID: {payment_method.id})")

    # Create JWT token for authentication
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    print("✅ Created JWT token for authentication")

    # Prepare API request
    url = f"http://localhost:8000/api/payments/client/invoices/{invoice.id}/pay/"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    payment_data = {
        'payment_method': payment_method.id,
        'gateway_code': 'stripe',
        'save_payment_method': False
    }

    print(f"\n🧪 Testing API payment for invoice {invoice.invoice_id}...")
    print(f"   URL: {url}")
    print(f"   Payload: {json.dumps(payment_data, indent=2)}")

    try:
        # Make the API request
        response = requests.post(url, json=payment_data, headers=headers, timeout=30)

        print(f"\n📡 API Response:")
        print(f"   Status Code: {response.status_code}")

        try:
            response_data = response.json()
            print(f"   Response Data: {json.dumps(response_data, indent=2)}")

            if response.status_code == 200 and response_data.get('success'):
                print("\n✅ API payment processed successfully!")
                payment_info = response_data.get('payment', {})
                print(f"   Payment ID: {payment_info.get('id')}")
                print(f"   Payment Status: {payment_info.get('status')}")
                return True
            else:
                print(f"\n❌ API payment failed!")
                print(f"   Error: {response_data.get('message', 'Unknown error')}")
                if 'atomic' in str(response_data).lower():
                    print("   This looks like the atomic transaction error!")
                return False

        except ValueError as e:
            print(f"   Response Body: {response.text}")
            print(f"   JSON Parse Error: {e}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ API request failed: {e}")
        return False

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_payment_api()
    if success:
        print("\n🎉 All API tests passed! The atomic transaction fix is working end-to-end.")
    else:
        print("\n💥 API tests failed.")
    sys.exit(0 if success else 1)