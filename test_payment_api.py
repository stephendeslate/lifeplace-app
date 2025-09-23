#!/usr/bin/env python3
import requests
import json

def get_token(email, password):
    """Get JWT token for authentication"""
    login_url = "http://localhost:8000/api/users/login/"

    try:
        response = requests.post(login_url, json={
            "email": email,
            "password": password
        })

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login successful for {email}")
            print(f"Role: {data.get('user', {}).get('role', 'Unknown')}")
            return data.get('tokens', {}).get('access')
        else:
            print(f"❌ Login failed for {email}: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error logging in {email}: {e}")
        return None

def test_payment_endpoints(token, is_admin=False):
    """Test payment-related API endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    base_url = "http://localhost:8000/api"

    endpoints_to_test = [
        ("GET", "/payments/settings/", "Payment Settings"),
        ("GET", "/payments/client/payment-methods/", "Client Payment Methods"),
    ]

    if is_admin:
        endpoints_to_test.append(("GET", "/payments/gateways/?is_active=true", "Payment Gateways (Admin)"))

    for method, endpoint, description in endpoints_to_test:
        try:
            print(f"\n🔍 Testing {description}")
            url = f"{base_url}{endpoint}"

            if method == "GET":
                response = requests.get(url, headers=headers)
            else:
                response = requests.request(method, url, headers=headers)

            print(f"   Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if endpoint == "/payments/settings/":
                    # Handle both single object and list responses
                    settings = data[0] if isinstance(data, list) and len(data) > 0 else data
                    print(f"   ✅ Default Currency: {settings.get('default_currency', 'Not found')}")
                    print(f"   ✅ Available Currencies: {settings.get('available_currencies', 'Not found')}")
                elif endpoint == "/payments/gateways/?is_active=true":
                    results = data.get('results', [])
                    print(f"   ✅ Active Gateways: {len(results)}")
                    for gateway in results:
                        print(f"      - {gateway.get('name')} ({gateway.get('code')})")
                elif endpoint == "/payments/client/payment-methods/":
                    results = data.get('results', [])
                    print(f"   ✅ Payment Methods: {len(results)}")
                    for method in results:
                        print(f"      - {method.get('nickname', method.get('type_display'))} ({method.get('type')})")
                else:
                    print(f"   ✅ Response received with {len(str(data))} characters")
            elif response.status_code == 401:
                print(f"   ⚠️  Authentication required")
            elif response.status_code == 403:
                print(f"   ⚠️  Access forbidden (insufficient permissions)")
            else:
                print(f"   ❌ Error: {response.text[:200]}")

        except Exception as e:
            print(f"   ❌ Request failed: {e}")

def main():
    print("🚀 Testing Payment Gateway Integration\n")

    # Test credentials based on the CLAUDE.md instructions
    test_credentials = [
        ("test@test.com", "testpass123", True),  # Admin user that worked before
        ("john.doe@gmail.com", "test123", False),  # Client user from instructions
    ]

    for email, password, is_admin in test_credentials:
        print(f"\n{'='*50}")
        print(f"Testing with {email} ({'Admin' if is_admin else 'Client'})")
        print('='*50)

        token = get_token(email, password)
        if token:
            test_payment_endpoints(token, is_admin)
        else:
            print("❌ Cannot test endpoints without valid token")

if __name__ == "__main__":
    main()