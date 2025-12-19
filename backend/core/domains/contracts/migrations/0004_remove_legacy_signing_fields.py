# Generated migration to remove deprecated legacy signing fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0003_alter_contractamendment_created_at_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='eventcontract',
            name='signed_at',
        ),
        migrations.RemoveField(
            model_name='eventcontract',
            name='signed_by',
        ),
        migrations.RemoveField(
            model_name='eventcontract',
            name='signature_data',
        ),
        migrations.RemoveField(
            model_name='eventcontract',
            name='witness_name',
        ),
        migrations.RemoveField(
            model_name='eventcontract',
            name='witness_signature',
        ),
    ]
