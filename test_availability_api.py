#!/usr/bin/env python3
"""
Test script for availability API endpoints
"""

import os
import sys
import django
import requests
import json
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
from datetime import date, timedelta

# Setup Django environment
sys.path.append('/Users/stephendeslate/Desktop/lifeplace-app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_availability_endpoints():
    """Test availability API endpoints directly using Django test client"""
    print("🧪 Testing Availability API Endpoints")
    print("=" * 50)
    
    # Create a test client
    client = Client()
    
    # Test 1: Check availability for a specific date
    print("📅 Testing date availability check...")
    today = date.today()
    test_date = today + timedelta(days=7)  # One week from now
    
    try:
        url = f'/api/events/availability/check/'
        response = client.get(url, {
            'date': test_date.isoformat(),
            'duration': 120,
            'buffer_time': 30
        })
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Error: {response.content.decode()}")
    
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print()
    
    # Test 2: Check range availability
    print("📅 Testing date range availability...")
    start_date = today + timedelta(days=1)
    end_date = today + timedelta(days=14)
    
    try:
        url = f'/api/events/availability/range/'
        response = client.get(url, {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'event_type': 'WEDDING'
        })
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Error: {response.content.decode()}")
    
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print()
    
    # Test 3: Validate booking request
    print("🎯 Testing booking validation...")
    
    try:
        url = f'/api/events/availability/validate/'
        response = client.post(url, 
            json.dumps({
                'date': test_date.isoformat(),
                'time': '14:00',
                'duration': 240,
                'event_type': 'WEDDING',
                'client_type': 'LEAD',
                'contact_info': {
                    'name': 'Test Client',
                    'email': 'test@example.com',
                    'phone': '+1234567890'
                }
            }),
            content_type='application/json'
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Error: {response.content.decode()}")
    
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print()
    
    # Test 4: Find next available date
    print("🔍 Testing next available date...")
    
    try:
        url = f'/api/events/availability/next/'
        response = client.get(url, {
            'start_date': today.isoformat(),
            'event_type': 'WEDDING',
            'duration': 360
        })
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Error: {response.content.decode()}")
    
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Availability API testing complete!")

if __name__ == '__main__':
    test_availability_endpoints()