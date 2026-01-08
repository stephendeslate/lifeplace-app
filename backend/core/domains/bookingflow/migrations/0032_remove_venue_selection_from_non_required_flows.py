# backend/core/domains/bookingflow/migrations/0032_remove_venue_selection_from_non_required_flows.py
"""
Data migration to remove venue_selection steps from flows that don't require them.
Only Wedding Booking Flow should have venue_selection.
"""
from django.db import migrations


def remove_venue_selection_steps(apps, schema_editor):
    """Remove venue_selection steps from non-wedding flows."""
    BookingFlowStep = apps.get_model('bookingflow', 'BookingFlowStep')
    VenueSelectionStepConfiguration = apps.get_model('bookingflow', 'VenueSelectionStepConfiguration')

    # Flows that should NOT have venue_selection
    flows_to_fix = [
        'Camps & Retreats Booking Flow',
        'Team Building Booking Flow',
    ]

    for step in BookingFlowStep.objects.filter(
        booking_flow__name__in=flows_to_fix,
        step_type='venue_selection'
    ):
        print(f"Removing venue_selection from: {step.booking_flow.name}")
        # Delete configuration first
        VenueSelectionStepConfiguration.objects.filter(step=step).delete()
        step.delete()

    # Reorder remaining steps for affected flows
    BookingFlow = apps.get_model('bookingflow', 'BookingFlow')
    for flow in BookingFlow.objects.filter(name__in=flows_to_fix):
        all_steps = list(flow.steps.all().order_by('order'))
        for new_order, step in enumerate(all_steps, start=1):
            if step.order != new_order:
                step.order = new_order
                step.save()
        print(f"  - Reordered steps: {[s.step_type for s in all_steps]}")


def reverse_remove_venue_selection(apps, schema_editor):
    """No-op reverse - we don't want to re-add venue_selection."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('bookingflow', '0031_update_booking_flow_steps'),
    ]

    operations = [
        migrations.RunPython(remove_venue_selection_steps, reverse_remove_venue_selection),
    ]
