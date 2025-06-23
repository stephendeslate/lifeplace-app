// frontend/admin-crm/src/components/workflows/WorkflowTemplateForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useEventTypes } from '../../hooks/useEvents';
import { WorkflowStagesTable } from './WorkflowStagesTable';
import { WorkflowStageFormDialog } from './WorkflowStageFormDialog';
import { useWorkflowStages } from '../../hooks/useWorkflows';
import type { 
  WorkflowTemplate, 
  CreateWorkflowTemplateData, 
  UpdateWorkflowTemplateData,
  WorkflowStage,
  CreateWorkflowStageData,
  UpdateWorkflowStageData 
} from '../../types/workflows.types';

interface WorkflowTemplateFormProps {
  template?: WorkflowTemplate;
  onSave: (data: CreateWorkflowTemplateData | UpdateWorkflowTemplateData) => void;
  onCancel: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workflow-tabpanel-${index}`}
      aria-labelledby={`workflow-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

export const WorkflowTemplateForm: React.FC<WorkflowTemplateFormProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateWorkflowTemplateData>({
    name: '',
    description: '',
    event_type: null,
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);

  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();

  const {
    useStagesForTemplate,
    createStage,
    updateStage,
    deleteStage,
    isCreatingStage,
    isUpdatingStage,
    isDeletingStage,
  } = useWorkflowStages();

  const { data: stages = [], refetch: refetchStages } = useStagesForTemplate(template?.id || 0);

  const isEditing = !!template;
  const isLoading = isCreatingStage || isUpdatingStage;

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        event_type: template.event_type,
        is_active: template.is_active,
      });
    }
  }, [template]);

  const handleInputChange = (field: keyof CreateWorkflowTemplateData, value: any) => {
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
      newErrors.name = 'Template name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Pass the form data to the parent component
    onSave(formData);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddStage = () => {
    setEditingStage(null);
    setStageDialogOpen(true);
  };

  const handleEditStage = (stage: WorkflowStage) => {
    setEditingStage(stage);
    setStageDialogOpen(true);
  };

  const handleDeleteStage = (id: number) => {
    deleteStage(id, {
      onSuccess: () => {
        refetchStages();
      }
    });
  };

  const handleStageDialogClose = () => {
    setStageDialogOpen(false);
    setEditingStage(null);
  };

  const handleStageSubmit = (data: CreateWorkflowStageData | UpdateWorkflowStageData) => {
    if (editingStage) {
      updateStage({ 
        id: editingStage.id, 
        data: data as UpdateWorkflowStageData 
      }, {
        onSuccess: () => {
          setStageDialogOpen(false);
          setEditingStage(null);
          refetchStages();
        }
      });
    } else {
      const stageData = {
        ...data,
        template: template?.id,
      } as CreateWorkflowStageData;
      
      createStage(stageData, {
        onSuccess: () => {
          setStageDialogOpen(false);
          refetchStages();
        }
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {isEditing ? 'Edit Workflow Template' : 'Create Workflow Template'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Basic Information" />
          <Tab label={`Stages (${stages.length})`} disabled={!isEditing} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Stack spacing={3}>
            {/* Basic Information */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Template Details
                </Typography>
                
                <Stack spacing={3}>
                  <TextField
                    label="Template Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={!!errors.name}
                    helperText={errors.name || 'A descriptive name for this workflow template'}
                    required
                    fullWidth
                  />

                  <TextField
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    helperText="Describe what this workflow accomplishes"
                  />

                  <FormControl fullWidth>
                    <InputLabel>Event Type (Optional)</InputLabel>
                    <Select
                      value={formData.event_type || ''}
                      label="Event Type (Optional)"
                      onChange={(e) => handleInputChange('event_type', e.target.value || null)}
                    >
                      <MenuItem value="">
                        <em>Any Event Type</em>
                      </MenuItem>
                      {eventTypes.map((eventType) => (
                        <MenuItem key={eventType.id} value={eventType.id}>
                          {eventType.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      />
                    }
                    label="Active Template"
                  />
                </Stack>
              </CardContent>
            </Card>

            {!isEditing && (
              <Alert severity="info">
                Save the template first to add and configure workflow stages.
              </Alert>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Stack spacing={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Workflow Stages
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddStage}
                disabled={!template}
              >
                Add Stage
              </Button>
            </Box>

            <Alert severity="info">
              Configure the stages that events will progress through. Each stage can have automated actions and progression conditions.
            </Alert>

            <Card>
              <WorkflowStagesTable
                stages={stages}
                isLoading={false}
                onEdit={handleEditStage}
                onDelete={handleDeleteStage}
                onReorder={() => {}} // TODO: Implement reordering
                isDeleting={isDeletingStage}
              />
            </Card>
          </Stack>
        </TabPanel>

        {/* Actions */}
        {activeTab === 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  isEditing ? 'Update Template' : 'Create Template'
                )}
              </Button>
            </Box>
          </>
        )}
      </Box>

      {/* Stage Form Dialog */}
      <WorkflowStageFormDialog
        open={stageDialogOpen}
        onClose={handleStageDialogClose}
        editingStage={editingStage}
        templateId={template?.id}
        onSubmit={handleStageSubmit}
        isLoading={isLoading}
      />
    </Box>
  );
};