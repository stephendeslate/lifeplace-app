"""
Data migration: fix auth_method for clients who self-registered with a password
but were left as 'invitation_pending' due to a bug in client_register.

Affected users: role=CLIENT, auth_method='invitation_pending', has a usable password
(password hash does NOT start with '!').
"""

from django.db import migrations


def fix_self_registered_clients(apps, schema_editor):
    User = apps.get_model("users", "User")
    affected = User.objects.filter(
        role="CLIENT",
        auth_method="invitation_pending",
    ).exclude(
        password__startswith="!",
    )
    count = affected.update(auth_method="password")
    if count:
        print(f"\n  Fixed auth_method for {count} self-registered client(s)")


def reverse_noop(apps, schema_editor):
    # Not reversible — we can't distinguish previously-affected rows
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0010_add_auth_method"),
    ]

    operations = [
        migrations.RunPython(fix_self_registered_clients, reverse_noop),
    ]
