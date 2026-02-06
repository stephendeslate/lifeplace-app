# backend/core/domains/settings/migrations/0008_update_privacy_policy_ga4.py
"""Add Google Analytics 4 disclosure to privacy policy."""

from django.db import migrations


def update_privacy_policy_ga4(apps, schema_editor):
    """Add GA4 references to the privacy policy service providers and cookies sections."""
    LegalDocument = apps.get_model('settings', 'LegalDocument')

    try:
        doc = LegalDocument.objects.get(document_type='PRIVACY_POLICY')
    except LegalDocument.DoesNotExist:
        return  # No privacy policy to update

    content = doc.content

    # 1. Add Google Analytics to Section 4.1 Service Providers
    old_google_oauth = (
        '<li><strong>Google:</strong> OAuth authentication '
        '(if you choose to sign in with Google)</li>'
    )
    new_google_entries = (
        '<li><strong>Google:</strong> OAuth authentication '
        '(if you choose to sign in with Google)</li>\n  '
        '<li><strong>Google Analytics 4:</strong> Website usage analytics '
        '(with anonymized IP addresses)</li>'
    )
    content = content.replace(old_google_oauth, new_google_entries)

    # 2. Expand Section 5.2 Analytics Cookies to mention GA4
    old_analytics_section = (
        '<h3>5.2 Analytics Cookies (Optional)</h3>\n<ul>\n'
        '  <li>Understanding how visitors interact with our website</li>\n'
        '  <li>Tracking page views and user flows</li>\n'
        '  <li>Improving website performance</li>\n</ul>'
    )
    new_analytics_section = (
        '<h3>5.2 Analytics Cookies (Optional)</h3>\n'
        '<p>With your consent, we use <strong>Google Analytics 4 (GA4)</strong> '
        'to collect anonymized usage data. GA4 uses cookies to help us:</p>\n<ul>\n'
        '  <li>Understanding how visitors interact with our website</li>\n'
        '  <li>Tracking page views and user flows through the booking process</li>\n'
        '  <li>Measuring booking conversion rates to improve the experience</li>\n'
        '  <li>Improving website performance and content</li>\n</ul>\n'
        '<p>Google Analytics data is processed with IP anonymization enabled. '
        'You can opt out of analytics cookies at any time via the cookie consent '
        'banner or your browser settings. For more information, see '
        '<a href="https://policies.google.com/privacy" target="_blank" '
        'rel="noopener noreferrer">Google\'s Privacy Policy</a>.</p>'
    )
    content = content.replace(old_analytics_section, new_analytics_section)

    doc.content = content
    doc.save()


def reverse_ga4_update(apps, schema_editor):
    """Reverse is a no-op since the content can be edited via admin."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0007_companysettings_support_hours_and_more'),
    ]

    operations = [
        migrations.RunPython(update_privacy_policy_ga4, reverse_ga4_update),
    ]
