# Generated migration to clean up deprecated review_booking step type

from django.db import migrations


def cleanup_review_booking_steps(apps, schema_editor):
    """
    Convert all deprecated 'review_booking' steps to 'pricing_summary'.

    This fixes production databases that still have the old step type which was
    removed in migration 0015.
    """
    BookingFlowStep = apps.get_model('bookingflow', 'BookingFlowStep')

    # Find all review_booking steps
    review_steps = BookingFlowStep.objects.filter(step_type='review_booking')

    if review_steps.exists():
        print(f"\n[Migration] Found {review_steps.count()} review_booking steps to convert")

        for step in review_steps:
            old_name = step.name
            # Convert to pricing_summary
            step.step_type = 'pricing_summary'

            # Update name if it still references "review"
            if 'review' in step.name.lower():
                step.name = step.name.replace('Review', 'Summary').replace('review', 'summary')

            step.save()
            print(f"  - Converted step '{old_name}' to pricing_summary (new name: '{step.name}')")

        print(f"[Migration] Successfully converted {review_steps.count()} steps\n")
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
