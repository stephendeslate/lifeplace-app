/**
 * Privacy & Consent Types
 *
 * Type definitions for DPA compliance features matching backend models.
 * Reference: CONSENT_MANAGEMENT_UI.md, DATA_SUBJECT_RIGHTS_API.md
 */

// =============================================================================
// CONSENT TYPES
// =============================================================================

/**
 * Consent type codes matching backend ConsentRecord.CONSENT_TYPE_CHOICES
 */
export type ConsentType =
  | 'MARKETING_EMAIL'
  | 'MARKETING_SMS'
  | 'MARKETING_PUSH'
  | 'ANALYTICS'
  | 'THIRD_PARTY_SHARING'
  | 'SENSITIVE_DATA'
  | 'PRIVACY_POLICY'
  | 'TERMS_OF_SERVICE';

/**
 * Consent actions matching backend ConsentRecord.ACTION_CHOICES
 */
export type ConsentAction = 'GRANT' | 'WITHDRAW' | 'UPDATE';

/**
 * Consent sources matching backend ConsentRecord.SOURCE_CHOICES
 */
export type ConsentSource =
  | 'REGISTRATION'
  | 'SETTINGS'
  | 'PRIVACY_DASHBOARD'
  | 'API'
  | 'ADMIN';

/**
 * Individual consent record from backend (audit trail)
 */
export interface ConsentRecord {
  id: string;
  consent_type: ConsentType;
  action: ConsentAction;
  consent_text: string;
  privacy_policy_version: string;
  source: ConsentSource;
  ip_address: string | null;
  user_agent: string;
  device_type: 'ios' | 'android' | 'web' | '';
  created_at: string;
}

/**
 * Consent status for UI display (derived from most recent ConsentRecord)
 */
export interface ConsentStatus {
  consent_type: ConsentType;
  purpose: string;
  status: 'granted' | 'not_granted';
  granted_at: string | null;
  can_withdraw: boolean;
}

/**
 * Response from GET /api/users/me/consents/
 */
export interface ConsentsResponse {
  consents: ConsentStatus[];
}

/**
 * Response from POST /api/users/me/consents/{type}/grant/
 */
export interface ConsentGrantResponse {
  status: 'granted';
  consent_type: ConsentType;
  granted_at: string;
}

/**
 * Response from POST /api/users/me/consents/{type}/withdraw/
 */
export interface ConsentWithdrawResponse {
  status: 'withdrawn';
  consent_type: ConsentType;
  withdrawn_at: string;
  effective_immediately: boolean;
}

/**
 * Paginated consent history response
 */
export interface ConsentHistoryResponse {
  results: ConsentRecord[];
  count: number;
  next: string | null;
  previous: string | null;
}

// =============================================================================
// PRIVACY REQUEST TYPES
// =============================================================================

/**
 * Privacy request types matching backend PrivacyRequest.REQUEST_TYPES
 */
export type PrivacyRequestType =
  | 'ACCESS'
  | 'EXPORT'
  | 'DELETION'
  | 'CORRECTION'
  | 'OBJECTION';

/**
 * Privacy request status matching backend
 */
export type PrivacyRequestStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

/**
 * Privacy request item
 */
export interface PrivacyRequest {
  id: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  submitted_at: string;
  completed_at: string | null;
  estimated_completion?: string;
  download_url?: string;
}

/**
 * Response from GET /api/users/me/privacy-requests/
 */
export interface PrivacyRequestsResponse {
  requests: PrivacyRequest[];
}

// =============================================================================
// DATA ACCESS TYPES
// =============================================================================

/**
 * Response from GET /api/users/me/data/
 */
export interface DataAccessResponse {
  request_id: string;
  generated_at: string;
  data_subject: {
    id: number;
    email: string;
  };
  personal_data: {
    account: {
      email: string;
      first_name: string;
      last_name: string;
      date_joined: string;
      last_login: string;
    };
    profile: {
      phone?: string;
      company?: string;
      timezone?: string;
    };
    events: Array<{
      id: number;
      name: string;
      status: string;
      start_date: string;
      venue?: string;
    }>;
    contracts: Array<{
      id: number;
      event_id: number;
      status: string;
      signed_at: string | null;
    }>;
    payments: Array<{
      id: number;
      amount: string;
      currency: string;
      status: string;
      paid_at: string | null;
    }>;
    notification_preferences: Record<string, boolean>;
    devices: Array<{
      device_type: string;
      device_name: string;
      registered_at: string;
      last_used: string;
    }>;
  };
  processing_purposes: Record<string, string>;
  data_retention: Record<string, string>;
  third_party_sharing: Array<{
    recipient: string;
    purpose: string;
    data_shared: string[];
  }>;
}

// =============================================================================
// DATA EXPORT TYPES
// =============================================================================

/**
 * Request for async data export
 */
export interface DataExportRequest {
  format: 'json' | 'csv';
}

/**
 * Response from POST /api/users/me/export/request/
 */
export interface DataExportRequestResponse {
  request_id: string;
  message: string;
  estimated_completion: string;
}

// =============================================================================
// DATA CORRECTION TYPES
// =============================================================================

/**
 * Request body for PATCH /api/users/me/correct/
 */
export interface DataCorrectionRequest {
  corrections: Array<{
    field: string;
    current_value: string;
    corrected_value: string;
    reason?: string;
  }>;
}

/**
 * Response from PATCH /api/users/me/correct/
 */
export interface DataCorrectionResponse {
  status: string;
  corrections_applied: Array<{
    field: string;
    old_value: string;
    new_value: string;
    applied_at: string;
  }>;
  corrections_pending: Array<{
    field: string;
    reason: string;
  }>;
}

// =============================================================================
// PROCESSING OBJECTION TYPES
// =============================================================================

/**
 * Objection types
 */
export type ObjectionType = 'marketing' | 'profiling' | 'analytics' | 'all_non_essential';

/**
 * Request body for POST /api/users/me/object/
 */
export interface ProcessingObjectionRequest {
  objection_type: ObjectionType;
  reason?: string;
}

/**
 * Response from POST /api/users/me/object/
 */
export interface ProcessingObjectionResponse {
  status: string;
  objection_id: string;
  changes_applied: Record<string, boolean>;
  cannot_object: Array<{
    processing: string;
    reason: string;
  }>;
}

// =============================================================================
// ACCOUNT DELETION TYPES
// =============================================================================

/**
 * Request body for DELETE /api/users/me/
 */
export interface AccountDeletionRequest {
  confirmation: string; // Must be "DELETE MY ACCOUNT"
  reason?: string;
  password: string;
}

/**
 * Successful deletion response
 */
export interface AccountDeletionSuccessResponse {
  status: 'processing';
  request_id: string;
  message: string;
  actions: {
    deleted: string[];
    anonymized: string[];
    retained: Array<{
      data: string;
      reason: string;
      retention_until: string;
    }>;
  };
  appeal_contact: string;
}

/**
 * Blocked deletion response
 */
export interface AccountDeletionBlockedResponse {
  status: 'blocked';
  message: string;
  blocking_reasons: Array<{
    type: string;
    description: string;
    resolution: string;
  }>;
}

export type AccountDeletionResponse =
  | AccountDeletionSuccessResponse
  | AccountDeletionBlockedResponse;

// =============================================================================
// SESSION TYPES
// =============================================================================

/**
 * Active session item
 */
export interface Session {
  id: string;
  device: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
}

/**
 * Response from GET /api/users/sessions/
 */
export type SessionsResponse = Session[];

// =============================================================================
// PROFILE TYPES
// =============================================================================

/**
 * Request body for updating user profile
 */
export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
}

/**
 * Request body for changing password
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * Response from password change
 */
export interface ChangePasswordResponse {
  detail: string;
}

// =============================================================================
// UI HELPER TYPES
// =============================================================================

/**
 * Consent toggle item for display
 */
export interface ConsentToggleItem {
  type: ConsentType;
  label: string;
  description: string;
  isGranted: boolean;
  lastUpdated: string | null;
  canWithdraw: boolean;
}

/**
 * Deletion flow step
 */
export type DeletionStep = 'warning' | 'verification' | 'confirmation';

/**
 * Verification method for account deletion
 */
export type VerificationMethod = 'password' | 'email_code';
