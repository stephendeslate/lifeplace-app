# Backend — CLAUDE.md

## Commands
```bash
source venv/bin/activate && cd backend
daphne -p 8000 core.asgi:application        # Dev server (WebSocket support)
python manage.py runserver                   # Dev server (no WebSocket)
python manage.py makemigrations && python manage.py migrate
pytest                                       # Tests (--no-migrations is default)
python manage.py shell
python manage.py collectstatic
```

## Domain Architecture

Business logic goes in `services.py` — never in views. Views are thin wrappers that call services and return serialized responses.

Each domain in `core/domains/` contains: `models.py`, `serializers.py`, `views.py`, `services.py`, `urls.py`, `signals.py`

Active domains: analytics, bookingflow, clients, communications, contracts, events, messaging, notes, notifications, payments, products, questionnaires, sales, security, settings, users, vendors, venues, vip, workflows

## Testing

- **Framework**: pytest with pytest-django
- **Markers**: `@pytest.mark.slow`, `@pytest.mark.integration`, `@pytest.mark.external`, `@pytest.mark.celery`
- **Auto-fixtures** (applied to all tests): `celery_eager_mode`, `use_dummy_cache`, `mock_security_logging`
- **Client fixtures**: `api_client` (anonymous), `authenticated_client` (regular user), `admin_client` (admin), `client_user_client` (client role)
- **Coverage threshold**: 60%

## Celery

Task queues: `notifications`, `communications`, `analytics`, `events`, `contracts`, `sales`, `payments`

Redis key prefix: `lifeplace:celery:` — all Celery keys use this prefix to avoid collisions.

## Timezone

All datetimes are **naive Philippine Time (PHT, UTC+8)**. `USE_TZ = False` is intentional.
- Use `timezone.now()` — never `datetime.now()`
- Email templates auto-append "PHT" suffix
- API serializers include `timezone` and `timezone_offset` metadata fields
- See [ADR-001](../docs/architecture/ADR-001-timezone-handling.md) for rationale

## Migrations

- Never edit migration files directly — use `makemigrations`
- Only one agent/developer should generate migrations at a time to avoid numbering conflicts
- Tests run with `--no-migrations` by default

## Security

Middleware order matters — do not reorder:
1. CorsMiddleware
2. TrustedProxyMiddleware (custom — extracts real IP)
3. SecurityMiddleware (Django)
4. WhiteNoiseMiddleware
5. Custom SecurityMiddleware
6. IdempotencyMiddleware (custom)
7. ETagMiddleware (custom)

Rate limiting is enabled on all endpoints by default via DRF throttle classes.
