// frontend/admin-crm/src/types/events.types.ts

export interface EventType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
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

export interface Event {
  id: number;
  client: number;
  client_name?: string;
  event_type: number | null;
  event_type_name?: string;
  workflow_template: number | null;
  workflow_template_name?: string;
  current_stage: number | null;
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
  workflow_progress?: WorkflowProgress;
  created_at: string;
  updated_at: string;
}

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
}

export interface UpdateEventTypeData extends Partial<CreateEventTypeData> {}

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
}

export interface UpdateEventData extends Partial<CreateEventData> {}

// Filter types
export interface EventTypeFilters {
  search?: string;
  is_active?: boolean;
}

export interface EventFilters {
  search?: string;
  event_type?: number;
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
}

// Paginated response interface
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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
  onSubmit: (data: CreateEventTypeData | UpdateEventTypeData) => void;
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