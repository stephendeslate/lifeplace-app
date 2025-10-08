# Generated migration to clean up deprecated review_booking step type

from django.db import migrations


def cleanup_review_booking_steps(apps, schema_editor):
    """
    Remove all deprecated 'review_booking' steps from booking flows.

    This fixes production databases that still have the old step type which was
    removed in migration 0015.

    Strategy:
    - If flow already has a pricing_summary step: DELETE the review_booking (redundant)
    - If flow has no pricing_summary step: CONVERT review_booking to pricing_summary
    """
    BookingFlowStep = apps.get_model('bookingflow', 'BookingFlowStep')

    # Find all review_booking steps
    review_steps = BookingFlowStep.objects.filter(step_type='review_booking')

    if review_steps.exists():
        print(f"\n[Migration] Found {review_steps.count()} review_booking steps to process")

        converted_count = 0
        deleted_count = 0

        for step in review_steps:
            # Check if this flow already has a pricing_summary step
            has_pricing_summary = BookingFlowStep.objects.filter(
                booking_flow=step.booking_flow,
                step_type='pricing_summary'
            ).exclude(pk=step.pk).exists()

            if has_pricing_summary:
                # Delete the redundant review_booking step
                step_name = step.name
                flow_name = step.booking_flow.name
                step.delete()
                deleted_count += 1
                print(f"  - Deleted redundant review_booking step '{step_name}' from flow '{flow_name}' (pricing_summary already exists)")
            else:
                # Safe to convert - no pricing_summary exists yet
                old_name = step.name
                step.step_type = 'pricing_summary'

                # Update name if it still references "review"
                if 'review' in step.name.lower():
                    step.name = step.name.replace('Review', 'Summary').replace('review', 'summary')

                step.save()
                converted_count += 1
                print(f"  - Converted review_booking to pricing_summary: '{old_name}' → '{step.name}'")

        print(f"[Migration] Completed: {converted_count} converted, {deleted_count} deleted\n")
    else:
        print("[Migration] No review_booking steps found - database already clean\n")


def reverse_cleanup(apps, schema_editor):
    """
    Reverse migration - note: this won't restore original state perfectly
    since we can't know which steps were originally review_booking vs pricing_summary
    """
    # No-op for reverse - we don't want to recreate deprecated step types
    print("[Migration] Reverse migration skipped - review_booking is deprecated")
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('bookingflow', '0015_alter_addonselectionstepconfiguration_created_at_and_more'),
    ]

    operations = [
        migrations.RunPython(cleanup_review_booking_steps, reverse_cleanup),
    ]
