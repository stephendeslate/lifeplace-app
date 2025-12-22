# Generated migration for optimization - adds composite indexes for discount and category queries

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0008_productoption_event_days'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='discount',
            index=models.Index(
                fields=['is_active', '-valid_until'],
                name='discount_active_valid_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='productcategory',
            index=models.Index(
                fields=['parent', 'is_active'],
                name='category_parent_active_idx'
            ),
        ),
    ]
