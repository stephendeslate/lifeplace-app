# Generated migration for security logging

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SecurityEvent',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('event_type', models.CharField(choices=[('LOGIN_SUCCESS', 'Login Success'), ('LOGIN_FAILURE', 'Login Failure'), ('LOGOUT', 'Logout'), ('ACCOUNT_LOCKED', 'Account Locked'), ('ACCOUNT_UNLOCKED', 'Account Unlocked'), ('PASSWORD_CHANGE', 'Password Change'), ('PASSWORD_RESET', 'Password Reset'), ('PERMISSION_DENIED', 'Permission Denied'), ('ADMIN_ACTION', 'Administrative Action'), ('DATA_ACCESS', 'Data Access'), ('DATA_MODIFICATION', 'Data Modification'), ('FILE_UPLOAD', 'File Upload'), ('FILE_DOWNLOAD', 'File Download'), ('SUSPICIOUS_ACTIVITY', 'Suspicious Activity'), ('BRUTE_FORCE_ATTEMPT', 'Brute Force Attempt'), ('RATE_LIMIT_EXCEEDED', 'Rate Limit Exceeded'), ('WEBHOOK_RECEIVED', 'Webhook Received'), ('WEBHOOK_REJECTED', 'Webhook Rejected'), ('API_KEY_USED', 'API Key Used'), ('CONFIGURATION_CHANGED', 'Configuration Changed')], db_index=True, max_length=50)),
                ('severity', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], default='MEDIUM', max_length=20)),
                ('username', models.CharField(blank=True, max_length=150)),
                ('user_agent', models.TextField(blank=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('country', models.CharField(blank=True, max_length=2)),
                ('request_method', models.CharField(blank=True, max_length=10)),
                ('request_path', models.TextField(blank=True)),
                ('referer', models.TextField(blank=True)),
                ('description', models.TextField()),
                ('details', models.JSONField(blank=True, default=dict)),
                ('risk_score', models.IntegerField(default=0)),
                ('is_blocked', models.BooleanField(default=False)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'security_events',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='securityevent',
            index=models.Index(fields=['timestamp', 'event_type'], name='core_securi_timesta_4b7c3c_idx'),
        ),
        migrations.AddIndex(
            model_name='securityevent',
            index=models.Index(fields=['ip_address', 'timestamp'], name='core_securi_ip_addr_9e8b1f_idx'),
        ),
        migrations.AddIndex(
            model_name='securityevent',
            index=models.Index(fields=['user', 'timestamp'], name='core_securi_user_id_7a2d4e_idx'),
        ),
        migrations.AddIndex(
            model_name='securityevent',
            index=models.Index(fields=['severity', 'timestamp'], name='core_securi_severit_1c5f8a_idx'),
        ),
    ]