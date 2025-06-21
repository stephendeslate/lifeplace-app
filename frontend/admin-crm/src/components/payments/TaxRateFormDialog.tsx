// frontend/admin-crm/src/components/payments/TaxRateFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  CircularProgress,
  InputAdornment,
  Alert,
  Stack,
} from '@mui/material';
import { Percent as PercentIcon } from '@mui/icons-material';
import { useCreateTaxRate, useUpdateTaxRate } from '../../hooks/usePayments';
import type { TaxRate, TaxRateFormData } from '../../types/payments.types';

interface TaxRateFormDialogProps {
  open: boolean;
  onClose: () => void;
  taxRate?: TaxRate | null;
}

export const TaxRateFormDialog: React.FC<TaxRateFormDialogProps> = ({
  open,
  onClose,
  taxRate,
}) => {
  const [formData, setFormData] = useState<TaxRateFormData>({
    name: '',
    rate: '',
    region: '',
    is_default: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createTaxRate, isPending: isCreating } = useCreateTaxRate();
  const { mutate: updateTaxRate, isPending: isUpdating } = useUpdateTaxRate();

  const isEditing = !!taxRate;
  const isSubmitting = isCreating || isUpdating;

  // Initialize form data
  useEffect(() => {
    if (taxRate) {
      setFormData({
        name: taxRate.name,
        rate: taxRate.rate,
        region: taxRate.region,
        is_default: taxRate.is_default,
      });
    } else {
      setFormData({
        name: '',
        rate: '',
        region: '',
        is_default: false,
      });
    }
    setErrors({});
  }, [taxRate, open]);

  const handleChange = (field: keyof TaxRateFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'is_default' ? event.target.checked : event.target.value;
    
    // For rate field, only allow numbers and decimal point
    if (field === 'rate') {
      const numericValue = event.target.value;
      if (numericValue && !/^\d*\.?\d*$/.test(numericValue)) {
        return; // Don't update if invalid number format
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tax rate name is required';
    }

    if (!formData.rate.trim()) {
      newErrors.rate = 'Tax rate is required';
    } else {
      const rate = parseFloat(formData.rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.rate = 'Tax rate must be a number between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData = {
      name: formData.name.trim(),
      rate: formData.rate.trim(),
      region: formData.region.trim(),
      is_default: formData.is_default,
    };

    if (isEditing && taxRate) {
      updateTaxRate({ id: taxRate.id, data: submitData }, {
        onSuccess: () => onClose(),
      });
    } else {
      createTaxRate(submitData, {
        onSuccess: () => onClose(),
      });
    }
  };

  const formatRatePreview = () => {
    const rate = parseFloat(formData.rate);
    if (!isNaN(rate)) {
      return `${rate.toFixed(2)}%`;
    }
    return '';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {isEditing ? 'Edit Tax Rate' : 'Add Tax Rate'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {formData.is_default && (
            <Alert severity="info" sx={{ mb: 3 }}>
              This will become the default tax rate applied to new invoices and quotes.
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Tax Rate Name"
              value={formData.name}
              onChange={handleChange('name')}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="e.g., VAT, Sales Tax, GST"
            />
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 3
            }}>
              <TextField
                fullWidth
                label="Rate"
                value={formData.rate}
                onChange={handleChange('rate')}
                error={!!errors.rate}
                helperText={errors.rate || formatRatePreview()}
                placeholder="12.00"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <PercentIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Region"
                value={formData.region}
                onChange={handleChange('region')}
                placeholder="e.g., Philippines, Metro Manila"
                helperText="Optional: Specify the region this tax rate applies to"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_default}
                  onChange={handleChange('is_default')}
                />
              }
              label="Set as default tax rate"
            />
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <CircularProgress size={20} />
          ) : (
            isEditing ? 'Update Tax Rate' : 'Create Tax Rate'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};