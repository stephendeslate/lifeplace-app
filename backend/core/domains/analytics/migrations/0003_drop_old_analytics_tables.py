# backend/core/domains/analytics/migrations/0003_drop_old_analytics_tables.py
# Generated manually - drops all old analytics models as part of analytics domain rewrite

from django.db import migrations


class Migration(migrations.Migration):
    """
    Migration to drop all old analytics tables.

    The analytics domain has been rewritten to use a query-first architecture
    that aggregates data directly from existing domain models (events, payments,
    bookingflow, etc.) rather than maintaining duplicate data in analytics-specific
    tables.

    Tables being dropped:
    - AlertRule
    - Widget
    - ReportExecution
    - AnalyticsReport
    - EventAggregation
    - FunnelConversion
    - Dashboard
    - ConversionFunnel
    - MetricDefinition
    - AnalyticsEvent
    """

    dependencies = [
        ('analytics', '0002_alter_alertrule_created_at_and_more'),
    ]

    operations = [
        # Drop in order of dependencies (child tables first)
        migrations.DeleteModel(name='AlertRule'),
        migrations.DeleteModel(name='Widget'),
        migrations.DeleteModel(name='ReportExecution'),
        migrations.DeleteModel(name='AnalyticsReport'),
        migrations.DeleteModel(name='EventAggregation'),
        migrations.DeleteModel(name='FunnelConversion'),
        migrations.DeleteModel(name='Dashboard'),
        migrations.DeleteModel(name='ConversionFunnel'),
        migrations.DeleteModel(name='MetricDefinition'),
        migrations.DeleteModel(name='AnalyticsEvent'),
    ]
