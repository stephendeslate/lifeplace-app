# Admin CRM — CLAUDE.md

## Commands
```bash
cd frontend/admin-crm
npm run dev          # Dev server (port 5173)
npm run build        # Production build
npm run test         # Vitest (once)
npm run test:watch   # Vitest (watch mode)
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

## Path Aliases
- `@/` → `./src/`
- `@shared` → `../shared`

Use aliases for all imports — never deep relative paths like `../../../`.

## Key Rules
- **No Grid components** — use Box with flexbox or Stack
- **No Redux/Zustand** — React Query for server state, Context API for UI state only

## React Query Patterns
- Custom hooks in `src/hooks/` wrap all data fetching
- Query keys: `['resource', filters]` or `['resource', id]`
- Invalidate queries on mutation success
- Show toast on success/error via `useToastActions()`
- Stale time: 5 minutes default

## API Layer
- All calls in `src/apis/*.api.ts`
- Use shared `api` instance from `utils/api`
- Typed with interfaces from `src/types/*.types.ts`

## Routing
- `ProtectedRoute`: Authenticated users, wrapped in `AppLayout`
- `PublicRoute`: Redirects to dashboard if already authenticated
- `SettingsRoute`: Uses `EnhancedSettingsLayout` wrapper
- Lazy-load all routes except Login and Dashboard (critical path)

## Provider Hierarchy (order matters)
ThemeProvider → MuiThemeProvider → LocalizationProvider → AuthProvider → LayoutProvider → ToastProvider → BrandingProvider → ConfirmDialogProvider

## Testing
- Vitest + React Testing Library with jsdom
- Coverage thresholds: 80% (branches, functions, lines, statements)
- Test files: `*.test.ts` / `*.test.tsx`

## Timezone
- Use `formatPhilippinesTime()` from `utils/timezone.ts` — never `toLocaleDateString()` or `toLocaleTimeString()` directly
- Use `DateTimeDisplay` component for automatic PHT labeling
- See [ADR-001](../../docs/architecture/ADR-001-timezone-handling.md)
