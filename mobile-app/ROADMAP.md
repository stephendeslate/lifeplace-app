# LifePlace Mobile App Development Roadmap

> **Developer Profile:** Web React experience, new to React Native
> **Target Platform:** iOS first (Mac + iPhone available)
> **Goal:** Full feature parity with client-portal
> **Backend Status:** Local development only

---

## Current State

**Existing Files:**
- `src/theme/index.ts` - Complete design system
- `src/theme/components.ts` - StyleSheet definitions
- `src/types/api.ts` - API type definitions

**Not Yet Created:**
- Expo project initialization
- Navigation, screens, components, hooks, API layer

---

## Phase 1: Environment Setup & React Native Fundamentals

### 1.1 Account Setup
- [ ] Create free [Expo account](https://expo.dev)
- [ ] Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
- [ ] Install EAS CLI: `npm install -g eas-cli`

### 1.2 Development Environment
Reference: [DEVELOPMENT_GUIDE.md lines 77-158](DEVELOPMENT_GUIDE.md)
- [ ] Install Xcode from Mac App Store
- [ ] Install Xcode Command Line Tools: `xcode-select --install`
- [ ] Install Watchman: `brew install watchman`
- [ ] Verify Node.js 18+ is installed

### 1.3 Project Initialization
Reference: [DEVELOPMENT_GUIDE.md lines 159-328](DEVELOPMENT_GUIDE.md)
- [ ] Initialize Expo project with TypeScript template
- [ ] Configure `app.json` with LifePlace bundle identifiers
- [ ] Set up path aliases in `tsconfig.json` and `babel.config.js`
- [ ] Create `.env` file with API URL and Stripe keys
- [ ] Verify existing theme files work with new project

### 1.4 React Native Learning Foundations
**Key concepts to learn:**
- [ ] `View` instead of `div`, `Text` for all text content
- [ ] `StyleSheet.create()` instead of CSS
- [ ] `FlatList`/`ScrollView` for lists
- [ ] Flexbox defaults to `flexDirection: 'column'`
- [ ] Platform-specific code with `Platform.select()`
- [ ] No browser APIs (localStorage, window, etc.)

**Resources:**
- [ ] Complete [Expo tutorial](https://docs.expo.dev/tutorial/introduction/)
- [ ] Read [React Native core concepts](https://reactnative.dev/docs/intro-react-native-components)

### 1.5 First Running App
- [ ] Run `npx expo start` and test on Expo Go
- [ ] Create "Hello LifePlace" screen using theme values
- [ ] Verify hot reload works on physical device

---

## Phase 2: Core Infrastructure

### 2.1 Install Dependencies
Reference: [DEVELOPMENT_GUIDE.md lines 1021-1086](DEVELOPMENT_GUIDE.md)

```bash
# Core dependencies
npm install @tanstack/react-query axios zustand zod
npm install @hookform/resolvers react-hook-form
npm install date-fns date-fns-tz phosphor-react-native

# Expo packages
npx expo install expo-router expo-secure-store expo-image
npx expo install expo-haptics expo-linear-gradient expo-linking
npx expo install react-native-gesture-handler react-native-reanimated
npx expo install react-native-safe-area-context react-native-screens
npx expo install @shopify/flash-list react-native-svg
```

- [ ] Run core dependencies install
- [ ] Run Expo packages install
- [ ] Verify all packages installed successfully

### 2.2 Navigation Structure
Reference: [DEVELOPMENT_GUIDE.md lines 1088-1298](DEVELOPMENT_GUIDE.md)
- [ ] Create `app/_layout.tsx` - Root layout with providers
- [ ] Create `app/(auth)/_layout.tsx` - Auth flow stack
- [ ] Create `app/(tabs)/_layout.tsx` - Tab navigation
- [ ] Set up protected route logic

### 2.3 State Management Setup
Reference: [DEVELOPMENT_GUIDE.md lines 1300-1605](DEVELOPMENT_GUIDE.md)
- [ ] Create `src/stores/authStore.ts` with SecureStore persistence
- [ ] Create `src/stores/bookingStore.ts`
- [ ] Create `src/utils/queryClient.ts` with query keys factory

### 2.4 API Layer Foundation
Reference: [DEVELOPMENT_GUIDE.md lines 1608-2000](DEVELOPMENT_GUIDE.md)
- [ ] Create `src/utils/api.ts` - Axios instance with interceptors
- [ ] Implement JWT token refresh logic
- [ ] Create `src/apis/auth.api.ts`
- [ ] Test API connection to backend

---

## Phase 3: Authentication System

### 3.1 Auth Context & Hooks
Reference: [DEVELOPMENT_GUIDE.md lines 2360-2560](DEVELOPMENT_GUIDE.md)
- [ ] Create `src/contexts/AuthContext.tsx`
- [ ] Create `src/hooks/useAuth.ts`
- [ ] Implement token storage with `expo-secure-store`
- [ ] Handle auth state persistence

### 3.2 Auth Screens
Reference: [DEVELOPMENT_GUIDE.md lines 2561-2900](DEVELOPMENT_GUIDE.md)
- [ ] Create `app/(auth)/login.tsx`
- [ ] Create `app/(auth)/register.tsx`
- [ ] Create `app/(auth)/forgot-password.tsx`
- [ ] Create `app/(auth)/accept-invitation/[id].tsx`

### 3.3 Shared Form Components
- [ ] Create `src/components/common/Input.tsx`
- [ ] Create `src/components/common/Button.tsx`
- [ ] Create `src/components/common/PasswordInput.tsx`
- [ ] Create `src/components/common/LoadingScreen.tsx`

### 3.4 Toast/Notification System
- [ ] Create `src/contexts/ToastContext.tsx`
- [ ] Create `src/components/common/Toast.tsx`

---

## Phase 4: Dashboard & Events Core

### 4.1 Dashboard Screen
Reference: [DEVELOPMENT_GUIDE.md lines 3642-3918](DEVELOPMENT_GUIDE.md)
- [ ] Create `app/(tabs)/index.tsx` with dashboard layout
- [ ] Implement greeting header
- [ ] Add critical actions section
- [ ] Add upcoming event preview
- [ ] Add financial summary card

### 4.2 Dashboard API & Hooks
- [ ] Create `src/apis/dashboard.api.ts`
- [ ] Create `src/hooks/useDashboard.ts`
- [ ] Create `src/components/dashboard/ActionCard.tsx`

### 4.3 Events List Screen
Reference: [DEVELOPMENT_GUIDE.md lines 3310-3640](DEVELOPMENT_GUIDE.md)
- [ ] Create `app/(tabs)/events.tsx`
- [ ] Implement status filter chips
- [ ] Add pull-to-refresh
- [ ] Add infinite scroll pagination
- [ ] Create empty state

### 4.4 Events API & Components
- [ ] Create `src/apis/events.api.ts`
- [ ] Create `src/hooks/useEvents.ts`
- [ ] Create `src/components/events/EventCard.tsx`
- [ ] Create `src/components/events/EventStatusBadge.tsx`

### 4.5 Event Detail Screen
Reference: [DEVELOPMENT_GUIDE.md lines 4187-4484](DEVELOPMENT_GUIDE.md)
- [ ] Create `app/events/[id]/index.tsx`
- [ ] Implement hero image with overlay
- [ ] Add event info header
- [ ] Create horizontal tab bar

### 4.6 Event Detail Tabs
- [ ] Create `src/components/events/tabs/TimelineTab.tsx`
- [ ] Create `src/components/events/tabs/TasksTab.tsx`
- [ ] Create `src/components/events/tabs/DocumentsTab.tsx`
- [ ] Create `src/components/events/tabs/InvoicesTab.tsx`
- [ ] Create `src/components/events/tabs/ContractsTab.tsx`
- [ ] Create `src/components/events/tabs/QuotesTab.tsx`
- [ ] Create `src/components/events/tabs/FeedbackTab.tsx`
- [ ] Create `src/components/events/tabs/NotesTab.tsx`

---

## Phase 5: Action Center & Financial Portal

### 5.1 Action Center Screen
Reference: [DEVELOPMENT_GUIDE.md lines 3919-4185](DEVELOPMENT_GUIDE.md)
- [ ] Create `app/actions/index.tsx`
- [ ] Implement type filters
- [ ] Add search functionality
- [ ] Add urgency-based sorting

### 5.2 Quote Management
- [ ] Create `src/apis/quotes.api.ts`
- [ ] Create `src/hooks/useQuotes.ts`
- [ ] Create `app/quotes/[id].tsx`
- [ ] Implement accept/reject actions

### 5.3 Financial Portal Screen
Reference: [DEVELOPMENT_GUIDE.md lines 4486-4762](DEVELOPMENT_GUIDE.md)
- [ ] Create `app/payments/index.tsx`
- [ ] Implement overview cards
- [ ] Add tab switcher
- [ ] Create invoice list
- [ ] Add payment methods management

### 5.4 Financial Components & APIs
- [ ] Create `src/apis/payments.api.ts`
- [ ] Create `src/hooks/useFinancial.ts`
- [ ] Create `src/components/payments/InvoiceCard.tsx`
- [ ] Create `src/components/payments/PaymentMethodCard.tsx`
- [ ] Create `app/payments/[id].tsx`

### 5.5 Contract Management
- [ ] Create `src/apis/contracts.api.ts`
- [ ] Create `src/hooks/useContracts.ts`
- [ ] Create `app/contracts/[id].tsx`
- [ ] Implement digital signature capture

---

## Phase 6: Booking Flow (Full Feature Parity)

> **Reference:** [BOOKING_FLOW_GAP_ANALYSIS.md](BOOKING_FLOW_GAP_ANALYSIS.md) for complete feature breakdown
> **Client-Portal Source:** `frontend/client-portal/src/` (apis, hooks, types, components, contexts)

### 6.1 Type Definitions
Create all booking-related TypeScript interfaces matching client-portal.

- [ ] Create `src/types/booking/index.ts` - Re-export hub
- [ ] Create `src/types/booking/core.types.ts` - EventType, BookingFlow, BookingFlowStep, StepType
- [ ] Create `src/types/booking/api.types.ts` - Session create/update/response, ValidationError
- [ ] Create `src/types/booking/payment.types.ts` - PaymentGateway, PaymentGatewayResponse
- [ ] Create `src/types/booking/questionnaire.types.ts` - Questionnaire, QuestionnaireField, field types
- [ ] Create `src/types/booking/venues.types.ts` - RentableVenue, VenueOperatingRules, VenueSelectionStepData
- [ ] Create `src/types/booking/stepData.types.ts` - All step data interfaces, SelectedPackage/Addon
- [ ] Create `src/types/booking/stepConfigurations.types.ts` - All step config interfaces
- [ ] Create `src/types/booking/bookingData.types.ts` - BookingData, SessionUpdatePayload, BookingSession
- [ ] Create `src/types/booking/state.types.ts` - BookingProgress, BookingUIState, BookingState, BookingActions

### 6.2 Utility Files
Create booking-specific utilities adapted for React Native.

- [ ] Create `src/utils/bookingHelpers.ts` - Validation, formatting, session utilities
- [ ] Create `src/utils/bookingValidation.ts` - Zod schemas for all 10 steps
- [ ] Create `src/utils/timezone.ts` - Philippines timezone (Asia/Manila) handling
- [ ] Create `src/utils/currency.ts` - PHP currency formatting with multi-currency support
- [ ] Create `src/utils/errorHandler.ts` - API error extraction, validation error handling
- [ ] Create `src/utils/bookingStorage.ts` - Session persistence via expo-secure-store
- [ ] Create `src/utils/security.ts` - Input sanitization, XSS prevention

### 6.3 API Layer (Complete)
Create all 9 booking-related API files matching client-portal.

- [ ] Create `src/apis/booking/core.api.ts`
  - `getEventTypes()`, `getAvailableFlows()`, `getFlowById()`
  - `startSession()`, `getSession()`, `updateSessionData()`, `validateStepData()`
  - `completeBooking()`, `abandonSession()`, `calculatePricing()`
  - Session management: expiry checks, localStorage persistence, cleanup
- [ ] Create `src/apis/booking/introduction.api.ts`
  - `validateStepData()`, `updateStepData()`, `formatStepData()`, `getDefaultData()`
- [ ] Create `src/apis/booking/datetime.api.ts`
  - `checkAvailability()`, `validateStepData()`, `formatDate()` (Philippines TZ)
- [ ] Create `src/apis/booking/venues.api.ts`
  - `getRentableVenues()`, `getVenue()`, `getEffectivePricing()`
  - `findMatchingPackages()`, `createFromVenues()` (custom bundles)
  - `calculateTimes()`, `getVenueAvailability()`, `calculateEarlyCheckinFee()`
- [ ] Create `src/apis/booking/products.api.ts`
  - `getPackages()`, `getAddons()`, `getProductsByIds()`
  - `validateDiscountCode()`, `calculatePackagePrice()`, `calculateTotalWithExcessHours()`
- [ ] Create `src/apis/booking/questionnaire.api.ts`
  - `getQuestionnaires()`, `getQuestionnaireDetail()`, `getQuestionnaireFields()`
  - `validateResponses()`, `formatResponses()`, `processFileUploads()`
- [ ] Create `src/apis/booking/contact_info.api.ts`
  - `validateData()`, `isValidEmail()`, `isValidPhone()` (PH format)
  - `getDefaultDataFromUser()` (pre-fill for authenticated users)
- [ ] Create `src/apis/booking/payment.api.ts`
  - `getFlowPaymentGateways()`, `getPaymentGateway()`, `getGatewayPublicConfig()`
  - `calculateDepositAmount()`, `validatePaymentMethod()`, `getSupportedPaymentMethods()`
- [ ] Create `src/apis/booking/confirmation.api.ts`
  - `getSessionDetails()`, `sendConfirmationEmail()`, `generateBookingReference()`
  - `getNextStepsContent()`, `getSupportContact()`

### 6.4 Hooks Layer (Complete)
Create all 10 booking-related hooks matching client-portal.

- [ ] Create `src/hooks/booking/useBookingCore.tsx`
  - `useEventTypes()`, `useBookingFlows()`, `useBookingFlow()`
  - `useBookingSession()` - session state, updateStepData, validateStep, abandonSession
  - `useFlowPaymentGateways()`, `useSessionTimer()`, `useSessionRecovery()`
- [ ] Create `src/hooks/booking/useIntroduction.tsx`
  - `useIntroduction()` - full step management with save/validate
  - `useIntroductionData()` - standalone data management
- [ ] Create `src/hooks/booking/useDateTime.tsx`
  - `useDateTime()` - date selection, availability checking, venue rules
  - `useDateTimeData()` - standalone data only
- [ ] Create `src/hooks/booking/useVenues.tsx`
  - `useRentableVenues()`, `useVenue()`, `useVenueAvailability()`
- [ ] Create `src/hooks/booking/useProducts.tsx`
  - `usePackages()`, `useAddons()`, `useProductsByIds()`
- [ ] Create `src/hooks/booking/useQuestionnaire.tsx`
  - `useQuestionnaires()`, `useQuestionnaireDetail()`, `useQuestionnaireFields()`
  - `useQuestionnaireResponses()` - response management, validation, completion %
  - `useQuestionnaireFileUpload()` - file upload with expo-document-picker
- [ ] Create `src/hooks/booking/useContactInfo.tsx`
  - `useContactInfo()` - config, validation, user pre-fill
  - `useContactInfoValidation()` - lightweight validation only
- [ ] Create `src/hooks/booking/usePayment.tsx`
  - `usePaymentGateways()`, `useFlowPaymentGateways()`, `usePaymentGateway()`
  - `usePaymentCalculations()`, `usePaymentValidation()`, `useGatewayConfig()`
  - `usePaymentFlow()` - complete payment selection and amount management
  - `useGatewaySelection()` - gateway filtering
- [ ] Create `src/hooks/booking/useConfirmation.tsx`
  - `useConfirmation()` - completion handling, navigation, status
  - `useConfirmationDisplay()` - display-only mode
- [ ] Create `src/hooks/booking/useSimplePricing.tsx`
  - `useSimplePricing()` - unified pricing with packages, addons, discounts, venue excess hours

### 6.5 Context & State Management
Create BookingContext matching client-portal architecture.

- [ ] Create `src/contexts/BookingContext.tsx`
  - **BookingState**: flows, session, stepData, progress, ui, payment, pricing, recovery
  - **BookingActions**: flow management, session CRUD, navigation, completion, pricing
  - Debounced backend sync (1-second debounce)
  - Session persistence to expo-secure-store
  - Session recovery on mount
  - Expired session cleanup
- [ ] Create `src/providers/BookingProvider.tsx`
  - Wrap booking screens only (not app-wide)
  - Session timer integration
  - Error boundary wrapper

### 6.6 Container & Navigation Components
Create booking flow infrastructure components.

- [ ] Create `src/components/booking/BookingContainer.tsx`
  - Header with flow name and close button
  - Progress indicator
  - Session timer display
  - Error alerts
  - Pricing summary footer
  - Navigation buttons (Back/Next)
- [ ] Create `src/components/booking/StepRenderer.tsx`
  - Central router for step components
  - Data change callbacks
  - Validation integration
- [ ] Create `src/components/booking/BookingProgressIndicator.tsx`
  - Linear, stepper, and compact variants
  - Mobile-optimized layout
  - Step labels and descriptions
- [ ] Create `src/components/booking/SessionTimer.tsx`
  - Countdown display
  - Warning at low time
  - Expiry handling
- [ ] Create `src/components/booking/SessionRecoverySheet.tsx`
  - Bottom sheet for recovery prompt
  - Restore/discard options
  - Session info display
- [ ] Create `src/components/booking/BookingNavigation.tsx`
  - Back/Next/Skip buttons
  - Loading states
  - Validation feedback

### 6.7 Event Type Selection
- [ ] Create `src/components/booking/EventTypeSelection.tsx`
  - Event type cards with features and pricing
  - Loading and error states
  - Modal detail dialogs
- [ ] Create `src/components/booking/EventTypeCard.tsx`
  - Featured image, name, description
  - Key features list
  - Starting price display
- [ ] Create `src/components/booking/EventTypeDetailModal.tsx`
  - Full event type details
  - Gallery support
  - Book now action

### 6.8 Step Screens
Create all 10 booking step screens with full feature parity.

#### Layout
- [ ] Create `app/booking/_layout.tsx`
  - BookingProvider wrapper
  - Navigation configuration
  - Session recovery check

#### 6.8.1 Introduction Step
- [ ] Create `app/booking/[flowId]/index.tsx`
- [ ] Features:
  - Terms acknowledgment checkbox with validation
  - Animated welcome header with event type
  - Configuration-driven content (title, description)
  - Accessibility announcements
  - Success indicator when acknowledged

#### 6.8.2 Venue Selection Step
- [ ] Create `app/booking/[flowId]/venue.tsx`
- [ ] Create `src/components/booking/VenueCard.tsx`
- [ ] Features:
  - Multi-venue selection with min/max constraints
  - Event-type-specific pricing display
  - Capacity display (people icons, range)
  - Included hours per venue
  - Excess hour rates display
  - All-day access detection
  - Featured images and location metadata
  - Toggle-based selection UI
  - Real-time validation

#### 6.8.3 DateTime Step
- [ ] Create `app/booking/[flowId]/datetime.tsx`
- [ ] Create `src/components/booking/EventCalendar.tsx`
- [ ] Features:
  - Interactive calendar with availability overlay
  - Blocked dates display
  - Single-day OR multi-day range modes (configurable)
  - Min/max day range constraints
  - Venue operating rules display (check-in/check-out times)
  - Real-time availability checking via API
  - Philippines timezone handling (Asia/Manila)
  - Human-readable date formatting

#### 6.8.4 Package Selection Step
- [ ] Create `app/booking/[flowId]/package.tsx`
- [ ] Create `src/components/booking/PackageCard.tsx`
- [ ] Create `src/components/booking/CustomBundleCard.tsx`
- [ ] Create `src/components/booking/VenueHoursSelector.tsx`
- [ ] Features:
  - **Dual Mode**: Pre-made packages OR custom bundle from venues
  - Custom bundle pricing with 10% multi-venue discount
  - Venue additional hours selector per venue
  - All-day access venues skip hours selector
  - Pricing model display (HOURLY vs FIXED)
  - Quantity selector for multiple selection mode
  - Event days filtering based on date range
  - Featured indicator badges
  - Collapsible details (min/max hours, advance booking)
  - Real-time pricing updates

#### 6.8.5 Addon Selection Step
- [ ] Create `app/booking/[flowId]/addons.tsx`
- [ ] Create `src/components/booking/AddonCard.tsx`
- [ ] Create `src/components/booking/AddonQuantitySelector.tsx`
- [ ] Features:
  - Optional category grouping
  - Per-addon quantity selector (increment/decrement)
  - Min/max selection constraints
  - Venue additional hours section (continuation from package)
  - Progress indicator (selected count / total)
  - Tax rate and price_with_tax inclusion
  - Featured addon badges
  - Summary card showing selected items with totals

#### 6.8.6 Questionnaire Step
- [ ] Create `app/booking/[flowId]/questionnaire.tsx`
- [ ] Create `src/components/booking/QuestionnaireRenderer.tsx`
- [ ] Create `src/components/booking/fields/TextField.tsx`
- [ ] Create `src/components/booking/fields/TextareaField.tsx`
- [ ] Create `src/components/booking/fields/NumberField.tsx`
- [ ] Create `src/components/booking/fields/EmailField.tsx`
- [ ] Create `src/components/booking/fields/PhoneField.tsx`
- [ ] Create `src/components/booking/fields/DateField.tsx`
- [ ] Create `src/components/booking/fields/TimeField.tsx`
- [ ] Create `src/components/booking/fields/SelectField.tsx`
- [ ] Create `src/components/booking/fields/MultiSelectField.tsx`
- [ ] Create `src/components/booking/fields/RadioField.tsx`
- [ ] Create `src/components/booking/fields/CheckboxField.tsx`
- [ ] Create `src/components/booking/fields/FileUploadField.tsx`
- [ ] Create `src/components/booking/fields/RatingField.tsx`
- [ ] Features:
  - Multiple questionnaire support per flow
  - All 14 field types supported
  - File upload with expo-document-picker (size/type validation)
  - Completion progress bar
  - Required field validation
  - Dynamic field visibility (conditional logic)
  - Dynamic questionnaire visibility
  - Field ordering by order field
  - Grouped by questionnaire name

#### 6.8.7 Pricing Summary Step
- [ ] Create `app/booking/[flowId]/summary.tsx`
- [ ] Create `src/components/booking/PricingBreakdown.tsx`
- [ ] Create `src/components/booking/DiscountCodeInput.tsx`
- [ ] Create `src/components/booking/TermsCheckbox.tsx`
- [ ] Create `src/components/booking/BookingReviewSection.tsx`
- [ ] Features:
  - Itemized package breakdown with excess hour details
  - Itemized addon breakdown with quantities
  - Per-venue excess hours breakdown
  - Subtotal, tax, discount, total display
  - Discount code input with apply/remove
  - Discount validation states (validating, error, success)
  - Terms & conditions checkbox with URL
  - Marketing consent checkbox (optional)
  - Special requests textarea
  - Contact info summary display
  - Custom header/footer text from config
  - Real-time pricing recalculation

#### 6.8.8 Contact Info Step
- [ ] Create `app/booking/[flowId]/contact.tsx`
- [ ] Create `src/components/booking/ContactForm.tsx`
- [ ] Create `src/components/booking/ValidationIndicator.tsx`
- [ ] Features:
  - Auto-fill from authenticated user profile
  - "Welcome back" banner for logged-in users
  - Real-time field validation with visual states
  - Philippines phone format (+63 / 0 prefix, 10-11 digits)
  - Field strength indicators (progress bars)
  - Account creation option with password field
  - Password visibility toggle
  - Custom fields from configuration
  - Configurable required fields

#### 6.8.9 Payment Step
- [ ] Create `app/booking/[flowId]/payment.tsx`
- [ ] Create `src/components/booking/CompletionChoiceScreen.tsx`
- [ ] Create `src/components/booking/PaymentTypeSelector.tsx`
- [ ] Create `src/components/booking/GatewaySelector.tsx`
- [ ] Create `src/components/booking/QuoteRequestForm.tsx`
- [ ] Create `src/components/booking/StripePaymentForm.tsx`
- [ ] Create `src/components/booking/SavedPaymentMethods.tsx`
- [ ] Create `src/components/booking/RefundPolicyDisplay.tsx`
- [ ] Features:
  - **Completion choice screen** (if quote requests enabled):
    - Option 1: Secure booking with deposit/full payment
    - Option 2: Request custom quote
    - Trust signals (price locked, date reserved, secure)
  - **Payment type selection**: Deposit vs. full payment
  - Dynamic amount display based on payment plan settings
  - Balance due date information
  - **For authenticated users**: Saved payment method selector
  - **Gateway selection**: Stripe, PayPal, GCash, etc.
  - Stripe React Native integration (@stripe/stripe-react-native)
  - **Quote request flow**: Special requirements textarea
  - Refund policy display with deadline hours

#### 6.8.10 Confirmation Step
- [ ] Create `app/booking/[flowId]/confirmation.tsx`
- [ ] Create `src/components/booking/ConfirmationStatus.tsx`
- [ ] Create `src/components/booking/BookingSummaryCard.tsx`
- [ ] Create `src/components/booking/PaymentSummaryCard.tsx`
- [ ] Create `src/components/booking/QuestionnaireSummaryCard.tsx`
- [ ] Create `src/components/booking/ContactSummaryCard.tsx`
- [ ] Create `src/components/booking/NextStepsCard.tsx`
- [ ] Features:
  - Status display states (processing, success, failed, pending)
  - Retry button for failed state
  - BookingSummaryCard (packages, addons, pricing)
  - PaymentSummaryCard (amounts, terms, refund policy)
  - QuestionnaireSummaryCard (collected responses in accordion)
  - Contact information card
  - Special requests display
  - Booking/quote reference (copyable chip)
  - Next steps content (configurable action items)
  - Navigate to dashboard (authenticated) or home
  - Support contact links

### 6.9 Session Management
- [ ] Implement session timer with expiry countdown
- [ ] Session persistence to expo-secure-store
- [ ] Session recovery bottom sheet on mount
- [ ] Debounced backend synchronization (1-second debounce)
- [ ] Expired session cleanup on app start
- [ ] Session abandonment tracking with reason
- [ ] beforeunload equivalent (AppState listener)

---

## Phase 7: Stripe Payment Integration

### 7.1 Stripe SDK Setup
Reference: [DEVELOPMENT_GUIDE.md lines 5100-5350](DEVELOPMENT_GUIDE.md)
- [ ] Install: `npx expo install @stripe/stripe-react-native`
- [ ] Configure in `app.json`
- [ ] Create `src/providers/StripeProvider.tsx`
- [ ] Add to root layout

### 7.2 Payment Integration
- [ ] Create `src/hooks/usePaymentSheet.ts`
- [ ] Create `src/components/payment/PaymentSheet.tsx`
- [ ] Implement payment intent flow
- [ ] Handle confirmation and errors
- [ ] Create `app/payments/add-method.tsx`

### 7.3 Payment Plan Support
- [ ] Create `src/hooks/usePaymentPlan.ts`
- [ ] Create `src/components/payment/PaymentPlanCard.tsx`
- [ ] Create `src/components/payment/InstallmentSchedule.tsx`

---

## Phase 8: Documents & File Management

### 8.1 Documents Screen
Reference: [DEVELOPMENT_GUIDE.md lines 4763-5000](DEVELOPMENT_GUIDE.md)
- [ ] Create `app/documents/index.tsx`
- [ ] Implement search
- [ ] Add type filters
- [ ] Add sort options

### 8.2 File Operations
- [ ] Install `expo-file-system` and `expo-sharing`
- [ ] Create `src/hooks/useDocuments.ts`
- [ ] Implement file download
- [ ] Implement file sharing
- [ ] Create `src/components/documents/DocumentCard.tsx`

### 8.3 File Upload
- [ ] Install `expo-image-picker` and `expo-document-picker`
- [ ] Create `src/hooks/useFileUpload.ts`
- [ ] Create `src/components/common/FileUploader.tsx`

---

## Phase 9: Push Notifications

### 9.1 Notification Setup
Reference: [DEVELOPMENT_GUIDE.md lines 5350-5600](DEVELOPMENT_GUIDE.md)
- [ ] Install `expo-notifications`
- [ ] Create `src/hooks/useNotifications.ts`
- [ ] Implement push token registration
- [ ] Create backend endpoint for tokens

### 9.2 Notification Handling
- [ ] Create `src/utils/notificationHandler.ts`
- [ ] Handle foreground notifications
- [ ] Handle background taps with deep linking
- [ ] Create notification preferences screen

### 9.3 Notification Types
- [ ] Quote notifications
- [ ] Payment reminders
- [ ] Contract notifications
- [ ] Event reminders
- [ ] Message notifications

---

## Phase 10: Profile & Settings

### 10.1 Profile Screen
- [ ] Create `app/(tabs)/profile.tsx`
- [ ] Add user info header
- [ ] Add account settings section
- [ ] Add app preferences
- [ ] Add legal section
- [ ] Add logout button

### 10.2 Settings Screens
- [ ] Create `app/settings/edit-profile.tsx`
- [ ] Create `app/settings/change-password.tsx`
- [ ] Create `app/settings/notification-preferences.tsx`

### 10.3 Privacy Dashboard
Reference: [CONSENT_MANAGEMENT_UI.md](../docs/compliance/CONSENT_MANAGEMENT_UI.md)
- [ ] Create `app/settings/privacy.tsx`
- [ ] Add consent toggles
- [ ] Add consent history
- [ ] Add data download request
- [ ] Add account deletion flow

---

## Phase 11: Explore & Favorites

### 11.1 Explore Screen
- [ ] Enhance dashboard with search
- [ ] Add category chips
- [ ] Add featured venues section
- [ ] Add popular packages section

### 11.2 Venue Detail
- [ ] Create `app/venues/[id].tsx`
- [ ] Add image gallery
- [ ] Add capacity/features info
- [ ] Add availability calendar

### 11.3 Favorites System
- [ ] Create `src/hooks/useFavorites.ts`
- [ ] Create `app/(tabs)/favorites.tsx`
- [ ] Add favorite toggle to cards

---

## Phase 12: Messaging System

### 12.1 Messages Screen
- [ ] Create `app/messages/index.tsx`
- [ ] Create `app/messages/[threadId].tsx`
- [ ] Create `src/apis/messaging.api.ts`
- [ ] Create `src/hooks/useMessages.ts`

### 12.2 Message Components
- [ ] Create `src/components/messages/ThreadListItem.tsx`
- [ ] Create `src/components/messages/MessageBubble.tsx`
- [ ] Create `src/components/messages/MessageComposer.tsx`

---

## Phase 13: Security Hardening

### 13.1 Secure Storage
Reference: [MOBILE_SECURITY.md](../docs/security/MOBILE_SECURITY.md)
- [ ] Audit sensitive data storage
- [ ] Verify all tokens use SecureStore
- [ ] Implement session timeout

### 13.2 SSL/Certificate Pinning
- [ ] Configure certificate pinning
- [ ] Set up network security config
- [ ] Test with proxy

### 13.3 Biometric Authentication
- [ ] Install `expo-local-authentication`
- [ ] Create `src/hooks/useBiometrics.ts`
- [ ] Add biometric lock option
- [ ] Implement for sensitive actions

### 13.4 Security Checks
- [ ] Add root/jailbreak detection
- [ ] Add screenshot prevention
- [ ] Implement session management

---

## Phase 14: Performance & Offline Support

### 14.1 Performance Optimization
Reference: [DEVELOPMENT_GUIDE.md lines 5600-5800](DEVELOPMENT_GUIDE.md)
- [ ] Replace FlatList with FlashList
- [ ] Implement React.memo
- [ ] Add image caching
- [ ] Profile and optimize

### 14.2 Offline Support
- [ ] Configure React Query persistence
- [ ] Cache critical data
- [ ] Show offline indicator
- [ ] Queue mutations for retry

### 14.3 Error Boundaries
- [ ] Create `src/components/common/ErrorBoundary.tsx`
- [ ] Create `src/components/common/ErrorFallback.tsx`
- [ ] Wrap screens with boundaries
- [ ] Add crash reporting

---

## Phase 15: Testing

### 15.1 Unit Testing Setup
Reference: [TESTING_STRATEGY.md](../docs/testing/TESTING_STRATEGY.md)
- [ ] Configure Jest
- [ ] Set up React Native Testing Library
- [ ] Create test utilities

### 15.2 Component Tests
- [ ] Test form components
- [ ] Test booking flow
- [ ] Test auth flows
- [ ] Target 80%+ coverage

### 15.3 E2E Testing with Maestro
- [ ] Install Maestro CLI
- [ ] Create test flows
- [ ] Add to CI pipeline

### 15.4 Accessibility Testing
- [ ] Add accessibility labels
- [ ] Test with VoiceOver
- [ ] Verify touch targets

---

## Phase 16: iOS Build & TestFlight

### 16.1 EAS Build Setup
- [ ] Run `eas login`
- [ ] Run `eas build:configure`
- [ ] Configure build profiles

### 16.2 App Store Connect Setup
- [ ] Create App ID
- [ ] Configure App Store Connect
- [ ] Set up TestFlight

### 16.3 iOS Specific Configuration
Reference: [APP_STORE_COMPLIANCE.md](../docs/compliance/APP_STORE_COMPLIANCE.md)
- [ ] Configure privacy manifest
- [ ] Add usage descriptions
- [ ] Generate app icons
- [ ] Create splash screen

### 16.4 First TestFlight Build
- [ ] Run `eas build --platform ios --profile preview`
- [ ] Submit to TestFlight
- [ ] Internal testing

---

## Phase 17: App Store Submission

### 17.1 App Store Assets
- [ ] Create screenshots (6.7", 6.5", 5.5")
- [ ] Write app description
- [ ] Create preview video (optional)
- [ ] Prepare privacy policy URL

### 17.2 App Store Compliance
Reference: [APP_STORE_COMPLIANCE.md](../docs/compliance/APP_STORE_COMPLIANCE.md)
- [ ] Complete Privacy questionnaire
- [ ] Declare data collection
- [ ] Set age rating
- [ ] Review guidelines

### 17.3 Production Build & Submit
- [ ] Run `eas build --platform ios --profile production`
- [ ] Submit for review
- [ ] Address feedback
- [ ] Plan phased release

---

## Phase 18: Version Management & Updates

### 18.1 Version Checking
Reference: [MOBILE_VERSION_API.md](../docs/api/MOBILE_VERSION_API.md)
- [ ] Implement version check on launch
- [ ] Create `src/components/common/UpdatePrompt.tsx`
- [ ] Handle force/optional updates
- [ ] Implement maintenance mode

### 18.2 OTA Updates
- [ ] Configure EAS Update
- [ ] Set up update channels
- [ ] Create deployment workflow

---

## Phase 19: Android Release (Post-iOS)

### 19.1 Android Configuration
- [ ] Install Android Studio
- [ ] Create keystore
- [ ] Configure `app.json`

### 19.2 Google Play Setup
- [ ] Create Play Console account
- [ ] Create app listing
- [ ] Complete data safety form

### 19.3 Android Build & Release
- [ ] Run `eas build --platform android --profile production`
- [ ] Submit to internal testing
- [ ] Submit for production

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Environment Setup | Not Started | |
| 2. Core Infrastructure | Not Started | |
| 3. Authentication | Not Started | |
| 4. Dashboard & Events | Not Started | |
| 5. Action Center & Financial | Not Started | |
| 6. Booking Flow | Not Started | |
| 7. Stripe Integration | Not Started | |
| 8. Documents | Not Started | |
| 9. Push Notifications | Not Started | |
| 10. Profile & Settings | Not Started | |
| 11. Explore & Favorites | Not Started | |
| 12. Messaging | Not Started | |
| 13. Security | Not Started | |
| 14. Performance & Offline | Not Started | |
| 15. Testing | Not Started | |
| 16. iOS Build & TestFlight | Not Started | |
| 17. App Store Submission | Not Started | |
| 18. Version Management | Not Started | |
| 19. Android Release | Not Started | |

---

## Key Reference Documents

### Mobile App Documentation
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Complete implementation guide
- [STYLING_GUIDE.md](STYLING_GUIDE.md) - Design system details
- [BOOKING_IMPLEMENTATION.md](BOOKING_IMPLEMENTATION.md) - Booking flow code examples
- [BOOKING_FLOW_GAP_ANALYSIS.md](BOOKING_FLOW_GAP_ANALYSIS.md) - Feature parity requirements

### Client-Portal Reference (Source of Truth)
- `frontend/client-portal/src/apis/booking/` - API layer (9 files)
- `frontend/client-portal/src/hooks/booking/` - React Query hooks (8 files)
- `frontend/client-portal/src/types/booking/` - TypeScript types (10 files)
- `frontend/client-portal/src/components/booking/` - Component implementations
- `frontend/client-portal/src/contexts/BookingContext.tsx` - State management

### Project Documentation
- [../docs/security/MOBILE_SECURITY.md](../docs/security/MOBILE_SECURITY.md) - Security requirements
- [../docs/compliance/APP_STORE_COMPLIANCE.md](../docs/compliance/APP_STORE_COMPLIANCE.md) - App Store compliance
- [../docs/compliance/CONSENT_MANAGEMENT_UI.md](../docs/compliance/CONSENT_MANAGEMENT_UI.md) - Privacy UI specs
- [../docs/testing/TESTING_STRATEGY.md](../docs/testing/TESTING_STRATEGY.md) - Testing approach
- [../docs/api/MOBILE_VERSION_API.md](../docs/api/MOBILE_VERSION_API.md) - Version management API
