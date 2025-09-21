#!/usr/bin/env python3
"""
Test script for workflow API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8001"

def authenticate(email, password):
    """Authenticate and return access token"""
    auth_data = {
        "email": email,
        "password": password
    }

    response = requests.post(f"{BASE_URL}/api/users/login/", json=auth_data)
    if response.status_code == 200:
        return response.json()["tokens"]["access"]
    else:
        print(f"Authentication failed: {response.status_code}")
        print(response.text)
        return None

def test_workflow_endpoints():
    """Test all workflow endpoints"""
    # Authenticate as admin
    admin_token = authenticate("stephendeslate@gmail.com", "HuDi#[Ta3")
    if not admin_token:
        return

    headers = {"Authorization": f"Bearer {admin_token}"}

    print("=== WORKFLOW API ENDPOINT TESTING ===\n")

    # Test 1: Get all workflow templates
    print("1. Testing GET /api/workflows/templates/")
    response = requests.get(f"{BASE_URL}/api/workflows/templates/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['count']} workflow templates")
        for template in data["results"]:
            print(f"  - {template['name']} (ID: {template['id']}, Active: {template['is_active']}, Stages: {template['stages_count']})")
    else:
        print(f"Error: {response.text}")
    print()

    # Test 2: Get specific Events template (ID: 6)
    print("2. Testing GET /api/workflows/templates/6/ (Events template)")
    response = requests.get(f"{BASE_URL}/api/workflows/templates/6/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Template: {data['name']}")
        print(f"Description: {data['description']}")
        print(f"Active: {data['is_active']}")
        print(f"Stages: {len(data.get('stages', []))}")
    else:
        print(f"Error: {response.text}")
    print()

    # Test 3: Get workflow stages for Events template
    print("3. Testing GET /api/workflows/stages/?template=6")
    response = requests.get(f"{BASE_URL}/api/workflows/stages/?template=6", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['count']} stages for Events template:")
        for stage in data["results"]:
            print(f"  - {stage['name']} (Order: {stage['order']}, Type: {stage['automation_type']})")
            if stage.get('communication_template'):
                print(f"    Email template: {stage['communication_template']['name']}")
    else:
        print(f"Error: {response.text}")
    print()

    # Test 4: Test client access to workflows
    print("4. Testing client access to workflow endpoints")
    client_token = authenticate("john.doe@gmail.com", "test123")
    if client_token:
        client_headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(f"{BASE_URL}/api/workflows/templates/", headers=client_headers)
        print(f"Client access to templates: {response.status_code}")
        if response.status_code != 200:
            print(f"Client denied access (expected): {response.text}")
    print()

    print("=== WORKFLOW API TESTING COMPLETE ===")

if __name__ == "__main__":
    test_workflow_endpoints()