// frontend/admin-crm/src/components/contracts/AmendmentApprovalDialog.tsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, TextField, Alert, Chip } from '@mui/material';
import { CheckCircle as ApproveIcon, Cancel as RejectIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { ModernDialog, createStandardActions } from '../common/ModernDialog';
import type { ContractAmendment } from '../../types/contracts.types';
import { AMENDMENT_STATUSES } from '../../types/contracts.types';
import { tokens } from '../../design-system/tokens';

interface AmendmentApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  amendment: ContractAmendment | null;
  mode: 'approve' | 'reject';
  onApprove: (id: number, reviewNotes?: string) => void;
  onReject: (id: number, reviewNotes?: string) => void;
  isLoading: boolean;
}

export const AmendmentApprovalDialog: React.FC<AmendmentApprovalDialogProps> = ({
  open,
  onClose,
  amendment,
  mode,
  onApprove,
  onReject,
  isLoading,
}) => {
  const [reviewNotes, setReviewNotes] = useState('');

  // Reset review notes when dialog opens
  useEffect(() => {
    if (open) {
      setReviewNotes('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!amendment) return;
    if (mode === 'approve') {
      onApprove(amendment.id, reviewNotes || undefined);
    } else {
      onReject(amendment.id, reviewNotes || undefined);
    }
  };

  if (!amendment) return null;

  const title = mode === 'approve' ? 'Approve Amendment' : 'Reject Amendment';
  const confirmLabel = mode === 'approve' ? 'Approve' : 'Reject';
  const confirmColor = mode === 'approve' ? 'primary' : 'error';

  // For reject, review notes are required
  const isValid = mode === 'approve' || reviewNotes.trim().length > 0;

  return (
    <ModernDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actions={createStandardActions(onClose, handleSubmit, {
        confirmLabel: isLoading ? 'Processing...' : confirmLabel,
        confirmColor: confirmColor as 'primary' | 'error',
        isLoading,
        confirmDisabled: !isValid,
      })}
    >
      <Stack spacing={3}>
        {/* Mode Icon */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
          {mode === 'approve' ? (
            <ApproveIcon sx={{ fontSize: 48, color: tokens.color.success[500] }} />
          ) : (
            <RejectIcon sx={{ fontSize: 48, color: tokens.color.error[500] }} />
          )}
        </Box>

        {/* Amendment Summary */}
        <Box
          sx={{
            p: 2,
            bgcolor: tokens.color.neutral[50],
            borderRadius: tokens.spacing.radius.lg,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Amendment Details
          </Typography>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Reason:
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: '60%', textAlign: 'right' }}>
                {amendment.amendment_reason}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Requested:
              </Typography>
              <Typography variant="body2">
                {format(new Date(amendment.requested_at), 'MMM dd, yyyy')}
              </Typography>
            </Box>
            {amendment.requested_by_details && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Requested By:
                </Typography>
                <Typography variant="body2">
                  {amendment.requested_by_details.first_name}{' '}
                  {amendment.requested_by_details.last_name}
                </Typography>
              </Box>
            )}
            {amendment.value_change && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Value Change:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      parseFloat(amendment.value_change) >= 0
                        ? tokens.color.success[600]
                        : tokens.color.error[600],
                    fontWeight: 500,
                  }}
                >
                  {parseFloat(amendment.value_change) >= 0 ? '+' : ''}
                  {amendment.value_change}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Status:
              </Typography>
              <Chip
                label={
                  AMENDMENT_STATUSES.find((s) => s.value === amendment.status)?.label ||
                  amendment.status
                }
                size="small"
                color="warning"
              />
            </Box>
          </Stack>
        </Box>

        {/* Changes Description */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Changes Description
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {amendment.changes_description}
          </Typography>
        </Box>

        {/* Review Notes */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Review Notes"
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          required={mode === 'reject'}
          helperText={
            mode === 'reject'
              ? 'Required: Explain why this amendment is being rejected'
              : 'Optional: Add any notes about your decision'
          }
          error={mode === 'reject' && reviewNotes.trim().length === 0}
          disabled={isLoading}
        />

        {/* Info Alerts */}
        {mode === 'approve' && (
          <Alert severity="info">
            Approving this amendment will allow creation of a new contract version with the proposed
            changes.
          </Alert>
        )}

        {mode === 'reject' && (
          <Alert severity="warning">
            Rejecting this amendment is final. A new amendment request would need to be submitted.
          </Alert>
        )}
      </Stack>
    </ModernDialog>
  );
};

export default AmendmentApprovalDialog;
