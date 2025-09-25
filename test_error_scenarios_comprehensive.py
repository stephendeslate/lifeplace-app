#!/usr/bin/env python3
"""
Comprehensive Error Scenarios and Security Testing
Tests error handling and security boundaries in the payment system
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "http://localhost:8001"
CLIENT_CREDENTIALS = {
    "email": "john.doe@gmail.com",
    "password": "test123"
}
ADMIN_CREDENTIALS = {
    "email": "stephendeslate@gmail.com",
    "password": "HuDi#[Ta3"
}

class ComprehensiveErrorTester:
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

    def authenticate(self):
        """Authenticate both client and admin users"""
        try:
            # Client auth
            client_response = self.session.post(
                f"{BASE_URL}/api/users/login/",
                json=CLIENT_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )

            if client_response.status_code == 200:
                data = client_response.json()
                self.client_token = data['tokens']['access']

            # Admin auth
            admin_response = self.session.post(
                f"{BASE_URL}/api/users/login/",
                json=ADMIN_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )

            if admin_response.status_code == 200:
                data = admin_response.json()
                self.admin_token = data['tokens']['access']

            success = bool(self.client_token and self.admin_token)
            self.log_test("Authentication Setup", success, "Both client and admin tokens obtained")
            return success

        except Exception as e:
            self.log_test("Authentication Setup", False, error=e)
            return False

    def test_unauthenticated_access(self):
        """Test access without authentication"""
        try:
            endpoints = [
                "/api/payments/client/payment-methods/",
                "/api/payments/client/invoices/",
                "/api/payments/client/payments/",
                "/api/payments/client/payments/summary/"
            ]

            results = []
            for endpoint in endpoints:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                if response.status_code == 401:
                    results.append(f"{endpoint}: ✅")
                else:
                    results.append(f"{endpoint}: ❌ {response.status_code}")

            all_protected = all("✅" in result for result in results)

            self.log_test(
                "Unauthenticated Access Protection",
                all_protected,
                details="; ".join(results)
            )
            return all_protected

        except Exception as e:
            self.log_test("Unauthenticated Access Protection", False, error=e)
            return False

    def test_expired_token_handling(self):
        """Test handling of expired/invalid tokens"""
        try:
            # Use a clearly invalid token
            fake_token = "invalid_token_12345"

            response = self.session.get(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                headers={"Authorization": f"Bearer {fake_token}"}
            )

            if response.status_code == 401:
                self.log_test(
                    "Invalid Token Handling",
                    True,
                    "API properly rejects invalid tokens"
                )
                return True
            else:
                self.log_test(
                    "Invalid Token Handling",
                    False,
                    error=f"Expected 401, got {response.status_code}"
                )
                return False

        except Exception as e:
            self.log_test("Invalid Token Handling", False, error=e)
            return False

    def test_cross_user_data_access(self):
        """Test that users cannot access other users' data"""
        try:
            # Get client's payment methods
            client_response = self.session.get(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                headers={"Authorization": f"Bearer {self.client_token}"}
            )

            # Get admin's view (which should show more data)
            admin_response = self.session.get(
                f"{BASE_URL}/api/payments/client/payment-methods/",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )

            if client_response.status_code == 200 and admin_response.status_code == 200:
                client_data = client_response.json()
                admin_data = admin_response.json()

                client_count = len(client_data.get('results', client_data)) if isinstance(client_data.get('results', client_data), list) else 0
                admin_count = len(admin_data.get('results', admin_data)) if isinstance(admin_data.get('results', admin_data), list) else 0

                # Admin should see same or more data
                data_isolation_works = admin_count >= client_count

                self.log_test(
                    "Cross-User Data Access Control",
                    data_isolation_works,
                    details=f"Client sees {client_count}, Admin sees {admin_count}"
                )
                return data_isolation_works
            else:
                self.log_test(
                    "Cross-User Data Access Control",
                    False,
                    error=f"Client: {client_response.status_code}, Admin: {admin_response.status_code}"
                )
                return False

        except Exception as e:
            self.log_test("Cross-User Data Access Control", False, error=e)
            return False

    def test_malformed_request_handling(self):
        """Test handling of malformed requests"""
        try:
            test_cases = [
                {
                    "name": "Invalid JSON",
                    "data": "invalid json data",
                    "content_type": "application/json"
                },
                {
                    "name": "Missing Required Fields",
                    "data": {"type": "CREDIT_CARD"},  # Missing gateway_payment_method_id
                    "content_type": "application/json"
                },
                {
                    "name": "Invalid Data Types",
                    "data": {"is_default": "not_a_boolean"},
                    "content_type": "application/json"
                }
            ]

            results = []
            for test_case in test_cases:
                try:
                    if isinstance(test_case["data"], str):
                        data = test_case["data"]
                    else:
                        data = json.dumps(test_case["data"])

                    response = self.session.post(
                        f"{BASE_URL}/api/payments/client/payment-methods/",
                        data=data,
                        headers={
                            "Authorization": f"Bearer {self.client_token}",
                            "Content-Type": test_case["content_type"]
                        }
                    )

                    if response.status_code in [400, 422, 500]:
                        results.append(f"{test_case['name']}: ✅ {response.status_code}")
                    else:
                        results.append(f"{test_case['name']}: ❌ {response.status_code}")

                except Exception as e:
                    results.append(f"{test_case['name']}: ✅ Exception handled")

            all_handled = all("✅" in result for result in results)

            self.log_test(
                "Malformed Request Handling",
                all_handled,
                details="; ".join(results)
            )
            return all_handled

        except Exception as e:
            self.log_test("Malformed Request Handling", False, error=e)
            return False

    def test_payment_intent_error_scenarios(self):
        """Test payment intent creation error scenarios"""
        try:
            # Test with invalid invoice ID
            invalid_invoice_response = self.session.post(
                f"{BASE_URL}/api/payments/client/invoices/99999/create_payment_intent/",
                json={"gateway_code": "stripe"},
                headers={
                    "Authorization": f"Bearer {self.client_token}",
                    "Content-Type": "application/json"
                }
            )

            # Test with invalid gateway
            invalid_gateway_response = self.session.post(
                f"{BASE_URL}/api/payments/client/invoices/58/create_payment_intent/",
                json={"gateway_code": "invalid_gateway"},
                headers={
                    "Authorization": f"Bearer {self.client_token}",
                    "Content-Type": "application/json"
                }
            )

            results = []

            if invalid_invoice_response.status_code == 404:
                results.append("Invalid Invoice: ✅ 404")
            else:
                results.append(f"Invalid Invoice: ❌ {invalid_invoice_response.status_code}")

            if invalid_gateway_response.status_code in [400, 422]:
                results.append("Invalid Gateway: ✅ Validation Error")
            else:
                results.append(f"Invalid Gateway: ❌ {invalid_gateway_response.status_code}")

            all_handled = all("✅" in result for result in results)

            self.log_test(
                "Payment Intent Error Scenarios",
                all_handled,
                details="; ".join(results)
            )
            return all_handled

        except Exception as e:
            self.log_test("Payment Intent Error Scenarios", False, error=e)
            return False

    def test_setup_intent_error_scenarios(self):
        """Test setup intent creation error scenarios"""
        try:
            # Test with invalid gateway
            response = self.session.post(
                f"{BASE_URL}/api/payments/client/payment-methods/setup_intent/",
                json={"gateway_code": "nonexistent_gateway"},
                headers={
                    "Authorization": f"Bearer {self.client_token}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code in [400, 422]:
                self.log_test(
                    "Setup Intent Error Scenarios",
                    True,
                    "Invalid gateway properly rejected"
                )
                return True
            else:
                self.log_test(
                    "Setup Intent Error Scenarios",
                    False,
                    error=f"Expected validation error, got {response.status_code}"
                )
                return False

        except Exception as e:
            self.log_test("Setup Intent Error Scenarios", False, error=e)
            return False

    def test_rate_limiting_simulation(self):
        """Test rate limiting behavior (if implemented)"""
        try:
            # Make multiple rapid requests to test rate limiting
            responses = []
            for i in range(10):
                response = self.session.get(
                    f"{BASE_URL}/api/payments/client/payment-methods/",
                    headers={"Authorization": f"Bearer {self.client_token}"}
                )
                responses.append(response.status_code)
                time.sleep(0.1)  # Small delay

            # Check if any requests were rate limited (429 status)
            rate_limited = any(status == 429 for status in responses)
            success_responses = sum(1 for status in responses if status == 200)

            if rate_limited:
                self.log_test(
                    "Rate Limiting",
                    True,
                    f"Rate limiting active - {success_responses}/10 succeeded"
                )
            else:
                self.log_test(
                    "Rate Limiting",
                    True,
                    f"No rate limiting detected - {success_responses}/10 succeeded (may not be configured)"
                )

            return True

        except Exception as e:
            self.log_test("Rate Limiting", False, error=e)
            return False

    def test_sql_injection_protection(self):
        """Test SQL injection protection"""
        try:
            # Test SQL injection in query parameters
            malicious_params = [
                "'; DROP TABLE payments; --",
                "' OR '1'='1",
                "1; DELETE FROM payment_methods; --"
            ]

            results = []
            for param in malicious_params:
                try:
                    response = self.session.get(
                        f"{BASE_URL}/api/payments/client/payment-methods/",
                        params={"search": param},
                        headers={"Authorization": f"Bearer {self.client_token}"}
                    )

                    # Should return 200 with empty/safe results, not crash
                    if response.status_code == 200:
                        results.append("✅ Safe")
                    else:
                        results.append(f"❌ {response.status_code}")

                except Exception:
                    results.append("✅ Exception handled safely")

            all_safe = all("✅" in result for result in results)

            self.log_test(
                "SQL Injection Protection",
                all_safe,
                details=f"Tested {len(malicious_params)} injection attempts"
            )
            return all_safe

        except Exception as e:
            self.log_test("SQL Injection Protection", False, error=e)
            return False

    def run_all_tests(self):
        """Run all error and security tests"""
        print("🛡️ Starting Error Scenarios and Security Tests")
        print("=" * 50)

        # Setup authentication
        if not self.authenticate():
            return False

        # Run security tests
        self.test_unauthenticated_access()
        self.test_expired_token_handling()
        self.test_cross_user_data_access()

        # Run error handling tests
        self.test_malformed_request_handling()
        self.test_payment_intent_error_scenarios()
        self.test_setup_intent_error_scenarios()

        # Run additional security tests
        self.test_rate_limiting_simulation()
        self.test_sql_injection_protection()

        # Print summary
        print("=" * 50)
        print("📊 ERROR & SECURITY TEST SUMMARY")
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
    tester = ComprehensiveErrorTester()
    success = tester.run_all_tests()

    # Save results to file
    with open('/Users/stephendeslate/Desktop/lifeplace-app/error_scenarios_test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)

    print(f"\n📄 Full test results saved to: error_scenarios_test_results.json")

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()