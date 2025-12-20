# LifePlace React Native Mobile App Development Roadmap

## Executive Summary

This document provides a comprehensive development roadmap for building a React Native mobile app for LifePlace, an event management platform. Based on thorough analysis of the existing client-portal web application and backend APIs, this roadmap outlines all required screens, technical architecture, development phases, and deployment guidance.

---

## Part 1: Business Scope Analysis

### Platform Overview
LifePlace is a full-stack event management platform that enables clients to:
- Browse and book event venues (weddings, debuts, corporate events)
- Complete multi-step booking flows with payment processing
- Manage their events, contracts, quotes, and tasks
- View and pay invoices
- Upload and download documents
- Communicate with the LifePlace team
- Track VIP status and rewards

### Target Users
**Primary Users (Clients):**
- Event planners booking venues
- Couples planning weddings
- Corporate clients booking corporate events
- Individuals planning celebrations (debuts, birthdays)

### Key Business Features
1. **Event Discovery & Booking** - Browse venues, check availability, complete bookings
2. **Event Management** - Track event progress, complete tasks, manage documents
3. **Financial Management** - View invoices, make payments, track payment history
4. **Contract Management** - View and sign contracts digitally
5. **Communication** - View email/SMS history, notifications
6. **VIP/Loyalty Program** - Track status, redeem benefits

---

## Part 2: Complete Screen Inventory

Based on analysis of the client-portal web application, here are all screens needed for the mobile app:

### Authentication Screens (6 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 1 | **Splash Screen** | App loading with LifePlace branding | P0 |
| 2 | **Onboarding** | 3-4 slide intro to app features | P1 |
| 3 | **Login** | Email/password authentication | P0 |
| 4 | **Register** | New account creation | P0 |
| 5 | **Forgot Password** | Password reset request | P1 |
| 6 | **Reset Password** | New password entry with token | P1 |

### Home & Discovery Screens (5 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 7 | **Home** | Landing page with venues, promotions, CTA | P0 |
| 8 | **Venue List** | Browse all available venues | P0 |
| 9 | **Venue Details** | Single venue with gallery, amenities, pricing | P0 |
| 10 | **About Us** | Company information, story | P2 |
| 11 | **Facilities Gallery** | Photo gallery of all facilities | P2 |

### Booking Flow Screens (10 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 12 | **Event Type Selection** | Choose wedding, debut, corporate, etc. | P0 |
| 13 | **Booking Introduction** | Terms, conditions, welcome | P0 |
| 14 | **Date & Time Selection** | Calendar picker with availability | P0 |
| 15 | **Venue Selection** | Multi-venue selection (if applicable) | P0 |
| 16 | **Package Selection** | Choose event packages | P0 |
| 17 | **Add-ons Selection** | Optional add-ons | P0 |
| 18 | **Questionnaire** | Dynamic form questions | P0 |
| 19 | **Contact Information** | Client details, account creation | P0 |
| 20 | **Payment** | Payment method, deposit/full | P0 |
| 21 | **Booking Confirmation** | Success page with details | P0 |

### Dashboard Screens (2 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 22 | **Dashboard** | Overview of events, actions, finances | P0 |
| 23 | **Action Center** | All pending tasks, quotes, contracts, payments | P0 |

### Event Management Screens (5 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 24 | **Events List** | All client events with filters | P0 |
| 25 | **Event Details** | Full event info, tabs for sections | P0 |
| 26 | **Event Timeline** | Activity history | P1 |
| 27 | **Event Tasks** | To-do items with completion | P1 |
| 28 | **Event Feedback** | Submit ratings and reviews | P2 |

### Financial Screens (5 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 29 | **Financial Portal** | Payment summary, tabs | P0 |
| 30 | **Invoices List** | All invoices with status | P0 |
| 31 | **Invoice Details** | Single invoice with pay option | P0 |
| 32 | **Payment History** | Past payments | P1 |
| 33 | **Payment Methods** | Saved cards/accounts | P1 |

### Quotes & Contracts Screens (4 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 34 | **Quotes List** | All quotes with status | P0 |
| 35 | **Quote Details** | Quote breakdown, accept/reject | P0 |
| 36 | **Contracts List** | All contracts | P0 |
| 37 | **Contract Details** | View and sign contracts | P0 |

### Documents Screens (2 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 38 | **Documents** | All documents with filters | P1 |
| 39 | **Document Viewer** | PDF/image viewer | P1 |

### Communication Screens (2 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 40 | **Records/Messages** | Email/SMS history | P1 |
| 41 | **Message Detail** | Single message view | P1 |

### Profile & Settings Screens (4 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 42 | **Profile** | User information, edit | P0 |
| 43 | **Change Password** | Password update | P1 |
| 44 | **Notification Settings** | Preferences per category | P1 |
| 45 | **Help & Support** | FAQs, contact support | P2 |

### VIP/Loyalty Screens (3 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 46 | **VIP Status** | Current tier, points | P2 |
| 47 | **VIP Benefits** | Available benefits | P2 |
| 48 | **Redeem Benefit** | Use points/benefits | P2 |

### Utility Screens (2 screens)

| # | Screen Name | Description | Priority |
|---|-------------|-------------|----------|
| 49 | **Notifications** | In-app notification list | P1 |
| 50 | **Search** | Global search across app | P2 |

---

## Part 3: Screen Priority Summary

### Phase 1 - MVP (P0): 26 screens
Essential for app launch - core booking and event management

### Phase 2 - Enhanced (P1): 14 screens
Important features for complete experience

### Phase 3 - Complete (P2): 10 screens
Nice-to-have features and polish

**Total: 50 screens**

---

## Part 4: Technical Architecture

### Recommended Tech Stack

```
Framework:        React Native 0.73+ with New Architecture
Language:         TypeScript 5.x
Navigation:       React Navigation 6.x (Native Stack + Bottom Tabs)
State Management: Zustand (global) + React Query (server state)
API Layer:        Axios with interceptors
Forms:            React Hook Form + Zod validation
UI Components:    Custom design system + React Native Paper/Elements
Animations:       React Native Reanimated 3.x
Payments:         @stripe/stripe-react-native
Storage:          AsyncStorage + MMKV (encrypted)
Push:             Firebase Cloud Messaging (FCM) / APNs
Authentication:   JWT with secure token storage
```

### Project Structure

```
lifeplace-mobile/
├── src/
│   ├── api/                    # API layer
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.api.ts
│   │   ├── events.api.ts
│   │   ├── booking.api.ts
│   │   ├── financial.api.ts
│   │   ├── contracts.api.ts
│   │   └── ...
│   ├── components/             # Reusable components
│   │   ├── common/             # Buttons, Cards, Inputs
│   │   ├── booking/            # Booking flow components
│   │   ├── events/             # Event components
│   │   └── ...
│   ├── navigation/             # Navigation config
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   ├── BookingNavigator.tsx
│   │   └── linking.ts
│   ├── screens/                # Screen components
│   │   ├── auth/
│   │   ├── home/
│   │   ├── booking/
│   │   ├── events/
│   │   ├── financial/
│   │   ├── contracts/
│   │   ├── profile/
│   │   └── ...
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useEvents.ts
│   │   ├── useBooking.ts
│   │   └── ...
│   ├── store/                  # Global state (Zustand)
│   │   ├── authStore.ts
│   │   ├── bookingStore.ts
│   │   └── ...
│   ├── types/                  # TypeScript types
│   ├── utils/                  # Utilities
│   ├── theme/                  # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   └── App.tsx
├── ios/
├── android/
├── __tests__/
├── app.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── package.json
```

### Navigation Structure

```
AppNavigator
├── AuthStack (when not authenticated)
│   ├── Onboarding
│   ├── Login
│   ├── Register
│   ├── ForgotPassword
│   └── ResetPassword
│
└── MainStack (when authenticated)
    └── BottomTabs
        ├── HomeTab
        │   ├── Home
        │   ├── VenueList
        │   ├── VenueDetails
        │   └── BookingFlow (nested stack)
        │       ├── EventTypeSelection
        │       ├── Introduction
        │       ├── DateTimeSelection
        │       ├── VenueSelection
        │       ├── PackageSelection
        │       ├── AddonsSelection
        │       ├── Questionnaire
        │       ├── ContactInfo
        │       ├── Payment
        │       └── Confirmation
        │
        ├── EventsTab
        │   ├── EventsList
        │   ├── EventDetails
        │   ├── EventTimeline
        │   ├── EventTasks
        │   └── EventFeedback
        │
        ├── FinancialTab
        │   ├── FinancialPortal
        │   ├── InvoicesList
        │   ├── InvoiceDetails
        │   ├── PaymentHistory
        │   └── PaymentMethods
        │
        └── ProfileTab
            ├── Profile
            ├── ChangePassword
            ├── NotificationSettings
            ├── Documents
            ├── Records
            ├── VIPStatus
            └── Help
```

---

## Part 5: Design System (Matching Reference Screenshots)

Based on the aesthetic references you provided (Hotelio, Hootelo, RoomyRumble), here's the design system:

### Color Palette

```typescript
const colors = {
  // Primary - Warm neutrals
  primary: '#1A1A1A',           // Rich black for headers/CTAs
  primaryLight: '#2D2D2D',

  // Secondary - Cream/Beige tones
  secondary: '#F5F1EB',         // Warm cream background
  secondaryLight: '#FAF8F5',

  // Accent - Lime/Yellow (like Hootelo)
  accent: '#D4E157',            // Lime green accent
  accentDark: '#AFB42B',

  // Backgrounds
  background: '#F8F6F3',        // Warm off-white
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9E9E9E',
  textInverse: '#FFFFFF',

  // Status
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',

  // Borders
  border: '#E8E5E0',
  borderLight: '#F0EDE8',
};
```

### Typography

```typescript
const typography = {
  // Display - Large headers
  displayLarge: {
    fontFamily: 'Poppins-Bold',
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1,
  },
  displayMedium: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },

  // Headlines
  headlineLarge: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 28,
    lineHeight: 36,
  },
  headlineMedium: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  headlineSmall: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    lineHeight: 28,
  },

  // Body
  bodyLarge: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
  },

  // Labels
  labelLarge: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    lineHeight: 14,
  },
};
```

### Component Styles

```typescript
// Card with subtle shadow (like reference designs)
const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
};

// Glass morphism card (like Hotelio)
const glassCardStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.3)',
  backdropFilter: 'blur(10px)',
};

// Primary button (dark rounded)
const primaryButtonStyle = {
  backgroundColor: colors.primary,
  borderRadius: 30,
  paddingVertical: 16,
  paddingHorizontal: 32,
};

// Secondary button (outlined)
const secondaryButtonStyle = {
  backgroundColor: 'transparent',
  borderRadius: 30,
  borderWidth: 1,
  borderColor: colors.primary,
  paddingVertical: 16,
  paddingHorizontal: 32,
};

// Accent button (lime green like Hootelo)
const accentButtonStyle = {
  backgroundColor: colors.accent,
  borderRadius: 30,
  paddingVertical: 16,
  paddingHorizontal: 32,
};

// Image card with overlay text
const imageCardStyle = {
  borderRadius: 20,
  overflow: 'hidden',
};

// Input field
const inputStyle = {
  backgroundColor: colors.secondaryLight,
  borderRadius: 16,
  paddingVertical: 16,
  paddingHorizontal: 20,
  borderWidth: 0,
};

// Chip/Tag
const chipStyle = {
  backgroundColor: colors.secondary,
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 16,
};

// Icon badge
const iconBadgeStyle = {
  width: 48,
  height: 48,
  borderRadius: 16,
  backgroundColor: colors.secondary,
  alignItems: 'center',
  justifyContent: 'center',
};
```

### Spacing System

```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Screen padding
  screenPadding: 20,

  // Section spacing
  sectionGap: 32,

  // Card content
  cardPadding: 20,
};
```

### Icon Style
- Line icons (not filled) for navigation
- 24px standard size
- Color: textSecondary for inactive, primary for active
- Consider: Feather Icons, Phosphor Icons, or custom SVGs

---

## Part 6: API Integration Map

### Existing Backend Endpoints (Ready to Use)

**Authentication:**
```
POST /api/users/login/           → Login
POST /api/users/register/        → Register
POST /api/users/token/refresh/   → Refresh token
GET  /api/users/me/              → Get profile
PUT  /api/users/me/              → Update profile
POST /api/users/me/change-password/     → Change password
POST /api/users/password-reset/request/ → Request reset
POST /api/users/password-reset/confirm/{tokenId}/ → Confirm reset
```

**Events:**
```
GET  /api/events/client/events/          → List my events
GET  /api/events/client/events/{id}/     → Event details
GET  /api/events/client/events/{id}/timeline/   → Event timeline
GET  /api/events/client/events/{id}/documents/  → Event documents
GET  /api/events/client/events/{id}/tasks/      → Event tasks
PATCH /api/events/client/events/{id}/tasks/{taskId}/ → Update task
PATCH /api/events/client/events/{id}/update_preferences/ → Update preferences
POST /api/events/client/events/{id}/feedback/   → Submit feedback
POST /api/events/client/events/{id}/upload_file/ → Upload document
```

**Booking Flow:**
```
GET  /api/events/event-types/                    → Event types
GET  /api/bookingflow/public/flows/              → Available flows
GET  /api/bookingflow/public/flows/{id}/         → Flow details
POST /api/bookingflow/public/flows/{id}/start_session/ → Start session
GET  /api/bookingflow/public/flows/session/{sessionId}/ → Get session
PATCH /api/bookingflow/public/flows/session/{sessionId}/update/ → Update step
POST /api/bookingflow/public/flows/session/{sessionId}/complete/ → Complete
GET  /api/events/public/availability/            → Check availability
```

**Financial:**
```
GET  /api/payments/client/invoices/              → List invoices
GET  /api/payments/client/invoices/{id}/         → Invoice details
POST /api/payments/client/invoices/{id}/pay/     → Pay invoice
GET  /api/payments/client/payments/              → Payment history
GET  /api/payments/client/payment-methods/       → Saved methods
POST /api/payments/client/payment-methods/       → Add method
DELETE /api/payments/client/payment-methods/{id}/ → Remove method
GET  /api/payments/public/gateways/              → Payment gateways
```

**Quotes:**
```
GET  /api/sales/client/quotes/                   → List quotes
GET  /api/sales/client/quotes/{id}/              → Quote details
POST /api/sales/client/quotes/{id}/accept/       → Accept quote
POST /api/sales/client/quotes/{id}/reject/       → Reject quote
```

**Contracts:**
```
GET  /api/contracts/client/contracts/            → List contracts
GET  /api/contracts/client/contracts/{id}/       → Contract details
POST /api/contracts/client/contracts/{id}/sign/  → Sign contract
GET  /api/contracts/client/contracts/{id}/download_pdf/ → Download PDF
```

**Communications:**
```
GET  /api/communications/records/                → Communication history
GET  /api/communications/records/{id}/           → Record details
POST /api/communications/records/{id}/mark_as_read/ → Mark read
```

**Notifications:**
```
GET  /api/notifications/notifications/           → All notifications
GET  /api/notifications/notifications/unread/    → Unread only
POST /api/notifications/notifications/{id}/mark_read/ → Mark read
POST /api/notifications/notifications/mark_all_read/ → Mark all read
GET  /api/notifications/preferences/my_preferences/ → Get preferences
PUT  /api/notifications/preferences/update_preferences/ → Update prefs
```

**Venues (Public):**
```
GET  /api/venues/public/                         → List venues
GET  /api/venues/public/{id}/                    → Venue details
```

**VIP:**
```
GET  /api/vip/client/my-status/                  → My VIP status
GET  /api/vip/client/my-benefits/                → My benefits
GET  /api/vip/client/redeemable-benefits/        → Available to redeem
POST /api/vip/client/redeem-benefit/             → Redeem benefit
```

**Workflows:**
```
GET  /api/workflows/client/workflows/events/{eventId}/progress/ → Event workflow
```

---

## Part 7: Development Phases

### Phase 1: Foundation & MVP (Weeks 1-6)

#### Week 1-2: Project Setup & Core Infrastructure
- [ ] Initialize React Native project with TypeScript
- [ ] Configure development environment (iOS/Android simulators)
- [ ] Set up folder structure and architecture
- [ ] Install and configure dependencies:
  - React Navigation
  - React Query
  - Zustand
  - Axios
  - AsyncStorage/MMKV
  - React Native Reanimated
- [ ] Create theme/design system files
- [ ] Build base components (Button, Card, Input, etc.)
- [ ] Set up API client with interceptors
- [ ] Configure environment variables

#### Week 3-4: Authentication & Onboarding
- [ ] Splash screen with branding
- [ ] Onboarding carousel (3-4 screens)
- [ ] Login screen
- [ ] Register screen
- [ ] Forgot password flow
- [ ] JWT token management
- [ ] Secure storage for tokens
- [ ] Auth state persistence
- [ ] Protected route handling

#### Week 5-6: Home & Discovery
- [ ] Home screen with sections:
  - Hero banner/carousel
  - Venue highlights
  - Quick actions
  - Promotions
- [ ] Venue list with filtering
- [ ] Venue details with:
  - Image gallery
  - Amenities list
  - Pricing info
  - Availability preview
  - Book now CTA
- [ ] Bottom tab navigation setup

### Phase 2: Booking Flow (Weeks 7-10)

#### Week 7-8: Booking Core
- [ ] Event type selection
- [ ] Booking session management
- [ ] Introduction step
- [ ] Date/time selection with calendar
- [ ] Availability checking integration
- [ ] Progress indicator component

#### Week 9-10: Booking Completion
- [ ] Venue selection step
- [ ] Package selection with pricing
- [ ] Add-ons selection
- [ ] Questionnaire renderer
- [ ] Contact information form
- [ ] Payment step with Stripe
- [ ] Booking confirmation screen
- [ ] Session recovery functionality

### Phase 3: Event Management (Weeks 11-13)

#### Week 11
- [ ] Events list with filters/search
- [ ] Event details screen with tabs:
  - Overview
  - Timeline
  - Tasks
  - Documents
  - Quotes
  - Contracts
- [ ] Dashboard screen

#### Week 12
- [ ] Task management (view, mark complete)
- [ ] Event timeline view
- [ ] Document viewing and upload
- [ ] Event preferences editing

#### Week 13
- [ ] Quotes list and details
- [ ] Quote accept/reject functionality
- [ ] Contracts list and details
- [ ] Digital signature flow
- [ ] PDF viewing

### Phase 4: Financial & Polish (Weeks 14-16)

#### Week 14
- [ ] Financial portal dashboard
- [ ] Invoices list with status
- [ ] Invoice details with payment
- [ ] Payment processing with Stripe
- [ ] Payment history

#### Week 15
- [ ] Payment methods management
- [ ] Communication records
- [ ] Action center aggregation
- [ ] Profile management
- [ ] Password change

#### Week 16
- [ ] Notification preferences
- [ ] Push notification setup (FCM/APNs)
- [ ] In-app notifications list
- [ ] Help & support screen
- [ ] Final polish and bug fixes

### Phase 5: Enhanced Features (Weeks 17-18)

#### Week 17
- [ ] VIP status screen
- [ ] Benefits and redemption
- [ ] Event feedback submission
- [ ] Global search

#### Week 18
- [ ] Performance optimization
- [ ] Offline support for key features
- [ ] Analytics integration
- [ ] Crash reporting (Sentry/Crashlytics)
- [ ] App icon and splash assets

---

## Part 8: Deployment Guide (First-Time Mobile App)

### Pre-Development Setup

#### 1. Development Environment
```bash
# Install Node.js 18+ via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install React Native CLI
npm install -g react-native-cli

# For iOS: Install Xcode from App Store
# Then install CocoaPods
sudo gem install cocoapods

# For Android: Install Android Studio
# Configure ANDROID_HOME in ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### 2. Project Initialization
```bash
# Create new project
npx react-native init LifePlaceMobile --template react-native-template-typescript

# Navigate to project
cd LifePlaceMobile

# Install iOS pods
cd ios && pod install && cd ..

# Test on simulators
npx react-native run-ios
npx react-native run-android
```

### Apple Developer Account Setup (iOS)

#### 1. Enroll in Apple Developer Program
- Go to https://developer.apple.com/programs/
- Cost: $99/year for individuals, $299/year for organizations
- Required for: TestFlight beta testing, App Store distribution
- Approval time: 24-48 hours typically

#### 2. Create App Identifier
- Log into Apple Developer Portal
- Go to Certificates, Identifiers & Profiles
- Click Identifiers → + button
- Select App IDs → Continue
- Enter:
  - Description: "LifePlace Mobile"
  - Bundle ID: `com.lifeplace.mobile` (Explicit)
- Enable capabilities:
  - Push Notifications
  - Sign In with Apple (optional)
- Register

#### 3. Create Provisioning Profiles
- Development profile (for testing on devices)
- Distribution profile (for TestFlight/App Store)
- Each profile ties your app to your certificates and devices

#### 4. Create Push Notification Key
- Keys → + button → Apple Push Notifications service (APNs)
- Download and save the .p8 file securely
- Note the Key ID
- Use this for Firebase Cloud Messaging setup

### Google Play Console Setup (Android)

#### 1. Create Developer Account
- Go to https://play.google.com/console
- Cost: $25 one-time fee
- Required for: Play Store distribution
- Approval time: Instant after payment

#### 2. Create App Listing
- All apps → Create app
- Enter:
  - App name: "LifePlace"
  - Default language: English
  - App or game: App
  - Free or paid: Free (or Paid if applicable)
- Accept declarations

#### 3. App Signing
- Google manages your app signing key (recommended)
- Or upload your own signing key
- Download upload key for CI/CD

#### 4. Store Listing Assets
Prepare these assets:
- Feature graphic: 1024x500px
- Icon: 512x512px
- Screenshots:
  - Phone: minimum 2, at least 320px on shortest side
  - 7" tablet: optional but recommended
  - 10" tablet: optional but recommended
- Short description: 80 characters max
- Full description: 4000 characters max
- Privacy policy URL (required)

### Firebase Setup (Push Notifications)

#### 1. Create Firebase Project
```bash
# Install Firebase tools
npm install -g firebase-tools

# Login
firebase login
```

- Go to https://console.firebase.google.com/
- Create new project: "LifePlace Mobile"
- Disable Google Analytics (or enable if needed)

#### 2. Add iOS App
- Click iOS icon
- Enter Bundle ID: `com.lifeplace.mobile`
- Download `GoogleService-Info.plist`
- Add to `ios/LifePlaceMobile/`

#### 3. Add Android App
- Click Android icon
- Enter Package name: `com.lifeplace.mobile`
- Download `google-services.json`
- Add to `android/app/`

#### 4. Configure APNs for iOS Push
- Project Settings → Cloud Messaging tab
- Under Apple app configuration
- Upload your APNs authentication key (.p8 file)
- Enter Key ID and Team ID

#### 5. Install in React Native
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging

# iOS
cd ios && pod install && cd ..
```

### Stripe Setup (Payments)

#### 1. Create Stripe Account
- Go to https://dashboard.stripe.com/register
- Complete business verification
- Get API keys (test and live)

#### 2. Install React Native Stripe
```bash
npm install @stripe/stripe-react-native

# iOS
cd ios && pod install && cd ..
```

#### 3. Configure
```typescript
// App.tsx
import { StripeProvider } from '@stripe/stripe-react-native';

const App = () => (
  <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
    {/* App content */}
  </StripeProvider>
);
```

### CI/CD Setup with GitHub Actions

#### iOS Build & Deploy
```yaml
# .github/workflows/ios.yml
name: iOS Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install pods
        run: cd ios && pod install

      - name: Build iOS
        run: |
          xcodebuild -workspace ios/LifePlaceMobile.xcworkspace \
            -scheme LifePlaceMobile \
            -configuration Release \
            -archivePath $PWD/build/LifePlaceMobile.xcarchive \
            archive

      - name: Export IPA
        run: |
          xcodebuild -exportArchive \
            -archivePath $PWD/build/LifePlaceMobile.xcarchive \
            -exportPath $PWD/build \
            -exportOptionsPlist exportOptions.plist

      - name: Upload to TestFlight
        uses: apple-actions/upload-testflight-build@v1
        with:
          app-path: build/LifePlaceMobile.ipa
          issuer-id: ${{ secrets.APPLE_ISSUER_ID }}
          api-key-id: ${{ secrets.APPLE_API_KEY_ID }}
          api-private-key: ${{ secrets.APPLE_API_PRIVATE_KEY }}
```

#### Android Build & Deploy
```yaml
# .github/workflows/android.yml
name: Android Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Build Android
        run: cd android && ./gradlew assembleRelease

      - name: Sign APK
        uses: r0adkll/sign-android-release@v1
        with:
          releaseDirectory: android/app/build/outputs/apk/release
          signingKeyBase64: ${{ secrets.ANDROID_SIGNING_KEY }}
          alias: ${{ secrets.ANDROID_ALIAS }}
          keyStorePassword: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: com.lifeplace.mobile
          releaseFiles: android/app/build/outputs/apk/release/app-release-signed.apk
          track: internal
```

### TestFlight & Internal Testing

#### iOS TestFlight Process
1. Build archive in Xcode or CI
2. Upload to App Store Connect
3. Wait for processing (15-30 minutes)
4. Add internal testers (up to 100, instant access)
5. Add external testers (up to 10,000, requires review)
6. Testers receive invite via email
7. Install via TestFlight app

#### Android Internal Testing
1. Build signed APK/AAB
2. Upload to Play Console
3. Go to Testing → Internal testing
4. Create release
5. Add testers by email
6. Testers get access via Play Store (internal track)

### App Store Submission Checklist

#### iOS App Store Review Requirements
- [ ] App must not crash
- [ ] All features must work as described
- [ ] Privacy policy URL provided
- [ ] App Store screenshots (minimum 3)
- [ ] 4+ age rating form completed
- [ ] App description and keywords
- [ ] Contact information
- [ ] No placeholder content
- [ ] In-app purchases configured (if applicable)
- [ ] Login test account provided (if auth required)

#### Google Play Store Requirements
- [ ] Target API level 33+ (Android 13)
- [ ] App bundle (.aab) format
- [ ] Privacy policy URL
- [ ] Data safety form completed
- [ ] Content rating questionnaire
- [ ] Store listing complete
- [ ] Main store listing screenshots
- [ ] Feature graphic
- [ ] App category selected

### Version Management

```json
// app.json
{
  "name": "LifePlaceMobile",
  "displayName": "LifePlace",
  "version": "1.0.0",
  "buildNumber": "1"  // Increment for each build
}
```

**Versioning Strategy:**
- `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- Major: Breaking changes, major features
- Minor: New features, enhancements
- Patch: Bug fixes, small improvements
- Build number: Increment for every store submission

### Post-Launch Monitoring

#### Essential Tools
1. **Crash Reporting**: Sentry or Firebase Crashlytics
2. **Analytics**: Firebase Analytics or Mixpanel
3. **Performance**: Firebase Performance Monitoring
4. **User Feedback**: In-app feedback form
5. **App Store Reviews**: Monitor and respond

#### Key Metrics to Track
- Daily/Monthly Active Users (DAU/MAU)
- Session length and frequency
- Screen flow completion rates
- Booking conversion rate
- Crash-free rate (target: 99.5%+)
- App load time
- API response times

---

## Part 9: Code Reuse Strategy

### What to Reuse from Client Portal

#### 1. TypeScript Types (80% reusable)
Copy from `frontend/client-portal/src/types/`:
- `auth.types.ts` - User, tokens, credentials
- `events.types.ts` - Event models
- `financial.types.ts` - Payment, invoice types
- `contracts.types.ts` - Contract models
- `quotes.types.ts` - Quote models
- `booking/*.types.ts` - Booking flow types

Minor adjustments needed for React Native-specific types.

#### 2. API Layer (70% reusable)
Adapt from `frontend/client-portal/src/apis/`:
- API endpoint URLs are identical
- Request/response structures same
- Replace Axios browser-specific config with React Native config
- Update error handling for mobile

#### 3. Business Logic Hooks (60% reusable)
Adapt from `frontend/client-portal/src/hooks/`:
- `useAuth` logic portable
- `useEvents`, `useFinancial`, `useContracts` hooks
- Replace web-specific features (e.g., localStorage → AsyncStorage)

#### 4. Booking Flow Logic (50% reusable)
- Session management logic
- Step validation rules
- Pricing calculations
- State management patterns

#### What Needs Fresh Implementation
- All UI components (React Native specific)
- Navigation structure
- Animations and gestures
- Native integrations (camera, file picker, etc.)
- Push notifications
- Offline support

---

## Part 10: Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Stripe integration complexity | Use official @stripe/stripe-react-native, test thoroughly in sandbox |
| Push notification reliability | Implement retry logic, handle both FCM and APNs edge cases |
| Deep linking issues | Test all deep link scenarios early, use react-navigation linking |
| iOS/Android parity | Design mobile-first, test on both platforms from day 1 |
| Performance issues | Profile early, optimize lists with FlatList, use Hermes engine |
| App Store rejection | Follow guidelines strictly, submit test account, no placeholder content |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Scope creep | Stick to MVP features for Phase 1, defer nice-to-haves |
| API changes | Coordinate with backend team, version APIs |
| Payment compliance | Use Stripe's compliant payment flows, follow PCI guidelines |
| Privacy requirements | Implement proper data handling, prepare privacy policy |

---

## Part 11: Estimated Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Foundation | 2 weeks | Project setup, design system, base components |
| Auth & Onboarding | 2 weeks | Login, register, splash, onboarding |
| Home & Discovery | 2 weeks | Home, venues, navigation |
| Booking Flow | 4 weeks | All 10 booking steps |
| Event Management | 3 weeks | Events list, details, dashboard |
| Financial | 3 weeks | Invoices, payments, contracts |
| Polish & Launch Prep | 2 weeks | Bug fixes, store assets, submission |
| **Total** | **18 weeks** | Full app launch |

---

## Part 12: Team Recommendations

### Ideal Team Composition
- **1 Senior React Native Developer** (Lead)
- **1 Mid-Level React Native Developer**
- **1 Backend Developer** (for any API adjustments)
- **1 UI/UX Designer** (mobile-focused)
- **1 QA Engineer** (mobile testing expertise)

### Alternative: Solo Developer Path
If building alone:
- Focus on Phase 1-3 for MVP (10 weeks)
- Use UI library to speed up development
- Consider cross-platform testing services (BrowserStack, Appetize)
- Outsource store assets to designer

---

## Appendix A: Key Dependencies

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.x",
    "@react-navigation/native-stack": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "axios": "^1.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@stripe/stripe-react-native": "^0.35.x",
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-mmkv": "^2.x",
    "@react-native-firebase/app": "^18.x",
    "@react-native-firebase/messaging": "^18.x",
    "react-native-reanimated": "^3.x",
    "react-native-gesture-handler": "^2.x",
    "react-native-safe-area-context": "^4.x",
    "react-native-screens": "^3.x",
    "react-native-svg": "^14.x",
    "react-native-fast-image": "^8.x",
    "react-native-pdf": "^6.x",
    "react-native-image-picker": "^7.x",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/react-native": "^0.73.x",
    "typescript": "^5.x",
    "@testing-library/react-native": "^12.x",
    "jest": "^29.x"
  }
}
```

---

## Appendix B: Quick Start Commands

```bash
# Create project
npx react-native init LifePlaceMobile --template react-native-template-typescript

# Install core dependencies
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler

# Install state management
npm install @tanstack/react-query zustand

# Install forms
npm install react-hook-form zod @hookform/resolvers

# Install UI helpers
npm install react-native-reanimated react-native-svg react-native-fast-image

# Install API
npm install axios

# Install storage
npm install @react-native-async-storage/async-storage react-native-mmkv

# Install Stripe
npm install @stripe/stripe-react-native

# Install Firebase
npm install @react-native-firebase/app @react-native-firebase/messaging

# iOS pods
cd ios && pod install && cd ..

# Run
npx react-native run-ios
npx react-native run-android
```

---

This roadmap provides everything you need to build and launch the LifePlace mobile app. The existing client-portal codebase provides excellent patterns to follow, and the backend APIs are fully ready for mobile integration.
