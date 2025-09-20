// frontend/client-portal/src/components/common/QuoteRejectionDialog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Warning as WarningIcon,
} from '@mui/icons-material';

interface QuoteRejectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  quoteName?: string;
  isLoading?: boolean;
}

export const QuoteRejectionDialog: React.FC<QuoteRejectionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  quoteName,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setIsRequired(true);
      return;
    }

    await onConfirm(reason.trim());
    handleClose();
  };

  const handleClose = () => {
    setReason('');
    setIsRequired(false);
    onClose();
  };

  const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setReason(event.target.value);
    if (isRequired && event.target.value.trim()) {
      setIsRequired(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isLoading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarningIcon sx={{ fontSize: 32 }} color="warning" />
          <Typography variant="h6">Reject Quote</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body1">
            {quoteName
              ? `Are you sure you want to reject the quote for "${quoteName}"?`
              : 'Are you sure you want to reject this quote?'
            }
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Please provide a reason for rejecting this quote. This feedback helps us improve our services and better understand your needs.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for rejection"
            placeholder="Please tell us why this quote doesn't work for you (e.g., budget concerns, timeline issues, service requirements, etc.)"
            value={reason}
            onChange={handleReasonChange}
            error={isRequired}
            helperText={isRequired ? 'Please provide a reason for rejection' : ''}
            disabled={isLoading}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="warning"
          disabled={isLoading || !reason.trim()}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          Reject Quote
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteRejectionDialog;