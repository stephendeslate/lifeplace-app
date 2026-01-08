# backend/core/domains/bookingflow/migrations/0031_update_booking_flow_steps.py
"""
Data migration to update booking flow steps:
1. Remove Introduction steps from all flows
2. Make Date/Time, Package Selection, Add-on Selection optional and skippable
3. Reorder steps consistently
"""
from django.db import migrations


def update_booking_flow_steps(apps, schema_editor):
    """Update booking flow steps for all active flows."""
    BookingFlow = apps.get_model('bookingflow', 'BookingFlow')
    BookingFlowStep = apps.get_model('bookingflow', 'BookingFlowStep')
    IntroductionStepConfiguration = apps.get_model('bookingflow', 'IntroductionStepConfiguration')

    # Get all booking flows we created
    flow_names = [
        'Wedding Booking Flow',
        'Camps & Retreats Booking Flow',
        'Team Building Booking Flow',
        'Workshops Booking Flow',
        'Life Events Booking Flow',
    ]

    for flow in BookingFlow.objects.filter(name__in=flow_names):
        print(f"Updating flow: {flow.name}")

        # 1. Delete Introduction steps
        intro_steps = BookingFlowStep.objects.filter(
            booking_flow=flow,
            step_type='introduction'
        )
        if intro_steps.exists():
            # Delete the configuration first
            for step in intro_steps:
                IntroductionStepConfiguration.objects.filter(step=step).delete()
            intro_steps.delete()
            print(f"  - Removed introduction step")

        # 2. Make date_time, package_selection, addon_selection optional and skippable
        optional_step_types = ['date_time', 'package_selection', 'addon_selection']
        for step in BookingFlowStep.objects.filter(
            booking_flow=flow,
            step_type__in=optional_step_types
        ):
            step.is_required = False
            step.is_skippable = True
            step.save()
            print(f"  - Made {step.step_type} optional and skippable")

        # 3. First, move all existing steps to high order numbers to avoid conflicts
        all_steps = list(BookingFlowStep.objects.filter(booking_flow=flow).order_by('order'))
        for i, step in enumerate(all_steps):
            step.order = 1000 + i
            step.save()

        # 4. Reorder all steps sequentially
        # Note: venue_selection is NOT added here - only flows that originally have it keep it
        all_steps = list(BookingFlowStep.objects.filter(booking_flow=flow))

        # Define the desired step order
        step_order = [
            'date_time',
            'venue_selection',
            'package_selection',
            'addon_selection',
            'questionnaire',
            'pricing_summary',
            'contact_info',
            'payment_info',
            'confirmation',
        ]

        # Sort steps by desired order
        def get_step_priority(step):
            try:
                return step_order.index(step.step_type)
            except ValueError:
                return 999  # Unknown step types go to the end

        all_steps.sort(key=get_step_priority)

        # Assign new sequential order numbers
        for new_order, step in enumerate(all_steps, start=1):
            step.order = new_order
            step.save()

        print(f"  - Reordered steps: {[s.step_type for s in all_steps]}")

    # Also update the venue_selection step to be optional if it was added by previous migration
    for step in BookingFlowStep.objects.filter(step_type='venue_selection'):
        if step.is_required or not step.is_skippable:
            step.is_required = False
            step.is_skippable = True
            step.save()


def reverse_update_booking_flow_steps(apps, schema_editor):
    """Reverse the step updates - remove venue_selection and restore introduction."""
    BookingFlowStep = apps.get_model('bookingflow', 'BookingFlowStep')
    VenueSelectionStepConfiguration = apps.get_model('bookingflow', 'VenueSelectionStepConfiguration')

    # Delete venue_selection steps we added
    flow_names = [
        'Wedding Booking Flow',
        'Camps & Retreats Booking Flow',
        'Team Building Booking Flow',
        'Workshops Booking Flow',
        'Life Events Booking Flow',
    ]

    for step in BookingFlowStep.objects.filter(
        booking_flow__name__in=flow_names,
        step_type='venue_selection'
    ):
        VenueSelectionStepConfiguration.objects.filter(step=step).delete()
        step.delete()

    # Note: We cannot restore introduction steps without recreating them fully
    # That would require re-running migration 0030


class Migration(migrations.Migration):

    dependencies = [
        ('bookingflow', '0030_seed_booking_flows'),
    ]

    operations = [
        migrations.RunPython(update_booking_flow_steps, reverse_update_booking_flow_steps),
    ]
