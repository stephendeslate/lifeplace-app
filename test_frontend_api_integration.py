#!/usr/bin/env python3
"""
Frontend API Integration Testing
Tests the actual API calls that the frontend would make
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001"
FRONTEND_URL = "http://localhost:5174"
CLIENT_CREDENTIALS = {
    "email": "john.doe@gmail.com",
    "password": "test123"
}

class FrontendAPIIntegrationTester:
    def __init__(self):
        self.session = requests.Session()
        self.client_token = None
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

    def authenticate(self):
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

    def get_auth_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.client_token}"}

    def test_financial_overview_api(self):
        """Test the financial overview API that powers the FinancialPortal"""
        try:
            # Test payments endpoint
            payments_response = self.session.get(
                f"{BASE_URL}/api/payments/client/payments/",
                headers=self.get_auth_headers()
            )

            # Test invoices endpoint
            invoices_response = self.session.get(
                f"{BASE_URL}/api/payments/client/invoices/",
                headers=self.get_auth_headers()
            )

            # Test payment methods endpoint
            methods_response = self.session.get(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                headers=self.get_auth_headers()
            )

            # Test payment summary endpoint
            summary_response = self.session.get(
                f"{BASE_URL}/api/payments/client/payments/summary/",
                headers=self.get_auth_headers()
            )

            all_success = True
            endpoint_results = []

            for name, response in [
                ("Payments", payments_response),
                ("Invoices", invoices_response),
                ("Payment Methods", methods_response),
                ("Payment Summary", summary_response)
            ]:
                if response.status_code == 200:
                    data = response.json()
                    count = len(data.get('results', data)) if isinstance(data.get('results', data), list) else 'N/A'
                    endpoint_results.append(f"{name}: {count} items")
                else:
                    endpoint_results.append(f"{name}: ERROR {response.status_code}")
                    all_success = False

            self.log_test(
                "Financial Overview APIs",
                all_success,
                details="; ".join(endpoint_results)
            )
            return all_success

        except Exception as e:
            self.log_test("Financial Overview APIs", False, error=e)
            return False

    def test_stripe_setup_intent_flow(self):
        """Test the Stripe setup intent creation for saving payment methods"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/payments/client/payment-methods/setup_intent/",
                json={"gateway_code": "stripe"},
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                required_fields = ['setup_intent_id', 'client_secret', 'status', 'gateway']

                missing_fields = [field for field in required_fields if field not in data]

                if missing_fields:
                    self.log_test(
                        "Stripe Setup Intent Creation",
                        False,
                        error=f"Missing fields: {missing_fields}"
                    )
                    return False
                else:
                    self.log_test(
                        "Stripe Setup Intent Creation",
                        True,
                        details=f"Status: {data['status']}, Gateway: {data['gateway']}"
                    )
                    return True
            else:
                self.log_test(
                    "Stripe Setup Intent Creation",
                    False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
                return False

        except Exception as e:
            self.log_test("Stripe Setup Intent Creation", False, error=e)
            return False

    def test_invoice_payment_intent_flow(self):
        """Test creating payment intent for invoice payment"""
        try:
            # First get an invoice
            invoices_response = self.session.get(
                f"{BASE_URL}/api/payments/client/invoices/",
                headers=self.get_auth_headers()
            )

            if invoices_response.status_code != 200:
                self.log_test("Invoice Payment Intent", False, error="Could not fetch invoices")
                return False

            invoices_data = invoices_response.json()
            invoices = invoices_data.get('results', invoices_data)

            if not invoices:
                self.log_test("Invoice Payment Intent", False, error="No invoices available for testing")
                return False

            # Get the first unpaid invoice
            unpaid_invoice = None
            for invoice in invoices:
                if invoice.get('status') == 'ISSUED':
                    unpaid_invoice = invoice
                    break

            if not unpaid_invoice:
                self.log_test("Invoice Payment Intent", False, error="No unpaid invoices for testing")
                return False

            # Create payment intent for the invoice
            intent_response = self.session.post(
                f"{BASE_URL}/api/payments/client/invoices/{unpaid_invoice['id']}/create_payment_intent/",
                json={"gateway_code": "stripe"},
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            )

            if intent_response.status_code == 200:
                data = intent_response.json()
                required_fields = ['client_secret', 'payment_intent_id', 'status']

                missing_fields = [field for field in required_fields if field not in data]

                if missing_fields:
                    self.log_test(
                        "Invoice Payment Intent",
                        False,
                        error=f"Missing fields: {missing_fields}"
                    )
                    return False
                else:
                    self.log_test(
                        "Invoice Payment Intent",
                        True,
                        details=f"Invoice: {unpaid_invoice['invoice_id']}, Amount: {unpaid_invoice['total_amount']}"
                    )
                    return True
            else:
                self.log_test(
                    "Invoice Payment Intent",
                    False,
                    error=f"HTTP {intent_response.status_code}: {intent_response.text}"
                )
                return False

        except Exception as e:
            self.log_test("Invoice Payment Intent", False, error=e)
            return False

    def test_payment_method_crud_validation(self):
        """Test payment method CRUD operation validation"""
        try:
            # Test creating payment method with invalid data
            invalid_data = {
                "type": "CREDIT_CARD",
                "nickname": "Test Card"
                # Missing required fields like gateway_payment_method_id
            }

            response = self.session.post(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                json=invalid_data,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            )

            if response.status_code in [400, 422]:
                self.log_test(
                    "Payment Method CRUD Validation",
                    True,
                    "API properly validates payment method creation"
                )
                return True
            else:
                self.log_test(
                    "Payment Method CRUD Validation",
                    False,
                    error=f"Expected validation error, got {response.status_code}"
                )
                return False

        except Exception as e:
            self.log_test("Payment Method CRUD Validation", False, error=e)
            return False

    def test_cors_headers(self):
        """Test CORS headers for frontend requests"""
        try:
            response = self.session.options(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                headers={
                    "Origin": FRONTEND_URL,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "Authorization"
                }
            )

            # Check for CORS headers
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }

            missing_headers = [k for k, v in cors_headers.items() if not v]

            if missing_headers:
                self.log_test(
                    "CORS Headers",
                    False,
                    error=f"Missing CORS headers: {missing_headers}"
                )
                return False
            else:
                self.log_test(
                    "CORS Headers",
                    True,
                    details=f"Origin: {cors_headers['Access-Control-Allow-Origin']}"
                )
                return True

        except Exception as e:
            self.log_test("CORS Headers", False, error=e)
            return False

    def test_frontend_server_availability(self):
        """Test that frontend server is accessible"""
        try:
            response = requests.get(FRONTEND_URL, timeout=5)

            if response.status_code == 200:
                self.log_test(
                    "Frontend Server Availability",
                    True,
                    "Frontend server is accessible"
                )
                return True
            else:
                self.log_test(
                    "Frontend Server Availability",
                    False,
                    error=f"HTTP {response.status_code}"
                )
                return False

        except Exception as e:
            self.log_test("Frontend Server Availability", False, error=e)
            return False

    def run_all_tests(self):
        """Run all integration tests"""
        print("🔗 Starting Frontend API Integration Tests")
        print("=" * 50)

        # Test server availability
        self.test_frontend_server_availability()

        # Test authentication
        if not self.authenticate():
            print("❌ Authentication failed - cannot continue with API tests")
            return False

        # Test API endpoints
        self.test_financial_overview_api()
        self.test_stripe_setup_intent_flow()
        self.test_invoice_payment_intent_flow()
        self.test_payment_method_crud_validation()
        self.test_cors_headers()

        # Print summary
        print("=" * 50)
        print("📊 INTEGRATION TEST SUMMARY")
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
    tester = FrontendAPIIntegrationTester()
    success = tester.run_all_tests()

    # Save results to file
    with open('/Users/stephendeslate/Desktop/lifeplace-app/frontend_api_integration_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)

    print(f"\n📄 Full test results saved to: frontend_api_integration_results.json")

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()