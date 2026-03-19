// frontend/admin-crm/src/types/payments/operations.types.ts
// CRUD types, filter types, form data types, component props

import type {
  Payment,
  PaymentPlan,
  PaymentTransaction,
  PaymentNotification,
  Refund,
  Invoice,
  PaymentStatus,
  PaymentFrequency,
  InstallmentStatus,
  TransactionStatus,
  InvoiceStatus,
  NotificationType,
  RefundStatus,
} from './core.types';

// Create/Update Data Types
export interface CreatePaymentData {
  event: number;
  amount: string;
  currency?: string;
  status?: PaymentStatus;
  due_date: string;
  payment_method?: number;
  description?: string;
  notes?: string;
  reference_number?: string;
  is_manual?: boolean;
  quote?: number;
  invoice?: number;
  installment?: number;
}

export interface UpdatePaymentData {
  amount?: string;
  status?: PaymentStatus;
  due_date?: string;
  payment_method?: number;
  description?: string;
  notes?: string;
  reference_number?: string;
}

export interface ProcessPaymentData {
  payment_method: number;
  is_test?: boolean;
}

export interface CreatePaymentPlanData {
  event: number;
  total_amount: string;
  down_payment_amount: string;
  currency?: string;
  down_payment_due_date: string;
  number_of_installments: number;
  frequency: PaymentFrequency;
  notes?: string;
  quote?: number;
}

export interface UpdatePaymentPlanData {
  notes?: string;
}

export interface CreatePaymentInstallmentData {
  payment_method?: number;
  process_now?: boolean;
}

export interface CreateInvoiceData {
  event: number;
  invoice_id?: string;
  issue_date?: string;
  due_date?: string;
  status?: InvoiceStatus;
  notes?: string;
  payment_terms?: string;
  quote?: number;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: string;
    tax_rate?: string;
    total?: string;
    product?: number;
  }>;
}

export interface UpdateInvoiceData {
  status?: InvoiceStatus;
  notes?: string;
  payment_terms?: string;
  due_date?: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: string;
    tax_rate?: string;
    total?: string;
    product?: number;
  }>;
}

export interface CreateRefundData {
  payment: number;
  amount: string;
  currency?: string;
  reason: string;
}

// Filter Types
export interface PaymentFilters {
  event?: number;
  status?: PaymentStatus;
  start_date?: string;
  end_date?: string;
  search?: string;
  payment_method?: number;
  is_manual?: boolean;
  amount_min?: string;
  amount_max?: string;
}

export interface PaymentPlanFilters {
  event?: number;
}

export interface PaymentInstallmentFilters {
  payment_plan?: number;
  status?: InstallmentStatus;
  due_date_start?: string;
  due_date_end?: string;
}

export interface InvoiceFilters {
  event_id?: number;
  client_id?: number;
  status?: InvoiceStatus;
  search?: string;
}

export interface PaymentTransactionFilters {
  payment?: number;
  gateway?: number;
  status?: TransactionStatus;
}

export interface PaymentNotificationFilters {
  payment?: number;
  notification_type?: NotificationType;
  is_successful?: boolean;
}

export interface RefundFilters {
  payment?: number;
  status?: RefundStatus;
}

// Form Data Types
export interface PaymentFormData {
  event: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  due_date: string;
  payment_method: string;
  description: string;
  notes: string;
  reference_number: string;
  is_manual: boolean;
}

export interface PaymentPlanFormData {
  event: string;
  total_amount: string;
  down_payment_amount: string;
  currency: string;
  down_payment_due_date: string;
  number_of_installments: string;
  frequency: PaymentFrequency;
  notes: string;
}

export interface InvoiceFormData {
  event: string;
  invoice_id: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  notes: string;
  payment_terms: string;
  line_items: Array<{
    description: string;
    quantity: string;
    unit_price: string;
    tax_rate: string;
    total: string;
    product: string;
  }>;
}

export interface RefundFormData {
  amount: string;
  reason: string;
}

// Component Props Types
export interface PaymentTableProps {
  payments: Payment[];
  isLoading: boolean;
  onEdit: (payment: Payment) => void;
  onView: (payment: Payment) => void;
  onDelete: (id: number) => void;
  onProcess?: (payment: Payment) => void;
  onSendReceipt?: (payment: Payment) => void;
  isDeleting: boolean;
}

export interface PaymentFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingPayment?: Payment | null;
  onSubmit: (data: CreatePaymentData | UpdatePaymentData) => void;
  isLoading: boolean;
}

export interface PaymentPlanTableProps {
  paymentPlans: PaymentPlan[];
  isLoading: boolean;
  onEdit: (plan: PaymentPlan) => void;
  onView: (plan: PaymentPlan) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface PaymentPlanFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingPlan?: PaymentPlan | null;
  onSubmit: (data: CreatePaymentPlanData | UpdatePaymentPlanData) => void;
  isLoading: boolean;
}

export interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onEdit: (invoice: Invoice) => void;
  onView: (invoice: Invoice) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface InvoiceFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingInvoice?: Invoice | null;
  onSubmit: (data: CreateInvoiceData | UpdateInvoiceData) => void;
  isLoading: boolean;
}

export interface PaymentScheduleVisualizerProps {
  paymentPlan: PaymentPlan;
  compact?: boolean;
}

export interface PaymentHistoryProps {
  paymentId: number;
  transactions: PaymentTransaction[];
  notifications: PaymentNotification[];
  refunds: Refund[];
  isLoading: boolean;
}

export interface RefundFormDialogProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
  onSubmit: (data: CreateRefundData) => void;
  isLoading: boolean;
}

export interface PaymentStatusChipProps {
  status: PaymentStatus;
  size?: 'small' | 'medium';
}

export interface InvoiceStatusChipProps {
  status: InvoiceStatus;
  size?: 'small' | 'medium';
}

export interface InstallmentStatusChipProps {
  status: InstallmentStatus;
  size?: 'small' | 'medium';
}

export interface TransactionStatusChipProps {
  status: TransactionStatus;
  size?: 'small' | 'medium';
}

export interface RefundStatusChipProps {
  status: RefundStatus;
  size?: 'small' | 'medium';
}

export interface PaymentGatewayFormData {
  name: string;
  code: string;
  is_active: boolean;
  config: Record<string, unknown>;
  description: string;
}

export interface TaxRateFormData {
  name: string;
  rate: string;
  region: string;
  is_default: boolean;
}
