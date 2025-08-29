// frontend/admin-crm/src/components/bookingflows/configurations/QuestionnaireStepConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText as MuiListItemText,
} from '@mui/material';

// Modern Design System imports
import { ModernCard } from '../../common/ModernCard';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  QuestionAnswer as QuestionnaireIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  QuestionnaireStepConfiguration,
  QuestionnaireStepItem,
} from '../../../types/bookingflows.types';
import { useBookingFlowStepConfiguration } from '../../../hooks/useBookingFlows';

interface QuestionnaireStepConfigProps {
  step: BookingFlowStep;
  config?: QuestionnaireStepConfiguration | null;
  onUpdate: (data: Partial<QuestionnaireStepConfiguration>) => void;
  isLoading?: boolean;
}

interface QuestionnaireConfigFormData {
  allow_file_uploads: boolean;
  max_file_size_mb: number;
  allowed_file_types: string[];
}

const defaultFormData: QuestionnaireConfigFormData = {
  allow_file_uploads: false,
  max_file_size_mb: 10,
  allowed_file_types: ['pdf', 'jpg', 'png', 'doc', 'docx'],
};

const FILE_TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF Documents' },
  { value: 'jpg', label: 'JPEG Images' },
  { value: 'png', label: 'PNG Images' },
  { value: 'gif', label: 'GIF Images' },
  { value: 'doc', label: 'Word Documents' },
  { value: 'docx', label: 'Word Documents (New)' },
  { value: 'txt', label: 'Text Files' },
  { value: 'csv', label: 'CSV Files' },
  { value: 'xlsx', label: 'Excel Files' },
];

export const QuestionnaireStepConfig: React.FC<QuestionnaireStepConfigProps> = ({
  step,
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<QuestionnaireConfigFormData>(defaultFormData);
  const [questionnaireItems, setQuestionnaireItems] = useState<QuestionnaireStepItem[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    useAvailableQuestionnaires,
    assignQuestionnaires,
    isAssigningQuestionnaires,
    updateConfiguration,
    isUpdatingConfiguration,
    assignQuestionnairesError,
    updateConfigurationError,
  } = useBookingFlowStepConfiguration();

  const { 
    data: availableQuestionnaires = [], 
    isLoading: isLoadingQuestionnaires,
    error: questionnairesError 
  } = useAvailableQuestionnaires(step.id);

  useEffect(() => {
    if (config) {
      setFormData({
        allow_file_uploads: config.allow_file_uploads ?? false,
        max_file_size_mb: config.max_file_size_mb ?? 10,
        allowed_file_types: config.allowed_file_types || defaultFormData.allowed_file_types,
      });
      setQuestionnaireItems(config.questionnaire_items || []);
    }
  }, [config]);

  // Clear errors when data changes
  useEffect(() => {
    if (assignQuestionnairesError || updateConfigurationError) {
      const errorMessage = assignQuestionnairesError?.message || 
                          updateConfigurationError?.message || 
                          'An error occurred';
      setErrors({ general: errorMessage });
    } else {
      setErrors({});
    }
  }, [assignQuestionnairesError, updateConfigurationError]);

  const handleInputChange = (field: keyof QuestionnaireConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | 
           { target: { value: unknown } }
  ) => {
    const value = event.target.value;
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

  const handleSwitchChange = (field: keyof QuestionnaireConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleFileTypesChange = (value: string[]) => {
    setFormData(prev => ({
      ...prev,
      allowed_file_types: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.allow_file_uploads) {
      if (formData.max_file_size_mb <= 0 || formData.max_file_size_mb > 100) {
        newErrors.max_file_size_mb = 'File size must be between 1 and 100 MB';
      }
      
      if (formData.allowed_file_types.length === 0) {
        newErrors.allowed_file_types = 'At least one file type must be allowed';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddQuestionnaires = async () => {
    if (selectedQuestionnaires.length > 0) {
      try {
        await assignQuestionnaires({
          stepId: step.id,
          data: { questionnaire_ids: selectedQuestionnaires }
        });
        setSelectedQuestionnaires([]);
        setAddDialogOpen(false);
        // The questionnaire items will be updated via the config prop when parent refreshes
      } catch (error) {
        // Error is handled by the hook and displayed via errors state
        console.error('Failed to assign questionnaires:', error);
      }
    }
  };

  const handleRemoveQuestionnaire = async (itemId: number) => {
    // Get the questionnaire ID from the item to remove
    const itemToRemove = questionnaireItems.find(item => item.id === itemId);
    if (!itemToRemove) return;

    // Create new list excluding the removed questionnaire
    const remainingItems = questionnaireItems.filter(item => item.id !== itemId);
    const remainingQuestionnaireIds = remainingItems.map(item => item.questionnaire);

    try {
      await assignQuestionnaires({
        stepId: step.id,
        data: { questionnaire_ids: remainingQuestionnaireIds }
      });
      // Update local state immediately for better UX
      setQuestionnaireItems(remainingItems);
    } catch (error) {
      console.error('Failed to remove questionnaire:', error);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await updateConfiguration({
        stepId: step.id,
        data: {
          allow_file_uploads: formData.allow_file_uploads,
          max_file_size_mb: formData.max_file_size_mb,
          allowed_file_types: formData.allowed_file_types,
        }
      });
      
      // Also call the parent onUpdate for any additional handling
      onUpdate({
        allow_file_uploads: formData.allow_file_uploads,
        max_file_size_mb: formData.max_file_size_mb,
        allowed_file_types: formData.allowed_file_types,
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const getQuestionnaireNotAssigned = () => {
    const assignedIds = questionnaireItems.map(item => item.questionnaire);
    return availableQuestionnaires.filter(q => !assignedIds.includes(q.id));
  };

  const isOperationLoading = isLoading || isUpdatingConfiguration || isAssigningQuestionnaires;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Questionnaire Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure which questionnaires to show and file upload settings for this step.
      </Alert>

      {/* General Errors */}
      {errors.general && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.general}
        </Alert>
      )}

      {questionnairesError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load available questionnaires. Please try refreshing the page.
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Assigned Questionnaires */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                Assigned Questionnaires ({questionnaireItems.length})
              </Typography>
              
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                size="small"
                disabled={isLoadingQuestionnaires || getQuestionnaireNotAssigned().length === 0}
              >
                Add Questionnaire
              </Button>
            </Box>

            {isLoadingQuestionnaires ? (
              <Alert severity="info">Loading available questionnaires...</Alert>
            ) : questionnaireItems.length === 0 ? (
              <Alert severity="warning">
                No questionnaires assigned. Clients will skip this step if no questionnaires are configured.
              </Alert>
            ) : (
              <List dense>
                {questionnaireItems
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                  <ListItem 
                    key={item.id}
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      mb: 1,
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <DragIcon color="action" sx={{ mr: 1, cursor: 'grab' }} />
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {item.questionnaire_details?.name || `Questionnaire ${item.questionnaire}`}
                          </Typography>
                          <Chip
                            label={`${item.questionnaire_details?.fields_count || 0} fields`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip
                            label={`Order: ${item.order}`}
                            size="small"
                            variant="outlined"
                          />
                          {item.is_conditional && (
                            <Chip
                              label="Conditional"
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveQuestionnaire(item.id)}
                        size="small"
                        color="error"
                        disabled={isAssigningQuestionnaires}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </ModernCard>

        {/* File Upload Settings */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              File Upload Settings
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allow_file_uploads}
                    onChange={handleSwitchChange('allow_file_uploads')}
                    disabled={isOperationLoading}
                  />
                }
                label="Allow File Uploads"
              />
              <Typography variant="caption" color="text.secondary">
                Allow clients to upload files as part of questionnaire responses
              </Typography>

              {formData.allow_file_uploads && (
                <>
                  <TextField
                    label="Maximum File Size (MB)"
                    type="number"
                    value={formData.max_file_size_mb}
                    onChange={handleInputChange('max_file_size_mb')}
                    error={!!errors.max_file_size_mb}
                    helperText={errors.max_file_size_mb || "Maximum file size allowed per upload"}
                    inputProps={{ min: 1, max: 100 }}
                    disabled={isOperationLoading}
                    sx={{ maxWidth: 300 }}
                  />

                  <FormControl 
                    fullWidth 
                    error={!!errors.allowed_file_types}
                    disabled={isOperationLoading}
                  >
                    <InputLabel>Allowed File Types</InputLabel>
                    <Select
                      multiple
                      value={formData.allowed_file_types}
                      onChange={(e) => handleFileTypesChange(e.target.value as string[])}
                      label="Allowed File Types"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value.toUpperCase()} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {FILE_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Checkbox checked={formData.allowed_file_types.includes(option.value)} />
                          <MuiListItemText primary={option.label} />
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.allowed_file_types && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.allowed_file_types}
                      </Typography>
                    )}
                  </FormControl>
                </>
              )}
            </Stack>
          </Box>
        </ModernCard>

        {/* Summary */}
        <ModernCard variant="glass" size="medium" animation="none">
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Configuration Summary
            </Typography>
            
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Questionnaires:</strong> {questionnaireItems.length} assigned
              </Typography>
              
              <Typography variant="body2">
                <strong>File Uploads:</strong> {formData.allow_file_uploads ? 'Enabled' : 'Disabled'}
              </Typography>
              
              {formData.allow_file_uploads && (
                <>
                  <Typography variant="body2">
                    <strong>Max File Size:</strong> {formData.max_file_size_mb} MB
                  </Typography>
                  
                  <Typography variant="body2">
                    <strong>Allowed Types:</strong> {formData.allowed_file_types.length > 0 ? formData.allowed_file_types.join(', ').toUpperCase() : 'None'}
                  </Typography>
                </>
              )}
            </Stack>
          </Box>
        </ModernCard>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isOperationLoading}
          >
            {isUpdatingConfiguration ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => {
              setFormData(defaultFormData);
              setErrors({});
            }}
            disabled={isOperationLoading}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Stack>

      {/* Add Questionnaire Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <QuestionnaireIcon color="primary" />
            Add Questionnaires
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select questionnaires to add to this step. They will be shown in the order selected.
          </Typography>
          
          {isLoadingQuestionnaires ? (
            <Alert severity="info">
              Loading available questionnaires...
            </Alert>
          ) : getQuestionnaireNotAssigned().length === 0 ? (
            <Alert severity="info">
              All available questionnaires are already assigned to this step.
            </Alert>
          ) : (
            <List>
              {getQuestionnaireNotAssigned().map((questionnaire) => (
                <ListItem 
                  key={questionnaire.id}
                  component="button"
                  onClick={() => {
                    const isSelected = selectedQuestionnaires.includes(questionnaire.id);
                    if (isSelected) {
                      setSelectedQuestionnaires(prev => prev.filter(id => id !== questionnaire.id));
                    } else {
                      setSelectedQuestionnaires(prev => [...prev, questionnaire.id]);
                    }
                  }}
                  sx={{ 
                    width: '100%', 
                    textAlign: 'left',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                  disabled={isAssigningQuestionnaires}
                >
                  <Checkbox
                    checked={selectedQuestionnaires.includes(questionnaire.id)}
                    tabIndex={-1}
                    disableRipple
                    disabled={isAssigningQuestionnaires}
                  />
                  <ListItemText
                    primary={questionnaire.name}
                    secondary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption">
                          {questionnaire.name}
                        </Typography>
                        {questionnaire.event_type && (
                          <Chip
                            label={`Event Type: ${questionnaire.event_type}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {questionnaire.is_active ? (
                          <Chip
                            label="Active"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label="Inactive"
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => {
              setAddDialogOpen(false);
              setSelectedQuestionnaires([]);
            }}
            disabled={isAssigningQuestionnaires}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddQuestionnaires}
            variant="contained"
            disabled={selectedQuestionnaires.length === 0 || isAssigningQuestionnaires}
          >
            {isAssigningQuestionnaires ? 'Adding...' : `Add ${selectedQuestionnaires.length} Questionnaire${selectedQuestionnaires.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};