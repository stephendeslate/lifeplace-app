// frontend/admin-crm/src/types/contracts.types.ts

export interface ContractTemplate {
  id: number;
  name: string;
  description: string;
  event_type: number | null;
  event_type_name?: string;
  content: string;
  variables: string[];
  requires_signature: boolean;
  sections: unknown[];
  signature_requirements: string[];
  requires_witness: boolean;
  requires_company_signature: boolean;
  allows_amendments: boolean;
  amendment_requires_signature: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventContract {
  id: number;
  event: number;
  event_details?: {
    id: number;
    name: string;
    client_name: string;
    start_date: string;
    status: string;
  };
  template: number;
  template_name: string;
  status: ContractStatus;
  status_display: string;
  content: string;
  sent_at: string | null;
  fully_signed_at: string | null;
  valid_until: string | null;
  contract_value: string | null;
  payment_schedule_reference: string;
  currency: string;
  is_amendment: boolean;
  original_contract: number | null;
  amendment_number: number;
  signature_count: number;
  is_fully_signed: boolean;
  contract_type: string;
  missing_signatures: string[];
  signature_progress: {
    total_required: number;
    signed_count: number;
    percentage: number;
    required_roles: string[];
    signed_roles: string[];
    missing_roles: string[];
  };
  signatures: ContractSignature[];
  amendment_requests: ContractAmendment[];
  documents: ContractDocument[];
  notes: ContractNote[];
  created_at: string;
  updated_at: string;
}

export interface ContractSignature {
  id: number;
  contract: number;
  signer: number;
  signer_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  role: SignatureRole;
  role_display: string;
  signature_data: string;
  signed_at: string;
  signer_name: string;
  signer_title: string;
  signer_email: string;
  is_verified: boolean;
  verification_method: string;
  created_at: string;
  updated_at: string;
}

export interface ContractAmendment {
  id: number;
  original_contract: number;
  amendment_contract: number | null;
  amendment_reason: string;
  changes_description: string;
  section_changes: Record<string, unknown>;
  status: AmendmentStatus;
  status_display: string;
  original_value: string | null;
  new_value: string | null;
  value_change: string | null;
  requested_by: number;
  requested_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  requested_at: string;
  reviewed_by: number | null;
  reviewed_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  reviewed_at: string | null;
  review_notes: string;
  requires_new_signatures: boolean;
  signature_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractDocument {
  id: number;
  contract: number;
  name: string;
  description: string;
  document_type: DocumentType;
  document_type_display: string;
  file: string;
  version: number;
  is_active: boolean;
  uploaded_by: number;
  uploaded_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ContractNote {
  id: number;
  contract: number;
  note: string;
  is_internal: boolean;
  category: NoteCategory;
  category_display: string;
  created_by: number;
  created_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
}

export type ContractStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'EXPIRED' | 'VOID' | 'AMENDED';
export type SignatureRole = 'CLIENT' | 'WITNESS' | 'COMPANY_REP' | 'GUARDIAN' | 'PARTNER' | 'OTHER';
export type AmendmentStatus = 'REQUESTED' | 'DRAFT' | 'SENT_FOR_REVIEW' | 'APPROVED' | 'SIGNED' | 'REJECTED' | 'CANCELLED';
export type DocumentType = 'ATTACHMENT' | 'ADDENDUM' | 'SCHEDULE' | 'TERMS' | 'WAIVER' | 'OTHER';
export type NoteCategory = 'GENERAL' | 'LEGAL' | 'NEGOTIATION' | 'AMENDMENT' | 'ISSUE' | 'REMINDER';

export const CONTRACT_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PARTIALLY_SIGNED', label: 'Partially Signed' },
  { value: 'SIGNED', label: 'Fully Signed' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'VOID', label: 'Void' },
  { value: 'AMENDED', label: 'Amended' },
] as const;

export const SIGNATURE_ROLES = [
  { value: 'CLIENT', label: 'Client' },
  { value: 'WITNESS', label: 'Witness' },
  { value: 'COMPANY_REP', label: 'Company Representative' },
  { value: 'GUARDIAN', label: 'Legal Guardian' },
  { value: 'PARTNER', label: 'Business Partner' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const AMENDMENT_STATUSES = [
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT_FOR_REVIEW', label: 'Sent for Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const DOCUMENT_TYPES = [
  { value: 'ATTACHMENT', label: 'Attachment' },
  { value: 'ADDENDUM', label: 'Addendum' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'TERMS', label: 'Terms and Conditions' },
  { value: 'WAIVER', label: 'Waiver' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const NOTE_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'AMENDMENT', label: 'Amendment' },
  { value: 'ISSUE', label: 'Issue' },
  { value: 'REMINDER', label: 'Reminder' },
] as const;

// Create/Update types
export interface CreateContractTemplateData {
  name: string;
  description?: string;
  event_type?: number | null;
  content: string;
  variables?: string[];
  requires_signature?: boolean;
  sections?: unknown[];
  signature_requirements?: string[];
  requires_witness?: boolean;
  requires_company_signature?: boolean;
  allows_amendments?: boolean;
  amendment_requires_signature?: boolean;
}

export type UpdateContractTemplateData = Partial<CreateContractTemplateData>;

export interface CreateEventContractData {
  event: number;
  template: number;
  content?: string;
  valid_until?: string;
  contract_value?: string;
  payment_schedule_reference?: string;
  currency?: string;
  context_data?: Record<string, unknown>;
  requires_signature?: boolean;
  signature_requirements?: string[];
}

export interface UpdateEventContractData {
  content?: string;
  status?: ContractStatus;
  valid_until?: string;
  contract_value?: string;
  payment_schedule_reference?: string;
  currency?: string;
}

export interface CreateContractSignatureData {
  contract: number;
  signer: number;
  role: SignatureRole;
  signature_data: string;
  signer_name: string;
  signer_title?: string;
  signer_email: string;
  verification_method?: string;
}

export interface CreateContractAmendmentData {
  original_contract: number;
  amendment_reason: string;
  changes_description: string;
  section_changes?: Record<string, unknown>;
  new_value?: string;
  requires_new_signatures?: boolean;
  signature_deadline?: string;
}

export interface CreateContractDocumentData {
  contract: number;
  name: string;
  description?: string;
  document_type: DocumentType;
  file: File;
}

export interface CreateContractNoteData {
  contract: number;
  note: string;
  is_internal?: boolean;
  category?: NoteCategory;
}

// Filter types
export interface ContractTemplateFilters {
  search?: string;
  event_type?: number;
  is_active?: boolean;
}

export interface EventContractFilters {
  search?: string;
  event_id?: number;
  status?: ContractStatus;
  template?: number;
}

export interface ContractSignatureFilters {
  contract?: number;
  role?: SignatureRole;
}

export interface ContractAmendmentFilters {
  contract?: number;
  status?: AmendmentStatus;
}

// Form data types
export interface ContractTemplateFormData {
  name: string;
  description: string;
  event_type: string;
  content: string;
  variables: string[];
  requires_signature: boolean;
  sections: unknown[];
  signature_requirements: string[];
  requires_witness: boolean;
  requires_company_signature: boolean;
  allows_amendments: boolean;
  amendment_requires_signature: boolean;
}

export interface EventContractFormData {
  event: string;
  template: string;
  content: string;
  valid_until: string;
  contract_value: string;
  payment_schedule_reference: string;
  currency: string;
}

export interface ContractSignatureFormData {
  contract: string;
  signer: string;
  role: SignatureRole;
  signature_data: string;
  signer_name: string;
  signer_title: string;
  signer_email: string;
  verification_method: string;
}

// Component prop types
export interface ContractTemplateTableProps {
  templates: ContractTemplate[];
  isLoading: boolean;
  onEdit: (template: ContractTemplate) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (template: ContractTemplate) => void;
  isDeleting: boolean;
}

export interface ContractTemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingTemplate?: ContractTemplate | null;
  onSubmit: (data: CreateContractTemplateData | UpdateContractTemplateData) => void;
  isLoading: boolean;
}

export interface EventContractTableProps {
  contracts: EventContract[];
  isLoading: boolean;
  onEdit: (contract: EventContract) => void;
  onView: (contract: EventContract) => void;
  onDelete: (id: number) => void;
  onSign?: (contract: EventContract) => void;
  isDeleting: boolean;
}

export interface ContractSigningData {
  signature_data: string;
  role?: SignatureRole;
  signer_name: string;
  signer_title?: string;
  signer_email: string;
  verification_method?: string;
  witness_name?: string;
  witness_signature?: string;
}