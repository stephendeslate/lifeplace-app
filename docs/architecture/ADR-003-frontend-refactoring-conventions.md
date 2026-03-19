# ADR-003: Frontend Refactoring Conventions — AI-Navigable Feature-Colocated Architecture

## Status
**Accepted** — 2026-03-19

## Context

The Lifeplace frontend has two web apps (admin-crm: ~620 files/169K lines, client-portal: ~466 files/113K lines) and a shared package. Multiple files exceed 1,000 lines — worst offenders: `PaymentPlanSettings.tsx` (1,883), `CleanPackageSelectionStep.tsx` (1,765), `FinancialPortal.tsx` (1,631), `modernTheme.ts` (1,456), `EventProfile.tsx` (1,389), `PaymentStep.tsx` (1,321), `BookingContext.tsx` (1,231), `usePayments.ts` (1,222).

Large files degrade AI code navigation, slow human review, and increase merge conflict risk. The backend is being refactored in parallel (ADR-002); this ADR establishes the frontend equivalent.

## Decision

### Backend-to-Frontend Pattern Mapping

| Backend Pattern (ADR-002) | Frontend Equivalent |
|---|---|
| Module-to-package promotion | File-to-directory promotion with `index.ts` barrel re-exports |
| Selectors (read-only queries) | Query hooks (`use{Entity}Queries.ts`) |
| Services (write operations) | Mutation hooks (`use{Entity}Mutations.ts`) |
| Frozen DTOs in `types.py` | TypeScript interfaces in domain-scoped `*.types.ts` |
| Facade pattern | Barrel re-exports maintaining external import paths |
| `<500 lines` threshold | `<500 lines` hooks/types/contexts/APIs, `<300 lines` components |

### Thresholds

| File Type | Warning | Error | Action |
|-----------|---------|-------|--------|
| Components (`.tsx`) | >300 lines | >500 lines | Extract sub-components |
| Hooks, contexts, APIs | >500 lines | >800 lines | Split into focused modules |
| Type files | >500 lines | >800 lines | Split into domain sub-types |
| Theme/config files | >500 lines | >800 lines | Split into token/override modules |

ESLint enforces: `max-lines` warns at 500, errors at 800 (both web apps).

### Target Feature-Colocated Structure

```
src/
  features/                         # Domain feature modules
    {domain}/
      api/                          # API modules (Axios calls)
      hooks/                        # React Query hooks (queries + mutations)
      types/                        # Domain TypeScript interfaces
      components/                   # Domain-specific components
      pages/                        # Domain page components
      index.ts                      # Public API barrel
  shared/                           # Cross-feature shared code
    components/                     # ErrorBoundary, ConfirmDialog, layout
    hooks/                          # Cross-cutting hooks (useDebounce, etc.)
    utils/                          # Formatters, validators, api.ts
    types/                          # common.types.ts, shared enums
  contexts/                         # App-level contexts (Auth, Theme, Toast)
  providers/                        # AppProviders
  design-system/                    # Theme, design tokens
  routes/                           # Route definitions
  config/                           # Environment, feature flags
  test/                             # MSW setup, shared test helpers
  assets/
```

### Key Patterns

#### 1. File-to-Directory Promotion

When a file exceeds thresholds, promote it to a directory:

```
# Before
hooks/usePayments.ts (1,222 lines)

# After
hooks/payments/
  index.ts                   # Re-exports all hooks (preserves import paths)
  keys.ts                    # QUERY_KEYS constant
  usePaymentGateways.ts      # Gateway queries + mutations
  useTaxRates.ts             # Tax rate CRUD
  usePayments.ts             # Core payment operations
  ...
```

External imports remain unchanged: `import { usePayments } from '@/hooks/payments'`

#### 2. Component Splitting

Large components split into an orchestrator + focused sub-components:

```
# Before
components/payments/PaymentPlanSettings.tsx (1,883 lines)

# After
components/payments/PaymentPlanSettings/
  index.ts                          # Re-exports PaymentPlanSettings
  PaymentPlanSettings.tsx           # Orchestrator (~200 lines)
  PaymentPlanTable.tsx              # Table display
  PaymentPlanFormDialog.tsx         # Create/edit dialog
  usePaymentPlanSettingsLogic.ts   # Business logic hook
```

Rules:
- Orchestrator component composes sub-components, stays under 200 lines
- Business logic extracted to a `use{Feature}Logic.ts` hook
- Sub-components receive data via props, not direct API calls
- Each sub-component is independently testable

#### 3. Context Decomposition

Large contexts split into reducer + action hooks + provider:

```
contexts/booking/
  index.ts                    # Re-exports BookingProvider, useBooking
  BookingProvider.tsx          # Provider component (~150 lines)
  bookingReducer.ts           # Reducer + action types
  bookingState.ts             # Initial state, BookingState type
  useBookingActions.ts        # Action implementations
  types.ts                    # BookingAction union, BookingActions interface
```

Public API (`useBooking()`) remains unchanged for consumers.

#### 4. Feature Module Boundaries

Each feature module (`features/{domain}/`) must:
- Export only via `index.ts` barrel
- Never import from another feature's internal files (only from its `index.ts`)
- Cross-feature shared code lives in `src/shared/`
- App-level contexts (Auth, Theme) live in `src/contexts/`

### Naming Conventions

| File Type | Naming | Example |
|-----------|--------|---------|
| Query hooks | `use{Entity}Queries.ts` | `usePaymentQueries.ts` |
| Mutation hooks | `use{Entity}Mutations.ts` | `usePaymentMutations.ts` |
| Combined hooks | `use{Entity}.ts` | `usePayments.ts` |
| Logic hooks | `use{Feature}Logic.ts` | `usePaymentPlanSettingsLogic.ts` |
| API modules | `{domain}.api.ts` | `payments.api.ts` |
| Type files | `{domain}.types.ts` | `payments.types.ts` |
| Barrel re-exports | `index.ts` | Always `index.ts` |
| Query keys | `keys.ts` | One per hook directory |

### Refactoring Approach: Strangler Fig (Phased)

Each phase leaves both apps building and passing tests:

| Phase | Scope | Risk |
|-------|-------|------|
| 0 | Foundation — ADR, shared cleanup, lint rules | Low |
| 1 | Type file splits | Low |
| 2 | Hook/API + context splits | High |
| 3 | Component splits | Medium |
| 4 | Feature-colocated reorganization | High |
| 5 | Polish & documentation | Low |

Rules:
- One git branch per phase (e.g., `refactor/fe-phase-0-foundation`)
- Each branch merged via PR before starting the next
- `npm run type-check && npm run test && npm run lint && npm run build` must pass after every phase
- Phase report written to `docs/architecture/refactoring-phase-reports/`

## Consequences

### Positive
- Every file under 500 lines — reliable AI navigation
- Feature colocation reduces cross-directory hunting
- Barrel re-exports preserve all import paths during migration
- Smaller files → fewer merge conflicts
- Self-documenting directory names match backend DDD domains

### Negative
- More files to navigate (mitigated by consistent naming and barrels)
- Barrel `index.ts` files add a maintenance surface
- Gradual migration means two patterns coexist temporarily (Phases 1–4)
- Feature colocation move (Phase 4) touches many import paths

### Risks
- `BookingContext` decomposition (Phase 2) could regress booking flow — requires integration test coverage
- Feature-colocated migration (Phase 4) is the highest-risk phase — done one domain at a time with rollback points

## Verification Checklist (Every Phase)

1. `npm run type-check` — TypeScript compiles clean (all workspaces)
2. `npm run test` — all tests pass
3. `npm run lint` — no new warnings/errors
4. `npm run build` — both apps build successfully
5. No circular imports between features
6. Phase report written to `docs/architecture/refactoring-phase-reports/`

## References

- **ADR-001**: `docs/architecture/ADR-001-timezone-handling.md` — timezone conventions
- **ESLint max-lines**: Configured in each app's `eslint.config.js`
- **Phase reports**: `docs/architecture/refactoring-phase-reports/fe-phase-*.md`

## Decision Makers
- **Architect**: Stephen Deslate
- **Date**: 2026-03-19
- **Reviewed by**: Claude Code (AI Assistant)

## Change Log
- 2026-03-19: Initial decision documented (Phase 0)

---

**Last Updated**: 2026-03-19
