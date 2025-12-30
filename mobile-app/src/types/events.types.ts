/**
 * Events Types
 *
 * Type definitions for events domain matching backend ClientEventSerializer
 * and ClientEventDetailSerializer.
 */

// =============================================================================
// ENUMS / LITERALS
// =============================================================================

// Note: These match the Django backend Event.EVENT_STATUSES and PAYMENT_STATUS_CHOICES
export type EventStatus = 'LEAD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS' | 'DRAFT';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
export type CheckInStatus = 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';
export type WorkflowStageType = 'LEAD' | 'PRODUCTION' | 'POST_PRODUCTION';
export type ContractStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'EXPIRED' | 'VOID' | 'AMENDED';
export type CancelledReason = 'CLIENT_REQUEST' | 'PAYMENT_TIMEOUT' | 'DATE_TAKEN' | 'ADMIN';
export type FileCategory = 'CONTRACT' | 'QUOTE' | 'PAYMENT' | 'REQUIREMENTS' | 'PHOTO' | 'OTHER';

// =============================================================================
// WORKFLOW
// =============================================================================

export interface WorkflowStage {
  id: number;
  name: string;
  stage: WorkflowStageType;
  description: string;
}

// =============================================================================
// EVENT TASKS
// =============================================================================

export interface EventTask {
  id: number;
  title: string;
  description?: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  requires_client_input?: boolean;
  can_update?: boolean;
  completed_at?: string;
}

export interface TaskUpdate {
  status?: 'IN_PROGRESS' | 'COMPLETED';
  completion_notes?: string;
}

// =============================================================================
// EVENT TIMELINE
// =============================================================================

export interface EventTimeline {
  id: number;
  action_type: string;
  description: string;
  created_at: string;
  actor_name: string;
}

// =============================================================================
// EVENT FILES / DOCUMENTS
// =============================================================================

export interface EventFile {
  id: number;
  name: string;
  file_type: string;
  size: number;
  created_at: string;
  download_url: string;
  category?: FileCategory;
  description?: string;
}

export interface FileUpload {
  name: string;
  category: FileCategory;
  description?: string;
  file: File;
}

// =============================================================================
// EVENT NOTES
// =============================================================================

export interface EventNote {
  id: number;
  content: string;
  title?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_private: boolean;
  author_type?: 'CLIENT' | 'STAFF';
  author_name?: string;
  author_avatar?: string;
}

export interface CreateNoteInput {
  content: string;
  title?: string;
}

// =============================================================================
// EVENT QUESTIONNAIRES
// =============================================================================

export interface EventQuestionnaire {
  id: number;
  name: string;
  questionnaire_title: string;
  description?: string;
  submitted_at: string;
  status: 'PENDING' | 'SUBMITTED' | 'COMPLETED';
  is_complete: boolean;
  responses: Record<string, string | string[] | number | boolean>;
}

// =============================================================================
// EVENT FEEDBACK
// =============================================================================

export interface EventFeedback {
  id: number;
  overall_rating: number;
  categories: Record<string, number>;
  comments: string;
  testimonial: string;
  is_public: boolean;
  response: string;
  created_at: string;
  submitted_by_name: string;
  response_by_name: string;
  has_response: boolean;
}

export interface FeedbackSubmission {
  overall_rating: number;
  categories?: Record<string, number>;
  comments?: string;
  testimonial?: string;
  is_public?: boolean;
}

// =============================================================================
// CONTRACTS
// =============================================================================

export interface EventContractSummary {
  id: string;
  status: ContractStatus;
  template_name: string;
  can_client_sign: boolean;
  expires_at: string | null;
  signature_progress: SignatureProgress;
  is_urgent?: boolean;
}

export interface SignatureProgress {
  total_required: number;
  signed_count: number;
  percentage: number;
}

// =============================================================================
// RECENT UPDATES
// =============================================================================

export interface RecentUpdate {
  id: number;
  action_type: string;
  description: string;
  created_at: string;
}

// =============================================================================
// BASE EVENT
// =============================================================================

export interface Event {
  id: number;
  name: string;
  event_type_name: string;
  status: EventStatus;
  start_date: string;
  end_date: string;
  current_stage_name: string;
  payment_status: PaymentStatus;
  days_until_event?: number | null;
  // Contract information
  contract_status?: ContractStatus;
  has_contracts?: boolean;
  contracts_count?: number;
  pending_signature_required?: boolean;
  contract_expiry_days?: number | null;
  // Date blocking and rebooking
  date_blocked?: boolean;
  date_blocked_at?: string | null;
  downpayment_deadline?: string | null;
  cancelled_reason?: CancelledReason | null;
  cancelled_at?: string | null;
  can_rebook?: boolean;
  // Optional venue info
  venue_name?: string;
  venue_image_url?: string;
}

// =============================================================================
// DETAILED EVENT
// =============================================================================

export interface EventDetail extends Event {
  current_stage: WorkflowStage;
  total_price: number;
  preferences: Record<string, unknown>;
  upcoming_tasks: EventTask[];
  recent_updates: RecentUpdate[];
  accessible_documents_count: number;
  has_notes: boolean;
  // Detailed contract information
  contracts?: EventContractSummary[];
  contract_signature_progress?: SignatureProgress;
  // Check-in fields
  check_in_status: CheckInStatus;
  scheduled_check_in_time: string | null;
  actual_check_in_time: string | null;
  can_self_check_in: boolean;
  // Additional details
  start_time?: string;
  end_time?: string;
  guest_count?: number;
  num_participants?: number;
  description?: string;
}

// =============================================================================
// FILTERS & API
// =============================================================================

export interface EventFilters {
  status?: EventStatus;
  upcoming_only?: boolean;
  page?: number;
  page_size?: number;
}

export interface EventPreferencesUpdate {
  preferences: Record<string, unknown>;
}

export interface EventsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}
