# Generated migration for CompanySettings model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0004_mobileappversion'),
    ]

    operations = [
        migrations.CreateModel(
            name='CompanySettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company_name', models.CharField(default='LifePlace Retreat & Events Center', help_text='Official company name', max_length=255)),
                ('company_tagline', models.CharField(blank=True, help_text='Company tagline or slogan', max_length=255)),
                ('logo', models.ImageField(blank=True, help_text='Company logo (recommended: PNG, 300x100px)', null=True, upload_to='company/logos/')),
                ('logo_dark', models.ImageField(blank=True, help_text='Logo for dark backgrounds', null=True, upload_to='company/logos/')),
                ('favicon', models.ImageField(blank=True, help_text='Favicon (recommended: 32x32px PNG)', null=True, upload_to='company/icons/')),
                ('primary_color', models.CharField(default='#2c5aa0', help_text='Primary brand color (hex code)', max_length=7)),
                ('secondary_color', models.CharField(default='#1a365d', help_text='Secondary brand color (hex code)', max_length=7)),
                ('accent_color', models.CharField(default='#38a169', help_text='Accent color for highlights (hex code)', max_length=7)),
                ('email', models.EmailField(default='info@lifeplacealfonso.com', help_text='Primary contact email', max_length=254)),
                ('support_email', models.EmailField(default='support@lifeplacealfonso.com', help_text='Support email address', max_length=254)),
                ('phone', models.CharField(blank=True, help_text='Primary phone number', max_length=20)),
                ('phone_secondary', models.CharField(blank=True, help_text='Secondary phone number', max_length=20)),
                ('address_line1', models.CharField(blank=True, help_text='Street address line 1', max_length=255)),
                ('address_line2', models.CharField(blank=True, help_text='Street address line 2', max_length=255)),
                ('city', models.CharField(default='Alfonso', help_text='City', max_length=100)),
                ('province', models.CharField(default='Cavite', help_text='Province/State', max_length=100)),
                ('postal_code', models.CharField(blank=True, help_text='Postal/ZIP code', max_length=20)),
                ('country', models.CharField(default='Philippines', help_text='Country', max_length=100)),
                ('business_registration_number', models.CharField(blank=True, help_text='Business registration/TIN number', max_length=100)),
                ('vat_number', models.CharField(blank=True, help_text='VAT registration number', max_length=100)),
                ('website', models.URLField(default='https://lifeplacealfonso.com', help_text='Company website URL')),
                ('facebook_url', models.URLField(blank=True, help_text='Facebook page URL')),
                ('instagram_url', models.URLField(blank=True, help_text='Instagram profile URL')),
                ('pdf_footer_text', models.TextField(blank=True, default='Thank you for choosing LifePlace Retreat & Events Center!', help_text='Footer text for PDF documents')),
                ('invoice_terms', models.TextField(blank=True, help_text='Default invoice payment terms')),
                ('receipt_terms', models.TextField(blank=True, help_text='Terms printed on receipts')),
                ('bank_name', models.CharField(blank=True, help_text='Bank name for wire transfers', max_length=100)),
                ('bank_account_name', models.CharField(blank=True, help_text='Account holder name', max_length=255)),
                ('bank_account_number', models.CharField(blank=True, help_text='Bank account number', max_length=50)),
                ('bank_branch', models.CharField(blank=True, help_text='Bank branch', max_length=100)),
                ('bank_swift_code', models.CharField(blank=True, help_text='SWIFT/BIC code for international transfers', max_length=20)),
            ],
            options={
                'verbose_name': 'Company Settings',
                'verbose_name_plural': 'Company Settings',
            },
        ),
    ]
