import React from 'react';
import { Box, FormControlLabel, Switch, Stack } from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as AddressIcon,
  Business as CompanyIcon,
} from '@mui/icons-material';
import { ConfigSection } from '@/components/common';
import type { ContactInfoConfigFormData } from './types';

interface StandardFieldsSectionProps {
  formData: ContactInfoConfigFormData;
  handleSwitchChange: (
    name: keyof ContactInfoConfigFormData,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

export const StandardFieldsSection: React.FC<StandardFieldsSectionProps> = ({
  formData,
  handleSwitchChange,
  disabled,
}) => (
  <ConfigSection title="Standard Contact Fields">
    <Stack spacing={2}>
      <Box display="flex" alignItems="center" gap={1}>
        <PersonIcon color="primary" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.require_full_name}
              onChange={handleSwitchChange('require_full_name')}
              disabled={disabled}
            />
          }
          label="Require Full Name"
        />
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <EmailIcon color="primary" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.require_email}
              onChange={handleSwitchChange('require_email')}
              disabled={disabled}
            />
          }
          label="Require Email Address"
        />
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <PhoneIcon color="primary" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.require_phone}
              onChange={handleSwitchChange('require_phone')}
              disabled={disabled}
            />
          }
          label="Require Phone Number"
        />
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <AddressIcon color="action" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.require_address}
              onChange={handleSwitchChange('require_address')}
              disabled={disabled}
            />
          }
          label="Require Address"
        />
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <CompanyIcon color="action" />
        <FormControlLabel
          control={
            <Switch
              checked={formData.require_company}
              onChange={handleSwitchChange('require_company')}
              disabled={disabled}
            />
          }
          label="Require Company Information"
        />
      </Box>
    </Stack>
  </ConfigSection>
);
