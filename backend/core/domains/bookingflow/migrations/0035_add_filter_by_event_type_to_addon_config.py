# Generated migration for adding filter_by_event_type to AddonSelectionStepConfiguration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookingflow', '0034_remove_allow_payment_plans'),
    ]

    operations = [
        migrations.AddField(
            model_name='addonselectionstepconfiguration',
            name='filter_by_event_type',
            field=models.BooleanField(
                default=True,
                help_text="When enabled, show all active add-ons associated with the booking flow's event type. "
                          "When disabled, only show add-ons explicitly configured in available_addons."
            ),
        ),
    ]
