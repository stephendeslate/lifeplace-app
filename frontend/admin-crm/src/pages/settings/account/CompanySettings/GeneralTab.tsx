import React from 'react';
import { Box, TextField, InputAdornment, Typography, Stack } from '@mui/material';
import { Business as BusinessIcon, Language } from '@mui/icons-material';
import type { CompanySettingsUpdateData } from '@/types/settings.types';

interface GeneralTabProps {
  formData: CompanySettingsUpdateData;
  isUpdating: boolean;
  onInputChange: (
    field: keyof CompanySettingsUpdateData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ formData, isUpdating, onInputChange }) => {
  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
        Company Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Basic information about your company
      </Typography>
      <Stack spacing={3}>
        <TextField
          fullWidth
          label="Company Name"
          value={formData.company_name || ''}
          onChange={onInputChange('company_name')}
          disabled={isUpdating}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BusinessIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Company Tagline"
          value={formData.company_tagline || ''}
          onChange={onInputChange('company_tagline')}
          disabled={isUpdating}
          helperText="A short slogan or description of your business"
        />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <TextField
            fullWidth
            label="Business Registration Number"
            value={formData.business_registration_number || ''}
            onChange={onInputChange('business_registration_number')}
            disabled={isUpdating}
          />
          <TextField
            fullWidth
            label="VAT Number"
            value={formData.vat_number || ''}
            onChange={onInputChange('vat_number')}
            disabled={isUpdating}
          />
        </Box>

        <TextField
          fullWidth
          label="Website"
          value={formData.website || ''}
          onChange={onInputChange('website')}
          disabled={isUpdating}
          placeholder="https://yourcompany.com"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Language color="primary" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>
    </Box>
  );
};
