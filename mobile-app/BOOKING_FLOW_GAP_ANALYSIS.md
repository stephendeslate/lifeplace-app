# Mobile App Booking Flow - Gap Analysis & Implementation Plan

> **Generated from client-portal code analysis**
> **Goal:** Full feature parity with client-portal booking flow

---

## Executive Summary

The current mobile roadmap (Phase 6) covers the basic booking flow screens but is missing significant functionality that exists in the client-portal. This document identifies **all gaps** backed by actual client-portal code and provides a comprehensive implementation plan.

### Gap Categories
1. **Missing API Files** - 6 files not listed in roadmap
2. **Missing Hooks** - 6 hooks not listed in roadmap
3. **Missing Type Definitions** - 10 type files not listed
4. **Missing Utility Files** - 8 utility files not listed
5. **Missing Components** - 15+ components not listed
6. **Missing Features per Step** - Detailed below
7. **Missing Infrastructure** - Context, providers, session management

---

## Part 1: Missing API Layer

### Current Roadmap (Phase 6.1)
```
- src/apis/booking/core.api.ts
- src/apis/booking/products.api.ts
- src/apis/booking/questionnaire.api.ts
```

### Missing APIs (from client-portal)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/apis/booking/introduction.api.ts` | Introduction step validation | `validateStepData()`, `updateStepData()`, `formatStepData()`, `getDefaultData()` |
| `src/apis/booking/datetime.api.ts` | Date/time & availability | `checkAvailability()`, `validateStepData()`, `formatDate()` (Philippines TZ) |
| `src/apis/booking/contact_info.api.ts` | Contact validation | `validateData()`, `isValidEmail()`, `isValidPhone()` (PH format), `getDefaultDataFromUser()` |
| `src/apis/booking/venues.api.ts` | Venue management | `getRentableVenues()`, `getEffectivePricing()`, `calculateTimes()`, `findMatchingPackages()`, `createFromVenues()` |
| `src/apis/booking/payment.api.ts` | Payment processing | `getFlowPaymentGateways()`, `calculateDepositAmount()`, `validatePaymentMethod()`, `getSupportedPaymentMethods()` |
| `src/apis/booking/confirmation.api.ts` | Booking completion | `getSessionDetails()`, `sendConfirmationEmail()`, `generateBookingReference()`, `getNextStepsContent()` |

---

## Part 2: Missing Hooks

### Current Roadmap (Phase 6.1)
```
- src/hooks/booking/useBookingFlow.ts
- src/hooks/booking/useBookingSession.ts
```

### Missing Hooks (from client-portal)

| Hook | Purpose | Key Exports |
|------|---------|-------------|
| `useBookingCore.tsx` | Core state management | `useEventTypes()`, `useBookingFlows()`, `useBookingSession()`, `useSessionTimer()`, `useSessionRecovery()` |
| `useIntroduction.tsx` | Introduction step | `useIntroduction()`, `useIntroductionData()` |
| `useDateTime.tsx` | Date/time selection | `useDateTime()`, `useDateTimeData()`, availability checking |
| `useContactInfo.tsx` | Contact collection | `useContactInfo()`, `useContactInfoValidation()`, field requirements |
| `usePayment.tsx` | Payment management | `usePaymentGateways()`, `useFlowPaymentGateways()`, `usePaymentFlow()`, `useGatewaySelection()`, `usePaymentCalculations()` |
| `useQuestionnaire.tsx` | Dynamic forms | `useQuestionnaires()`, `useQuestionnaireDetail()`, `useQuestionnaireResponses()`, `useQuestionnaireFileUpload()` |
| `useConfirmation.tsx` | Completion flow | `useConfirmation()`, `useConfirmationDisplay()` |
| `useSimplePricing.tsx` | Unified pricing | `useSimplePricing()` - packages, addons, discounts, venue excess hours |

---

## Part 3: Missing Type Definitions

### Current Roadmap
No type files listed for booking.

### Required Type Files (from client-portal)

| File | Key Types |
|------|-----------|
| `src/types/booking/index.ts` | Re-export hub |
| `src/types/booking/core.types.ts` | `EventType`, `BookingFlow`, `BookingFlowStep`, `StepType`, `StepConfiguration` |
| `src/types/booking/api.types.ts` | `BookingSessionCreate`, `BookingSessionUpdate`, `BookingCompletionResult`, `ValidationError`, `StepValidationResult` |
| `src/types/booking/payment.types.ts` | `PaymentGateway`, `PaymentGatewayResponse`, `PaymentStepConfiguration` |
| `src/types/booking/questionnaire.types.ts` | `Questionnaire`, `QuestionnaireField`, `QuestionnaireFieldType`, file upload types |
| `src/types/booking/venues.types.ts` | `RentableVenue`, `VenueOperatingRulesPublic`, `CalculatedEventTimes`, `VenueSelectionStepData` |
| `src/types/booking/stepData.types.ts` | All step data interfaces, `SelectedPackage`, `SelectedAddon`, `PricingCalculation` |
| `src/types/booking/stepConfigurations.types.ts` | All step configuration interfaces, `ProductCategory`, `ProductOption` |
| `src/types/booking/bookingData.types.ts` | `BookingData`, `SessionUpdatePayload`, `BookingSession` |
| `src/types/booking/state.types.ts` | `BookingProgress`, `BookingUIState`, `BookingState`, `BookingActions` |

---

## Part 4: Missing Utility Files

### Required Utilities (from client-portal)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/utils/bookingHelpers.ts` | Booking utilities | `validateRequiredFields()`, `formatCurrency()`, `formatDate()`, `formatTime()`, `isSessionExpired()`, `getSessionRemainingTime()` |
| `src/utils/bookingValidation.ts` | Zod schemas | Step-specific validation schemas for all 10 steps |
| `src/utils/timezone.ts` | Philippines TZ | `parseAsPhilippinesTime()`, `formatPhilippinesTime()`, `isWithinBusinessHours()`, `getNextBusinessDay()` |
| `src/utils/currency.ts` | Currency formatting | `formatCurrency()`, `getCurrencySymbol()`, PHP/USD/EUR support |
| `src/utils/errorHandler.ts` | Error handling | `extractMessage()`, `extractValidationErrors()`, `isNetworkError()`, `isAuthError()` |
| `src/utils/storage.ts` | Secure storage | Session persistence, cart management (adapt for expo-secure-store) |
| `src/utils/security.ts` | XSS prevention | `sanitizeHTML()`, `sanitizeURL()`, `escapeHTML()` |
| `src/utils/validation.ts` | Form validation | `validateEmail()`, `validatePhone()`, `validatePassword()`, `getPasswordStrength()` |

---

## Part 5: Missing Components

### Current Roadmap (Phase 6.3)
```
- StepProgressBar.tsx
- VenueSelectionCard.tsx
- PackageCard.tsx
- AddonCard.tsx
- PricingSummary.tsx
- DateTimePicker.tsx
- QuestionnaireRenderer.tsx
```

### Missing Components (from client-portal)

#### Container & Navigation
| Component | Purpose |
|-----------|---------|
| `BookingContainer.tsx` | Main wrapper with header, progress, timer, footer, navigation |
| `StepRenderer.tsx` | Central router rendering appropriate step component |
| `MobileBookingNavigation.tsx` | Mobile navigation (already exists for web, needs RN version) |
| `SessionRecoveryDialog.tsx` | Dialog for recovering interrupted sessions |

#### Event Type Selection
| Component | Purpose |
|-----------|---------|
| `EventTypeSelection.tsx` | Event type cards with features, pricing, modal details |
| `CleanEventTypeSelection.tsx` | Simplified event type selection |

#### Shared/Reusable
| Component | Purpose |
|-----------|---------|
| `BookingSummaryCard.tsx` | Reusable booking summary (packages, addons, pricing) |
| `PaymentSummaryCard.tsx` | Payment details display (amount, type, refund policy) |
| `QuestionnaireSummaryCard.tsx` | Questionnaire responses in accordion format |
| `BookingProgressIndicator.tsx` | Multi-variant progress (linear, stepper, compact) |

#### Step-Specific (Missing Details)
| Component | Missing Features |
|-----------|------------------|
| `VenueSelectionStep.tsx` | Capacity display, included hours, excess hour rates, multi-select with min/max |
| `IntelligentDateTimeStep.tsx` | Calendar with availability, multi-day ranges, venue operating rules |
| `CleanPackageSelectionStep.tsx` | Custom bundle creation, venue hours customization, multi-venue discounts |
| `AddonSelectionStep.tsx` | Category grouping, quantity selectors, venue additional hours section |
| `QuestionnaireStep.tsx` | Multiple questionnaires, all field types, file uploads, conditional visibility |
| `PricingSummaryStep.tsx` | Discount code application, terms acceptance, marketing consent, special requests |
| `EnhancedContactInfoStep.tsx` | Auto-fill from user, real-time validation, account creation option |
| `PaymentStep.tsx` | Quote request flow, deposit/full options, saved payment methods, gateway selection |
| `ConfirmationStep.tsx` | Status display (processing/success/failed), summary cards, next steps |

---

## Part 6: Missing Context & Providers

### Required (from client-portal)

| Item | Purpose |
|------|---------|
| `BookingContext.tsx` | Complete booking state management |
| `BookingProvider` | Provider wrapper with all state and actions |

#### BookingState Structure
```typescript
{
  // Flow Management
  availableFlows: BookingFlow[];
  selectedEventType: EventType | null;
  currentFlow: BookingFlow | null;

  // Session Management
  currentSession: BookingSession | null;
  stepData: StepData;

  // Progress Tracking
  progress: {
    currentStepIndex: number;
    totalSteps: number;
    completedSteps: number[];
    canGoBack: boolean;
    canGoNext: boolean;
    canSkip: boolean;
  };

  // UI State
  ui: {
    isLoading: boolean;
    isValidating: boolean;
    isSubmitting: boolean;
    error: string | null;
    validationErrors: Record<string, string[]>;
  };

  // Payment Configuration
  paymentGateways: PaymentGateway[];
  selectedPaymentGateway: PaymentGateway | null;

  // Pricing Information
  totalPrice: string;
  taxRate: number;
  pricingBreakdown: {...};
  breakdown: LineItem[];

  // Session Recovery
  recoverableSession: {...} | null;
}
```

#### BookingActions Required
- `fetchAvailableFlows()`, `selectEventType()`
- `startSession()`, `updateStepData()`, `validateStep()`
- `goToStep()`, `nextStep()`, `previousStep()`, `skipStep()`
- `completeBooking()`, `fetchPaymentGateways()`, `selectPaymentGateway()`
- `updateTotalPrice()`, `setTaxRate()`, `setPricingBreakdown()`
- `resetBooking()`, `clearErrors()`, `clearRecoverableSession()`

---

## Part 7: Feature Gaps by Step

### 7.1 Introduction Step
| Feature | Status | Details |
|---------|--------|---------|
| Terms acknowledgment checkbox | Missing | Single checkbox with validation |
| Animated welcome header | Missing | Event type display with animation |
| Accessibility announcements | Missing | Screen reader support |
| Configuration-driven content | Missing | Title, description from config |

### 7.2 Venue Selection Step
| Feature | Status | Details |
|---------|--------|---------|
| Event-type-specific pricing | Missing | `VenuesApi.getEffectivePricing()` |
| Multi-venue selection | Missing | Min/max venue constraints from config |
| Capacity display | Missing | People icons, range display |
| Included hours display | Missing | Per-venue included hours |
| Excess hour rates | Missing | Base price + excess hour pricing |
| All-day access detection | Missing | Special handling for all-day venues |
| Featured images | Missing | Venue image display |
| Location metadata | Missing | Location description on cards |

### 7.3 DateTime Step
| Feature | Status | Details |
|---------|--------|---------|
| Calendar with availability | Missing | Blocked dates display |
| Multi-day range selection | Missing | Configurable single vs. range |
| Min/max day constraints | Missing | From step configuration |
| Venue operating rules | Missing | Check-in/check-out times |
| Real-time availability checking | Missing | `DateTimeApi.checkAvailability()` |
| Philippines timezone handling | Missing | All dates in Asia/Manila |
| Automatic venue loading | Missing | From selected package |

### 7.4 Package Selection Step
| Feature | Status | Details |
|---------|--------|---------|
| Dual mode (packages vs custom) | Missing | Pre-made packages OR custom bundle |
| Custom bundle creation | Missing | Calculate from selected venues |
| Multi-venue bundle discount | Missing | 10% automatic discount |
| Venue additional hours selector | Missing | Per-venue excess hours |
| All-day access detection | Missing | Skip hours selector for all-day |
| Pricing model display | Missing | HOURLY vs FIXED |
| Quantity selector | Missing | Multiple package selection |
| Event days filtering | Missing | Filter by date range selected |
| Featured indicator badges | Missing | Featured package display |
| Collapsible details | Missing | Min/max hours, advance booking |

### 7.5 Addon Selection Step
| Feature | Status | Details |
|---------|--------|---------|
| Category grouping | Missing | Optional grouping by category |
| Per-addon quantity selector | Missing | Increment/decrement controls |
| Min/max selection constraints | Missing | From step configuration |
| Venue additional hours section | Missing | Continuation from package step |
| Progress indicator | Missing | Selected count / total |
| Tax rate inclusion | Missing | `tax_rate` and `price_with_tax` |
| Featured addon badges | Missing | Visual indicator |

### 7.6 Questionnaire Step
| Feature | Status | Details |
|---------|--------|---------|
| Multiple questionnaire support | Missing | Load multiple per flow |
| All field types | Partial | text, textarea, number, email, phone, date, time, boolean, select, multi-select, radio, file, rating |
| File upload with validation | Missing | Size/type constraints |
| Completion progress bar | Missing | Visual progress |
| Dynamic field visibility | Missing | Conditional display rules |
| Dynamic questionnaire visibility | Missing | Conditional questionnaires |
| Field ordering | Missing | Sort by order field |

### 7.7 Pricing Summary Step
| Feature | Status | Details |
|---------|--------|---------|
| Itemized package breakdown | Missing | With excess hour details |
| Itemized addon breakdown | Missing | With quantities |
| Per-venue excess hours | Missing | New breakdown format |
| Discount code input | Missing | Apply/remove functionality |
| Discount validation | Missing | Validating, error, success states |
| Terms checkbox | Missing | With configurable URL |
| Marketing consent checkbox | Missing | Optional |
| Special requests textarea | Missing | Free-form text |
| Contact info display | Missing | Name, email, phone, company |
| Custom header/footer text | Missing | Configuration-driven |

### 7.8 Contact Info Step
| Feature | Status | Details |
|---------|--------|---------|
| Auto-fill from user | Missing | Pre-fill for authenticated users |
| Welcome back banner | Missing | For logged-in users |
| Real-time field validation | Missing | Visual validation states |
| Philippines phone format | Missing | +63 / 0 prefix, 10-11 digits |
| Field strength indicators | Missing | Progress bars for email/phone |
| Account creation option | Missing | Checkbox + password field |
| Password visibility toggle | Missing | Show/hide password |
| Custom fields support | Missing | From configuration |

### 7.9 Payment Step
| Feature | Status | Details |
|---------|--------|---------|
| Completion choice screen | Missing | Payment vs. quote request |
| Quote request flow | Missing | Special requirements textarea |
| Deposit vs. full payment | Missing | Dynamic amount display |
| Balance due date | Missing | From payment plan settings |
| Saved payment methods | Missing | For authenticated users |
| Gateway selection | Missing | Stripe, PayPal, GCash, etc. |
| Stripe integration | Partial | Need `@stripe/stripe-react-native` |
| Trust signals | Missing | Price locked, date reserved, secure |
| Refund policy display | Missing | Deadline hours, percentage |

### 7.10 Confirmation Step
| Feature | Status | Details |
|---------|--------|---------|
| Status display states | Missing | Processing, success, failed, pending |
| Retry on failure | Missing | Retry button for failed |
| BookingSummaryCard | Missing | Packages, addons, pricing |
| PaymentSummaryCard | Missing | Amounts, terms, refund policy |
| QuestionnaireSummaryCard | Missing | Collected responses |
| Contact information card | Missing | Summary display |
| Booking reference | Missing | Copyable chip format |
| Next steps content | Missing | Configurable action items |
| Navigate to dashboard | Missing | For authenticated users |

---

## Part 8: Session Management Gaps

| Feature | Status | Details |
|---------|--------|---------|
| Session timer | Missing | Countdown to expiry |
| Session persistence | Missing | Save to secure storage |
| Session recovery dialog | Missing | Restore interrupted bookings |
| Debounced backend sync | Missing | 1-second debounce on updates |
| Expired session cleanup | Missing | Auto-remove on mount |
| Cross-tab session sync | Missing | Monitor storage changes |
| Session abandonment | Missing | Track reason for abandonment |

---

## Part 9: Implementation Plan

### Phase 6.1 - Types & Utilities (Foundation)

#### 6.1.1 Type Definitions
- [ ] Create `src/types/booking/index.ts`
- [ ] Create `src/types/booking/core.types.ts`
- [ ] Create `src/types/booking/api.types.ts`
- [ ] Create `src/types/booking/payment.types.ts`
- [ ] Create `src/types/booking/questionnaire.types.ts`
- [ ] Create `src/types/booking/venues.types.ts`
- [ ] Create `src/types/booking/stepData.types.ts`
- [ ] Create `src/types/booking/stepConfigurations.types.ts`
- [ ] Create `src/types/booking/bookingData.types.ts`
- [ ] Create `src/types/booking/state.types.ts`

#### 6.1.2 Utility Files
- [ ] Create `src/utils/bookingHelpers.ts`
- [ ] Create `src/utils/bookingValidation.ts` (Zod schemas)
- [ ] Create `src/utils/timezone.ts` (Philippines TZ)
- [ ] Create `src/utils/currency.ts`
- [ ] Create `src/utils/errorHandler.ts`
- [ ] Create `src/utils/bookingStorage.ts` (expo-secure-store adapter)
- [ ] Create `src/utils/security.ts`

### Phase 6.2 - API Layer (Complete)

#### 6.2.1 Core APIs
- [ ] Create `src/apis/booking/core.api.ts`
- [ ] Create `src/apis/booking/introduction.api.ts`
- [ ] Create `src/apis/booking/datetime.api.ts`
- [ ] Create `src/apis/booking/venues.api.ts`
- [ ] Create `src/apis/booking/products.api.ts`
- [ ] Create `src/apis/booking/questionnaire.api.ts`
- [ ] Create `src/apis/booking/contact_info.api.ts`
- [ ] Create `src/apis/booking/payment.api.ts`
- [ ] Create `src/apis/booking/confirmation.api.ts`

### Phase 6.3 - Hooks Layer (Complete)

- [ ] Create `src/hooks/booking/useBookingCore.tsx`
- [ ] Create `src/hooks/booking/useIntroduction.tsx`
- [ ] Create `src/hooks/booking/useDateTime.tsx`
- [ ] Create `src/hooks/booking/useVenues.tsx`
- [ ] Create `src/hooks/booking/useProducts.tsx`
- [ ] Create `src/hooks/booking/useQuestionnaire.tsx`
- [ ] Create `src/hooks/booking/useContactInfo.tsx`
- [ ] Create `src/hooks/booking/usePayment.tsx`
- [ ] Create `src/hooks/booking/useConfirmation.tsx`
- [ ] Create `src/hooks/booking/useSimplePricing.tsx`

### Phase 6.4 - Context & State Management

- [ ] Create `src/contexts/BookingContext.tsx`
- [ ] Implement complete BookingState
- [ ] Implement all BookingActions
- [ ] Session persistence with expo-secure-store
- [ ] Session recovery logic
- [ ] Debounced backend synchronization

### Phase 6.5 - Container & Navigation Components

- [ ] Create `src/components/booking/BookingContainer.tsx`
- [ ] Create `src/components/booking/StepRenderer.tsx`
- [ ] Create `src/components/booking/BookingProgressIndicator.tsx`
- [ ] Create `src/components/booking/SessionTimer.tsx`
- [ ] Create `src/components/booking/SessionRecoverySheet.tsx` (bottom sheet)
- [ ] Create `src/components/booking/BookingNavigation.tsx`

### Phase 6.6 - Event Type Selection

- [ ] Create `src/components/booking/EventTypeSelection.tsx`
- [ ] Create `src/components/booking/EventTypeCard.tsx`
- [ ] Create `src/components/booking/EventTypeDetailModal.tsx`

### Phase 6.7 - Step Screens (Full Feature)

#### Introduction
- [ ] Create `app/booking/[flowId]/index.tsx`
- [ ] Terms acknowledgment with validation
- [ ] Animated welcome header
- [ ] Accessibility support

#### Venue Selection
- [ ] Create `app/booking/[flowId]/venue.tsx`
- [ ] Create `src/components/booking/VenueCard.tsx`
- [ ] Multi-venue selection with min/max
- [ ] Event-type-specific pricing
- [ ] Capacity and included hours display
- [ ] Excess hour rates display

#### DateTime
- [ ] Create `app/booking/[flowId]/datetime.tsx`
- [ ] Create `src/components/booking/EventCalendar.tsx`
- [ ] Calendar with availability overlay
- [ ] Single-day and multi-day range modes
- [ ] Venue operating rules display
- [ ] Real-time availability checking

#### Package Selection
- [ ] Create `app/booking/[flowId]/package.tsx`
- [ ] Create `src/components/booking/PackageCard.tsx`
- [ ] Create `src/components/booking/CustomBundleCard.tsx`
- [ ] Create `src/components/booking/VenueHoursSelector.tsx`
- [ ] Pre-made packages display
- [ ] Custom bundle from venues
- [ ] Multi-venue discount calculation
- [ ] Venue additional hours selection

#### Addon Selection
- [ ] Create `app/booking/[flowId]/addons.tsx`
- [ ] Create `src/components/booking/AddonCard.tsx`
- [ ] Create `src/components/booking/AddonQuantitySelector.tsx`
- [ ] Category grouping
- [ ] Quantity selectors with min/max
- [ ] Progress indicator

#### Questionnaire
- [ ] Create `app/booking/[flowId]/questionnaire.tsx`
- [ ] Create `src/components/booking/QuestionnaireRenderer.tsx`
- [ ] Create `src/components/booking/fields/TextField.tsx`
- [ ] Create `src/components/booking/fields/SelectField.tsx`
- [ ] Create `src/components/booking/fields/MultiSelectField.tsx`
- [ ] Create `src/components/booking/fields/DateField.tsx`
- [ ] Create `src/components/booking/fields/TimeField.tsx`
- [ ] Create `src/components/booking/fields/FileUploadField.tsx`
- [ ] Create `src/components/booking/fields/RatingField.tsx`
- [ ] Create `src/components/booking/fields/CheckboxField.tsx`
- [ ] Multiple questionnaire support
- [ ] All field types
- [ ] File upload with expo-document-picker
- [ ] Conditional visibility

#### Pricing Summary
- [ ] Create `app/booking/[flowId]/summary.tsx`
- [ ] Create `src/components/booking/PricingBreakdown.tsx`
- [ ] Create `src/components/booking/DiscountCodeInput.tsx`
- [ ] Create `src/components/booking/TermsCheckbox.tsx`
- [ ] Create `src/components/booking/BookingReviewSection.tsx`
- [ ] Itemized breakdown with excess hours
- [ ] Discount code validation
- [ ] Terms and marketing consent
- [ ] Special requests input

#### Contact Info
- [ ] Create `app/booking/[flowId]/contact.tsx`
- [ ] Create `src/components/booking/ContactForm.tsx`
- [ ] Create `src/components/booking/ValidationIndicator.tsx`
- [ ] Auto-fill from authenticated user
- [ ] Real-time field validation
- [ ] Philippines phone formatting
- [ ] Account creation option

#### Payment
- [ ] Create `app/booking/[flowId]/payment.tsx`
- [ ] Create `src/components/booking/CompletionChoiceScreen.tsx`
- [ ] Create `src/components/booking/PaymentTypeSelector.tsx`
- [ ] Create `src/components/booking/GatewaySelector.tsx`
- [ ] Create `src/components/booking/QuoteRequestForm.tsx`
- [ ] Create `src/components/booking/StripePaymentForm.tsx`
- [ ] Create `src/components/booking/SavedPaymentMethods.tsx`
- [ ] Completion choice (payment vs quote)
- [ ] Deposit/full payment options
- [ ] Stripe React Native integration
- [ ] Saved payment methods for auth users
- [ ] Refund policy display

#### Confirmation
- [ ] Create `app/booking/[flowId]/confirmation.tsx`
- [ ] Create `src/components/booking/ConfirmationStatus.tsx`
- [ ] Create `src/components/booking/BookingSummaryCard.tsx`
- [ ] Create `src/components/booking/PaymentSummaryCard.tsx`
- [ ] Create `src/components/booking/QuestionnaireSummaryCard.tsx`
- [ ] Create `src/components/booking/NextStepsCard.tsx`
- [ ] Status states (processing/success/failed)
- [ ] All summary cards
- [ ] Booking reference display
- [ ] Navigation actions

### Phase 6.8 - Session Management

- [ ] Implement session timer component
- [ ] Session persistence to secure storage
- [ ] Session recovery bottom sheet
- [ ] Debounced backend synchronization
- [ ] Expired session cleanup
- [ ] Session abandonment tracking

---

## Part 10: Updated Roadmap Section

Replace the current Phase 6 in ROADMAP.md with:

```markdown
## Phase 6: Booking Flow (Full Feature Parity)

### 6.1 Types & Utilities
- [ ] Create all booking type definitions (10 files)
- [ ] Create utility files (7 files)
- [ ] Implement Zod validation schemas

### 6.2 API Layer
- [ ] Create `src/apis/booking/core.api.ts`
- [ ] Create `src/apis/booking/introduction.api.ts`
- [ ] Create `src/apis/booking/datetime.api.ts`
- [ ] Create `src/apis/booking/venues.api.ts`
- [ ] Create `src/apis/booking/products.api.ts`
- [ ] Create `src/apis/booking/questionnaire.api.ts`
- [ ] Create `src/apis/booking/contact_info.api.ts`
- [ ] Create `src/apis/booking/payment.api.ts`
- [ ] Create `src/apis/booking/confirmation.api.ts`

### 6.3 Hooks Layer
- [ ] Create `src/hooks/booking/useBookingCore.tsx`
- [ ] Create `src/hooks/booking/useIntroduction.tsx`
- [ ] Create `src/hooks/booking/useDateTime.tsx`
- [ ] Create `src/hooks/booking/useVenues.tsx`
- [ ] Create `src/hooks/booking/useProducts.tsx`
- [ ] Create `src/hooks/booking/useQuestionnaire.tsx`
- [ ] Create `src/hooks/booking/useContactInfo.tsx`
- [ ] Create `src/hooks/booking/usePayment.tsx`
- [ ] Create `src/hooks/booking/useConfirmation.tsx`
- [ ] Create `src/hooks/booking/useSimplePricing.tsx`

### 6.4 Context & State Management
- [ ] Create `src/contexts/BookingContext.tsx`
- [ ] Implement BookingState and BookingActions
- [ ] Session persistence with expo-secure-store
- [ ] Session recovery logic
- [ ] Debounced backend sync

### 6.5 Container Components
- [ ] Create `src/components/booking/BookingContainer.tsx`
- [ ] Create `src/components/booking/StepRenderer.tsx`
- [ ] Create `src/components/booking/BookingProgressIndicator.tsx`
- [ ] Create `src/components/booking/SessionTimer.tsx`
- [ ] Create `src/components/booking/SessionRecoverySheet.tsx`
- [ ] Create `src/components/booking/BookingNavigation.tsx`

### 6.6 Event Type Selection
- [ ] Create `src/components/booking/EventTypeSelection.tsx`
- [ ] Create `src/components/booking/EventTypeCard.tsx`
- [ ] Create `src/components/booking/EventTypeDetailModal.tsx`

### 6.7 Step Screens
- [ ] Create `app/booking/_layout.tsx`
- [ ] Create `app/booking/[flowId]/index.tsx` (Introduction)
- [ ] Create `app/booking/[flowId]/venue.tsx` (Venue Selection)
- [ ] Create `app/booking/[flowId]/datetime.tsx` (Date/Time)
- [ ] Create `app/booking/[flowId]/package.tsx` (Package Selection)
- [ ] Create `app/booking/[flowId]/addons.tsx` (Add-ons)
- [ ] Create `app/booking/[flowId]/questionnaire.tsx` (Questionnaire)
- [ ] Create `app/booking/[flowId]/summary.tsx` (Pricing Summary)
- [ ] Create `app/booking/[flowId]/contact.tsx` (Contact Info)
- [ ] Create `app/booking/[flowId]/payment.tsx` (Payment)
- [ ] Create `app/booking/[flowId]/confirmation.tsx` (Confirmation)

### 6.8 Step Components

#### Venue Selection Components
- [ ] Create `src/components/booking/VenueCard.tsx`
- [ ] Multi-venue selection with min/max constraints
- [ ] Event-type-specific pricing display
- [ ] Capacity, included hours, excess rates

#### DateTime Components
- [ ] Create `src/components/booking/EventCalendar.tsx`
- [ ] Calendar with availability overlay
- [ ] Single-day and multi-day range modes
- [ ] Venue operating rules display

#### Package Components
- [ ] Create `src/components/booking/PackageCard.tsx`
- [ ] Create `src/components/booking/CustomBundleCard.tsx`
- [ ] Create `src/components/booking/VenueHoursSelector.tsx`
- [ ] Custom bundle from venues with discount
- [ ] Venue additional hours selection

#### Addon Components
- [ ] Create `src/components/booking/AddonCard.tsx`
- [ ] Create `src/components/booking/AddonQuantitySelector.tsx`
- [ ] Category grouping, quantity limits

#### Questionnaire Components
- [ ] Create `src/components/booking/QuestionnaireRenderer.tsx`
- [ ] Create field components for all types (text, select, multi-select, date, time, file, rating, checkbox)
- [ ] Multiple questionnaire support
- [ ] Conditional visibility logic

#### Pricing Summary Components
- [ ] Create `src/components/booking/PricingBreakdown.tsx`
- [ ] Create `src/components/booking/DiscountCodeInput.tsx`
- [ ] Create `src/components/booking/TermsCheckbox.tsx`
- [ ] Create `src/components/booking/BookingReviewSection.tsx`

#### Contact Components
- [ ] Create `src/components/booking/ContactForm.tsx`
- [ ] Create `src/components/booking/ValidationIndicator.tsx`
- [ ] Auto-fill, real-time validation, PH phone format

#### Payment Components
- [ ] Create `src/components/booking/CompletionChoiceScreen.tsx`
- [ ] Create `src/components/booking/PaymentTypeSelector.tsx`
- [ ] Create `src/components/booking/GatewaySelector.tsx`
- [ ] Create `src/components/booking/QuoteRequestForm.tsx`
- [ ] Create `src/components/booking/StripePaymentForm.tsx`
- [ ] Create `src/components/booking/SavedPaymentMethods.tsx`

#### Confirmation Components
- [ ] Create `src/components/booking/ConfirmationStatus.tsx`
- [ ] Create `src/components/booking/BookingSummaryCard.tsx`
- [ ] Create `src/components/booking/PaymentSummaryCard.tsx`
- [ ] Create `src/components/booking/QuestionnaireSummaryCard.tsx`
- [ ] Create `src/components/booking/NextStepsCard.tsx`

### 6.9 Session Management
- [ ] Session timer with expiry countdown
- [ ] Session persistence to expo-secure-store
- [ ] Session recovery bottom sheet
- [ ] Debounced backend synchronization
- [ ] Expired session cleanup on mount
```

---

## Appendix A: File Count Summary

| Category | Current Roadmap | Required | Gap |
|----------|-----------------|----------|-----|
| API Files | 3 | 9 | +6 |
| Hook Files | 2 | 10 | +8 |
| Type Files | 0 | 10 | +10 |
| Utility Files | 0 | 7 | +7 |
| Context Files | 0 | 1 | +1 |
| Screen Files | 11 | 11 | 0 |
| Component Files | 7 | 40+ | +33 |
| **Total** | **23** | **88+** | **+65** |

---

## Appendix B: Client-Portal Reference Files

All features documented here are backed by code in:
- `/frontend/client-portal/src/apis/booking/` (9 files)
- `/frontend/client-portal/src/hooks/booking/` (8 files)
- `/frontend/client-portal/src/types/booking/` (10 files)
- `/frontend/client-portal/src/components/booking/` (22+ files)
- `/frontend/client-portal/src/contexts/BookingContext.tsx`
- `/frontend/client-portal/src/utils/` (11 files)
