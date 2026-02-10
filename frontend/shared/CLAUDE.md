# Frontend Shared — CLAUDE.md

## Purpose
Code shared between admin-crm and client-portal (not mobile-app, which has its own patterns).

## What Belongs Here
- Design system tokens and components (`design-system/`)
- Shared React hooks (`hooks/`)
- Shared TypeScript types (`types/`)
- Shared API integrations (`apis/`, e.g., messagingApi)
- Shared utilities (`utils/`)
- Test utilities (`test-utils/`)

## What Does NOT Belong
- App-specific components, API calls, or types — those go in the consuming app
- Anything that only one app uses

## Imports
Consuming apps import via the `@shared` alias:
```typescript
import { something } from '@shared/utils';
import { SomeType } from '@shared/types';
```

## Testing
Uses Vitest — config at `vitest.config.ts`. Shared test setup in `test-setup.ts`.
