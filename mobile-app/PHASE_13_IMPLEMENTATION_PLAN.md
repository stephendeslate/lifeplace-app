# Phase 13: Security Hardening - Implementation Plan

> **Reference:** [MOBILE_SECURITY.md](../docs/security/MOBILE_SECURITY.md), [ROADMAP.md](ROADMAP.md)
> **Prerequisite:** EAS Development Build required (not Expo Go)

---

## Current State Analysis

| Feature | Status | Location |
|---------|--------|----------|
| SecureStore for tokens | Done | `src/stores/authStore.ts` |
| Input sanitization | Done | `src/utils/security.ts` |
| SSL Certificate Pinning | **Not Done** | - |
| Root/Jailbreak Detection | **Not Done** | - |
| Biometric Authentication | **Not Done** | - |
| Session Timeout | **Not Done** | - |

---

## Task 13.1: Secure Storage Audit & Session Timeout

### 13.1.1 Update SecureStore with Keychain Accessibility

**File:** `src/stores/authStore.ts`

```typescript
import * as SecureStore from 'expo-secure-store';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return SecureStore.getItemAsync(name, SECURE_OPTIONS);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value, SECURE_OPTIONS);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name, SECURE_OPTIONS);
  },
};
```

### 13.1.2 Create Session Timeout Hook

**Create:** `src/hooks/useSessionTimeout.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthContext } from '@/contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';

const LAST_ACTIVITY_KEY = 'last_activity_timestamp';
const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface SessionTimeoutConfig {
  timeoutMs?: number;
  warningMs?: number;
  onWarning?: () => void;
  onTimeout?: () => void;
  enabled?: boolean;
}

export function useSessionTimeout(config: SessionTimeoutConfig = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT, onWarning, onTimeout, enabled = true } = config;
  const { isAuthenticated, logout } = useAuthContext();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const updateActivity = useCallback(async () => {
    if (!enabled || !isAuthenticated) return;
    await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, Date.now().toString());
  }, [enabled, isAuthenticated]);

  const checkSession = useCallback(async () => {
    if (!enabled || !isAuthenticated) return;

    const lastActivity = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed >= timeoutMs) {
        onTimeout?.();
        await logout();
      }
    }
  }, [enabled, isAuthenticated, timeoutMs, onTimeout, logout]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        await checkSession();
      } else if (nextState.match(/inactive|background/)) {
        await updateActivity();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [checkSession, updateActivity]);

  return { updateActivity };
}
```

### 13.1.3 Create Session Timeout Warning Component

**Create:** `src/components/common/SessionTimeoutWarning.tsx`

- Modal with countdown timer
- "Continue" button to extend session
- "Log Out" button for immediate logout

---

## Task 13.2: SSL Certificate Pinning

### 13.2.1 Install Dependencies

```bash
npx expo install react-native-ssl-public-key-pinning expo-build-properties
```

### 13.2.2 Update app.json

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", {
        "ios": { "networkInspector": false }
      }]
    ]
  }
}
```

### 13.2.3 Create SSL Pinning Utility

**Create:** `src/utils/sslPinning.ts`

```typescript
import { initializeSslPinning } from 'react-native-ssl-public-key-pinning';

const SSL_PINS = {
  'api.lifeplace.com': {
    includeSubdomains: true,
    publicKeyHashes: [
      'sha256/PRIMARY_CERT_HASH_HERE',
      'sha256/BACKUP_CERT_HASH_HERE',
    ],
  },
};

export async function initSSLPinning(): Promise<boolean> {
  if (__DEV__) return true; // Skip in development

  try {
    await initializeSslPinning(SSL_PINS);
    console.log('SSL Pinning initialized');
    return true;
  } catch (error) {
    console.error('SSL Pinning failed:', error);
    return false;
  }
}
```

**Generate certificate hashes:**
```bash
openssl s_client -connect api.lifeplace.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | base64
```

---

## Task 13.3: Biometric Authentication

### 13.3.1 Install Dependencies

```bash
npx expo install expo-local-authentication
```

### 13.3.2 Update app.json

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSFaceIDUsageDescription": "LifePlace uses Face ID to securely authenticate you."
      }
    }
  }
}
```

### 13.3.3 Create Biometric Service

**Create:** `src/services/biometrics.ts`

```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export const BiometricService = {
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  async authenticate(promptMessage: string): Promise<{ success: boolean; error?: string }> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });
    return { success: result.success, error: result.error };
  },

  async isEnabled(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  },

  async setEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    }
  },
};
```

### 13.3.4 Create Biometric Hook

**Create:** `src/hooks/useBiometrics.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BiometricService } from '@/services/biometrics';

export function useBiometrics() {
  const queryClient = useQueryClient();

  const capability = useQuery({
    queryKey: ['biometrics', 'capability'],
    queryFn: BiometricService.isAvailable,
  });

  const enabled = useQuery({
    queryKey: ['biometrics', 'enabled'],
    queryFn: BiometricService.isEnabled,
  });

  const toggle = useMutation({
    mutationFn: async (enable: boolean) => {
      if (enable) {
        const result = await BiometricService.authenticate('Enable biometric login');
        if (!result.success) throw new Error(result.error);
      }
      await BiometricService.setEnabled(enable);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biometrics', 'enabled'] }),
  });

  return {
    isAvailable: capability.data ?? false,
    isEnabled: enabled.data ?? false,
    isLoading: capability.isLoading || enabled.isLoading,
    enable: () => toggle.mutateAsync(true),
    disable: () => toggle.mutateAsync(false),
    authenticate: BiometricService.authenticate,
  };
}
```

### 13.3.5 Create Biometric Lock Screen

**Create:** `src/components/security/BiometricLockScreen.tsx`

- Full-screen lock overlay
- Biometric icon (Face ID / Touch ID)
- "Unlock" button
- "Log Out Instead" option

### 13.3.6 Create Biometric Settings Screen

**Create:** `app/settings/biometric.tsx`

- Toggle to enable/disable biometric auth
- Status indicators (hardware available, enrolled)
- Information about how it works

---

## Task 13.4: Root/Jailbreak Detection

### 13.4.1 Install Dependencies

```bash
npm install freerasp-react-native
```

### 13.4.2 Create Security Checks Service

**Create:** `src/services/securityChecks.ts`

```typescript
import Talsec, { TalsecConfig, Threat } from 'freerasp-react-native';

const CRITICAL_THREATS = ['privilegedAccess', 'hooks', 'appIntegrity'];
let detectedThreats: string[] = [];

export async function initSecurityChecks(): Promise<void> {
  if (__DEV__) return;

  const config: TalsecConfig = {
    androidConfig: {
      packageName: 'com.lifeplace.app',
      certificateHashes: ['YOUR_SIGNING_HASH'],
    },
    iosConfig: {
      appBundleId: 'com.lifeplace.app',
      appTeamId: 'YOUR_TEAM_ID',
    },
    watcherMail: 'security@lifeplace.com',
    isProd: true,
  };

  const callbacks = {
    privilegedAccess: () => detectedThreats.push('privilegedAccess'),
    hooks: () => detectedThreats.push('hooks'),
    appIntegrity: () => detectedThreats.push('appIntegrity'),
    simulator: () => detectedThreats.push('simulator'),
    debug: () => detectedThreats.push('debug'),
  };

  await Talsec.start(config, callbacks);
}

export function getSecurityStatus() {
  const hasCritical = detectedThreats.some(t => CRITICAL_THREATS.includes(t));
  return {
    isSecure: detectedThreats.length === 0,
    threats: [...detectedThreats],
    shouldBlockApp: hasCritical && !__DEV__,
  };
}
```

### 13.4.3 Create Security Blocked Screen

**Create:** `src/components/security/SecurityBlockedScreen.tsx`

- Shield warning icon
- "Security Alert" title
- List of detected threats
- Contact support link
- No way to bypass

---

## Task 13.5: Security Provider & Initialization

### 13.5.1 Create Security Provider

**Create:** `src/providers/SecurityProvider.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initSSLPinning } from '@/utils/sslPinning';
import { initSecurityChecks, getSecurityStatus } from '@/services/securityChecks';
import { SecurityBlockedScreen } from '@/components/security/SecurityBlockedScreen';
import { LoadingScreen } from '@/components/common/LoadingScreen';

interface SecurityContextValue {
  isInitialized: boolean;
  isBlocked: boolean;
}

const SecurityContext = createContext<SecurityContextValue | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [threats, setThreats] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      await initSSLPinning();
      await initSecurityChecks();

      // Wait for threat detection
      await new Promise(r => setTimeout(r, 1500));

      const status = getSecurityStatus();
      if (status.shouldBlockApp) {
        setIsBlocked(true);
        setThreats(status.threats);
      }
      setIsInitialized(true);
    };
    init();
  }, []);

  if (!isInitialized) return <LoadingScreen message="Initializing..." />;
  if (isBlocked) return <SecurityBlockedScreen threats={threats} />;

  return (
    <SecurityContext.Provider value={{ isInitialized, isBlocked }}>
      {children}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider');
  return ctx;
};
```

### 13.5.2 Update Root Layout

**File:** `app/_layout.tsx`

```typescript
import { SecurityProvider } from '@/providers/SecurityProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SecurityProvider>
          <QueryClientProvider client={queryClient}>
            {/* ... rest of providers */}
          </QueryClientProvider>
        </SecurityProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

---

## Files Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useSessionTimeout.ts` | Session timeout logic |
| `src/components/common/SessionTimeoutWarning.tsx` | Timeout warning modal |
| `src/utils/sslPinning.ts` | SSL certificate pinning |
| `src/services/biometrics.ts` | Biometric auth service |
| `src/hooks/useBiometrics.ts` | Biometric React hook |
| `src/components/security/BiometricLockScreen.tsx` | Lock screen UI |
| `src/services/securityChecks.ts` | Root/jailbreak detection |
| `src/components/security/SecurityBlockedScreen.tsx` | Blocked screen UI |
| `src/providers/SecurityProvider.tsx` | Security initialization |
| `app/settings/biometric.tsx` | Biometric settings screen |

### Files to Modify

| File | Changes |
|------|---------|
| `src/stores/authStore.ts` | Add keychain accessibility |
| `app.json` | Add plugins, Face ID description |
| `app/_layout.tsx` | Wrap with SecurityProvider |
| `package.json` | Add dependencies |

---

## Dependencies

```bash
# SSL Pinning
npx expo install react-native-ssl-public-key-pinning expo-build-properties

# Biometric Auth
npx expo install expo-local-authentication

# Root/Jailbreak Detection
npm install freerasp-react-native
```

---

## Testing Checklist

| Test | Expected | Priority |
|------|----------|----------|
| SSL pinning with proxy | Connection fails | P0 |
| SSL pinning without proxy | Connection succeeds | P0 |
| Root detection on rooted device | App blocked | P0 |
| Jailbreak detection on jailbroken device | App blocked | P0 |
| Normal device | App works normally | P0 |
| Enable biometrics | Auth prompt shown | P1 |
| Biometric unlock | Unlocks on success | P1 |
| Session timeout (30 min) | Auto logout | P1 |
| Session warning (25 min) | Warning shown | P1 |

---

## Implementation Order

1. **13.1** SecureStore audit + session timeout
2. **13.2** SSL certificate pinning
3. **13.4** Root/jailbreak detection
4. **13.5** Security provider integration
5. **13.3** Biometric authentication
6. **Testing** Create EAS build and test all features

---

## Security Checklist (Pre-Launch)

- [ ] SSL pinning with production certificates
- [ ] Backup certificate pins for rotation
- [ ] Root/jailbreak detection active
- [ ] Security blocked screen implemented
- [ ] Tokens in SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- [ ] Biometric authentication working
- [ ] Session timeout (30 min default)
- [ ] No sensitive data in console logs
- [ ] Debug mode disabled in production
