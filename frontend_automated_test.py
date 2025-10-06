#!/usr/bin/env python3
"""
Automated Frontend Payment System Testing
Tests the payment method management and invoice payment functionality
"""

import os
import sys
import time
import json
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class FrontendPaymentTester:
    def __init__(self):
        self.setup_driver()
        self.test_results = []
        self.base_url = "http://localhost:5174"

    def setup_driver(self):
        """Setup Chrome WebDriver"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--window-size=1920,1080")
            # chrome_options.add_argument("--headless")  # Uncomment for headless mode

            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, 10)

        except Exception as e:
            print(f"❌ Failed to setup WebDriver: {e}")
            sys.exit(1)

    def log_test(self, test_name, success, details=None, error=None, screenshot=False):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details,
            "error": str(error) if error else None
        }

        if screenshot and self.driver:
            try:
                screenshot_path = f"/Users/stephendeslate/Desktop/lifeplace-app/test_screenshots/{test_name.replace(' ', '_')}.png"
                os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
                self.driver.save_screenshot(screenshot_path)
                result["screenshot"] = screenshot_path
            except Exception as e:
                print(f"Warning: Could not save screenshot: {e}")

        self.test_results.append(result)

        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if error:
            print(f"    Error: {error}")
        if details:
            print(f"    Details: {details}")
        print()

    def login(self):
        """Login to the client portal"""
        try:
            self.driver.get(f"{self.base_url}/login")

            # Wait for login form
            email_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")

            # Enter credentials
            email_field.send_keys("john.doe@gmail.com")
            password_field.send_keys("test123")

            # Submit form
            login_button = self.driver.find_element(By.TYPE, "submit")
            login_button.click()

            # Wait for redirect to dashboard
            self.wait.until(EC.url_contains("/dashboard"))

            self.log_test("User Login", True, "Successfully logged into client portal")
            return True

        except Exception as e:
            self.log_test("User Login", False, error=e, screenshot=True)
            return False

    def navigate_to_financial_portal(self):
        """Navigate to the financial portal"""
        try:
            # Click on financial/payments menu
            financial_link = self.wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Financial")))
            financial_link.click()

            # Wait for financial portal to load
            self.wait.until(EC.presence_of_element_located((By.TEXT, "Payments & Invoices")))

            self.log_test("Navigate to Financial Portal", True, "Successfully navigated to financial portal")
            return True

        except Exception as e:
            self.log_test("Navigate to Financial Portal", False, error=e, screenshot=True)
            return False

    def test_payment_methods_tab(self):
        """Test the payment methods tab functionality"""
        try:
            # Click on Payment Methods tab
            payment_methods_tab = self.wait.until(EC.element_to_be_clickable((By.TEXT, "Payment Methods")))
            payment_methods_tab.click()

            # Check for empty state
            empty_message = self.wait.until(EC.presence_of_element_located((By.TEXT, "No Payment Methods")))

            # Verify Add New button is present
            add_button = self.driver.find_element(By.TEXT, "Add New")

            self.log_test("Payment Methods Tab - Empty State", True, "Payment methods tab shows empty state correctly")
            return True

        except Exception as e:
            self.log_test("Payment Methods Tab - Empty State", False, error=e, screenshot=True)
            return False

    def test_invoices_tab(self):
        """Test the invoices tab and identify unpaid invoices"""
        try:
            # Click on Invoices tab
            invoices_tab = self.wait.until(EC.element_to_be_clickable((By.TEXT, "Invoices")))
            invoices_tab.click()

            # Wait for invoices to load
            time.sleep(2)

            # Look for Pay Now buttons
            pay_buttons = self.driver.find_elements(By.TEXT, "Pay Now")

            if pay_buttons:
                self.log_test("Invoices Tab", True, f"Found {len(pay_buttons)} unpaid invoices")
                return True
            else:
                self.log_test("Invoices Tab", False, error="No unpaid invoices found for payment testing")
                return False

        except Exception as e:
            self.log_test("Invoices Tab", False, error=e, screenshot=True)
            return False

    def test_invoice_payment_dialog(self):
        """Test opening the invoice payment dialog"""
        try:
            # Click the first Pay Now button
            pay_button = self.wait.until(EC.element_to_be_clickable((By.TEXT, "Pay Now")))
            pay_button.click()

            # Wait for payment dialog to open
            payment_dialog = self.wait.until(EC.presence_of_element_located((By.ROLE, "dialog")))

            # Check for dialog title
            dialog_title = self.driver.find_element(By.TEXT, "Pay Invoice")

            # Look for save card checkbox
            save_card_checkbox = self.driver.find_element(By.TEXT, "Save this card for future payments")

            self.log_test("Invoice Payment Dialog", True, "Payment dialog opens with save card option", screenshot=True)
            return True

        except Exception as e:
            self.log_test("Invoice Payment Dialog", False, error=e, screenshot=True)
            return False

    def test_stripe_elements_loading(self):
        """Test that Stripe Elements load properly"""
        try:
            # Wait for Stripe card element to load
            stripe_frame = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "iframe[name^='__privateStripeFrame']")))

            self.log_test("Stripe Elements Loading", True, "Stripe card element loaded successfully")
            return True

        except Exception as e:
            self.log_test("Stripe Elements Loading", False, error=e, screenshot=True)
            return False

    def test_payment_form_interaction(self):
        """Test interacting with the payment form"""
        try:
            # Check Save Card checkbox
            save_card_label = self.driver.find_element(By.TEXT, "Save this card for future payments")
            checkbox = save_card_label.find_element(By.XPATH, ".//input[@type='checkbox']")

            if not checkbox.is_selected():
                checkbox.click()

            self.log_test("Save Card Checkbox", True, "Successfully checked save card option")

            # Note: We won't actually submit a real payment to avoid charges
            # but we can verify the form structure is correct

            return True

        except Exception as e:
            self.log_test("Save Card Checkbox", False, error=e, screenshot=True)
            return False

    def test_console_errors(self):
        """Check for JavaScript console errors"""
        try:
            logs = self.driver.get_log('browser')
            errors = [log for log in logs if log['level'] == 'SEVERE']

            if errors:
                error_messages = [log['message'] for log in errors]
                self.log_test("Console Errors", False, error=f"Found {len(errors)} console errors: {error_messages}")
                return False
            else:
                self.log_test("Console Errors", True, "No severe console errors found")
                return True

        except Exception as e:
            self.log_test("Console Errors", False, error=e)
            return False

    def test_responsive_design(self):
        """Test responsive design on different viewport sizes"""
        try:
            viewports = [
                ("Desktop", 1920, 1080),
                ("Tablet", 768, 1024),
                ("Mobile", 375, 667)
            ]

            all_success = True
            for name, width, height in viewports:
                try:
                    self.driver.set_window_size(width, height)
                    time.sleep(1)

                    # Check if main elements are still visible
                    tabs = self.driver.find_element(By.CSS_SELECTOR, "[role='tablist']")

                    self.log_test(f"Responsive Design - {name}", True, f"Layout works on {width}x{height}")

                except Exception as e:
                    self.log_test(f"Responsive Design - {name}", False, error=e)
                    all_success = False

            # Reset to desktop size
            self.driver.set_window_size(1920, 1080)
            return all_success

        except Exception as e:
            self.log_test("Responsive Design", False, error=e)
            return False

    def cleanup(self):
        """Clean up resources"""
        if self.driver:
            self.driver.quit()

    def run_all_tests(self):
        """Run all frontend tests"""
        print("🎭 Starting Frontend Payment System Tests")
        print("=" * 50)

        try:
            # Login
            if not self.login():
                return False

            # Navigate to financial portal
            if not self.navigate_to_financial_portal():
                return False

            # Test payment methods tab
            self.test_payment_methods_tab()

            # Test invoices tab
            if self.test_invoices_tab():
                # Test payment dialog
                self.test_invoice_payment_dialog()
                self.test_stripe_elements_loading()
                self.test_payment_form_interaction()

            # Test for console errors
            self.test_console_errors()

            # Test responsive design
            self.test_responsive_design()

            # Print summary
            print("=" * 50)
            print("📊 FRONTEND TEST SUMMARY")
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
                if result.get('screenshot'):
                    print(f"    Screenshot: {result['screenshot']}")

            return failed_tests == 0

        except Exception as e:
            print(f"❌ Fatal error during testing: {e}")
            return False

        finally:
            self.cleanup()

def main():
    # Check if servers are running
    import requests
    try:
        requests.get("http://localhost:5174", timeout=5)
        requests.get("http://localhost:8001", timeout=5)
    except requests.exceptions.RequestException:
        print("❌ Make sure both frontend (5174) and backend (8001) servers are running")
        sys.exit(1)

    tester = FrontendPaymentTester()
    success = tester.run_all_tests()

    # Save results to file
    with open('/Users/stephendeslate/Desktop/lifeplace-app/frontend_test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)

    print(f"\n📄 Full test results saved to: frontend_test_results.json")

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()