# Admin CRM — CLAUDE.md

## Non-Obvious Conventions

- **Use path aliases for all imports** — `@/` and `@shared`, never deep relative paths like `../../../`
- **Show toast on mutation success/error** via `useToastActions()`
- **Invalidate queries on mutation success** — don't rely on refetch intervals
- **Lazy-load all routes except Login and Dashboard** — those are critical path
- **Coverage thresholds**: 80% (branches, functions, lines, statements)
