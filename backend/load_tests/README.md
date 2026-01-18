# LifePlace Load Testing

Comprehensive load and stress testing for the LifePlace event management platform.

## Overview

This load testing suite is designed based on verified code review of the LifePlace codebase, targeting:

- **Backend**: Django REST Framework with 20 API domains
- **Frontend**: React applications (admin-crm, client-portal)
- **Infrastructure**: Fly.io Singapore, Upstash Redis, Fly Postgres
- **Target Scale**: 25-50 concurrent users (medium venue business)

## Quick Start

### 1. Install Dependencies

```bash
cd backend/load_tests
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file or set environment variables:

```bash
# Required
export LOAD_TEST_BASE_URL="https://api.yourdomain.com"

# Test credentials (create dedicated test accounts)
export LOAD_TEST_ADMIN_EMAIL="loadtest-admin@yourdomain.com"
export LOAD_TEST_ADMIN_PASSWORD="your-secure-password"
export LOAD_TEST_CLIENT_EMAIL="loadtest-client@yourdomain.com"
export LOAD_TEST_CLIENT_PASSWORD="your-secure-password"

# Optional - IDs for booking flow testing
export LOAD_TEST_BOOKING_FLOW_ID="your-booking-flow-uuid"
export LOAD_TEST_VENUE_ID="your-venue-uuid"
export LOAD_TEST_PACKAGE_ID="your-package-uuid"
export LOAD_TEST_EVENT_TYPE_ID="your-event-type-uuid"

# WebSocket (if different from API URL)
export LOAD_TEST_WS_URL="wss://api.yourdomain.com"
```

### 3. Run Tests

**With Web UI (recommended for first run):**
```bash
locust -f locustfile.py --host=https://api.yourdomain.com
```
Then open http://localhost:8089 in your browser.

**Headless mode (for CI/CD):**
```bash
locust -f locustfile.py --host=https://api.yourdomain.com \
    --headless -u 50 -r 5 -t 10m
```

## Test Scenarios

### Scenario 1: Baseline Test
Establish current performance baseline.

```bash
locust -f locustfile.py --host=https://api.yourdomain.com \
    --headless -u 10 -r 2 -t 5m
```

### Scenario 2: Normal Load
Simulate typical business hours traffic.

```bash
locust -f locustfile.py --host=https://api.yourdomain.com \
    --headless -u 25 -r 5 -t 10m
```

### Scenario 3: Peak Load
Simulate promotional period or popular event booking.

```bash
locust -f locustfile.py --host=https://api.yourdomain.com \
    --headless -u 50 -r 5 -t 15m
```

### Scenario 4: Stress Test
Push beyond expected capacity to find breaking points.

```bash
locust -f locustfile.py --host=https://api.yourdomain.com \
    --headless -u 100 -r 10 -t 5m
```

### Scenario 5: Soak Test
Long-duration test for memory leaks and resource exhaustion.

```bash
locust -f locustfile.py --host=https://api.yourdomain.com \
    --headless -u 25 -r 5 -t 1h
```

## User Classes

The test simulates four types of users based on frontend API analysis:

| User Type | Weight | Behavior |
|-----------|--------|----------|
| `AnonymousBrowserUser` | 50% | Browses booking flows, checks availability |
| `BookingFlowUser` | 30% | Completes booking flow (stops before payment) |
| `AuthenticatedClientUser` | 15% | Views events, invoices, quotes |
| `AdminDashboardUser` | 5% | Loads dashboard analytics (15+ queries) |

### Run Specific User Class

```bash
# Only booking flow users
locust -f locustfile.py BookingFlowUser --host=https://api.yourdomain.com

# Only admin dashboard users
locust -f locustfile.py AdminDashboardUser --host=https://api.yourdomain.com
```

## Critical Endpoints Tested

Based on code review of frontend API calls:

### Public (High Traffic)
- `GET /api/bookingflow/public/flows/` - List booking flows
- `POST /api/bookingflow/public/flows/{id}/start_session/` - Create session
- `PATCH /api/bookingflow/public/flows/session/{id}/update/` - Update session
- `POST /api/bookingflow/public/flows/session/{id}/validate-availability/` - Check availability
- `POST /api/bookingflow/public/flows/session/{id}/calculate-pricing/` - Calculate pricing

### Authenticated Client
- `GET /api/events/events/` - Client's events
- `GET /api/payments/invoices/` - Client's invoices
- `GET /api/sales/quotes/` - Client's quotes

### Admin Dashboard (Heavy Queries)
- `GET /api/analytics/dashboard/` - Main KPIs
- `GET /api/analytics/sales/bookings/` - Booking summary
- `GET /api/analytics/events/attendance/` - Attendance metrics
- ... and 12 more analytics endpoints

## WebSocket Testing

Test WebSocket connections separately:

```bash
cd backend/load_tests
python test_websocket.py
```

This tests:
- Connection establishment
- Concurrent connections (50+)
- Reconnection handling
- Message broadcasting

## Performance Thresholds

Based on your infrastructure (Fly.io ~$24-41/month):

| Metric | Target | Warning |
|--------|--------|---------|
| Response Time P95 | < 500ms | > 500ms |
| Response Time P99 | < 1000ms | > 1000ms |
| Error Rate | < 1% | > 1% |
| Throughput | 50-100 RPS | < 50 RPS |

## Rate Limiting

The tests are aware of your rate limits (from `settings.py`):

| Type | Limit | Test Behavior |
|------|-------|---------------|
| Anonymous | 100/hour | Backs off at 90% capacity |
| Authenticated | 1000/hour | Higher request rate allowed |

## Test Data Setup

For accurate testing, create dedicated test accounts:

```python
# In Django shell
from django.contrib.auth import get_user_model
User = get_user_model()

# Create test admin
User.objects.create_user(
    email='loadtest-admin@yourdomain.com',
    password='secure-password',
    role='ADMIN',
    is_staff=True
)

# Create test client
User.objects.create_user(
    email='loadtest-client@yourdomain.com',
    password='secure-password',
    role='CLIENT'
)
```

## Production Testing Safety

When testing against production:

1. **Use dedicated test accounts** - Don't use real admin/client accounts
2. **Test during low-traffic periods** - Early morning or late night
3. **Start with baseline load** - 10 users first, then increase
4. **Monitor error rates** - Stop if errors exceed 5%
5. **Skip payment completion** - Tests stop before actual payment
6. **Release reservations** - Tests clean up date reservations

## Interpreting Results

### Locust Web UI Metrics

- **RPS**: Requests per second (throughput)
- **Response Times**: P50, P95, P99 percentiles
- **Failures**: Failed requests count and percentage
- **Users**: Current number of simulated users

### Key Indicators

| Indicator | Healthy | Concerning |
|-----------|---------|------------|
| P95 Response Time | < 500ms | > 1000ms |
| Error Rate | < 1% | > 5% |
| RPS Growing | Increases with users | Plateaus early |

### Common Issues

**High Response Times:**
- Database queries need optimization
- Check N+1 query patterns
- Verify caching is working

**High Error Rates:**
- Rate limiting triggered (429 errors)
- Database connection exhaustion
- Memory pressure on server

**RPS Plateau:**
- Server CPU maxed out
- Database connection pool exhausted
- Worker processes saturated

## File Structure

```
backend/load_tests/
├── __init__.py
├── README.md              # This file
├── requirements.txt       # Dependencies
├── config.py              # Configuration and constants
├── utils.py               # JWT handling, helpers
├── locustfile.py          # Main Locust entry point
├── test_booking_flow.py   # Booking flow tests
├── test_admin_dashboard.py # Admin analytics tests
└── test_websocket.py      # WebSocket stress tests
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
load-test:
  runs-on: ubuntu-latest
  needs: [deploy-staging]
  steps:
    - uses: actions/checkout@v4

    - name: Install dependencies
      run: |
        cd backend/load_tests
        pip install -r requirements.txt

    - name: Run baseline load test
      run: |
        locust -f backend/load_tests/locustfile.py \
          --host=${{ secrets.STAGING_API_URL }} \
          --headless -u 10 -r 2 -t 2m \
          --html=load-test-report.html
      env:
        LOAD_TEST_ADMIN_EMAIL: ${{ secrets.LOAD_TEST_ADMIN_EMAIL }}
        LOAD_TEST_ADMIN_PASSWORD: ${{ secrets.LOAD_TEST_ADMIN_PASSWORD }}

    - name: Upload report
      uses: actions/upload-artifact@v4
      with:
        name: load-test-report
        path: load-test-report.html
```

## Troubleshooting

### "Connection refused"
- Verify the API URL is correct
- Check if the server is running
- Verify firewall rules allow connections

### "401 Unauthorized"
- Check test account credentials
- Verify accounts exist and are active
- Check JWT token expiration handling

### "429 Too Many Requests"
- Rate limiting is working correctly
- Reduce user count or add think time
- Tests automatically back off at 90% rate limit

### "WebSocket connection failed"
- Verify WebSocket URL (wss:// vs ws://)
- Check if Daphne is running (not just Django runserver)
- Verify CORS/Origin settings

## References

- [Locust Documentation](https://docs.locust.io/)
- [Django REST Framework Testing](https://www.django-rest-framework.org/api-guide/testing/)
- [WebSocket Client Python](https://websocket-client.readthedocs.io/)

---

*Load testing configuration based on verified code review of the LifePlace codebase.*
*Last updated: January 2026*
