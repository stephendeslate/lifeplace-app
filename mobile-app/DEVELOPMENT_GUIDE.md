# LifePlace Mobile App - Comprehensive Development Guide

A complete step-by-step guide for building the LifePlace mobile application using React Native with Expo, targeting iOS and Android platforms.

> **Target Audience**: Developers new to React Native
> **Framework**: Expo (Managed Workflow)
> **Platforms**: iOS + Android
> **Scope**: Full feature parity with client-portal

---

## Table of Contents

1. [Project Overview](#1-project-overview)
   - [1.5 Development Workflow: Expo Go vs EAS Builds](#15-development-workflow-expo-go-vs-eas-builds) ⭐ **Read First**
2. [Environment Setup (macOS)](#2-environment-setup-macos)
3. [Project Initialization](#3-project-initialization)
4. [Project Structure](#4-project-structure)
5. [Core Dependencies](#5-core-dependencies)
6. [Navigation Setup](#6-navigation-setup)
7. [State Management](#7-state-management)
8. [API Layer](#8-api-layer)
9. [Authentication System](#9-authentication-system)
10. [Screen Implementation](#10-screen-implementation)
11. [Component Library](#11-component-library)
12. [Booking Flow Implementation](#12-booking-flow-implementation)
13. [Payment Integration](#13-payment-integration)
14. [Push Notifications](#14-push-notifications)
15. [Error Handling and Resilience](#15-error-handling-and-resilience)
16. [Performance Optimization](#16-performance-optimization)
17. [Accessibility and Inclusivity](#17-accessibility-and-inclusivity)
18. [Offline and Edge Case Support](#18-offline-and-edge-case-support)
19. [Testing and Monitoring](#19-testing-and-monitoring)
20. [Production Security and Configuration](#20-production-security-and-configuration)
21. [Deployment](#21-deployment)
22. [Appendix](#22-appendix)

---

## 1. Project Overview

### 1.1 What We're Building

The LifePlace mobile app is the mobile version of the client-portal web application. It allows clients to:

- **Explore** venues and packages for events (retreats, weddings, corporate events)
- **Book** events through a multi-step booking flow
- **Manage** their event bookings (view details, timeline, tasks)
- **Pay** invoices and manage payment plans
- **Sign** contracts digitally
- **Communicate** with LifePlace staff
- **Track** their event progress through the workflow

### 1.2 Feature Scope (Full Parity)

| Feature Area | Screens | Priority |
|-------------|---------|----------|
| **Authentication** | Login, Register, Forgot Password, Accept Invitation | P0 |
| **Home/Explore** | Venue Discovery, Package Browsing, Search | P0 |
| **Booking Flow** | 10-step configurable booking wizard | P0 |
| **My Events** | Event List, Event Detail, Timeline | P0 |
| **Payments** | Payment Overview, Invoice List, Make Payment | P0 |
| **Contracts** | Contract List, Contract Detail, Digital Signature | P1 |
| **Profile** | Profile View, Edit, Password Change | P1 |
| **Notifications** | Notification Center, Preferences | P1 |
| **Help/Support** | Help Center, Contact Support | P2 |

### 1.3 Backend Integration

The mobile app will communicate with the existing Django REST API backend at:
- **Development**: `http://localhost:8000/api`
- **Production**: Your production API URL

Key API domains:
- `/api/users/` - Authentication & User Management
- `/api/bookingflow/public/` - Booking Flow (Public)
- `/api/client/events/` - Client Events
- `/api/payments/client/` - Client Payments
- `/api/contracts/client/` - Client Contracts
- `/api/notifications/` - Notifications
- `/api/sales/client/quotes/` - Quotes

### 1.4 Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | React Native | 0.81+ | Core framework |
| Toolchain | Expo SDK | 54 | Development & build (latest stable) |
| Language | TypeScript | 5.x | Type safety |
| Navigation | React Navigation | 7.x | Screen navigation |
| State | TanStack Query | 5.x | Server state management |
| State | Zustand | 5.x | Client state management |
| Forms | React Hook Form | 7.x | Form handling |
| Validation | Zod | 3.x | Schema validation |
| HTTP | Axios | 1.x | API calls |
| Storage | Expo SecureStore | SDK 52 | Secure token storage |
| Payments | Stripe React Native | Latest | Payment processing |
| UI | Custom Components | - | Following STYLING_GUIDE.md |

### 1.5 Development Workflow: Expo Go vs EAS Builds

> **IMPORTANT**: Understanding when to use Expo Go vs EAS Development Builds is critical for efficient development. Read this section before starting.

#### What's the Difference?

| Aspect | Expo Go | EAS Development Build |
|--------|---------|----------------------|
| **What it is** | Pre-built app from App Store/Play Store | Custom app binary compiled for your project |
| **Setup time** | Instant (download and scan QR) | 10-15 minutes per build |
| **Hot reload** | ~1 second | ~1 second (after initial build) |
| **Native modules** | Limited to Expo's built-in set | Any native module you need |
| **Best for** | Learning, prototyping, UI development | Full features, production testing |

#### When to Use Each

```
Development Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PHASE 1: Expo Go              PHASE 2: EAS Build           PHASE 3: Production
  (Weeks 1-2)                   (Weeks 3-4)                  (Final)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Project setup              ✅ Stripe payments            ✅ App Store build
  ✅ Navigation/routing         ✅ Push notifications         ✅ Security hardening
  ✅ All UI screens             ✅ SSL certificate pinning    ✅ Final testing
  ✅ Theme/styling              ✅ Root/jailbreak detection
  ✅ Forms & validation         ✅ Biometric authentication
  ✅ API integration            ✅ Secure token storage
  ✅ State management           ✅ Production API testing
  ✅ Booking flow (UI)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Fast iteration                Full native features         Ship to users
  (scan QR, instant reload)     (rebuild only for new
                                 native dependencies)
```

#### Feature Compatibility Matrix

| Feature | Expo Go | EAS Build | When You'll Need It |
|---------|:-------:|:---------:|---------------------|
| Navigation & Routing | ✅ | ✅ | Day 1 |
| UI Components | ✅ | ✅ | Day 1 |
| API Calls (Axios) | ✅ | ✅ | Day 1 |
| TanStack Query | ✅ | ✅ | Day 1 |
| Zustand State | ✅ | ✅ | Day 1 |
| React Hook Form | ✅ | ✅ | Day 1 |
| AsyncStorage | ✅ | ✅ | Week 1 |
| Expo SecureStore | ⚠️ Partial | ✅ | Week 2 (auth tokens) |
| Expo Image | ✅ | ✅ | Week 1 |
| Expo LinearGradient | ✅ | ✅ | Week 1 |
| **Stripe Payments** | ❌ | ✅ | Week 3 (Payment step) |
| **Push Notifications** | ⚠️ Limited | ✅ | Week 3 |
| **SSL Certificate Pinning** | ❌ | ✅ | Week 4 (Security) |
| **Root/Jailbreak Detection** | ❌ | ✅ | Week 4 (Security) |
| **Biometric Auth** | ❌ | ✅ | Week 3-4 |
| WebView (Contracts) | ✅ | ✅ | Week 2 |
| Signature Capture | ⚠️ Check lib | ✅ | Week 2 |

**Legend:** ✅ Full support | ⚠️ Partial/Limited | ❌ Not available

#### Recommended Development Approach

**Phase 1: Start with Expo Go (Weeks 1-2)**

```bash
# Start development server
cd /Users/user/Desktop/lifeplace-app/mobile-app
npx expo start

# Scan QR code with Expo Go app on your phone
# Changes reload in ~1 second
```

Build these features first:
1. All navigation structure (`app/` directory)
2. All UI screens and components
3. Theme system and styling
4. Form validation
5. API integration layer
6. Authentication flow (UI only, mock secure storage)
7. Booking flow (all steps except payment)
8. Event list and detail screens
9. Profile screens

**Phase 2: Transition to EAS Build (Week 3)**

Switch to EAS when you need to implement:
- Stripe payment processing
- Push notifications
- Secure token storage (production-ready)
- Any feature marked ❌ in the table above

```bash
# One-time setup
npm install -g eas-cli
eas login
eas build:configure

# Create development builds (10-15 min each)
eas build --profile development --platform ios
eas build --profile development --platform android

# After build completes, install on device, then:
npx expo start --dev-client
```

**Phase 3: Security & Production (Week 4+)**

With EAS builds, implement:
- SSL certificate pinning
- Root/jailbreak detection
- Biometric authentication
- Production API endpoints
- Final security hardening

#### Handling Features That Require EAS

For features that won't work in Expo Go, use conditional checks to prevent crashes:

```typescript
// src/utils/platform.ts
import Constants from 'expo-constants';

/**
 * Returns true if running in a custom development build (EAS) or production.
 * Returns false if running in Expo Go.
 */
export const isNativeBuild = (): boolean => {
  return Constants.appOwnership !== 'expo';
};

/**
 * Returns true if running in Expo Go (limited native module support).
 */
export const isExpoGo = (): boolean => {
  return Constants.appOwnership === 'expo';
};
```

```typescript
// src/utils/security.ts
import { isExpoGo } from './platform';

export const initializeSecurity = async (): Promise<void> => {
  if (isExpoGo()) {
    console.warn('⚠️ Security features disabled in Expo Go. Use EAS build for full security.');
    return;
  }

  // These will only run in EAS builds
  await initSSLPinning();
  await initRootDetection();
  await initBiometrics();
};
```

```typescript
// src/hooks/usePayment.ts
import { isExpoGo } from '@/utils/platform';

export const usePayment = () => {
  // Mock implementation for Expo Go development
  if (isExpoGo()) {
    return {
      initPaymentSheet: async () => {
        console.log('💳 [MOCK] Payment sheet would open here');
        return { error: null };
      },
      presentPaymentSheet: async () => {
        console.log('💳 [MOCK] Payment confirmed');
        return { error: null };
      },
      loading: false,
    };
  }

  // Real Stripe implementation for EAS builds
  return useStripePayment();
};
```

#### Quick Reference: Development Commands

```bash
# ─────────────────────────────────────────────────────────
# EXPO GO DEVELOPMENT (Phase 1)
# ─────────────────────────────────────────────────────────
npx expo start                    # Start dev server
npx expo start --clear            # Start with cache cleared
npx expo start --ios              # Open in iOS Simulator
npx expo start --android          # Open in Android Emulator

# ─────────────────────────────────────────────────────────
# EAS BUILD SETUP (One-time, Phase 2)
# ─────────────────────────────────────────────────────────
npm install -g eas-cli            # Install EAS CLI
eas login                         # Login to Expo account
eas build:configure               # Create eas.json config

# ─────────────────────────────────────────────────────────
# EAS DEVELOPMENT BUILDS
# ─────────────────────────────────────────────────────────
eas build --profile development --platform ios      # Build iOS (~15 min)
eas build --profile development --platform android  # Build Android (~10 min)
eas build --profile development --platform all      # Build both

# ─────────────────────────────────────────────────────────
# EAS BUILD DEVELOPMENT (Phase 2+)
# ─────────────────────────────────────────────────────────
npx expo start --dev-client       # Start dev server for EAS builds

# ─────────────────────────────────────────────────────────
# PRODUCTION BUILDS (Phase 3)
# ─────────────────────────────────────────────────────────
eas build --profile production --platform ios       # App Store build
eas build --profile production --platform android   # Play Store build
eas submit --platform ios                           # Submit to App Store
eas submit --platform android                       # Submit to Play Store
```

#### When to Rebuild EAS Builds

You only need to rebuild when:
- ✅ Adding a NEW native dependency (e.g., `npx expo install expo-camera`)
- ✅ Updating native configuration in `app.json`
- ✅ Changing iOS/Android specific settings
- ✅ Updating Expo SDK version

You do NOT need to rebuild for:
- ❌ JavaScript/TypeScript code changes (hot reload works)
- ❌ Adding pure JavaScript packages
- ❌ Styling changes
- ❌ API endpoint changes

---

## 2. Environment Setup (macOS)

This section covers setting up a complete React Native development environment on macOS from scratch.

### 2.1 Prerequisites Check

Open Terminal and check if you have any existing installations:

```bash
# Check for Node.js
node --version

# Check for npm
npm --version

# Check for Homebrew
brew --version

# Check for Xcode
xcode-select -p

# Check for Watchman
watchman --version
```

### 2.2 Install Homebrew (Package Manager)

If you don't have Homebrew installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After installation, follow the instructions to add Homebrew to your PATH:

```bash
# For Apple Silicon Macs (M1/M2/M3)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc

# For Intel Macs
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

Verify installation:
```bash
brew --version
# Should output: Homebrew 4.x.x
```

### 2.3 Install Node.js

React Native requires Node.js 18 LTS or newer. We recommend Node.js 20 LTS:

```bash
# Install Node.js 20 LTS via Homebrew
brew install node@20

# Add to PATH (if not automatically added)
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
node --version
# Should output: v20.x.x

npm --version
# Should output: 10.x.x
```

**Alternative: Using nvm (Node Version Manager)**

If you work with multiple Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version
```

### 2.4 Install Watchman

Watchman is a file watching service used by React Native for hot reloading:

```bash
brew install watchman

# Verify installation
watchman --version
# Should output: 2024.xx.xx.xx
```

### 2.5 Install Xcode (for iOS Development)

1. **Download Xcode from the App Store**:
   - Open the App Store on your Mac
   - Search for "Xcode"
   - Click "Get" to download (this is a large download, ~12GB)
   - Wait for installation to complete

2. **Install Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```

   Click "Install" in the popup dialog.

3. **Accept Xcode License**:
   ```bash
   sudo xcodebuild -license accept
   ```

4. **Configure Xcode**:
   - Open Xcode
   - Go to **Xcode → Settings → Locations**
   - Ensure "Command Line Tools" shows your Xcode version
   - Go to **Xcode → Settings → Components**
   - Install iOS 17 or 18 Simulator

5. **Verify Installation**:
   ```bash
   xcode-select -p
   # Should output: /Applications/Xcode.app/Contents/Developer

   # Check iOS Simulator
   xcrun simctl list devices
   # Should list available iOS simulators
   ```

### 2.6 Install CocoaPods (iOS Dependency Manager)

CocoaPods manages iOS native dependencies:

```bash
# Install CocoaPods using Homebrew (recommended)
brew install cocoapods

# Verify installation
pod --version
# Should output: 1.x.x
```

**Alternative: Using RubyGems**
```bash
sudo gem install cocoapods
```

### 2.7 Install Android Studio (for Android Development)

1. **Download Android Studio**:
   - Visit: https://developer.android.com/studio
   - Download the macOS version (Apple Silicon or Intel)
   - Open the downloaded `.dmg` file
   - Drag Android Studio to Applications folder

2. **Run Android Studio Setup Wizard**:
   - Open Android Studio from Applications
   - Choose "Standard" installation
   - Wait for component downloads to complete

3. **Install Required SDK Components**:
   - Open Android Studio
   - Go to **Android Studio → Settings** (or **Preferences** on older versions)
   - Navigate to **Appearance & Behavior → System Settings → Android SDK**
   - In **SDK Platforms** tab, check:
     - Android 14.0 (API 34) or newer
   - In **SDK Tools** tab, check:
     - Android SDK Build-Tools
     - Android SDK Command-line Tools
     - Android Emulator
     - Android SDK Platform-Tools
   - Click "Apply" and accept licenses

4. **Configure Environment Variables**:

   Add these to your `~/.zshrc`:

   ```bash
   # Open zshrc in a text editor
   nano ~/.zshrc

   # Add these lines at the end:
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin

   # Save and exit (Ctrl+X, Y, Enter)

   # Reload configuration
   source ~/.zshrc
   ```

5. **Verify Android Installation**:
   ```bash
   adb --version
   # Should output: Android Debug Bridge version 1.0.xx

   echo $ANDROID_HOME
   # Should output: /Users/YOUR_USERNAME/Library/Android/sdk
   ```

6. **Create an Android Emulator**:
   - Open Android Studio
   - Go to **Tools → Device Manager**
   - Click "Create Device"
   - Select a phone (e.g., "Pixel 7")
   - Select a system image (e.g., "API 34")
   - Complete the wizard
   - Click the play button to start the emulator

### 2.8 Install Expo CLI

Expo CLI is the command-line interface for Expo projects:

```bash
# Install EAS CLI for building and submitting (recommended)
npm install -g eas-cli

# Note: expo-cli is deprecated. Use npx expo instead:
# npx expo <command>

# Verify installations
npx expo --version
eas --version
```

> **Important (December 2025)**: As of Expo SDK 54, the New Architecture is enabled by default for all new projects. This provides better performance through:
> - Synchronous native module calls (no bridge)
> - Concurrent rendering with React 19
> - Improved memory management
>
> Over 75% of Expo projects are now using the New Architecture. See [Expo New Architecture docs](https://docs.expo.dev/guides/new-architecture/) for details.

### 2.9 Install Expo Go on Your Device (Optional)

For testing on a physical device:

- **iOS**: Download "Expo Go" from the App Store
- **Android**: Download "Expo Go" from Google Play Store

### 2.10 Verify Complete Setup

Run this verification script:

```bash
echo "=== Environment Verification ==="
echo ""
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Watchman: $(watchman --version 2>/dev/null || echo 'Not installed')"
echo "Xcode: $(xcodebuild -version 2>/dev/null | head -1 || echo 'Not installed')"
echo "CocoaPods: $(pod --version 2>/dev/null || echo 'Not installed')"
echo "Android SDK: ${ANDROID_HOME:-'Not configured'}"
echo "Expo CLI: $(expo --version 2>/dev/null || echo 'Not installed')"
echo "EAS CLI: $(eas --version 2>/dev/null || echo 'Not installed')"
echo ""
echo "=== Verification Complete ==="
```

Expected output (versions may vary):
```
=== Environment Verification ===

Node.js: v20.x.x
npm: 10.x.x
Watchman: 2024.xx.xx.xx
Xcode: Xcode 15.x
CocoaPods: 1.x.x
Android SDK: /Users/YOUR_USERNAME/Library/Android/sdk
Expo CLI: x.x.x
EAS CLI: x.x.x

=== Verification Complete ===
```

---

## 3. Project Initialization

### 3.1 Create New Expo Project

Navigate to the mobile-app directory and initialize the project:

```bash
# Navigate to the mobile-app directory
cd /Users/stephendeslate/Desktop/lifeplace-app/mobile-app

# Create a new Expo project with the latest template (SDK 54)
# Since we already have some files, we'll initialize in place
npx create-expo-app@latest . --template blank-typescript

# Note: As of December 2025, this will use Expo SDK 54 with React Native 0.81
```

When prompted:
- **Overwrite existing files?**: Choose carefully - backup `STYLING_GUIDE.md`, `src/theme/`, and any other existing files first

**If you have existing files, use this approach instead:**

```bash
# Create project in a temporary directory
cd /Users/stephendeslate/Desktop/lifeplace-app
npx create-expo-app@latest mobile-app-temp --template blank-typescript

# Then manually merge the files
```

### 3.2 Project Configuration

#### 3.2.1 Update app.json

Edit `app.json` with LifePlace configuration:

```json
{
  "expo": {
    "name": "LifePlace",
    "slug": "lifeplace",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAF9F7"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.lifeplace.app",
      "infoPlist": {
        "NSCameraUsageDescription": "LifePlace needs camera access to upload photos for your event.",
        "NSPhotoLibraryUsageDescription": "LifePlace needs photo library access to upload photos for your event."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FAF9F7"
      },
      "package": "com.lifeplace.app",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#FAF9F7",
          "image": "./assets/splash.png",
          "imageWidth": 200
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "scheme": "lifeplace",
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

#### 3.2.2 Update tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@hooks/*": ["src/hooks/*"],
      "@apis/*": ["src/apis/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@theme/*": ["src/theme/*"],
      "@contexts/*": ["src/contexts/*"],
      "@navigation/*": ["src/navigation/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

#### 3.2.3 Create babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@hooks': './src/hooks',
            '@apis': './src/apis',
            '@types': './src/types',
            '@utils': './src/utils',
            '@theme': './src/theme',
            '@contexts': './src/contexts',
            '@navigation': './src/navigation',
          },
        },
      ],
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
```

### 3.3 Install Dependencies

```bash
# Navigate to mobile-app directory
cd /Users/stephendeslate/Desktop/lifeplace-app/mobile-app

# Core Expo dependencies
npx expo install expo-router expo-linking expo-constants expo-status-bar expo-splash-screen expo-secure-store expo-image expo-linear-gradient expo-haptics expo-font

# Navigation (installed with expo-router but ensure these are present)
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated

# State Management & Data Fetching
npm install @tanstack/react-query axios zustand

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# UI Components
npm install react-native-svg @shopify/flash-list

# Date & Time
npm install date-fns date-fns-tz

# Payment Integration
npx expo install @stripe/stripe-react-native

# Development dependencies
npm install -D @types/react babel-plugin-module-resolver

# Icons (using Phosphor Icons as recommended in STYLING_GUIDE.md)
npm install phosphor-react-native
```

### 3.4 Verify Installation

```bash
# Start the development server
npx expo start

# Press 'i' for iOS Simulator
# Press 'a' for Android Emulator
# Scan QR code with Expo Go on physical device
```

If everything is set up correctly, you should see the default Expo app running.

---

## 4. Project Structure

### 4.1 Recommended Directory Structure

```
mobile-app/
├── app/                          # Expo Router file-based routing
│   ├── (auth)/                   # Authentication routes (unauthenticated)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── accept-invitation/[id].tsx
│   ├── (tabs)/                   # Main tab navigation (authenticated)
│   │   ├── index.tsx             # Home/Explore
│   │   ├── events.tsx            # My Events
│   │   ├── favorites.tsx         # Saved Venues/Packages
│   │   └── profile.tsx           # Profile
│   ├── booking/                  # Booking flow
│   │   ├── [flowId]/
│   │   │   ├── index.tsx         # Start booking
│   │   │   └── [stepIndex].tsx   # Dynamic step rendering
│   │   └── complete.tsx          # Booking confirmation
│   ├── events/                   # Event details
│   │   └── [id]/
│   │       ├── index.tsx         # Event detail
│   │       ├── timeline.tsx
│   │       └── payments.tsx
│   ├── venues/                   # Venue details
│   │   └── [id].tsx
│   ├── packages/                 # Package details
│   │   └── [id].tsx
│   ├── payments/                 # Payment screens
│   │   ├── index.tsx             # Payment overview
│   │   ├── [invoiceId].tsx       # Pay invoice
│   │   └── methods.tsx           # Payment methods
│   ├── contracts/                # Contract screens
│   │   ├── index.tsx             # Contract list
│   │   └── [id].tsx              # Contract detail/sign
│   ├── notifications.tsx         # Notification center
│   ├── help.tsx                  # Help center
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx            # 404 page
├── src/
│   ├── apis/                     # API integration
│   │   ├── index.ts              # API client setup
│   │   ├── auth.api.ts
│   │   ├── booking/
│   │   │   ├── core.api.ts
│   │   │   ├── venues.api.ts
│   │   │   ├── products.api.ts
│   │   │   └── ...
│   │   ├── events.api.ts
│   │   ├── payments.api.ts
│   │   ├── contracts.api.ts
│   │   └── notifications.api.ts
│   ├── components/               # Reusable components
│   │   ├── common/               # Generic components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ...
│   │   ├── booking/              # Booking-specific components
│   │   │   ├── steps/
│   │   │   │   ├── IntroductionStep.tsx
│   │   │   │   ├── VenueSelectionStep.tsx
│   │   │   │   ├── DateTimeStep.tsx
│   │   │   │   ├── PackageSelectionStep.tsx
│   │   │   │   ├── AddonSelectionStep.tsx
│   │   │   │   ├── QuestionnaireStep.tsx
│   │   │   │   ├── PricingSummaryStep.tsx
│   │   │   │   ├── ContactInfoStep.tsx
│   │   │   │   ├── PaymentInfoStep.tsx
│   │   │   │   └── ConfirmationStep.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── StepNavigator.tsx
│   │   │   └── SessionRecovery.tsx
│   │   ├── events/               # Event-related components
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventTimeline.tsx
│   │   │   └── EventStatusBadge.tsx
│   │   ├── payments/             # Payment components
│   │   │   ├── PaymentCard.tsx
│   │   │   ├── InvoiceCard.tsx
│   │   │   └── PaymentMethodCard.tsx
│   │   ├── venues/               # Venue components
│   │   │   ├── VenueCard.tsx
│   │   │   ├── VenueGallery.tsx
│   │   │   └── VenueInfoBox.tsx
│   │   ├── packages/             # Package components
│   │   │   └── PackageCard.tsx
│   │   └── layout/               # Layout components
│   │       ├── Header.tsx
│   │       ├── BottomNav.tsx
│   │       └── SafeContainer.tsx
│   ├── contexts/                 # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── BookingContext.tsx
│   │   └── ToastContext.tsx
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useBooking.ts
│   │   ├── useEvents.ts
│   │   ├── usePayments.ts
│   │   ├── useVenues.ts
│   │   ├── usePackages.ts
│   │   ├── useContracts.ts
│   │   ├── useNotifications.ts
│   │   └── useStorage.ts
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── bookingStore.ts
│   │   └── uiStore.ts
│   ├── theme/                    # Design tokens (already exists)
│   │   ├── index.ts
│   │   ├── components.ts
│   │   └── QUICK_REFERENCE.md
│   ├── types/                    # TypeScript types
│   │   ├── auth.types.ts
│   │   ├── booking.types.ts
│   │   ├── events.types.ts
│   │   ├── payments.types.ts
│   │   ├── venues.types.ts
│   │   ├── products.types.ts
│   │   └── api.types.ts
│   └── utils/                    # Utility functions
│       ├── api.ts                # Axios instance
│       ├── storage.ts            # SecureStore wrapper
│       ├── formatting.ts         # Date, currency formatting
│       ├── validation.ts         # Form validation schemas
│       └── constants.ts          # App constants
├── assets/                       # Static assets
│   ├── fonts/
│   ├── images/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
├── STYLING_GUIDE.md              # Design specifications
├── DEVELOPMENT_GUIDE.md          # This file
├── app.json                      # Expo configuration
├── babel.config.js               # Babel configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── .env                          # Environment variables
```

### 4.2 Create Initial Files

#### 4.2.1 Environment Configuration

Create `.env` file:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:8000/api

# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Feature Flags
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=false
```

Create `.env.example` (commit this, not `.env`):

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:8000/api

# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Feature Flags
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=false
```

Add `.env` to `.gitignore`:

```gitignore
# Environment
.env
.env.local
.env.*.local
```

---

## 5. Core Dependencies

### 5.1 Full Package List

Here's the complete `package.json` dependencies section:

```json
{
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@react-navigation/bottom-tabs": "^7.2.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.2.0",
    "@shopify/flash-list": "^1.8.0",
    "@stripe/stripe-react-native": "^0.40.0",
    "@tanstack/react-query": "^5.62.0",
    "axios": "^1.7.9",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "expo": "~54.0.0",
    "expo-constants": "~17.0.0",
    "expo-font": "~13.0.0",
    "expo-haptics": "~14.0.0",
    "expo-image": "~2.0.0",
    "expo-linear-gradient": "~14.0.0",
    "expo-linking": "~7.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-status-bar": "~2.0.0",
    "phosphor-react-native": "^2.1.0",
    "react": "19.0.0",
    "react-hook-form": "^7.54.0",
    "react-native": "0.81.0",
    "react-native-gesture-handler": "~2.21.0",
    "react-native-reanimated": "~3.17.0",
    "react-native-safe-area-context": "4.14.0",
    "react-native-screens": "~4.4.0",
    "react-native-svg": "15.10.0",
    "zod": "^3.24.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@babel/core": "^7.26.0",
    "@types/react": "~19.0.0",
    "babel-plugin-module-resolver": "^5.0.2",
    "typescript": "~5.7.0"
  }
}

Note: Run `npx expo install` after adding dependencies to ensure compatible versions.
```

### 5.2 Install All Dependencies

```bash
cd /Users/stephendeslate/Desktop/lifeplace-app/mobile-app

# Install all dependencies at once
npm install @hookform/resolvers @tanstack/react-query axios date-fns date-fns-tz phosphor-react-native react-hook-form zod zustand @shopify/flash-list

npx expo install expo expo-constants expo-font expo-haptics expo-image expo-linear-gradient expo-linking expo-router expo-secure-store expo-splash-screen expo-status-bar react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens react-native-svg @stripe/stripe-react-native @react-navigation/bottom-tabs @react-navigation/native @react-navigation/native-stack

npm install -D babel-plugin-module-resolver @types/react typescript
```

---

## 6. Navigation Setup

### 6.1 Root Layout

Create `app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { colors } from '@/theme';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.neutral.cream },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen
                name="booking"
                options={{
                  presentation: 'card',
                  animation: 'slide_from_bottom',
                }}
              />
            </Stack>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

### 6.2 Tab Navigation

Create `app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { House, CalendarBlank, Heart, User } from 'phosphor-react-native';

import { colors, layout } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.neutral.white,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: layout.bottomNavHeight,
          paddingTop: 8,
          paddingBottom: 20,
          position: 'absolute',
          shadowColor: colors.primary.charcoal,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarActiveTintColor: colors.primary.charcoal,
        tabBarInactiveTintColor: colors.neutral.gray,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <House
              size={24}
              weight={focused ? 'fill' : 'regular'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'My Events',
          tabBarIcon: ({ color, focused }) => (
            <CalendarBlank
              size={24}
              weight={focused ? 'fill' : 'regular'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <Heart
              size={24}
              weight={focused ? 'fill' : 'regular'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User
              size={24}
              weight={focused ? 'fill' : 'regular'}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 6.3 Auth Layout

Create `app/(auth)/_layout.tsx`:

```typescript
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // If authenticated, redirect to home
  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.neutral.cream },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="accept-invitation/[id]" />
    </Stack>
  );
}
```

---

## 7. State Management

### 7.1 Authentication Store (Zustand)

Create `src/stores/authStore.ts`:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

import type { User } from '@/types/auth.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}

// Custom storage adapter for SecureStore
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
```

### 7.2 Booking Store

Create `src/stores/bookingStore.ts`:

```typescript
import { create } from 'zustand';

import type {
  BookingFlow,
  BookingSession,
  BookingFlowStep,
  BookingData,
} from '@/types/booking.types';

interface BookingState {
  // Flow State
  availableFlows: BookingFlow[];
  currentFlow: BookingFlow | null;
  currentSession: BookingSession | null;
  currentStep: BookingFlowStep | null;
  currentStepIndex: number;

  // Booking Data
  bookingData: BookingData;

  // UI State
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  validationErrors: Record<string, string>;

  // Pricing
  totalPrice: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;

  // Actions
  setAvailableFlows: (flows: BookingFlow[]) => void;
  setCurrentFlow: (flow: BookingFlow | null) => void;
  setCurrentSession: (session: BookingSession | null) => void;
  setCurrentStep: (step: BookingFlowStep | null, index: number) => void;
  updateBookingData: (data: Partial<BookingData>) => void;
  setError: (error: string | null) => void;
  setValidationErrors: (errors: Record<string, string>) => void;
  setLoading: (isLoading: boolean) => void;
  setValidating: (isValidating: boolean) => void;
  updatePricing: (pricing: {
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalPrice: number;
  }) => void;
  resetBooking: () => void;
}

const initialBookingData: BookingData = {
  selectedVenues: [],
  selectedPackages: [],
  selectedAddons: [],
  eventDate: null,
  endDate: null,
  duration: null,
  numParticipants: null,
  contactInfo: null,
  questionnaireResponses: {},
};

export const useBookingStore = create<BookingState>((set) => ({
  // Initial state
  availableFlows: [],
  currentFlow: null,
  currentSession: null,
  currentStep: null,
  currentStepIndex: 0,
  bookingData: initialBookingData,
  isLoading: false,
  isValidating: false,
  error: null,
  validationErrors: {},
  totalPrice: 0,
  subtotal: 0,
  taxAmount: 0,
  discountAmount: 0,

  // Actions
  setAvailableFlows: (flows) => set({ availableFlows: flows }),

  setCurrentFlow: (flow) => set({ currentFlow: flow }),

  setCurrentSession: (session) => set({ currentSession: session }),

  setCurrentStep: (step, index) =>
    set({ currentStep: step, currentStepIndex: index }),

  updateBookingData: (data) =>
    set((state) => ({
      bookingData: { ...state.bookingData, ...data },
    })),

  setError: (error) => set({ error }),

  setValidationErrors: (errors) => set({ validationErrors: errors }),

  setLoading: (isLoading) => set({ isLoading }),

  setValidating: (isValidating) => set({ isValidating }),

  updatePricing: (pricing) => set(pricing),

  resetBooking: () =>
    set({
      currentFlow: null,
      currentSession: null,
      currentStep: null,
      currentStepIndex: 0,
      bookingData: initialBookingData,
      isLoading: false,
      isValidating: false,
      error: null,
      validationErrors: {},
      totalPrice: 0,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
    }),
}));
```

### 7.3 React Query Setup

Create `src/utils/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys factory for type-safe query keys
export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },

  // Booking
  booking: {
    flows: ['booking', 'flows'] as const,
    flow: (id: string) => ['booking', 'flow', id] as const,
    session: (sessionId: string) => ['booking', 'session', sessionId] as const,
    availability: (flowId: string, date: string) =>
      ['booking', 'availability', flowId, date] as const,
  },

  // Events
  events: {
    all: ['events'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['events', 'list', filters] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
    timeline: (id: string) => ['events', 'timeline', id] as const,
    contracts: (id: string) => ['events', 'contracts', id] as const,
    invoices: (id: string) => ['events', 'invoices', id] as const,
  },

  // Payments
  payments: {
    overview: ['payments', 'overview'] as const,
    list: ['payments', 'list'] as const,
    invoices: ['payments', 'invoices'] as const,
    methods: ['payments', 'methods'] as const,
    plans: ['payments', 'plans'] as const,
  },

  // Contracts
  contracts: {
    all: ['contracts'] as const,
    detail: (id: string) => ['contracts', 'detail', id] as const,
  },

  // Venues
  venues: {
    all: ['venues'] as const,
    detail: (id: string) => ['venues', 'detail', id] as const,
    availability: (id: string, dates: string[]) =>
      ['venues', 'availability', id, dates] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    packages: (filters?: Record<string, unknown>) =>
      ['products', 'packages', filters] as const,
    addons: (filters?: Record<string, unknown>) =>
      ['products', 'addons', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },
} as const;
```

---

## 8. API Layer

### 8.1 Axios Instance

Create `src/utils/api.ts`:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';

import { useAuthStore } from '@/stores/authStore';

const API_URL = Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:8000/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Public endpoints that don't require authentication
// These match the backend configuration in frontend/client-portal/src/utils/api.ts
const PUBLIC_ENDPOINTS = [
  '/users/login/',
  '/users/register/',
  '/users/password-reset/',
  '/users/token/refresh/',
  '/bookingflow/public/',
  '/events/event-types/',           // Public event types
  '/events/public/availability/',   // Public availability check
  '/payments/public/',              // Public payment gateways & settings
];

const isPublicEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken && !isPublicEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();

      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const response = await axios.post(`${API_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access, refresh } = response.data;
          setTokens(access, refresh);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear auth and redirect to login
          clearAuth();
          return Promise.reject(refreshError);
        }
      } else {
        clearAuth();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

> **Note for React Native**: Unlike the web client-portal which uses CSRF tokens for unsafe methods (POST, PUT, PATCH, DELETE), React Native apps don't need CSRF protection since they don't use cookies for session management. The JWT Bearer token provides sufficient authentication.

### 8.2 API Endpoint Reference

Here's a complete reference of all backend API endpoints used by the mobile app. These endpoints have been verified against the actual Django backend.

```
Backend Base URL: /api

═══════════════════════════════════════════════════════════════════════════════
AUTHENTICATION (/api/users/)
═══════════════════════════════════════════════════════════════════════════════
├── POST   /token/                              - Get JWT tokens (SimpleJWT)
├── POST   /token/refresh/                      - Refresh JWT token
├── POST   /login/                              - Login with email/password
├── POST   /logout/                             - Logout (blacklist token)
├── POST   /logout-all/                         - Logout all devices
├── GET    /sessions/                           - Get active sessions
├── POST   /register/                           - Register new client
├── GET    /me/                                 - Get current user
├── PUT    /me/                                 - Update profile (full update)
├── PATCH  /me/                                 - Update profile (partial)
├── PATCH  /me/change-password/                 - Change password ⚠️ PATCH not POST
├── POST   /password-reset/request/             - Request password reset
├── GET    /password-reset/validate/<uuid>/     - Validate reset token
├── POST   /password-reset/confirm/<uuid>/      - Confirm password reset
└── POST   /invitations/<uuid>/accept/          - Accept client invitation

═══════════════════════════════════════════════════════════════════════════════
BOOKING FLOW (/api/bookingflow/)
═══════════════════════════════════════════════════════════════════════════════
Public Flow Endpoints (No Auth Required):
├── GET    /public/flows/                       - List available flows
├── GET    /public/flows/{id}/                  - Get flow details
├── POST   /public/flows/{id}/start_session/    - Start booking session
├── GET    /public/flows/{id}/payment_gateways/ - Get payment gateways for flow
│
Public Session Endpoints (UUID-based, No Auth Required):
├── GET    /public/flows/session/{uuid}/        - Get session by UUID
├── PATCH  /public/flows/session/{uuid}/update/ - Update session data
├── POST   /public/flows/session/{uuid}/validate/ - Validate step data
├── POST   /public/flows/session/{uuid}/complete/ - Complete booking
├── PATCH  /public/flows/session/{uuid}/go-to-step/ - Navigate to step
├── POST   /public/flows/session/{uuid}/calculate-pricing/ - Calculate price
├── POST   /public/flows/session/{uuid}/abandon/ - Abandon session
├── POST   /public/flows/session/{uuid}/send-confirmation/ - Send confirmation email
└── GET    /public/flows/questionnaires/{id}/   - Get questionnaire details

═══════════════════════════════════════════════════════════════════════════════
CLIENT EVENTS (/api/events/client/)  ⚠️ Note: Path is /events/client/ not /client/events/
═══════════════════════════════════════════════════════════════════════════════
├── GET    /events/                             - List my events
├── GET    /events/{id}/                        - Get event detail
├── GET    /events/{id}/timeline/               - Get event timeline
├── GET    /events/{id}/documents/              - Get accessible documents
├── GET    /events/{id}/documents/{file_id}/download/ - Download document
├── POST   /events/{id}/upload_file/            - Upload file to event
├── GET    /events/{id}/tasks/                  - Get visible tasks
├── PATCH  /events/{id}/tasks/{taskId}/         - Update task (client input)
├── GET    /events/{id}/notes/                  - List notes
├── POST   /events/{id}/notes/                  - Add note
├── GET    /events/{id}/feedback/               - Get feedback form
├── POST   /events/{id}/feedback/               - Submit feedback
├── PATCH  /events/{id}/feedback/{feedbackId}/  - Update feedback
├── PATCH  /events/{id}/update_preferences/     - Update event preferences
├── POST   /events/{id}/self_check_in/          - Self check-in
├── GET    /events/rebookable/                  - Get rebookable events
├── POST   /events/{id}/rebook/                 - Rebook an event
└── GET    /events/{id}/rebook_info/            - Get rebook info

═══════════════════════════════════════════════════════════════════════════════
PAYMENTS (/api/payments/)
═══════════════════════════════════════════════════════════════════════════════
Client Endpoints (Require Auth):
├── GET    /client/payments/                    - List my payments
├── GET    /client/invoices/                    - List my invoices
├── GET    /client/invoices/{id}/               - Get invoice detail
├── GET    /client/payment-plans/               - List payment plans
├── GET    /client/installments/                - List installments
├── GET    /client/payment-methods/             - List payment methods
├── POST   /client/payment-methods/             - Add payment method
├── DELETE /client/payment-methods/{id}/        - Delete payment method
└── GET    /client/refunds/                     - List refunds
│
Public Endpoints (No Auth Required):
├── GET    /public/gateways/                    - List payment gateways
└── GET    /public/settings/                    - Get payment settings

═══════════════════════════════════════════════════════════════════════════════
CONTRACTS (/api/contracts/)
═══════════════════════════════════════════════════════════════════════════════
├── GET    /client/contracts/                   - List my contracts
├── GET    /client/contracts/{id}/              - Get contract detail
├── POST   /client/contracts/{id}/sign/         - Sign contract
├── GET    /client/contracts/{id}/status/       - Get signing status
├── GET    /client/contracts/{id}/download_pdf/ - Download contract PDF
├── GET    /client/contracts/{id}/amendments/   - Get contract amendments
├── GET    /client/contracts/{id}/documents/    - Get contract documents
├── GET    /client/contracts/pending_signatures/ - Get pending signatures
├── POST   /client/signatures/                  - Create signature
└── GET    /client/signatures/my_signatures/    - List my signatures

═══════════════════════════════════════════════════════════════════════════════
QUOTES (/api/sales/)
═══════════════════════════════════════════════════════════════════════════════
├── GET    /client/quotes/                      - List my quotes
├── GET    /client/quotes/{id}/                 - Get quote detail
├── POST   /client/quotes/{id}/accept/          - Accept quote
└── POST   /client/quotes/{id}/reject/          - Reject quote

═══════════════════════════════════════════════════════════════════════════════
NOTIFICATIONS (/api/notifications/)
═══════════════════════════════════════════════════════════════════════════════
├── GET    /notifications/                      - List notifications
├── GET    /notifications/{id}/                 - Get notification (marks as read)
├── PATCH  /notifications/{id}/                 - Update notification
├── GET    /types/                              - List notification types
├── GET    /preferences/                        - Get preferences
└── POST   /preferences/                        - Update preferences

═══════════════════════════════════════════════════════════════════════════════
VIP PROGRAM (/api/vip/)
═══════════════════════════════════════════════════════════════════════════════
├── GET    /client/my-status/                   - Get my VIP status
├── GET    /client/my-benefits/                 - Get my benefits
├── GET    /client/my-points/                   - Get my points history
├── GET    /client/redeemable-benefits/         - Get redeemable benefits
└── POST   /client/redeem-benefit/              - Redeem a benefit

═══════════════════════════════════════════════════════════════════════════════
MESSAGING (/api/messaging/)
═══════════════════════════════════════════════════════════════════════════════
├── GET    /threads/                            - List message threads
├── POST   /threads/                            - Create new thread
├── GET    /threads/{id}/                       - Get thread detail
├── GET    /messages/                           - List messages
└── POST   /messages/                           - Send message

═══════════════════════════════════════════════════════════════════════════════
PUBLIC ENDPOINTS (No Authentication Required)
═══════════════════════════════════════════════════════════════════════════════
├── GET    /events/event-types/                 - List event types
├── POST   /events/availability/check/          - Check date availability
├── POST   /events/availability/range/          - Check date range
├── GET    /events/availability/next/           - Get next available date
├── GET    /venues/public/                      - List public venues
├── GET    /vendors/public/vendors/             - List public vendors
├── GET    /payments/public/gateways/           - List payment gateways
├── GET    /payments/public/settings/           - Get payment settings
└── GET    /settings/public/legal/{type}/       - Get legal documents (privacy, terms)
```

### 8.2.1 Important API Notes

1. **Event Client Endpoints**: The correct path is `/api/events/client/events/` not `/api/client/events/`. The backend uses nested routing under the events domain.

2. **Change Password**: Uses `PATCH` method, not `POST`. The endpoint is `/api/users/me/change-password/`.

3. **Token Refresh**: May return a new refresh token (token rotation enabled). Always store both tokens from the response.

4. **Booking Sessions**: Use UUID-based URLs for public session operations. The session UUID is returned when starting a session.

5. **File Uploads**: Use `multipart/form-data` content type for file upload endpoints.

6. **Pagination**: List endpoints return paginated responses with `count`, `next`, `previous`, and `results` fields.

### 8.3 Auth API

Create `src/apis/auth.api.ts`:

```typescript
import api from '@/utils/api';
import type {
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  User,
  PasswordResetRequest,
  PasswordResetConfirm,
} from '@/types/auth.types';

export const AuthAPI = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/login/', credentials);
    return response.data;
  },

  /**
   * Register a new client account
   */
  register: async (data: RegisterCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/register/', data);
    return response.data;
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/users/me/');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<User>('/users/me/', data);
    return response.data;
  },

  /**
   * Change password (requires confirm_password)
   */
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/users/me/change-password/', data);
    return response.data;
  },

  /**
   * Request password reset - sends email with reset token
   */
  requestPasswordReset: async (email: string): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/users/password-reset/request/', { email });
    return response.data;
  },

  /**
   * Validate password reset token before showing reset form
   */
  validateResetToken: async (tokenId: string): Promise<{
    valid: boolean;
    email?: string;
    reason?: 'already_used' | 'expired' | 'not_found';
  }> => {
    const response = await api.get(`/users/password-reset/validate/${tokenId}/`);
    return response.data;
  },

  /**
   * Confirm password reset with new password
   */
  confirmPasswordReset: async (tokenId: string, data: {
    password: string;
    confirm_password: string;
  }): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>(
      `/users/password-reset/confirm/${tokenId}/`,
      data
    );
    return response.data;
  },

  /**
   * Refresh access token (may return new refresh token with rotation)
   */
  refreshToken: async (refreshToken: string): Promise<{ access: string; refresh?: string }> => {
    const response = await api.post('/users/token/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  /**
   * Accept client invitation
   */
  acceptInvitation: async (
    invitationId: string,
    data: { password: string }
  ): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>(
      `/clients/invitations/${invitationId}/accept/`,
      data
    );
    return response.data;
  },
};
```

### 8.3 Booking API

Create `src/apis/booking/core.api.ts`:

```typescript
import api from '@/utils/api';
import type {
  BookingFlow,
  BookingSession,
  StartSessionResponse,
  UpdateSessionRequest,
  CompleteSessionRequest,
  ValidateStepRequest,
  ValidateStepResponse,
} from '@/types/booking.types';

export const BookingCoreAPI = {
  /**
   * Get all available booking flows (public)
   * @param eventTypeId - Optional filter by event type
   */
  getAvailableFlows: async (eventTypeId?: number): Promise<BookingFlow[]> => {
    const params = eventTypeId ? { event_type: eventTypeId } : {};
    const response = await api.get<BookingFlow[]>('/bookingflow/public/flows/', { params });
    return response.data;
  },

  /**
   * Get a specific booking flow by ID (public)
   */
  getFlowById: async (flowId: number): Promise<BookingFlow> => {
    const response = await api.get<BookingFlow>(
      `/bookingflow/public/flows/${flowId}/`
    );
    return response.data;
  },

  /**
   * Start a new booking session
   */
  startSession: async (
    flowId: number,
    sessionData?: { ip_address?: string; user_agent?: string; referrer_url?: string }
  ): Promise<StartSessionResponse> => {
    const response = await api.post<StartSessionResponse>(
      `/bookingflow/public/flows/${flowId}/start_session/`,
      { booking_flow: flowId, ...sessionData }
    );
    return response.data;
  },

  /**
   * Get session by UUID
   */
  getSession: async (sessionId: string): Promise<BookingSession> => {
    const response = await api.get<BookingSession>(
      `/bookingflow/public/flows/session/${sessionId}/`
    );
    return response.data;
  },

  /**
   * Update session data for a step
   * Uses PATCH method, not PUT
   */
  updateSessionData: async (
    sessionId: string,
    stepId: number,
    data: Record<string, unknown>,
    markCompleted: boolean = false
  ): Promise<BookingSession> => {
    const payload = {
      step_id: stepId,
      step_data: data,
      mark_completed: markCompleted,
    };
    const response = await api.patch<BookingSession>(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      payload
    );
    return response.data;
  },

  /**
   * Validate step data without saving
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: Record<string, unknown>
  ): Promise<ValidateStepResponse> => {
    const response = await api.post<ValidateStepResponse>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      { step_id: stepId, step_data: stepData }
    );
    return response.data;
  },

  /**
   * Complete booking session
   * @param completionType - 'payment' for immediate payment, 'quote' for quote request
   */
  completeBooking: async (
    sessionId: string,
    completionType: 'payment' | 'quote' = 'payment'
  ): Promise<BookingCompletionResult> => {
    const response = await api.post<BookingCompletionResult>(
      `/bookingflow/public/flows/session/${sessionId}/complete/`,
      { completion_type: completionType }
    );
    return response.data;
  },

  /**
   * Navigate to a specific step
   */
  goToStep: async (sessionId: string, stepId: number): Promise<BookingSession> => {
    const response = await api.patch<BookingSession>(
      `/bookingflow/public/flows/session/${sessionId}/go-to-step/`,
      { step_id: stepId }
    );
    return response.data;
  },

  /**
   * Calculate pricing for current session state
   */
  calculatePricing: async (
    sessionId: string,
    discountCode?: string,
    venueAdditionalHours?: Record<string, number>
  ): Promise<PricingCalculation> => {
    const data: Record<string, unknown> = {};
    if (discountCode) data.discount_code = discountCode;
    if (venueAdditionalHours) data.venue_additional_hours = venueAdditionalHours;

    const response = await api.post<PricingCalculation>(
      `/bookingflow/public/flows/session/${sessionId}/calculate-pricing/`,
      data
    );
    return response.data;
  },

  /**
   * Get available payment gateways for a flow
   */
  getFlowPaymentGateways: async (flowId: number): Promise<PaymentGatewayResponse> => {
    const response = await api.get<PaymentGatewayResponse>(
      `/bookingflow/public/flows/${flowId}/payment_gateways/`
    );
    return response.data;
  },

  /**
   * Abandon a booking session
   */
  abandonSession: async (sessionId: string, reason?: string): Promise<void> => {
    await api.post(`/bookingflow/public/flows/session/${sessionId}/abandon/`,
      reason ? { reason } : {}
    );
  },
};
```

### 8.4 Events API

Create `src/apis/events.api.ts`:

```typescript
import api from '@/utils/api';
import type {
  Event,
  EventDetail,
  EventTimeline,
  EventFeedback,
  EventFeedbackSubmit,
} from '@/types/events.types';
import type { PaginatedResponse } from '@/types/api.types';

export const EventsAPI = {
  /**
   * Get client's events with optional filters
   */
  getEvents: async (filters?: {
    status?: string;
    upcoming_only?: boolean;
  }): Promise<Event[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.upcoming_only) params.append('upcoming_only', 'true');

    const response = await api.get(`/client/events/?${params.toString()}`);
    // Handle both paginated and non-paginated responses
    return response.data.results || response.data;
  },

  /**
   * Get single event details
   */
  getEvent: async (eventId: number): Promise<EventDetail> => {
    const response = await api.get<EventDetail>(`/client/events/${eventId}/`);
    return response.data;
  },

  /**
   * Get event timeline (activity log)
   */
  getEventTimeline: async (eventId: number): Promise<EventTimeline[]> => {
    const response = await api.get<EventTimeline[]>(
      `/client/events/${eventId}/timeline/`
    );
    return response.data;
  },

  /**
   * Get accessible documents for an event
   */
  getEventDocuments: async (eventId: number): Promise<EventFile[]> => {
    const response = await api.get<EventFile[]>(
      `/client/events/${eventId}/documents/`
    );
    return response.data;
  },

  /**
   * Get event tasks
   */
  getEventTasks: async (eventId: number): Promise<EventTask[]> => {
    const response = await api.get<EventTask[]>(
      `/client/events/${eventId}/tasks/`
    );
    return response.data;
  },

  /**
   * Update event task
   */
  updateEventTask: async (
    eventId: number,
    taskId: number,
    data: TaskUpdate
  ): Promise<EventTask> => {
    const response = await api.patch<EventTask>(
      `/client/events/${eventId}/tasks/${taskId}/`,
      data
    );
    return response.data;
  },

  /**
   * Get event feedback
   */
  getEventFeedback: async (eventId: number): Promise<EventFeedback> => {
    const response = await api.get<EventFeedback>(
      `/client/events/${eventId}/feedback/`
    );
    return response.data;
  },

  /**
   * Submit event feedback
   */
  submitEventFeedback: async (
    eventId: number,
    data: FeedbackSubmission
  ): Promise<EventFeedback> => {
    const response = await api.post<EventFeedback>(
      `/client/events/${eventId}/feedback/`,
      data
    );
    return response.data;
  },

  /**
   * Self check-in on event day
   */
  selfCheckIn: async (eventId: number): Promise<EventDetail> => {
    const response = await api.post<EventDetail>(
      `/client/events/${eventId}/self_check_in/`
    );
    return response.data;
  },

  /**
   * Get public event availability for booking flow calendars
   */
  getPublicEventAvailability: async (params: {
    start_date: string;
    end_date: string;
    event_type_id?: number;
  }): Promise<{
    start_date: string;
    end_date: string;
    event_count: number;
    events: Array<{
      id: number;
      name: string;
      status: string;
      start_date: string;
      end_date: string | null;
    }>;
  }> => {
    const queryParams = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
    });
    if (params.event_type_id) {
      queryParams.append('event_type_id', params.event_type_id.toString());
    }
    const response = await api.get(
      `/events/public/availability/?${queryParams.toString()}`
    );
    return response.data;
  },
};
```

### 8.5 Payments API

Create `src/apis/payments.api.ts`:

```typescript
import api from '@/utils/api';
import type {
  PaymentOverview,
  Payment,
  Invoice,
  PaymentMethod,
  PaymentPlan,
  MakePaymentRequest,
  MakePaymentResponse,
} from '@/types/payments.types';
import type { PaginatedResponse } from '@/types/api.types';

export const PaymentsAPI = {
  /**
   * Get client payments list
   * Endpoint: GET /api/payments/client/payments/
   */
  getPayments: async (params?: {
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<Payment>> => {
    const response = await api.get<PaginatedResponse<Payment>>(
      '/payments/client/payments/',
      { params }
    );
    return response.data;
  },

  /**
   * Get client invoices list
   * Endpoint: GET /api/payments/client/invoices/
   */
  getInvoices: async (params?: {
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<Invoice>> => {
    const response = await api.get<PaginatedResponse<Invoice>>(
      '/payments/client/invoices/',
      { params }
    );
    return response.data;
  },

  /**
   * Get invoice detail
   * Endpoint: GET /api/payments/client/invoices/{id}/
   */
  getInvoiceDetail: async (invoiceId: number): Promise<Invoice> => {
    const response = await api.get<Invoice>(
      `/payments/client/invoices/${invoiceId}/`
    );
    return response.data;
  },

  /**
   * Get client payment methods
   * Endpoint: GET /api/payments/client/payment-methods/
   */
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await api.get<PaymentMethod[]>(
      '/payments/client/payment-methods/'
    );
    return response.data;
  },

  /**
   * Add payment method
   * Endpoint: POST /api/payments/client/payment-methods/
   */
  addPaymentMethod: async (data: {
    stripe_payment_method_id: string;
  }): Promise<PaymentMethod> => {
    const response = await api.post<PaymentMethod>(
      '/payments/client/payment-methods/',
      data
    );
    return response.data;
  },

  /**
   * Delete payment method
   * Endpoint: DELETE /api/payments/client/payment-methods/{id}/
   */
  deletePaymentMethod: async (methodId: number): Promise<void> => {
    await api.delete(`/payments/client/payment-methods/${methodId}/`);
  },

  /**
   * Get client payment plans
   * Endpoint: GET /api/payments/client/payment-plans/
   */
  getPaymentPlans: async (): Promise<PaymentPlan[]> => {
    const response = await api.get<PaymentPlan[]>(
      '/payments/client/payment-plans/'
    );
    return response.data;
  },

  /**
   * Get client installments
   * Endpoint: GET /api/payments/client/installments/
   */
  getInstallments: async (): Promise<PaymentInstallment[]> => {
    const response = await api.get<PaymentInstallment[]>(
      '/payments/client/installments/'
    );
    return response.data;
  },

  /**
   * Get client refunds
   * Endpoint: GET /api/payments/client/refunds/
   */
  getRefunds: async (): Promise<Refund[]> => {
    const response = await api.get<Refund[]>('/payments/client/refunds/');
    return response.data;
  },

  /**
   * Get public payment gateways (no auth required)
   * Endpoint: GET /api/payments/public/gateways/
   */
  getPublicGateways: async (): Promise<PaymentGateway[]> => {
    const response = await api.get<PaymentGateway[]>(
      '/payments/public/gateways/'
    );
    return response.data;
  },

  /**
   * Get public payment settings (no auth required)
   * Endpoint: GET /api/payments/public/settings/
   */
  getPublicSettings: async (): Promise<PaymentSettings> => {
    const response = await api.get<PaymentSettings>(
      '/payments/public/settings/'
    );
    return response.data;
  },
};
```

---

## 9. Authentication System

### 9.1 Auth Context

Create `src/contexts/AuthContext.tsx`:

```typescript
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter, useSegments } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';
import { AuthAPI } from '@/apis/auth.api';
import type { LoginCredentials, RegisterCredentials, User } from '@/types/auth.types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();

  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    setUser,
    setTokens,
    clearAuth,
    setLoading,
  } = useAuthStore();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (accessToken) {
        try {
          const currentUser = await AuthAPI.getMe();
          setUser(currentUser);
        } catch (error) {
          // Token invalid, clear auth
          clearAuth();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated, redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated, redirect to home
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await AuthAPI.login(credentials);
    setTokens(response.access, response.refresh);
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: RegisterCredentials) => {
    const response = await AuthAPI.register(data);
    setTokens(response.access, response.refresh);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await AuthAPI.logout(refreshToken);
      }
    } catch (error) {
      // Ignore errors during logout
    } finally {
      clearAuth();
      router.replace('/(auth)/login');
    }
  }, [refreshToken]);

  const updateUser = useCallback((data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 9.2 useAuth Hook

Create `src/hooks/useAuth.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AuthAPI } from '@/apis/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/utils/queryClient';
import type {
  LoginCredentials,
  RegisterCredentials,
  PasswordResetRequest,
  PasswordResetConfirm,
} from '@/types/auth.types';

export function useAuth() {
  return useAuthStore();
}

export function useLogin() {
  const { setTokens, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => AuthAPI.login(credentials),
    onSuccess: (data) => {
      setTokens(data.access, data.refresh);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

export function useRegister() {
  const { setTokens, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterCredentials) => AuthAPI.register(data),
    onSuccess: (data) => {
      setTokens(data.access, data.refresh);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

export function useLogout() {
  const { refreshToken, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (refreshToken) {
        return AuthAPI.logout(refreshToken);
      }
      return Promise.resolve();
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  const { accessToken, setUser } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const user = await AuthAPI.getMe();
      setUser(user);
      return user;
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateProfile() {
  const { setUser, user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AuthAPI.updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(queryKeys.auth.user, updatedUser);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      AuthAPI.changePassword(data),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (data: PasswordResetRequest) => AuthAPI.requestPasswordReset(data),
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (data: PasswordResetConfirm) => AuthAPI.confirmPasswordReset(data),
  });
}

export function useAcceptInvitation() {
  const { setTokens, setUser } = useAuthStore();

  return useMutation({
    mutationFn: ({
      invitationId,
      password,
    }: {
      invitationId: string;
      password: string;
    }) => AuthAPI.acceptInvitation(invitationId, { password }),
    onSuccess: (data) => {
      setTokens(data.access, data.refresh);
      setUser(data.user);
    },
  });
}
```

---

## 10. Screen Implementation

### 10.1 Login Screen

Create `app/(auth)/login.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeSlash, Envelope, Lock } from 'phosphor-react-native';

import { useLogin } from '@/hooks/useAuth';
import { colors, spacing, typeScale } from '@/theme';
import { componentStyles } from '@/theme/components';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember_me: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: login, isPending, error } = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember_me: true,
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data, {
      onSuccess: () => {
        router.replace('/(tabs)');
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.neutral.cream }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo & Welcome */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xxxl }}>
          {/* Add your logo here */}
          <Text
            style={{
              ...typeScale.displayMedium,
              color: colors.primary.charcoal,
              marginBottom: spacing.xs,
            }}
          >
            Welcome Back
          </Text>
          <Text
            style={{
              ...typeScale.bodyMedium,
              color: colors.neutral.darkGray,
            }}
          >
            Sign in to continue to LifePlace
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: colors.semantic.error + '10',
              padding: spacing.md,
              borderRadius: 12,
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{
                ...typeScale.bodySmall,
                color: colors.semantic.error,
                textAlign: 'center',
              }}
            >
              {(error as Error).message || 'Invalid email or password'}
            </Text>
          </View>
        )}

        {/* Email Input */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              ...typeScale.labelSmall,
              color: colors.neutral.gray,
              marginBottom: spacing.xs,
            }}
          >
            Email
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View
                style={[
                  componentStyles.input.container,
                  errors.email && { borderColor: colors.semantic.error },
                ]}
              >
                <Envelope
                  size={20}
                  color={colors.neutral.gray}
                  style={{ marginRight: spacing.sm }}
                />
                <TextInput
                  style={[componentStyles.input.input, { flex: 1 }]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.neutral.gray}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.email && (
            <Text
              style={{
                ...typeScale.labelSmall,
                color: colors.semantic.error,
                marginTop: spacing.xxs,
              }}
            >
              {errors.email.message}
            </Text>
          )}
        </View>

        {/* Password Input */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              ...typeScale.labelSmall,
              color: colors.neutral.gray,
              marginBottom: spacing.xs,
            }}
          >
            Password
          </Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View
                style={[
                  componentStyles.input.container,
                  errors.password && { borderColor: colors.semantic.error },
                ]}
              >
                <Lock
                  size={20}
                  color={colors.neutral.gray}
                  style={{ marginRight: spacing.sm }}
                />
                <TextInput
                  style={[componentStyles.input.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.neutral.gray}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeSlash size={20} color={colors.neutral.gray} />
                  ) : (
                    <Eye size={20} color={colors.neutral.gray} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
          {errors.password && (
            <Text
              style={{
                ...typeScale.labelSmall,
                color: colors.semantic.error,
                marginTop: spacing.xxs,
              }}
            >
              {errors.password.message}
            </Text>
          )}
        </View>

        {/* Forgot Password */}
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                ...typeScale.labelMedium,
                color: colors.accent.lavender,
                textAlign: 'right',
              }}
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </Link>

        {/* Login Button */}
        <TouchableOpacity
          style={[
            componentStyles.button.primary.container,
            isPending && { opacity: 0.7 },
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.neutral.white} />
          ) : (
            <Text style={componentStyles.button.primary.text}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Register Link */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: spacing.xl,
          }}
        >
          <Text
            style={{
              ...typeScale.bodyMedium,
              color: colors.neutral.darkGray,
            }}
          >
            Don't have an account?{' '}
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text
                style={{
                  ...typeScale.bodyMedium,
                  color: colors.accent.lavender,
                  fontWeight: '600',
                }}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

### 10.2 Home/Explore Screen

Create `app/(tabs)/index.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { MagnifyingGlass, Bell } from 'phosphor-react-native';
import { Image } from 'expo-image';

import { useAuth } from '@/hooks/useAuth';
import { useBookingFlows } from '@/hooks/useBooking';
import { useVenues } from '@/hooks/useVenues';
import { usePackages } from '@/hooks/usePackages';
import { VenueCard } from '@/components/venues/VenueCard';
import { PackageCard } from '@/components/packages/PackageCard';
import { CategoryChip } from '@/components/common/CategoryChip';
import { colors, spacing, typeScale, layout } from '@/theme';

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: flows, isLoading: flowsLoading } = useBookingFlows();
  const { data: venues, isLoading: venuesLoading, refetch: refetchVenues } = useVenues();
  const { data: packages, isLoading: packagesLoading } = usePackages();

  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchVenues();
    setRefreshing(false);
  };

  // Extract event types from flows for category chips
  const eventTypes = React.useMemo(() => {
    if (!flows) return [];
    return [...new Set(flows.map((f) => f.event_type_name).filter(Boolean))];
  }, [flows]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: layout.bottomNavHeight + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.charcoal}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: layout.screenPaddingHorizontal,
            paddingTop: layout.statusBarHeight + spacing.md,
            paddingBottom: spacing.md,
          }}
        >
          <View>
            <Text
              style={{
                ...typeScale.headlineSmall,
                color: colors.primary.charcoal,
              }}
            >
              {getGreeting()}, {user?.first_name || 'Guest'}!
            </Text>
            <Text
              style={{
                ...typeScale.bodyMedium,
                color: colors.neutral.darkGray,
              }}
            >
              Plan Your Next Event
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.neutral.white,
              alignItems: 'center',
              justifyContent: 'center',
              ...layout.shadows.sm,
            }}
          >
            <Bell size={24} color={colors.primary.charcoal} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          onPress={() => router.push('/search')}
          style={{
            marginHorizontal: layout.screenPaddingHorizontal,
            marginBottom: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.neutral.sand,
            borderRadius: 16,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            gap: spacing.sm,
          }}
        >
          <MagnifyingGlass size={20} color={colors.neutral.gray} />
          <Text
            style={{
              ...typeScale.bodyMedium,
              color: colors.neutral.gray,
              flex: 1,
            }}
          >
            Search venues, packages...
          </Text>
        </TouchableOpacity>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: layout.screenPaddingHorizontal,
            paddingBottom: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <CategoryChip
            label="All"
            isActive={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
          />
          {eventTypes.map((type) => (
            <CategoryChip
              key={type}
              label={type}
              isActive={selectedCategory === type}
              onPress={() => setSelectedCategory(type)}
            />
          ))}
        </ScrollView>

        {/* Featured Venues */}
        <View style={{ marginBottom: spacing.xl }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: layout.screenPaddingHorizontal,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                ...typeScale.headlineSmall,
                color: colors.primary.charcoal,
              }}
            >
              Featured Venues
            </Text>
            <TouchableOpacity onPress={() => router.push('/venues')}>
              <Text
                style={{
                  ...typeScale.labelMedium,
                  color: colors.accent.lavender,
                }}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {venuesLoading ? (
            <View style={{ paddingHorizontal: layout.screenPaddingHorizontal }}>
              {/* Skeleton loader */}
              <View
                style={{
                  height: 250,
                  borderRadius: 24,
                  backgroundColor: colors.neutral.sand,
                }}
              />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: layout.screenPaddingHorizontal,
                gap: spacing.md,
              }}
            >
              {venues?.slice(0, 5).map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  variant="featured"
                  onPress={() => router.push(`/venues/${venue.id}`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Popular Packages */}
        <View style={{ marginBottom: spacing.xl }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: layout.screenPaddingHorizontal,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                ...typeScale.headlineSmall,
                color: colors.primary.charcoal,
              }}
            >
              Popular Packages
            </Text>
            <TouchableOpacity onPress={() => router.push('/packages')}>
              <Text
                style={{
                  ...typeScale.labelMedium,
                  color: colors.accent.lavender,
                }}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {packagesLoading ? (
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: layout.screenPaddingHorizontal,
                gap: spacing.md,
              }}
            >
              {[1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 200,
                    borderRadius: 16,
                    backgroundColor: colors.neutral.sand,
                  }}
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingHorizontal: layout.screenPaddingHorizontal,
                gap: spacing.md,
              }}
            >
              {packages
                ?.filter((p) => p.type === 'PACKAGE')
                .slice(0, 4)
                .map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    package={pkg}
                    style={{ width: '48%' }}
                    onPress={() => router.push(`/packages/${pkg.id}`)}
                  />
                ))}
            </View>
          )}
        </View>

        {/* Start Booking CTA */}
        <TouchableOpacity
          style={{
            marginHorizontal: layout.screenPaddingHorizontal,
            backgroundColor: colors.accent.lavender,
            borderRadius: 16,
            padding: spacing.xl,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          onPress={() => {
            // Navigate to booking flow selection or first flow
            if (flows && flows.length > 0) {
              router.push(`/booking/${flows[0].id}`);
            }
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                ...typeScale.titleLarge,
                color: colors.neutral.white,
                marginBottom: spacing.xxs,
              }}
            >
              Ready to Book?
            </Text>
            <Text
              style={{
                ...typeScale.bodyMedium,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              Start planning your perfect event
            </Text>
          </View>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24 }}>→</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
```

### 10.3 My Events Screen

Create `app/(tabs)/events.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarBlank, Plus } from 'phosphor-react-native';

import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { colors, spacing, typeScale, layout } from '@/theme';
import type { EventStatus } from '@/types/events.types';

const STATUS_FILTERS: { label: string; value: EventStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Upcoming', value: 'CONFIRMED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function EventsScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL');

  const {
    data: eventsData,
    isLoading,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useEvents({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const [refreshing, setRefreshing] = useState(false);

  const events = eventsData?.pages.flatMap((page) => page.results) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderEmptyState = () => (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: 100,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.accent.lavenderSubtle,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <CalendarBlank size={40} color={colors.accent.lavender} />
      </View>
      <Text
        style={{
          ...typeScale.titleLarge,
          color: colors.primary.charcoal,
          marginBottom: spacing.sm,
          textAlign: 'center',
        }}
      >
        No Events Yet
      </Text>
      <Text
        style={{
          ...typeScale.bodyMedium,
          color: colors.neutral.darkGray,
          textAlign: 'center',
          marginBottom: spacing.xl,
        }}
      >
        Start planning your first event by exploring our venues and packages
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: colors.primary.charcoal,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
        onPress={() => router.push('/(tabs)')}
      >
        <Plus size={20} color={colors.neutral.white} />
        <Text
          style={{
            ...typeScale.labelLarge,
            color: colors.neutral.white,
          }}
        >
          Book an Event
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingTop: layout.statusBarHeight + spacing.md,
          paddingBottom: spacing.md,
          backgroundColor: colors.neutral.cream,
        }}
      >
        <Text
          style={{
            ...typeScale.headlineLarge,
            color: colors.primary.charcoal,
          }}
        >
          My Events
        </Text>
      </View>

      {/* Status Filters */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingBottom: spacing.md,
          gap: spacing.sm,
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setStatusFilter(item.value)}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderRadius: 24,
              backgroundColor:
                statusFilter === item.value
                  ? colors.primary.charcoal
                  : colors.neutral.white,
              borderWidth: 1,
              borderColor:
                statusFilter === item.value
                  ? colors.primary.charcoal
                  : colors.neutral.warmGray,
            }}
          >
            <Text
              style={{
                ...typeScale.labelMedium,
                color:
                  statusFilter === item.value
                    ? colors.neutral.white
                    : colors.primary.charcoal,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Events List */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingBottom: layout.bottomNavHeight + spacing.xl,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.charcoal}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => router.push(`/events/${item.id}`)}
          />
        )}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing.lg }}>
              <Text
                style={{
                  ...typeScale.bodySmall,
                  color: colors.neutral.gray,
                  textAlign: 'center',
                }}
              >
                Loading more...
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
```

---

### 10.4 Dashboard Screen

The dashboard provides an overview of critical actions and event status. Create `app/(tabs)/index.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Calendar,
  CreditCard,
  FileText,
  Warning,
  CheckCircle,
  Clock,
  CaretRight,
} from 'phosphor-react-native';

import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useEvents } from '@/hooks/useEvents';
import { ActionCard } from '@/components/dashboard/ActionCard';
import { EventPreviewCard } from '@/components/events/EventPreviewCard';
import { colors, spacing, typeScale, layout } from '@/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: dashboard, isLoading, refetch } = useDashboard();
  const { data: upcomingEvents } = useEvents({ upcoming_only: true });
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Critical actions that need immediate attention
  const criticalActions = React.useMemo(() => {
    if (!dashboard) return [];

    const actions = [];

    // Pending quotes
    if (dashboard.pending_quotes?.length > 0) {
      actions.push({
        type: 'quote',
        title: 'Quotes Awaiting Response',
        count: dashboard.pending_quotes.length,
        icon: FileText,
        color: colors.accent.lavender,
        urgency: 'high',
        onPress: () => router.push('/actions?type=quote'),
      });
    }

    // Overdue payments
    if (dashboard.overdue_payments?.length > 0) {
      actions.push({
        type: 'payment',
        title: 'Overdue Payments',
        count: dashboard.overdue_payments.length,
        icon: CreditCard,
        color: colors.semantic.error,
        urgency: 'critical',
        onPress: () => router.push('/payments'),
      });
    }

    // Pending tasks
    if (dashboard.pending_tasks?.length > 0) {
      actions.push({
        type: 'task',
        title: 'Tasks Requiring Action',
        count: dashboard.pending_tasks.length,
        icon: CheckCircle,
        color: colors.secondary.sage,
        urgency: 'medium',
        onPress: () => router.push('/actions?type=task'),
      });
    }

    // Unsigned contracts
    if (dashboard.unsigned_contracts?.length > 0) {
      actions.push({
        type: 'contract',
        title: 'Contracts to Sign',
        count: dashboard.unsigned_contracts.length,
        icon: FileText,
        color: colors.accent.lavender,
        urgency: 'high',
        onPress: () => router.push('/contracts'),
      });
    }

    return actions;
  }, [dashboard]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: layout.bottomNavHeight + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.charcoal}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: layout.screenPaddingHorizontal,
            paddingTop: layout.statusBarHeight + spacing.md,
            paddingBottom: spacing.lg,
          }}
        >
          <Text style={{ ...typeScale.headlineLarge, color: colors.primary.charcoal }}>
            {getGreeting()}, {user?.first_name || 'Guest'}
          </Text>
          <Text style={{ ...typeScale.bodyMedium, color: colors.neutral.darkGray }}>
            Here's what needs your attention
          </Text>
        </View>

        {/* Critical Actions */}
        {criticalActions.length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                ...typeScale.titleMedium,
                color: colors.primary.charcoal,
                paddingHorizontal: layout.screenPaddingHorizontal,
                marginBottom: spacing.md,
              }}
            >
              Action Required
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: layout.screenPaddingHorizontal,
                gap: spacing.md,
              }}
            >
              {criticalActions.map((action, index) => (
                <ActionCard key={index} action={action} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upcoming Event */}
        {upcomingEvents?.[0] && (
          <View style={{ marginBottom: spacing.xl, paddingHorizontal: layout.screenPaddingHorizontal }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ ...typeScale.titleMedium, color: colors.primary.charcoal }}>
                Next Event
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
                <Text style={{ ...typeScale.labelMedium, color: colors.accent.lavender }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            <EventPreviewCard
              event={upcomingEvents[0]}
              onPress={() => router.push(`/events/${upcomingEvents[0].id}`)}
            />
          </View>
        )}

        {/* Financial Summary */}
        {dashboard?.financial_summary && (
          <View style={{ marginBottom: spacing.xl, paddingHorizontal: layout.screenPaddingHorizontal }}>
            <Text style={{ ...typeScale.titleMedium, color: colors.primary.charcoal, marginBottom: spacing.md }}>
              Financial Summary
            </Text>
            <View
              style={{
                backgroundColor: colors.neutral.white,
                borderRadius: 16,
                padding: spacing.lg,
                ...layout.shadows.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <View>
                  <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
                    Outstanding Balance
                  </Text>
                  <Text style={{ ...typeScale.headlineSmall, color: colors.primary.charcoal }}>
                    ₱{dashboard.financial_summary.outstanding_balance?.toLocaleString() || '0'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
                    Next Payment Due
                  </Text>
                  <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}>
                    {dashboard.financial_summary.next_payment_date || 'N/A'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary.charcoal,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => router.push('/payments')}
              >
                <Text style={{ ...typeScale.labelMedium, color: colors.neutral.white }}>
                  View Payments
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: layout.screenPaddingHorizontal }}>
          <Text style={{ ...typeScale.titleMedium, color: colors.primary.charcoal, marginBottom: spacing.md }}>
            Quick Actions
          </Text>
          <View style={{ gap: spacing.sm }}>
            {[
              { title: 'Book New Event', icon: Calendar, href: '/booking' },
              { title: 'View Documents', icon: FileText, href: '/documents' },
              { title: 'Message Support', icon: Bell, href: '/messages' },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.neutral.white,
                  padding: spacing.md,
                  borderRadius: 12,
                  ...layout.shadows.sm,
                }}
                onPress={() => router.push(item.href)}
              >
                <item.icon size={24} color={colors.accent.lavender} />
                <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal, flex: 1, marginLeft: spacing.md }}>
                  {item.title}
                </Text>
                <CaretRight size={20} color={colors.neutral.gray} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
```

### 10.5 Action Center Screen

Create `app/actions/index.tsx` for managing critical actions:

```typescript
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MagnifyingGlass,
  Funnel,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
  Warning,
} from 'phosphor-react-native';

import { useActions } from '@/hooks/useActions';
import { ActionItemCard } from '@/components/actions/ActionItemCard';
import { FilterModal } from '@/components/common/FilterModal';
import { colors, spacing, typeScale, layout } from '@/theme';

type ActionType = 'all' | 'quote' | 'contract' | 'payment' | 'task';
type UrgencyLevel = 'all' | 'critical' | 'high' | 'medium' | 'low';

const ACTION_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'quote', label: 'Quotes', icon: FileText },
  { value: 'contract', label: 'Contracts', icon: FileText },
  { value: 'payment', label: 'Payments', icon: CreditCard },
  { value: 'task', label: 'Tasks', icon: CheckCircle },
];

export default function ActionCenterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: ActionType }>();

  const [selectedType, setSelectedType] = useState<ActionType>(
    (params.type as ActionType) || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel>('all');

  const { data: actions, isLoading, refetch } = useActions({
    type: selectedType === 'all' ? undefined : selectedType,
  });

  const filteredActions = useMemo(() => {
    if (!actions) return [];

    let filtered = actions;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        action =>
          action.title?.toLowerCase().includes(query) ||
          action.event_name?.toLowerCase().includes(query)
      );
    }

    // Filter by urgency
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(action => action.urgency === urgencyFilter);
    }

    // Sort by urgency (critical first)
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) =>
      (urgencyOrder[a.urgency] || 4) - (urgencyOrder[b.urgency] || 4)
    );

    return filtered;
  }, [actions, searchQuery, urgencyFilter]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return colors.semantic.error;
      case 'high': return colors.semantic.warning;
      case 'medium': return colors.accent.lavender;
      default: return colors.neutral.gray;
    }
  };

  const handleActionPress = (action: Action) => {
    switch (action.type) {
      case 'quote':
        router.push(`/quotes/${action.id}`);
        break;
      case 'contract':
        router.push(`/contracts/${action.id}`);
        break;
      case 'payment':
        router.push(`/payments/${action.invoice_id}`);
        break;
      case 'task':
        router.push(`/events/${action.event_id}?tab=tasks`);
        break;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingTop: layout.statusBarHeight + spacing.md,
          paddingBottom: spacing.md,
          backgroundColor: colors.neutral.cream,
        }}
      >
        <Text style={{ ...typeScale.headlineLarge, color: colors.primary.charcoal }}>
          Action Center
        </Text>

        {/* Summary */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
            <Warning size={16} color={colors.semantic.error} weight="fill" />
            <Text style={{ ...typeScale.labelSmall, color: colors.semantic.error }}>
              {actions?.filter(a => a.urgency === 'critical').length || 0} Critical
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
            <Clock size={16} color={colors.semantic.warning} />
            <Text style={{ ...typeScale.labelSmall, color: colors.semantic.warning }}>
              {actions?.filter(a => a.urgency === 'high').length || 0} High
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: layout.screenPaddingHorizontal,
          marginBottom: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.neutral.white,
            borderRadius: 12,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <MagnifyingGlass size={20} color={colors.neutral.gray} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: spacing.sm,
              ...typeScale.bodyMedium,
              color: colors.primary.charcoal,
            }}
            placeholder="Search actions..."
            placeholderTextColor={colors.neutral.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: colors.neutral.white,
            padding: spacing.sm,
            borderRadius: 12,
          }}
          onPress={() => setShowFilters(true)}
        >
          <Funnel size={24} color={colors.primary.charcoal} />
        </TouchableOpacity>
      </View>

      {/* Type Filters */}
      <FlatList
        horizontal
        data={ACTION_TYPES}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingBottom: spacing.md,
          gap: spacing.sm,
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedType(item.value as ActionType)}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderRadius: 24,
              backgroundColor:
                selectedType === item.value
                  ? colors.primary.charcoal
                  : colors.neutral.white,
            }}
          >
            <Text
              style={{
                ...typeScale.labelMedium,
                color:
                  selectedType === item.value
                    ? colors.neutral.white
                    : colors.primary.charcoal,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Actions List */}
      <FlatList
        data={filteredActions}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingBottom: layout.bottomNavHeight + spacing.xl,
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <ActionItemCard
            action={item}
            onPress={() => handleActionPress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 100 }}>
            <CheckCircle size={64} color={colors.secondary.sage} weight="light" />
            <Text style={{ ...typeScale.titleLarge, color: colors.primary.charcoal, marginTop: spacing.lg }}>
              All Caught Up!
            </Text>
            <Text style={{ ...typeScale.bodyMedium, color: colors.neutral.darkGray, textAlign: 'center', marginTop: spacing.sm }}>
              No actions require your attention right now.
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        urgency={urgencyFilter}
        onUrgencyChange={setUrgencyFilter}
      />
    </View>
  );
}
```

### 10.6 Event Detail Screen with Tabs

Create `app/events/[id]/index.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CaretLeft,
  DotsThree,
  FileText,
  CreditCard,
  ChatCircle,
  CheckSquare,
  Star,
  ClockCounterClockwise,
} from 'phosphor-react-native';

import { useEvent, useEventTimeline, useEventTasks, useEventDocuments } from '@/hooks/useEvents';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { TimelineTab } from '@/components/events/tabs/TimelineTab';
import { TasksTab } from '@/components/events/tabs/TasksTab';
import { DocumentsTab } from '@/components/events/tabs/DocumentsTab';
import { InvoicesTab } from '@/components/events/tabs/InvoicesTab';
import { ContractsTab } from '@/components/events/tabs/ContractsTab';
import { FeedbackTab } from '@/components/events/tabs/FeedbackTab';
import { NotesTab } from '@/components/events/tabs/NotesTab';
import { QuotesTab } from '@/components/events/tabs/QuotesTab';
import { formatEventDate, formatEventTime, getEventCountdown } from '@/utils/formatting';
import { colors, spacing, typeScale, layout } from '@/theme';

const TABS = [
  { key: 'timeline', label: 'Timeline', icon: ClockCounterClockwise },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: CreditCard },
  { key: 'contracts', label: 'Contracts', icon: FileText },
  { key: 'quotes', label: 'Quotes', icon: FileText },
  { key: 'feedback', label: 'Feedback', icon: Star },
  { key: 'notes', label: 'Notes', icon: ChatCircle },
];

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('timeline');
  const [refreshing, setRefreshing] = useState(false);

  const { data: event, isLoading, refetch } = useEvent(Number(id));
  const { data: timeline } = useEventTimeline(Number(id));
  const { data: tasks } = useEventTasks(Number(id));
  const { data: documents } = useEventDocuments(Number(id));

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!event) return null;

  const countdown = getEventCountdown(event.start_date);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'timeline':
        return <TimelineTab eventId={Number(id)} timeline={timeline} />;
      case 'tasks':
        return <TasksTab eventId={Number(id)} tasks={tasks} onRefresh={refetch} />;
      case 'documents':
        return <DocumentsTab eventId={Number(id)} documents={documents} />;
      case 'invoices':
        return <InvoicesTab eventId={Number(id)} />;
      case 'contracts':
        return <ContractsTab eventId={Number(id)} />;
      case 'quotes':
        return <QuotesTab eventId={Number(id)} />;
      case 'feedback':
        return <FeedbackTab eventId={Number(id)} />;
      case 'notes':
        return <NotesTab eventId={Number(id)} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickyHeaderIndices={[1]}
      >
        {/* Hero Image */}
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: event.venue_image || event.package_image }}
            style={{ width: '100%', height: 250 }}
            contentFit="cover"
          />
          {/* Back Button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: layout.statusBarHeight + spacing.sm,
              left: spacing.md,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              padding: spacing.sm,
            }}
            onPress={() => router.back()}
          >
            <CaretLeft size={24} color={colors.neutral.white} />
          </TouchableOpacity>
          {/* Options Button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: layout.statusBarHeight + spacing.sm,
              right: spacing.md,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              padding: spacing.sm,
            }}
          >
            <DotsThree size={24} color={colors.neutral.white} weight="bold" />
          </TouchableOpacity>
        </View>

        {/* Tab Bar (Sticky) */}
        <View style={{ backgroundColor: colors.neutral.cream }}>
          {/* Event Info Header */}
          <View style={{ padding: layout.screenPaddingHorizontal }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <EventStatusBadge status={event.status} />
              {event.payment_status && (
                <EventStatusBadge status={event.payment_status} type="payment" />
              )}
            </View>

            <Text style={{ ...typeScale.headlineMedium, color: colors.primary.charcoal }}>
              {event.name}
            </Text>

            <Text style={{ ...typeScale.bodyMedium, color: colors.neutral.darkGray, marginTop: spacing.xxs }}>
              {event.event_type_name}
            </Text>

            {/* Countdown */}
            {countdown && (
              <View
                style={{
                  backgroundColor: colors.accent.lavenderSubtle,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: 8,
                  marginTop: spacing.md,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ ...typeScale.labelMedium, color: colors.accent.lavender }}>
                  {countdown}
                </Text>
              </View>
            )}

            {/* Event Details */}
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Calendar size={20} color={colors.neutral.gray} />
                <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}>
                  {formatEventDate(event.start_date, event.end_date)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Clock size={20} color={colors.neutral.gray} />
                <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}>
                  {formatEventTime(event.start_time, event.end_time)}
                </Text>
              </View>
              {event.venue_name && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <MapPin size={20} color={colors.neutral.gray} />
                  <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}>
                    {event.venue_name}
                  </Text>
                </View>
              )}
              {event.num_guests && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Users size={20} color={colors.neutral.gray} />
                  <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}>
                    {event.num_guests} Guests
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Tab Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: layout.screenPaddingHorizontal,
              paddingVertical: spacing.md,
              gap: spacing.sm,
            }}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: 20,
                    backgroundColor: isActive ? colors.primary.charcoal : colors.neutral.white,
                  }}
                >
                  <Icon
                    size={18}
                    color={isActive ? colors.neutral.white : colors.neutral.gray}
                  />
                  <Text
                    style={{
                      ...typeScale.labelSmall,
                      color: isActive ? colors.neutral.white : colors.primary.charcoal,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={{ paddingHorizontal: layout.screenPaddingHorizontal }}>
          {renderTabContent()}
        </View>
      </ScrollView>

      {/* Check-in Button (if event is today) */}
      {event.can_check_in && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: layout.screenPaddingHorizontal,
            backgroundColor: colors.neutral.cream,
            borderTopWidth: 1,
            borderTopColor: colors.neutral.warmGray,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary.sage,
              paddingVertical: spacing.md,
              borderRadius: 12,
              alignItems: 'center',
            }}
            onPress={() => {/* Handle check-in */}}
          >
            <Text style={{ ...typeScale.labelLarge, color: colors.neutral.white }}>
              Check In to Event
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
```

### 10.7 Financial Portal Screen

Create `app/payments/index.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  CreditCard,
  Receipt,
  Clock,
  CheckCircle,
  Warning,
  Plus,
  CaretRight,
} from 'phosphor-react-native';

import { useFinancialOverview, useInvoices, usePaymentMethods } from '@/hooks/useFinancial';
import { InvoiceCard } from '@/components/payments/InvoiceCard';
import { PaymentMethodCard } from '@/components/payments/PaymentMethodCard';
import { colors, spacing, typeScale, layout } from '@/theme';
import { formatCurrency } from '@/utils/formatting';

type TabType = 'invoices' | 'history' | 'methods';

export default function FinancialPortalScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview, refetch: refetchOverview } = useFinancialOverview();
  const { data: invoices, refetch: refetchInvoices } = useInvoices();
  const { data: paymentMethods, refetch: refetchMethods } = usePaymentMethods();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOverview(), refetchInvoices(), refetchMethods()]);
    setRefreshing(false);
  };

  const pendingInvoices = invoices?.filter(inv =>
    inv.status === 'PENDING' || inv.status === 'PARTIALLY_PAID'
  ) || [];

  const overdueInvoices = invoices?.filter(inv => inv.is_overdue) || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: layout.bottomNavHeight + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: layout.screenPaddingHorizontal,
            paddingTop: layout.statusBarHeight + spacing.md,
            paddingBottom: spacing.lg,
          }}
        >
          <Text style={{ ...typeScale.headlineLarge, color: colors.primary.charcoal }}>
            Payments
          </Text>
        </View>

        {/* Overview Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: layout.screenPaddingHorizontal,
            gap: spacing.md,
            marginBottom: spacing.xl,
          }}
        >
          {/* Total Paid */}
          <View
            style={{
              backgroundColor: colors.secondary.sageSubtle,
              borderRadius: 16,
              padding: spacing.lg,
              minWidth: 150,
            }}
          >
            <CheckCircle size={24} color={colors.secondary.sage} />
            <Text style={{ ...typeScale.labelSmall, color: colors.secondary.sage, marginTop: spacing.sm }}>
              Total Paid
            </Text>
            <Text style={{ ...typeScale.headlineSmall, color: colors.primary.charcoal }}>
              {formatCurrency(overview?.total_paid || 0)}
            </Text>
          </View>

          {/* Pending */}
          <View
            style={{
              backgroundColor: colors.accent.lavenderSubtle,
              borderRadius: 16,
              padding: spacing.lg,
              minWidth: 150,
            }}
          >
            <Clock size={24} color={colors.accent.lavender} />
            <Text style={{ ...typeScale.labelSmall, color: colors.accent.lavender, marginTop: spacing.sm }}>
              Pending
            </Text>
            <Text style={{ ...typeScale.headlineSmall, color: colors.primary.charcoal }}>
              {formatCurrency(overview?.pending_amount || 0)}
            </Text>
            <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
              {pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Overdue */}
          {overdueInvoices.length > 0 && (
            <View
              style={{
                backgroundColor: colors.semantic.errorSubtle,
                borderRadius: 16,
                padding: spacing.lg,
                minWidth: 150,
              }}
            >
              <Warning size={24} color={colors.semantic.error} />
              <Text style={{ ...typeScale.labelSmall, color: colors.semantic.error, marginTop: spacing.sm }}>
                Overdue
              </Text>
              <Text style={{ ...typeScale.headlineSmall, color: colors.primary.charcoal }}>
                {formatCurrency(overview?.overdue_amount || 0)}
              </Text>
              <Text style={{ ...typeScale.labelSmall, color: colors.semantic.error }}>
                {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: layout.screenPaddingHorizontal,
            marginBottom: spacing.lg,
            backgroundColor: colors.neutral.sand,
            borderRadius: 12,
            padding: spacing.xxs,
          }}
        >
          {[
            { key: 'invoices', label: 'Invoices' },
            { key: 'history', label: 'History' },
            { key: 'methods', label: 'Methods' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as TabType)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: 10,
                backgroundColor: activeTab === tab.key ? colors.neutral.white : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  ...typeScale.labelMedium,
                  color: activeTab === tab.key ? colors.primary.charcoal : colors.neutral.gray,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={{ paddingHorizontal: layout.screenPaddingHorizontal }}>
          {activeTab === 'invoices' && (
            <View style={{ gap: spacing.md }}>
              {invoices?.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  onPress={() => router.push(`/payments/${invoice.id}`)}
                />
              ))}
              {invoices?.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
                  <Receipt size={48} color={colors.neutral.gray} weight="light" />
                  <Text style={{ ...typeScale.bodyMedium, color: colors.neutral.gray, marginTop: spacing.md }}>
                    No invoices yet
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'history' && (
            <View style={{ gap: spacing.md }}>
              {overview?.recent_payments?.map((payment) => (
                <View
                  key={payment.id}
                  style={{
                    backgroundColor: colors.neutral.white,
                    borderRadius: 12,
                    padding: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <CheckCircle size={24} color={colors.semantic.success} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}>
                      {formatCurrency(payment.amount)}
                    </Text>
                    <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
                      {payment.payment_method} • {payment.date}
                    </Text>
                  </View>
                  <Text style={{ ...typeScale.labelSmall, color: colors.semantic.success }}>
                    Completed
                  </Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'methods' && (
            <View style={{ gap: spacing.md }}>
              {paymentMethods?.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  onEdit={() => {/* Handle edit */}}
                  onDelete={() => {/* Handle delete */}}
                />
              ))}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.neutral.white,
                  borderRadius: 12,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.accent.lavender,
                  borderStyle: 'dashed',
                  gap: spacing.sm,
                }}
                onPress={() => router.push('/payments/add-method')}
              >
                <Plus size={20} color={colors.accent.lavender} />
                <Text style={{ ...typeScale.labelMedium, color: colors.accent.lavender }}>
                  Add Payment Method
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
```

### 10.8 Documents Screen

Create `app/documents/index.tsx`:

```typescript
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  MagnifyingGlass,
  Funnel,
  FileText,
  FilePdf,
  FileImage,
  Download,
  Eye,
  SortAscending,
} from 'phosphor-react-native';

import { useDocuments, useDownloadDocument } from '@/hooks/useDocuments';
import { colors, spacing, typeScale, layout } from '@/theme';

type DocumentType = 'all' | 'contract' | 'receipt' | 'photo' | 'upload' | 'other';
type SortBy = 'date' | 'name' | 'type' | 'size';

const DOCUMENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'contract', label: 'Contracts' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'photo', label: 'Photos' },
  { value: 'upload', label: 'Uploads' },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');

  const { data: documents, isLoading, refetch } = useDocuments();
  const downloadDocument = useDownloadDocument();

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    let filtered = documents;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(doc => doc.type?.toLowerCase() === selectedType);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doc =>
          doc.name?.toLowerCase().includes(query) ||
          doc.event_name?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [documents, selectedType, searchQuery, sortBy]);

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
      case 'contract':
        return FilePdf;
      case 'image':
      case 'photo':
        return FileImage;
      default:
        return FileText;
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const result = await downloadDocument.mutateAsync({
        eventId: document.event_id,
        fileId: document.id,
      });

      // Save to device
      const fileUri = `${FileSystem.documentDirectory}${document.name}`;
      await FileSystem.writeAsStringAsync(fileUri, result.data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share/open the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      Alert.alert('Download Failed', 'Unable to download the document. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingTop: layout.statusBarHeight + spacing.md,
          paddingBottom: spacing.md,
        }}
      >
        <Text style={{ ...typeScale.headlineLarge, color: colors.primary.charcoal }}>
          Documents
        </Text>
      </View>

      {/* Search */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: layout.screenPaddingHorizontal,
          marginBottom: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.neutral.white,
            borderRadius: 12,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <MagnifyingGlass size={20} color={colors.neutral.gray} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: spacing.sm,
              ...typeScale.bodyMedium,
              color: colors.primary.charcoal,
            }}
            placeholder="Search documents..."
            placeholderTextColor={colors.neutral.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: colors.neutral.white,
            padding: spacing.sm,
            borderRadius: 12,
          }}
          onPress={() => {
            // Cycle through sort options
            const sortOptions: SortBy[] = ['date', 'name', 'type', 'size'];
            const currentIndex = sortOptions.indexOf(sortBy);
            setSortBy(sortOptions[(currentIndex + 1) % sortOptions.length]);
          }}
        >
          <SortAscending size={24} color={colors.primary.charcoal} />
        </TouchableOpacity>
      </View>

      {/* Type Filters */}
      <FlatList
        horizontal
        data={DOCUMENT_TYPES}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingBottom: spacing.md,
          gap: spacing.sm,
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedType(item.value as DocumentType)}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderRadius: 24,
              backgroundColor:
                selectedType === item.value
                  ? colors.primary.charcoal
                  : colors.neutral.white,
            }}
          >
            <Text
              style={{
                ...typeScale.labelMedium,
                color:
                  selectedType === item.value
                    ? colors.neutral.white
                    : colors.primary.charcoal,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Documents List */}
      <FlatList
        data={filteredDocuments}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingBottom: layout.bottomNavHeight + spacing.xl,
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const Icon = getFileIcon(item.type);
          return (
            <View
              style={{
                backgroundColor: colors.neutral.white,
                borderRadius: 12,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: colors.accent.lavenderSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={24} color={colors.accent.lavender} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text
                  style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
                  {item.event_name} • {formatFileSize(item.size || 0)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TouchableOpacity
                  style={{
                    padding: spacing.sm,
                    backgroundColor: colors.neutral.sand,
                    borderRadius: 8,
                  }}
                  onPress={() => {/* Preview document */}}
                >
                  <Eye size={20} color={colors.primary.charcoal} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    padding: spacing.sm,
                    backgroundColor: colors.accent.lavenderSubtle,
                    borderRadius: 8,
                  }}
                  onPress={() => handleDownload(item)}
                >
                  <Download size={20} color={colors.accent.lavender} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 100 }}>
            <FileText size={64} color={colors.neutral.gray} weight="light" />
            <Text style={{ ...typeScale.titleLarge, color: colors.primary.charcoal, marginTop: spacing.lg }}>
              No Documents
            </Text>
            <Text style={{ ...typeScale.bodyMedium, color: colors.neutral.darkGray, textAlign: 'center', marginTop: spacing.sm }}>
              Documents from your events will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}
```

### 10.9 Contract Signing Screen

Create `app/contracts/[id].tsx`:

```typescript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import SignatureScreen from 'react-native-signature-canvas';
import {
  CaretLeft,
  Download,
  PenNib,
  CheckCircle,
  Warning,
  X,
} from 'phosphor-react-native';

import { useContract, useSignContract } from '@/hooks/useContracts';
import { colors, spacing, typeScale, layout } from '@/theme';

export default function ContractDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const signatureRef = useRef<SignatureScreen>(null);

  const [showSigningModal, setShowSigningModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signerName, setSignerName] = useState('');

  const { data: contract, isLoading, refetch } = useContract(Number(id));
  const signContract = useSignContract();

  const handleSign = async () => {
    if (!signatureData) {
      Alert.alert('Signature Required', 'Please draw your signature to continue.');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Agreement Required', 'Please agree to the terms to continue.');
      return;
    }

    if (!signerName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }

    try {
      await signContract.mutateAsync({
        contractId: Number(id),
        signatureImage: signatureData,
        signerName: signerName.trim(),
      });

      setShowSigningModal(false);
      refetch();

      Alert.alert(
        'Contract Signed',
        'The contract has been signed successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Signing Failed', 'Unable to sign the contract. Please try again.');
    }
  };

  const handleClearSignature = () => {
    signatureRef.current?.clearSignature();
    setSignatureData(null);
  };

  if (!contract) return null;

  const isPending = contract.status === 'PENDING_SIGNATURE';
  const isSigned = contract.status === 'SIGNED' || contract.status === 'FULLY_SIGNED';

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingTop: layout.statusBarHeight + spacing.sm,
          paddingBottom: spacing.md,
          backgroundColor: colors.neutral.cream,
          borderBottomWidth: 1,
          borderBottomColor: colors.neutral.warmGray,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <CaretLeft size={24} color={colors.primary.charcoal} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={{ ...typeScale.titleMedium, color: colors.primary.charcoal }}>
            {contract.title}
          </Text>
          <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
            {contract.event_name}
          </Text>
        </View>
        <TouchableOpacity
          style={{
            padding: spacing.sm,
            backgroundColor: colors.accent.lavenderSubtle,
            borderRadius: 8,
          }}
          onPress={() => {/* Download PDF */}}
        >
          <Download size={20} color={colors.accent.lavender} />
        </TouchableOpacity>
      </View>

      {/* Status Banner */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          marginHorizontal: layout.screenPaddingHorizontal,
          marginTop: spacing.md,
          borderRadius: 12,
          backgroundColor: isSigned
            ? colors.semantic.successSubtle
            : isPending
            ? colors.semantic.warningSubtle
            : colors.neutral.sand,
        }}
      >
        {isSigned ? (
          <CheckCircle size={24} color={colors.semantic.success} weight="fill" />
        ) : (
          <Warning size={24} color={colors.semantic.warning} />
        )}
        <View style={{ marginLeft: spacing.md, flex: 1 }}>
          <Text
            style={{
              ...typeScale.labelMedium,
              color: isSigned ? colors.semantic.success : colors.semantic.warning,
            }}
          >
            {isSigned ? 'Contract Signed' : 'Awaiting Your Signature'}
          </Text>
          {isSigned && contract.signed_at && (
            <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
              Signed on {new Date(contract.signed_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      {/* Contract Content */}
      <View style={{ flex: 1, margin: layout.screenPaddingHorizontal, marginTop: spacing.md }}>
        <WebView
          source={{ html: contract.content_html || '<p>Loading contract...</p>' }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
          scrollEnabled={true}
        />
      </View>

      {/* Sign Button */}
      {isPending && (
        <View
          style={{
            padding: layout.screenPaddingHorizontal,
            backgroundColor: colors.neutral.cream,
            borderTopWidth: 1,
            borderTopColor: colors.neutral.warmGray,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: colors.accent.lavender,
              paddingVertical: spacing.md,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
            }}
            onPress={() => setShowSigningModal(true)}
          >
            <PenNib size={20} color={colors.neutral.white} />
            <Text style={{ ...typeScale.labelLarge, color: colors.neutral.white }}>
              Sign Contract
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Signing Modal */}
      <Modal
        visible={showSigningModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
          {/* Modal Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: layout.screenPaddingHorizontal,
              paddingTop: spacing.xl,
              borderBottomWidth: 1,
              borderBottomColor: colors.neutral.warmGray,
            }}
          >
            <Text style={{ ...typeScale.titleLarge, color: colors.primary.charcoal }}>
              Sign Contract
            </Text>
            <TouchableOpacity onPress={() => setShowSigningModal(false)}>
              <X size={24} color={colors.primary.charcoal} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: layout.screenPaddingHorizontal }}>
            {/* Signer Name */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={{ ...typeScale.labelMedium, color: colors.primary.charcoal, marginBottom: spacing.sm }}>
                Full Legal Name
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.neutral.white,
                  borderRadius: 12,
                  padding: spacing.md,
                  ...typeScale.bodyMedium,
                  color: colors.primary.charcoal,
                }}
                placeholder="Enter your full name"
                placeholderTextColor={colors.neutral.gray}
                value={signerName}
                onChangeText={setSignerName}
              />
            </View>

            {/* Signature Pad */}
            <View style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={{ ...typeScale.labelMedium, color: colors.primary.charcoal }}>
                  Your Signature
                </Text>
                <TouchableOpacity onPress={handleClearSignature}>
                  <Text style={{ ...typeScale.labelMedium, color: colors.accent.lavender }}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  height: 200,
                  backgroundColor: colors.neutral.white,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: colors.neutral.warmGray,
                  borderStyle: 'dashed',
                }}
              >
                <SignatureScreen
                  ref={signatureRef}
                  onOK={(signature) => setSignatureData(signature)}
                  onEmpty={() => setSignatureData(null)}
                  descriptionText=""
                  clearText="Clear"
                  confirmText="Save"
                  webStyle={`
                    .m-signature-pad--footer { display: none; }
                    .m-signature-pad--body { border: none; }
                  `}
                />
              </View>
              <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray, marginTop: spacing.xs }}>
                Draw your signature above
              </Text>
            </View>

            {/* Terms Agreement */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: spacing.xl,
              }}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: agreedToTerms ? colors.accent.lavender : colors.neutral.warmGray,
                  backgroundColor: agreedToTerms ? colors.accent.lavender : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.sm,
                }}
              >
                {agreedToTerms && <CheckCircle size={16} color={colors.neutral.white} weight="bold" />}
              </View>
              <Text style={{ ...typeScale.bodySmall, color: colors.primary.charcoal, flex: 1 }}>
                I have read and agree to the terms and conditions outlined in this contract.
                I understand that this electronic signature is legally binding.
              </Text>
            </TouchableOpacity>

            {/* Sign Button */}
            <TouchableOpacity
              style={{
                backgroundColor: signatureData && agreedToTerms && signerName
                  ? colors.accent.lavender
                  : colors.neutral.warmGray,
                paddingVertical: spacing.md,
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={handleSign}
              disabled={!signatureData || !agreedToTerms || !signerName || signContract.isPending}
            >
              <Text style={{ ...typeScale.labelLarge, color: colors.neutral.white }}>
                {signContract.isPending ? 'Signing...' : 'Complete Signature'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
```

### 10.10 VIP Program Screen

Create `app/vip/index.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Star,
  Gift,
  TrendUp,
  Medal,
  CaretRight,
} from 'phosphor-react-native';

import { useVIPStatus, useVIPBenefits, useVIPPoints, useRedeemBenefit } from '@/hooks/useVIP';
import { colors, spacing, typeScale, layout } from '@/theme';

export default function VIPScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: status, refetch: refetchStatus } = useVIPStatus();
  const { data: benefits } = useVIPBenefits();
  const { data: points } = useVIPPoints();
  const redeemBenefit = useRedeemBenefit();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchStatus();
    setRefreshing(false);
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return ['#1a1a2e', '#4a4a6a'];
      case 'gold': return ['#b8860b', '#daa520'];
      case 'silver': return ['#6b6b6b', '#a8a8a8'];
      default: return [colors.accent.lavender, colors.accent.lavenderSubtle];
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: layout.bottomNavHeight + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* VIP Status Card */}
        <LinearGradient
          colors={getTierColor(status?.tier_name || '')}
          style={{
            margin: layout.screenPaddingHorizontal,
            marginTop: layout.statusBarHeight + spacing.md,
            borderRadius: 24,
            padding: spacing.xl,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
            <Crown size={32} color={colors.neutral.white} weight="fill" />
            <Text style={{ ...typeScale.headlineMedium, color: colors.neutral.white, marginLeft: spacing.sm }}>
              {status?.tier_name || 'Member'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ ...typeScale.labelSmall, color: 'rgba(255,255,255,0.7)' }}>
                Total Points
              </Text>
              <Text style={{ ...typeScale.displaySmall, color: colors.neutral.white }}>
                {status?.total_points?.toLocaleString() || 0}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ ...typeScale.labelSmall, color: 'rgba(255,255,255,0.7)' }}>
                Available Points
              </Text>
              <Text style={{ ...typeScale.headlineMedium, color: colors.neutral.white }}>
                {status?.available_points?.toLocaleString() || 0}
              </Text>
            </View>
          </View>

          {/* Progress to Next Tier */}
          {status?.next_tier && (
            <View style={{ marginTop: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                <Text style={{ ...typeScale.labelSmall, color: 'rgba(255,255,255,0.7)' }}>
                  Progress to {status.next_tier}
                </Text>
                <Text style={{ ...typeScale.labelSmall, color: 'rgba(255,255,255,0.7)' }}>
                  {status.points_to_next_tier} points needed
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 }}>
                <View
                  style={{
                    height: '100%',
                    width: `${status.tier_progress || 0}%`,
                    backgroundColor: colors.neutral.white,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Benefits Section */}
        <View style={{ paddingHorizontal: layout.screenPaddingHorizontal, marginTop: spacing.xl }}>
          <Text style={{ ...typeScale.titleMedium, color: colors.primary.charcoal, marginBottom: spacing.md }}>
            Your Benefits
          </Text>
          <View style={{ gap: spacing.sm }}>
            {benefits?.map((benefit) => (
              <View
                key={benefit.id}
                style={{
                  backgroundColor: colors.neutral.white,
                  borderRadius: 12,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.accent.lavenderSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Gift size={24} color={colors.accent.lavender} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}>
                    {benefit.name}
                  </Text>
                  <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
                    {benefit.description}
                  </Text>
                </View>
                {benefit.is_redeemable && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.accent.lavender,
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                      borderRadius: 8,
                    }}
                    onPress={() => redeemBenefit.mutate({ benefitId: benefit.id })}
                  >
                    <Text style={{ ...typeScale.labelSmall, color: colors.neutral.white }}>
                      Redeem
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Points History */}
        <View style={{ paddingHorizontal: layout.screenPaddingHorizontal, marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ ...typeScale.titleMedium, color: colors.primary.charcoal }}>
              Points History
            </Text>
            <TouchableOpacity onPress={() => router.push('/vip/history')}>
              <Text style={{ ...typeScale.labelMedium, color: colors.accent.lavender }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: spacing.sm }}>
            {points?.slice(0, 5).map((transaction) => (
              <View
                key={transaction.id}
                style={{
                  backgroundColor: colors.neutral.white,
                  borderRadius: 12,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: transaction.points > 0
                      ? colors.semantic.successSubtle
                      : colors.semantic.errorSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {transaction.points > 0 ? (
                    <TrendUp size={20} color={colors.semantic.success} />
                  ) : (
                    <Gift size={20} color={colors.semantic.error} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal }}>
                    {transaction.description}
                  </Text>
                  <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={{
                    ...typeScale.labelLarge,
                    color: transaction.points > 0
                      ? colors.semantic.success
                      : colors.semantic.error,
                  }}
                >
                  {transaction.points > 0 ? '+' : ''}{transaction.points}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
```

### 10.11 Messaging Screen

Create `app/messages/index.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MagnifyingGlass,
  PaperPlaneRight,
  Circle,
  Plus,
} from 'phosphor-react-native';
import { Image } from 'expo-image';

import { useMessageThreads } from '@/hooks/useMessaging';
import { formatRelativeTime } from '@/utils/formatting';
import { colors, spacing, typeScale, layout } from '@/theme';

export default function MessagesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: threads, isLoading, refetch } = useMessageThreads();

  const filteredThreads = React.useMemo(() => {
    if (!threads) return [];
    if (!searchQuery) return threads;

    const query = searchQuery.toLowerCase();
    return threads.filter(
      thread =>
        thread.subject?.toLowerCase().includes(query) ||
        thread.last_message?.toLowerCase().includes(query)
    );
  }, [threads, searchQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.cream }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingTop: layout.statusBarHeight + spacing.md,
          paddingBottom: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ ...typeScale.headlineLarge, color: colors.primary.charcoal }}>
            Messages
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.accent.lavender,
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => router.push('/messages/new')}
          >
            <Plus size={24} color={colors.neutral.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: layout.screenPaddingHorizontal,
          marginBottom: spacing.md,
          backgroundColor: colors.neutral.white,
          borderRadius: 12,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <MagnifyingGlass size={20} color={colors.neutral.gray} />
        <TextInput
          style={{
            flex: 1,
            marginLeft: spacing.sm,
            ...typeScale.bodyMedium,
            color: colors.primary.charcoal,
          }}
          placeholder="Search messages..."
          placeholderTextColor={colors.neutral.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Thread List */}
      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingHorizontal,
          paddingBottom: layout.bottomNavHeight + spacing.xl,
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              backgroundColor: colors.neutral.white,
              borderRadius: 12,
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => router.push(`/messages/${item.id}`)}
          >
            {/* Avatar */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.accent.lavenderSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.participant_avatar ? (
                <Image
                  source={{ uri: item.participant_avatar }}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                />
              ) : (
                <Text style={{ ...typeScale.titleMedium, color: colors.accent.lavender }}>
                  {item.participant_name?.[0] || 'S'}
                </Text>
              )}
            </View>

            {/* Content */}
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...typeScale.bodyMedium, color: colors.primary.charcoal, fontWeight: item.unread_count > 0 ? '600' : '400' }}>
                  {item.subject || item.participant_name || 'Support'}
                </Text>
                <Text style={{ ...typeScale.labelSmall, color: colors.neutral.gray }}>
                  {formatRelativeTime(item.last_message_at)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xxs }}>
                <Text
                  style={{
                    ...typeScale.bodySmall,
                    color: item.unread_count > 0 ? colors.primary.charcoal : colors.neutral.gray,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.last_message}
                </Text>
                {item.unread_count > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.accent.lavender,
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: spacing.xs,
                    }}
                  >
                    <Text style={{ ...typeScale.labelSmall, color: colors.neutral.white }}>
                      {item.unread_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 100 }}>
            <PaperPlaneRight size={64} color={colors.neutral.gray} weight="light" />
            <Text style={{ ...typeScale.titleLarge, color: colors.primary.charcoal, marginTop: spacing.lg }}>
              No Messages
            </Text>
            <Text style={{ ...typeScale.bodyMedium, color: colors.neutral.darkGray, textAlign: 'center', marginTop: spacing.sm }}>
              Start a conversation with our support team.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.accent.lavender,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.xl,
                borderRadius: 12,
                marginTop: spacing.lg,
              }}
              onPress={() => router.push('/messages/new')}
            >
              <Text style={{ ...typeScale.labelMedium, color: colors.neutral.white }}>
                New Message
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
```

---

## 11. Component Library

*(Detailed component implementations following STYLING_GUIDE.md)*

## 12. Booking Flow Implementation

The booking flow is the core feature of the app, implementing a multi-step wizard that matches the web client-portal patterns.

### 12.1 Booking Types

Create `src/types/booking.ts`:

```typescript
// src/types/booking.ts

export interface EventType {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface BookingFlowStep {
  id: number;
  step_type: StepType;
  step_type_display: string;
  order: number;
  title: string;
  description?: string;
  is_required: boolean;
  is_skippable: boolean;
  configuration: Record<string, unknown>;
}

export type StepType =
  | 'introduction'
  | 'contact_info'
  | 'datetime'
  | 'package_selection'
  | 'addon_selection'
  | 'questionnaire'
  | 'pricing_summary'
  | 'payment'
  | 'review'
  | 'confirmation';

export interface BookingFlow {
  id: number;
  name: string;
  slug: string;
  description?: string;
  event_type: EventType;
  enabled_steps: BookingFlowStep[];
  is_active: boolean;
}

export interface BookingSession {
  session_id: string;
  booking_flow: number;
  current_step?: BookingFlowStep;
  progress_percentage: number;
  expires_at: string;
  is_completed: boolean;
  is_abandoned: boolean;
  total_price?: string;
  booking_data: BookingData;
  created_at: string;
  updated_at: string;
}

export interface BookingData {
  // Contact Info
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  organization_name?: string;

  // DateTime
  event_date?: string;
  event_time?: string;
  duration_hours?: number;
  guest_count?: number;

  // Package Selection
  selected_packages?: SelectedProduct[];
  venue_additional_hours?: number;

  // Add-on Selection
  selected_addons?: SelectedProduct[];

  // Questionnaire responses
  questionnaire_responses?: Record<string, unknown>;

  // Payment
  payment_intent_id?: string;
  payment_method_id?: string;
}

export interface SelectedProduct {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface PaymentGateway {
  id: number;
  gateway_type: 'stripe' | 'paypal' | 'square';
  display_name: string;
  is_default: boolean;
}

export interface PricingBreakdown {
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  formattedSubtotal: string;
  formattedTax: string;
  formattedDiscount: string;
  formattedTotal: string;
}

export interface StepValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
}

export interface BookingCompletionResult {
  success: boolean;
  event_id?: number;
  quote_id?: number;
  confirmation_number?: string;
  message?: string;
}

export interface RecoverableSession {
  sessionId: string;
  lastUpdated: string;
  stepName: string;
  progressPercentage: number;
}
```

### 12.2 Booking API Layer

Create `src/apis/booking.api.ts`:

```typescript
// src/apis/booking.api.ts
import { api } from './client';
import type {
  BookingFlow,
  BookingSession,
  BookingCompletionResult,
  PaymentGateway,
  StepValidationResult,
} from '@/types/booking';

const BASE_URL = '/api/bookingflow/public';

export const BookingAPI = {
  /**
   * Get available booking flows, optionally filtered by event type
   */
  getAvailableFlows: async (eventTypeId?: number): Promise<BookingFlow[]> => {
    const params = eventTypeId ? { event_type: eventTypeId } : {};
    const response = await api.get<BookingFlow[]>(`${BASE_URL}/flows/`, { params });
    return response.data;
  },

  /**
   * Get a specific booking flow by ID
   */
  getFlowById: async (flowId: number): Promise<BookingFlow> => {
    const response = await api.get<BookingFlow>(`${BASE_URL}/flows/${flowId}/`);
    return response.data;
  },

  /**
   * Start a new booking session
   */
  startSession: async (flowId: number): Promise<{
    session_id: string;
    current_step: Record<string, unknown>;
    progress_percentage: number;
    expires_at: string;
  }> => {
    const response = await api.post(`${BASE_URL}/flows/${flowId}/start_session/`);
    return response.data;
  },

  /**
   * Get an existing session by ID
   */
  getSession: async (sessionId: string): Promise<BookingSession> => {
    const response = await api.get<BookingSession>(`${BASE_URL}/sessions/${sessionId}/`);
    return response.data;
  },

  /**
   * Update session data for a step
   * @param markCompleted - If true, marks the step as completed and advances to next step
   */
  updateSessionData: async (
    sessionId: string,
    stepId: number,
    bookingData: Record<string, unknown>,
    markCompleted: boolean = false
  ): Promise<{
    total_price: string;
    updated_at: string;
    current_step?: Record<string, unknown>;
    progress_percentage: number;
    validation_errors?: Record<string, string[]>;
  }> => {
    const response = await api.patch(`${BASE_URL}/sessions/${sessionId}/update_data/`, {
      step_id: stepId,
      booking_data: bookingData,
      mark_completed: markCompleted,
    });
    return response.data;
  },

  /**
   * Navigate to a specific step
   */
  goToStep: async (
    sessionId: string,
    stepId: number
  ): Promise<{
    current_step: Record<string, unknown>;
    progress_percentage: number;
    updated_at: string;
  }> => {
    const response = await api.post(`${BASE_URL}/sessions/${sessionId}/go_to_step/`, {
      step_id: stepId,
    });
    return response.data;
  },

  /**
   * Validate step data without advancing
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    data: Record<string, unknown>
  ): Promise<StepValidationResult> => {
    const response = await api.post(`${BASE_URL}/sessions/${sessionId}/validate_step/`, {
      step_id: stepId,
      data,
    });
    return response.data;
  },

  /**
   * Complete the booking
   */
  completeBooking: async (
    sessionId: string,
    completionType: 'payment' | 'quote' = 'payment'
  ): Promise<BookingCompletionResult> => {
    const response = await api.post(`${BASE_URL}/sessions/${sessionId}/complete/`, {
      completion_type: completionType,
    });
    return response.data;
  },

  /**
   * Get payment gateways available for a flow
   */
  getFlowPaymentGateways: async (flowId: number): Promise<{
    available_gateways: PaymentGateway[];
    default_gateway: number | null;
  }> => {
    const response = await api.get(`${BASE_URL}/flows/${flowId}/payment_gateways/`);
    return response.data;
  },

  /**
   * Get products available for a step
   */
  getStepProducts: async (
    sessionId: string,
    stepId: number
  ): Promise<{
    products: Array<{
      id: number;
      name: string;
      description: string;
      price: string;
      category: string;
      image_url?: string;
    }>;
  }> => {
    const response = await api.get(
      `${BASE_URL}/sessions/${sessionId}/steps/${stepId}/products/`
    );
    return response.data;
  },

  /**
   * Check available dates for a session
   */
  getAvailableDates: async (
    sessionId: string,
    month: number,
    year: number
  ): Promise<{
    available_dates: string[];
    unavailable_dates: string[];
  }> => {
    const response = await api.get(`${BASE_URL}/sessions/${sessionId}/available-dates/`, {
      params: { month, year },
    });
    return response.data;
  },
};
```

### 12.3 Session Persistence Utilities

Create `src/utils/bookingStorage.ts`:

```typescript
// src/utils/bookingStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_PREFIX = '@booking_session_';
const SESSION_EXPIRY_BUFFER = 1000 * 60 * 5; // 5 minutes buffer before expiry

interface LocalSessionData {
  session_id: string;
  booking_flow: number;
  booking_data: Record<string, unknown>;
  current_step?: Record<string, unknown>;
  total_price: string;
  progress_percentage: number;
  expires_at: string;
  updated_at: string;
  pending_sync: boolean; // True if not yet confirmed by server
}

export const BookingStorage = {
  /**
   * Save session data to local storage
   * Called BEFORE API calls as a failsafe
   */
  saveSession: async (sessionId: string, data: Partial<LocalSessionData>): Promise<void> => {
    try {
      const key = SESSION_PREFIX + sessionId;
      const existing = await BookingStorage.getSession(sessionId);
      const merged: LocalSessionData = {
        session_id: sessionId,
        booking_flow: data.booking_flow ?? existing?.booking_flow ?? 0,
        booking_data: { ...existing?.booking_data, ...data.booking_data },
        current_step: data.current_step ?? existing?.current_step,
        total_price: data.total_price ?? existing?.total_price ?? '0.00',
        progress_percentage: data.progress_percentage ?? existing?.progress_percentage ?? 0,
        expires_at: data.expires_at ?? existing?.expires_at ?? '',
        updated_at: data.updated_at ?? new Date().toISOString(),
        pending_sync: data.pending_sync ?? true,
      };
      await AsyncStorage.setItem(key, JSON.stringify(merged));
    } catch (error) {
      console.warn('Failed to save session to storage:', error);
    }
  },

  /**
   * Get session data from local storage
   */
  getSession: async (sessionId: string): Promise<LocalSessionData | null> => {
    try {
      const key = SESSION_PREFIX + sessionId;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Clear session from local storage
   */
  clearSession: async (sessionId: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(SESSION_PREFIX + sessionId);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
  },

  /**
   * Clear ALL booking sessions from local storage
   */
  clearAllSessions: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(k => k.startsWith(SESSION_PREFIX));
      await AsyncStorage.multiRemove(sessionKeys);
    } catch (error) {
      console.warn('Failed to clear all sessions:', error);
    }
  },

  /**
   * Check if a session is expired
   */
  isSessionExpired: (expiresAt: string): boolean => {
    if (!expiresAt) return true;
    const expiryTime = new Date(expiresAt).getTime();
    return Date.now() > expiryTime - SESSION_EXPIRY_BUFFER;
  },

  /**
   * Clean up expired sessions from storage
   */
  cleanupExpiredSessions: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(k => k.startsWith(SESSION_PREFIX));

      for (const key of sessionKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;

        try {
          const data: LocalSessionData = JSON.parse(raw);
          if (BookingStorage.isSessionExpired(data.expires_at)) {
            await AsyncStorage.removeItem(key);
          }
        } catch {
          // Remove corrupted data
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup expired sessions:', error);
    }
  },

  /**
   * Find recoverable sessions with meaningful progress
   */
  findRecoverableSessions: async (): Promise<{
    sessionId: string;
    lastUpdated: string;
    stepName: string;
    progressPercentage: number;
  } | null> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(k => k.startsWith(SESSION_PREFIX));

      let mostRecentSession: {
        sessionId: string;
        lastUpdated: string;
        stepName: string;
        progressPercentage: number;
        timestamp: number;
      } | null = null;

      for (const key of sessionKeys) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;

          const data: LocalSessionData = JSON.parse(raw);

          // Skip expired sessions
          if (BookingStorage.isSessionExpired(data.expires_at)) {
            await AsyncStorage.removeItem(key);
            continue;
          }

          // Check if session has meaningful progress
          const bookingData = data.booking_data || {};
          const hasBookingData = Object.keys(bookingData).length > 0 &&
            Object.values(bookingData).some((val: unknown) => {
              if (Array.isArray(val)) return val.length > 0;
              if (typeof val === 'object' && val !== null) return Object.keys(val).length > 0;
              return val !== null && val !== undefined && val !== '';
            });
          const progressPercentage = data.progress_percentage || 0;
          const hasMeaningfulProgress = progressPercentage > 0 || hasBookingData;

          // Skip sessions with no meaningful progress
          if (!hasMeaningfulProgress) {
            await AsyncStorage.removeItem(key);
            continue;
          }

          const sessionId = key.replace(SESSION_PREFIX, '');
          const lastUpdated = data.updated_at;
          const timestamp = lastUpdated ? new Date(lastUpdated).getTime() : 0;

          // Track the most recent session
          if (!mostRecentSession || timestamp > mostRecentSession.timestamp) {
            mostRecentSession = {
              sessionId,
              lastUpdated: lastUpdated || new Date().toISOString(),
              stepName: (data.current_step as Record<string, string>)?.step_type_display ||
                        (data.current_step as Record<string, string>)?.step_type ||
                        'Unknown',
              progressPercentage,
              timestamp,
            };
          }
        } catch {
          await AsyncStorage.removeItem(key);
        }
      }

      if (mostRecentSession) {
        return {
          sessionId: mostRecentSession.sessionId,
          lastUpdated: mostRecentSession.lastUpdated,
          stepName: mostRecentSession.stepName,
          progressPercentage: mostRecentSession.progressPercentage,
        };
      }

      return null;
    } catch (error) {
      console.warn('Error finding recoverable sessions:', error);
      return null;
    }
  },
};
```

### 12.4 Booking Store with Zustand

Create `src/stores/bookingStore.ts`:

```typescript
// src/stores/bookingStore.ts
import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import { debounce } from 'lodash';
import { router } from 'expo-router';

import { BookingAPI } from '@/apis/booking.api';
import { BookingStorage } from '@/utils/bookingStorage';
import { parseApiError } from '@/utils/errorHandler';
import type {
  BookingFlow,
  BookingSession,
  BookingData,
  PaymentGateway,
  PricingBreakdown,
  RecoverableSession,
  StepValidationResult,
  BookingCompletionResult,
  EventType,
} from '@/types/booking';

interface BookingState {
  // Flow data
  availableFlows: BookingFlow[];
  selectedEventType: EventType | null;
  currentFlow: BookingFlow | null;
  currentSession: BookingSession | null;

  // Step data (local state for each step)
  stepData: Record<string, Record<string, unknown>>;

  // Progress tracking
  progress: {
    currentStepIndex: number;
    totalSteps: number;
    completedSteps: number[];
    canGoBack: boolean;
    canGoNext: boolean;
    canSkip: boolean;
  };

  // UI state
  ui: {
    isLoading: boolean;
    isValidating: boolean;
    isSubmitting: boolean;
    error: string | null;
    validationErrors: Record<string, string[]>;
  };

  // Payment
  paymentGateways: PaymentGateway[];
  selectedPaymentGateway: PaymentGateway | null;

  // Pricing
  totalPrice: string;
  taxRate: number;
  pricingBreakdown: PricingBreakdown;

  // Session recovery
  recoverableSession: RecoverableSession | null;
}

interface BookingActions {
  // Flow actions
  fetchAvailableFlows: (eventTypeId?: number) => Promise<void>;
  selectEventType: (eventType: EventType) => Promise<void>;

  // Session actions
  startSession: (flowId: number) => Promise<void>;
  recoverSession: (sessionId: string) => Promise<void>;
  updateStepData: (stepType: string, data: Record<string, unknown>) => Promise<void>;
  validateStep: (stepId: number, data: Record<string, unknown>) => Promise<StepValidationResult>;

  // Navigation
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  skipStep: () => Promise<void>;
  goToStep: (stepIndex: number) => void;

  // Completion
  completeBooking: (completionType?: 'payment' | 'quote') => Promise<BookingCompletionResult>;

  // Payment
  fetchPaymentGateways: () => Promise<void>;
  selectPaymentGateway: (gateway: PaymentGateway) => void;

  // Pricing
  updateTotalPrice: (price: string) => Promise<void>;
  setOptimisticPrice: (price: string) => void;
  setTaxRate: (rate: number) => void;
  setPricingBreakdown: (breakdown: PricingBreakdown) => void;

  // Helpers
  getBookingData: () => BookingData;
  getSelectedProducts: () => { packages: unknown[]; addons: unknown[] };
  resetBooking: () => void;
  clearErrors: () => void;
  clearRecoverableSession: () => void;

  // Lifecycle
  initializeRecovery: () => Promise<void>;
  handleAppStateChange: (state: AppStateStatus) => void;
}

const initialState: BookingState = {
  availableFlows: [],
  selectedEventType: null,
  currentFlow: null,
  currentSession: null,
  stepData: {},
  progress: {
    currentStepIndex: 0,
    totalSteps: 0,
    completedSteps: [],
    canGoBack: false,
    canGoNext: true,
    canSkip: false,
  },
  ui: {
    isLoading: false,
    isValidating: false,
    isSubmitting: false,
    error: null,
    validationErrors: {},
  },
  paymentGateways: [],
  selectedPaymentGateway: null,
  totalPrice: '0.00',
  taxRate: 0.12,
  pricingBreakdown: {
    subtotal: '0.00',
    tax: '0.00',
    discount: '0.00',
    total: '0.00',
    formattedSubtotal: '',
    formattedTax: '',
    formattedDiscount: '',
    formattedTotal: '',
  },
  recoverableSession: null,
};

// Create debounced backend update function
const createDebouncedUpdate = (get: () => BookingState & BookingActions) => {
  return debounce(
    async (
      sessionId: string,
      stepId: number,
      bookingData: Record<string, unknown>,
      totalPrice: string
    ) => {
      // FAILSAFE: Save to AsyncStorage BEFORE API call
      await BookingStorage.saveSession(sessionId, {
        booking_data: bookingData,
        total_price: totalPrice,
        updated_at: new Date().toISOString(),
        pending_sync: true,
      });

      try {
        const response = await BookingAPI.updateSessionData(
          sessionId,
          stepId,
          bookingData,
          false // mark_completed = false for incremental updates
        );

        // Update total price if changed
        if (response.total_price && response.total_price !== totalPrice) {
          get().setOptimisticPrice(response.total_price);
        }

        // Update localStorage with server-confirmed data
        await BookingStorage.saveSession(sessionId, {
          booking_data: bookingData,
          total_price: response.total_price,
          updated_at: response.updated_at,
          pending_sync: false,
        });
      } catch (error) {
        console.warn('Background update failed, data preserved in storage:', error);
      }
    },
    1000 // 1 second debounce
  );
};

export const useBookingStore = create<BookingState & BookingActions>((set, get) => {
  // Create the debounced update function
  const debouncedUpdate = createDebouncedUpdate(get);

  return {
    ...initialState,

    // Flow actions
    fetchAvailableFlows: async (eventTypeId?: number) => {
      set(state => ({ ui: { ...state.ui, isLoading: true, error: null } }));

      try {
        const flows = await BookingAPI.getAvailableFlows(eventTypeId);
        set({ availableFlows: flows });
      } catch (error) {
        const apiError = parseApiError(error);
        set(state => ({ ui: { ...state.ui, error: apiError.message } }));
      } finally {
        set(state => ({ ui: { ...state.ui, isLoading: false } }));
      }
    },

    selectEventType: async (eventType: EventType) => {
      set(state => ({
        selectedEventType: eventType,
        ui: { ...state.ui, isLoading: true, error: null },
      }));

      try {
        const flows = await BookingAPI.getAvailableFlows(eventType.id);

        if (flows.length === 0) {
          throw new Error('No booking flows available for this event type');
        }

        const selectedFlow = flows[0];
        set({
          currentFlow: selectedFlow,
          progress: {
            ...get().progress,
            totalSteps: selectedFlow.enabled_steps.length,
            currentStepIndex: 0,
          },
        });

        await get().startSession(selectedFlow.id);
      } catch (error) {
        const apiError = parseApiError(error);
        set(state => ({ ui: { ...state.ui, error: apiError.message } }));
      } finally {
        set(state => ({ ui: { ...state.ui, isLoading: false } }));
      }
    },

    // Session actions
    startSession: async (flowId: number) => {
      set(state => ({ ui: { ...state.ui, isLoading: true, error: null } }));

      try {
        const sessionResponse = await BookingAPI.startSession(flowId);

        const sessionData: BookingSession = {
          session_id: sessionResponse.session_id,
          booking_flow: flowId,
          current_step: sessionResponse.current_step as unknown as BookingSession['current_step'],
          progress_percentage: sessionResponse.progress_percentage,
          expires_at: sessionResponse.expires_at,
          is_completed: false,
          is_abandoned: false,
          total_price: '0.00',
          booking_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({ currentSession: sessionData, totalPrice: '0.00' });

        // Save to local storage
        await BookingStorage.saveSession(sessionResponse.session_id, {
          session_id: sessionResponse.session_id,
          booking_flow: flowId,
          booking_data: {},
          current_step: sessionResponse.current_step,
          total_price: '0.00',
          progress_percentage: sessionResponse.progress_percentage,
          expires_at: sessionResponse.expires_at,
          updated_at: new Date().toISOString(),
          pending_sync: false,
        });

        await get().fetchPaymentGateways();
      } catch (error) {
        const apiError = parseApiError(error);
        set(state => ({ ui: { ...state.ui, error: apiError.message } }));
      } finally {
        set(state => ({ ui: { ...state.ui, isLoading: false } }));
      }
    },

    recoverSession: async (sessionId: string) => {
      set(state => ({ ui: { ...state.ui, isLoading: true, error: null } }));

      try {
        const sessionData = await BookingAPI.getSession(sessionId);

        if (BookingStorage.isSessionExpired(sessionData.expires_at)) {
          await BookingStorage.clearSession(sessionId);
          throw new Error('Session has expired');
        }

        set({ currentSession: sessionData, totalPrice: sessionData.total_price || '0.00' });

        // Get the flow
        const flow = await BookingAPI.getFlowById(sessionData.booking_flow);
        set({
          currentFlow: flow,
          progress: {
            ...get().progress,
            totalSteps: flow.enabled_steps.length,
          },
        });

        // Update progress based on current step
        get().updateProgress();

        await get().fetchPaymentGateways();
        set({ recoverableSession: null });
      } catch (error) {
        const apiError = parseApiError(error);
        set(state => ({ ui: { ...state.ui, error: apiError.message } }));
        await BookingStorage.clearSession(sessionId);
      } finally {
        set(state => ({ ui: { ...state.ui, isLoading: false } }));
      }
    },

    updateStepData: async (stepType: string, data: Record<string, unknown>) => {
      const { currentSession, totalPrice } = get();
      if (!currentSession) throw new Error('No active session');

      const currentStep = currentSession.current_step;
      if (!currentStep) throw new Error('No current step found');

      // Clear errors immediately for better UX
      set(state => ({ ui: { ...state.ui, error: null, validationErrors: {} } }));

      // Build updated booking data
      const bookingDataUpdate = {
        ...currentSession.booking_data,
        ...data,
      };

      // IMMEDIATELY update local state for responsive UI
      set(state => ({
        stepData: {
          ...state.stepData,
          [stepType]: data,
        },
        currentSession: {
          ...currentSession,
          booking_data: bookingDataUpdate,
        },
      }));

      // DEBOUNCED backend update - won't block UI
      debouncedUpdate(
        currentSession.session_id,
        currentStep.id as number,
        bookingDataUpdate,
        totalPrice
      );
    },

    validateStep: async (stepId: number, data: Record<string, unknown>) => {
      const { currentSession } = get();
      if (!currentSession) throw new Error('No active session');

      // Cancel pending debounced updates before validation
      debouncedUpdate.cancel();

      try {
        const result = await BookingAPI.validateStepData(
          currentSession.session_id,
          stepId,
          data
        );

        if (!result.isValid) {
          const errors: Record<string, string[]> = {};
          result.errors.forEach(error => {
            errors[error.field] = [error.message];
          });
          set(state => ({ ui: { ...state.ui, validationErrors: errors } }));
        } else {
          set(state => ({ ui: { ...state.ui, validationErrors: {} } }));
        }

        return result;
      } catch (error) {
        const apiError = parseApiError(error);
        set(state => ({ ui: { ...state.ui, error: apiError.message } }));
        return { isValid: false, errors: [{ field: 'general', message: apiError.message }] };
      }
    },

    // Navigation
    nextStep: async () => {
      const { currentFlow, currentSession, stepData, totalPrice } = get();
      if (!currentFlow || !currentSession) return;

      // Block if already on confirmation step
      if (currentSession.current_step?.step_type === 'confirmation') {
        console.warn('nextStep called on confirmation step - blocked');
        return;
      }

      // Cancel pending debounced updates
      debouncedUpdate.cancel();

      set(state => ({ ui: { ...state.ui, isSubmitting: true, error: null, validationErrors: {} } }));

      try {
        const currentStep = currentSession.current_step;
        if (!currentStep) return;

        // Build complete booking data
        const currentStepData = stepData[currentStep.step_type as string];
        const updatedBookingData = {
          ...currentSession.booking_data,
          ...(currentStepData && typeof currentStepData === 'object' ? currentStepData : {}),
        };

        // Full update with mark_completed = true
        const response = await BookingAPI.updateSessionData(
          currentSession.session_id,
          currentStep.id as number,
          updatedBookingData,
          true
        );

        // Check for validation errors
        if (response.validation_errors && Object.keys(response.validation_errors).length > 0) {
          set(state => ({ ui: { ...state.ui, validationErrors: response.validation_errors! } }));
          return;
        }

        // Update session state
        const updatedSession: BookingSession = {
          ...currentSession,
          booking_data: updatedBookingData,
          current_step: response.current_step as BookingSession['current_step'],
          progress_percentage: response.progress_percentage,
          total_price: response.total_price,
          updated_at: response.updated_at,
        };

        set({ currentSession: updatedSession });

        if (response.total_price !== totalPrice) {
          set({ totalPrice: response.total_price });
        }

        // Save to storage
        await BookingStorage.saveSession(currentSession.session_id, {
          booking_data: updatedBookingData,
          current_step: response.current_step,
          total_price: response.total_price,
          progress_percentage: response.progress_percentage,
          updated_at: response.updated_at,
          pending_sync: false,
        });

        // Update progress
        get().updateProgress();
      } catch (error) {
        const apiError = parseApiError(error);
        set(state => ({ ui: { ...state.ui, error: apiError.message } }));
      } finally {
        set(state => ({ ui: { ...state.ui, isSubmitting: false } }));
      }
    },

    previousStep: async () => {
      const { currentFlow, currentSession, progress } = get();
      if (!currentFlow || !currentSession) return;

      const currentIndex = progress.currentStepIndex;
      if (currentIndex <= 0) return;

      const targetStep = currentFlow.enabled_steps[currentIndex - 1];
      if (!targetStep) return;

      set(state => ({ ui: { ...state.ui, isSubmitting: true } }));

      try {
        const response = await BookingAPI.goToStep(
          currentSession.session_id,
          targetStep.id
        );

        const updatedSession: BookingSession = {
          ...currentSession,
          current_step: response.current_step as BookingSession['current_step'],
          progress_percentage: response.progress_percentage,
          updated_at: response.updated_at,
        };

        set({ currentSession: updatedSession });

        await BookingStorage.saveSession(currentSession.session_id, {
          current_step: response.current_step,
          progress_percentage: response.progress_percentage,
          updated_at: response.updated_at,
          pending_sync: false,
        });

        get().updateProgress();
      } catch (error) {
        const apiError = parseApiError(error);
        set(state => ({ ui: { ...state.ui, error: apiError.message } }));
      } finally {
        set(state => ({ ui: { ...state.ui, isSubmitting: false } }));
      }
    },

    skipStep: async () => {
      const { currentSession } = get();
      if (!currentSession?.current_step?.is_skippable) return;
      await get().nextStep();
    },

    goToStep: (stepIndex: number) => {
      const { currentFlow, currentSession } = get();
      if (!currentFlow || !currentSession) return;

      const targetStep = currentFlow.enabled_steps[stepIndex];
      if (targetStep) {
        set({
          currentSession: {
            ...currentSession,
            current_step: targetStep,
          },
        });
        get().updateProgress();
      }
    },

    // Completion
    completeBooking: async (completionType = 'payment') => {
      const { currentSession } = get();
      if (!currentSession) throw new Error('No active session');

      // Cancel pending updates
      debouncedUpdate.cancel();

      set(state => ({ ui: { ...state.ui, isSubmitting: true, error: null } }));

      try {
        const result = await BookingAPI.completeBooking(
          currentSession.session_id,
          completionType
        );

        // Clear session from storage
        await BookingStorage.clearSession(currentSession.session_id);

        set({
          currentSession: {
            ...currentSession,
            is_completed: true,
          },
        });

        return result;
      } catch (error) {
        const apiError = parseApiError(error);
        set(state => ({ ui: { ...state.ui, error: apiError.message } }));
        throw error;
      } finally {
        set(state => ({ ui: { ...state.ui, isSubmitting: false } }));
      }
    },

    // Payment
    fetchPaymentGateways: async () => {
      const { currentFlow } = get();
      if (!currentFlow) return;

      try {
        const response = await BookingAPI.getFlowPaymentGateways(currentFlow.id);
        set({ paymentGateways: response.available_gateways });

        if (response.default_gateway) {
          const defaultGateway = response.available_gateways.find(
            g => g.id === response.default_gateway
          );
          if (defaultGateway) {
            set({ selectedPaymentGateway: defaultGateway });
          }
        }
      } catch (error) {
        console.warn('Failed to load payment gateways:', error);
      }
    },

    selectPaymentGateway: (gateway: PaymentGateway) => {
      set({ selectedPaymentGateway: gateway });
    },

    // Pricing
    updateTotalPrice: async (price: string) => {
      set({ totalPrice: price });

      const { currentSession } = get();
      if (currentSession?.current_step) {
        try {
          await BookingAPI.updateSessionData(
            currentSession.session_id,
            currentSession.current_step.id as number,
            { total_price: price },
            false
          );
        } catch (error) {
          console.warn('Failed to update session total price:', error);
        }
      }
    },

    setOptimisticPrice: (price: string) => {
      set({ totalPrice: price });
    },

    setTaxRate: (rate: number) => {
      set({ taxRate: rate });
    },

    setPricingBreakdown: (breakdown: PricingBreakdown) => {
      set({ pricingBreakdown: breakdown });
    },

    // Helpers
    getBookingData: () => {
      return get().currentSession?.booking_data || {};
    },

    getSelectedProducts: () => {
      const bookingData = get().currentSession?.booking_data;
      if (!bookingData) return { packages: [], addons: [] };

      return {
        packages: bookingData.selected_packages || [],
        addons: bookingData.selected_addons || [],
      };
    },

    resetBooking: () => {
      const { currentSession } = get();
      if (currentSession) {
        BookingStorage.clearSession(currentSession.session_id);
      }

      debouncedUpdate.cancel();
      set(initialState);
      router.replace('/');
    },

    clearErrors: () => {
      set(state => ({ ui: { ...state.ui, error: null, validationErrors: {} } }));
    },

    clearRecoverableSession: () => {
      set({ recoverableSession: null });
      BookingStorage.clearAllSessions();
    },

    // Lifecycle
    initializeRecovery: async () => {
      // Clean up expired sessions
      await BookingStorage.cleanupExpiredSessions();

      // Check for recoverable session
      const recoverable = await BookingStorage.findRecoverableSessions();
      if (recoverable) {
        set({ recoverableSession: recoverable });
      }
    },

    handleAppStateChange: (state: AppStateStatus) => {
      const { currentSession, stepData, totalPrice } = get();

      if (state === 'background' || state === 'inactive') {
        // App is going to background - save session immediately
        if (currentSession && currentSession.progress_percentage > 0) {
          // Flush pending debounced updates
          debouncedUpdate.flush();

          // Save current state
          BookingStorage.saveSession(currentSession.session_id, {
            booking_data: currentSession.booking_data,
            current_step: currentSession.current_step as Record<string, unknown>,
            total_price: totalPrice,
            progress_percentage: currentSession.progress_percentage,
            updated_at: new Date().toISOString(),
            pending_sync: true,
          });
        }
      }
    },

    // Internal helper
    updateProgress: () => {
      const { currentFlow, currentSession } = get();
      if (!currentFlow || !currentSession) return;

      const currentStepIndex = currentFlow.enabled_steps.findIndex(
        step => step.id === currentSession.current_step?.id
      );

      set({
        progress: {
          currentStepIndex: Math.max(0, currentStepIndex),
          totalSteps: currentFlow.enabled_steps.length,
          completedSteps: get().progress.completedSteps,
          canGoBack: currentStepIndex > 0,
          canGoNext: true,
          canSkip: Boolean(currentSession.current_step?.is_skippable),
        },
      });
    },
  };
});
```

### 12.5 AppState Integration

Create `src/hooks/useBookingAppState.ts`:

```typescript
// src/hooks/useBookingAppState.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useBookingStore } from '@/stores/bookingStore';

/**
 * Hook to handle app state changes for booking session persistence
 * Equivalent to web's beforeunload/visibilitychange handlers
 */
export function useBookingAppState() {
  const handleAppStateChange = useBookingStore(state => state.handleAppStateChange);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // App is going to background or becoming inactive
      if (
        appState.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        handleAppStateChange(nextAppState);
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);
}
```

### 12.6 Session Recovery Component

Create `src/components/booking/SessionRecoveryModal.tsx`:

```typescript
// src/components/booking/SessionRecoveryModal.tsx
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { ClockCounterClockwise, X, ArrowRight } from 'phosphor-react-native';
import { formatDistanceToNow } from 'date-fns';

import { colors, spacing, typeScale, shadows } from '@/theme';
import { useBookingStore } from '@/stores/bookingStore';

export const SessionRecoveryModal = () => {
  const recoverableSession = useBookingStore(state => state.recoverableSession);
  const recoverSession = useBookingStore(state => state.recoverSession);
  const clearRecoverableSession = useBookingStore(state => state.clearRecoverableSession);

  if (!recoverableSession) return null;

  const handleRecover = async () => {
    await recoverSession(recoverableSession.sessionId);
  };

  const handleStartOver = () => {
    clearRecoverableSession();
  };

  const timeAgo = formatDistanceToNow(new Date(recoverableSession.lastUpdated), {
    addSuffix: true,
  });

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={handleStartOver}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={handleStartOver}>
            <X size={24} color={colors.neutral.darkGray} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <ClockCounterClockwise size={48} color={colors.primary.forest} weight="light" />
          </View>

          <Text style={styles.title}>Continue where you left off?</Text>

          <Text style={styles.description}>
            You have an unfinished booking from {timeAgo}.{'\n'}
            You were on: <Text style={styles.stepName}>{recoverableSession.stepName}</Text>
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${recoverableSession.progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {recoverableSession.progressPercentage}% complete
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleRecover}>
            <Text style={styles.primaryButtonText}>Continue Booking</Text>
            <ArrowRight size={20} color={colors.neutral.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleStartOver}>
            <Text style={styles.secondaryButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.large,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.forest + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.charcoal,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  stepName: {
    fontWeight: '600',
    color: colors.primary.charcoal,
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral.lightGray,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.forest,
    borderRadius: 4,
  },
  progressText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.charcoal,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
  },
});
```

### 12.7 Booking Flow Screen

Create `src/app/(main)/booking/[flowId].tsx`:

```typescript
// src/app/(main)/booking/[flowId].tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { colors, spacing } from '@/theme';
import { useBookingStore } from '@/stores/bookingStore';
import { useBookingAppState } from '@/hooks/useBookingAppState';

// Step components
import { IntroductionStep } from '@/components/booking/steps/IntroductionStep';
import { ContactInfoStep } from '@/components/booking/steps/ContactInfoStep';
import { DateTimeStep } from '@/components/booking/steps/DateTimeStep';
import { PackageSelectionStep } from '@/components/booking/steps/PackageSelectionStep';
import { AddonSelectionStep } from '@/components/booking/steps/AddonSelectionStep';
import { QuestionnaireStep } from '@/components/booking/steps/QuestionnaireStep';
import { PricingSummaryStep } from '@/components/booking/steps/PricingSummaryStep';
import { PaymentStep } from '@/components/booking/steps/PaymentStep';
import { ReviewStep } from '@/components/booking/steps/ReviewStep';
import { ConfirmationStep } from '@/components/booking/steps/ConfirmationStep';

import { BookingHeader } from '@/components/booking/BookingHeader';
import { BookingFooter } from '@/components/booking/BookingFooter';

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  introduction: IntroductionStep,
  contact_info: ContactInfoStep,
  datetime: DateTimeStep,
  package_selection: PackageSelectionStep,
  addon_selection: AddonSelectionStep,
  questionnaire: QuestionnaireStep,
  pricing_summary: PricingSummaryStep,
  payment: PaymentStep,
  review: ReviewStep,
  confirmation: ConfirmationStep,
};

export default function BookingFlowScreen() {
  const { flowId, sessionId } = useLocalSearchParams<{
    flowId: string;
    sessionId?: string;
  }>();

  const currentSession = useBookingStore(state => state.currentSession);
  const currentFlow = useBookingStore(state => state.currentFlow);
  const isLoading = useBookingStore(state => state.ui.isLoading);
  const startSession = useBookingStore(state => state.startSession);
  const recoverSession = useBookingStore(state => state.recoverSession);
  const fetchAvailableFlows = useBookingStore(state => state.fetchAvailableFlows);

  // Handle app state changes for session persistence
  useBookingAppState();

  useEffect(() => {
    const initializeBooking = async () => {
      if (sessionId) {
        // Recover existing session (from deep link or navigation)
        await recoverSession(sessionId);
      } else if (flowId && !currentSession) {
        // Start new session
        await fetchAvailableFlows();
        await startSession(Number(flowId));
      }
    };

    initializeBooking();
  }, [flowId, sessionId]);

  if (isLoading || !currentSession || !currentFlow) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.forest} />
      </View>
    );
  }

  const currentStepType = currentSession.current_step?.step_type as string;
  const StepComponent = STEP_COMPONENTS[currentStepType];

  if (!StepComponent) {
    console.error(`Unknown step type: ${currentStepType}`);
    return null;
  }

  // Don't show footer on confirmation step
  const showFooter = currentStepType !== 'confirmation';

  return (
    <View style={styles.container}>
      <BookingHeader />
      <View style={styles.content}>
        <StepComponent />
      </View>
      {showFooter && <BookingFooter />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.cream,
  },
  content: {
    flex: 1,
  },
});
```

### 12.8 Booking Header Component

Create `src/components/booking/BookingHeader.tsx`:

```typescript
// src/components/booking/BookingHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';
import { router } from 'expo-router';

import { colors, spacing, typeScale } from '@/theme';
import { useBookingStore } from '@/stores/bookingStore';

export const BookingHeader = () => {
  const insets = useSafeAreaInsets();
  const currentFlow = useBookingStore(state => state.currentFlow);
  const currentSession = useBookingStore(state => state.currentSession);
  const progress = useBookingStore(state => state.progress);
  const resetBooking = useBookingStore(state => state.resetBooking);

  const currentStep = currentSession?.current_step;
  const progressPercent = currentSession?.progress_percentage || 0;

  const handleClose = () => {
    // Could show confirmation dialog here
    resetBooking();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.flowName}>{currentFlow?.name}</Text>
          <Text style={styles.stepTitle}>
            {currentStep?.title || currentStep?.step_type_display}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          accessibilityLabel="Close booking"
          accessibilityRole="button"
        >
          <X size={24} color={colors.primary.charcoal} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {progress.currentStepIndex + 1} of {progress.totalSteps}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  flowName: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginBottom: 2,
  },
  stepTitle: {
    ...typeScale.headlineSmall,
    color: colors.primary.charcoal,
  },
  closeButton: {
    padding: spacing.sm,
    marginLeft: spacing.md,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.neutral.lightGray,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.forest,
    borderRadius: 2,
  },
  progressText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    textAlign: 'right',
  },
});
```

### 12.9 Booking Footer Component

Create `src/components/booking/BookingFooter.tsx`:

```typescript
// src/components/booking/BookingFooter.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'phosphor-react-native';

import { colors, spacing, typeScale, shadows } from '@/theme';
import { useBookingStore } from '@/stores/bookingStore';

export const BookingFooter = () => {
  const insets = useSafeAreaInsets();

  const progress = useBookingStore(state => state.progress);
  const isSubmitting = useBookingStore(state => state.ui.isSubmitting);
  const totalPrice = useBookingStore(state => state.totalPrice);
  const currentSession = useBookingStore(state => state.currentSession);

  const nextStep = useBookingStore(state => state.nextStep);
  const previousStep = useBookingStore(state => state.previousStep);
  const skipStep = useBookingStore(state => state.skipStep);

  const currentStep = currentSession?.current_step;
  const isPaymentStep = currentStep?.step_type === 'payment';
  const isReviewStep = currentStep?.step_type === 'review';

  // Determine button text based on step
  const getNextButtonText = () => {
    if (isPaymentStep) return 'Continue to Review';
    if (isReviewStep) return 'Complete Booking';
    return 'Continue';
  };

  const handleNext = async () => {
    await nextStep();
  };

  const handlePrevious = async () => {
    await previousStep();
  };

  const handleSkip = async () => {
    await skipStep();
  };

  // Format price
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(totalPrice) || 0);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      {/* Price display */}
      {parseFloat(totalPrice) > 0 && (
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Estimated Total</Text>
          <Text style={styles.priceValue}>{formattedPrice}</Text>
        </View>
      )}

      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        {progress.canGoBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handlePrevious}
            disabled={isSubmitting}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={20} color={colors.primary.charcoal} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <View style={styles.rightButtons}>
          {progress.canSkip && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isSubmitting}
              accessibilityLabel="Skip this step"
              accessibilityRole="button"
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={isSubmitting}
            accessibilityLabel={getNextButtonText()}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.neutral.white} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>{getNextButtonText()}</Text>
                <ArrowRight size={20} color={colors.neutral.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.lightGray,
    ...shadows.small,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  priceLabel: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
  },
  priceValue: {
    ...typeScale.headlineSmall,
    color: colors.primary.charcoal,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  backButtonText: {
    ...typeScale.labelLarge,
    color: colors.primary.charcoal,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  skipButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.charcoal,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    gap: spacing.sm,
  },
  nextButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
```

### 12.10 Example Step Component - Contact Info

Create `src/components/booking/steps/ContactInfoStep.tsx`:

```typescript
// src/components/booking/steps/ContactInfoStep.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { colors, spacing, typeScale, layout } from '@/theme';
import { useBookingStore } from '@/stores/bookingStore';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  organization_name: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export const ContactInfoStep = () => {
  const currentSession = useBookingStore(state => state.currentSession);
  const updateStepData = useBookingStore(state => state.updateStepData);
  const validationErrors = useBookingStore(state => state.ui.validationErrors);

  const bookingData = currentSession?.booking_data || {};

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: bookingData.first_name || '',
      last_name: bookingData.last_name || '',
      email: bookingData.email || '',
      phone: bookingData.phone || '',
      organization_name: bookingData.organization_name || '',
    },
  });

  // Auto-save on field blur
  const handleFieldBlur = (fieldName: keyof ContactFormData, value: string) => {
    updateStepData('contact_info', { [fieldName]: value });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Your Information</Text>
        <Text style={styles.sectionDescription}>
          Please provide your contact details so we can reach you about your booking.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>First Name *</Text>
          <Controller
            control={control}
            name="first_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.first_name && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={() => {
                  onBlur();
                  handleFieldBlur('first_name', value);
                }}
                placeholder="Enter your first name"
                placeholderTextColor={colors.neutral.darkGray}
                autoCapitalize="words"
                autoComplete="given-name"
                accessibilityLabel="First name"
              />
            )}
          />
          {(errors.first_name || validationErrors.first_name) && (
            <Text style={styles.errorText}>
              {errors.first_name?.message || validationErrors.first_name?.[0]}
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Last Name *</Text>
          <Controller
            control={control}
            name="last_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.last_name && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={() => {
                  onBlur();
                  handleFieldBlur('last_name', value);
                }}
                placeholder="Enter your last name"
                placeholderTextColor={colors.neutral.darkGray}
                autoCapitalize="words"
                autoComplete="family-name"
                accessibilityLabel="Last name"
              />
            )}
          />
          {(errors.last_name || validationErrors.last_name) && (
            <Text style={styles.errorText}>
              {errors.last_name?.message || validationErrors.last_name?.[0]}
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email *</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={() => {
                  onBlur();
                  handleFieldBlur('email', value);
                }}
                placeholder="your@email.com"
                placeholderTextColor={colors.neutral.darkGray}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityLabel="Email address"
              />
            )}
          />
          {(errors.email || validationErrors.email) && (
            <Text style={styles.errorText}>
              {errors.email?.message || validationErrors.email?.[0]}
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={() => {
                  onBlur();
                  handleFieldBlur('phone', value);
                }}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.neutral.darkGray}
                keyboardType="phone-pad"
                autoComplete="tel"
                accessibilityLabel="Phone number"
              />
            )}
          />
          {(errors.phone || validationErrors.phone) && (
            <Text style={styles.errorText}>
              {errors.phone?.message || validationErrors.phone?.[0]}
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Organization (Optional)</Text>
          <Controller
            control={control}
            name="organization_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={() => {
                  onBlur();
                  handleFieldBlur('organization_name', value || '');
                }}
                placeholder="Company or organization name"
                placeholderTextColor={colors.neutral.darkGray}
                autoCapitalize="words"
                autoComplete="organization"
                accessibilityLabel="Organization name"
              />
            )}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typeScale.headlineMedium,
    color: colors.primary.charcoal,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typeScale.labelMedium,
    color: colors.primary.charcoal,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typeScale.bodyMedium,
    color: colors.primary.charcoal,
    ...layout.minTouchTarget,
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.xs,
  },
});
```

### 12.11 Deep Linking for Session Recovery

Add to `app.json` for deep link support:

```json
{
  "expo": {
    "scheme": "lifeplace",
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

Create `src/hooks/useDeepLinking.ts`:

```typescript
// src/hooks/useDeepLinking.ts
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useBookingStore } from '@/stores/bookingStore';

/**
 * Handle deep links for booking session recovery
 * Supports: lifeplace://booking?session_id=xxx
 */
export function useDeepLinking() {
  const recoverSession = useBookingStore(state => state.recoverSession);

  useEffect(() => {
    // Handle URL that opened the app
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        handleDeepLink(url);
      }
    };

    // Handle URLs while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    handleInitialURL();

    return () => subscription.remove();
  }, []);

  const handleDeepLink = (url: string) => {
    const parsed = Linking.parse(url);

    // Handle booking session recovery
    if (parsed.path === 'booking' && parsed.queryParams?.session_id) {
      const sessionId = parsed.queryParams.session_id as string;
      recoverSession(sessionId);
      router.replace(`/(main)/booking?sessionId=${sessionId}`);
    }
  };
}
```

---

## 13. Payment Integration

### 13.1 Stripe Setup

Install Stripe React Native:

```bash
npx expo install @stripe/stripe-react-native
```

Configure in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@stripe/stripe-react-native",
        {
          "merchantIdentifier": "merchant.com.lifeplace.app",
          "enableGooglePay": true
        }
      ]
    ]
  }
}
```

### 13.2 Stripe Provider Setup

Create `src/providers/StripeProvider.tsx`:

```typescript
// src/providers/StripeProvider.tsx
import React from 'react';
import { StripeProvider as StripeNativeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

interface Props {
  children: React.ReactNode;
}

const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.stripePublishableKey || '';

export const StripeProvider = ({ children }: Props) => {
  return (
    <StripeNativeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.lifeplace.app"
      urlScheme="lifeplace"
    >
      {children}
    </StripeNativeProvider>
  );
};
```

### 13.3 Payment API Layer

Create `src/apis/payments.api.ts`:

```typescript
// src/apis/payments.api.ts
import { api } from './client';

const CLIENT_BASE = '/api/payments/client';
const PUBLIC_BASE = '/api/payments/public';

export interface PaymentIntent {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

export interface PaymentMethod {
  id: number;
  payment_type: 'card' | 'bank_account';
  last_four: string;
  brand?: string;
  is_default: boolean;
  created_at: string;
}

export const PaymentsAPI = {
  // Client endpoints (authenticated)
  getPayments: async () => {
    const response = await api.get(`${CLIENT_BASE}/payments/`);
    return response.data;
  },

  getPaymentDetails: async (paymentId: number) => {
    const response = await api.get(`${CLIENT_BASE}/payments/${paymentId}/`);
    return response.data;
  },

  getInvoices: async () => {
    const response = await api.get(`${CLIENT_BASE}/invoices/`);
    return response.data;
  },

  getInvoiceDetails: async (invoiceId: number) => {
    const response = await api.get(`${CLIENT_BASE}/invoices/${invoiceId}/`);
    return response.data;
  },

  downloadInvoice: async (invoiceId: number) => {
    const response = await api.get(`${CLIENT_BASE}/invoices/${invoiceId}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getPaymentPlans: async () => {
    const response = await api.get(`${CLIENT_BASE}/payment-plans/`);
    return response.data;
  },

  getInstallments: async () => {
    const response = await api.get(`${CLIENT_BASE}/installments/`);
    return response.data;
  },

  payInstallment: async (installmentId: number, paymentMethodId: string) => {
    const response = await api.post(`${CLIENT_BASE}/installments/${installmentId}/pay/`, {
      payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  getPaymentMethods: async () => {
    const response = await api.get<PaymentMethod[]>(`${CLIENT_BASE}/payment-methods/`);
    return response.data;
  },

  addPaymentMethod: async (paymentMethodId: string) => {
    const response = await api.post(`${CLIENT_BASE}/payment-methods/`, {
      stripe_payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  deletePaymentMethod: async (id: number) => {
    await api.delete(`${CLIENT_BASE}/payment-methods/${id}/`);
  },

  setDefaultPaymentMethod: async (id: number) => {
    const response = await api.post(`${CLIENT_BASE}/payment-methods/${id}/set_default/`);
    return response.data;
  },

  // Create payment intent for booking
  createPaymentIntent: async (
    bookingSessionId: string,
    amount: number
  ): Promise<PaymentIntent> => {
    const response = await api.post(`${CLIENT_BASE}/payments/create-intent/`, {
      booking_session_id: bookingSessionId,
      amount,
    });
    return response.data;
  },

  // Public endpoints (no auth)
  getPublicPaymentSettings: async () => {
    const response = await api.get(`${PUBLIC_BASE}/settings/`);
    return response.data;
  },

  getAvailableGateways: async () => {
    const response = await api.get(`${PUBLIC_BASE}/gateways/`);
    return response.data;
  },
};
```

### 13.4 Payment Step Component

Create `src/components/booking/steps/PaymentStep.tsx`:

```typescript
// src/components/booking/steps/PaymentStep.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { CardField, useStripe, CardFieldInput } from '@stripe/stripe-react-native';

import { colors, spacing, typeScale } from '@/theme';
import { useBookingStore } from '@/stores/bookingStore';
import { PaymentsAPI } from '@/apis/payments.api';
import { PricingSummary } from '@/components/booking/PricingSummary';

export const PaymentStep = () => {
  const { confirmPayment } = useStripe();

  const currentSession = useBookingStore(state => state.currentSession);
  const totalPrice = useBookingStore(state => state.totalPrice);
  const updateStepData = useBookingStore(state => state.updateStepData);
  const setError = useBookingStore(state => state.ui.error);

  const [isLoading, setIsLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [paymentIntentSecret, setPaymentIntentSecret] = useState<string | null>(null);

  // Create payment intent on mount
  useEffect(() => {
    const createIntent = async () => {
      if (!currentSession) return;

      try {
        setIsLoading(true);
        const intent = await PaymentsAPI.createPaymentIntent(
          currentSession.session_id,
          parseFloat(totalPrice) * 100 // Convert to cents
        );
        setPaymentIntentSecret(intent.client_secret);

        // Store payment intent ID in booking data
        await updateStepData('payment', {
          payment_intent_id: intent.payment_intent_id,
        });
      } catch (error) {
        console.error('Failed to create payment intent:', error);
        Alert.alert('Error', 'Failed to initialize payment. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    createIntent();
  }, [currentSession?.session_id, totalPrice]);

  const handleCardChange = (cardDetails: CardFieldInput.Details) => {
    setCardComplete(cardDetails.complete);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.forest} />
        <Text style={styles.loadingText}>Setting up payment...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Payment Details</Text>
      <Text style={styles.description}>
        Enter your card details to complete your booking.
      </Text>

      <PricingSummary />

      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Card Information</Text>

        <CardField
          postalCodeEnabled={true}
          placeholders={{
            number: '4242 4242 4242 4242',
          }}
          cardStyle={{
            backgroundColor: colors.neutral.white,
            textColor: colors.primary.charcoal,
            borderWidth: 1,
            borderColor: colors.neutral.lightGray,
            borderRadius: 12,
            fontSize: 16,
            placeholderColor: colors.neutral.darkGray,
          }}
          style={styles.cardField}
          onCardChange={handleCardChange}
        />

        <View style={styles.secureNote}>
          <Text style={styles.secureNoteText}>
            🔒 Your payment info is encrypted and secure
          </Text>
        </View>
      </View>

      <View style={styles.termsSection}>
        <Text style={styles.termsText}>
          By completing this payment, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Cancellation Policy</Text>.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  title: {
    ...typeScale.headlineMedium,
    color: colors.primary.charcoal,
    marginBottom: spacing.sm,
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xl,
  },
  cardSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.labelLarge,
    color: colors.primary.charcoal,
    marginBottom: spacing.md,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: spacing.sm,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secureNoteText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  termsSection: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: 12,
  },
  termsText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary.forest,
    textDecorationLine: 'underline',
  },
});
```

---

## 14. Push Notifications

### 14.1 Setup Expo Notifications

```bash
npx expo install expo-notifications expo-device expo-constants
```

### 14.2 Notification Service

Create `src/services/notifications.ts`:

```typescript
// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '@/apis/client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationData {
  type: 'event_update' | 'payment_due' | 'message' | 'task_reminder' | 'general';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const NotificationService = {
  /**
   * Request notification permissions and get push token
   */
  registerForPushNotifications: async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not determined
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      // Android requires notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4A7C59', // Forest green
        });

        // Create channel for payment reminders
        await Notifications.setNotificationChannelAsync('payments', {
          name: 'Payment Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          description: 'Reminders for upcoming payments',
        });

        // Create channel for event updates
        await Notifications.setNotificationChannelAsync('events', {
          name: 'Event Updates',
          importance: Notifications.AndroidImportance.HIGH,
          description: 'Updates about your events',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },

  /**
   * Register device token with backend
   */
  registerDeviceToken: async (token: string): Promise<void> => {
    try {
      await api.post('/api/notifications/devices/', {
        token,
        platform: Platform.OS,
        device_type: Device.modelName,
      });
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  },

  /**
   * Unregister device token (on logout)
   */
  unregisterDeviceToken: async (token: string): Promise<void> => {
    try {
      await api.delete('/api/notifications/devices/', {
        data: { token },
      });
    } catch (error) {
      console.error('Failed to unregister device token:', error);
    }
  },

  /**
   * Schedule a local notification
   */
  scheduleLocalNotification: async (
    notification: PushNotificationData,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string> => {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: 'default',
      },
      trigger,
    });
  },

  /**
   * Cancel a scheduled notification
   */
  cancelNotification: async (notificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Cancel all scheduled notifications
   */
  cancelAllNotifications: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Get badge count
   */
  getBadgeCount: async (): Promise<number> => {
    return await Notifications.getBadgeCountAsync();
  },

  /**
   * Set badge count
   */
  setBadgeCount: async (count: number): Promise<void> => {
    await Notifications.setBadgeCountAsync(count);
  },

  /**
   * Clear badge
   */
  clearBadge: async (): Promise<void> => {
    await Notifications.setBadgeCountAsync(0);
  },
};
```

### 14.3 Notification Hook

Create `src/hooks/useNotifications.ts`:

```typescript
// src/hooks/useNotifications.ts
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { NotificationService } from '@/services/notifications';
import { useAuthStore } from '@/stores/authStore';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register for push notifications when authenticated
    if (isAuthenticated) {
      NotificationService.registerForPushNotifications().then(token => {
        if (token) {
          setExpoPushToken(token);
          NotificationService.registerDeviceToken(token);
        }
      });
    }

    // Listen for incoming notifications (when app is foregrounded)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        setNotification(notification);
      }
    );

    // Listen for notification responses (user tapped notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  // Handle navigation based on notification type
  const handleNotificationNavigation = (data: Record<string, unknown>) => {
    const type = data.type as string;
    const id = data.id as string | number;

    switch (type) {
      case 'event_update':
        router.push(`/(main)/events/${id}`);
        break;
      case 'payment_due':
        router.push(`/(main)/payments/${id}`);
        break;
      case 'message':
        router.push(`/(main)/messages/${id}`);
        break;
      case 'task_reminder':
        router.push(`/(main)/events/${data.event_id}?tab=tasks`);
        break;
      default:
        router.push('/(main)/notifications');
    }
  };

  return {
    expoPushToken,
    notification,
  };
}
```

### 14.4 Notification Preferences Screen

Create `src/app/(main)/settings/notifications.tsx`:

```typescript
// src/app/(main)/settings/notifications.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Calendar, CreditCard, ChatCircle, CheckCircle } from 'phosphor-react-native';

import { colors, spacing, typeScale } from '@/theme';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

interface PreferenceRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const PreferenceRow = ({ icon, title, description, value, onValueChange }: PreferenceRowProps) => (
  <View style={styles.preferenceRow}>
    <View style={styles.preferenceIcon}>{icon}</View>
    <View style={styles.preferenceContent}>
      <Text style={styles.preferenceTitle}>{title}</Text>
      <Text style={styles.preferenceDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.neutral.lightGray, true: colors.primary.forest }}
      thumbColor={colors.neutral.white}
    />
  </View>
);

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { preferences, updatePreference, isLoading } = useNotificationPreferences();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
    >
      <Text style={styles.sectionTitle}>Push Notifications</Text>

      <View style={styles.section}>
        <PreferenceRow
          icon={<Calendar size={24} color={colors.primary.forest} />}
          title="Event Updates"
          description="Get notified about changes to your events"
          value={preferences.event_updates}
          onValueChange={(value) => updatePreference('event_updates', value)}
        />

        <PreferenceRow
          icon={<CreditCard size={24} color={colors.primary.forest} />}
          title="Payment Reminders"
          description="Reminders for upcoming payments and due dates"
          value={preferences.payment_reminders}
          onValueChange={(value) => updatePreference('payment_reminders', value)}
        />

        <PreferenceRow
          icon={<ChatCircle size={24} color={colors.primary.forest} />}
          title="Messages"
          description="New messages from LifePlace staff"
          value={preferences.messages}
          onValueChange={(value) => updatePreference('messages', value)}
        />

        <PreferenceRow
          icon={<CheckCircle size={24} color={colors.primary.forest} />}
          title="Task Reminders"
          description="Reminders for tasks that need your attention"
          value={preferences.task_reminders}
          onValueChange={(value) => updatePreference('task_reminders', value)}
        />
      </View>

      <Text style={styles.sectionTitle}>Email Notifications</Text>

      <View style={styles.section}>
        <PreferenceRow
          icon={<Bell size={24} color={colors.primary.forest} />}
          title="Weekly Summary"
          description="Weekly email with event updates and reminders"
          value={preferences.email_weekly_summary}
          onValueChange={(value) => updatePreference('email_weekly_summary', value)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typeScale.labelLarge,
    color: colors.neutral.darkGray,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  section: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.offWhite,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.forest + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  preferenceContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.charcoal,
    marginBottom: 2,
  },
  preferenceDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
});

## 15. Error Handling and Resilience

### 15.1 Global Error Boundary

Create `src/components/common/ErrorBoundary.tsx`:

```typescript
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WarningCircle, ArrowClockwise } from 'phosphor-react-native';

import { colors, spacing, typeScale } from '@/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service (e.g., Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <WarningCircle size={64} color={colors.semantic.error} weight="light" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry, but something unexpected happened. Please try again.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <ArrowClockwise size={20} color={colors.neutral.white} />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.neutral.cream,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.charcoal,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  message: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.charcoal,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    gap: spacing.sm,
  },
  buttonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
});
```

### 15.2 API Error Handler

Create `src/utils/errorHandler.ts`:

```typescript
import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, string[]>;
}

/**
 * Extract user-friendly error message from API response
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const response = error.response;

    // No response - network error
    if (!response) {
      if (error.code === 'ECONNABORTED') {
        return { message: 'Request timed out. Please check your connection.' };
      }
      return { message: 'Unable to connect. Please check your internet connection.' };
    }

    const data = response.data;

    // Handle different error response formats
    if (typeof data === 'string') {
      return { message: data };
    }

    // Django REST Framework format
    if (data?.detail) {
      return { message: data.detail, code: data.code };
    }

    // Validation errors format
    if (data?.non_field_errors) {
      return { message: data.non_field_errors[0] };
    }

    // Field-specific errors
    if (typeof data === 'object' && Object.keys(data).length > 0) {
      const firstField = Object.keys(data)[0];
      const fieldErrors = data[firstField];
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        return {
          message: fieldErrors[0],
          field: firstField,
          details: data,
        };
      }
    }

    // HTTP status based fallbacks
    switch (response.status) {
      case 400:
        return { message: 'Invalid request. Please check your input.' };
      case 401:
        return { message: 'Please log in to continue.' };
      case 403:
        return { message: 'You don\'t have permission to perform this action.' };
      case 404:
        return { message: 'The requested resource was not found.' };
      case 409:
        return { message: 'This action conflicts with existing data.' };
      case 422:
        return { message: 'The provided data is invalid.' };
      case 429:
        return { message: 'Too many requests. Please wait a moment.' };
      case 500:
      case 502:
      case 503:
        return { message: 'Server error. Please try again later.' };
      default:
        return { message: 'An unexpected error occurred.' };
    }
  }

  // Non-Axios errors
  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'An unexpected error occurred.' };
}

/**
 * Check if error is a network connectivity issue
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}
```

### 15.3 React Query Error Handling

Update `src/utils/queryClient.ts`:

```typescript
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { parseApiError, isAuthError, isNetworkError } from './errorHandler';
import { useAuthStore } from '@/stores/authStore';

// Global error handler for queries
const onQueryError = (error: unknown) => {
  const apiError = parseApiError(error);

  // Handle auth errors globally
  if (isAuthError(error)) {
    useAuthStore.getState().clearAuth();
    return;
  }

  // Log network errors for monitoring
  if (isNetworkError(error)) {
    console.warn('Network error:', apiError.message);
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: onQueryError,
  }),
  mutationCache: new MutationCache({
    onError: onQueryError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (isAuthError(error)) return false;
        // Don't retry on 4xx errors (except 408, 429)
        if (error instanceof AxiosError) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        // Mutations can show toast errors
        const apiError = parseApiError(error);
        // Use your toast system here
        console.error('Mutation error:', apiError.message);
      },
    },
  },
});
```

### 15.4 Network State Hook

Create `src/hooks/useNetworkState.ts`:

```typescript
import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkState;
}
```

Add dependency:
```bash
npx expo install @react-native-community/netinfo
```

---

## 16. Performance Optimization

### 16.1 Image Optimization with expo-image

```typescript
import { Image } from 'expo-image';

// Use expo-image instead of React Native's Image
// It supports caching, blurhash placeholders, and better performance

const VenueImage = ({ uri, blurhash }: { uri: string; blurhash?: string }) => (
  <Image
    source={{ uri }}
    placeholder={blurhash}
    contentFit="cover"
    transition={300}
    cachePolicy="memory-disk" // Cache in memory and disk
    style={{ width: '100%', aspectRatio: 4 / 3 }}
  />
);

// Preload critical images
import { Image } from 'expo-image';

const preloadImages = async (urls: string[]) => {
  await Promise.all(urls.map(url => Image.prefetch(url)));
};
```

### 16.2 List Virtualization with FlashList

```typescript
import { FlashList } from '@shopify/flash-list';

// Use FlashList for long lists - 10x faster than FlatList
const VenueList = ({ venues }: { venues: Venue[] }) => (
  <FlashList
    data={venues}
    renderItem={({ item }) => <VenueCard venue={item} />}
    estimatedItemSize={200} // Approximate item height
    keyExtractor={(item) => item.id}
    // Performance optimizations
    removeClippedSubviews={true}
    maxToRenderPerBatch={10}
    windowSize={5}
    // Separator
    ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
  />
);
```

### 16.3 Memoization Patterns

```typescript
import React, { useMemo, useCallback, memo } from 'react';

// Memoize expensive computations
const EventList = ({ events, filter }: Props) => {
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filter === 'ALL') return true;
      return event.status === filter;
    });
  }, [events, filter]);

  // Memoize callbacks passed to children
  const handleEventPress = useCallback((eventId: string) => {
    router.push(`/events/${eventId}`);
  }, []);

  return (
    <FlashList
      data={filteredEvents}
      renderItem={({ item }) => (
        <MemoizedEventCard event={item} onPress={handleEventPress} />
      )}
      estimatedItemSize={150}
    />
  );
};

// Memoize components that receive stable props
const EventCard = memo(({ event, onPress }: EventCardProps) => {
  return (
    <TouchableOpacity onPress={() => onPress(event.id)}>
      {/* Card content */}
    </TouchableOpacity>
  );
});

const MemoizedEventCard = memo(EventCard);
```

### 16.4 Bundle Size Optimization

```javascript
// babel.config.js - Add tree shaking for icons
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Import only used icons
      [
        'babel-plugin-transform-imports',
        {
          'phosphor-react-native': {
            transform: 'phosphor-react-native/lib/icons/${member}',
            preventFullImport: true,
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
```

### 16.5 React Query Optimization

```typescript
// Prefetch data for screens the user is likely to visit
const prefetchEventDetails = (eventId: string) => {
  queryClient.prefetchQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => EventsAPI.getEvent(Number(eventId)),
    staleTime: 1000 * 60 * 5,
  });
};

// Use placeholder data while loading
const { data: events } = useQuery({
  queryKey: queryKeys.events.list(),
  queryFn: EventsAPI.getEvents,
  placeholderData: (previousData) => previousData, // Keep previous data while refetching
});

// Optimistic updates for mutations
const updateTaskMutation = useMutation({
  mutationFn: ({ eventId, taskId, data }) =>
    EventsAPI.updateEventTask(eventId, taskId, data),
  onMutate: async ({ eventId, taskId, data }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.events.detail(eventId) });

    // Snapshot previous value
    const previous = queryClient.getQueryData(queryKeys.events.detail(eventId));

    // Optimistically update
    queryClient.setQueryData(queryKeys.events.detail(eventId), (old) => ({
      ...old,
      tasks: old.tasks.map(t => t.id === taskId ? { ...t, ...data } : t),
    }));

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(
      queryKeys.events.detail(variables.eventId),
      context?.previous
    );
  },
});
```

---

## 17. Accessibility and Inclusivity

### 17.1 Core Accessibility Props

```typescript
// Every interactive element should have accessibility props
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Book this venue"
  accessibilityHint="Opens the booking flow for Cabana venue"
  accessibilityRole="button"
  onPress={handlePress}
>
  <Text>Book Now</Text>
</TouchableOpacity>

// Images should have alt text
<Image
  source={{ uri: venue.image }}
  accessible={true}
  accessibilityLabel={`Photo of ${venue.name} venue showing outdoor seating area`}
/>

// Form inputs need labels
<TextInput
  accessible={true}
  accessibilityLabel="Email address"
  accessibilityHint="Enter your email to receive booking confirmation"
  placeholder="Email"
/>
```

### 17.2 Accessibility Hook

Create `src/hooks/useAccessibility.ts`:

```typescript
import { useReducedMotion, useAccessibilityInfo } from 'react-native';

export function useAccessibility() {
  const reduceMotionEnabled = useReducedMotion();
  const {
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    isReduceTransparencyEnabled,
    isBoldTextEnabled,
    isGrayscaleEnabled,
    isInvertColorsEnabled,
  } = useAccessibilityInfo();

  return {
    // Animation settings
    animationDuration: reduceMotionEnabled ? 0 : 300,
    shouldAnimate: !reduceMotionEnabled,

    // Screen reader
    isScreenReaderEnabled,

    // Visual preferences
    isReduceTransparencyEnabled,
    isBoldTextEnabled,
    isGrayscaleEnabled,
    isInvertColorsEnabled,
  };
}
```

### 17.3 Accessible Components

```typescript
// Accessible Button Component
import { Pressable, Text, AccessibilityProps } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AccessibleButtonProps extends AccessibilityProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export const AccessibleButton = ({
  label,
  onPress,
  disabled,
  accessibilityHint,
  ...props
}: AccessibleButtonProps) => {
  const handlePress = () => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      // Minimum touch target: 44x44 points (per STYLING_GUIDE.md)
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      {...props}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};
```

### 17.4 Color Contrast Requirements

From STYLING_GUIDE.md:
- Minimum contrast ratio: **4.5:1** for normal text
- Large text (18pt+): **3:1** minimum

```typescript
// Verify your colors meet WCAG AA standards
// Primary text on cream background:
// #32373C on #FAF9F7 = 10.2:1 ✓

// Placeholder text:
// #9B9590 on #FAF9F7 = 2.8:1 ✗ (fails for body text)
// Use #6B6560 instead = 4.6:1 ✓
```

### 17.5 Dynamic Type Support (iOS)

```typescript
import { Text, TextStyle, PixelRatio } from 'react-native';

// Scale font sizes based on user's accessibility settings
const scaledFontSize = (size: number) => {
  const scale = PixelRatio.getFontScale();
  // Clamp between 0.8x and 1.5x to prevent extreme scaling
  const clampedScale = Math.min(Math.max(scale, 0.8), 1.5);
  return Math.round(size * clampedScale);
};

// Use in typography
const scaledTypeScale = {
  bodyMedium: {
    fontSize: scaledFontSize(14),
    lineHeight: scaledFontSize(22),
  },
};

// Or use maxFontSizeMultiplier on Text
<Text
  style={styles.body}
  maxFontSizeMultiplier={1.5} // Limit scaling to 1.5x
  allowFontScaling={true}
>
  {content}
</Text>
```

---

## 18. Offline and Edge Case Support

### 18.1 Offline Detection Component

Create `src/components/common/OfflineBanner.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiSlash } from 'phosphor-react-native';

import { useNetworkState } from '@/hooks/useNetworkState';
import { colors, spacing, typeScale } from '@/theme';

export const OfflineBanner = () => {
  const { isConnected, isInternetReachable } = useNetworkState();
  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <WifiSlash size={20} color={colors.neutral.white} />
      <Text style={styles.text}>
        You're offline. Some features may be unavailable.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.semantic.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  text: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
  },
});
```

### 18.2 Persistent Storage for Offline Data

Create `src/utils/offlineStorage.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@lifeplace_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export const offlineStorage = {
  /**
   * Cache data with expiration
   */
  set: async <T>(key: string, data: T, expiryMs = CACHE_EXPIRY): Promise<void> => {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMs,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cached));
  },

  /**
   * Get cached data if not expired
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;

      const cached: CachedData<T> = JSON.parse(raw);

      // Check if expired
      if (Date.now() > cached.expiresAt) {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return cached.data;
    } catch {
      return null;
    }
  },

  /**
   * Clear specific cache
   */
  remove: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  },

  /**
   * Clear all cached data
   */
  clearAll: async (): Promise<void> => {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  },
};
```

Add dependency:
```bash
npx expo install @react-native-async-storage/async-storage
```

### 18.3 React Query Offline Persistence

```typescript
// src/utils/queryClient.ts
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'LIFEPLACE_QUERY_CACHE',
});

// In your app setup:
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    dehydrateOptions: {
      // Only persist successful queries for specific keys
      shouldDehydrateQuery: (query) => {
        const persistableKeys = ['events', 'venues', 'packages'];
        return (
          query.state.status === 'success' &&
          persistableKeys.some(key =>
            query.queryKey[0]?.toString().includes(key)
          )
        );
      },
    },
  }}
>
  {/* App content */}
</PersistQueryClientProvider>
```

### 18.4 Request Queue for Offline Mutations

Create `src/utils/offlineMutationQueue.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  data: unknown;
  timestamp: number;
}

const QUEUE_KEY = '@lifeplace_mutation_queue';

export const offlineMutationQueue = {
  /**
   * Add mutation to queue
   */
  enqueue: async (mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): Promise<void> => {
    const queue = await offlineMutationQueue.getQueue();
    const newMutation: QueuedMutation = {
      ...mutation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    queue.push(newMutation);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  /**
   * Get all queued mutations
   */
  getQueue: async (): Promise<QueuedMutation[]> => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Process queue when online
   */
  processQueue: async (api: AxiosInstance): Promise<void> => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const queue = await offlineMutationQueue.getQueue();
    if (queue.length === 0) return;

    const processed: string[] = [];

    for (const mutation of queue) {
      try {
        await api.request({
          url: mutation.endpoint,
          method: mutation.method,
          data: mutation.data,
        });
        processed.push(mutation.id);
      } catch (error) {
        console.error('Failed to process queued mutation:', error);
        // Keep in queue for retry
      }
    }

    // Remove processed mutations
    const remaining = queue.filter(m => !processed.includes(m.id));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  },
};
```

### 18.5 Edge Case Handling

```typescript
// Handle empty states gracefully
const EmptyState = ({ type }: { type: 'events' | 'payments' | 'notifications' }) => {
  const configs = {
    events: {
      icon: CalendarBlank,
      title: 'No Events Yet',
      message: 'Start planning your first event by exploring our venues.',
      action: { label: 'Explore Venues', href: '/(tabs)' },
    },
    payments: {
      icon: CreditCard,
      title: 'No Payments',
      message: 'Your payment history will appear here once you make a booking.',
      action: null,
    },
    notifications: {
      icon: Bell,
      title: 'All Caught Up',
      message: "You don't have any notifications at the moment.",
      action: null,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <View style={styles.emptyContainer}>
      <Icon size={64} color={colors.neutral.gray} weight="light" />
      <Text style={styles.emptyTitle}>{config.title}</Text>
      <Text style={styles.emptyMessage}>{config.message}</Text>
      {config.action && (
        <Link href={config.action.href} asChild>
          <TouchableOpacity style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>{config.action.label}</Text>
          </TouchableOpacity>
        </Link>
      )}
    </View>
  );
};

// Handle loading states with skeletons
const EventCardSkeleton = () => (
  <View style={styles.skeletonCard}>
    <View style={[styles.skeleton, { height: 150, borderRadius: 16 }]} />
    <View style={[styles.skeleton, { height: 20, width: '60%', marginTop: 12 }]} />
    <View style={[styles.skeleton, { height: 16, width: '40%', marginTop: 8 }]} />
  </View>
);

// Handle expired sessions
const useSessionExpiry = (expiresAt: string) => {
  const [isExpired, setIsExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const checkExpiry = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
      } else {
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        setTimeRemaining(
          hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
        );
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  return { isExpired, timeRemaining };
};
```

---

## 19. Testing and Monitoring

### 19.1 Testing Setup

Install testing dependencies:

```bash
npm install -D jest @testing-library/react-native @testing-library/jest-native jest-expo @types/jest
```

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@apis/(.*)$': '<rootDir>/src/apis/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
};
```

### 19.2 Component Testing

Create `src/components/common/__tests__/Button.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { AccessibleButton } from '../AccessibleButton';

describe('AccessibleButton', () => {
  it('renders correctly', () => {
    render(<AccessibleButton label="Press me" onPress={() => {}} />);
    expect(screen.getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<AccessibleButton label="Press me" onPress={onPress} />);

    fireEvent.press(screen.getByText('Press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    render(<AccessibleButton label="Press me" onPress={onPress} disabled />);

    fireEvent.press(screen.getByText('Press me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('has correct accessibility props', () => {
    render(
      <AccessibleButton
        label="Book Now"
        accessibilityHint="Opens booking flow"
        onPress={() => {}}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibilityValue({ text: undefined });
    expect(button.props.accessibilityLabel).toBe('Book Now');
  });
});
```

### 19.3 Hook Testing

Create `src/hooks/__tests__/useAuth.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useLogin } from '../useAuth';
import { AuthAPI } from '@/apis/auth.api';

// Mock the API
jest.mock('@/apis/auth.api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully logs in user', async () => {
    const mockResponse = {
      access: 'access-token',
      refresh: 'refresh-token',
      user: { id: 1, email: 'test@example.com' },
    };

    (AuthAPI.login as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ email: 'test@example.com', password: 'password' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(AuthAPI.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('handles login error', async () => {
    const error = new Error('Invalid credentials');
    (AuthAPI.login as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ email: 'test@example.com', password: 'wrong' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
```

### 19.4 Error Monitoring with Sentry

```bash
npx expo install @sentry/react-native
```

Create `src/utils/monitoring.ts`:

```typescript
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export const initMonitoring = () => {
  if (__DEV__) {
    console.log('Sentry disabled in development');
    return;
  }

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: Constants.expoConfig?.extra?.environment || 'production',
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: 0.2, // 20% of transactions
    attachStacktrace: true,
    // Filter out sensitive data
    beforeSend(event) {
      // Remove email from user context
      if (event.user?.email) {
        event.user.email = '[REDACTED]';
      }
      return event;
    },
  });
};

// Capture errors with context
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
};

// Track user for session
export const setMonitoringUser = (user: { id: number; email: string } | null) => {
  if (user) {
    Sentry.setUser({ id: user.id.toString() });
  } else {
    Sentry.setUser(null);
  }
};
```

### 19.5 Analytics Integration

Create `src/utils/analytics.ts`:

```typescript
import * as Analytics from 'expo-firebase-analytics';

export const analytics = {
  // Screen views
  logScreenView: async (screenName: string) => {
    await Analytics.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    });
  },

  // Booking funnel
  logBookingStarted: async (flowId: string) => {
    await Analytics.logEvent('booking_started', { flow_id: flowId });
  },

  logBookingStepCompleted: async (stepType: string, stepIndex: number) => {
    await Analytics.logEvent('booking_step_completed', {
      step_type: stepType,
      step_index: stepIndex,
    });
  },

  logBookingCompleted: async (eventId: string, totalAmount: number) => {
    await Analytics.logEvent('booking_completed', {
      event_id: eventId,
      value: totalAmount,
      currency: 'PHP',
    });
  },

  logBookingAbandoned: async (stepType: string) => {
    await Analytics.logEvent('booking_abandoned', { last_step: stepType });
  },

  // Payments
  logPaymentInitiated: async (amount: number) => {
    await Analytics.logEvent('begin_checkout', {
      value: amount,
      currency: 'PHP',
    });
  },

  logPaymentCompleted: async (amount: number, method: string) => {
    await Analytics.logEvent('purchase', {
      value: amount,
      currency: 'PHP',
      payment_method: method,
    });
  },

  // User actions
  logLogin: async (method: string = 'email') => {
    await Analytics.logEvent('login', { method });
  },

  logSignUp: async (method: string = 'email') => {
    await Analytics.logEvent('sign_up', { method });
  },
};
```

### 19.6 Test Commands

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

---

## 20. Production Security and Configuration

This section covers critical security features and production configurations required before app store submission.

### 20.1 Certificate Pinning

Implement SSL certificate pinning to prevent man-in-the-middle attacks.

Create `src/utils/certificatePinning.ts`:

```typescript
// src/utils/certificatePinning.ts
import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

// SHA256 hashes of your server's SSL certificate public keys
// Generate these using: openssl s_client -connect api.lifeplace.com:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
const CERTIFICATE_PINS = {
  production: [
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Primary cert
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup cert
  ],
  staging: [
    'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
  ],
};

/**
 * For React Native, use react-native-ssl-pinning or TrustKit for native pinning
 * This is a simplified example - production apps should use native solutions
 */
export const createPinnedAxiosInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // In production, use native SSL pinning libraries:
  // iOS: TrustKit
  // Android: OkHttp Certificate Pinner

  // This requires building with native code (development build, not Expo Go)
  // See: expo-dev-client documentation

  return instance;
};

/**
 * Verify response integrity using content hash
 */
export const verifyResponseIntegrity = async (
  data: string,
  expectedHash: string
): Promise<boolean> => {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    return hash === expectedHash;
  } catch {
    return false;
  }
};
```

For proper native certificate pinning, create a development build with native modules:

```bash
# Install required packages
npx expo install expo-dev-client

# Create development build with pinning support
eas build --profile development --platform ios
eas build --profile development --platform android
```

### 20.2 Biometric Authentication

Implement biometric authentication (Face ID, Touch ID, Fingerprint) for secure app access.

```bash
npx expo install expo-local-authentication expo-secure-store
```

Create `src/services/biometricAuth.ts`:

```typescript
// src/services/biometricAuth.ts
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const BIOMETRIC_TOKEN_KEY = '@biometric_auth_token';

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  availableTypes: LocalAuthentication.AuthenticationType[];
  securityLevel: LocalAuthentication.SecurityLevel;
}

export const BiometricAuth = {
  /**
   * Check device biometric capabilities
   */
  getCapabilities: async (): Promise<BiometricCapabilities> => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const availableTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

    return {
      hasHardware,
      isEnrolled,
      availableTypes,
      securityLevel,
    };
  },

  /**
   * Get human-readable biometric type name
   */
  getBiometricTypeName: async (): Promise<string> => {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Scanner';
    }

    return 'Biometrics';
  },

  /**
   * Check if biometric login is enabled for this user
   */
  isEnabled: async (): Promise<boolean> => {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Enable biometric login - store token securely
   */
  enable: async (authToken: string): Promise<boolean> => {
    try {
      const capabilities = await BiometricAuth.getCapabilities();

      if (!capabilities.hasHardware || !capabilities.isEnrolled) {
        throw new Error('Biometric authentication not available');
      }

      // Prompt user to authenticate before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      if (!result.success) {
        return false;
      }

      // Store the auth token securely
      await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, authToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

      return true;
    } catch (error) {
      console.error('Failed to enable biometric auth:', error);
      return false;
    }
  },

  /**
   * Disable biometric login
   */
  disable: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
    }
  },

  /**
   * Authenticate with biometrics and return stored token
   */
  authenticate: async (): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      const isEnabled = await BiometricAuth.isEnabled();
      if (!isEnabled) {
        return { success: false, error: 'Biometric login not enabled' };
      }

      const biometricName = await BiometricAuth.getBiometricTypeName();

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Login with ${biometricName}`,
        cancelLabel: 'Use Password',
        disableDeviceFallback: true,
      });

      if (result.success) {
        const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
        if (token) {
          return { success: true, token };
        }
        return { success: false, error: 'No stored credentials found' };
      }

      // Handle different error types
      if (result.error === 'user_cancel') {
        return { success: false, error: 'Authentication cancelled' };
      }
      if (result.error === 'user_fallback') {
        return { success: false, error: 'fallback' };
      }
      if (result.error === 'lockout') {
        return { success: false, error: 'Too many attempts. Please try again later.' };
      }

      return { success: false, error: result.error || 'Authentication failed' };
    } catch (error) {
      return { success: false, error: 'Biometric authentication error' };
    }
  },

  /**
   * Update stored token (e.g., after token refresh)
   */
  updateStoredToken: async (newToken: string): Promise<void> => {
    const isEnabled = await BiometricAuth.isEnabled();
    if (isEnabled) {
      await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, newToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
  },
};
```

### 20.3 Biometric Settings Screen

Create `src/app/(main)/settings/security.tsx`:

```typescript
// src/app/(main)/settings/security.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FingerprintSimple, ShieldCheck, Lock } from 'phosphor-react-native';

import { colors, spacing, typeScale } from '@/theme';
import { BiometricAuth, BiometricCapabilities } from '@/services/biometricAuth';
import { useAuthStore } from '@/stores/authStore';

export default function SecuritySettingsScreen() {
  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore(state => state.accessToken);

  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricName, setBiometricName] = useState('Biometrics');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const [caps, enabled, name] = await Promise.all([
        BiometricAuth.getCapabilities(),
        BiometricAuth.isEnabled(),
        BiometricAuth.getBiometricTypeName(),
      ]);
      setCapabilities(caps);
      setBiometricEnabled(enabled);
      setBiometricName(name);
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Enable biometrics
      if (!accessToken) {
        Alert.alert('Error', 'Please log in again to enable biometric login');
        return;
      }

      const success = await BiometricAuth.enable(accessToken);
      if (success) {
        setBiometricEnabled(true);
        Alert.alert('Success', `${biometricName} login enabled`);
      } else {
        Alert.alert('Error', 'Failed to enable biometric login');
      }
    } else {
      // Disable biometrics
      Alert.alert(
        'Disable Biometric Login',
        `Are you sure you want to disable ${biometricName} login?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await BiometricAuth.disable();
              setBiometricEnabled(false);
            },
          },
        ]
      );
    }
  };

  const canUseBiometrics = capabilities?.hasHardware && capabilities?.isEnrolled;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ShieldCheck size={24} color={colors.primary.forest} />
          <Text style={styles.sectionTitle}>Authentication</Text>
        </View>

        {/* Biometric Login */}
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <FingerprintSimple size={24} color={colors.primary.forest} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{biometricName} Login</Text>
            <Text style={styles.settingDescription}>
              {canUseBiometrics
                ? `Use ${biometricName} for quick and secure login`
                : 'Not available on this device'}
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={!canUseBiometrics || isLoading}
            trackColor={{ false: colors.neutral.lightGray, true: colors.primary.forest }}
            thumbColor={colors.neutral.white}
          />
        </View>

        {/* Passcode Lock */}
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Lock size={24} color={colors.primary.forest} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>App Lock</Text>
            <Text style={styles.settingDescription}>
              Require authentication when opening the app
            </Text>
          </View>
          <Switch
            value={false}
            onValueChange={() => {
              Alert.alert('Coming Soon', 'App lock will be available in a future update');
            }}
            trackColor={{ false: colors.neutral.lightGray, true: colors.primary.forest }}
            thumbColor={colors.neutral.white}
          />
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          Your biometric data never leaves your device. We use your device's
          secure enclave to verify your identity.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.offWhite,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typeScale.labelLarge,
    color: colors.primary.charcoal,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.offWhite,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.forest + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.charcoal,
    marginBottom: 2,
  },
  settingDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  infoSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primary.forest + '10',
    borderRadius: 12,
  },
  infoText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
});
```

### 20.4 Deep Linking Configuration

Complete deep linking setup for production with Universal Links (iOS) and App Links (Android).

Update `app.json`:

```json
{
  "expo": {
    "name": "LifePlace",
    "slug": "lifeplace-app",
    "scheme": "lifeplace",
    "ios": {
      "bundleIdentifier": "com.lifeplace.app",
      "associatedDomains": [
        "applinks:app.lifeplace.com",
        "applinks:www.lifeplace.com"
      ]
    },
    "android": {
      "package": "com.lifeplace.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "app.lifeplace.com",
              "pathPrefix": "/"
            },
            {
              "scheme": "lifeplace"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

Host the Apple App Site Association file at `https://app.lifeplace.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.lifeplace.app",
        "paths": [
          "/booking/*",
          "/events/*",
          "/payments/*",
          "/contracts/*"
        ]
      }
    ]
  }
}
```

Host the Android Asset Links file at `https://app.lifeplace.com/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.lifeplace.app",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

### 20.5 Secure Token Storage

Create `src/utils/secureStorage.ts`:

```typescript
// src/utils/secureStorage.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: '@auth_access_token',
  REFRESH_TOKEN: '@auth_refresh_token',
  USER_DATA: '@auth_user_data',
  DEVICE_ID: '@device_id',
} as const;

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  // iOS: Only accessible when device is unlocked
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const SecureStorage = {
  // Token management
  setTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken, SECURE_OPTIONS),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken, SECURE_OPTIONS),
    ]);
  },

  getAccessToken: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  getRefreshToken: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  clearTokens: async (): Promise<void> => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    ]);
  },

  // User data (cached for offline access)
  setUserData: async (user: object): Promise<void> => {
    await SecureStore.setItemAsync(
      KEYS.USER_DATA,
      JSON.stringify(user),
      SECURE_OPTIONS
    );
  },

  getUserData: async <T>(): Promise<T | null> => {
    const data = await SecureStore.getItemAsync(KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  clearUserData: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(KEYS.USER_DATA);
  },

  // Device ID for analytics and push notifications
  getOrCreateDeviceId: async (): Promise<string> => {
    let deviceId = await SecureStore.getItemAsync(KEYS.DEVICE_ID);

    if (!deviceId) {
      // Generate a UUID-like device ID
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
      await SecureStore.setItemAsync(KEYS.DEVICE_ID, deviceId, SECURE_OPTIONS);
    }

    return deviceId;
  },

  // Clear all secure data (on logout)
  clearAll: async (): Promise<void> => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER_DATA),
      // Note: Device ID is intentionally NOT cleared
    ]);
  },
};
```

### 20.6 App Security Checks

Create `src/utils/securityChecks.ts`:

```typescript
// src/utils/securityChecks.ts
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface SecurityStatus {
  isSecure: boolean;
  warnings: string[];
  isRooted: boolean;
  isEmulator: boolean;
  isDebugMode: boolean;
}

export const SecurityChecks = {
  /**
   * Run security checks on app startup
   */
  runSecurityChecks: async (): Promise<SecurityStatus> => {
    const warnings: string[] = [];
    let isSecure = true;

    // Check if running on emulator/simulator
    const isEmulator = !Device.isDevice;
    if (isEmulator) {
      warnings.push('Running on simulator/emulator');
      // Don't block - valid for development
    }

    // Check for debug mode
    const isDebugMode = __DEV__;
    if (isDebugMode) {
      warnings.push('App is running in debug mode');
      isSecure = false;
    }

    // Check for rooted/jailbroken device (basic check)
    // Note: This is a basic check - production apps should use specialized libraries
    const isRooted = await SecurityChecks.isDeviceRooted();
    if (isRooted) {
      warnings.push('Device may be rooted/jailbroken');
      isSecure = false;
    }

    return {
      isSecure,
      warnings,
      isRooted,
      isEmulator,
      isDebugMode,
    };
  },

  /**
   * Basic root/jailbreak detection
   * For production, use libraries like:
   * - react-native-root-beer (Android)
   * - DTTJailbreakDetection (iOS)
   */
  isDeviceRooted: async (): Promise<boolean> => {
    // This is a placeholder - implement with native modules for production
    // Expo's managed workflow has limited root detection capabilities

    if (Platform.OS === 'android') {
      // Check for common root indicators
      // In production, use react-native-root-beer
      return false;
    }

    if (Platform.OS === 'ios') {
      // Check for jailbreak indicators
      // In production, use DTTJailbreakDetection
      return false;
    }

    return false;
  },

  /**
   * Validate the app binary hasn't been tampered with
   */
  validateAppIntegrity: async (): Promise<boolean> => {
    // In production, implement:
    // - iOS: DeviceCheck / App Attest API
    // - Android: Play Integrity API
    return true;
  },
};
```

### 20.7 Environment Configuration

Create `src/config/environment.ts`:

```typescript
// src/config/environment.ts
import Constants from 'expo-constants';

export type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  apiUrl: string;
  stripePublishableKey: string;
  sentryDsn: string;
  analyticsEnabled: boolean;
  debugEnabled: boolean;
  minAppVersion: string;
}

const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: 'http://localhost:8000/api',
    stripePublishableKey: 'pk_test_...',
    sentryDsn: '',
    analyticsEnabled: false,
    debugEnabled: true,
    minAppVersion: '1.0.0',
  },
  staging: {
    apiUrl: 'https://staging-api.lifeplace.com/api',
    stripePublishableKey: 'pk_test_...',
    sentryDsn: 'https://...',
    analyticsEnabled: true,
    debugEnabled: true,
    minAppVersion: '1.0.0',
  },
  production: {
    apiUrl: 'https://api.lifeplace.com/api',
    stripePublishableKey: 'pk_live_...',
    sentryDsn: 'https://...',
    analyticsEnabled: true,
    debugEnabled: false,
    minAppVersion: '1.0.0',
  },
};

const getEnvironment = (): Environment => {
  const env = Constants.expoConfig?.extra?.environment as Environment;
  return env || 'development';
};

export const environment = getEnvironment();
export const config = configs[environment];

// Version checking
export const isVersionSupported = (currentVersion: string): boolean => {
  const current = currentVersion.split('.').map(Number);
  const minimum = config.minAppVersion.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (current[i] > minimum[i]) return true;
    if (current[i] < minimum[i]) return false;
  }

  return true;
};
```

### 20.8 Force Update Check

Create `src/hooks/useVersionCheck.ts`:

```typescript
// src/hooks/useVersionCheck.ts
import { useEffect, useState } from 'react';
import * as Application from 'expo-application';
import { Alert, Linking, Platform } from 'react-native';

import { api } from '@/apis/client';
import { isVersionSupported } from '@/config/environment';

interface VersionInfo {
  minVersion: string;
  latestVersion: string;
  updateUrl: string;
  forceUpdate: boolean;
}

export function useVersionCheck() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await api.get<VersionInfo>('/api/mobile/version/');
        const versionInfo = response.data;
        const currentVersion = Application.nativeApplicationVersion || '1.0.0';

        if (!isVersionSupported(currentVersion)) {
          setNeedsUpdate(true);
          setIsForceUpdate(versionInfo.forceUpdate);

          if (versionInfo.forceUpdate) {
            showForceUpdateAlert(versionInfo.updateUrl);
          } else {
            showOptionalUpdateAlert(versionInfo.updateUrl);
          }
        }
      } catch (error) {
        // Silently fail - don't block app usage for version check failures
        console.warn('Version check failed:', error);
      }
    };

    checkVersion();
  }, []);

  const showForceUpdateAlert = (updateUrl: string) => {
    Alert.alert(
      'Update Required',
      'A new version of LifePlace is available. Please update to continue using the app.',
      [
        {
          text: 'Update Now',
          onPress: () => openStore(updateUrl),
        },
      ],
      { cancelable: false }
    );
  };

  const showOptionalUpdateAlert = (updateUrl: string) => {
    Alert.alert(
      'Update Available',
      'A new version of LifePlace is available with new features and improvements.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => openStore(updateUrl),
        },
      ]
    );
  };

  const openStore = (updateUrl: string) => {
    const storeUrl =
      Platform.OS === 'ios'
        ? `https://apps.apple.com/app/id${updateUrl}`
        : `https://play.google.com/store/apps/details?id=${updateUrl}`;

    Linking.openURL(storeUrl);
  };

  return { needsUpdate, isForceUpdate };
}
```

### 20.9 Production Checklist

Before submitting to app stores, verify:

**Security**
- [ ] SSL certificate pinning implemented (requires development build)
- [ ] Biometric authentication working
- [ ] Tokens stored in SecureStore
- [ ] Root/jailbreak detection implemented
- [ ] Debug logging disabled in production

**Deep Linking**
- [ ] Apple App Site Association file hosted and verified
- [ ] Android Asset Links file hosted and verified
- [ ] All deep link routes tested
- [ ] Universal Links / App Links verified

**Push Notifications**
- [ ] APNs certificates configured for iOS
- [ ] FCM configured for Android
- [ ] Device token registration working
- [ ] Notification channels created (Android)

**Analytics & Monitoring**
- [ ] Sentry error tracking configured
- [ ] Firebase Analytics events tracked
- [ ] Crash reporting verified
- [ ] Performance monitoring enabled

**Compliance**
- [ ] Privacy Policy accessible in-app
- [ ] Terms of Service accessible in-app
- [ ] App Tracking Transparency (iOS 14.5+) implemented
- [ ] Data deletion capability available

---

## 21. Deployment

This section covers deploying the LifePlace mobile app to the App Store and Google Play using Expo Application Services (EAS).

### 21.1 EAS CLI Setup

Install and configure EAS CLI:

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Verify login
eas whoami
```

### 21.2 EAS Configuration

Create `eas.json` in the project root:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:8000/api",
        "EXPO_PUBLIC_ENVIRONMENT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.lifeplace.com/api",
        "EXPO_PUBLIC_ENVIRONMENT": "staging"
      }
    },
    "production": {
      "distribution": "store",
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.lifeplace.com/api",
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### 21.3 App Configuration

Update `app.json` for store submission:

```json
{
  "expo": {
    "name": "LifePlace",
    "slug": "lifeplace",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#F5F2EF"
    },
    "ios": {
      "bundleIdentifier": "com.lifeplace.app",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "LifePlace needs camera access to upload photos for your events.",
        "NSPhotoLibraryUsageDescription": "LifePlace needs photo library access to upload photos for your events."
      }
    },
    "android": {
      "package": "com.lifeplace.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#F5F2EF"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "@sentry/react-native/expo",
        {
          "organization": "your-org",
          "project": "lifeplace-mobile"
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": true
          },
          "android": {
            "newArchEnabled": true
          }
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### 21.4 Environment Variables

Create `.env` files for different environments (these are loaded at build time):

```bash
# .env.development
EXPO_PUBLIC_API_URL=http://localhost:8000/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
EXPO_PUBLIC_ENVIRONMENT=development

# .env.staging
EXPO_PUBLIC_API_URL=https://staging-api.lifeplace.com/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
EXPO_PUBLIC_ENVIRONMENT=staging

# .env.production
EXPO_PUBLIC_API_URL=https://api.lifeplace.com/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
EXPO_PUBLIC_ENVIRONMENT=production
```

Access environment variables in code:

```typescript
// src/config/env.ts
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api',
  stripeKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
  isProduction: process.env.EXPO_PUBLIC_ENVIRONMENT === 'production',
};
```

### 21.5 Building the App

Build commands for different profiles:

```bash
# Development build (with dev client for testing)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (for internal testing)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production build (for store submission)
eas build --profile production --platform ios
eas build --profile production --platform android

# Build both platforms
eas build --profile production --platform all
```

### 21.6 iOS App Store Submission

#### Prerequisites
1. Apple Developer Account ($99/year)
2. App Store Connect app created
3. App icons and screenshots prepared

#### Submit to App Store

```bash
# Submit the latest production build
eas submit --platform ios

# Or submit a specific build
eas submit --platform ios --id BUILD_ID
```

#### App Store Connect Checklist
- [ ] App name, subtitle, description
- [ ] Keywords for search
- [ ] Screenshots (6.7", 6.5", 5.5" iPhones, iPad Pro)
- [ ] App preview videos (optional)
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating questionnaire
- [ ] App Review information (login credentials for testing)

### 21.7 Google Play Store Submission

#### Prerequisites
1. Google Play Developer Account ($25 one-time)
2. Service account with access to Google Play Developer API
3. App created in Google Play Console

#### Create Service Account

1. Go to Google Cloud Console
2. Create a service account
3. Grant "Service Account User" role
4. Create JSON key and download
5. In Google Play Console, invite the service account email with "Release Manager" access

#### Submit to Play Store

```bash
# Submit the latest production build
eas submit --platform android

# Or submit a specific build
eas submit --platform android --id BUILD_ID
```

#### Play Store Checklist
- [ ] Store listing (title, short/full description)
- [ ] Graphics (512x512 icon, 1024x500 feature graphic)
- [ ] Screenshots (phone and tablet)
- [ ] Content rating questionnaire
- [ ] Target audience and content
- [ ] Privacy policy URL
- [ ] Data safety form

### 21.8 Over-the-Air (OTA) Updates

EAS Update allows pushing JavaScript updates without app store review:

```bash
# Configure updates in eas.json
# Add to "production" profile:
{
  "channel": "production"
}

# Publish an update
eas update --channel production --message "Bug fix for login screen"

# Preview before publishing
eas update --channel preview --message "New feature preview"
```

Configure update behavior in `app.json`:

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

Handle updates in code:

```typescript
// src/utils/updates.ts
import * as Updates from 'expo-updates';

export async function checkForUpdates() {
  if (__DEV__) return; // Skip in development

  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Optionally prompt user or auto-reload
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}
```

### 21.9 Release Checklist

Before each release:

- [ ] All tests passing (`npm run test:ci`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No lint errors (`npm run lint`)
- [ ] Tested on physical iOS device
- [ ] Tested on physical Android device
- [ ] Version number incremented in `app.json`
- [ ] Changelog updated
- [ ] Backend API compatibility verified
- [ ] Sentry release created
- [ ] Analytics events verified

### 21.10 Monitoring Post-Launch

After release, monitor:

1. **Sentry Dashboard**: Crash reports and error rates
2. **Firebase Analytics**: User engagement, funnel completion
3. **App Store Connect**: Crash reports, user reviews
4. **Google Play Console**: ANRs, crashes, ratings
5. **Backend Logs**: API errors, slow endpoints

---

## 22. Appendix

### 22.1 Type Definitions

Create `src/types/auth.types.ts`:

```typescript
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'CLIENT' | 'ADMIN';
  is_active: boolean;
  date_joined: string;
  profile?: UserProfile;
}

export interface UserProfile {
  phone?: string;
  company?: string;
  display_timezone: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
}
```

Create `src/types/booking.types.ts`:

```typescript
export interface BookingFlow {
  id: string;
  name: string;
  description?: string;
  event_type?: number;
  event_type_name: string | null;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  enable_progress_saving: boolean;
  max_advance_booking_days: number;
  min_advance_booking_days: number;
  enabled_steps: BookingFlowStep[];
  total_steps: number;
  is_active: boolean;
}

export type StepType =
  | 'introduction'
  | 'venue_selection'
  | 'date_time'
  | 'questionnaire'
  | 'package_selection'
  | 'addon_selection'
  | 'pricing_summary'
  | 'contact_info'
  | 'payment_info'
  | 'confirmation';

export interface BookingFlowStep {
  id: string;
  booking_flow: string;
  step_type: StepType;
  step_type_display: string;
  description: string;
  order: number;
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
  display_conditions: Record<string, unknown>;
  configuration: Record<string, unknown>;
  validation_rules: Record<string, unknown>;
}

export interface BookingSession {
  session_id: string;
  booking_flow: string;
  current_step: BookingFlowStep | null;
  progress_percentage: number;
  expires_at: string;
  is_completed: boolean;
  is_abandoned: boolean;
  total_price: string;
  updated_at: string;
  booking_data: Record<string, unknown>;
  created_at: string;
}

export interface BookingData {
  selectedVenues: string[];
  selectedPackages: string[];
  selectedAddons: string[];
  eventDate: string | null;
  endDate: string | null;
  duration: number | null;
  numParticipants: number | null;
  contactInfo: ContactInfo | null;
  questionnaireResponses: Record<string, unknown>;
}

export interface ContactInfo {
  full_name: string;
  email: string;
  phone: string;
  company?: string;
}

export interface StartSessionResponse {
  session: BookingSession;
  first_step: BookingFlowStep;
}

export interface UpdateSessionRequest {
  step_type: StepType;
  data: Record<string, unknown>;
}

export interface ValidateStepRequest {
  step_type: StepType;
  data: Record<string, unknown>;
}

export interface ValidateStepResponse {
  is_valid: boolean;
  errors: Record<string, string[]>;
}

export interface CompleteSessionRequest {
  completion_type: 'BOOKING' | 'QUOTE_REQUEST';
  payment_gateway_id?: string;
}
```

### 22.2 Useful Commands

```bash
# Development
npx expo start                    # Start dev server
npx expo start --ios              # Start with iOS simulator
npx expo start --android          # Start with Android emulator
npx expo start --clear            # Clear cache and start

# Building
eas build --platform ios          # Build iOS app
eas build --platform android      # Build Android app
eas build --platform all          # Build both platforms

# Submitting to stores
eas submit --platform ios         # Submit to App Store
eas submit --platform android     # Submit to Google Play

# Testing
npm test                          # Run tests
npm run test:watch                # Run tests in watch mode
npm run test:coverage             # Run with coverage

# Linting & Type checking
npm run lint                      # Run ESLint
npm run type-check                # Run TypeScript check

# Dependencies
npx expo-doctor                   # Check for issues
npx expo install --check          # Check for outdated packages
```

### 22.3 Learning Resources

**React Native**
- [Official Documentation](https://reactnative.dev/docs/getting-started)
- [React Native Express](https://www.reactnative.express/)

**Expo**
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

**React Query**
- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/react/overview)

**State Management**
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)

**UI/UX**
- [Material Design 3](https://m3.material.io/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

## Summary

This development guide provides a complete roadmap for building the LifePlace mobile app with:

1. **Complete macOS environment setup** from scratch
2. **Expo SDK 54 project initialization** with TypeScript and React Native 0.81
3. **Navigation architecture** using Expo Router
4. **State management** with Zustand + React Query
5. **API integration** with the existing Django backend
6. **Authentication system** with JWT tokens and secure storage
7. **All major screens** matching client-portal features
8. **Component library** following the STYLING_GUIDE.md design system
9. **Error handling** with global error boundaries and API error parsing
10. **Performance optimization** with image optimization, virtualized lists, and memoization
11. **Accessibility** with screen reader support, Dynamic Type, and WCAG compliance
12. **Offline support** with persistent storage, mutation queuing, and edge case handling
13. **Testing and monitoring** with Jest, Sentry error tracking, and Firebase Analytics

Follow this guide step by step to build a production-ready mobile app that provides full feature parity with the LifePlace client-portal web application.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.3 | December 2025 | Added comprehensive sections for Error Handling (ErrorBoundary, API error handler, network state), Performance Optimization (expo-image, FlashList, memoization, bundle size), Accessibility (VoiceOver/TalkBack, Dynamic Type, color contrast), Offline Support (storage persistence, mutation queuing, edge cases), Testing & Monitoring (Jest setup, Sentry, Firebase Analytics), and Deployment (EAS Build, App Store/Play Store submission, OTA updates). Updated Table of Contents and Summary. |
| 1.2 | December 2025 | Verified API endpoints against backend URLs. Added complete API endpoint reference. Fixed Payments API to match `/api/payments/client/` structure. Added CSRF note for mobile. |
| 1.1 | December 2025 | Updated to Expo SDK 54, React Native 0.81, React 19. Fixed API endpoints to match actual client-portal implementation. |
| 1.0 | December 2025 | Initial comprehensive guide. |

---

*Last Updated: December 2025*
*Version: 1.3*
