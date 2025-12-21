# Generated migration for adding terms configuration to PricingSummaryStepConfiguration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookingflow', '0026_remove_bookingflowstep_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='pricingsummarystepconfiguration',
            name='show_terms_checkbox',
            field=models.BooleanField(default=True, help_text='Show terms acceptance checkbox'),
        ),
        migrations.AddField(
            model_name='pricingsummarystepconfiguration',
            name='show_marketing_consent',
            field=models.BooleanField(default=True, help_text='Show marketing consent checkbox'),
        ),
        migrations.AddField(
            model_name='pricingsummarystepconfiguration',
            name='require_terms_acceptance',
            field=models.BooleanField(default=True, help_text='Require terms acceptance before proceeding'),
        ),
        migrations.AddField(
            model_name='pricingsummarystepconfiguration',
            name='terms_text',
            field=models.CharField(blank=True, default='', help_text='Custom terms label text (empty = use default)', max_length=500),
        ),
        migrations.AddField(
            model_name='pricingsummarystepconfiguration',
            name='terms_url',
            field=models.URLField(blank=True, default='', help_text='Custom Terms of Service URL (empty = use global)'),
        ),
        migrations.AddField(
            model_name='pricingsummarystepconfiguration',
            name='privacy_url',
            field=models.URLField(blank=True, default='', help_text='Custom Privacy Policy URL (empty = use global)'),
        ),
    ]
