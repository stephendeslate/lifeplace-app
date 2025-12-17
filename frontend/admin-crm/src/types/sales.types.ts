// frontend/admin-crm/src/types/sales.types.ts

export interface QuoteTemplate {
  id: number;
  name: string;
  introduction: string;
  event_type: number | null;
  event_type_name?: string;
  terms_and_conditions: string;
  is_active: boolean;
  default_validity_days: number;
  has_multiple_options: boolean;
  default_tax_rate: number | null;
  workflow_template: number | null;
  products: QuoteTemplateProduct[];
  contract_templates: unknown[];
  questionnaires: unknown[];
  created_at: string;
  updated_at: string;
}

export interface QuoteTemplateProduct {
  id: number;
  template: number;
  product: number;
  product_details?: {
    id: number;
    name: string;
    type: string;
    base_price: string;
    currency: string;
  };
  quantity: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventQuote {
  id: number;
  event: number;
  event_details?: {
    id: number;
    name: string;
    client_name: string;
    client_email: string | null;
    start_date: string;
    status: string;
  };
  template: number | null;
  template_details?: QuoteTemplate;
  version: number;
  status: QuoteStatus;
  status_display: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  valid_until: string;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  notes: string;
  terms_and_conditions: string;
  client_message: string;
  signature_data: string;
  line_items: QuoteLineItem[];
  options: QuoteOption[];
  activities: QuoteActivity[];
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: number;
  quote: number;
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
  total: string;
  product: number | null;
  notes: string;
  // Enhanced pricing fields for excess hours
  item_type?: 'PACKAGE' | 'ADDON';
  base_unit_price?: string;
  excess_hours?: number | null;
  excess_hour_price?: string | null;
  excess_cost?: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteOption {
  id: number;
  quote: number;
  name: string;
  description: string;
  total_price: string;
  is_selected: boolean;
  items: QuoteOptionItem[];
  created_at: string;
  updated_at: string;
}

export interface QuoteOptionItem {
  id: number;
  option: number;
  description: string;
  quantity: number;
  unit_price: string;
  total: string;
  product: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteActivity {
  id: number;
  quote: number;
  action: QuoteAction;
  action_by: number | null;
  action_by_name?: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteReminder {
  id: number;
  quote: number;
  scheduled_date: string;
  is_sent: boolean;
  sent_at: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type QuoteAction = 'CREATED' | 'UPDATED' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REMINDER_SENT';

export const QUOTE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
] as const;

export const QUOTE_ACTIONS = [
  { value: 'CREATED', label: 'Created' },
  { value: 'UPDATED', label: 'Updated' },
  { value: 'SENT', label: 'Sent' },
  { value: 'VIEWED', label: 'Viewed by client' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REMINDER_SENT', label: 'Reminder sent' },
] as const;

// Create/Update types
export interface CreateQuoteTemplateData {
  name: string;
  introduction?: string;
  event_type?: number | null;
  terms_and_conditions?: string;
  is_active?: boolean;
  default_validity_days?: number;
  has_multiple_options?: boolean;
  default_tax_rate?: number | null;
  workflow_template?: number | null;
  products?: CreateQuoteTemplateProductData[];
  contract_templates?: number[];
  questionnaires?: number[];
}

export type UpdateQuoteTemplateData = Partial<CreateQuoteTemplateData>;

export interface CreateQuoteTemplateProductData {
  product: number;
  quantity?: number;
  is_required?: boolean;
}

export type UpdateQuoteTemplateProductData = Partial<CreateQuoteTemplateProductData>;

export interface CreateEventQuoteData {
  event: number;
  template?: number | null;
  valid_until: string;
  notes?: string;
  terms_and_conditions?: string;
  client_message?: string;
  line_items?: CreateQuoteLineItemData[];
}

export interface UpdateEventQuoteData {
  status?: QuoteStatus;
  valid_until?: string;
  notes?: string;
  terms_and_conditions?: string;
  client_message?: string;
  rejection_reason?: string;
  line_items?: Array<{
    id?: number;
    description: string;
    quantity: number;
    unit_price: string;
    product_id?: number | null;
  }>;
}

export interface CreateQuoteLineItemData {
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate?: string;
  total?: string;
  product?: number | null;
  notes?: string;
}

export type UpdateQuoteLineItemData = Partial<CreateQuoteLineItemData>;

export interface CreateQuoteOptionData {
  quote: number;
  name: string;
  description?: string;
  items: CreateQuoteOptionItemData[];
}

export interface CreateQuoteOptionItemData {
  description: string;
  quantity: number;
  unit_price: string;
  total?: string;
  product?: number | null;
}

// Filter types
export interface QuoteTemplateFilters {
  search?: string;
  event_type?: number;
  is_active?: boolean;
}

export interface EventQuoteFilters {
  search?: string;
  event_id?: number;
  status?: QuoteStatus;
  template?: number;
}

export interface QuoteLineItemFilters {
  quote?: number;
}

// Form data types
export interface QuoteTemplateFormData {
  name: string;
  introduction: string;
  event_type: string;
  terms_and_conditions: string;
  is_active: boolean;
  default_validity_days: string;
  has_multiple_options: boolean;
  default_tax_rate: string;
  workflow_template: string;
  products: QuoteTemplateProductFormData[];
}

export interface QuoteTemplateProductFormData {
  product: string;
  quantity: string;
  is_required: boolean;
}

export interface EventQuoteFormData {
  event: string;
  template: string;
  valid_until: string;
  notes: string;
  terms_and_conditions: string;
  client_message: string;
  line_items: QuoteLineItemFormData[];
}

export interface QuoteLineItemFormData {
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  total: string;
  product: string;
  notes: string;
}

export interface QuoteOptionFormData {
  name: string;
  description: string;
  items: QuoteOptionItemFormData[];
}

export interface QuoteOptionItemFormData {
  description: string;
  quantity: string;
  unit_price: string;
  total: string;
  product: string;
}

// Component prop types
export interface QuoteTemplateTableProps {
  templates: QuoteTemplate[];
  isLoading: boolean;
  onEdit: (template: QuoteTemplate) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (template: QuoteTemplate) => void;
  isDeleting: boolean;
}

export interface QuoteTemplateFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingTemplate?: QuoteTemplate | null;
  onSubmit: (data: CreateQuoteTemplateData | UpdateQuoteTemplateData) => void;
  isLoading: boolean;
}

export interface EventQuoteTableProps {
  quotes: EventQuote[];
  isLoading: boolean;
  onEdit: (quote: EventQuote) => void;
  onView: (quote: EventQuote) => void;
  onDelete: (id: number) => void;
  onSend?: (quote: EventQuote) => void;
  onAccept?: (quote: EventQuote) => void;
  onReject?: (quote: EventQuote) => void;
  onDuplicate?: (quote: EventQuote) => void;
  isDeleting: boolean;
}

export interface QuoteLineItemTableProps {
  lineItems: QuoteLineItem[];
  isLoading: boolean;
  onEdit: (lineItem: QuoteLineItem) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface QuotePreviewProps {
  quote: EventQuote;
  compact?: boolean;
}

export interface QuoteSigningData {
  signature_data: string;
  notes?: string;
}