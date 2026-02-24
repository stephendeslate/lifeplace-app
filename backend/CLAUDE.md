# Backend — CLAUDE.md

## Non-Obvious Conventions

- **Business logic in `services.py` only** — views are thin wrappers that call services and return serialized responses. Never put business logic in views.
- **Never edit migration files directly** — always use `makemigrations`. Only one agent/developer should generate migrations at a time to avoid numbering conflicts.
- **Middleware order in settings.py matters** — do not reorder. The custom middleware (TrustedProxyMiddleware, SecurityMiddleware, IdempotencyMiddleware, ETagMiddleware) must stay in their current positions relative to Django's built-in middleware.
- **Coverage threshold**: 60%
