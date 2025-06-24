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
  Card,
  CardContent,
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
} from '@mui/material';
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

  const {
    useAvailableQuestionnaires,
    assignQuestionnaires,
    isAssigningQuestionnaires,
  } = useBookingFlowStepConfiguration();

  const { data: availableQuestionnaires = [] } = useAvailableQuestionnaires(step.id);

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

  const handleInputChange = (field: keyof QuestionnaireConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | 
           { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
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

  const handleAddQuestionnaires = () => {
    if (selectedQuestionnaires.length > 0) {
      assignQuestionnaires({
        stepId: step.id,
        data: { questionnaire_ids: selectedQuestionnaires }
      });
      setSelectedQuestionnaires([]);
      setAddDialogOpen(false);
    }
  };

  const handleRemoveQuestionnaire = (itemId: number) => {
    const updatedItems = questionnaireItems.filter(item => item.id !== itemId);
    setQuestionnaireItems(updatedItems);
  };


  const handleSave = () => {
    onUpdate({
      allow_file_uploads: formData.allow_file_uploads,
      max_file_size_mb: formData.max_file_size_mb,
      allowed_file_types: formData.allowed_file_types,
    });
  };

  const getQuestionnaireNotAssigned = () => {
    const assignedIds = questionnaireItems.map(item => item.questionnaire);
    return availableQuestionnaires.filter(q => !assignedIds.includes(q.id));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Questionnaire Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure which questionnaires to show and file upload settings for this step.
      </Alert>

      <Stack spacing={3}>
        {/* Assigned Questionnaires */}
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                Assigned Questionnaires ({questionnaireItems.length})
              </Typography>
              
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                size="small"
              >
                Add Questionnaire
              </Button>
            </Box>

            {questionnaireItems.length === 0 ? (
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
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* File Upload Settings */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              File Upload Settings
            </Typography>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allow_file_uploads}
                    onChange={handleSwitchChange('allow_file_uploads')}
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
                    helperText="Maximum file size allowed per upload"
                    inputProps={{ min: 1, max: 100 }}
                  />

                  <FormControl fullWidth>
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
                          <ListItemText primary={option.label} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card variant="outlined">
          <CardContent>
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
                    <strong>Allowed Types:</strong> {formData.allowed_file_types.join(', ').toUpperCase()}
                  </Typography>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setFormData(defaultFormData)}
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
          
          {getQuestionnaireNotAssigned().length === 0 ? (
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
                  sx={{ width: '100%', textAlign: 'left' }}
                >
                  <Checkbox
                    checked={selectedQuestionnaires.includes(questionnaire.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                  <ListItemText
                    primary={questionnaire.name}
                    secondary={`${questionnaire.fields_count || 0} fields`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>
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