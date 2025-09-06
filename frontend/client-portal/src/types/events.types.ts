// frontend/client-portal/src/types/events.types.ts

// Workflow Stage interface matching backend ClientWorkflowStageSerializer
export interface WorkflowStage {
  id: number;
  name: string;
  stage: 'LEAD' | 'PRODUCTION' | 'POST_PRODUCTION';
  description: string;
}

// Event Task interface matching backend upcoming_tasks
export interface EventTask {
  id: number;
  title: string;
  due_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

// Event Timeline interface matching backend ClientEventTimelineSerializer
export interface EventTimeline {
  id: number;
  action_type: string;
  description: string;
  created_at: string;
  actor_name: string;
}

// Event File interface matching backend ClientEventFileSerializer
export interface EventFile {
  id: number;
  name: string;
  file_type: string;
  size: number;
  created_at: string;
  download_url: string;
}

// Recent update interface for event details
export interface RecentUpdate {
  id: number;
  action_type: string;
  description: string;
  created_at: string;
}

// Base Event interface matching backend ClientEventSerializer
export interface Event {
  id: number;
  name: string;
  event_type_name: string;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  start_date: string;
  end_date: string;
  current_stage_name: string;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  days_until_event?: number | null;
  // Contract information (optional for backward compatibility)
  contract_status?: 'DRAFT' | 'SENT' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'EXPIRED' | 'VOID' | 'AMENDED';
  has_contracts?: boolean;
  contracts_count?: number;
  pending_signature_required?: boolean;
  contract_expiry_days?: number | null;
}

// Detailed Event interface matching backend ClientEventDetailSerializer
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
  contract_signature_progress?: {
    total_required: number;
    signed_count: number;
    percentage: number;
  };
}

// Contract summary for events
export interface EventContractSummary {
  id: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'EXPIRED' | 'VOID' | 'AMENDED';
  template_name: string;
  can_client_sign: boolean;
  expires_at: string | null;
  signature_progress: {
    total_required: number;
    signed_count: number;
    percentage: number;
  };
  is_urgent?: boolean;
}

// Event filters for list queries
export interface EventFilters {
  status?: string;
  upcoming_only?: boolean;
}

// Event preferences update interface
export interface EventPreferencesUpdate {
  preferences: Record<string, unknown>;
}

// Note interface for event notes (from notes domain)
export interface EventNote {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_private: boolean;
}

// API Response types
export interface EventsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}

// Event status type
export type EventStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Payment status type
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

// Task priority type
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Task status type
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Workflow stage type
export type WorkflowStageType = 'LEAD' | 'PRODUCTION' | 'POST_PRODUCTION';