# Generated migration for optimization - adds composite indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vip', '0002_seed_default_tier'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='clientvipstatus',
            index=models.Index(
                fields=['status', 'expires_at'],
                name='vip_status_expires_idx'
            ),
        ),
    ]
