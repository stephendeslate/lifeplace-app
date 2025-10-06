#!/usr/bin/env python3
import requests
import json

def debug_login():
    """Debug login response to understand token structure"""
    login_url = "http://localhost:8000/api/users/login/"

    credentials = {"email": "test@test.com", "password": "testpass123"}

    try:
        response = requests.post(login_url, json=credentials)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print(f"Full Response: {json.dumps(data, indent=2)}")

            # Check for various possible token field names
            possible_token_fields = ['access', 'access_token', 'token', 'jwt', 'authToken']
            for field in possible_token_fields:
                if field in data:
                    print(f"Found token in '{field}': {data[field][:50]}...")
                    return data[field]

            print("No token found in response")
            return None
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    debug_login()