import requests
import json

# Get token
token_resp = requests.post('http://localhost:8000/api/users/token/',
                          json={'email': 'stephendeslate@gmail.com', 'password': 'HuDi#[Ta3'})
if token_resp.status_code == 200:
    token = token_resp.json()['access']
    print('Token obtained successfully')

    # Test booking flows
    flows_resp = requests.get('http://localhost:8000/api/bookingflow/flows/',
                             headers={'Authorization': f'Bearer {token}'})
    print(f'Flows response: {flows_resp.status_code}')
    if flows_resp.status_code == 200:
        flows = flows_resp.json()
        print(f'Found {len(flows["results"])} flows')

        # Test session creation
        if flows['results']:
            session_data = {
                'booking_flow': flows['results'][0]['id'],
                'ip_address': '127.0.0.1',
                'user_agent': 'Test/1.0',
                'referrer_url': ''
            }
            session_resp = requests.post('http://localhost:8000/api/bookingflow/sessions/',
                                       json=session_data,
                                       headers={'Authorization': f'Bearer {token}'})
            print(f'Session creation response: {session_resp.status_code}')
            if session_resp.status_code == 201:
                session = session_resp.json()
                print(f'Session keys: {list(session.keys())}')
                print(f'Session has uuid: {"uuid" in session}')
                if 'uuid' in session:
                    print(f'Session UUID: {session["uuid"]}')
                print(f'Full session response: {json.dumps(session, indent=2)[:500]}...')
            else:
                print(f'Session creation failed: {session_resp.text[:200]}')
    else:
        print(f'Flows request failed: {flows_resp.text[:200]}')
else:
    print(f'Auth failed: {token_resp.text[:200]}')