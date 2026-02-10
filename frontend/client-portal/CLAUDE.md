# Client Portal — CLAUDE.md

## Commands
```bash
cd frontend/client-portal
npm run dev          # Dev server (port 5174)
npm run build        # Production build
npm run test         # Vitest (once)
npm run test:watch   # Vitest (watch mode)
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

## Path Aliases
- `@/` → `./src/`
- `@shared` → `../shared`

## Key Rules
- **No Grid components** — use Box with flexbox or Stack
- **No Redux/Zustand** — React Query for server state, Context API for UI state only

## Layouts
Three layout types — choose based on page context:
- `PublicLayout`: Marketing/informational pages (home, about, rates)
- `BookingLayout`: Booking flow steps
- `ClientLayout`: Authenticated client area (dashboard, events, payments)

## Critical Path Routes (not lazy-loaded)
BookingPage, BookingComplete, Login, Dashboard — these load eagerly. All other routes use `React.lazy()`.

## Auth
- Accepts both CLIENT and ADMIN roles
- Google OAuth integration via `react-oauth/google`
- Auth context with token refresh logic

## Accessibility & SEO
- `AccessibilityProvider` is in the provider hierarchy — maintain it
- `SEOProvider` wraps all pages

## Stripe
- Payment forms use `@stripe/react-stripe-js`
- Stripe is a separate vendor chunk in the build config

## Provider Hierarchy (order matters)
SEOProvider → QueryClientProvider → ThemeProvider → LocalizationProvider → ToastProvider → ConfirmDialogProvider → AccessibilityProvider → AuthProvider → ContractsProvider

## Testing
- Vitest + React Testing Library with jsdom
- Coverage thresholds: 80% (branches, functions, lines, statements)
- Test files: `*.test.ts` / `*.test.tsx`

## Timezone
- Use `formatPhilippinesTime()` from `utils/timezone.ts` — never `toLocaleDateString()` or `toLocaleTimeString()` directly
- Use `DateTimeDisplay` component for automatic PHT labeling
- See [ADR-001](../../docs/architecture/ADR-001-timezone-handling.md)
