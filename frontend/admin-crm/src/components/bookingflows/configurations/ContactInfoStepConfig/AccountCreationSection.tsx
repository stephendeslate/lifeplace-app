import React from 'react';
import { Box, FormControlLabel, Switch, Typography, Stack } from '@mui/material';
import { AccountCircle as AccountIcon } from '@mui/icons-material';
import { ConfigSection } from '@/components/common';
import type { ContactInfoConfigFormData } from './types';

interface AccountCreationSectionProps {
  formData: ContactInfoConfigFormData;
  handleSwitchChange: (
    name: keyof ContactInfoConfigFormData,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

export const AccountCreationSection: React.FC<AccountCreationSectionProps> = ({
  formData,
  handleSwitchChange,
  disabled,
}) => (
  <ConfigSection title="Account Creation">
    <Stack spacing={2}>
      <Box display="flex" alignItems="center" gap={1}>
        <AccountIcon color="primary" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.offer_account_creation}
              onChange={handleSwitchChange('offer_account_creation')}
              disabled={disabled}
            />
          }
          label="Offer Account Creation"
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        Give clients the option to create an account for easier future bookings
      </Typography>

      <Box display="flex" alignItems="center" gap={1}>
        <AccountIcon color="action" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.require_account_creation}
              onChange={handleSwitchChange('require_account_creation')}
              disabled={!formData.offer_account_creation || disabled}
            />
          }
          label="Require Account Creation"
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        Force all clients to create an account (only available if account creation is offered)
      </Typography>
    </Stack>
  </ConfigSection>
);
