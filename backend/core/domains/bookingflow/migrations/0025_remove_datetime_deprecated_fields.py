# Generated migration to remove deprecated DateTime duration fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('bookingflow', '0024_datetimestepconfiguration_min_event_days'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='datetimestepconfiguration',
            name='allow_time_selection',
        ),
        migrations.RemoveField(
            model_name='datetimestepconfiguration',
            name='min_duration_hours',
        ),
        migrations.RemoveField(
            model_name='datetimestepconfiguration',
            name='max_duration_hours',
        ),
        migrations.RemoveField(
            model_name='datetimestepconfiguration',
            name='default_duration_hours',
        ),
    ]
