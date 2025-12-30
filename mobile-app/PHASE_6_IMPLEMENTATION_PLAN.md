# Phase 6: Booking Flow - Comprehensive Implementation Plan

> **Generated:** December 25, 2025
> **Based on:** Client-portal source code analysis, backend API review, mobile app current state
> **Goal:** Full feature parity with `frontend/client-portal/src/` booking implementation

---

## Executive Summary

Phase 6 implements the complete booking flow for the LifePlace mobile app. This is the largest phase, requiring approximately **88+ new files** across APIs, hooks, types, utilities, components, and screens.

### Key Decisions (Confirmed)
- **Payment Gateways:** All supported (Stripe, PayPal, GCash, PayMaya, Bank Transfer, Manual)
- **Offline Support:** Online-only (simpler implementation)
- **Questionnaire Fields:** All 14 field types supported
- **Custom Packages:** Full venue-based custom bundle creation with multi-venue discount

### Current State
| Category | Existing | Needed | Gap |
|----------|----------|--------|-----|
| API Files | 6 (general) | 9 (booking) | +9 |
| Hook Files | 10 (general) | 10 (booking) | +10 |
| Type Files | 5 (general) | 10 (booking) | +10 |
| Utility Files | 6 (general) | 7 (booking) | +7 |
| Context Files | 2 (Auth, Toast) | 1 (Booking) | +1 |
| Screen Files | 23 (other phases) | 11 (booking) | +11 |
| Components | 38 (other phases) | 45+ (booking) | +45 |
| **Total New Files** | - | - | **~88+** |

---

## Phase 6 Subsections

| Sub-Phase | Description | Files | Dependencies |
|-----------|-------------|-------|--------------|
| 6.1 | Type Definitions | 10 | None |
| 6.2 | Utility Files | 7 | 6.1 |
| 6.3 | API Layer | 9 | 6.1, 6.2 |
| 6.4 | Hooks Layer | 10 | 6.1, 6.2, 6.3 |
| 6.5 | Context & State | 2 | 6.1-6.4 |
| 6.6 | Container Components | 6 | 6.1-6.5 |
| 6.7 | Event Type Selection | 3 | 6.1-6.6 |
| 6.8 | Step Screens (10) | 11 | 6.1-6.7 |
| 6.9 | Step Components | 45+ | 6.1-6.8 |
| 6.10 | Session Management | 4 | 6.1-6.9 |

---

## 6.1 Type Definitions

Create `/Users/stephendeslate/Desktop/lifeplace-app/mobile-app/src/types/booking/`

### Files to Create

#### 6.1.1 `index.ts` - Re-export Hub
```typescript
// Re-exports all booking types for easy imports
export * from './core.types';
export * from './api.types';
export * from './payment.types';
export * from './questionnaire.types';
export * from './venues.types';
export * from './stepData.types';
export * from './stepConfigurations.types';
export * from './bookingData.types';
export * from './state.types';
```

#### 6.1.2 `core.types.ts` - Core Booking Types
**Source:** `frontend/client-portal/src/types/booking/core.types.ts`

Key types to implement:
- `EventType` - Event type with id, name, slug, description, icon, image_url, features, starting_price
- `StepType` - Union of 10 step types: 'introduction' | 'venue_selection' | 'date_time' | 'questionnaire' | 'package_selection' | 'addon_selection' | 'pricing_summary' | 'contact_info' | 'payment_info' | 'confirmation'
- `BookingFlowStep` - Step with id, step_type, order, title, description, is_required, is_skippable, is_enabled, configuration, validation_rules
- `BookingFlow` - Flow with id, name, slug, description, event_type, enabled_steps[], is_active, require_authentication, session_timeout_minutes, allow_guest_booking, payment_terms
- `PaymentTermsConfig` - allow_full_payment, allow_deposit, deposit_percentage, deposit_amount_fixed, balance_due_days, allow_quote_request, refund_policy_text, refund_percentage, refund_deadline_hours
- `StepConfiguration` - Base interface for step configs

#### 6.1.3 `api.types.ts` - API Request/Response Types
**Source:** `frontend/client-portal/src/types/booking/api.types.ts`

Key types:
- `BookingSessionCreate` - Flow ID and optional initial data
- `BookingSessionStartResponse` - session_id, current_step, expires_at, progress_percentage
- `BookingSessionGetResponse` - Full session with booking_data
- `BookingSessionUpdateResponse` - Updated session after step save
- `BookingCompletionResult` - success, event_id, booking_reference, status, message
- `StepValidationResult` - isValid, errors[]
- `ValidationError` - field, message, code

#### 6.1.4 `payment.types.ts` - Payment Types
**Source:** `frontend/client-portal/src/types/booking/payment.types.ts`

Key types:
- `PaymentGateway` - id, name, code, is_active, public_config, supported_features
- `PaymentGatewayCode` - 'stripe' | 'paypal' | 'gcash' | 'paymaya' | 'bank_transfer' | 'manual'
- `PaymentGatewayResponse` - available_gateways[], default_gateway, require_immediate_payment
- `PaymentMethod` - id, type, last_four, brand, expiry
- `SavedPaymentMethod` - For authenticated users

#### 6.1.5 `questionnaire.types.ts` - Questionnaire Types
**Source:** `frontend/client-portal/src/types/booking/questionnaire.types.ts`

Key types:
- `QuestionnaireFieldType` - 14 types: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'time' | 'boolean' | 'select' | 'multi_select' | 'radio' | 'file' | 'rating' | 'checkbox'
- `QuestionnaireField` - id, field_type, label, placeholder, help_text, is_required, order, options[], validation_rules, conditional_display
- `Questionnaire` - id, name, title, description, is_active, fields[]
- `QuestionnaireValidationRules` - min_length, max_length, min_value, max_value, pattern, allowed_file_types[], max_file_size_mb
- `QuestionnaireConditionalDisplay` - depends_on_field, show_when_value

#### 6.1.6 `venues.types.ts` - Venue Types
**Source:** `frontend/client-portal/src/types/booking/venues.types.ts`

Key types:
- `VenueOperatingRulesPublic` - default_check_in_time, default_check_out_time, minimum_hours, maximum_hours, early_checkin_fee_per_hour, late_checkout_fee_per_hour, is_all_day_access, capacity_min, capacity_max
- `RentableVenue` - id, name, description, location_description, featured_image_url, gallery_images[], capacity_min, capacity_max, base_price, included_hours, excess_hour_rate, operating_rules, amenities[], is_featured
- `RentableVenueWithEventType` - Extends RentableVenue with event_type_pricing
- `VenueSelectionStepConfiguration` - available_venues, min_venues, max_venues, show_bundle_discount, bundle_discount_percentage, recommend_packages
- `CalculatedEventTimes` - check_in_time, program_start_time, program_end_time, check_out_time, total_hours, included_hours, excess_hours
- `VenueAvailabilityResponse` - venue_id, blocked_dates[], available_time_slots[]

#### 6.1.7 `stepData.types.ts` - Step Data Types
**Source:** `frontend/client-portal/src/types/booking/stepData.types.ts`

Key types for each step:
- `IntroductionStepData` - { acknowledged: boolean }
- `VenueSelectionStepData` - { selected_venue_ids: number[] }
- `DateTimeStepData` - { start_date, end_date?, start_time?, end_time?, venue_id?, resource_requirements? }
- `SelectedPackage` - { product_id, name, price, quantity, tax_rate?, price_with_tax?, included_hours?, excess_hours?, excess_hour_rate?, is_custom_bundle? }
- `PackageSelectionStepData` - { selected_packages: SelectedPackage[], venue_additional_hours?: Record<string, number> }
- `SelectedAddon` - { product_id, name, price, quantity, tax_rate?, price_with_tax?, category_id? }
- `AddonSelectionStepData` - { selected_addons: SelectedAddon[], venue_additional_hours?: Record<string, number> }
- `QuestionnaireStepData` - { [fieldKey: string]: unknown } (field_${fieldId}: value)
- `PricingSummaryStepData` - { applied_discount_code?, special_requests?, terms_accepted, marketing_consent? }
- `ContactInfoStepData` - { full_name, email, phone, address?, company?, create_account?, password? }
- `PaymentStepData` - { payment_method, payment_type: 'FULL' | 'DEPOSIT', payment_gateway_id?, payment_method_id?, payment_method_token?, billing_address?, save_payment_method?, completion_type?: 'payment' | 'quote', quote_message?, deposit_amount?, balance_due_days? }
- `ConfirmationStepData` - { booking_reference?, completion_status: 'pending' | 'processing' | 'completed' | 'failed', completed_at?, booking_completion_result?, confirmation_email_sent? }
- `PricingLineItem` - { item_name, quantity, unit_price, total_price, type: 'PACKAGE' | 'ADDON' | 'TAX' | 'DISCOUNT' | 'FEE' | 'EXCESS_HOURS', venue_id?, venue_name? }
- `PricingCalculation` - { subtotal, tax, discount, total, formattedSubtotal, formattedTax, formattedDiscount, formattedTotal, lineItems: PricingLineItem[] }

#### 6.1.8 `stepConfigurations.types.ts` - Step Configuration Types
**Source:** `frontend/client-portal/src/types/booking/stepConfigurations.types.ts`

Key types:
- `IntroductionStepConfiguration` - title, content, show_event_details, show_pricing_overview, custom_css, background_image
- `VenueSelectionStepConfiguration` - available_venues[], min_venues, max_venues, show_pricing, show_included_hours, show_bundle_discount, bundle_discount_percent, show_package_recommendations
- `DateTimeStepConfiguration` - allow_multi_day, min_event_days, max_event_days, show_calendar_view, enable_real_time_availability, blocked_dates[], available_days_of_week, available_time_slots, buffer_before_hours, buffer_after_hours
- `QuestionnaireStepConfiguration` - questionnaires: QuestionnaireStepItem[], allow_file_uploads, max_file_size_mb, allowed_file_types[]
- `PackageSelectionStepConfiguration` - available_categories[], available_packages[], selection_type: 'SINGLE' | 'MULTIPLE', min_selection, max_selection, show_pricing, show_descriptions, show_images, enable_comparison, enable_dynamic_pricing
- `AddonSelectionStepConfiguration` - available_categories[], available_addons[], min_selection, max_selection, group_by_category, show_recommendations
- `PricingSummaryStepConfiguration` - show_package_breakdown, show_addon_breakdown, show_tax_breakdown, show_discount_field, allow_discount_codes, calculate_tax, show_terms_checkbox, require_terms_acceptance, terms_text, terms_url, privacy_url, show_marketing_consent, show_special_requests
- `ContactInfoStepConfiguration` - require_full_name, require_email, require_phone, require_address, require_company, custom_fields[], offer_account_creation, require_account_creation
- `PaymentInfoStepConfiguration` - accept_full_payment, accept_deposit, deposit_percentage, deposit_fixed_amount, allow_payment_plans, allow_quote_request, require_immediate_payment, payment_terms, quote_request_button_text, refund_policy_text, refund_percentage, refund_deadline_hours
- `ConfirmationStepConfiguration` - title, message, show_booking_summary, show_next_steps, next_steps_content[], send_confirmation_email, send_calendar_invite, support_email, support_phone

#### 6.1.9 `bookingData.types.ts` - Booking Data Types
**Source:** `frontend/client-portal/src/types/booking/bookingData.types.ts`

Key types:
- `BookingData` - Complete flattened structure: event_type_id, event_name, venue_selection, date_time, selected_packages[], selected_addons[], contact_info, payment_info, questionnaire_responses[], pricing, applied_discount_code, special_requests, internal_notes, terms_accepted, marketing_consent, completed_steps[], current_step_id
- `SessionUpdatePayload` - step_id, booking_data, mark_completed
- `BookingSession` - session_id, booking_flow, current_step?, progress_percentage, expires_at, is_completed, is_abandoned, total_price?, booking_data, created_at, updated_at

#### 6.1.10 `state.types.ts` - State Management Types
**Source:** `frontend/client-portal/src/types/booking/state.types.ts`

Key types:
- `BookingProgress` - { currentStepIndex, totalSteps, completedSteps[], canGoBack, canGoNext, canSkip }
- `BookingUIState` - { isLoading, isValidating, isSubmitting, error: string | null, validationErrors: Record<string, string[]> }
- `RecoverableSession` - { sessionId, lastUpdated, stepName, progressPercentage }
- `BookingState` - Complete state: availableFlows[], selectedEventType, currentFlow, currentSession, stepData: Record<string, unknown>, progress, ui, paymentGateways[], selectedPaymentGateway, totalPrice, taxRate, pricingBreakdown, recoverableSession
- `BookingActions` - All action methods: fetchAvailableFlows, selectEventType, startSession, updateStepData, validateStep, goToStep, nextStep, previousStep, skipStep, completeBooking, fetchPaymentGateways, selectPaymentGateway, updateTotalPrice, setTaxRate, setPricingBreakdown, resetBooking, clearErrors, clearRecoverableSession, getSelectedProducts, getBookingData

---

## 6.2 Utility Files

Create in `/Users/stephendeslate/Desktop/lifeplace-app/mobile-app/src/utils/`

### 6.2.1 `bookingHelpers.ts`
**Purpose:** Validation, formatting, session utilities

Key functions:
- `validateRequiredFields(data, requiredFields)` - Check required fields are present
- `isSessionExpired(expiresAt)` - Check if session is expired (with 5-min buffer)
- `getSessionRemainingTime(expiresAt)` - Returns { hours, minutes, seconds }
- `formatSessionTime(time)` - Format remaining time for display
- `getStepDisplayName(stepType)` - Human-readable step name
- `calculateProgress(currentIndex, totalSteps)` - Progress percentage
- `getNextRequiredStep(steps, completedSteps)` - Find next required step
- `canSkipStep(step)` - Check if step is skippable
- `mergeStepData(existing, new)` - Deep merge step data

### 6.2.2 `bookingValidation.ts`
**Purpose:** Zod schemas for all 10 steps

Key exports:
- `introductionSchema` - { acknowledged: z.boolean().refine(v => v === true) }
- `venueSelectionSchema` - { selected_venue_ids: z.array(z.number()).min(1) }
- `dateTimeSchema` - { start_date: z.string().datetime(), end_date: z.string().optional(), ... }
- `packageSelectionSchema` - { selected_packages: z.array(selectedPackageSchema).min(1) }
- `addonSelectionSchema` - { selected_addons: z.array(selectedAddonSchema) }
- `questionnaireSchema(fields)` - Dynamic schema based on questionnaire fields
- `pricingSummarySchema` - { terms_accepted: z.boolean().refine(v => v === true), ... }
- `contactInfoSchema(config)` - Dynamic based on required fields
- `paymentSchema` - { payment_method, payment_type, payment_gateway_id }
- `confirmationSchema` - Minimal validation
- `validateStepData(stepType, data, config?)` - Main validator

### 6.2.3 `timezone.ts`
**Purpose:** Philippines timezone (Asia/Manila) handling

Key exports:
- `BUSINESS_TIMEZONE = 'Asia/Manila'`
- `BUSINESS_TIMEZONE_DISPLAY = 'PHT'`
- `BUSINESS_TIMEZONE_OFFSET = '+08:00'`
- `parseAsPhilippinesTime(dateString)` - Parse with TZ awareness
- `formatPhilippinesTime(date, formatStr)` - Format in PHT
- `formatBookingTime(date)` - Returns { primary, timezone }
- `getTimezoneNotice(context)` - Context-specific TZ notices
- `formatDateForPicker(date)` - yyyy-MM-dd format
- `formatTimeForPicker(date)` - HH:mm format
- `isWithinBusinessHours(date)` - Check business hours
- `getNextBusinessDay(from?)` - Get next weekday

### 6.2.4 `currency.ts`
**Purpose:** PHP currency formatting with multi-currency support

Key exports:
- `SUPPORTED_CURRENCIES = { PHP, USD, EUR, SGD, HKD }`
- `DEFAULT_CURRENCY = 'PHP'`
- `getCurrencyConfig(currency)` - Get symbol, decimals, locale
- `getCurrencySymbol(currency)` - Get just symbol (₱, $, etc.)
- `formatCurrency(amount, options?)` - Full formatting with options
- `parseCurrencyInput(value)` - Parse user input to number
- `getCurrencyOptions()` - For dropdowns

### 6.2.5 `errorHandler.ts`
**Purpose:** API error extraction, validation error handling

Key exports:
- `ErrorHandler` class with static methods:
  - `extractMessage(error)` - Get user-friendly message
  - `extractValidationErrors(error)` - Get field-level errors
  - `getStatusCode(error)` - Get HTTP status
  - `isNetworkError(error)` - Check if offline
  - `isAuthError(error)` - Check if 401
  - `isPermissionError(error)` - Check if 403
  - `isValidationError(error)` - Check if 400/422
  - `isServerError(error)` - Check if 5xx
  - `isSessionExpiredError(error)` - Check if 410
  - `getErrorInfo(error)` - Get complete error info object

### 6.2.6 `bookingStorage.ts`
**Purpose:** Session persistence via expo-secure-store

Key exports:
- `SESSION_STORAGE_KEY = 'booking_session_'`
- `SESSION_INDEX_KEY = 'booking_session_index'`
- `saveBookingSession(sessionId, data)` - Save to SecureStore
- `loadBookingSession(sessionId)` - Load from SecureStore
- `clearBookingSession(sessionId)` - Remove specific session
- `getAllSessionIds()` - Get all stored session IDs
- `cleanupExpiredSessions()` - Remove expired sessions
- `clearAllBookingSessions()` - Clear everything
- `getRecoverableSession()` - Find most recent valid session

### 6.2.7 `security.ts`
**Purpose:** Input sanitization, XSS prevention

Key exports:
- `sanitizeString(input)` - Remove dangerous characters
- `sanitizeHTML(input)` - Strip HTML tags
- `sanitizeURL(url)` - Validate and clean URLs
- `escapeHTML(text)` - Escape for display
- `validateEmail(email)` - Email format check
- `validatePhone(phone)` - PH phone format (+63/09xxxxxxxxx)
- `getPasswordStrength(password)` - Returns 0-4 score
- `sanitizeFilename(name)` - Safe filename

---

## 6.3 API Layer

Create `/Users/stephendeslate/Desktop/lifeplace-app/mobile-app/src/apis/booking/`

### 6.3.1 `core.api.ts`
**Source:** `frontend/client-portal/src/apis/booking/core.api.ts`
**Backend:** `/api/bookingflow/public/`

Key functions:
```typescript
// Flow Operations
getEventTypes(): Promise<EventType[]>
getAvailableFlows(eventTypeId?: number): Promise<BookingFlow[]>
getFlowById(flowId: number): Promise<BookingFlow>

// Session Operations
startSession(flowId: number, sessionData?: Partial<BookingSession>): Promise<BookingSessionStartResponse>
getSession(sessionId: string): Promise<BookingSession>
updateSessionData(sessionId: string, stepId: number, data: Record<string, unknown>, proceedToNext?: boolean): Promise<BookingSessionUpdateResponse>
validateStepData(sessionId: string, stepId: number, stepData: Record<string, unknown>): Promise<StepValidationResult>
completeBooking(sessionId: string, completionType: 'payment' | 'quote'): Promise<BookingCompletionResult>
abandonSession(sessionId: string, reason?: string): Promise<void>
goToStep(sessionId: string, stepId: number): Promise<BookingSession>

// Payment & Pricing
getFlowPaymentGateways(flowId: number): Promise<PaymentGatewayResponse>
calculatePricing(sessionId: string, discountCode?: string, venueAdditionalHours?: Record<string, number>): Promise<PricingCalculation>

// Session Utilities (local)
isSessionExpired(expiresAt: string): boolean
getSessionTimeRemaining(expiresAt: string): { hours: number; minutes: number }
saveSessionToLocal(sessionId: string, sessionData: Partial<BookingSession>): Promise<void>
loadSessionFromLocal(sessionId: string): Promise<Partial<BookingSession> | null>
clearSessionFromLocal(sessionId: string): Promise<void>
cleanupExpiredSessions(): Promise<void>
```

### 6.3.2 `introduction.api.ts`
**Purpose:** Introduction step utilities

Key functions:
```typescript
validateStepData(data: IntroductionStepData): StepValidationResult
updateStepData(sessionId: string, stepId: number, data: IntroductionStepData): Promise<void>
formatStepData(data: Partial<IntroductionStepData>): IntroductionStepData
getDefaultData(): IntroductionStepData
```

### 6.3.3 `datetime.api.ts`
**Purpose:** Date/time selection, availability

Key functions:
```typescript
checkAvailability(venueId: number, startDate: string, endDate?: string): Promise<VenueAvailabilityResponse>
validateStepData(data: DateTimeStepData, config: DateTimeStepConfiguration): StepValidationResult
formatDate(date: Date | string): string // Philippines TZ
formatDateRange(startDate: string, endDate?: string): string
getDefaultTimes(venue: RentableVenue): { startTime: string; endTime: string }
calculateDuration(startDate: string, endDate: string): number // days
isDateBlocked(date: string, blockedDates: string[]): boolean
```

### 6.3.4 `venues.api.ts`
**Source:** `frontend/client-portal/src/apis/booking/venues.api.ts`

Key functions:
```typescript
getActiveVenues(): Promise<RentableVenue[]>
getRentableVenues(eventTypeId?: number): Promise<RentableVenue[]>
getRentableVenuesWithEventType(eventTypeId: number): Promise<RentableVenueWithEventType[]>
getVenue(venueId: number): Promise<RentableVenue>
getEffectivePricing(venue: RentableVenueWithEventType): { basePrice: string; includedHours: number; excessHourRate: string }
getVenueAvailability(venueId: number, startDate: string, endDate: string): Promise<VenueAvailabilityResponse>
calculateTimes(venue: RentableVenue, startDate: string, durationHours: number): CalculatedEventTimes
calculateEarlyCheckinFee(venue: RentableVenue, hoursEarly: number): string
calculateLateCheckoutFee(venue: RentableVenue, hoursLate: number): string
findMatchingPackages(venueIds: number[], eventTypeId?: number): Promise<{ packages: MatchedPackage[]; customEstimate: CustomPackageEstimate }>
createFromVenues(venueIds: number[], eventTypeId?: number, additionalHours?: Record<string, number>): Promise<{ custom_package: CustomPackageEstimate }>
```

### 6.3.5 `products.api.ts`
**Source:** `frontend/client-portal/src/apis/booking/products.api.ts`

Key functions:
```typescript
getCategories(): Promise<ProductCategory[]>
getPackages(categoryId?: number): Promise<ProductOption[]>
getAddons(categoryId?: number): Promise<ProductOption[]>
getProductsByIds(ids: number[]): Promise<ProductOption[]>
getDiscounts(): Promise<Discount[]>
validateDiscountCode(code: string): Promise<{ valid: boolean; discount?: Discount; message?: string }>
calculatePackagePrice(pkg: ProductOption, quantity?: number, excessHours?: number): { baseTotal: string; excessTotal: string; total: string }
calculateTotalWithExcessHours(packages: SelectedPackage[], venueAdditionalHours: Record<string, number>): string
formatPrice(amount: string | number, currency?: string): string
isProductAvailable(product: ProductOption): boolean
groupProductsByCategory(products: ProductOption[]): Record<string, ProductOption[]>
```

### 6.3.6 `questionnaire.api.ts`
**Source:** `frontend/client-portal/src/apis/booking/questionnaire.api.ts`

Key functions:
```typescript
getQuestionnaires(eventTypeId?: number): Promise<Questionnaire[]>
getQuestionnaireDetail(questionnaireId: number): Promise<Questionnaire>
getQuestionnaireFields(questionnaireId: number): Promise<QuestionnaireField[]>
validateResponses(questionnaire: Questionnaire, responses: Record<string, unknown>): StepValidationResult
formatResponses(fields: QuestionnaireField[], responses: Record<string, unknown>): FormattedResponse[]
processFileUploads(files: File[], config: QuestionnaireStepConfiguration): Promise<UploadedFile[]>
getFieldValue(field: QuestionnaireField, value: unknown): string // Display formatting
shouldShowField(field: QuestionnaireField, allResponses: Record<string, unknown>): boolean // Conditional display
```

### 6.3.7 `contact_info.api.ts`
**Purpose:** Contact validation, user pre-fill

Key functions:
```typescript
validateData(data: ContactInfoStepData, config: ContactInfoStepConfiguration): StepValidationResult
isValidEmail(email: string): boolean
isValidPhone(phone: string): boolean // PH format: +63xxxxxxxxxx or 09xxxxxxxxx
getDefaultDataFromUser(user: AuthUser): Partial<ContactInfoStepData>
getPasswordStrengthRequirements(): string[]
validatePassword(password: string): { valid: boolean; errors: string[] }
```

### 6.3.8 `payment.api.ts`
**Source:** `frontend/client-portal/src/apis/booking/payment.api.ts`

Key functions:
```typescript
getFlowPaymentGateways(flowId: number): Promise<PaymentGatewayResponse>
getPaymentGateways(): Promise<PaymentGateway[]>
getPaymentGateway(gatewayId: number): Promise<PaymentGateway>
getGatewayPublicConfig(gatewayCode: string): Promise<Record<string, unknown>>
calculateDepositAmount(totalAmount: number, depositPercentage: number, fixedDepositAmount?: number): number
calculateRemainingBalance(totalAmount: number, depositAmount: number): number
formatAmount(amount: number, currency?: string): string
getSupportedPaymentMethods(gateway: PaymentGateway): string[]
getGatewayDisplayName(gateway: PaymentGateway): string
isTestMode(gateway: PaymentGateway): boolean
supportsFeature(gateway: PaymentGateway, feature: string): boolean
getSavedPaymentMethods(): Promise<SavedPaymentMethod[]>
```

### 6.3.9 `confirmation.api.ts`
**Purpose:** Booking completion handling

Key functions:
```typescript
getSessionDetails(sessionId: string): Promise<BookingSession>
sendConfirmationEmail(sessionId: string): Promise<{ sent: boolean; email: string }>
generateBookingReference(sessionId: string): string
getNextStepsContent(config: ConfirmationStepConfiguration): NextStep[]
getSupportContact(config: ConfirmationStepConfiguration): { email: string; phone: string }
formatBookingSummary(session: BookingSession): FormattedBookingSummary
formatPaymentSummary(session: BookingSession): FormattedPaymentSummary
formatQuestionnaireSummary(session: BookingSession): FormattedQuestionnaireSummary[]
```

---

## 6.4 Hooks Layer

Create `/Users/stephendeslate/Desktop/lifeplace-app/mobile-app/src/hooks/booking/`

### 6.4.1 `useBookingCore.tsx`
**Source:** `frontend/client-portal/src/hooks/booking/useBookingCore.tsx`

Key exports:
```typescript
// Query Keys Factory
export const bookingKeys = {
  all: ['booking'] as const,
  eventTypes: () => [...bookingKeys.all, 'eventTypes'] as const,
  flows: (eventTypeId?: number) => [...bookingKeys.all, 'flows', eventTypeId] as const,
  flow: (flowId: number) => [...bookingKeys.all, 'flow', flowId] as const,
  session: (sessionId: string) => [...bookingKeys.all, 'session', sessionId] as const,
  paymentGateways: (flowId: number) => [...bookingKeys.all, 'paymentGateways', flowId] as const,
};

// Hooks
useEventTypes(): UseQueryResult<EventType[]>
useBookingFlows(eventTypeId?: number): UseQueryResult<BookingFlow[]>
useBookingFlow(flowId?: number): UseQueryResult<BookingFlow>
useBookingSession(sessionId?: string): {
  session: BookingSession | undefined;
  loading: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
  fetchSession: () => void;
  startSession: (flowId: number) => Promise<BookingSessionStartResponse>;
  updateSessionData: (args: { stepId: number; data: Record<string, unknown>; proceedToNext?: boolean }) => Promise<BookingSessionUpdateResponse>;
  validateStep: (args: { stepId: number; data: Record<string, unknown> }) => Promise<StepValidationResult>;
  abandonSession: (reason?: string) => Promise<void>;
  isUpdating: boolean;
  isValidating: boolean;
}
useFlowPaymentGateways(flowId?: number): UseQueryResult<PaymentGatewayResponse>
useSessionTimer(expiresAt?: string): { timeRemaining: { hours: number; minutes: number }; isExpired: boolean; formattedTime: string }
useSessionRecovery(): {
  recoverableSession: RecoverableSession | null;
  clearRecoverableSession: () => void;
  checkForRecoverableSession: () => Promise<void>;
}
```

### 6.4.2 `useIntroduction.tsx`
Key exports:
```typescript
useIntroduction(sessionId: string, stepId: number, initialData?: IntroductionStepData): {
  data: IntroductionStepData;
  setAcknowledged: (value: boolean) => void;
  isValid: boolean;
  isDirty: boolean;
  save: () => Promise<void>;
  validate: () => Promise<StepValidationResult>;
  isSaving: boolean;
  error: string | null;
}

useIntroductionData(initialData?: IntroductionStepData): {
  data: IntroductionStepData;
  setAcknowledged: (value: boolean) => void;
  isValid: boolean;
  isDirty: boolean;
  reset: () => void;
}
```

### 6.4.3 `useDateTime.tsx`
Key exports:
```typescript
useDateTime(sessionId: string, stepId: number, initialData?: DateTimeStepData, config?: DateTimeStepConfiguration): {
  data: DateTimeStepData;
  updateData: (updates: Partial<DateTimeStepData>) => void;
  availabilityStatus: 'idle' | 'checking' | 'available' | 'unavailable';
  blockedDates: string[];
  checkAvailability: (venueId: number, startDate: string, endDate?: string) => Promise<VenueAvailabilityResponse>;
  isValid: boolean;
  isDirty: boolean;
  save: () => Promise<void>;
  validate: () => Promise<StepValidationResult>;
  isSaving: boolean;
  error: string | null;
}

useDateTimeData(initialData?: DateTimeStepData): {
  data: DateTimeStepData;
  updateData: (updates: Partial<DateTimeStepData>) => void;
  isValid: boolean;
  reset: () => void;
}
```

### 6.4.4 `useVenues.tsx`
Key exports:
```typescript
useRentableVenues(eventTypeId?: number): UseQueryResult<RentableVenueWithEventType[]>
useVenue(venueId?: number): UseQueryResult<RentableVenue>
useVenueAvailability(venueId: number, startDate: string, endDate: string): UseQueryResult<VenueAvailabilityResponse>
useVenueSelection(initialData?: VenueSelectionStepData, config?: VenueSelectionStepConfiguration): {
  selectedVenueIds: number[];
  toggleVenue: (venueId: number) => void;
  selectVenue: (venueId: number) => void;
  deselectVenue: (venueId: number) => void;
  isValid: boolean;
  validationMessage: string | null;
  getEffectivePricing: (venue: RentableVenueWithEventType) => { basePrice: string; includedHours: number; excessHourRate: string };
}
```

### 6.4.5 `useProducts.tsx`
Key exports:
```typescript
usePackages(categoryId?: number): UseQueryResult<ProductOption[]>
useAddons(categoryId?: number): UseQueryResult<ProductOption[]>
useProductsByIds(ids: number[]): UseQueryResult<ProductOption[]>
useCategories(): UseQueryResult<ProductCategory[]>
useProductSelection(type: 'package' | 'addon', config?: SelectionStepConfiguration): {
  selected: SelectedPackage[] | SelectedAddon[];
  toggleProduct: (product: ProductOption) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  isSelected: (productId: number) => boolean;
  getQuantity: (productId: number) => number;
  isValid: boolean;
  validationMessage: string | null;
  totalCount: number;
  totalPrice: string;
}
```

### 6.4.6 `useQuestionnaire.tsx`
Key exports:
```typescript
useQuestionnaires(eventTypeId?: number): UseQueryResult<Questionnaire[]>
useQuestionnaireDetail(questionnaireId?: number): UseQueryResult<Questionnaire>
useQuestionnaireFields(questionnaireId?: number): UseQueryResult<QuestionnaireField[]>
useQuestionnaireResponses(questionnaire: Questionnaire, initialResponses?: Record<string, unknown>): {
  responses: Record<string, unknown>;
  setFieldValue: (fieldId: number, value: unknown) => void;
  getFieldValue: (fieldId: number) => unknown;
  isFieldValid: (fieldId: number) => boolean;
  getFieldError: (fieldId: number) => string | null;
  visibleFields: QuestionnaireField[];
  completionPercentage: number;
  isComplete: boolean;
  validate: () => StepValidationResult;
}
useQuestionnaireFileUpload(config: QuestionnaireStepConfiguration): {
  uploadFile: (fieldId: number) => Promise<UploadedFile>;
  uploadedFiles: Record<number, UploadedFile>;
  removeFile: (fieldId: number) => void;
  isUploading: boolean;
  uploadError: string | null;
}
```

### 6.4.7 `useContactInfo.tsx`
Key exports:
```typescript
useContactInfo(config: ContactInfoStepConfiguration, initialData?: ContactInfoStepData): {
  data: ContactInfoStepData;
  updateField: (field: keyof ContactInfoStepData, value: string | boolean) => void;
  fieldErrors: Record<string, string>;
  fieldStrengths: Record<string, number>; // 0-100
  isValid: boolean;
  isPreFilled: boolean;
  showWelcomeBack: boolean;
}

useContactInfoValidation(config: ContactInfoStepConfiguration): {
  validateField: (field: string, value: string) => { valid: boolean; error?: string };
  validateAll: (data: ContactInfoStepData) => StepValidationResult;
  getFieldStrength: (field: string, value: string) => number;
}
```

### 6.4.8 `usePayment.tsx`
Key exports:
```typescript
usePaymentGateways(): UseQueryResult<PaymentGateway[]>
useFlowPaymentGateways(flowId?: number): UseQueryResult<PaymentGatewayResponse>
usePaymentGateway(gatewayId?: number): UseQueryResult<PaymentGateway>
useGatewayConfig(gatewayCode: string): UseQueryResult<Record<string, unknown>>
useSavedPaymentMethods(): UseQueryResult<SavedPaymentMethod[]>

usePaymentCalculations(totalPrice: string, paymentTerms: PaymentTermsConfig): {
  depositAmount: number;
  fullAmount: number;
  remainingBalance: number;
  depositPercentage: number;
  formattedDeposit: string;
  formattedFull: string;
  formattedBalance: string;
  balanceDueDate: string | null;
}

usePaymentValidation(): {
  validatePaymentMethod: (method: string, gateway: PaymentGateway) => boolean;
  validateAmount: (amount: number, minimum: number) => boolean;
}

usePaymentFlow(flowId: number, totalPrice: string): {
  paymentType: 'FULL' | 'DEPOSIT';
  setPaymentType: (type: 'FULL' | 'DEPOSIT') => void;
  selectedGateway: PaymentGateway | null;
  selectGateway: (gateway: PaymentGateway) => void;
  completionType: 'payment' | 'quote';
  setCompletionType: (type: 'payment' | 'quote') => void;
  quoteMessage: string;
  setQuoteMessage: (message: string) => void;
  amount: number;
  isValid: boolean;
}

useGatewaySelection(gateways: PaymentGateway[]): {
  availableGateways: PaymentGateway[];
  defaultGateway: PaymentGateway | null;
  getGatewayByCode: (code: string) => PaymentGateway | undefined;
}
```

### 6.4.9 `useConfirmation.tsx`
Key exports:
```typescript
useConfirmation(sessionId: string, config?: ConfirmationStepConfiguration): {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bookingReference: string | null;
  completionResult: BookingCompletionResult | null;
  completeBooking: (completionType: 'payment' | 'quote') => Promise<BookingCompletionResult>;
  retryCompletion: () => Promise<void>;
  isCompleting: boolean;
  error: string | null;
  nextSteps: NextStep[];
  supportContact: { email: string; phone: string };
}

useConfirmationDisplay(session: BookingSession): {
  bookingSummary: FormattedBookingSummary;
  paymentSummary: FormattedPaymentSummary;
  questionnaireSummary: FormattedQuestionnaireSummary[];
  contactInfo: FormattedContactInfo;
  eventDetails: FormattedEventDetails;
}
```

### 6.4.10 `useSimplePricing.tsx`
Key exports:
```typescript
useSimplePricing(
  sessionId: string | undefined,
  selectedPackages: SelectedPackage[],
  selectedAddons: SelectedAddon[],
  discountCode?: string,
  venueAdditionalHours?: Record<string, number>
): {
  pricing: PricingCalculation;
  loading: boolean;
  error: string | null;
  hasItems: boolean;
  totalItemCount: number;
  recalculate: () => void;
  applyDiscount: (code: string) => Promise<{ valid: boolean; message?: string }>;
  removeDiscount: () => void;
  discountStatus: 'idle' | 'validating' | 'valid' | 'invalid';
  appliedDiscount: Discount | null;
}
```

---

## 6.5 Context & State Management

### 6.5.1 `src/contexts/BookingContext.tsx`
**Source:** `frontend/client-portal/src/contexts/BookingContext.tsx`

**State Structure:**
```typescript
interface BookingState {
  // Flow Management
  availableFlows: BookingFlow[];
  selectedEventType: EventType | null;
  currentFlow: BookingFlow | null;

  // Session Management
  currentSession: BookingSession | null;
  stepData: Record<string, unknown>;

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
```

**Key Features:**
- Reducer-based state management
- Debounced backend synchronization (1-second debounce)
- Session persistence to expo-secure-store on AppState change (background/inactive)
- Session recovery check on mount
- Expired session cleanup
- Session timer integration
- Complete action set for all booking operations

**Action Types:**
- SET_LOADING, SET_ERROR
- SET_FLOWS, SET_EVENT_TYPE, SET_FLOW
- SET_SESSION, UPDATE_STEP_DATA, SET_PROGRESS
- SET_VALIDATION_ERRORS, CLEAR_ERRORS
- SET_PAYMENT_GATEWAYS, SET_SELECTED_GATEWAY
- SET_TOTAL_PRICE, SET_TAX_RATE, SET_PRICING_BREAKDOWN
- SET_RECOVERABLE_SESSION, RESET

### 6.5.2 `src/providers/BookingProvider.tsx`
Wrapper component that provides BookingContext

Features:
- Wraps booking screens only (not app-wide)
- Integrates session timer
- Error boundary wrapper
- AppState listener for session persistence
- Recovery check on mount

---

## 6.6 Container & Navigation Components

Create `/Users/stephendeslate/Desktop/lifeplace-app/mobile-app/src/components/booking/`

### 6.6.1 `BookingContainer.tsx`
Main booking flow orchestrator

Features:
- Header with flow name and close button
- BookingProgressIndicator
- SessionTimer display
- Error alerts (validation, network)
- Main content area for step rendering
- Pricing summary footer
- BookingNavigation (Back/Next buttons)

### 6.6.2 `StepRenderer.tsx`
Dynamic step component router

Features:
- Maps step_type to step component
- Passes step configuration
- Handles data change callbacks
- Validation integration
- Loading states

### 6.6.3 `BookingProgressIndicator.tsx`
Visual progress across steps

Variants:
- `linear` - Simple progress bar
- `stepper` - Step dots with labels
- `compact` - Minimal (X of Y)

Features:
- Current step highlight
- Completed step checkmarks
- Step labels (optional)
- Touch to navigate (if allowed)

### 6.6.4 `SessionTimer.tsx`
Session expiry countdown

Features:
- HH:MM display
- Warning color at <10 minutes
- Critical color at <5 minutes
- Expiry callback
- Extend session option (if supported)

### 6.6.5 `SessionRecoverySheet.tsx`
Bottom sheet for recovering interrupted sessions

Features:
- Session info display (step name, progress)
- "Resume" and "Start Fresh" buttons
- Last updated timestamp
- Swipe to dismiss

### 6.6.6 `BookingNavigation.tsx`
Back/Next/Skip buttons

Features:
- Back button (disabled on first step)
- Next/Continue button with loading state
- Skip button (when step is skippable)
- Validation feedback on Next press

---

## 6.7 Event Type Selection Components

### 6.7.1 `EventTypeSelection.tsx`
Grid of event type cards

Features:
- Loading skeleton
- Empty state
- Event type cards
- Tap to select and start flow

### 6.7.2 `EventTypeCard.tsx`
Individual event type display

Features:
- Featured image
- Name and description
- Key features list
- Starting price display
- Tap handler

### 6.7.3 `EventTypeDetailModal.tsx`
Full event type details (optional)

Features:
- Full description
- Image gallery
- All features
- Pricing info
- "Book Now" CTA

---

## 6.8 Step Screens

Create `/Users/stephendeslate/Desktop/lifeplace-app/mobile-app/app/booking/`

### 6.8.0 `_layout.tsx`
Booking flow layout

Features:
- BookingProvider wrapper
- Stack navigation configuration
- Session recovery check
- Gesture handler setup

### 6.8.1 `[flowId]/index.tsx` - Introduction Step
**Features from client-portal:**
- Terms acknowledgment checkbox with validation
- Animated welcome header with event type name
- Configuration-driven content (title, description from config)
- Accessibility announcements
- Success indicator when acknowledged
- Custom background/styling from config

### 6.8.2 `[flowId]/venue.tsx` - Venue Selection Step
**Features from client-portal:**
- Multi-venue selection with min/max constraints
- Event-type-specific pricing display
- Capacity display (people icons, range)
- Included hours per venue
- Excess hour rates display
- All-day access detection (skip hours selector)
- Featured images and location metadata
- Toggle-based selection UI
- Real-time validation
- Package recommendation hint

### 6.8.3 `[flowId]/datetime.tsx` - DateTime Step
**Features from client-portal:**
- Interactive calendar with availability overlay
- Blocked dates display
- Single-day OR multi-day range modes (from config)
- Min/max day range constraints
- Venue operating rules display (check-in/check-out times)
- Real-time availability checking via API
- Philippines timezone handling (Asia/Manila)
- Human-readable date formatting
- Time slot selection (when configured)

### 6.8.4 `[flowId]/package.tsx` - Package Selection Step
**Features from client-portal:**
- **Dual Mode**: Pre-made packages OR custom bundle from venues
- Custom bundle pricing with 10% multi-venue discount
- Venue additional hours selector per venue
- All-day access venues skip hours selector
- Pricing model display (HOURLY vs FIXED)
- Quantity selector for multiple selection mode
- Event days filtering based on date range
- Featured indicator badges
- Collapsible details (min/max hours, advance booking requirements)
- Real-time pricing updates
- Comparison view (optional)

### 6.8.5 `[flowId]/addons.tsx` - Addon Selection Step
**Features from client-portal:**
- Optional category grouping
- Per-addon quantity selector (increment/decrement)
- Min/max selection constraints from config
- Venue additional hours section (continuation from package step)
- Progress indicator (selected count / total)
- Tax rate and price_with_tax inclusion
- Featured addon badges
- Summary card showing selected items with totals
- Empty state when no addons available

### 6.8.6 `[flowId]/questionnaire.tsx` - Questionnaire Step
**Features from client-portal:**
- Multiple questionnaire support per flow
- All 14 field types:
  1. TextField - single line text
  2. TextareaField - multi-line text
  3. NumberField - numeric input
  4. EmailField - email with validation
  5. PhoneField - phone with PH format
  6. DateField - date picker
  7. TimeField - time picker
  8. SelectField - dropdown
  9. MultiSelectField - multi-select chips
  10. RadioField - radio buttons
  11. CheckboxField - single checkbox
  12. FileUploadField - expo-document-picker with size/type validation
  13. RatingField - star rating
  14. BooleanField - yes/no toggle
- Completion progress bar
- Required field validation
- Dynamic field visibility (conditional logic)
- Dynamic questionnaire visibility (show when conditions)
- Field ordering by order field
- Grouped by questionnaire name
- Help text display

### 6.8.7 `[flowId]/summary.tsx` - Pricing Summary Step
**Features from client-portal:**
- Itemized package breakdown with excess hour details
- Itemized addon breakdown with quantities
- Per-venue excess hours breakdown (new feature)
- Subtotal, tax, discount, total display
- Discount code input with apply/remove
- Discount validation states (idle, validating, valid, invalid)
- Terms & conditions checkbox with configurable URL
- Marketing consent checkbox (optional, from config)
- Special requests textarea
- Contact info summary display
- Custom header/footer text from config
- Real-time pricing recalculation
- Edit links to previous steps

### 6.8.8 `[flowId]/contact.tsx` - Contact Info Step
**Features from client-portal:**
- Auto-fill from authenticated user profile
- "Welcome back, [Name]!" banner for logged-in users
- Real-time field validation with visual states
- Philippines phone format (+63 prefix or 09xxxxxxxxx)
- Field strength indicators (progress bars for email/phone)
- Account creation option with password field
- Password visibility toggle
- Password strength indicator
- Custom fields from configuration
- Configurable required fields
- Company/address fields (optional)

### 6.8.9 `[flowId]/payment.tsx` - Payment Step
**Features from client-portal:**
- **Completion choice screen** (if quote requests enabled):
  - Option 1: Secure booking with deposit/full payment
  - Option 2: Request custom quote
  - Trust signals (price locked, date reserved, secure)
- **Payment type selection**: Deposit vs. full payment
- Dynamic amount display based on payment plan settings
- Balance due date information
- **For authenticated users**: Saved payment method selector
- **Gateway selection**: All supported gateways
  - Stripe (cards, Apple Pay, Google Pay)
  - PayPal
  - GCash
  - PayMaya
  - Bank Transfer
  - Manual/Offline
- Stripe React Native integration (`@stripe/stripe-react-native`)
- **Quote request flow**: Special requirements textarea
- Refund policy display with deadline hours
- Save payment method checkbox (for future use)

### 6.8.10 `[flowId]/confirmation.tsx` - Confirmation Step
**Features from client-portal:**
- Status display states (processing, success, failed, pending)
- Retry button for failed state
- BookingSummaryCard (event details, packages, addons)
- PaymentSummaryCard (amounts, payment type, refund policy)
- QuestionnaireSummaryCard (collected responses in accordion)
- ContactSummaryCard (contact information)
- Special requests display
- Booking/quote reference (copyable chip)
- Next steps content (configurable action items)
- Navigate to dashboard (authenticated) or home
- Support contact links
- Share booking option

---

## 6.9 Step Components

Create component files in `/Users/stephendeslate/Desktop/lifeplace-app/mobile-app/src/components/booking/`

### Venue Selection Components
- `VenueCard.tsx` - Venue display with pricing, capacity, toggle
- `VenueHoursSelector.tsx` - Per-venue additional hours input

### DateTime Components
- `EventCalendar.tsx` - Calendar with availability overlay

### Package Selection Components
- `PackageCard.tsx` - Package display with details, pricing
- `CustomBundleCard.tsx` - Custom bundle display with venue breakdown

### Addon Selection Components
- `AddonCard.tsx` - Addon display with quantity
- `AddonQuantitySelector.tsx` - +/- quantity control

### Questionnaire Field Components (14 total)
Create in `/src/components/booking/fields/`:
- `TextField.tsx`
- `TextareaField.tsx`
- `NumberField.tsx`
- `EmailField.tsx`
- `PhoneField.tsx`
- `DateField.tsx`
- `TimeField.tsx`
- `SelectField.tsx`
- `MultiSelectField.tsx`
- `RadioField.tsx`
- `CheckboxField.tsx`
- `FileUploadField.tsx`
- `RatingField.tsx`
- `BooleanField.tsx`

Also:
- `QuestionnaireRenderer.tsx` - Renders all fields for a questionnaire

### Pricing Summary Components
- `PricingBreakdown.tsx` - Line-by-line pricing display
- `DiscountCodeInput.tsx` - Discount code with validation
- `TermsCheckbox.tsx` - Terms acceptance with link
- `BookingReviewSection.tsx` - Edit-able summary sections

### Contact Form Components
- `ContactForm.tsx` - Complete contact form
- `ValidationIndicator.tsx` - Field validation state display

### Payment Components
- `CompletionChoiceScreen.tsx` - Payment vs quote choice
- `PaymentTypeSelector.tsx` - Deposit vs full selector
- `GatewaySelector.tsx` - Payment gateway selector
- `QuoteRequestForm.tsx` - Quote request with message
- `StripePaymentForm.tsx` - Stripe card input
- `SavedPaymentMethods.tsx` - Saved cards list
- `RefundPolicyDisplay.tsx` - Refund policy text

### Confirmation Components
- `ConfirmationStatus.tsx` - Status display with animation
- `BookingSummaryCard.tsx` - Event/package summary
- `PaymentSummaryCard.tsx` - Payment details
- `QuestionnaireSummaryCard.tsx` - Responses accordion
- `ContactSummaryCard.tsx` - Contact info display
- `NextStepsCard.tsx` - Action items list

---

## 6.10 Session Management

### Features to Implement

1. **Session Timer Component** (`SessionTimer.tsx`)
   - Countdown display (MM:SS or HH:MM:SS)
   - Warning at configurable threshold
   - Expiry callback
   - Visual styling (normal/warning/critical)

2. **Session Persistence** (`bookingStorage.ts`)
   - Save on AppState change (background/inactive)
   - Save on significant data changes (debounced)
   - Load on app start
   - Clear on completion/abandonment

3. **Session Recovery** (`SessionRecoverySheet.tsx`)
   - Check for valid sessions on mount
   - Show recovery UI if found
   - Resume or discard options
   - Sync with backend on resume

4. **Debounced Backend Sync**
   - 1-second debounce on step data updates
   - Immediate save to local storage
   - Mark pending_sync flag
   - Retry on failure

5. **Expired Session Cleanup**
   - Check on app start
   - Remove sessions past expires_at
   - Clear from both local and backend

6. **Session Abandonment Tracking**
   - Track reason (timeout, user_cancelled, error)
   - Send to backend for analytics
   - Clear local session

---

## Implementation Order

### Week 1: Foundation
1. [ ] Create all type definition files (6.1.1 - 6.1.10)
2. [ ] Create all utility files (6.2.1 - 6.2.7)
3. [ ] Create API layer files (6.3.1 - 6.3.9)
4. [ ] Install Stripe SDK: `npx expo install @stripe/stripe-react-native`

### Week 2: State & Core Hooks
1. [ ] Create BookingContext (6.5.1)
2. [ ] Create BookingProvider (6.5.2)
3. [ ] Create useBookingCore hook (6.4.1)
4. [ ] Create useSimplePricing hook (6.4.10)
5. [ ] Create container components (6.6.1 - 6.6.6)

### Week 3: Steps 1-5
1. [ ] Create booking layout and navigation (6.8.0)
2. [ ] Create EventTypeSelection components (6.7.1 - 6.7.3)
3. [ ] Implement Introduction step + hook (6.8.1, 6.4.2)
4. [ ] Implement Venue Selection step + hook (6.8.2, 6.4.4)
5. [ ] Implement DateTime step + hook (6.8.3, 6.4.3)
6. [ ] Implement Package Selection step + hook (6.8.4, 6.4.5)
7. [ ] Implement Addon Selection step (6.8.5)

### Week 4: Steps 6-10
1. [ ] Implement Questionnaire step + hook (6.8.6, 6.4.6)
2. [ ] Create all 14 field components
3. [ ] Implement Pricing Summary step (6.8.7)
4. [ ] Implement Contact Info step + hook (6.8.8, 6.4.7)
5. [ ] Implement Payment step + hook (6.8.9, 6.4.8)
6. [ ] Implement Confirmation step + hook (6.8.10, 6.4.9)

### Week 5: Session Management & Polish
1. [ ] Implement session timer (6.10)
2. [ ] Implement session persistence
3. [ ] Implement session recovery
4. [ ] Implement debounced sync
5. [ ] Test all payment gateways
6. [ ] End-to-end testing
7. [ ] Performance optimization

---

## Testing Requirements

### Unit Tests
- [ ] All utility functions
- [ ] All API functions (mocked)
- [ ] All hooks
- [ ] All validation schemas

### Integration Tests
- [ ] Complete booking flow (happy path)
- [ ] Session recovery flow
- [ ] Payment flows (each gateway)
- [ ] Quote request flow
- [ ] Error handling

### E2E Tests (Maestro)
- [ ] Full booking with payment
- [ ] Guest booking
- [ ] Authenticated booking
- [ ] Session timeout recovery
- [ ] Multi-venue custom package

---

## Dependencies to Install

```bash
# Stripe (if not installed)
npx expo install @stripe/stripe-react-native

# Already installed (verify in package.json):
# - @tanstack/react-query
# - axios
# - date-fns
# - date-fns-tz
# - zod
# - zustand
# - react-hook-form
# - @hookform/resolvers
# - expo-secure-store
# - expo-document-picker (for file uploads)
# - expo-file-system
# - expo-haptics
```

---

## File Count Summary

| Category | Files |
|----------|-------|
| Types (6.1) | 10 |
| Utilities (6.2) | 7 |
| APIs (6.3) | 9 |
| Hooks (6.4) | 10 |
| Context (6.5) | 2 |
| Container Components (6.6) | 6 |
| Event Type Components (6.7) | 3 |
| Step Screens (6.8) | 11 |
| Step Components (6.9) | 45+ |
| **Total** | **~103 files** |

---

## Backend API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bookingflow/public/flows/` | GET | List available flows |
| `/api/bookingflow/public/flows/{id}/` | GET | Get flow details |
| `/api/bookingflow/public/flows/{id}/start_session/` | POST | Start new session |
| `/api/bookingflow/public/flows/{id}/payment_gateways/` | GET | Get payment gateways |
| `/api/bookingflow/public/flows/session/{uuid}/` | GET | Get session |
| `/api/bookingflow/public/flows/session/{uuid}/update/` | PATCH | Update step data |
| `/api/bookingflow/public/flows/session/{uuid}/validate/` | POST | Validate step |
| `/api/bookingflow/public/flows/session/{uuid}/complete/` | POST | Complete booking |
| `/api/bookingflow/public/rentable-venues/` | GET | List venues |
| `/api/bookingflow/public/products/` | GET | List products |
| `/api/bookingflow/public/discounts/validate/` | POST | Validate discount |

---

## Success Criteria

- [ ] All 10 booking steps implemented with full feature parity
- [ ] Session persistence and recovery working
- [ ] All 6 payment gateways functional
- [ ] All 14 questionnaire field types working
- [ ] Custom package creation from venues functional
- [ ] Pricing calculation accurate with all scenarios
- [ ] Guest and authenticated booking flows complete
- [ ] Quote request flow functional
- [ ] Session timer and expiry handling robust
- [ ] Deep linking for session recovery working
- [ ] All unit tests passing
- [ ] E2E tests passing

---

## References

- **Client-Portal Source:** `frontend/client-portal/src/` (APIs, hooks, types, components, contexts)
- **Backend API:** `backend/core/domains/bookingflow/` (models, views, serializers, services)
- **Documentation:**
  - [BOOKING_FLOW_GAP_ANALYSIS.md](BOOKING_FLOW_GAP_ANALYSIS.md)
  - [BOOKING_IMPLEMENTATION.md](BOOKING_IMPLEMENTATION.md)
  - [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
