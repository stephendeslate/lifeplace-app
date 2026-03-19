import React from 'react';
import {
  FormControlLabel,
  Switch,
  Typography,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { CreateWorkflowStageData } from '@/types/workflows';

interface BusinessEventTriggersSectionProps {
  formData: CreateWorkflowStageData;
  onInputChange: (
    field: keyof CreateWorkflowStageData,
    value: string | boolean | number | null,
  ) => void;
}

export const BusinessEventTriggersSection: React.FC<BusinessEventTriggersSectionProps> = ({
  formData,
  onInputChange,
}) => (
  <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Also Execute On Business Events</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <Alert severity="info" sx={{ mb: 1 }}>
          <strong>Optional:</strong> In addition to the scheduled execution above, you can also
          trigger this automation immediately when specific business events occur. This runs the
          automation without waiting for the scheduled time and without advancing to the next stage.
        </Alert>

        <FormControlLabel
          control={
            <Switch
              checked={formData.trigger_on_event_created || false}
              onChange={(e) => onInputChange('trigger_on_event_created', e.target.checked)}
            />
          }
          label="Execute when event is created"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.trigger_on_quote_sent || false}
              onChange={(e) => onInputChange('trigger_on_quote_sent', e.target.checked)}
            />
          }
          label="Execute when quote is sent"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.trigger_on_quote_accepted || false}
              onChange={(e) => onInputChange('trigger_on_quote_accepted', e.target.checked)}
            />
          }
          label="Execute when quote is accepted"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.trigger_on_contract_signed || false}
              onChange={(e) => onInputChange('trigger_on_contract_signed', e.target.checked)}
            />
          }
          label="Execute when contract is signed"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.trigger_on_payment_received || false}
              onChange={(e) => onInputChange('trigger_on_payment_received', e.target.checked)}
            />
          }
          label="Execute when payment is received"
        />
      </Stack>
    </AccordionDetails>
  </Accordion>
);
