import React from 'react';
import { Box, TextField, Typography, Stack } from '@mui/material';
import type { CompanySettingsUpdateData } from '@/types/settings.types';

interface DocumentsTabProps {
  formData: CompanySettingsUpdateData;
  isUpdating: boolean;
  onInputChange: (
    field: keyof CompanySettingsUpdateData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  formData,
  isUpdating,
  onInputChange,
}) => {
  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
        PDF & Document Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure text that appears on generated PDFs
      </Typography>
      <Stack spacing={3}>
        <TextField
          fullWidth
          label="PDF Footer Text"
          value={formData.pdf_footer_text || ''}
          onChange={onInputChange('pdf_footer_text')}
          disabled={isUpdating}
          multiline
          rows={2}
          helperText="This text appears at the bottom of all generated PDFs"
        />

        <TextField
          fullWidth
          label="Invoice Terms"
          value={formData.invoice_terms || ''}
          onChange={onInputChange('invoice_terms')}
          disabled={isUpdating}
          multiline
          rows={4}
          helperText="Terms and conditions for invoices"
        />

        <TextField
          fullWidth
          label="Receipt Terms"
          value={formData.receipt_terms || ''}
          onChange={onInputChange('receipt_terms')}
          disabled={isUpdating}
          multiline
          rows={4}
          helperText="Terms and conditions for receipts"
        />
      </Stack>
    </Box>
  );
};
