#!/usr/bin/env python
"""
Complete fix for Event 170 - payment status and workflow progression.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.domains.events.models import Event
from core.domains.workflows.models import WorkflowTrigger
from core.domains.workflows.engine import WorkflowEngine
from core.domains.payments.models import Payment
from django.utils import timezone

def fix_event_170_complete():
    """Complete fix for Event 170"""
    print("=== COMPLETE FIX FOR EVENT 170 ===")

    try:
        # Get Event 170
        event = Event.objects.get(id=170)
        print(f"Event 170: {event.name}")
        print(f"Before fix - Payment Status: {event.payment_status}")
        print(f"Before fix - Current Stage: {event.current_stage}")
        print(f"Before fix - Total Amount Due: ${event.total_amount_due}")
        print(f"Before fix - Total Amount Paid: ${event.total_amount_paid}")
        print()

        # Step 1: Fix payment status by setting total_amount_due
        completed_payment = Payment.objects.filter(event=event, status='COMPLETED').first()

        if completed_payment and (event.total_amount_due is None or event.total_amount_due == 0):
            print("1. Fixing total_amount_due...")
            event.total_amount_due = completed_payment.amount
            event.save(update_fields=['total_amount_due'])
            print(f"   Set total_amount_due to: ${event.total_amount_due}")

        # Step 2: Update payment status
        print("2. Updating payment status...")
        event.update_payment_status()
        event.refresh_from_db()
        print(f"   Payment status updated to: {event.payment_status}")

        # Step 3: Process unprocessed workflow triggers
        unprocessed_triggers = WorkflowTrigger.objects.filter(
            event=event,
            trigger_type='PAYMENT_RECEIVED',
            processed=False
        ).order_by('created_at')

        print(f"3. Processing {unprocessed_triggers.count()} unprocessed triggers...")

        for trigger in unprocessed_triggers:
            print(f"   Processing trigger {trigger.id}...")

            progressed = WorkflowEngine.progress_workflow(
                event=event,
                trigger_type='PAYMENT_RECEIVED',
                data={
                    'trigger_id': trigger.id,
                    'payment_data': trigger.result_data
                }
            )

            if progressed:
                # Mark trigger as processed
                trigger.processed = True
                trigger.processed_at = timezone.now()
                trigger.save(update_fields=['processed', 'processed_at'])
                print(f"   ✓ Trigger {trigger.id} processed successfully")

                # Refresh event to see changes
                event.refresh_from_db()
                print(f"   Event now at stage: {event.current_stage}")
            else:
                print(f"   ✗ Trigger {trigger.id} - no workflow progression occurred")

        # Step 4: Final status check
        event.refresh_from_db()
        print(f"\n4. Final Event Status:")
        print(f"   Payment Status: {event.payment_status}")
        print(f"   Current Stage: {event.current_stage}")
        print(f"   Total Amount Due: ${event.total_amount_due}")
        print(f"   Total Amount Paid: ${event.total_amount_paid}")

        # Check remaining unprocessed triggers
        remaining_triggers = WorkflowTrigger.objects.filter(
            event=event,
            trigger_type='PAYMENT_RECEIVED',
            processed=False
        ).count()
        print(f"   Remaining unprocessed triggers: {remaining_triggers}")

        print("\n✓ Event 170 complete fix finished!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_event_170_complete()