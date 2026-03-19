import React from 'react';
import { Box, Typography, Paper, TextField, Button, Chip, CircularProgress } from '@mui/material';
import { LocalOffer, CheckCircle, Close as CloseIcon } from '@mui/icons-material';
import type { PricingSummaryStepConfiguration } from '@/types/booking';

interface DiscountCodeSectionProps {
  config: PricingSummaryStepConfiguration | null;
  appliedDiscountCode?: string;
  discountCodeInput: string;
  discountError: string | null;
  validatingDiscount: boolean;
  validationErrors: Record<string, string[]>;
  onApplyDiscount: () => void;
  onRemoveDiscount: () => void;
  onDiscountInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DiscountCodeSection: React.FC<DiscountCodeSectionProps> = ({
  config,
  appliedDiscountCode,
  discountCodeInput,
  discountError,
  validatingDiscount,
  validationErrors,
  onApplyDiscount,
  onRemoveDiscount,
  onDiscountInputChange,
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Typography
        variant="subtitle1"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <LocalOffer />
        Discount Code
      </Typography>

      {appliedDiscountCode ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={appliedDiscountCode}
            icon={<CheckCircle />}
            color="success"
            onDelete={onRemoveDiscount}
            deleteIcon={<CloseIcon />}
          />
          <Typography variant="body2" color="success.main">
            Discount Applied
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            size="small"
            placeholder={config?.discount_help_text || 'Enter discount code'}
            value={discountCodeInput}
            onChange={onDiscountInputChange}
            error={!!discountError || !!validationErrors.applied_discount_code}
            helperText={discountError || validationErrors.applied_discount_code?.join(', ') || ''}
            sx={{ flexGrow: 1 }}
            disabled={validatingDiscount}
          />
          <Button
            variant="outlined"
            onClick={onApplyDiscount}
            disabled={!discountCodeInput.trim() || validatingDiscount}
            startIcon={validatingDiscount ? <CircularProgress size={16} /> : null}
          >
            Apply
          </Button>
        </Box>
      )}
    </Paper>
  );
};
