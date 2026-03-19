import React from 'react';
import { Typography, Stack } from '@mui/material';
import { ConfigSection } from '@/components/common';
import type { ContactInfoConfigFormData } from './types';

interface ConfigurationSummaryProps {
  formData: ContactInfoConfigFormData;
  requiredFieldsCount: number;
}

export const ConfigurationSummary: React.FC<ConfigurationSummaryProps> = ({
  formData,
  requiredFieldsCount,
}) => (
  <ConfigSection title="Configuration Summary">
    <Stack spacing={1}>
      <Typography variant="body2">
        <strong>Required Fields:</strong> {requiredFieldsCount} total
      </Typography>

      <Typography variant="body2">
        <strong>Standard Fields:</strong>{' '}
        {[
          formData.require_full_name && 'Name',
          formData.require_email && 'Email',
          formData.require_phone && 'Phone',
          formData.require_address && 'Address',
          formData.require_company && 'Company',
        ]
          .filter(Boolean)
          .join(', ') || 'None required'}
      </Typography>

      {formData.custom_fields.length > 0 && (
        <Typography variant="body2">
          <strong>Custom Fields:</strong> {formData.custom_fields.length} added (
          {formData.custom_fields.filter((f) => f.required).length} required)
        </Typography>
      )}

      <Typography variant="body2">
        <strong>Account Creation:</strong>{' '}
        {formData.require_account_creation
          ? 'Required'
          : formData.offer_account_creation
            ? 'Optional'
            : 'Not offered'}
      </Typography>
    </Stack>
  </ConfigSection>
);
