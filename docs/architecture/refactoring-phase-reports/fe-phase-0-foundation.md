# Frontend Refactoring — Phase 0: Foundation

**Branch:** `refactor/fe-phase-0-foundation`
**Date:** 2026-03-19
**Status:** Complete

## Summary

Established the foundation for the frontend refactoring effort: ADR-003 documenting conventions, dead messaging code removed from shared package, ESLint file-size guardrails added.

## Changes Made

### 0a. ADR-003: Frontend Refactoring Conventions
- **Created:** `docs/architecture/ADR-003-frontend-refactoring-conventions.md`
- Documents: file size thresholds (<300 components, <500 hooks/types), splitting patterns, naming conventions, feature-colocated target structure, backend-to-frontend pattern mapping

### 0b. Shared Package Messaging Cleanup
Removed all dead messaging code from `frontend/shared/`. Neither admin-crm nor client-portal imported any of it.

**Files deleted (10):**
- `apis/messagingApi.ts`, `hooks/useMessagingQueries.ts`, `hooks/useMessagingMutations.ts`, `hooks/useMessagingWebSocket.ts`, `types/messaging.ts`, `utils/messagingUtils.ts`, `utils/query-keys.ts`, `import_validation_report.json`, `MESSAGING_INTEGRATION.md`, `INTEGRATION_GUIDE.md`

**Files modified (8):**
- `index.ts`, `hooks/index.ts`, `utils/index.ts`, `types/index.ts` — removed messaging re-exports
- `test-utils/test-providers.tsx`, `test-utils/index.ts`, `test-utils/__tests__/comprehensive-validation.test.ts` — removed messaging mock exports/tests
- `package.json` — removed `axios`, `react-window`, `@types/react-window`; removed broken `./configs` export; updated description

**Lines removed:** ~3,300 lines of dead code

### 0c. ESLint File Size Guardrails
- Added `max-lines` rule (warn at 500 lines) to both `admin-crm` and `client-portal` ESLint configs

## Verification Results

| Check | Result |
|-------|--------|
| `npm run type-check` | 3/3 packages pass |
| `npm run test` | All test files pass |
| `npm run lint` | 0 errors, warnings only (expected max-lines on oversized files) |
