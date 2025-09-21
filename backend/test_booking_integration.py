#!/usr/bin/env python3
"""
Test booking flow integration with Events WorkflowTemplate
"""
import os
import sys
import django
from decimal import Decimal

# Add the project directory to the Python path
sys.path.append('/Users/stephendeslate/Desktop/lifeplace-app/backend')

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Setup Django
django.setup()

from core.domains.workflows.models import WorkflowTemplate, WorkflowStage
from core.domains.events.models import Event, EventType
from core.domains.payments.models import Payment, PaymentPlan
from core.domains.users.models import User
from core.domains.bookingflow.models import BookingFlow, BookingSession
from django.utils import timezone

def test_booking_flow_integration():
    """Test booking flow integration with Events workflow"""

    print("=== BOOKING FLOW INTEGRATION TESTING ===\n")

    # Test 1: Get Events WorkflowTemplate
    print("1. Testing Events WorkflowTemplate retrieval")
    try:
        events_template = WorkflowTemplate.objects.get(name="Events", is_active=True)
        print(f"✅ Found Events WorkflowTemplate (ID: {events_template.id})")
        print(f"   Description: {events_template.description}")
        print(f"   Stages count: {events_template.stages.count()}")

        # Show active stages only
        active_stages = events_template.stages.filter(
            template=events_template
        ).order_by('order')[:8]  # Show first 8 stages

        print("   Active stages:")
        for stage in active_stages:
            print(f"     {stage.order}. {stage.name} ({stage.automation_type})")
    except WorkflowTemplate.DoesNotExist:
        print("❌ Events WorkflowTemplate not found")
        return False
    print()

    # Test 2: Get or create a booking flow
    print("2. Testing BookingFlow assignment")
    try:
        booking_flow = BookingFlow.objects.first()
        if booking_flow:
            original_workflow = booking_flow.workflow_template
            print(f"✅ Found BookingFlow: {booking_flow.name} (ID: {booking_flow.id})")
            print(f"   Current workflow: {original_workflow.name if original_workflow else 'None'}")

            # Assign Events workflow to booking flow
            booking_flow.workflow_template = events_template
            booking_flow.save()
            print(f"✅ Assigned Events workflow to booking flow")

        else:
            print("❌ No booking flows found")
            return False
    except Exception as e:
        print(f"❌ Error with booking flow: {e}")
        return False
    print()

    # Test 3: Get client for event creation
    print("3. Testing Event creation with workflow assignment")
    try:
        client = User.objects.get(email="john.doe@gmail.com")
        print(f"✅ Found client: {client.first_name} {client.last_name}")

        # Get an event type
        event_type = EventType.objects.first()
        if not event_type:
            print("❌ No event types found")
            return False
        print(f"✅ Using event type: {event_type.name}")

        # Create test event with Events workflow
        test_event = Event.objects.create(
            client=client,
            event_type=event_type,
            status='LEAD',
            start_date=timezone.now() + timezone.timedelta(days=30),
            workflow_template=events_template,
            current_stage=events_template.stages.filter(order=1).first()
        )

        print(f"✅ Created test event (ID: {test_event.id})")
        print(f"   Status: {test_event.status}")
        print(f"   Workflow: {test_event.workflow_template.name}")
        print(f"   Current stage: {test_event.current_stage.name if test_event.current_stage else 'None'}")

    except Exception as e:
        print(f"❌ Error creating test event: {e}")
        return False
    print()

    # Test 4: Test payment trigger automation
    print("4. Testing payment trigger automation")
    try:
        # Create a payment for the test event
        payment = Payment.objects.create(
            event=test_event,
            amount=Decimal('15000.00'),  # Partial payment to trigger payment plan
            status='COMPLETED',
            due_date=timezone.now().date(),
            description="Deposit payment - testing automation"
        )

        print(f"✅ Created test payment (ID: {payment.id})")
        print(f"   Amount: ${payment.amount}")
        print(f"   Status: {payment.status}")

        # Check if payment plan was created automatically
        payment_plans = PaymentPlan.objects.filter(event=test_event)
        if payment_plans.exists():
            plan = payment_plans.first()
            print(f"✅ Payment plan created automatically (ID: {plan.id})")
            print(f"   Total amount: ${plan.total_amount}")
            print(f"   Installments: {plan.payment_installments.count()}")
        else:
            print("⚠️  No payment plan created automatically")

    except Exception as e:
        print(f"❌ Error testing payment automation: {e}")
    print()

    # Test 5: Check workflow stage progression
    print("5. Testing workflow stage progression")
    try:
        # Refresh the event to check for stage changes
        test_event.refresh_from_db()

        payment_stages = events_template.stages.filter(
            automation_type='PAYMENT_PLAN'
        ).order_by('order')

        if payment_stages.exists():
            payment_stage = payment_stages.first()
            print(f"✅ Found payment automation stage: {payment_stage.name}")
            print(f"   Order: {payment_stage.order}")
            print(f"   Type: {payment_stage.automation_type}")

            # Test stage progression
            if test_event.current_stage:
                print(f"   Event current stage: {test_event.current_stage.name}")
            else:
                print("   Event has no current stage")

    except Exception as e:
        print(f"❌ Error checking stage progression: {e}")
    print()

    # Cleanup
    print("6. Cleanup test data")
    try:
        test_event.delete()
        print("✅ Cleaned up test event")
    except Exception as e:
        print(f"⚠️  Cleanup warning: {e}")

    print("\n=== BOOKING FLOW INTEGRATION TESTING COMPLETE ===")
    return True

if __name__ == "__main__":
    test_booking_flow_integration()