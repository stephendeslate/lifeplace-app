import React from 'react';
import { Box, TextField, InputAdornment, Typography, Stack, Alert } from '@mui/material';
import { AccountBalance } from '@mui/icons-material';
import type { CompanySettingsUpdateData } from '@/types/settings.types';

interface BankingTabProps {
  formData: CompanySettingsUpdateData;
  isUpdating: boolean;
  onInputChange: (
    field: keyof CompanySettingsUpdateData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const BankingTab: React.FC<BankingTabProps> = ({ formData, isUpdating, onInputChange }) => {
  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
        Bank Account Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Bank information displayed on invoices and payment instructions
      </Typography>
      <Stack spacing={3}>
        <TextField
          fullWidth
          label="Bank Name"
          value={formData.bank_name || ''}
          onChange={onInputChange('bank_name')}
          disabled={isUpdating}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AccountBalance color="primary" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Account Name"
          value={formData.bank_account_name || ''}
          onChange={onInputChange('bank_account_name')}
          disabled={isUpdating}
          helperText="Name on the bank account"
        />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <TextField
            fullWidth
            label="Account Number"
            value={formData.bank_account_number || ''}
            onChange={onInputChange('bank_account_number')}
            disabled={isUpdating}
          />
          <TextField
            fullWidth
            label="Branch"
            value={formData.bank_branch || ''}
            onChange={onInputChange('bank_branch')}
            disabled={isUpdating}
          />
        </Box>

        <TextField
          fullWidth
          label="SWIFT/BIC Code"
          value={formData.bank_swift_code || ''}
          onChange={onInputChange('bank_swift_code')}
          disabled={isUpdating}
          helperText="For international transfers"
        />

        <Alert severity="warning">
          Bank details are sensitive information. They will be displayed on invoices for clients to
          make payments.
        </Alert>
      </Stack>
    </Box>
  );
};
