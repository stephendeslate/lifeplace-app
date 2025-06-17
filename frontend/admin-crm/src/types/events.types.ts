// frontend/admin-crm/src/types/events.types.ts

export interface EventType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  client: number;
  client_name?: string;
  event_type: number | null;
  event_type_name?: string;
  status: EventStatus;
  name: string;
  start_date: string;
  end_date: string | null;
  venue: string;
  lead_source: string;
  total_price: string | null;
  created_at: string;
  updated_at: string;
}

export type EventStatus = 'LEAD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export const EVENT_STATUSES = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
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
  status?: EventStatus;
  name?: string;
  start_date: string;
  end_date?: string | null;
  venue?: string;
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
  status: EventStatus;
  name: string;
  start_date: string;
  end_date: string;
  venue: string;
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