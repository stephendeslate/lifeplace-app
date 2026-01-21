# Booking Flow Implementation Guide

> **Complete implementation reference for React Native booking flow**
> **Goal:** Full feature parity with `frontend/client-portal/src/`
> **See also:** [BOOKING_FLOW_GAP_ANALYSIS.md](BOOKING_FLOW_GAP_ANALYSIS.md) for feature requirements

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Type Definitions](#2-type-definitions)
3. [API Layer](#3-api-layer)
4. [Custom Hooks](#4-custom-hooks)
5. [BookingContext](#5-bookingcontext)
6. [Utility Functions](#6-utility-functions)
7. [Step Components](#7-step-components)
8. [Session Management](#8-session-management)
9. [Stripe Integration](#9-stripe-integration)

---

## 1. Architecture Overview

### File Structure

```
src/
├── apis/
│   └── booking/
│       ├── core.api.ts           # Session management, flow operations
│       ├── introduction.api.ts   # Introduction step
│       ├── datetime.api.ts       # Date/time selection, availability
│       ├── venues.api.ts         # Venue selection, pricing
│       ├── products.api.ts       # Packages, addons, discounts
│       ├── questionnaire.api.ts  # Dynamic forms
│       ├── contact_info.api.ts   # Contact validation
│       ├── payment.api.ts        # Payment gateways
│       └── confirmation.api.ts   # Booking completion
├── hooks/
│   └── booking/
│       ├── useBookingCore.tsx    # Core session/flow hooks
│       ├── useIntroduction.tsx   # Introduction step
│       ├── useDateTime.tsx       # Date/time selection
│       ├── useVenues.tsx         # Venue selection
│       ├── useProducts.tsx       # Products queries
│       ├── useQuestionnaire.tsx  # Dynamic forms
│       ├── useContactInfo.tsx    # Contact validation
│       ├── usePayment.tsx        # Payment flow
│       ├── useConfirmation.tsx   # Completion
│       └── useSimplePricing.tsx  # Unified pricing
├── types/
│   └── booking/
│       ├── index.ts              # Re-exports
│       ├── core.types.ts         # Core types
│       ├── api.types.ts          # API request/response
│       ├── payment.types.ts      # Payment types
│       ├── questionnaire.types.ts
│       ├── venues.types.ts
│       ├── stepData.types.ts
│       ├── stepConfigurations.types.ts
│       ├── bookingData.types.ts
│       └── state.types.ts
├── contexts/
│   └── BookingContext.tsx        # Complete state management
├── providers/
│   └── BookingProvider.tsx       # Provider wrapper
├── utils/
│   ├── bookingHelpers.ts         # Validation, formatting
│   ├── bookingValidation.ts      # Zod schemas
│   ├── bookingStorage.ts         # expo-secure-store persistence
│   ├── timezone.ts               # Philippines timezone
│   ├── currency.ts               # PHP formatting
│   ├── errorHandler.ts           # API error handling
│   └── security.ts               # Input sanitization
├── components/
│   └── booking/
│       ├── BookingContainer.tsx
│       ├── StepRenderer.tsx
│       ├── BookingProgressIndicator.tsx
│       ├── SessionTimer.tsx
│       ├── SessionRecoverySheet.tsx
│       ├── BookingNavigation.tsx
│       ├── EventTypeSelection.tsx
│       ├── EventTypeCard.tsx
│       ├── VenueCard.tsx
│       ├── PackageCard.tsx
│       ├── CustomBundleCard.tsx
│       ├── VenueHoursSelector.tsx
│       ├── AddonCard.tsx
│       ├── AddonQuantitySelector.tsx
│       ├── EventCalendar.tsx
│       ├── QuestionnaireRenderer.tsx
│       ├── PricingBreakdown.tsx
│       ├── DiscountCodeInput.tsx
│       ├── ContactForm.tsx
│       ├── CompletionChoiceScreen.tsx
│       ├── PaymentTypeSelector.tsx
│       ├── GatewaySelector.tsx
│       ├── StripePaymentForm.tsx
│       ├── ConfirmationStatus.tsx
│       ├── BookingSummaryCard.tsx
│       ├── PaymentSummaryCard.tsx
│       ├── QuestionnaireSummaryCard.tsx
│       └── fields/
│           ├── TextField.tsx
│           ├── TextareaField.tsx
│           ├── NumberField.tsx
│           ├── EmailField.tsx
│           ├── PhoneField.tsx
│           ├── DateField.tsx
│           ├── TimeField.tsx
│           ├── SelectField.tsx
│           ├── MultiSelectField.tsx
│           ├── RadioField.tsx
│           ├── CheckboxField.tsx
│           ├── FileUploadField.tsx
│           └── RatingField.tsx
└── app/
    └── booking/
        ├── _layout.tsx
        └── [flowId]/
            ├── index.tsx         # Introduction
            ├── venue.tsx
            ├── datetime.tsx
            ├── package.tsx
            ├── addons.tsx
            ├── questionnaire.tsx
            ├── summary.tsx
            ├── contact.tsx
            ├── payment.tsx
            └── confirmation.tsx
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      BookingProvider                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   BookingContext                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ BookingState│  │BookingActions│  │   Session   │     │   │
│  │  │  - flows    │  │ - nextStep() │  │  Recovery   │     │   │
│  │  │  - session  │  │ - updateData │  │             │     │   │
│  │  │  - stepData │  │ - complete() │  │             │     │   │
│  │  │  - progress │  │              │  │             │     │   │
│  │  │  - pricing  │  │              │  │             │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐    │
│  │  Step Hooks │      │  API Layer  │      │   Storage   │    │
│  │ useDateTime │      │ core.api.ts │      │ SecureStore │    │
│  │ usePayment  │ ──▶  │ venues.api  │ ──▶  │   Backup    │    │
│  │ etc.        │      │ etc.        │      │             │    │
│  └─────────────┘      └─────────────┘      └─────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Type Definitions

### 2.1 Core Types (`src/types/booking/core.types.ts`)

```typescript
// src/types/booking/core.types.ts

export interface EventType {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  features?: string[];
  starting_price?: string;
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
  id: number;
  step_type: StepType;
  step_type_display: string;
  order: number;
  title: string;
  description?: string;
  is_required: boolean;
  is_skippable: boolean;
  is_enabled: boolean;
  configuration: StepConfiguration;
  validation_rules?: Record<string, unknown>;
}

export interface BookingFlow {
  id: number;
  name: string;
  slug: string;
  description?: string;
  event_type: EventType;
  enabled_steps: BookingFlowStep[];
  is_active: boolean;
  require_authentication: boolean;
  session_timeout_minutes: number;
  allow_guest_booking: boolean;
  payment_terms?: PaymentTermsConfig;
}

export interface PaymentTermsConfig {
  allow_full_payment: boolean;
  allow_deposit: boolean;
  deposit_percentage: number;
  deposit_amount_fixed?: string;
  balance_due_days: number;
  allow_quote_request: boolean;
  refund_policy_text?: string;
  refund_percentage: number;
  refund_deadline_hours: number;
}

// Base interface - each step type extends this
export interface StepConfiguration {
  title?: string;
  description?: string;
  custom_css?: string;
}
```

### 2.2 Step Data Types (`src/types/booking/stepData.types.ts`)

```typescript
// src/types/booking/stepData.types.ts

export interface IntroductionStepData {
  acknowledged: boolean;
}

export interface VenueSelectionStepData {
  selected_venue_ids: number[];
}

export interface DateTimeStepData {
  start_date: string;  // ISO 8601
  end_date?: string;   // For multi-day events
  start_time?: string; // HH:mm
  end_time?: string;
  venue_id?: number;
  resource_requirements?: Record<string, number>;
}

export interface PackageSelectionStepData {
  selected_packages: SelectedPackage[];
  venue_additional_hours?: Record<string, number>; // venueId -> hours
}

export interface SelectedPackage {
  product_id: number;
  name: string;
  price: string;
  quantity: number;
  tax_rate?: number;
  price_with_tax?: string;
  included_hours?: number;
  excess_hours?: number;
  excess_hour_rate?: string;
}

export interface AddonSelectionStepData {
  selected_addons: SelectedAddon[];
  venue_additional_hours?: Record<string, number>;
}

export interface SelectedAddon {
  product_id: number;
  name: string;
  price: string;
  quantity: number;
  tax_rate?: number;
  price_with_tax?: string;
  category_id?: number;
}

export interface QuestionnaireStepData {
  [fieldKey: string]: unknown; // field_${fieldId}: value
}

export interface PricingSummaryStepData {
  applied_discount_code?: string;
  special_requests?: string;
  terms_accepted: boolean;
  marketing_consent?: boolean;
}

export interface ContactInfoStepData {
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  company?: string;
  create_account?: boolean;
  password?: string;
}

export interface PaymentStepData {
  payment_method: string;
  payment_type: 'FULL' | 'DEPOSIT';
  payment_gateway_id?: number;
  payment_method_id?: string;
  payment_method_token?: string;
  billing_address?: string;
  save_payment_method?: boolean;
  completion_type?: 'payment' | 'quote';
  quote_message?: string;
  deposit_amount?: number;
  balance_due_days?: number;
}

export interface ConfirmationStepData {
  booking_reference?: string;
  completion_status: 'pending' | 'processing' | 'completed' | 'failed';
  completed_at?: string;
  booking_completion_result?: BookingCompletionResult;
  confirmation_email_sent?: boolean;
}

// Union type for all step data
export type StepData =
  | IntroductionStepData
  | VenueSelectionStepData
  | DateTimeStepData
  | PackageSelectionStepData
  | AddonSelectionStepData
  | QuestionnaireStepData
  | PricingSummaryStepData
  | ContactInfoStepData
  | PaymentStepData
  | ConfirmationStepData;

// Pricing calculation
export interface PricingCalculation {
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  formattedSubtotal: string;
  formattedTax: string;
  formattedDiscount: string;
  formattedTotal: string;
  lineItems: PricingLineItem[];
}

export interface PricingLineItem {
  item_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  type: 'PACKAGE' | 'ADDON' | 'TAX' | 'DISCOUNT' | 'FEE' | 'EXCESS_HOURS';
  venue_id?: number;
  venue_name?: string;
}
```

### 2.3 Venue Types (`src/types/booking/venues.types.ts`)

```typescript
// src/types/booking/venues.types.ts

export interface VenueOperatingRulesPublic {
  default_check_in_time: string;  // HH:mm
  default_check_out_time: string;
  minimum_hours: number;
  maximum_hours: number;
  early_checkin_fee_per_hour?: string;
  late_checkout_fee_per_hour?: string;
  is_all_day_access: boolean;
  capacity_min?: number;
  capacity_max?: number;
}

export interface RentableVenue {
  id: number;
  name: string;
  description?: string;
  location_description?: string;
  featured_image_url?: string;
  gallery_images?: string[];
  capacity_min: number;
  capacity_max: number;
  base_price: string;
  included_hours: number;
  excess_hour_rate: string;
  operating_rules: VenueOperatingRulesPublic;
  amenities?: string[];
  is_featured?: boolean;
}

export interface RentableVenueWithEventType extends RentableVenue {
  event_type_pricing?: {
    base_price: string;
    included_hours: number;
    excess_hour_rate: string;
  };
}

export interface VenueSelectionStepConfiguration {
  available_venues?: RentableVenue[];
  min_venues: number;
  max_venues: number;
  show_bundle_discount: boolean;
  bundle_discount_percentage: number;
  recommend_packages: boolean;
}

export interface CalculatedEventTimes {
  check_in_time: string;
  program_start_time: string;
  program_end_time: string;
  check_out_time: string;
  total_hours: number;
  included_hours: number;
  excess_hours: number;
}

export interface VenueAvailabilityResponse {
  venue_id: number;
  blocked_dates: string[];  // ISO dates
  available_time_slots?: {
    date: string;
    slots: { start: string; end: string }[];
  }[];
}
```

### 2.4 Questionnaire Types (`src/types/booking/questionnaire.types.ts`)

```typescript
// src/types/booking/questionnaire.types.ts

export type QuestionnaireFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'file'
  | 'rating';

export interface QuestionnaireField {
  id: number;
  field_type: QuestionnaireFieldType;
  label: string;
  placeholder?: string;
  help_text?: string;
  is_required: boolean;
  order: number;
  options?: string[];  // For select, multi_select, radio
  validation_rules?: {
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    pattern?: string;
    allowed_file_types?: string[];
    max_file_size_mb?: number;
  };
  conditional_display?: {
    depends_on_field: number;
    show_when_value: unknown;
  };
}

export interface Questionnaire {
  id: number;
  name: string;
  title: string;
  description?: string;
  is_active: boolean;
  fields: QuestionnaireField[];
}

export interface QuestionnaireStepConfiguration {
  questionnaires: QuestionnaireStepItem[];
  allow_file_uploads: boolean;
  max_file_size_mb: number;
}

export interface QuestionnaireStepItem {
  questionnaire_id: number;
  questionnaire_name: string;
  is_required: boolean;
  order: number;
  conditional_display?: {
    show_when_event_type?: number;
    show_when_package_selected?: number;
  };
}
```

### 2.5 State Types (`src/types/booking/state.types.ts`)

```typescript
// src/types/booking/state.types.ts

import type { BookingFlow, BookingFlowStep, EventType } from './core.types';
import type { PaymentGateway } from './payment.types';
import type { PricingCalculation } from './stepData.types';

export interface BookingProgress {
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number[];
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
}

export interface BookingUIState {
  isLoading: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
}

export interface RecoverableSession {
  sessionId: string;
  lastUpdated: string;
  stepName: string;
  progressPercentage: number;
}

export interface BookingState {
  // Flow Management
  availableFlows: BookingFlow[];
  selectedEventType: EventType | null;
  currentFlow: BookingFlow | null;

  // Session Management
  currentSession: BookingSession | null;
  stepData: Record<string, unknown>;  // Step type -> data

  // Progress Tracking
  progress: BookingProgress;

  // UI State
  ui: BookingUIState;

  // Payment Configuration
  paymentGateways: PaymentGateway[];
  selectedPaymentGateway: PaymentGateway | null;

  // Pricing Information
  totalPrice: string;
  taxRate: number;
  pricingBreakdown: PricingCalculation | null;

  // Session Recovery
  recoverableSession: RecoverableSession | null;
}

export interface BookingActions {
  // Flow Management
  fetchAvailableFlows: () => Promise<void>;
  selectEventType: (eventType: EventType) => Promise<void>;

  // Session Management
  startSession: (flowId: number) => Promise<void>;
  updateStepData: (stepType: string, data: Record<string, unknown>) => Promise<void>;
  validateStep: (stepId: number, data: Record<string, unknown>) => Promise<boolean>;

  // Navigation
  goToStep: (stepIndex: number) => Promise<void>;
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  skipStep: () => Promise<void>;

  // Completion
  completeBooking: (completionType?: 'payment' | 'quote') => Promise<BookingCompletionResult>;

  // Payment Management
  fetchPaymentGateways: () => Promise<void>;
  selectPaymentGateway: (gateway: PaymentGateway) => void;

  // Pricing
  updateTotalPrice: (price: string) => void;
  setTaxRate: (rate: number) => void;
  setPricingBreakdown: (breakdown: PricingCalculation) => void;

  // Utilities
  resetBooking: () => void;
  clearErrors: () => void;
  clearRecoverableSession: (sessionId?: string) => void;

  // Helpers
  getSelectedProducts: () => { packages: SelectedPackage[]; addons: SelectedAddon[] };
  getBookingData: () => BookingData;
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
  event_type_id?: number;
  event_name?: string;
  venue_selection?: VenueSelectionStepData;
  date_time?: DateTimeStepData;
  selected_packages?: SelectedPackage[];
  selected_addons?: SelectedAddon[];
  contact_info?: ContactInfoStepData;
  payment_info?: PaymentStepData;
  questionnaire_responses?: Array<{
    questionnaire_id: number;
    responses: Record<string, unknown>;
  }>;
  pricing?: PricingCalculation;
  applied_discount_code?: string;
  special_requests?: string;
  internal_notes?: string;
  terms_accepted?: boolean;
  marketing_consent?: boolean;
  completed_steps?: number[];
  current_step_id?: number;
}
```

---

## 3. API Layer

### 3.1 Core API (`src/apis/booking/core.api.ts`)

```typescript
// src/apis/booking/core.api.ts
import { api } from '../client';
import type {
  BookingFlow,
  BookingSession,
  BookingCompletionResult,
  EventType,
  StepValidationResult,
} from '@/types/booking';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = '/api/bookingflow/public';
const SESSION_PREFIX = 'booking_session_';

export class BookingCoreApi {
  // ============ Flow Operations ============

  static async getEventTypes(): Promise<EventType[]> {
    const response = await api.get<EventType[]>(`${BASE_URL}/event-types/`);
    return response.data;
  }

  static async getAvailableFlows(eventTypeId?: number): Promise<BookingFlow[]> {
    const params = eventTypeId ? { event_type: eventTypeId } : {};
    const response = await api.get<BookingFlow[]>(`${BASE_URL}/flows/`, { params });
    return response.data;
  }

  static async getFlowById(flowId: number): Promise<BookingFlow> {
    const response = await api.get<BookingFlow>(`${BASE_URL}/flows/${flowId}/`);
    return response.data;
  }

  // ============ Session Operations ============

  static async startSession(
    flowId: number,
    sessionData?: Partial<BookingSession>
  ): Promise<{
    session_id: string;
    current_step: Record<string, unknown>;
    progress_percentage: number;
    expires_at: string;
  }> {
    const response = await api.post(`${BASE_URL}/flows/${flowId}/start_session/`, sessionData);
    return response.data;
  }

  static async getSession(sessionId: string): Promise<BookingSession> {
    const response = await api.get<BookingSession>(`${BASE_URL}/sessions/${sessionId}/`);
    return response.data;
  }

  static async updateSessionData(
    sessionId: string,
    stepId: number,
    data: Record<string, unknown>,
    proceedToNext: boolean = false
  ): Promise<{
    total_price: string;
    updated_at: string;
    current_step?: Record<string, unknown>;
    progress_percentage: number;
    validation_errors?: Record<string, string[]>;
  }> {
    const response = await api.patch(`${BASE_URL}/sessions/${sessionId}/update_data/`, {
      step_id: stepId,
      booking_data: data,
      mark_completed: proceedToNext,
    });
    return response.data;
  }

  static async validateStepData(
    sessionId: string,
    stepId: number,
    stepData: Record<string, unknown>
  ): Promise<StepValidationResult> {
    const response = await api.post(`${BASE_URL}/sessions/${sessionId}/validate_step/`, {
      step_id: stepId,
      data: stepData,
    });
    return response.data;
  }

  static async completeBooking(
    sessionId: string,
    completionType: 'payment' | 'quote' = 'payment'
  ): Promise<BookingCompletionResult> {
    const response = await api.post(`${BASE_URL}/sessions/${sessionId}/complete/`, {
      completion_type: completionType,
    });
    return response.data;
  }

  static async abandonSession(sessionId: string, reason?: string): Promise<void> {
    await api.post(`${BASE_URL}/sessions/${sessionId}/abandon/`, { reason });
  }

  static async getFlowPaymentGateways(flowId: number): Promise<{
    available_gateways: PaymentGateway[];
    default_gateway: number | null;
    require_immediate_payment: boolean;
  }> {
    const response = await api.get(`${BASE_URL}/flows/${flowId}/payment_gateways/`);
    return response.data;
  }

  static async calculatePricing(
    sessionId: string,
    discountCode?: string,
    venueAdditionalHours?: Record<string, number>
  ): Promise<PricingCalculation> {
    const response = await api.post(`${BASE_URL}/sessions/${sessionId}/calculate_pricing/`, {
      discount_code: discountCode,
      venue_additional_hours: venueAdditionalHours,
    });
    return response.data;
  }

  // ============ Session Persistence (SecureStore) ============

  static isSessionExpired(expiresAt: string): boolean {
    if (!expiresAt) return true;
    const expiryTime = new Date(expiresAt).getTime();
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer
    return Date.now() > expiryTime - bufferMs;
  }

  static getSessionTimeRemaining(expiresAt: string): { hours: number; minutes: number } {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return { hours: 0, minutes: 0 };
    return {
      hours: Math.floor(remaining / (1000 * 60 * 60)),
      minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
    };
  }

  static async saveSessionToLocal(sessionId: string, sessionData: Partial<BookingSession>): Promise<void> {
    try {
      const key = SESSION_PREFIX + sessionId;
      const existing = await this.loadSessionFromLocal(sessionId);
      const merged = { ...existing, ...sessionData, updated_at: new Date().toISOString() };
      await SecureStore.setItemAsync(key, JSON.stringify(merged));
    } catch (error) {
      console.warn('Failed to save session to SecureStore:', error);
    }
  }

  static async loadSessionFromLocal(sessionId: string): Promise<Partial<BookingSession> | null> {
    try {
      const key = SESSION_PREFIX + sessionId;
      const data = await SecureStore.getItemAsync(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static async clearSessionFromLocal(sessionId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SESSION_PREFIX + sessionId);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }
  }

  static async cleanupExpiredSessions(): Promise<void> {
    // Note: SecureStore doesn't support listing keys
    // This would need to maintain a separate index of session IDs
    // For now, sessions are cleaned up individually when accessed
  }

  static async clearAllSessionsFromLocal(): Promise<void> {
    // Requires maintaining session ID index
    // Implementation depends on how session IDs are tracked
  }
}
```

### 3.2 Venues API (`src/apis/booking/venues.api.ts`)

```typescript
// src/apis/booking/venues.api.ts
import { api } from '../client';
import type {
  RentableVenue,
  RentableVenueWithEventType,
  VenueAvailabilityResponse,
  CalculatedEventTimes,
} from '@/types/booking';

const BASE_URL = '/api/bookingflow/public';

export class VenuesApi {
  static async getActiveVenues(): Promise<RentableVenue[]> {
    const response = await api.get<RentableVenue[]>(`${BASE_URL}/venues/`);
    return response.data;
  }

  static async getRentableVenues(eventTypeId?: number): Promise<RentableVenue[]> {
    const params = eventTypeId ? { event_type: eventTypeId } : {};
    const response = await api.get<RentableVenue[]>(`${BASE_URL}/rentable-venues/`, { params });
    return response.data;
  }

  static async getRentableVenuesWithEventType(eventTypeId: number): Promise<RentableVenueWithEventType[]> {
    const response = await api.get<RentableVenueWithEventType[]>(
      `${BASE_URL}/rentable-venues/with-event-type/${eventTypeId}/`
    );
    return response.data;
  }

  static async getVenue(venueId: number): Promise<RentableVenue> {
    const response = await api.get<RentableVenue>(`${BASE_URL}/venues/${venueId}/`);
    return response.data;
  }

  static getEffectivePricing(
    venue: RentableVenueWithEventType
  ): { basePrice: string; includedHours: number; excessHourRate: string } {
    if (venue.event_type_pricing) {
      return {
        basePrice: venue.event_type_pricing.base_price,
        includedHours: venue.event_type_pricing.included_hours,
        excessHourRate: venue.event_type_pricing.excess_hour_rate,
      };
    }
    return {
      basePrice: venue.base_price,
      includedHours: venue.included_hours,
      excessHourRate: venue.excess_hour_rate,
    };
  }

  static async getVenueAvailability(
    venueId: number,
    startDate: string,
    endDate: string
  ): Promise<VenueAvailabilityResponse> {
    const response = await api.get<VenueAvailabilityResponse>(
      `${BASE_URL}/venues/${venueId}/availability/`,
      { params: { start_date: startDate, end_date: endDate } }
    );
    return response.data;
  }

  static calculateTimes(
    venue: RentableVenue,
    startDate: string,
    durationHours: number
  ): CalculatedEventTimes {
    const rules = venue.operating_rules;
    const includedHours = venue.included_hours;
    const excessHours = Math.max(0, durationHours - includedHours);

    return {
      check_in_time: rules.default_check_in_time,
      program_start_time: rules.default_check_in_time,
      program_end_time: rules.default_check_out_time,
      check_out_time: rules.default_check_out_time,
      total_hours: durationHours,
      included_hours: includedHours,
      excess_hours: excessHours,
    };
  }

  static calculateEarlyCheckinFee(venue: RentableVenue, hoursEarly: number): string {
    const feePerHour = parseFloat(venue.operating_rules.early_checkin_fee_per_hour || '0');
    return (feePerHour * hoursEarly).toFixed(2);
  }

  static calculateLateCheckoutFee(venue: RentableVenue, hoursLate: number): string {
    const feePerHour = parseFloat(venue.operating_rules.late_checkout_fee_per_hour || '0');
    return (feePerHour * hoursLate).toFixed(2);
  }

  static async findMatchingPackages(
    venueIds: number[],
    eventTypeId?: number
  ): Promise<{ packages: MatchedPackage[]; customEstimate: CustomPackageEstimate }> {
    const response = await api.post(`${BASE_URL}/venues/find-matching-packages/`, {
      venue_ids: venueIds,
      event_type_id: eventTypeId,
    });
    return response.data;
  }

  static async createFromVenues(
    venueIds: number[],
    eventTypeId?: number,
    additionalHours?: Record<string, number>
  ): Promise<{ custom_package: CustomPackageEstimate }> {
    const response = await api.post(`${BASE_URL}/venues/create-custom-package/`, {
      venue_ids: venueIds,
      event_type_id: eventTypeId,
      additional_hours: additionalHours,
    });
    return response.data;
  }
}
```

### 3.3 Products API (`src/apis/booking/products.api.ts`)

```typescript
// src/apis/booking/products.api.ts
import { api } from '../client';
import type { ProductOption, ProductCategory, Discount } from '@/types/booking';

const BASE_URL = '/api/bookingflow/public';

export class ProductsApi {
  static async getCategories(): Promise<ProductCategory[]> {
    const response = await api.get<ProductCategory[]>(`${BASE_URL}/categories/`);
    return response.data;
  }

  static async getPackages(categoryId?: number): Promise<ProductOption[]> {
    const params = categoryId ? { category: categoryId, type: 'package' } : { type: 'package' };
    const response = await api.get<ProductOption[]>(`${BASE_URL}/products/`, { params });
    return response.data;
  }

  static async getAddons(categoryId?: number): Promise<ProductOption[]> {
    const params = categoryId ? { category: categoryId, type: 'addon' } : { type: 'addon' };
    const response = await api.get<ProductOption[]>(`${BASE_URL}/products/`, { params });
    return response.data;
  }

  static async getProductsByIds(ids: number[]): Promise<ProductOption[]> {
    if (ids.length === 0) return [];
    const response = await api.post<ProductOption[]>(`${BASE_URL}/products/by-ids/`, { ids });
    return response.data;
  }

  static async getDiscounts(): Promise<Discount[]> {
    const response = await api.get<Discount[]>(`${BASE_URL}/discounts/`);
    return response.data;
  }

  static async validateDiscountCode(code: string): Promise<{
    valid: boolean;
    discount?: Discount;
    message?: string;
  }> {
    const response = await api.post(`${BASE_URL}/discounts/validate/`, { code });
    return response.data;
  }

  static calculatePackagePrice(
    pkg: ProductOption,
    quantity: number = 1,
    excessHours: number = 0
  ): { baseTotal: string; excessTotal: string; total: string } {
    const baseTotal = parseFloat(pkg.price) * quantity;
    const excessTotal = excessHours * parseFloat(pkg.excess_hour_rate || '0');
    return {
      baseTotal: baseTotal.toFixed(2),
      excessTotal: excessTotal.toFixed(2),
      total: (baseTotal + excessTotal).toFixed(2),
    };
  }

  static calculateTotalWithExcessHours(
    packages: SelectedPackage[],
    venueAdditionalHours: Record<string, number>
  ): string {
    let total = 0;
    for (const pkg of packages) {
      total += parseFloat(pkg.price) * pkg.quantity;
      if (pkg.excess_hour_rate) {
        const excessHours = pkg.excess_hours || 0;
        total += excessHours * parseFloat(pkg.excess_hour_rate);
      }
    }
    return total.toFixed(2);
  }

  static formatPrice(amount: string | number, currency: string = 'PHP'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  static isProductAvailable(product: ProductOption): boolean {
    return product.is_active && (product.stock === undefined || product.stock > 0);
  }

  static groupProductsByCategory(products: ProductOption[]): Record<string, ProductOption[]> {
    return products.reduce((acc, product) => {
      const categoryName = product.category_name || 'Uncategorized';
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(product);
      return acc;
    }, {} as Record<string, ProductOption[]>);
  }
}
```

### 3.4 Payment API (`src/apis/booking/payment.api.ts`)

```typescript
// src/apis/booking/payment.api.ts
import { api } from '../client';
import type { PaymentGateway, PaymentMethod } from '@/types/booking';

const BASE_URL = '/api/bookingflow/public';

export class PaymentApi {
  static async getFlowPaymentGateways(flowId: number): Promise<{
    available_gateways: PaymentGateway[];
    default_gateway: number | null;
    require_immediate_payment: boolean;
  }> {
    const response = await api.get(`${BASE_URL}/flows/${flowId}/payment_gateways/`);
    return response.data;
  }

  static async getPaymentGateways(): Promise<PaymentGateway[]> {
    const response = await api.get<PaymentGateway[]>(`${BASE_URL}/payment-gateways/`);
    return response.data;
  }

  static async getPaymentGateway(gatewayId: number): Promise<PaymentGateway> {
    const response = await api.get<PaymentGateway>(`${BASE_URL}/payment-gateways/${gatewayId}/`);
    return response.data;
  }

  static async getGatewayPublicConfig(gatewayCode: string): Promise<Record<string, unknown>> {
    const response = await api.get(`${BASE_URL}/payment-gateways/${gatewayCode}/public-config/`);
    return response.data;
  }

  static calculateDepositAmount(
    totalAmount: number,
    depositPercentage: number,
    fixedDepositAmount?: number
  ): number {
    if (fixedDepositAmount && fixedDepositAmount > 0) {
      return Math.min(fixedDepositAmount, totalAmount);
    }
    return Math.round(totalAmount * (depositPercentage / 100) * 100) / 100;
  }

  static calculateRemainingBalance(totalAmount: number, depositAmount: number): number {
    return Math.max(0, totalAmount - depositAmount);
  }

  static formatAmount(amount: number, currency: string = 'PHP'): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  static getSupportedPaymentMethods(gateway: PaymentGateway): string[] {
    const methodsMap: Record<string, string[]> = {
      stripe: ['card', 'apple_pay', 'google_pay'],
      paypal: ['paypal'],
      gcash: ['gcash'],
      paymaya: ['paymaya'],
    };
    return methodsMap[gateway.code] || ['card'];
  }

  static getGatewayDisplayName(gateway: PaymentGateway): string {
    const displayNames: Record<string, string> = {
      stripe: 'Credit/Debit Card',
      paypal: 'PayPal',
      gcash: 'GCash',
      paymaya: 'Maya',
    };
    return displayNames[gateway.code] || gateway.name;
  }

  static isTestMode(gateway: PaymentGateway): boolean {
    return gateway.public_config?.test_mode === true;
  }

  static supportsFeature(gateway: PaymentGateway, feature: string): boolean {
    const features = gateway.public_config?.supported_features as string[] | undefined;
    return features?.includes(feature) ?? false;
  }
}
```

---

## 4. Custom Hooks

### 4.1 useBookingCore (`src/hooks/booking/useBookingCore.tsx`)

```typescript
// src/hooks/booking/useBookingCore.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { BookingCoreApi } from '@/apis/booking/core.api';
import type { EventType, BookingFlow, BookingSession } from '@/types/booking';

// Query keys factory
export const bookingKeys = {
  all: ['booking'] as const,
  eventTypes: () => [...bookingKeys.all, 'eventTypes'] as const,
  flows: (eventTypeId?: number) => [...bookingKeys.all, 'flows', eventTypeId] as const,
  flow: (flowId: number) => [...bookingKeys.all, 'flow', flowId] as const,
  session: (sessionId: string) => [...bookingKeys.all, 'session', sessionId] as const,
  paymentGateways: (flowId: number) => [...bookingKeys.all, 'paymentGateways', flowId] as const,
};

export function useEventTypes() {
  return useQuery({
    queryKey: bookingKeys.eventTypes(),
    queryFn: BookingCoreApi.getEventTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBookingFlows(eventTypeId?: number) {
  return useQuery({
    queryKey: bookingKeys.flows(eventTypeId),
    queryFn: () => BookingCoreApi.getAvailableFlows(eventTypeId),
    enabled: eventTypeId !== undefined,
  });
}

export function useBookingFlow(flowId?: number) {
  return useQuery({
    queryKey: bookingKeys.flow(flowId!),
    queryFn: () => BookingCoreApi.getFlowById(flowId!),
    enabled: flowId !== undefined,
  });
}

export function useBookingSession(sessionId?: string) {
  const queryClient = useQueryClient();
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const sessionQuery = useQuery({
    queryKey: bookingKeys.session(sessionId!),
    queryFn: () => BookingCoreApi.getSession(sessionId!),
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  });

  const startSessionMutation = useMutation({
    mutationFn: (flowId: number) => BookingCoreApi.startSession(flowId),
    onSuccess: (data) => {
      queryClient.setQueryData(bookingKeys.session(data.session_id), data);
    },
  });

  const updateDataMutation = useMutation({
    mutationFn: ({
      stepId,
      data,
      proceedToNext,
    }: {
      stepId: number;
      data: Record<string, unknown>;
      proceedToNext?: boolean;
    }) => BookingCoreApi.updateSessionData(sessionId!, stepId, data, proceedToNext),
    onSuccess: (result) => {
      if (result.validation_errors) {
        setValidationErrors(result.validation_errors);
      } else {
        setValidationErrors({});
      }
      queryClient.invalidateQueries({ queryKey: bookingKeys.session(sessionId!) });
    },
  });

  const validateStepMutation = useMutation({
    mutationFn: ({ stepId, data }: { stepId: number; data: Record<string, unknown> }) =>
      BookingCoreApi.validateStepData(sessionId!, stepId, data),
  });

  const abandonMutation = useMutation({
    mutationFn: (reason?: string) => BookingCoreApi.abandonSession(sessionId!, reason),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: bookingKeys.session(sessionId!) });
    },
  });

  return {
    session: sessionQuery.data,
    loading: sessionQuery.isLoading,
    error: sessionQuery.error?.message || null,
    validationErrors,
    fetchSession: sessionQuery.refetch,
    startSession: startSessionMutation.mutateAsync,
    updateSessionData: updateDataMutation.mutateAsync,
    validateStep: validateStepMutation.mutateAsync,
    abandonSession: abandonMutation.mutateAsync,
    isUpdating: updateDataMutation.isPending,
    isValidating: validateStepMutation.isPending,
  };
}

export function useFlowPaymentGateways(flowId?: number) {
  return useQuery({
    queryKey: bookingKeys.paymentGateways(flowId!),
    queryFn: () => BookingCoreApi.getFlowPaymentGateways(flowId!),
    enabled: flowId !== undefined,
  });
}

export function useSessionTimer(expiresAt?: string) {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTime = () => {
      const remaining = BookingCoreApi.getSessionTimeRemaining(expiresAt);
      setTimeRemaining(remaining);
      setIsExpired(remaining.hours === 0 && remaining.minutes === 0);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  return { timeRemaining, isExpired };
}

export function useSessionRecovery() {
  const [recoverableSession, setRecoverableSession] = useState<{
    sessionId: string;
    lastUpdated: string;
    stepName: string;
    progressPercentage: number;
  } | null>(null);

  const checkForRecoverableSession = useCallback(async () => {
    // Implementation depends on how session IDs are tracked
    // This would load from SecureStore and validate with backend
  }, []);

  useEffect(() => {
    checkForRecoverableSession();
  }, [checkForRecoverableSession]);

  return {
    recoverableSession,
    clearRecoverableSession: () => setRecoverableSession(null),
    checkForRecoverableSession,
  };
}
```

### 4.2 useSimplePricing (`src/hooks/booking/useSimplePricing.tsx`)

```typescript
// src/hooks/booking/useSimplePricing.tsx
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BookingCoreApi } from '@/apis/booking/core.api';
import { ProductsApi } from '@/apis/booking/products.api';
import type { SelectedPackage, SelectedAddon, PricingCalculation } from '@/types/booking';

export function useSimplePricing(
  sessionId: string | undefined,
  selectedPackages: SelectedPackage[] = [],
  selectedAddons: SelectedAddon[] = [],
  discountCode?: string,
  venueAdditionalHours?: Record<string, number>
) {
  const hasItems = selectedPackages.length > 0 || selectedAddons.length > 0;

  const pricingQuery = useQuery({
    queryKey: ['pricing', sessionId, selectedPackages, selectedAddons, discountCode, venueAdditionalHours],
    queryFn: () => BookingCoreApi.calculatePricing(sessionId!, discountCode, venueAdditionalHours),
    enabled: !!sessionId && hasItems,
    staleTime: 30000, // 30 seconds
  });

  // Fallback calculation if server fails
  const fallbackPricing = useMemo((): PricingCalculation => {
    let subtotal = 0;
    const lineItems: PricingLineItem[] = [];

    // Calculate packages
    for (const pkg of selectedPackages) {
      const pkgTotal = parseFloat(pkg.price) * pkg.quantity;
      subtotal += pkgTotal;
      lineItems.push({
        item_name: pkg.name,
        quantity: pkg.quantity,
        unit_price: pkg.price,
        total_price: pkgTotal.toFixed(2),
        type: 'PACKAGE',
      });

      // Add excess hours if applicable
      if (pkg.excess_hours && pkg.excess_hour_rate) {
        const excessTotal = pkg.excess_hours * parseFloat(pkg.excess_hour_rate);
        subtotal += excessTotal;
        lineItems.push({
          item_name: `${pkg.name} - Excess Hours`,
          quantity: pkg.excess_hours,
          unit_price: pkg.excess_hour_rate,
          total_price: excessTotal.toFixed(2),
          type: 'EXCESS_HOURS',
        });
      }
    }

    // Calculate addons
    for (const addon of selectedAddons) {
      const addonTotal = parseFloat(addon.price) * addon.quantity;
      subtotal += addonTotal;
      lineItems.push({
        item_name: addon.name,
        quantity: addon.quantity,
        unit_price: addon.price,
        total_price: addonTotal.toFixed(2),
        type: 'ADDON',
      });
    }

    const taxRate = 0.12; // 12% VAT
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      discount: '0.00',
      total: total.toFixed(2),
      formattedSubtotal: ProductsApi.formatPrice(subtotal),
      formattedTax: ProductsApi.formatPrice(tax),
      formattedDiscount: ProductsApi.formatPrice(0),
      formattedTotal: ProductsApi.formatPrice(total),
      lineItems,
    };
  }, [selectedPackages, selectedAddons]);

  return {
    pricing: pricingQuery.data || fallbackPricing,
    loading: pricingQuery.isLoading,
    error: pricingQuery.error?.message,
    hasItems,
    totalItemCount: selectedPackages.length + selectedAddons.length,
    recalculate: pricingQuery.refetch,
  };
}
```

---

## 5. BookingContext

### Complete Implementation (`src/contexts/BookingContext.tsx`)

```typescript
// src/contexts/BookingContext.tsx
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import debounce from 'lodash.debounce';
import { BookingCoreApi } from '@/apis/booking/core.api';
import type { BookingState, BookingActions, BookingFlow, EventType, BookingSession } from '@/types/booking';

// Initial state
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
  pricingBreakdown: null,
  recoverableSession: null,
};

// Action types
type BookingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FLOWS'; payload: BookingFlow[] }
  | { type: 'SET_EVENT_TYPE'; payload: EventType }
  | { type: 'SET_FLOW'; payload: BookingFlow }
  | { type: 'SET_SESSION'; payload: BookingSession }
  | { type: 'UPDATE_STEP_DATA'; payload: { stepType: string; data: Record<string, unknown> } }
  | { type: 'SET_PROGRESS'; payload: Partial<BookingState['progress']> }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string[]> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_PAYMENT_GATEWAYS'; payload: PaymentGateway[] }
  | { type: 'SET_SELECTED_GATEWAY'; payload: PaymentGateway }
  | { type: 'SET_TOTAL_PRICE'; payload: string }
  | { type: 'SET_TAX_RATE'; payload: number }
  | { type: 'SET_PRICING_BREAKDOWN'; payload: PricingCalculation }
  | { type: 'SET_RECOVERABLE_SESSION'; payload: RecoverableSession | null }
  | { type: 'RESET' };

// Reducer
function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, ui: { ...state.ui, isLoading: action.payload } };
    case 'SET_ERROR':
      return { ...state, ui: { ...state.ui, error: action.payload } };
    case 'SET_FLOWS':
      return { ...state, availableFlows: action.payload };
    case 'SET_EVENT_TYPE':
      return { ...state, selectedEventType: action.payload };
    case 'SET_FLOW':
      return {
        ...state,
        currentFlow: action.payload,
        progress: {
          ...state.progress,
          totalSteps: action.payload.enabled_steps.length,
        },
      };
    case 'SET_SESSION':
      return { ...state, currentSession: action.payload };
    case 'UPDATE_STEP_DATA':
      return {
        ...state,
        stepData: {
          ...state.stepData,
          [action.payload.stepType]: action.payload.data,
        },
      };
    case 'SET_PROGRESS':
      return { ...state, progress: { ...state.progress, ...action.payload } };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, ui: { ...state.ui, validationErrors: action.payload } };
    case 'CLEAR_ERRORS':
      return { ...state, ui: { ...state.ui, error: null, validationErrors: {} } };
    case 'SET_PAYMENT_GATEWAYS':
      return { ...state, paymentGateways: action.payload };
    case 'SET_SELECTED_GATEWAY':
      return { ...state, selectedPaymentGateway: action.payload };
    case 'SET_TOTAL_PRICE':
      return { ...state, totalPrice: action.payload };
    case 'SET_TAX_RATE':
      return { ...state, taxRate: action.payload };
    case 'SET_PRICING_BREAKDOWN':
      return { ...state, pricingBreakdown: action.payload };
    case 'SET_RECOVERABLE_SESSION':
      return { ...state, recoverableSession: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Context
const BookingContext = createContext<{
  state: BookingState;
  actions: BookingActions;
} | null>(null);

// Provider
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);
  const appStateRef = useRef(AppState.currentState);

  // Debounced backend sync
  const debouncedSync = useRef(
    debounce(async (sessionId: string, stepId: number, data: Record<string, unknown>) => {
      try {
        await BookingCoreApi.updateSessionData(sessionId, stepId, data, false);
        // Clear pending_sync flag in local storage
        await BookingCoreApi.saveSessionToLocal(sessionId, { pending_sync: false } as any);
      } catch (error) {
        console.warn('Background sync failed:', error);
      }
    }, 1000)
  ).current;

  // App state listener for session persistence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        // App going to background - save session
        if (state.currentSession) {
          await BookingCoreApi.saveSessionToLocal(state.currentSession.session_id, {
            ...state.currentSession,
            booking_data: state.stepData as any,
          });
        }
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [state.currentSession, state.stepData]);

  // Actions
  const actions: BookingActions = {
    fetchAvailableFlows: useCallback(async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const flows = await BookingCoreApi.getAvailableFlows();
        dispatch({ type: 'SET_FLOWS', payload: flows });
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []),

    selectEventType: useCallback(async (eventType: EventType) => {
      dispatch({ type: 'SET_EVENT_TYPE', payload: eventType });
      // Fetch flows for this event type
      const flows = await BookingCoreApi.getAvailableFlows(eventType.id);
      dispatch({ type: 'SET_FLOWS', payload: flows });
    }, []),

    startSession: useCallback(async (flowId: number) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const result = await BookingCoreApi.startSession(flowId);
        const session = await BookingCoreApi.getSession(result.session_id);
        dispatch({ type: 'SET_SESSION', payload: session });
        // Save to local storage
        await BookingCoreApi.saveSessionToLocal(result.session_id, session);
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, []),

    updateStepData: useCallback(async (stepType: string, data: Record<string, unknown>) => {
      // Immediate local update
      dispatch({ type: 'UPDATE_STEP_DATA', payload: { stepType, data } });
      dispatch({ type: 'CLEAR_ERRORS' });

      // Save to local storage immediately
      if (state.currentSession) {
        await BookingCoreApi.saveSessionToLocal(state.currentSession.session_id, {
          booking_data: { ...state.stepData, [stepType]: data } as any,
          pending_sync: true,
        } as any);

        // Debounced backend sync
        const currentStep = state.currentFlow?.enabled_steps[state.progress.currentStepIndex];
        if (currentStep) {
          debouncedSync(state.currentSession.session_id, currentStep.id, data);
        }
      }
    }, [state.currentSession, state.currentFlow, state.progress.currentStepIndex, state.stepData, debouncedSync]),

    validateStep: useCallback(async (stepId: number, data: Record<string, unknown>) => {
      if (!state.currentSession) return false;
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const result = await BookingCoreApi.validateStepData(
          state.currentSession.session_id,
          stepId,
          data
        );
        if (!result.isValid) {
          const errors: Record<string, string[]> = {};
          result.errors.forEach(err => {
            if (!errors[err.field]) errors[err.field] = [];
            errors[err.field].push(err.message);
          });
          dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
        }
        return result.isValid;
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return false;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, [state.currentSession]),

    goToStep: useCallback(async (stepIndex: number) => {
      dispatch({ type: 'SET_PROGRESS', payload: { currentStepIndex: stepIndex } });
    }, []),

    nextStep: useCallback(async () => {
      if (!state.currentSession || !state.currentFlow) return;

      const currentStep = state.currentFlow.enabled_steps[state.progress.currentStepIndex];
      const stepData = state.stepData[currentStep.step_type] || {};

      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        // Update with mark_completed = true
        await BookingCoreApi.updateSessionData(
          state.currentSession.session_id,
          currentStep.id,
          stepData,
          true
        );

        // Advance to next step
        const nextIndex = state.progress.currentStepIndex + 1;
        if (nextIndex < state.progress.totalSteps) {
          dispatch({
            type: 'SET_PROGRESS',
            payload: {
              currentStepIndex: nextIndex,
              completedSteps: [...state.progress.completedSteps, currentStep.id],
            },
          });
        }
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, [state.currentSession, state.currentFlow, state.progress, state.stepData]),

    previousStep: useCallback(async () => {
      const prevIndex = state.progress.currentStepIndex - 1;
      if (prevIndex >= 0) {
        dispatch({ type: 'SET_PROGRESS', payload: { currentStepIndex: prevIndex } });
      }
    }, [state.progress.currentStepIndex]),

    skipStep: useCallback(async () => {
      const currentStep = state.currentFlow?.enabled_steps[state.progress.currentStepIndex];
      if (currentStep?.is_skippable) {
        const nextIndex = state.progress.currentStepIndex + 1;
        dispatch({ type: 'SET_PROGRESS', payload: { currentStepIndex: nextIndex } });
      }
    }, [state.currentFlow, state.progress.currentStepIndex]),

    completeBooking: useCallback(async (completionType = 'payment') => {
      if (!state.currentSession) throw new Error('No active session');

      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const result = await BookingCoreApi.completeBooking(
          state.currentSession.session_id,
          completionType
        );
        // Clear local session on success
        await BookingCoreApi.clearSessionFromLocal(state.currentSession.session_id);
        return result;
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }, [state.currentSession]),

    fetchPaymentGateways: useCallback(async () => {
      if (!state.currentFlow) return;
      try {
        const result = await BookingCoreApi.getFlowPaymentGateways(state.currentFlow.id);
        dispatch({ type: 'SET_PAYMENT_GATEWAYS', payload: result.available_gateways });
        if (result.default_gateway) {
          const defaultGateway = result.available_gateways.find(g => g.id === result.default_gateway);
          if (defaultGateway) {
            dispatch({ type: 'SET_SELECTED_GATEWAY', payload: defaultGateway });
          }
        }
      } catch (error: any) {
        console.warn('Failed to fetch payment gateways:', error);
      }
    }, [state.currentFlow]),

    selectPaymentGateway: useCallback((gateway: PaymentGateway) => {
      dispatch({ type: 'SET_SELECTED_GATEWAY', payload: gateway });
    }, []),

    updateTotalPrice: useCallback((price: string) => {
      dispatch({ type: 'SET_TOTAL_PRICE', payload: price });
    }, []),

    setTaxRate: useCallback((rate: number) => {
      dispatch({ type: 'SET_TAX_RATE', payload: rate });
    }, []),

    setPricingBreakdown: useCallback((breakdown: PricingCalculation) => {
      dispatch({ type: 'SET_PRICING_BREAKDOWN', payload: breakdown });
      dispatch({ type: 'SET_TOTAL_PRICE', payload: breakdown.total });
    }, []),

    resetBooking: useCallback(() => {
      dispatch({ type: 'RESET' });
    }, []),

    clearErrors: useCallback(() => {
      dispatch({ type: 'CLEAR_ERRORS' });
    }, []),

    clearRecoverableSession: useCallback(async (sessionId?: string) => {
      if (sessionId) {
        await BookingCoreApi.clearSessionFromLocal(sessionId);
      }
      dispatch({ type: 'SET_RECOVERABLE_SESSION', payload: null });
    }, []),

    getSelectedProducts: useCallback(() => {
      const packages = (state.stepData.package_selection as any)?.selected_packages || [];
      const addons = (state.stepData.addon_selection as any)?.selected_addons || [];
      return { packages, addons };
    }, [state.stepData]),

    getBookingData: useCallback(() => {
      return state.stepData as any;
    }, [state.stepData]),
  };

  return (
    <BookingContext.Provider value={{ state, actions }}>
      {children}
    </BookingContext.Provider>
  );
}

// Hook
export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
```

---

## 6. Utility Functions

### 6.1 Timezone Utilities (`src/utils/timezone.ts`)

```typescript
// src/utils/timezone.ts
import { format, parseISO, formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const BUSINESS_TIMEZONE = 'Asia/Manila';
export const BUSINESS_TIMEZONE_DISPLAY = 'PHT';
export const BUSINESS_TIMEZONE_OFFSET = '+08:00';

export function parseAsPhilippinesTime(dateString: string): Date {
  // If already has timezone, parse directly
  if (dateString.includes('+') || dateString.includes('Z')) {
    return parseISO(dateString);
  }
  // Append Philippines timezone offset for naive strings
  return parseISO(dateString + BUSINESS_TIMEZONE_OFFSET);
}

export function formatPhilippinesTime(
  date: Date | string,
  formatStr: string = 'PPP p'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BUSINESS_TIMEZONE, formatStr);
}

export function formatBookingTime(date: Date | string): {
  primary: string;
  timezone: string;
} {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return {
    primary: formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'EEEE, MMMM d, yyyy'),
    timezone: `${formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'h:mm a')} ${BUSINESS_TIMEZONE_DISPLAY}`,
  };
}

export function getTimezoneNotice(context: 'booking' | 'confirmation' | 'general' = 'general'): string {
  const notices = {
    booking: 'All times are in Philippines Standard Time (PHT)',
    confirmation: 'Event times shown in Philippines Standard Time (PHT, UTC+8)',
    general: `Philippines Time (${BUSINESS_TIMEZONE_DISPLAY})`,
  };
  return notices[context];
}

export function formatDateForPicker(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatTimeForPicker(date: Date): string {
  return format(date, 'HH:mm');
}

export function isWithinBusinessHours(date: Date): boolean {
  const zonedDate = toZonedTime(date, BUSINESS_TIMEZONE);
  const hours = zonedDate.getHours();
  const day = zonedDate.getDay();

  // Monday-Friday, 9 AM - 6 PM
  return day >= 1 && day <= 5 && hours >= 9 && hours < 18;
}

export function getNextBusinessDay(from: Date = new Date()): Date {
  const zonedDate = toZonedTime(from, BUSINESS_TIMEZONE);
  let next = new Date(zonedDate);
  next.setHours(9, 0, 0, 0);

  // If it's already past 6 PM or weekend, move to next business day
  const day = next.getDay();
  if (day === 0) next.setDate(next.getDate() + 1); // Sunday -> Monday
  else if (day === 6) next.setDate(next.getDate() + 2); // Saturday -> Monday
  else if (zonedDate.getHours() >= 18) next.setDate(next.getDate() + 1);

  return next;
}
```

### 6.2 Currency Utilities (`src/utils/currency.ts`)

```typescript
// src/utils/currency.ts

export const SUPPORTED_CURRENCIES = {
  PHP: { symbol: '₱', decimals: 0, locale: 'en-PH' },
  USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  EUR: { symbol: '€', decimals: 2, locale: 'de-DE' },
  SGD: { symbol: 'S$', decimals: 2, locale: 'en-SG' },
  HKD: { symbol: 'HK$', decimals: 2, locale: 'en-HK' },
} as const;

export const DEFAULT_CURRENCY = 'PHP';

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export function getCurrencyConfig(currency: CurrencyCode = DEFAULT_CURRENCY) {
  return SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.PHP;
}

export function getCurrencySymbol(currency: CurrencyCode = DEFAULT_CURRENCY): string {
  return getCurrencyConfig(currency).symbol;
}

export function formatCurrency(
  amount: number | string,
  options: {
    currency?: CurrencyCode;
    showSymbol?: boolean;
    showCode?: boolean;
  } = {}
): string {
  const { currency = DEFAULT_CURRENCY, showSymbol = true, showCode = false } = options;
  const config = getCurrencyConfig(currency);
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) return showSymbol ? `${config.symbol}0` : '0';

  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(numAmount);

  if (!showSymbol) {
    return formatted.replace(/[^\d.,]/g, '').trim();
  }

  return showCode ? `${formatted} ${currency}` : formatted;
}

export function getCurrencyOptions(): Array<{ value: CurrencyCode; label: string }> {
  return Object.entries(SUPPORTED_CURRENCIES).map(([code, config]) => ({
    value: code as CurrencyCode,
    label: `${config.symbol} ${code}`,
  }));
}
```

### 6.3 Error Handler (`src/utils/errorHandler.ts`)

```typescript
// src/utils/errorHandler.ts
import type { AxiosError } from 'axios';

interface ApiError {
  message?: string;
  detail?: string;
  errors?: Array<{ field: string; message: string }>;
  validation_errors?: Record<string, string[]>;
}

export class ErrorHandler {
  static extractMessage(error: unknown): string {
    if (!error) return 'An unknown error occurred';

    // Axios error
    if (this.isAxiosError(error)) {
      const data = error.response?.data as ApiError | undefined;
      if (data?.message) return data.message;
      if (data?.detail) return data.detail;
      if (error.message) return error.message;
    }

    // Standard Error
    if (error instanceof Error) {
      return error.message;
    }

    // String
    if (typeof error === 'string') {
      return error;
    }

    return 'An unexpected error occurred';
  }

  static extractValidationErrors(error: unknown): Record<string, string[]> {
    if (!this.isAxiosError(error)) return {};

    const data = error.response?.data as ApiError | undefined;

    // Direct validation_errors object
    if (data?.validation_errors) {
      return data.validation_errors;
    }

    // Array of errors
    if (data?.errors) {
      const result: Record<string, string[]> = {};
      for (const err of data.errors) {
        if (!result[err.field]) result[err.field] = [];
        result[err.field].push(err.message);
      }
      return result;
    }

    return {};
  }

  static getStatusCode(error: unknown): number | null {
    if (this.isAxiosError(error)) {
      return error.response?.status ?? null;
    }
    return null;
  }

  static isNetworkError(error: unknown): boolean {
    if (this.isAxiosError(error)) {
      return !error.response && error.code === 'ERR_NETWORK';
    }
    return false;
  }

  static isAuthError(error: unknown): boolean {
    return this.getStatusCode(error) === 401;
  }

  static isPermissionError(error: unknown): boolean {
    return this.getStatusCode(error) === 403;
  }

  static isValidationError(error: unknown): boolean {
    const status = this.getStatusCode(error);
    return status === 400 || status === 422;
  }

  static isServerError(error: unknown): boolean {
    const status = this.getStatusCode(error);
    return status !== null && status >= 500;
  }

  private static isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError)?.isAxiosError === true;
  }

  static getErrorInfo(error: unknown): {
    message: string;
    validationErrors: Record<string, string[]>;
    statusCode: number | null;
    isNetworkError: boolean;
    isAuthError: boolean;
    isServerError: boolean;
  } {
    return {
      message: this.extractMessage(error),
      validationErrors: this.extractValidationErrors(error),
      statusCode: this.getStatusCode(error),
      isNetworkError: this.isNetworkError(error),
      isAuthError: this.isAuthError(error),
      isServerError: this.isServerError(error),
    };
  }
}

// Convenience exports
export const getErrorMessage = ErrorHandler.extractMessage.bind(ErrorHandler);
export const getValidationErrors = ErrorHandler.extractValidationErrors.bind(ErrorHandler);
```

---

## 7. Step Components

See [BOOKING_FLOW_GAP_ANALYSIS.md](BOOKING_FLOW_GAP_ANALYSIS.md) for detailed component specifications.

Each step component follows this pattern:

```typescript
interface StepComponentProps {
  stepData?: StepDataType;
  config: StepConfigType | null;
  onDataChange: (data: StepDataType) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  onValidate?: (data: Record<string, unknown>) => Promise<StepValidationResult>;
  // Additional props specific to step
}
```

---

## 8. Session Management

### AppState Integration

```typescript
// In BookingProvider or dedicated hook
useEffect(() => {
  const subscription = AppState.addEventListener('change', async (nextState) => {
    if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
      // Save session when app goes to background
      await saveCurrentSession();
    }
    appStateRef.current = nextState;
  });

  return () => subscription.remove();
}, []);
```

### Session Recovery Flow

1. On app start, check SecureStore for saved sessions
2. Validate session hasn't expired (check `expires_at`)
3. If valid, show recovery bottom sheet
4. User chooses to restore or discard
5. If restore, load session data into context
6. If discard, clear from SecureStore

---

## 9. Stripe Integration

### Setup

```bash
npx expo install @stripe/stripe-react-native
```

### Provider Setup

```typescript
// src/providers/StripeProvider.tsx
import { StripeProvider as StripeNativeProvider } from '@stripe/stripe-react-native';

export function StripeProvider({ children }: { children: React.ReactNode }) {
  return (
    <StripeNativeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.lifeplace"
    >
      {children}
    </StripeNativeProvider>
  );
}
```

### Payment Form Component

```typescript
// src/components/booking/StripePaymentForm.tsx
import { CardField, useStripe, useConfirmPayment } from '@stripe/stripe-react-native';

export function StripePaymentForm({
  onSuccess,
  onError,
  amount,
  clientSecret,
}: {
  onSuccess: (paymentMethod: PaymentMethod) => void;
  onError: (error: string) => void;
  amount: number;
  clientSecret: string;
}) {
  const { confirmPayment } = useConfirmPayment();
  const [cardComplete, setCardComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!cardComplete) return;

    setLoading(true);
    try {
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        onError(error.message);
      } else if (paymentIntent) {
        onSuccess(paymentIntent.paymentMethod);
      }
    } catch (e) {
      onError('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <CardField
        postalCodeEnabled={false}
        onCardChange={(cardDetails) => {
          setCardComplete(cardDetails.complete);
        }}
        style={styles.cardField}
      />
      <Button
        title={`Pay ${formatCurrency(amount)}`}
        onPress={handlePayment}
        disabled={!cardComplete || loading}
        loading={loading}
      />
    </View>
  );
}
```

---

## Next Steps

1. Implement each component following the patterns above
2. Add comprehensive unit tests for hooks and utilities
3. Add E2E tests for complete booking flows
4. Performance optimization with React.memo and useMemo
5. Accessibility audit with VoiceOver testing
