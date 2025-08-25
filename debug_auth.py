#!/usr/bin/env python3
import os
import sys
import django
from pathlib import Path

# Setup Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model
User = get_user_model()

def test_admin_auth():
    print('=== AUTHENTICATION DEBUG ===')
    
    # Find admin user
    admin_user = User.objects.filter(role='ADMIN', email='admin@test.com').first()
    if not admin_user:
        print('❌ No admin user found with email admin@test.com')
        return
    
    print(f'✅ Found admin user: {admin_user.email}')
    print(f'   Active: {admin_user.is_active}')
    print(f'   Has usable password: {admin_user.has_usable_password()}')
    print(f'   Password hash: {admin_user.password[:50]}...')
    
    # Test common passwords
    test_passwords = ['admin', 'password', 'test', 'admin123', 'Admin123!']
    print('\n=== PASSWORD TESTS ===')
    for pwd in test_passwords:
        result = authenticate(username=admin_user.email, password=pwd)
        status = '✅ SUCCESS' if result else '❌ FAILED'
        print(f'   "{pwd}": {status}')
    
    # Check if password is set
    if not admin_user.has_usable_password():
        print('\n❌ User has no usable password set!')
        print('   This user needs to set a password first.')

if __name__ == '__main__':
    test_admin_auth()