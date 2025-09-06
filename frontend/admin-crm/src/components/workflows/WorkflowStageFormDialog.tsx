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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import { useContractTemplates } from '../../hooks/useContracts';
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
  TRIGGER_TIMES, 
  PROGRESSION_CONDITIONS 
} from '../../types/workflows.types';

const defaultFormData: CreateWorkflowStageData = {
  name: '',
  stage: 'LEAD',
  order: 1,
  is_automated: false,
  automation_type: 'TASK',
  trigger_time: 'ON_CREATION',
  email_template: null,
  contract_template: null,
  task_description: '',
  progression_condition: '',
  required_tasks_completed: false,
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

  const { useTemplates } = useCommunications();
  const { data: emailTemplates = [] } = useTemplates({ channel: 'EMAIL' });
  
  const { data: contractTemplates = [] } = useContractTemplates();

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
          email_template: editingStage.email_template,
          contract_template: editingStage.contract_template,
          task_description: editingStage.task_description || '',
          progression_condition: editingStage.progression_condition || '',
          required_tasks_completed: editingStage.required_tasks_completed,
          metadata: editingStage.metadata || {},
        });
      } else {
        setFormData({
          ...defaultFormData,
          template: templateId,
        });
      }
      setErrors({});
    }
  }, [editingStage, templateId, open]);

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

    if (formData.order && formData.order < 1) {
      newErrors.order = 'Order must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: CreateWorkflowStageData | UpdateWorkflowStageData = {
      ...formData,
      template: templateId,
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const requiresEmailTemplate = formData.is_automated && formData.automation_type === 'EMAIL';
  const requiresContractTemplate = formData.is_automated && formData.automation_type === 'CONTRACT';

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

                      <TextField
                        label="Order"
                        value={formData.order}
                        onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 1)}
                        error={!!errors.order}
                        helperText={errors.order || 'Execution order within stage type'}
                        type="number"
                        sx={{ minWidth: 120 }}
                      />
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

                            <FormControl fullWidth>
                              <InputLabel>Trigger Time</InputLabel>
                              <Select
                                value={formData.trigger_time}
                                label="Trigger Time"
                                onChange={(e) => handleInputChange('trigger_time', e.target.value)}
                              >
                                {TRIGGER_TIMES.map((trigger) => (
                                  <MenuItem key={trigger.value} value={trigger.value}>
                                    {trigger.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
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
                        </>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>

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
                          {PROGRESSION_CONDITIONS.map((condition) => (
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