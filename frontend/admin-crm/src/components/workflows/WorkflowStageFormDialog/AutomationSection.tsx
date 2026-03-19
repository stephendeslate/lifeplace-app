import React from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { CreateWorkflowStageData, AutomationType } from '@/types/workflows';
import { AUTOMATION_TYPES } from '@/types/workflows';
import { CustomTimingInput } from '@/components/workflows/CustomTimingInput';

interface AutomationSectionProps {
  formData: CreateWorkflowStageData;
  errors: Record<string, string>;
  requiresEmailTemplate: boolean | undefined;
  requiresContractTemplate: boolean | undefined;
  requiresQuestionnaireTemplate: boolean | undefined;
  emailTemplates: Array<{ id: number; name: string }>;
  contractTemplates: Array<{ id: number; name: string }>;
  quoteTemplates: Array<{ id: number; name: string }>;
  questionnaires: Array<{ id: number; name: string }>;
  onInputChange: (
    field: keyof CreateWorkflowStageData,
    value: string | boolean | number | null,
  ) => void;
  onMetadataChange: (key: string, value: unknown) => void;
}

export const AutomationSection: React.FC<AutomationSectionProps> = ({
  formData,
  errors,
  requiresEmailTemplate,
  requiresContractTemplate,
  requiresQuestionnaireTemplate,
  emailTemplates,
  contractTemplates,
  quoteTemplates,
  questionnaires,
  onInputChange,
  onMetadataChange,
}) => (
  <Accordion defaultExpanded>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Automation Settings</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_automated}
              onChange={(e) => onInputChange('is_automated', e.target.checked)}
            />
          }
          label="Enable Automation"
        />

        {formData.is_automated && (
          <>
            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Automation Type</InputLabel>
                <Select
                  value={formData.automation_type}
                  label="Automation Type"
                  onChange={(e) =>
                    onInputChange('automation_type', e.target.value as AutomationType)
                  }
                >
                  {AUTOMATION_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <CustomTimingInput
                value={formData.trigger_time ?? 'ON_CREATION'}
                onChange={(value) => onInputChange('trigger_time', value)}
                label="Scheduled Execution"
                showBeforeEvent={true}
              />
            </Box>

            {requiresEmailTemplate && (
              <FormControl fullWidth error={!!errors.email_template}>
                <InputLabel>Email Template</InputLabel>
                <Select
                  value={formData.email_template || ''}
                  label="Email Template"
                  onChange={(e) => onInputChange('email_template', e.target.value || null)}
                >
                  <MenuItem value="">
                    <em>Select an email template</em>
                  </MenuItem>
                  {emailTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.email_template && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.email_template}
                  </Typography>
                )}
              </FormControl>
            )}

            {requiresContractTemplate && (
              <FormControl fullWidth error={!!errors.contract_template}>
                <InputLabel>Contract Template</InputLabel>
                <Select
                  value={formData.contract_template || ''}
                  label="Contract Template"
                  onChange={(e) => onInputChange('contract_template', e.target.value || null)}
                >
                  <MenuItem value="">
                    <em>Select a contract template</em>
                  </MenuItem>
                  {contractTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.contract_template && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.contract_template}
                  </Typography>
                )}
              </FormControl>
            )}

            {requiresQuestionnaireTemplate && (
              <>
                <FormControl fullWidth error={!!errors.questionnaire_template}>
                  <InputLabel>Questionnaire Template</InputLabel>
                  <Select
                    value={formData.questionnaire_template || ''}
                    label="Questionnaire Template"
                    onChange={(e) =>
                      onInputChange('questionnaire_template', e.target.value || null)
                    }
                  >
                    <MenuItem value="">
                      <em>Select a questionnaire template</em>
                    </MenuItem>
                    {questionnaires.map((questionnaire) => (
                      <MenuItem key={questionnaire.id} value={questionnaire.id}>
                        {questionnaire.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.questionnaire_template && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {errors.questionnaire_template}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Notification Email Template (Optional)</InputLabel>
                  <Select
                    value={formData.email_template || ''}
                    label="Notification Email Template (Optional)"
                    onChange={(e) => onInputChange('email_template', e.target.value || null)}
                  >
                    <MenuItem value="">
                      <em>No email (in-app notification only)</em>
                    </MenuItem>
                    {emailTemplates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Alert severity="info">
                  This automation sends a notification to the client with a link to complete the
                  questionnaire. If the questionnaire is already complete, the notification is
                  skipped. If partially complete, it acts as a reminder.
                </Alert>
              </>
            )}

            {formData.automation_type === 'EMAIL' && !emailTemplates.length && (
              <Alert severity="warning">
                No email templates found. Create email templates in Communication Settings first.
              </Alert>
            )}

            {formData.automation_type === 'CONTRACT' && !contractTemplates.length && (
              <Alert severity="warning">
                No contract templates found. Create contract templates in Template Settings first.
              </Alert>
            )}

            {formData.automation_type === 'QUESTIONNAIRE' && !questionnaires.length && (
              <Alert severity="warning">
                No questionnaire templates found. Create questionnaire templates in Template
                Settings first.
              </Alert>
            )}

            {formData.trigger_time?.includes('BEFORE_EVENT') && (
              <Alert severity="info">
                This automation will execute relative to the event&apos;s start date. Events without
                a start date configured will skip this trigger.
              </Alert>
            )}

            {formData.automation_type === 'TASK' && (
              <FormControl fullWidth>
                <InputLabel>Task Priority</InputLabel>
                <Select
                  value={(formData.metadata?.task_priority as string) || 'MEDIUM'}
                  label="Task Priority"
                  onChange={(e) => onMetadataChange('task_priority', e.target.value)}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                </Select>
              </FormControl>
            )}

            {formData.automation_type === 'QUOTE' && (
              <FormControl fullWidth>
                <InputLabel>Quote Template (Optional)</InputLabel>
                <Select
                  value={(formData.metadata?.quote_template_id as string) || ''}
                  label="Quote Template (Optional)"
                  onChange={(e) =>
                    onMetadataChange(
                      'quote_template_id',
                      e.target.value ? parseInt(e.target.value as string) : null,
                    )
                  }
                >
                  <MenuItem value="">
                    <em>Use Default (by Event Type)</em>
                  </MenuItem>
                  {quoteTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {formData.automation_type === 'CONTRACT' && (
              <TextField
                type="number"
                label="Signature Deadline (Hours)"
                value={(formData.metadata?.signature_deadline_hours as number) || 48}
                onChange={(e) =>
                  onMetadataChange('signature_deadline_hours', parseInt(e.target.value) || 48)
                }
                helperText="Hours until contract signature expires"
                fullWidth
              />
            )}

            {formData.automation_type === 'REMINDER' && (
              <>
                <TextField
                  type="number"
                  label="Days Until Due"
                  value={(formData.metadata?.days_until_due as number) || 7}
                  onChange={(e) =>
                    onMetadataChange('days_until_due', parseInt(e.target.value) || 7)
                  }
                  helperText="Number of days shown in the reminder"
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Reminder Type</InputLabel>
                  <Select
                    value={(formData.metadata?.reminder_type as string) || 'WORKFLOW_REMINDER'}
                    label="Reminder Type"
                    onChange={(e) => onMetadataChange('reminder_type', e.target.value)}
                  >
                    <MenuItem value="WORKFLOW_REMINDER">General Reminder</MenuItem>
                    <MenuItem value="PAYMENT_REMINDER">Payment Reminder</MenuItem>
                    <MenuItem value="EVENT_REMINDER">Event Reminder</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </>
        )}
      </Stack>
    </AccordionDetails>
  </Accordion>
);
