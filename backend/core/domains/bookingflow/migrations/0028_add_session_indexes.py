# Generated migration for optimization - adds composite indexes for session queries

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookingflow', '0027_add_pricing_summary_terms_config'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='bookingsession',
            index=models.Index(
                fields=['is_completed', 'expires_at'],
                name='session_completed_expires_idx'
            ),
        ),
    ]
