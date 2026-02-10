# Mobile App — CLAUDE.md

## Commands
```bash
cd mobile-app
npx expo start                # Dev server
npx expo run:ios              # Run on iOS simulator
npm test                      # Jest (NOT Vitest)
npm run test:watch            # Jest watch mode
npm run test:coverage         # Coverage report
npx maestro test .maestro/    # E2E tests
```

## Routing
Expo Router file-based routing in `app/` directory. Route groups: `(auth)`, `(tabs)`. Dynamic routes use `[id]` convention (e.g., `events/[id].tsx`).

## State Management
- **Zustand** for client state (NOT React Context like web apps)
- Stores in `src/stores/`: `authStore.ts`, `bookingStore.ts`, `favoritesStore.ts`
- Zustand persist middleware with SecureStore adapter

## Security
- **SecureStore** for tokens — NEVER use AsyncStorage for sensitive data
- SecureStore options: `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- Hardware-backed encryption (iOS Keychain, Android Keystore)

## Provider Hierarchy (order matters)
GestureHandlerRootView → SafeAreaProvider → PersistQueryClientProvider → StripeProvider → SecurityProvider → AuthProvider → ToastProvider

## Testing
- **Jest** with `jest-expo` preset (NOT Vitest)
- Coverage thresholds: hooks 90%, utils 95%, global 80%
- Test files: `*.test.ts` / `*.test.tsx`
- E2E: Maestro flows in `.maestro/`

## Mobile-Specific Hooks
- `useOfflineMutations()`: Offline mutation queue
- `useSessionTimeout()`: Session timeout with warning modal
- `useNotifications()`: Push notification registration
- `useDeepLinking()`: Deep link handling

## Configuration
- `app.config.js` (not .ts) for dynamic env vars
- Env vars use `EXPO_PUBLIC_` prefix
- Access config via `Constants.expoConfig.extra`

## Timezone
All datetimes are naive Philippine Time (PHT, UTC+8). Same rules as web apps — use timezone utilities, never raw Date formatting.
