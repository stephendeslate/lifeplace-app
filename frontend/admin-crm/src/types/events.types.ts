// frontend/admin-crm/src/types/events.types.ts

import type { Client } from './clients.types';
import type { WorkflowStage } from './workflows';

export interface EventType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  featured_image: string | null;
  gallery_images: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowProgress {
  current_stage: number;
  total_stages: number;
  current_stage_name: string;
  current_task_name: string;
  percentage: number;
  stage_names: string[];
}

export interface EventTask {
  id: number;
  workflow_stage: number;
  title: string;
  status: 'PENDING' | 'COMPLETED' | 'ACTIVE';
  completed_at: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  priority: string | null;
  due_date: string | null;
}

export type DateHoldStatus = 'NONE' | 'TEMPORARY_HOLD' | 'PERMANENT_BLOCK';
export type CheckInStatus = 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';
export type CancelledReason = 'CLIENT_REQUEST' | 'PAYMENT_TIMEOUT' | 'DATE_TAKEN' | 'ADMIN';

export interface Event {
  id: number;
  client: number | Client;
  client_name?: string;
  event_type: number | null;
  event_type_name?: string;
  workflow_template: number | null | { id: number };
  workflow_template_name?: string;
  current_stage: number | null | WorkflowStage;
  current_stage_name?: string;
  status: EventStatus;
  name: string;
  start_date: string;
  end_date: string | null;
  lead_source: string;
  last_contacted: string | null;
  total_price: string | null;
  payment_status: PaymentStatus;
  total_amount_due: string | null;
  total_amount_paid: string;
  workflow_progress?: number;
  tasks?: EventTask[];
  // New single source of truth pricing fields
  current_total_amount?: string | null;
  current_quote?: {
    id: number;
    version: number;
    status: string;
    total_amount: string;
    created_at: string | null;
    accepted_at: string | null;
  } | null;
  current_invoice?: {
    id: number;
    invoice_number: string;
    status: string;
    total_amount: string;
    created_at: string | null;
    due_date: string | null;
  } | null;
  // Date blocking fields
  date_blocked: boolean;
  date_blocked_at: string | null;
  // Date holding fields
  date_hold_status: DateHoldStatus;
  date_hold_expires_at: string | null;
  date_held_at: string | null;
  date_hold_extended_count: number;
  // Rescheduling tracking
  original_start_date: string | null;
  reschedule_count: number;
  last_rescheduled_at: string | null;
  // Check-in/out tracking
  check_in_status: CheckInStatus;
  scheduled_check_in_time: string | null;
  scheduled_checkout_time: string | null;
  actual_check_in_time: string | null;
  actual_checkout_time: string | null;
  checked_in_by: number | null;
  checked_in_by_name: string | null;
  checked_out_by: number | null;
  checked_out_by_name: string | null;
  check_in_notes: string;
  checkout_notes: string;
  // Late checkout
  late_checkout_fee_applied: boolean;
  late_checkout_fee_amount: string | null;
  // Cancellation
  cancelled_reason: CancelledReason | null;
  cancelled_at: string | null;
  can_rebook: boolean;
  // Guest count
  num_participants: number | null;
  // Preferences (includes inquiry data from contact form submissions)
  preferences?: EventPreferences;
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Inquiry data stored in preferences when event is created from contact form
export interface InquiryData {
  type: 'GENERAL' | 'EVENT_QUESTION' | 'PARTNERSHIP' | 'PRICING' | 'OTHER';
  message: string;
  phone?: string;
  submitted_at: string;
}

export interface EventPreferences {
  inquiry?: InquiryData;
  [key: string]: unknown;
}

export const DATE_HOLD_STATUSES = [
  { value: 'NONE', label: 'No Hold' },
  { value: 'TEMPORARY_HOLD', label: 'Temporary Hold' },
  { value: 'PERMANENT_BLOCK', label: 'Permanently Blocked' },
] as const;

export const CHECK_IN_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'CHECKED_OUT', label: 'Checked Out' },
  { value: 'NO_SHOW', label: 'No Show' },
] as const;

export type EventStatus = 'LEAD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export const EVENT_STATUSES = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
] as const;

// Create/Update types
export interface CreateEventTypeData {
  name: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export type UpdateEventTypeData = Partial<CreateEventTypeData>;

export interface CreateEventData {
  client: number;
  event_type?: number | null;
  workflow_template?: number | null;
  status?: EventStatus;
  name?: string;
  start_date: string;
  end_date?: string | null;
  lead_source?: string;
  total_price?: string | null;
  num_participants?: number | null;
  scheduled_check_in_time?: string | null;
  scheduled_checkout_time?: string | null;
}

export type UpdateEventData = Partial<CreateEventData>;

// Filter types
export interface EventTypeFilters {
  search?: string;
  is_active?: boolean;
}

export interface EventFilters {
  search?: string;
  event_type?: number;
  workflow_template?: number;
  status?: EventStatus;
  client?: number;
  start_date_from?: string;
  start_date_to?: string;
  payment_status?: PaymentStatus;
}

// Form data types
export interface EventTypeFormData {
  name: string;
  description: string;
  is_active: boolean;
  featured_image: File | string | null;
  gallery_images: (File | string)[];
}

export interface EventFormData {
  client: string;
  event_type: string;
  workflow_template: string;
  status: EventStatus;
  name: string;
  start_date: string;
  end_date: string;
  lead_source: string;
  total_price: string;
  num_participants: string;
  scheduled_check_in_time: string;
  scheduled_checkout_time: string;
}

// Component prop types
export interface EventTypeTableProps {
  eventTypes: EventType[];
  isLoading: boolean;
  onEdit: (eventType: EventType) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface EventTypeFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingEventType?: EventType | null;
  onSubmit: (data: CreateEventTypeData | UpdateEventTypeData, formData?: FormData) => void;
  isLoading: boolean;
}

export interface EventTableProps {
  events: Event[];
  isLoading: boolean;
  onEdit: (event: Event) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingEvent?: Event | null;
  onSubmit: (data: CreateEventData | UpdateEventData) => void;
  isLoading: boolean;
}

// File Categories
export const FILE_CATEGORIES = [
  { value: 'CONTRACT', label: 'Contract Document' },
  { value: 'QUOTE', label: 'Quote/Proposal' },
  { value: 'PAYMENT', label: 'Payment Document' },
  { value: 'REQUIREMENTS', label: 'Requirements Doc' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'OTHER', label: 'Other' },
] as const;

// File category type
export type FileCategory = 'CONTRACT' | 'QUOTE' | 'PAYMENT' | 'REQUIREMENTS' | 'PHOTO' | 'OTHER';

// Event File interface
export interface EventFile {
  id: number;
  event: number;
  category: FileCategory;
  file: string;
  file_url?: string;
  name: string;
  description: string;
  mime_type: string;
  size: number;
  uploaded_by: number | null;
  uploaded_by_name?: string | null;
  version: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Create/Update types for Event Files
export interface CreateEventFileData {
  event: number;
  category: FileCategory;
  name: string;
  description?: string;
  is_public?: boolean;
}

export interface UpdateEventFileData {
  name?: string;
  description?: string;
  category?: FileCategory;
  is_public?: boolean;
}
