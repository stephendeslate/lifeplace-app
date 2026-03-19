// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowFormDialog/TemplatesTab.tsx

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Typography, Stack, Alert } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { EnhancedBookingFlowFormData } from './useBookingFlowFormLogic';

interface TemplatesTabProps {
  formData: EnhancedBookingFlowFormData;
  workflowTemplatesData: Array<{ id: number; name: string }>;
  emailTemplatesData: Array<{ id: number; name: string }>;
  handleInputChange: (
    field: keyof EnhancedBookingFlowFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent<string | number[]>
      | { target: { value: unknown } },
  ) => void;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  formData,
  workflowTemplatesData,
  emailTemplatesData,
  handleInputChange,
}) => (
  <Stack spacing={3}>
    <Alert severity="info">
      Configure email templates and workflow automation for this booking flow.
    </Alert>

    <FormControl fullWidth>
      <InputLabel>Workflow Template</InputLabel>
      <Select
        value={formData.workflow_template}
        onChange={handleInputChange('workflow_template')}
        label="Workflow Template"
      >
        <MenuItem value="">
          <em>No Workflow</em>
        </MenuItem>
        {workflowTemplatesData.map((template) => (
          <MenuItem key={template.id} value={template.id.toString()}>
            {template.name}
          </MenuItem>
        ))}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        Automatic workflow to assign when booking is completed
      </Typography>
    </FormControl>

    <FormControl fullWidth>
      <InputLabel>Confirmation Email Template</InputLabel>
      <Select
        value={formData.confirmation_email_template}
        onChange={handleInputChange('confirmation_email_template')}
        label="Confirmation Email Template"
      >
        <MenuItem value="">
          <em>No Email</em>
        </MenuItem>
        {emailTemplatesData.map((template) => (
          <MenuItem key={template.id} value={template.id.toString()}>
            {template.name}
          </MenuItem>
        ))}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        Email sent immediately after booking confirmation
      </Typography>
    </FormControl>

    <FormControl fullWidth>
      <InputLabel>Reminder Email Template</InputLabel>
      <Select
        value={formData.reminder_email_template}
        onChange={handleInputChange('reminder_email_template')}
        label="Reminder Email Template"
      >
        <MenuItem value="">
          <em>No Reminders</em>
        </MenuItem>
        {emailTemplatesData.map((template) => (
          <MenuItem key={template.id} value={template.id.toString()}>
            {template.name}
          </MenuItem>
        ))}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        Automated reminder emails sent 7, 3, and 1 day(s) before the event
      </Typography>
    </FormControl>
  </Stack>
);
