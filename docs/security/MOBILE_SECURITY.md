# Mobile Security Implementation Guide

## Overview
This document specifies security implementations required for the LifePlace mobile app to achieve enterprise-grade security. All implementations require **EAS development builds** (not Expo Go).

---

## 1. SSL Certificate Pinning

### Purpose
Prevent man-in-the-middle (MITM) attacks by ensuring the app only communicates with servers presenting expected SSL certificates.

### Recommended Library
**[react-native-ssl-public-key-pinning](https://github.com/frw/react-native-ssl-public-key-pinning)**

- Simple setup via JS API
- Supports OTA updates for pin rotation
- Works with Expo development builds

### Installation

```bash
npx expo install react-native-ssl-public-key-pinning
```

### Configuration

#### 1. Disable Network Inspector (Development)

Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "networkInspector": false
          }
        }
      ]
    ]
  }
}
```

#### 2. Initialize Pinning

Create `src/utils/sslPinning.ts`:
```typescript
import { initializeSslPinning } from 'react-native-ssl-public-key-pinning';

// SHA-256 hashes of your server's SSL certificate public keys
// Generate using: openssl s_client -connect api.lifeplace.com:443 | \
//   openssl x509 -pubkey -noout | \
//   openssl pkey -pubin -outform der | \
//   openssl dgst -sha256 -binary | base64
const API_SSL_PINS = {
  'api.lifeplace.com': {
    includeSubdomains: true,
    publicKeyHashes: [
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Primary cert
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup cert
    ],
  },
};

export const initSSLPinning = async (): Promise<boolean> => {
  try {
    await initializeSslPinning({
      ...API_SSL_PINS,
    });
    console.log('SSL Pinning initialized successfully');
    return true;
  } catch (error) {
    console.error('SSL Pinning initialization failed:', error);
    // In production, consider blocking the app if pinning fails
    return false;
  }
};
```

#### 3. Initialize on App Start

In `App.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { initSSLPinning } from '@/utils/sslPinning';

export default function App() {
  const [isPinningReady, setIsPinningReady] = useState(false);

  useEffect(() => {
    const initSecurity = async () => {
      if (!__DEV__) {
        await initSSLPinning();
      }
      setIsPinningReady(true);
    };
    initSecurity();
  }, []);

  if (!isPinningReady) {
    return <LoadingScreen />;
  }

  return <AppContent />;
}
```

### Certificate Rotation Strategy

1. **Always include backup pins** - Include next certificate's hash before rotation
2. **Use OTA updates** - Update pins via expo-updates without app store release
3. **90-day rotation schedule** - Rotate certificates quarterly
4. **Monitor pin failures** - Log and alert on pinning failures

---

## 2. Root/Jailbreak Detection

### Purpose
Detect compromised devices that may have weakened security controls.

### Recommended Library
**[freeRASP](https://github.com/talsec/Free-RASP-ReactNative)**

More comprehensive than jail-monkey, includes:
- Root/jailbreak detection
- Root hider detection (Magisk Hide, Shamiko)
- Frida detection (hooking framework)
- Emulator detection
- Tampering detection
- Debug mode detection

### Installation

```bash
npm install freerasp-react-native
```

### Configuration

Create `src/utils/securityChecks.ts`:
```typescript
import Talsec, {
  TalsecConfig,
  Threat
} from 'freerasp-react-native';

const securityConfig: TalsecConfig = {
  // Android-specific
  androidConfig: {
    packageName: 'com.lifeplace.app',
    certificateHashes: ['your_signing_certificate_hash'],
    supportedAlternativeStores: ['com.sec.android.app.samsungapps'],
  },
  // iOS-specific
  iosConfig: {
    appBundleId: 'com.lifeplace.app',
    appTeamId: 'YOUR_TEAM_ID',
  },
  // Threat callbacks
  watcherMail: 'security@lifeplace.com',
  isProd: !__DEV__,
};

export interface SecurityStatus {
  isSecure: boolean;
  threats: Threat[];
  shouldBlockApp: boolean;
}

let detectedThreats: Threat[] = [];

export const initSecurityChecks = async (): Promise<void> => {
  const threatCallbacks = {
    // Critical threats - block app
    privilegedAccess: () => {
      detectedThreats.push(Threat.PrivilegedAccess);
      console.warn('Device is rooted/jailbroken');
    },
    debug: () => {
      detectedThreats.push(Threat.Debug);
      console.warn('App is being debugged');
    },
    simulator: () => {
      detectedThreats.push(Threat.Simulator);
      console.warn('Running on simulator/emulator');
    },
    appIntegrity: () => {
      detectedThreats.push(Threat.AppIntegrity);
      console.warn('App integrity compromised');
    },
    hooks: () => {
      detectedThreats.push(Threat.Hooks);
      console.warn('Hooking framework detected (Frida, etc.)');
    },

    // Warning threats - log but allow
    deviceBinding: () => {
      detectedThreats.push(Threat.DeviceBinding);
      console.warn('Device binding issue');
    },
    unofficialStore: () => {
      detectedThreats.push(Threat.UnofficialStore);
      console.warn('App installed from unofficial store');
    },
    secureHardwareNotAvailable: () => {
      detectedThreats.push(Threat.SecureHardwareNotAvailable);
      console.warn('Secure hardware not available');
    },
    passcode: () => {
      detectedThreats.push(Threat.Passcode);
      console.warn('Device passcode not set');
    },
    obfuscationIssues: () => {
      detectedThreats.push(Threat.ObfuscationIssues);
      console.warn('Obfuscation issues detected');
    },
  };

  try {
    await Talsec.start(securityConfig, threatCallbacks);
    console.log('Security checks initialized');
  } catch (error) {
    console.error('Security checks initialization failed:', error);
  }
};

export const getSecurityStatus = (): SecurityStatus => {
  const criticalThreats = [
    Threat.PrivilegedAccess,
    Threat.Hooks,
    Threat.AppIntegrity,
  ];

  const hasCriticalThreat = detectedThreats.some(t =>
    criticalThreats.includes(t)
  );

  return {
    isSecure: detectedThreats.length === 0,
    threats: [...detectedThreats],
    shouldBlockApp: hasCriticalThreat && !__DEV__,
  };
};

export const clearThreats = (): void => {
  detectedThreats = [];
};
```

### Response Strategy

| Threat Level | Threats | Action |
|--------------|---------|--------|
| **Critical** | Root/Jailbreak, Hooks, App Integrity | Block app, show security warning |
| **Warning** | Emulator, Debug, Unofficial Store | Log, allow with warning |
| **Info** | No Passcode, Secure HW unavailable | Log only |

### UI for Security Warning

Create `src/components/SecurityBlockedScreen.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { ShieldWarning } from 'phosphor-react-native';
import { colors, spacing, typeScale } from '@/theme';

interface Props {
  threats: string[];
}

export const SecurityBlockedScreen = ({ threats }: Props) => {
  return (
    <View style={styles.container}>
      <ShieldWarning size={80} color={colors.semantic.error} weight="fill" />
      <Text style={styles.title}>Security Alert</Text>
      <Text style={styles.message}>
        LifePlace cannot run on this device due to security concerns.
      </Text>
      <Text style={styles.details}>
        Detected issues:{'\n'}
        {threats.map(t => `• ${t}`).join('\n')}
      </Text>
      <Text style={styles.contact}>
        If you believe this is an error, please contact support.
      </Text>
    </View>
  );
};
```

---

## 3. Secure Token Storage

### Purpose
Store authentication tokens securely using platform-specific secure storage.

### Implementation

Already documented in mobile guide. Key points:
- Use `expo-secure-store` for JWT tokens
- Use `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keychain accessibility
- Never store tokens in AsyncStorage

```typescript
import * as SecureStore from 'expo-secure-store';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const SecureStorage = {
  setToken: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
  },
  getToken: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  deleteToken: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};
```

---

## 4. Biometric Authentication

### Purpose
Provide secure, convenient authentication using device biometrics.

### Implementation

Use `expo-local-authentication`:

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

export const BiometricService = {
  isAvailable: async (): Promise<boolean> => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  authenticate: async (promptMessage: string): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use Password',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });
    return result.success;
  },
};
```

---

## 5. App Transport Security (iOS)

### Purpose
Ensure all network connections use HTTPS.

### Configuration

In `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": false,
          "NSExceptionDomains": {}
        }
      }
    }
  }
}
```

---

## 6. Android Security Configuration

### Purpose
Configure network security for Android.

### Configuration

Create `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

---

## 7. Security Initialization Flow

```typescript
// src/App.tsx
import { useEffect, useState } from 'react';
import { initSSLPinning } from '@/utils/sslPinning';
import { initSecurityChecks, getSecurityStatus } from '@/utils/securityChecks';
import { SecurityBlockedScreen } from '@/components/SecurityBlockedScreen';

export default function App() {
  const [securityReady, setSecurityReady] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [threats, setThreats] = useState<string[]>([]);

  useEffect(() => {
    const initSecurity = async () => {
      // Skip security checks in development
      if (__DEV__) {
        setSecurityReady(true);
        return;
      }

      // Initialize SSL pinning
      await initSSLPinning();

      // Initialize threat detection
      await initSecurityChecks();

      // Check security status after brief delay for detection
      setTimeout(() => {
        const status = getSecurityStatus();
        if (status.shouldBlockApp) {
          setIsBlocked(true);
          setThreats(status.threats.map(t => t.toString()));
        }
        setSecurityReady(true);
      }, 1000);
    };

    initSecurity();
  }, []);

  if (!securityReady) {
    return <SplashScreen />;
  }

  if (isBlocked) {
    return <SecurityBlockedScreen threats={threats} />;
  }

  return <AppNavigator />;
}
```

---

## 8. Security Checklist

### Pre-Launch
- [ ] SSL pinning configured with production certificates
- [ ] Backup certificate pins added
- [ ] Root/jailbreak detection implemented
- [ ] Security blocked screen implemented
- [ ] Tokens stored in SecureStore
- [ ] Biometric authentication tested
- [ ] Network security config set (Android)
- [ ] ATS configured (iOS)
- [ ] Debug mode disabled in production

### Ongoing
- [ ] Certificate rotation scheduled (90 days)
- [ ] Security incident monitoring
- [ ] freeRASP weekly reports reviewed
- [ ] Dependency vulnerability scanning

---

## 9. Testing Security Features

### Development Build Required
```bash
# Create development build
eas build --profile development --platform all

# Test on device
npx expo start --dev-client
```

### Test Scenarios
1. **SSL Pinning**: Use proxy tool (Charles/mitmproxy) - should fail
2. **Root Detection**: Test on rooted device - should block
3. **Jailbreak Detection**: Test on jailbroken device - should block
4. **Emulator Detection**: Run on emulator - should warn (not block in dev)

---

## Sources

- [react-native-ssl-public-key-pinning](https://github.com/frw/react-native-ssl-public-key-pinning)
- [freeRASP React Native](https://github.com/talsec/Free-RASP-ReactNative)
- [freeRASP Documentation](https://docs.talsec.app/freerasp/)
- [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Local Authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
