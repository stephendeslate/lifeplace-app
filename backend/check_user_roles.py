#!/usr/bin/env python
"""
Check user roles to understand the permission issue
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def check_user_roles():
    """Check the roles of existing users"""
    print("=== Checking User Roles ===\n")

    # Get all users
    users = User.objects.all()

    print(f"Total users: {users.count()}\n")

    for user in users:
        print(f"User: {user.email}")
        print(f"  ID: {user.id}")
        print(f"  Role: {user.role}")
        print(f"  Is Staff: {user.is_staff}")
        print(f"  Is Superuser: {user.is_superuser}")
        print(f"  First Name: {user.first_name}")
        print(f"  Last Name: {user.last_name}")
        print("---")

    print("\nRole distribution:")
    admin_count = users.filter(role='ADMIN').count()
    client_count = users.filter(role='CLIENT').count()
    other_count = users.exclude(role__in=['ADMIN', 'CLIENT']).count()

    print(f"  ADMIN: {admin_count}")
    print(f"  CLIENT: {client_count}")
    print(f"  Other: {other_count}")

if __name__ == "__main__":
    check_user_roles()