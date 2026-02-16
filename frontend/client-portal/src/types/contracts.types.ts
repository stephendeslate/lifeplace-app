// frontend/client-portal/src/types/contracts.types.ts

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

export interface EventSummary {
  id: string;
  title: string;
  date: string;
  status: string;
  client?: User;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  event_type?: {
    id: string;
    name: string;
  };
  requires_signature?: boolean;
  signature_requirements?: SignatureRole[];
  requires_witness?: boolean;
  requires_company_signature?: boolean;
  allows_amendments?: boolean;
  amendment_requires_signature?: boolean;
}

export type SignatureRole =
  | "CLIENT"
  | "WITNESS"
  | "COMPANY_REP"
  | "GUARDIAN"
  | "PARTNER"
  | "OTHER";

export type ContractStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_SIGNED"
  | "SIGNED"
  | "EXPIRED"
  | "VOID"
  | "AMENDED";

export interface ContractSignature {
  id: string;
  contract: string;
  signer: User;
  role: SignatureRole;
  role_display: string;
  signature_data: string;
  signed_at: string;
  signer_name: string;
  signer_title: string;
  signer_email: string;
  is_verified: boolean;
  verification_method: string;
  device_fingerprint?: string;
  signature_metadata?: Record<string, unknown>;
  signature_confidence_score?: number;
  legal_disclosure_accepted: boolean;
  electronic_consent_timestamp?: string;
  signature_intent_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

// API Response structure (flattened)
export interface ContractApiResponse {
  id: number;
  event:
    | number
    | {
        id: number;
        name: string;
        client_name?: string;
        status: string;
        start_date?: string;
        end_date?: string;
      };
  template: number;
  template_name: string;
  status: ContractStatus;
  content?: string;
  sent_at: string | null;
  fully_signed_at: string | null;
  valid_until: string | null;
  contract_value: string | null;
  payment_schedule_reference?: string;
  currency: string;
  is_amendment: boolean;
  original_contract: number | null;
  amendment_number: number;
  signature_count: number;
  is_fully_signed: boolean;
  contract_type: string;
  created_at: string;
  updated_at: string;
}

// Frontend Contract interface (nested structure)
export interface Contract {
  id: string;
  event: EventSummary;
  template: ContractTemplate;
  status: ContractStatus;
  content: string;
  sent_at: string | null;
  fully_signed_at: string | null;
  valid_until: string | null;
  contract_value: string | null;
  payment_schedule_reference: string;
  currency: string;
  is_amendment: boolean;
  original_contract: string | null;
  amendment_number: number;
  signatures: ContractSignature[];
  is_fully_signed?: boolean;
  is_expired?: boolean;
  is_expiring_soon?: boolean;
  days_until_expiry?: number | null;
  expiry_urgency?: "CRITICAL" | "HIGH" | "NORMAL" | null;
  sign_disabled_reason?: string | null;
  missing_signatures?: SignatureRole[];
  signature_progress?: SignatureProgress;
  can_client_sign?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignatureProgress {
  total_required: number;
  signed_count: number;
  percentage: number;
  required_roles: SignatureRole[];
  signed_roles: SignatureRole[];
  missing_roles: SignatureRole[];
}

export interface DetailedContractStatus {
  contract_id: string;
  status: ContractStatus;
  is_fully_signed: boolean;
  signature_progress: {
    total_required: number;
    completed: number;
    percentage: number;
  };
  signatures: Record<
    string,
    {
      required: boolean;
      signed: boolean;
      signed_at: string | null;
      signer_name: string | null;
      is_current_user: boolean;
    }
  >;
  can_client_sign: boolean;
  sign_disabled_reason?: string | null;
  expires_at: string | null;
}

export interface SignatureSubmission {
  signature_data: string;
  signer_name: string;
  signer_title?: string;
  signer_email: string;
  verification_method?: string;
  device_fingerprint?: string;
  signature_timestamp?: string;
  screen_resolution?: string;
  legal_disclosure_accepted?: boolean;
  signature_intent_confirmed?: boolean;
}

export interface PendingContractsResponse {
  count: number;
  contracts: Contract[];
}

export interface SigningSession {
  contract: Contract;
  currentStep: SigningStep;
  signatureData: string | null;
  metadata: SignatureMetadata;
  errors: string[];
  isSubmitting: boolean;
}

export type SigningStep =
  | "review_contract"
  | "legal_disclosure"
  | "signature_capture"
  | "confirmation"
  | "completed";

export interface SignatureMetadata {
  timestamp: string;
  userAgent: string;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  language: string;
  platform: string;
  deviceFingerprint?: string;
  ipAddress?: string;
}

// Signature pad configuration
export interface SignaturePadConfig {
  width: number;
  height: number;
  backgroundColor: string;
  penColor: string;
  minWidth: number;
  maxWidth: number;
  throttle: number;
  minPointDistance: number;
}

// Default signature pad configuration
export const DEFAULT_SIGNATURE_CONFIG: SignaturePadConfig = {
  width: 600,
  height: 300,
  backgroundColor: "#ffffff",
  penColor: "#000000",
  minWidth: 1,
  maxWidth: 3,
  throttle: 16,
  minPointDistance: 5,
};

// Contract filtering and sorting
export interface ContractFilters {
  status?: ContractStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
  eventId?: string;
}

export type ContractSortField =
  | "created_at"
  | "updated_at"
  | "status"
  | "event_date"
  | "contract_value";
export type SortDirection = "asc" | "desc";

export interface ContractSort {
  field: ContractSortField;
  direction: SortDirection;
}

// Error types
export interface ContractError {
  code: string;
  message: string;
  field?: string;
}

export interface SignatureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidenceScore?: number;
}

// Contract History and Activity types
export type ContractActivityType =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "SIGNED"
  | "FULLY_SIGNED"
  | "AMENDED"
  | "VOIDED"
  | "EXPIRED"
  | "DOCUMENT_ADDED"
  | "NOTE_ADDED"
  | "VALUE_CHANGED";

export interface ContractActivity {
  id: string;
  contract_id: string;
  activity_type: ContractActivityType;
  title: string;
  description: string;
  performed_by?: User;
  performed_at: string;
  metadata?: Record<string, unknown>;
  old_value?: string | number;
  new_value?: string | number;
}

export interface ContractAmendment {
  id: string;
  original_contract: string;
  amendment_contract?: Contract;
  amendment_reason: string;
  changes_description: string;
  section_changes: Record<string, unknown>;
  status:
    | "REQUESTED"
    | "DRAFT"
    | "SENT_FOR_REVIEW"
    | "APPROVED"
    | "SIGNED"
    | "REJECTED"
    | "CANCELLED";
  original_value?: string;
  new_value?: string;
  value_change?: string;
  requested_by?: User;
  requested_at: string;
  reviewed_by?: User;
  reviewed_at?: string;
  review_notes?: string;
  requires_new_signatures: boolean;
  signature_deadline?: string;
  created_at: string;
  updated_at: string;
}

export type ContractDocumentType =
  | "ATTACHMENT"
  | "ADDENDUM"
  | "SCHEDULE"
  | "TERMS"
  | "WAIVER"
  | "OTHER";

export interface ContractDocument {
  id: string;
  contract: string;
  name: string;
  description: string;
  document_type: ContractDocumentType;
  document_type_display: string;
  file: string;
  version: number;
  is_active: boolean;
  uploaded_by?: User;
  created_at: string;
  updated_at: string;
}

export interface ContractVersion {
  id: string;
  contract_id: string;
  version_number: number;
  content: string;
  created_at: string;
  created_by?: User;
  changes_summary: string;
  is_current: boolean;
}

export interface ContractHistory {
  contract: Contract;
  versions: ContractVersion[];
  amendments: ContractAmendment[];
  activities: ContractActivity[];
  value_changes: Array<{
    date: string;
    old_value: string | null;
    new_value: string | null;
    reason: string;
    changed_by?: User;
  }>;
}

export interface ContractTimelineEvent {
  id: string;
  type: ContractActivityType;
  title: string;
  description: string;
  date: string;
  user?: User;
  status?: "completed" | "pending" | "failed";
  metadata?: Record<string, unknown>;
}

// Contract history filters
export interface ContractHistoryFilters {
  activity_type?: ContractActivityType[];
  date_from?: string;
  date_to?: string;
  user_id?: string;
  include_amendments?: boolean;
  include_signatures?: boolean;
  include_documents?: boolean;
}
