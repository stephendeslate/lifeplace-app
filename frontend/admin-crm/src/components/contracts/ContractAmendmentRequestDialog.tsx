// frontend/admin-crm/src/components/contracts/ContractAmendmentRequestDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  Box,
  Typography,
  Stack,
  Alert,
  FormControlLabel,
  Checkbox,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Edit as AmendmentIcon } from '@mui/icons-material';
import { addDays, format } from 'date-fns';
import { ModernDialog, createStandardActions } from '../common/ModernDialog';
import { tokens } from '../../design-system/tokens';
import type { EventContract, CreateContractAmendmentData } from '../../types/contracts.types';

interface ContractAmendmentRequestDialogProps {
  open: boolean;
  onClose: () => void;
  contract: EventContract | null;
  onSubmit: (data: CreateContractAmendmentData) => void;
  isLoading: boolean;
}

export const ContractAmendmentRequestDialog: React.FC<ContractAmendmentRequestDialogProps> = ({
  open,
  onClose,
  contract,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    amendment_reason: '',
    changes_description: '',
    new_value: '',
    requires_new_signatures: true,
    signature_deadline: addDays(new Date(), 14),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && contract) {
      setFormData({
        amendment_reason: '',
        changes_description: '',
        new_value: contract.contract_value || '',
        requires_new_signatures: true,
        signature_deadline: addDays(new Date(), 14),
      });
      setErrors({});
    }
  }, [open, contract]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.amendment_reason.trim()) {
      newErrors.amendment_reason = 'Amendment reason is required';
    }
    if (!formData.changes_description.trim()) {
      newErrors.changes_description = 'Changes description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm() || !contract) return;

    onSubmit({
      original_contract: contract.id,
      amendment_reason: formData.amendment_reason.trim(),
      changes_description: formData.changes_description.trim(),
      new_value: formData.new_value || undefined,
      requires_new_signatures: formData.requires_new_signatures,
      signature_deadline: formData.requires_new_signatures
        ? format(formData.signature_deadline, 'yyyy-MM-dd')
        : undefined,
    });
  };

  if (!contract) return null;

  const eventName =
    typeof contract.event === 'object' ? contract.event.name : `Event #${contract.event}`;

  return (
    <ModernDialog
      open={open}
      onClose={onClose}
      title="Request Contract Amendment"
      maxWidth="md"
      actions={createStandardActions(onClose, handleSubmit, {
        cancelLabel: 'Cancel',
        confirmLabel: isLoading ? 'Submitting...' : 'Submit Request',
        isLoading,
        confirmDisabled: !formData.amendment_reason.trim() || !formData.changes_description.trim(),
      })}
    >
      <Stack spacing={3}>
        {/* Contract Info Header */}
        <Box
          sx={{
            p: 2,
            bgcolor: tokens.color.neutral[50],
            borderRadius: tokens.spacing.radius.lg,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <AmendmentIcon sx={{ color: tokens.color.primary[600] }} />
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Contract: {contract.template_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Event: {eventName}
            </Typography>
            {contract.contract_value && (
              <Typography variant="body2" color="text.secondary">
                Current Value: {contract.currency} {contract.contract_value}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Amendment Reason */}
        <TextField
          fullWidth
          required
          label="Amendment Reason"
          value={formData.amendment_reason}
          onChange={(e) => setFormData((prev) => ({ ...prev, amendment_reason: e.target.value }))}
          error={!!errors.amendment_reason}
          helperText={
            errors.amendment_reason || 'Brief explanation for why this amendment is needed'
          }
          disabled={isLoading}
        />

        {/* Detailed Changes Description */}
        <TextField
          fullWidth
          required
          multiline
          rows={4}
          label="Detailed Changes Description"
          value={formData.changes_description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, changes_description: e.target.value }))
          }
          error={!!errors.changes_description}
          helperText={
            errors.changes_description || 'Describe all changes to be made to the contract'
          }
          disabled={isLoading}
        />

        {/* New Contract Value */}
        <TextField
          fullWidth
          label="New Contract Value"
          value={formData.new_value}
          onChange={(e) => setFormData((prev) => ({ ...prev, new_value: e.target.value }))}
          InputProps={{
            startAdornment: <InputAdornment position="start">{contract.currency}</InputAdornment>,
          }}
          helperText="Leave blank to keep current value"
          disabled={isLoading}
        />

        {/* Requires New Signatures */}
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.requires_new_signatures}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, requires_new_signatures: e.target.checked }))
              }
              disabled={isLoading}
            />
          }
          label="Requires new signatures after amendment"
        />

        {/* Signature Deadline */}
        {formData.requires_new_signatures && (
          <DatePicker
            label="Signature Deadline"
            value={formData.signature_deadline}
            onChange={(date) => {
              if (date) {
                setFormData((prev) => ({ ...prev, signature_deadline: date }));
              }
            }}
            minDate={addDays(new Date(), 1)}
            disabled={isLoading}
            slotProps={{
              textField: {
                fullWidth: true,
                helperText: 'Deadline for obtaining all required signatures',
              },
            }}
          />
        )}

        {/* Info Alert */}
        <Alert severity="info">
          Amendment requests must be reviewed and approved before a new contract version is created.
        </Alert>
      </Stack>
    </ModernDialog>
  );
};

export default ContractAmendmentRequestDialog;
