import React from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Send as SendIcon } from '@mui/icons-material';
import { PaymentForm } from '@/components/payments/PaymentForm';

import type { Payment, UpdatePaymentData } from '@/types/payments';

interface PaymentDialogsProps {
  payment: Payment;

  // Menu
  anchorEl: HTMLElement | null;
  onMenuClose: () => void;
  onEditPayment: () => void;
  onDeletePayment: () => void;
  onSendReceipt: () => void;
  isSendingReceipt: boolean;

  // Edit dialog
  editDialogOpen: boolean;
  onCloseEditDialog: () => void;
  onEdit: (data: UpdatePaymentData) => void;
  isUpdatingPayment: boolean;

  // Delete dialog
  deleteDialogOpen: boolean;
  onCloseDeleteDialog: () => void;
  onDelete: () => void;
  isDeletingPayment: boolean;

  // Refund dialog
  refundDialogOpen: boolean;
  onCloseRefundDialog: () => void;
  refundAmount: string;
  onRefundAmountChange: (amount: string) => void;
  refundReason: string;
  onRefundReasonChange: (reason: string) => void;
  onCreateRefund: () => void;
  isCreatingRefund: boolean;
  formatPaymentAmount: (amount: string | number, currency?: string) => string;
}

export const PaymentDialogs: React.FC<PaymentDialogsProps> = ({
  payment,
  anchorEl,
  onMenuClose,
  onEditPayment,
  onDeletePayment,
  onSendReceipt,
  isSendingReceipt,
  editDialogOpen,
  onCloseEditDialog,
  onEdit,
  isUpdatingPayment,
  deleteDialogOpen,
  onCloseDeleteDialog,
  onDelete,
  isDeletingPayment,
  refundDialogOpen,
  onCloseRefundDialog,
  refundAmount,
  onRefundAmountChange,
  refundReason,
  onRefundReasonChange,
  onCreateRefund,
  isCreatingRefund,
  formatPaymentAmount,
}) => {
  return (
    <>
      {/* More Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onMenuClose}>
        <MenuItem onClick={onEditPayment}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit Payment</ListItemText>
        </MenuItem>

        {payment.status === 'COMPLETED' && (
          <MenuItem onClick={onSendReceipt} disabled={isSendingReceipt}>
            <ListItemIcon>
              <SendIcon />
            </ListItemIcon>
            <ListItemText>Send Receipt</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={onDeletePayment} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText>Delete Payment</ListItemText>
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={onCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>Edit Payment</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <PaymentForm
            payment={payment}
            onSubmit={onEdit}
            onCancel={onCloseEditDialog}
            isLoading={isUpdatingPayment}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={onCloseDeleteDialog}>
        <DialogTitle color="error">Delete Payment</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DialogContentText>
            Are you sure you want to delete payment{' '}
            <strong>{payment.payment_number as string}</strong>? This action cannot be undone and
            will permanently remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
          <Button onClick={onCloseDeleteDialog} disabled={isDeletingPayment}>
            Cancel
          </Button>
          <Button onClick={onDelete} color="error" variant="contained" disabled={isDeletingPayment}>
            {isDeletingPayment ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog
        open={refundDialogOpen}
        onClose={() => !isCreatingRefund && onCloseRefundDialog()}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle color="warning.main">Create Refund</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <DialogContentText>
              Create a refund for payment <strong>{payment.payment_number as string}</strong>. The
              original payment amount was {formatPaymentAmount(payment.amount as string)}.
            </DialogContentText>

            <TextField
              label="Refund Amount"
              type="number"
              value={refundAmount}
              onChange={(e) => onRefundAmountChange(e.target.value)}
              fullWidth
              required
              inputProps={{
                min: 0,
                max: parseFloat(payment.amount as string),
                step: 0.01,
              }}
              helperText={`Maximum refund amount: ${formatPaymentAmount(payment.amount as string)}`}
            />

            <TextField
              label="Reason for Refund"
              value={refundReason}
              onChange={(e) => onRefundReasonChange(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Enter the reason for this refund..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
          <Button onClick={onCloseRefundDialog} disabled={isCreatingRefund}>
            Cancel
          </Button>
          <Button
            onClick={onCreateRefund}
            color="warning"
            variant="contained"
            disabled={isCreatingRefund || !refundAmount || parseFloat(refundAmount) <= 0}
          >
            {isCreatingRefund ? <CircularProgress size={20} color="inherit" /> : 'Create Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
