# CLAUDE.md

Each app has its own CLAUDE.md — see `backend/`, `frontend/admin-crm/`, `frontend/client-portal/`, `mobile-app/`, and `frontend/shared/`.

## Non-Obvious Conventions

- **No MUI Grid components** in any frontend app — use `Box` with flexbox or `Stack` instead
- **No Redux/Zustand** in web apps — React Query for server state, Context API for UI state only. Mobile uses Zustand (intentional divergence).
- **Naive Philippine Time everywhere** — `USE_TZ = False` is intentional (not a bug). See [ADR-001](docs/architecture/ADR-001-timezone-handling.md). Use `timezone.now()` in backend, `formatPhilippinesTime()` in frontend — never raw `datetime.now()` or `toLocaleTimeString()`.
- **"Review" step is deprecated** — it's now "Pricing Summary" in the booking flow.
