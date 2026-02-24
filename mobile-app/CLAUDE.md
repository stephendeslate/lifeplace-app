# Mobile App — CLAUDE.md

## Non-Obvious Conventions

- **Zustand for client state** — NOT React Context like the web apps. Stores in `src/stores/` use Zustand persist middleware with SecureStore adapter.
- **NEVER use AsyncStorage for sensitive data** — use `SecureStore` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Hardware-backed encryption (iOS Keychain, Android Keystore).
- **`app.config.js` not `.ts`** — uses JS intentionally for dynamic env vars. Access config via `Constants.expoConfig.extra`.
- **Jest, not Vitest** — this is the only app using Jest. Coverage thresholds: hooks 90%, utils 95%, global 80%.
- **E2E tests**: Maestro flows in `.maestro/`
