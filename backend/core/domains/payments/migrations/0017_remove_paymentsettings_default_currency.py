# Generated manually - Remove default_currency from PaymentSettings
# Currency is now managed by CurrencySettings in the settings domain

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0016_add_enhanced_payment_terms_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='paymentsettings',
            name='default_currency',
        ),
    ]
