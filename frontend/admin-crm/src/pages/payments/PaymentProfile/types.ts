import type { PaymentStatus, UpdatePaymentData } from '@/types/payments';
import type { ActivityItem, QuickAction } from '@/components/common';

export interface PaymentProfileLogic {
  // Route params
  paymentId: number;

  // State
  tabValue: number;
  setTabValue: (value: number) => void;
  anchorEl: HTMLElement | null;
  setAnchorEl: (el: HTMLElement | null) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  refundDialogOpen: boolean;
  setRefundDialogOpen: (open: boolean) => void;
  refundAmount: string;
  setRefundAmount: (amount: string) => void;
  refundReason: string;
  setRefundReason: (reason: string) => void;

  // Data
  payment: Record<string, unknown> | null;
  isLoadingPayment: boolean;
  invoice: Record<string, unknown> | null;
  isLoadingInvoice: boolean;
  isUpdatingPayment: boolean;
  isProcessingPayment: boolean;
  isSendingReceipt: boolean;
  isDeletingPayment: boolean;
  isCreatingRefund: boolean;

  // Computed
  quickActions: QuickAction[];
  relatedEntities: unknown[];
  activityItems: ActivityItem[];
  daysRemaining: { text: string; color: string; severity: string };

  // Handlers
  handleMenuClose: () => void;
  handleProcessPayment: () => void;
  handleSendReceipt: () => void;
  handleEditPayment: () => void;
  handleDeletePayment: () => void;
  handleEdit: (data: UpdatePaymentData) => void;
  handleDelete: () => void;
  handleCreateRefund: () => void;
  handleOpenRefundDialog: () => void;
  refetchPayment: () => void;
  navigate: (path: string) => void;

  // Utils
  formatPaymentAmount: (amount: string | number, currency?: string) => string;
  getStatusColor: (
    status: PaymentStatus,
  ) => 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}
