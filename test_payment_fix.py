#!/usr/bin/env python3
"""
Test script to verify the payment fix works
"""
import os
import sys
import django

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, os.path.abspath(backend_path))

# Change to backend directory for Django setup
os.chdir(backend_path)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.domains.payments.models import Invoice, PaymentMethod, PaymentGateway
from core.domains.payments.services.invoice_service import InvoiceService

def test_payment_fix():
    """Test the atomic transaction fix for invoice payments"""
    User = get_user_model()

    # Find test user
    user = User.objects.filter(email='john.doe@gmail.com').first()
    if not user:
        print("❌ User john.doe@gmail.com not found")
        # Show available users
        users = User.objects.all()[:5]
        print("Available users:")
        for u in users:
            print(f"  - {u.email}")
        return False

    print(f"✅ Found user: {user.email}")

    # Find an issued invoice
    invoice = Invoice.objects.filter(client=user, status='ISSUED').first()
    if not invoice:
        print("❌ No issued invoices found for user")
        # Show invoices
        invoices = Invoice.objects.filter(client=user)[:3]
        print("Available invoices:")
        for inv in invoices:
            print(f"  - Invoice {inv.invoice_id}: ${inv.total_amount} ({inv.status})")
        return False

    print(f"✅ Found invoice: {invoice.invoice_id} - ${invoice.total_amount}")

    # Find a payment method for the user
    payment_method = PaymentMethod.objects.filter(user=user).first()
    if not payment_method:
        print("❌ No payment methods found for user")
        return False

    print(f"✅ Found payment method: {payment_method.type} (ID: {payment_method.id})")

    # Test payment data
    payment_data = {
        'payment_method': payment_method.id,
        'gateway_code': 'stripe',
        'save_payment_method': False
    }

    print(f"\n🧪 Testing payment for invoice {invoice.invoice_id}...")

    try:
        # This is where the atomic transaction error was occurring
        result = InvoiceService.process_invoice_payment(invoice, payment_data, user)

        if result.get('success'):
            print("✅ Payment processed successfully!")
            print(f"   Message: {result.get('message')}")
            if result.get('payment'):
                payment = result.get('payment')
                print(f"   Payment ID: {payment.id}")
                print(f"   Payment Status: {payment.status}")
        else:
            print(f"❌ Payment failed: {result.get('error', 'Unknown error')}")
            print(f"   Details: {result.get('details', 'No details')}")
            return False

    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        if "atomic" in str(e).lower():
            print("   This looks like the atomic transaction error!")
        return False

    print("\n✅ All tests passed! The atomic transaction fix is working.")
    return True

if __name__ == "__main__":
    success = test_payment_fix()
    sys.exit(0 if success else 1)