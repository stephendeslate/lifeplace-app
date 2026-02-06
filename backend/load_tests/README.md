# LifePlace Smoke Tests

Post-deploy smoke tests that validate the 3 critical user journeys against production.

## What it tests

| Scenario | What it validates | Requests |
|---|---|---|
| **Booking flow** | Public flow list, availability, event types, full booking session (start, steps, release) | ~15 |
| **Client portal** | JWT login, view events/invoices/quotes | ~5 |
| **Admin dashboard** | JWT login, 14 analytics endpoints, events/payments/clients list | ~20 |

Total: ~40 requests in ~2 minutes. Well within rate limits (100/hr anon, 1000/hr auth).

## Quick start

```bash
cd backend/load_tests
pip install -r requirements.txt

# Run all 3 scenarios (~2 min)
locust -f locustfile.py --headless -u 3 -r 3 -t 2m --html=smoke_report.html

# Run just the booking flow
locust -f locustfile.py --headless -u 1 -r 1 -t 2m BookingFlowSmokeUser

# Run with Locust web UI (localhost:8089)
locust -f locustfile.py
```

## Configuration

Copy `.env.example` to `.env` and fill in:

```
LOAD_TEST_BASE_URL=https://lifeplace-api.fly.dev
LOAD_TEST_ADMIN_EMAIL=loadtest-admin@example.com
LOAD_TEST_ADMIN_PASSWORD=<password>
LOAD_TEST_CLIENT_EMAIL=loadtest-client@example.com
LOAD_TEST_CLIENT_PASSWORD=<password>
LOAD_TEST_BOOKING_FLOW_ID=10
LOAD_TEST_PACKAGE_ID=30
LOAD_TEST_EVENT_TYPE_ID=7
```

Test accounts must exist in production. Create via `fly ssh console`:
```bash
python manage.py shell -c "
from core.domains.users.models import User
User.objects.create_user(email='loadtest-admin@example.com', password='...', role='ADMIN')
User.objects.create_user(email='loadtest-client@example.com', password='...', role='CLIENT')
"
```

Entity IDs (booking flow, package, event type) come from the production database.

## Reading results

A passing test looks like:
```
SMOKE: Booking flow passed
SMOKE: Client portal passed
SMOKE: Admin dashboard passed
==================================================
SMOKE TEST RESULTS
==================================================
Requests:  42
Failures:  0
Error rate: 0.0%
Median:    210ms
P95:       430ms
PASS: All thresholds met
==================================================
```

Any `SMOKE: ... FAILED` line indicates a broken endpoint that needs investigation.

## Files

```
backend/load_tests/
├── locustfile.py           # Entry point: 3 smoke test user scenarios
├── load_booking_flow.py    # Booking session behavior (dynamic step-driven)
├── load_admin_dashboard.py # Admin dashboard analytics endpoints
├── utils.py                # JWT auth, rate limit tracking, test data generators
├── config.py               # Configuration from .env
├── .env                    # Credentials and IDs (not committed)
├── .env.example            # Template
└── requirements.txt        # locust, python-dotenv, websocket-client
```
