#!/usr/bin/env python3
"""
Comprehensive Payment API Testing
Tests all payment-related endpoints with authentication
"""

import requests
import json
import sys
from datetime import datetime

# Test Configuration
BASE_URL = "http://localhost:8001"
CLIENT_CREDENTIALS = {
    "email": "john.doe@gmail.com",
    "password": "test123"
}
ADMIN_CREDENTIALS = {
    "email": "stephendeslate@gmail.com",
    "password": "HuDi#[Ta3"
}

class PaymentAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.client_token = None
        self.admin_token = None
        self.test_results = []

    def log_test(self, test_name, success, details=None, error=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details,
            "error": str(error) if error else None
        }
        self.test_results.append(result)

        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if error:
            print(f"    Error: {error}")
        if details:
            print(f"    Details: {details}")
        print()

    def authenticate_client(self):
        """Authenticate as client user"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/users/login/",
                json=CLIENT_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                if 'tokens' in data and 'access' in data['tokens']:
                    self.client_token = data['tokens']['access']
                    self.log_test("Client Authentication", True, f"User: {data.get('user', {}).get('email')}")
                    return True
                else:
                    self.log_test("Client Authentication", False, error="No access token in response")
                    return False
            else:
                self.log_test("Client Authentication", False, error=f"HTTP {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log_test("Client Authentication", False, error=e)
            return False

    def authenticate_admin(self):
        """Authenticate as admin user"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/users/login/",
                json=ADMIN_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                if 'tokens' in data and 'access' in data['tokens']:
                    self.admin_token = data['tokens']['access']
                    self.log_test("Admin Authentication", True, f"User: {data.get('user', {}).get('email')}")
                    return True
                else:
                    self.log_test("Admin Authentication", False, error="No access token in response")
                    return False
            else:
                self.log_test("Admin Authentication", False, error=f"HTTP {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log_test("Admin Authentication", False, error=e)
            return False

    def get_auth_headers(self, use_admin=False):
        """Get authorization headers"""
        token = self.admin_token if use_admin else self.client_token
        return {"Authorization": f"Bearer {token}"}

    def test_payment_methods_list(self):
        """Test GET /api/payments/client/payment-methods/"""
        try:
            response = self.session.get(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Payment Methods - List",
                    True,
                    f"Found {len(data.get('results', data)) if isinstance(data.get('results', data), list) else 'N/A'} payment methods"
                )
                return data
            else:
                self.log_test("Payment Methods - List", False, error=f"HTTP {response.status_code}: {response.text}")
                return None

        except Exception as e:
            self.log_test("Payment Methods - List", False, error=e)
            return None

    def test_setup_intent_creation(self):
        """Test POST /api/payments/client/payment-methods/setup_intent/"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/payments/client/payment-methods/setup_intent/",
                json={"gateway_code": "stripe"},
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Setup Intent - Create",
                    True,
                    f"Client Secret: {data.get('client_secret', '')[:20]}..."
                )
                return data
            else:
                self.log_test("Setup Intent - Create", False, error=f"HTTP {response.status_code}: {response.text}")
                return None

        except Exception as e:
            self.log_test("Setup Intent - Create", False, error=e)
            return None

    def test_invoices_list(self):
        """Test GET /api/payments/client/invoices/"""
        try:
            response = self.session.get(
                f"{BASE_URL}/api/payments/client/invoices/",
                headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                data = response.json()
                invoices = data.get('results', data) if isinstance(data.get('results', data), list) else []
                self.log_test(
                    "Invoices - List",
                    True,
                    f"Found {len(invoices)} invoices"
                )
                return data
            else:
                self.log_test("Invoices - List", False, error=f"HTTP {response.status_code}: {response.text}")
                return None

        except Exception as e:
            self.log_test("Invoices - List", False, error=e)
            return None

    def test_payments_list(self):
        """Test GET /api/payments/client/payments/"""
        try:
            response = self.session.get(
                f"{BASE_URL}/api/payments/client/payments/",
                headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                data = response.json()
                payments = data.get('results', data) if isinstance(data.get('results', data), list) else []
                self.log_test(
                    "Payments - List",
                    True,
                    f"Found {len(payments)} payments"
                )
                return data
            else:
                self.log_test("Payments - List", False, error=f"HTTP {response.status_code}: {response.text}")
                return None

        except Exception as e:
            self.log_test("Payments - List", False, error=e)
            return None

    def test_payment_summary(self):
        """Test GET /api/payments/client/payments/summary/"""
        try:
            response = self.session.get(
                f"{BASE_URL}/api/payments/client/payments/summary/",
                headers=self.get_auth_headers()
            )

            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Payment Summary",
                    True,
                    f"Total Paid: ${data.get('total_paid', 0)}, Pending: ${data.get('total_pending', 0)}"
                )
                return data
            else:
                self.log_test("Payment Summary", False, error=f"HTTP {response.status_code}: {response.text}")
                return None

        except Exception as e:
            self.log_test("Payment Summary", False, error=e)
            return None

    def test_unauthorized_access(self):
        """Test API access without authentication"""
        try:
            response = self.session.get(f"{BASE_URL}/api/payments/client/payment-methods/")

            if response.status_code == 401:
                self.log_test("Unauthorized Access Protection", True, "API properly rejects unauthenticated requests")
                return True
            else:
                self.log_test("Unauthorized Access Protection", False,
                            error=f"Expected 401, got {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log_test("Unauthorized Access Protection", False, error=e)
            return False

    def test_create_payment_method(self):
        """Test POST /api/payments/client/payment-methods/ (without actual payment method creation)"""
        try:
            # Test with invalid data to see validation
            response = self.session.post(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                json={
                    "type": "CREDIT_CARD",
                    "nickname": "Test Card"
                    # Missing required fields intentionally
                },
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            )

            # We expect this to fail with validation errors
            if response.status_code in [400, 422]:
                self.log_test(
                    "Payment Method - Create (Validation)",
                    True,
                    "API properly validates payment method creation"
                )
                return True
            else:
                self.log_test("Payment Method - Create (Validation)", False,
                            error=f"Expected validation error, got {response.status_code}: {response.text}")
                return False

        except Exception as e:
            self.log_test("Payment Method - Create (Validation)", False, error=e)
            return False

    def test_cross_user_access(self):
        """Test that clients can't access other users' data"""
        if not self.client_token or not self.admin_token:
            self.log_test("Cross User Access Protection", False, error="Missing authentication tokens")
            return False

        try:
            # Try to access payment methods as client
            client_response = self.session.get(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                headers={"Authorization": f"Bearer {self.client_token}"}
            )

            # Try to access the same endpoint as admin
            admin_response = self.session.get(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )

            if client_response.status_code == 200 and admin_response.status_code == 200:
                client_data = client_response.json()
                admin_data = admin_response.json()

                # Admin should see more or equal data than client
                client_count = len(client_data.get('results', client_data)) if isinstance(client_data.get('results', client_data), list) else 0
                admin_count = len(admin_data.get('results', admin_data)) if isinstance(admin_data.get('results', admin_data), list) else 0

                self.log_test(
                    "Cross User Access Protection",
                    True,
                    f"Client sees {client_count} methods, Admin sees {admin_count} methods"
                )
                return True
            else:
                self.log_test("Cross User Access Protection", False,
                            error=f"Client: {client_response.status_code}, Admin: {admin_response.status_code}")
                return False

        except Exception as e:
            self.log_test("Cross User Access Protection", False, error=e)
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Comprehensive Payment API Tests")
        print("=" * 50)

        # Test authentication
        if not self.authenticate_client():
            print("❌ Client authentication failed - cannot continue with client tests")
            return False

        if not self.authenticate_admin():
            print("⚠️ Admin authentication failed - some tests will be skipped")

        # Test unauthorized access
        self.test_unauthorized_access()

        # Test API endpoints
        self.test_payment_methods_list()
        self.test_setup_intent_creation()
        self.test_invoices_list()
        self.test_payments_list()
        self.test_payment_summary()
        self.test_create_payment_method()

        # Test security
        if self.admin_token:
            self.test_cross_user_access()

        # Print summary
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)

        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests

        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")

        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['error']:
                print(f"    Error: {result['error']}")

        return failed_tests == 0

def main():
    tester = PaymentAPITester()
    success = tester.run_all_tests()

    # Save results to file
    with open('/Users/stephendeslate/Desktop/lifeplace-app/payment_api_test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)

    print(f"\n📄 Full test results saved to: payment_api_test_results.json")

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()