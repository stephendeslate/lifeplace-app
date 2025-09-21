#!/usr/bin/env python3
"""
Test payment triggers and workflow automation execution
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
from core.domains.communications.models import CommunicationTemplate
from django.utils import timezone

def test_payment_automation():
    """Test payment triggers and automation execution"""

    print("=== PAYMENT AUTOMATION TESTING ===\n")

    # Setup test data
    print("1. Setting up test environment")
    try:
        events_template = WorkflowTemplate.objects.get(name="Events", is_active=True)
        client = User.objects.get(email="john.doe@gmail.com")
        event_type = EventType.objects.first()

        # Create test event
        test_event = Event.objects.create(
            client=client,
            event_type=event_type,
            status='LEAD',
            start_date=timezone.now() + timezone.timedelta(days=30),
            workflow_template=events_template,
            current_stage=events_template.stages.filter(order=1).first()
        )

        print(f"✅ Created test event (ID: {test_event.id})")
        print(f"   Initial stage: {test_event.current_stage.name}")

    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return False
    print()

    # Test automation triggers
    print("2. Testing automation trigger types")
    automation_stages = events_template.stages.all().order_by('order')

    for stage in automation_stages:
        print(f"   Stage: {stage.name}")
        print(f"     Order: {stage.order}")
        print(f"     Type: {stage.automation_type}")
        if stage.email_template:
            print(f"     Email template: {stage.email_template.name}")
        if stage.task_description:
            print(f"     Task: {stage.task_description}")
        print()

    # Test payment received trigger
    print("3. Testing PAYMENT_RECEIVED trigger")
    try:
        payment_stages = automation_stages.filter(automation_type='PAYMENT_PLAN')
        if payment_stages.exists():
            payment_stage = payment_stages.first()
            print(f"✅ Found payment automation stage: {payment_stage.name}")

            # Create a payment to trigger automation
            payment = Payment.objects.create(
                event=test_event,
                amount=Decimal('5000.00'),  # Deposit payment
                status='COMPLETED',
                due_date=timezone.now().date(),
                description="Deposit payment - automation test"
            )

            print(f"✅ Created payment: ${payment.amount}")

            # Check if event progressed to payment stage
            test_event.refresh_from_db()
            if test_event.current_stage and test_event.current_stage.automation_type == 'PAYMENT_PLAN':
                print(f"✅ Event progressed to payment stage: {test_event.current_stage.name}")
            else:
                print(f"⚠️  Event stage: {test_event.current_stage.name if test_event.current_stage else 'None'}")

        else:
            print("❌ No payment automation stages found")

    except Exception as e:
        print(f"❌ Payment trigger test failed: {e}")
    print()

    # Test email automation triggers
    print("4. Testing EMAIL automation triggers")
    try:
        email_stages = automation_stages.filter(automation_type='EMAIL')
        print(f"Found {email_stages.count()} email automation stages:")

        for stage in email_stages:
            template_name = stage.email_template.name if stage.email_template else 'None'
            print(f"   - {stage.name} → {template_name}")

        # Check communication templates
        comm_templates = CommunicationTemplate.objects.filter(
            id__in=[19, 20, 21]  # Created by previous subagent
        )
        print(f"\nLinked communication templates: {comm_templates.count()}")
        for template in comm_templates:
            print(f"   - {template.name} (ID: {template.id})")

    except Exception as e:
        print(f"❌ Email automation test failed: {e}")
    print()

    # Test task automation
    print("5. Testing TASK automation")
    try:
        task_stages = automation_stages.filter(automation_type='TASK')
        print(f"Found {task_stages.count()} task automation stages:")

        for stage in task_stages:
            print(f"   - {stage.name}")
            if stage.task_description:
                print(f"     Task: {stage.task_description}")

    except Exception as e:
        print(f"❌ Task automation test failed: {e}")
    print()

    # Test contract automation
    print("6. Testing CONTRACT automation")
    try:
        contract_stages = automation_stages.filter(automation_type='CONTRACT')
        print(f"Found {contract_stages.count()} contract automation stages:")

        for stage in contract_stages:
            print(f"   - {stage.name}")

    except Exception as e:
        print(f"❌ Contract automation test failed: {e}")
    print()

    # Test quote automation
    print("7. Testing QUOTE automation")
    try:
        quote_stages = automation_stages.filter(automation_type='QUOTE')
        print(f"Found {quote_stages.count()} quote automation stages:")

        for stage in quote_stages:
            print(f"   - {stage.name}")

    except Exception as e:
        print(f"❌ Quote automation test failed: {e}")
    print()

    # Test workflow progression conditions
    print("8. Testing workflow progression conditions")
    try:
        # Check if stages have progression conditions
        stages_with_conditions = automation_stages.exclude(
            progression_condition__isnull=True
        ).exclude(progression_condition='')

        print(f"Stages with progression conditions: {stages_with_conditions.count()}")
        for stage in stages_with_conditions:
            print(f"   - {stage.name}: {stage.progression_condition}")

    except Exception as e:
        print(f"❌ Progression condition test failed: {e}")
    print()

    # Cleanup
    print("9. Cleanup test data")
    try:
        test_event.delete()
        print("✅ Cleaned up test event and related data")
    except Exception as e:
        print(f"⚠️  Cleanup warning: {e}")

    print("\n=== PAYMENT AUTOMATION TESTING COMPLETE ===")
    return True

if __name__ == "__main__":
    test_payment_automation()