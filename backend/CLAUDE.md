# Backend — CLAUDE.md

## Non-Obvious Conventions

- **Business logic in `services.py` only** — views are thin wrappers that call services and return serialized responses. Never put business logic in views.
- **Read-only queries in `selectors.py`** — query/lookup logic goes in selectors, not services. Selectors never mutate data. Use keyword-only arguments (`*`). See `notes/selectors.py` for reference implementation.
- **Cross-domain DTOs** — data crossing domain boundaries uses frozen dataclasses inheriting from `core.types.DomainDTO`, not raw dicts. DTOs defined in the producing domain's `types.py`.
- **File size limit: 500 lines** — any file exceeding 500 lines should be split into a package. See [ADR-002](../docs/architecture/ADR-002-refactoring-conventions.md).
- **Never edit migration files directly** — always use `makemigrations`. Only one agent/developer should generate migrations at a time to avoid numbering conflicts.
- **Middleware order in settings.py matters** — do not reorder. The custom middleware (TrustedProxyMiddleware, SecurityMiddleware, IdempotencyMiddleware, ETagMiddleware) must stay in their current positions relative to Django's built-in middleware.
- **Coverage threshold**: 60%
- **mypy**: Strict typing enforced on new `selectors/` and `types.py` files. Config in `pyproject.toml`.
