import React from 'react';
import { Box, TextField, InputAdornment, Typography, Stack } from '@mui/material';
import { Email, Phone, LocationOn } from '@mui/icons-material';
import type { CompanySettingsUpdateData } from '@/types/settings.types';

interface ContactTabProps {
  formData: CompanySettingsUpdateData;
  isUpdating: boolean;
  onInputChange: (
    field: keyof CompanySettingsUpdateData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const ContactTab: React.FC<ContactTabProps> = ({ formData, isUpdating, onInputChange }) => {
  return (
    <>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
          Contact Information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          How clients can reach your company
        </Typography>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField
              fullWidth
              label="Primary Email"
              type="email"
              value={formData.email || ''}
              onChange={onInputChange('email')}
              disabled={isUpdating}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Support Email"
              type="email"
              value={formData.support_email || ''}
              onChange={onInputChange('support_email')}
              disabled={isUpdating}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField
              fullWidth
              label="Primary Phone"
              value={formData.phone || ''}
              onChange={onInputChange('phone')}
              disabled={isUpdating}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Secondary Phone"
              value={formData.phone_secondary || ''}
              onChange={onInputChange('phone_secondary')}
              disabled={isUpdating}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Box sx={{ mt: 3, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
          Business Address
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your company's physical location
        </Typography>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Address Line 1"
            value={formData.address_line1 || ''}
            onChange={onInputChange('address_line1')}
            disabled={isUpdating}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn color="secondary" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Address Line 2"
            value={formData.address_line2 || ''}
            onChange={onInputChange('address_line2')}
            disabled={isUpdating}
          />

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField
              fullWidth
              label="City"
              value={formData.city || ''}
              onChange={onInputChange('city')}
              disabled={isUpdating}
            />
            <TextField
              fullWidth
              label="Province/State"
              value={formData.province || ''}
              onChange={onInputChange('province')}
              disabled={isUpdating}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField
              fullWidth
              label="Postal Code"
              value={formData.postal_code || ''}
              onChange={onInputChange('postal_code')}
              disabled={isUpdating}
            />
            <TextField
              fullWidth
              label="Country"
              value={formData.country || ''}
              onChange={onInputChange('country')}
              disabled={isUpdating}
            />
          </Box>
        </Stack>
      </Box>
    </>
  );
};
