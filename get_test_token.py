#!/usr/bin/env python3
import requests
import json

# Try to login and get token for testing
def get_token():
    login_url = "http://localhost:8000/api/users/login/"

    # Try multiple possible credentials
    credentials_list = [
        {"email": "john.doe@gmail.com", "password": "testpass123"},
        {"email": "john.doe@gmail.com", "password": "password123"},
        {"email": "john.doe@gmail.com", "password": "admin123"},
        {"email": "client@test.com", "password": "testpass123"},
        {"email": "test@test.com", "password": "testpass123"},
    ]

    for credentials in credentials_list:
        try:
            print(f"Trying login with: {credentials['email']}")
            response = requests.post(login_url, json=credentials)

            if response.status_code == 200:
                data = response.json()
                print(f"SUCCESS! Login successful for {credentials['email']}")
                print(f"Access Token: {data.get('access', 'Not found')}")
                print(f"Refresh Token: {data.get('refresh', 'Not found')}")
                print(f"User: {data.get('user', 'Not found')}")
                return data
            else:
                print(f"  Failed: {response.status_code} - {response.text}")

        except Exception as e:
            print(f"  Error: {e}")

    print("All login attempts failed")
    return None

if __name__ == "__main__":
    token_data = get_token()