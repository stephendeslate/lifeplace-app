// frontend/admin-crm/src/components/workflows/WorkflowStageFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListSubheader,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import { useContractTemplates } from '../../hooks/useContracts';
import { useQuoteTemplates } from '../../hooks/useSales';
import { useQuestionnaires } from '../../hooks/useQuestionnaires';
import { useConfirmDialog } from '../common/ConfirmDialog';
import type {
  WorkflowStageFormDialogProps,
  CreateWorkflowStageData,
  UpdateWorkflowStageData,
  StageType,
  AutomationType,
} from '../../types/workflows.types';
import {
  STAGE_TYPES,
  AUTOMATION_TYPES,
  PROGRESSION_CONDITIONS
} from '../../types/workflows.types';
import { CustomTimingInput } from './CustomTimingInput';

const defaultFormData: CreateWorkflowStageData = {
  name: '',
  stage: 'LEAD',
  order: 1,
  is_automated: false,
  automation_type: 'TASK',
  trigger_time: 'ON_CREATION',
  trigger_after_stage: null,
  email_template: null,
  contract_template: null,
  questionnaire_template: null,
  task_description: '',
  progression_condition: '',
  required_tasks_completed: false,
  // Trigger-on flags
  trigger_on_payment_received: false,
  trigger_on_quote_accepted: false,
  trigger_on_contract_signed: false,
  trigger_on_event_created: false,
  trigger_on_quote_sent: false,
  metadata: {},
};

export const WorkflowStageFormDialog: React.FC<WorkflowStageFormDialogProps> = ({
  open,
  onClose,
  editingStage,
  templateId,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<CreateWorkflowStageData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [originalStageType, setOriginalStageType] = useState<StageType | null>(null);

  const { confirm } = useConfirmDialog();
  const { useTemplates } = useCommunications();
  const { data: emailTemplates = [] } = useTemplates({ channel: 'EMAIL' });

  const { data: contractTemplates = [] } = useContractTemplates();
  const { data: quoteTemplates = [] } = useQuoteTemplates();

  const { useActiveQuestionnaires } = useQuestionnaires();
  const { data: questionnaires = [] } = useActiveQuestionnaires();

  const isEditing = !!editingStage;

  useEffect(() => {
    if (open) {
      if (editingStage) {
        setFormData({
          name: editingStage.name,
          stage: editingStage.stage,
          order: editingStage.order,
          is_automated: editingStage.is_automated,
          automation_type: editingStage.automation_type,
          trigger_time: editingStage.trigger_time,
          trigger_after_stage: editingStage.trigger_after_stage || null,
          email_template: editingStage.email_template,
          contract_template: editingStage.contract_template,
          questionnaire_template: editingStage.questionnaire_template,
          task_description: editingStage.task_description || '',
          progression_condition: editingStage.progression_condition || '',
          required_tasks_completed: editingStage.required_tasks_completed,
          // Trigger-on flags
          trigger_on_payment_received: editingStage.trigger_on_payment_received || false,
          trigger_on_quote_accepted: editingStage.trigger_on_quote_accepted || false,
          trigger_on_contract_signed: editingStage.trigger_on_contract_signed || false,
          trigger_on_event_created: editingStage.trigger_on_event_created || false,
          trigger_on_quote_sent: editingStage.trigger_on_quote_sent || false,
          metadata: editingStage.metadata || {},
        });
        // Track original stage type for change detection
        setOriginalStageType(editingStage.stage);
      } else {
        setFormData({
          ...defaultFormData,
          template: templateId,
        });
        setOriginalStageType(null);
      }
      setErrors({});
    }
  }, [editingStage, templateId, open]);

  // Handler for metadata changes
  const handleMetadataChange = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value,
      },
    }));
  };

  const handleInputChange = (field: keyof CreateWorkflowStageData, value: string | boolean | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Stage name is required';
    }

    if (formData.is_automated && formData.automation_type === 'EMAIL' && !formData.email_template) {
      newErrors.email_template = 'Email template is required for email automation';
    }

    if (formData.is_automated && formData.automation_type === 'CONTRACT' && !formData.contract_template) {
      newErrors.contract_template = 'Contract template is required for contract automation';
    }

    if (formData.is_automated && formData.automation_type === 'QUESTIONNAIRE' && !formData.questionnaire_template) {
      newErrors.questionnaire_template = 'Questionnaire template is required for questionnaire automation';
    }

    if (formData.order && formData.order < 1) {
      newErrors.order = 'Order must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const submitData: CreateWorkflowStageData | UpdateWorkflowStageData = {
      ...formData,
      template: templateId,
    };

    // For CREATE mode, remove order to let backend auto-assign
    if (!isEditing) {
      delete (submitData as CreateWorkflowStageData).order;
    }

    // Check if stage type changed during edit - show confirmation
    if (isEditing && originalStageType && formData.stage !== originalStageType) {
      const stageTypeLabels: Record<StageType, string> = {
        LEAD: 'Lead',
        PRODUCTION: 'Production',
        POST_PRODUCTION: 'Post-Production',
      };

      const confirmed = await confirm({
        title: 'Confirm Stage Type Change',
        message: `Changing the stage type from "${stageTypeLabels[originalStageType]}" to "${stageTypeLabels[formData.stage]}" will cause automatic reordering of stages within the workflow. This may affect the execution order for events using this template. Are you sure you want to proceed?`,
        type: 'warning',
        confirmText: 'Change Stage Type',
        cancelText: 'Keep Original',
        confirmColor: 'warning',
      });

      if (!confirmed) {
        return;
      }
    }

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const requiresEmailTemplate = formData.is_automated && formData.automation_type === 'EMAIL';
  const requiresContractTemplate = formData.is_automated && formData.automation_type === 'CONTRACT';
  const requiresQuestionnaireTemplate = formData.is_automated && formData.automation_type === 'QUESTIONNAIRE';

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      {open && (
        <>
          <DialogTitle>
            {isEditing ? 'Edit Workflow Stage' : 'Create New Workflow Stage'}
          </DialogTitle>
      
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Stack spacing={3}>
                {/* Basic Information */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Stage Information
                  </Typography>
                  
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Stage Name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      error={!!errors.name}
                      helperText={errors.name || 'A descriptive name for this stage'}
                      required
                    />

                    <Box display="flex" gap={2}>
                      <FormControl fullWidth>
                        <InputLabel>Stage Type</InputLabel>
                        <Select
                          value={formData.stage}
                          label="Stage Type"
                          onChange={(e) => handleInputChange('stage', e.target.value as StageType)}
                        >
                          {STAGE_TYPES.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {isEditing ? (
                        <TextField
                          label="Order"
                          value={formData.order}
                          onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 1)}
                          error={!!errors.order}
                          helperText={errors.order || 'Changing order may reorder other stages'}
                          type="number"
                          sx={{ minWidth: 120 }}
                        />
                      ) : (
                        <TextField
                          label="Order"
                          value="Auto"
                          disabled
                          helperText="Order is automatically assigned"
                          sx={{ minWidth: 120 }}
                        />
                      )}
                    </Box>

                    <TextField
                      fullWidth
                      label="Task Description"
                      value={formData.task_description}
                      onChange={(e) => handleInputChange('task_description', e.target.value)}
                      multiline
                      rows={2}
                      helperText="Description of what happens in this stage"
                    />
                  </Stack>
                </Box>

                {/* Automation Settings */}
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
                            onChange={(e) => handleInputChange('is_automated', e.target.checked)}
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
                                onChange={(e) => handleInputChange('automation_type', e.target.value as AutomationType)}
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
                              onChange={(value) => handleInputChange('trigger_time', value)}
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
                                onChange={(e) => handleInputChange('email_template', e.target.value || null)}
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
                                onChange={(e) => handleInputChange('contract_template', e.target.value || null)}
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
                                  onChange={(e) => handleInputChange('questionnaire_template', e.target.value || null)}
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
                                  onChange={(e) => handleInputChange('email_template', e.target.value || null)}
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
                                This automation sends a notification to the client with a link to complete the questionnaire.
                                If the questionnaire is already complete, the notification is skipped.
                                If partially complete, it acts as a reminder.
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
                              No questionnaire templates found. Create questionnaire templates in Template Settings first.
                            </Alert>
                          )}

                          {formData.trigger_time?.includes('BEFORE_EVENT') && (
                            <Alert severity="info">
                              This automation will execute relative to the event&apos;s start date.
                              Events without a start date configured will skip this trigger.
                            </Alert>
                          )}

                          {/* Automation-specific configuration */}
                          {formData.automation_type === 'TASK' && (
                            <FormControl fullWidth>
                              <InputLabel>Task Priority</InputLabel>
                              <Select
                                value={(formData.metadata?.task_priority as string) || 'MEDIUM'}
                                label="Task Priority"
                                onChange={(e) => handleMetadataChange('task_priority', e.target.value)}
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
                                onChange={(e) => handleMetadataChange('quote_template_id', e.target.value ? parseInt(e.target.value as string) : null)}
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
                              onChange={(e) => handleMetadataChange('signature_deadline_hours', parseInt(e.target.value) || 48)}
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
                                onChange={(e) => handleMetadataChange('days_until_due', parseInt(e.target.value) || 7)}
                                helperText="Number of days shown in the reminder"
                                fullWidth
                              />
                              <FormControl fullWidth>
                                <InputLabel>Reminder Type</InputLabel>
                                <Select
                                  value={(formData.metadata?.reminder_type as string) || 'WORKFLOW_REMINDER'}
                                  label="Reminder Type"
                                  onChange={(e) => handleMetadataChange('reminder_type', e.target.value)}
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

                {/* Business Event Triggers - Execute automation when specific business events occur */}
                {formData.is_automated && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">Also Execute On Business Events</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Alert severity="info" sx={{ mb: 1 }}>
                          <strong>Optional:</strong> In addition to the scheduled execution above, you can also trigger
                          this automation immediately when specific business events occur. This runs the automation
                          without waiting for the scheduled time and without advancing to the next stage.
                        </Alert>

                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.trigger_on_event_created || false}
                              onChange={(e) => handleInputChange('trigger_on_event_created', e.target.checked)}
                            />
                          }
                          label="Execute when event is created"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.trigger_on_quote_sent || false}
                              onChange={(e) => handleInputChange('trigger_on_quote_sent', e.target.checked)}
                            />
                          }
                          label="Execute when quote is sent"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.trigger_on_quote_accepted || false}
                              onChange={(e) => handleInputChange('trigger_on_quote_accepted', e.target.checked)}
                            />
                          }
                          label="Execute when quote is accepted"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.trigger_on_contract_signed || false}
                              onChange={(e) => handleInputChange('trigger_on_contract_signed', e.target.checked)}
                            />
                          }
                          label="Execute when contract is signed"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.trigger_on_payment_received || false}
                              onChange={(e) => handleInputChange('trigger_on_payment_received', e.target.checked)}
                            />
                          }
                          label="Execute when payment is received"
                        />
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Progression Settings */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Progression Settings</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel>Progression Condition</InputLabel>
                        <Select
                          value={formData.progression_condition}
                          label="Progression Condition"
                          onChange={(e) => handleInputChange('progression_condition', e.target.value)}
                        >
                          <ListSubheader>Manual</ListSubheader>
                          {PROGRESSION_CONDITIONS.filter(c => c.category === 'manual').map((condition) => (
                            <MenuItem key={condition.value} value={condition.value}>
                              {condition.label}
                            </MenuItem>
                          ))}
                          <ListSubheader>Event-Based</ListSubheader>
                          {PROGRESSION_CONDITIONS.filter(c => c.category === 'event').map((condition) => (
                            <MenuItem key={condition.value} value={condition.value}>
                              {condition.label}
                            </MenuItem>
                          ))}
                          <ListSubheader>Time-Based</ListSubheader>
                          {PROGRESSION_CONDITIONS.filter(c => c.category === 'time').map((condition) => (
                            <MenuItem key={condition.value} value={condition.value}>
                              {condition.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.required_tasks_completed}
                            onChange={(e) => handleInputChange('required_tasks_completed', e.target.checked)}
                          />
                        }
                        label="Require all tasks to be completed before progressing"
                      />

                      <Alert severity="info">
                        Progression conditions determine when an event automatically moves to the next stage. 
                        If no condition is set, progression will be manual.
                      </Alert>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </Stack>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
            >
              {isLoading ? 'Saving...' : isEditing ? 'Update Stage' : 'Create Stage'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};