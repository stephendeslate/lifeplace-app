/**
 * Test ID Constants
 *
 * Centralized test IDs for use in components and tests.
 * Using constants ensures consistency and makes refactoring easier.
 *
 * NAMING CONVENTION:
 * - Use kebab-case for the string values
 * - Group by feature/screen
 * - Be descriptive but concise
 */

export const TEST_IDS = {
  // =========================================================================
  // AUTH SCREENS
  // =========================================================================
  LOGIN_EMAIL_INPUT: 'login-email-input',
  LOGIN_PASSWORD_INPUT: 'login-password-input',
  LOGIN_SUBMIT_BUTTON: 'login-submit-button',
  LOGIN_ERROR_MESSAGE: 'login-error-message',
  LOGIN_FORGOT_PASSWORD_LINK: 'login-forgot-password-link',
  LOGIN_REGISTER_LINK: 'login-register-link',

  REGISTER_FIRST_NAME_INPUT: 'register-first-name-input',
  REGISTER_LAST_NAME_INPUT: 'register-last-name-input',
  REGISTER_EMAIL_INPUT: 'register-email-input',
  REGISTER_PHONE_INPUT: 'register-phone-input',
  REGISTER_PASSWORD_INPUT: 'register-password-input',
  REGISTER_CONFIRM_PASSWORD_INPUT: 'register-confirm-password-input',
  REGISTER_SUBMIT_BUTTON: 'register-submit-button',
  REGISTER_LOGIN_LINK: 'register-login-link',

  FORGOT_PASSWORD_EMAIL_INPUT: 'forgot-password-email-input',
  FORGOT_PASSWORD_SUBMIT_BUTTON: 'forgot-password-submit-button',

  // =========================================================================
  // DASHBOARD
  // =========================================================================
  DASHBOARD_SCREEN: 'dashboard-screen',
  DASHBOARD_GREETING: 'dashboard-greeting',
  DASHBOARD_ACTIONS_SECTION: 'dashboard-actions-section',
  DASHBOARD_EVENTS_SECTION: 'dashboard-events-section',
  DASHBOARD_FINANCIAL_SECTION: 'dashboard-financial-section',
  DASHBOARD_ACTION_CARD: 'dashboard-action-card',
  DASHBOARD_EVENT_PREVIEW: 'dashboard-event-preview',

  // =========================================================================
  // EVENTS
  // =========================================================================
  EVENTS_SCREEN: 'events-screen',
  EVENTS_LIST: 'events-list',
  EVENTS_FILTER_CHIPS: 'events-filter-chips',
  EVENTS_SEARCH_INPUT: 'events-search-input',
  EVENTS_EMPTY_STATE: 'events-empty-state',
  EVENT_CARD: 'event-card',
  EVENT_STATUS_BADGE: 'event-status-badge',

  EVENT_DETAIL_SCREEN: 'event-detail-screen',
  EVENT_DETAIL_HERO: 'event-detail-hero',
  EVENT_DETAIL_TABS: 'event-detail-tabs',
  EVENT_TIMELINE_TAB: 'event-timeline-tab',
  EVENT_DOCUMENTS_TAB: 'event-documents-tab',
  EVENT_INVOICES_TAB: 'event-invoices-tab',
  EVENT_CONTRACTS_TAB: 'event-contracts-tab',

  // =========================================================================
  // BOOKING FLOW
  // =========================================================================
  BOOKING_CONTAINER: 'booking-container',
  BOOKING_PROGRESS: 'booking-progress',
  BOOKING_STEP_TITLE: 'booking-step-title',
  BOOKING_NEXT_BUTTON: 'booking-next-button',
  BOOKING_BACK_BUTTON: 'booking-back-button',
  BOOKING_SESSION_TIMER: 'booking-session-timer',
  BOOKING_PRICING_BAR: 'booking-pricing-bar',

  // Introduction Step
  INTRODUCTION_TERMS_CHECKBOX: 'introduction-terms-checkbox',
  INTRODUCTION_CONTINUE_BUTTON: 'introduction-continue-button',

  // Venue Selection Step
  VENUE_SELECTION_SCREEN: 'venue-selection-screen',
  VENUE_CARD: 'venue-card',
  VENUE_CARD_SELECTED: 'venue-card-selected',
  VENUE_CAPACITY_INFO: 'venue-capacity-info',
  VENUE_PRICE_INFO: 'venue-price-info',

  // DateTime Step
  DATE_TIME_SCREEN: 'date-time-screen',
  DATE_CALENDAR: 'date-calendar',
  DATE_SELECTED: 'date-selected',
  TIME_PICKER: 'time-picker',

  // Package Selection Step
  PACKAGE_SELECTION_SCREEN: 'package-selection-screen',
  PACKAGE_CARD: 'package-card',
  PACKAGE_CARD_SELECTED: 'package-card-selected',
  PACKAGE_PRICE: 'package-price',
  PACKAGE_FEATURES: 'package-features',

  // Addon Selection Step
  ADDON_SELECTION_SCREEN: 'addon-selection-screen',
  ADDON_CARD: 'addon-card',
  ADDON_QUANTITY_SELECTOR: 'addon-quantity-selector',
  ADDON_QUANTITY_INCREMENT: 'addon-quantity-increment',
  ADDON_QUANTITY_DECREMENT: 'addon-quantity-decrement',

  // Questionnaire Step
  QUESTIONNAIRE_SCREEN: 'questionnaire-screen',
  QUESTIONNAIRE_PROGRESS: 'questionnaire-progress',
  QUESTIONNAIRE_FIELD: 'questionnaire-field',
  QUESTIONNAIRE_SUBMIT: 'questionnaire-submit',

  // Pricing Summary Step
  PRICING_SUMMARY_SCREEN: 'pricing-summary-screen',
  PRICING_BREAKDOWN: 'pricing-breakdown',
  PRICING_TOTAL: 'pricing-total',
  PRICING_DISCOUNT_INPUT: 'pricing-discount-input',
  PRICING_DISCOUNT_APPLY: 'pricing-discount-apply',
  PRICING_TERMS_CHECKBOX: 'pricing-terms-checkbox',

  // Contact Info Step
  CONTACT_INFO_SCREEN: 'contact-info-screen',
  CONTACT_FIRST_NAME_INPUT: 'contact-first-name-input',
  CONTACT_LAST_NAME_INPUT: 'contact-last-name-input',
  CONTACT_EMAIL_INPUT: 'contact-email-input',
  CONTACT_PHONE_INPUT: 'contact-phone-input',

  // Payment Step
  PAYMENT_SCREEN: 'payment-screen',
  PAYMENT_TYPE_SELECTOR: 'payment-type-selector',
  PAYMENT_DEPOSIT_OPTION: 'payment-deposit-option',
  PAYMENT_FULL_OPTION: 'payment-full-option',
  PAYMENT_GATEWAY_SELECTOR: 'payment-gateway-selector',
  PAYMENT_CARD_FIELD: 'payment-card-field',
  PAYMENT_SUBMIT_BUTTON: 'payment-submit-button',

  // Confirmation Step
  CONFIRMATION_SCREEN: 'confirmation-screen',
  CONFIRMATION_STATUS: 'confirmation-status',
  CONFIRMATION_REFERENCE: 'confirmation-reference',
  CONFIRMATION_SUMMARY: 'confirmation-summary',
  CONFIRMATION_DASHBOARD_BUTTON: 'confirmation-dashboard-button',

  // =========================================================================
  // PAYMENTS
  // =========================================================================
  PAYMENTS_SCREEN: 'payments-screen',
  PAYMENTS_OVERVIEW: 'payments-overview',
  PAYMENTS_TAB_INVOICES: 'payments-tab-invoices',
  PAYMENTS_TAB_METHODS: 'payments-tab-methods',
  INVOICE_CARD: 'invoice-card',
  INVOICE_STATUS_BADGE: 'invoice-status-badge',
  INVOICE_PAY_BUTTON: 'invoice-pay-button',
  PAYMENT_METHOD_CARD: 'payment-method-card',
  ADD_PAYMENT_METHOD_BUTTON: 'add-payment-method-button',

  // =========================================================================
  // CONTRACTS
  // =========================================================================
  CONTRACT_CARD: 'contract-card',
  CONTRACT_STATUS_BADGE: 'contract-status-badge',
  CONTRACT_VIEW_BUTTON: 'contract-view-button',
  CONTRACT_SIGN_BUTTON: 'contract-sign-button',
  CONTRACT_SIGNATURE_PAD: 'contract-signature-pad',
  CONTRACT_CLEAR_SIGNATURE: 'contract-clear-signature',
  CONTRACT_SIGNER_NAME_INPUT: 'contract-signer-name-input',
  CONTRACT_ACCEPT_TERMS: 'contract-accept-terms',
  CONTRACT_SUBMIT_SIGNATURE: 'contract-submit-signature',

  // =========================================================================
  // QUOTES
  // =========================================================================
  QUOTE_CARD: 'quote-card',
  QUOTE_STATUS_BADGE: 'quote-status-badge',
  QUOTE_VIEW_BUTTON: 'quote-view-button',
  QUOTE_ACCEPT_BUTTON: 'quote-accept-button',
  QUOTE_REJECT_BUTTON: 'quote-reject-button',
  QUOTE_REJECT_REASON_INPUT: 'quote-reject-reason-input',

  // =========================================================================
  // PROFILE & SETTINGS
  // =========================================================================
  PROFILE_SCREEN: 'profile-screen',
  PROFILE_AVATAR: 'profile-avatar',
  PROFILE_NAME: 'profile-name',
  PROFILE_EMAIL: 'profile-email',
  PROFILE_EDIT_BUTTON: 'profile-edit-button',
  PROFILE_LOGOUT_BUTTON: 'profile-logout-button',

  SETTINGS_NOTIFICATIONS: 'settings-notifications',
  SETTINGS_PRIVACY: 'settings-privacy',
  SETTINGS_SECURITY: 'settings-security',

  // =========================================================================
  // COMMON COMPONENTS
  // =========================================================================
  BUTTON: 'button',
  INPUT: 'input',
  LOADING_SPINNER: 'loading-spinner',
  ERROR_MESSAGE: 'error-message',
  EMPTY_STATE: 'empty-state',
  TOAST: 'toast',
  MODAL: 'modal',
  MODAL_CLOSE_BUTTON: 'modal-close-button',
  SKELETON: 'skeleton',
  CARD: 'card',
  BADGE: 'badge',
  FILTER_CHIP: 'filter-chip',
  OFFLINE_BANNER: 'offline-banner',
  ERROR_BOUNDARY_FALLBACK: 'error-boundary-fallback',
} as const;

// Type for test IDs
export type TestId = (typeof TEST_IDS)[keyof typeof TEST_IDS];

/**
 * Helper to generate test IDs with dynamic suffixes.
 *
 * @example
 * testId(TEST_IDS.EVENT_CARD, event.id) // "event-card-1"
 */
export function testId(base: string, suffix: string | number): string {
  return `${base}-${suffix}`;
}
