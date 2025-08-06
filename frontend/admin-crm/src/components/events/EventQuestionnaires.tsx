// frontend/admin-crm/src/components/events/EventQuestionnaires.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Assignment as QuestionnaireIcon,
  ExpandMore,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as IncompleteIcon,
  Add as AddIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useQuestionnaires, useQuestionnaireResponses } from '../../hooks/useQuestionnaires';
import type { 
  Questionnaire, 
  QuestionnaireField, 
  QuestionnaireResponse,
  SaveEventResponsesData 
} from '../../types/questionnaires.types';
import type { Event } from '../../types/events.types';

interface EventQuestionnairesProps {
  event: Event;
}

interface ResponseFormData {
  [fieldId: number]: string;
}

export const EventQuestionnaires: React.FC<EventQuestionnairesProps> = ({ event }) => {
  const [editMode, setEditMode] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [formData, setFormData] = useState<ResponseFormData>({});
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  // Fetch questionnaires based on event type
  const { useActiveQuestionnaires } = useQuestionnaires();
  const { data: allQuestionnaires = [], isLoading: isLoadingQuestionnaires } = useActiveQuestionnaires();
  
  // Filter questionnaires for this event type or universal ones
  const questionnaires = allQuestionnaires.filter(q => 
    q.event_type === event.event_type || q.event_type === null
  );

  // Fetch responses for this event
  const { 
    responses,
    isLoadingResponses,
    saveEventResponses,
    isSavingEventResponses,
    refetchResponses
  } = useQuestionnaireResponses({ event_id: event.id });

  // Initialize form data with existing responses
  useEffect(() => {
    if (responses && responses.length > 0) {
      const initialData: ResponseFormData = {};
      responses.forEach(response => {
        initialData[response.field] = response.value;
      });
      setFormData(initialData);
    }
  }, [responses]);

  const handlePanelChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleFieldChange = (fieldId: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedQuestionnaire) return;

    const responsesData: SaveEventResponsesData = {
      event: event.id,
      responses: Object.entries(formData)
        .filter(([fieldId, value]) => {
          // Only include fields from the selected questionnaire
          const field = selectedQuestionnaire.fields?.find(f => f.id === parseInt(fieldId));
          return field && value !== '';
        })
        .map(([fieldId, value]) => ({
          field: parseInt(fieldId),
          value
        }))
    };

    saveEventResponses(responsesData, {
      onSuccess: () => {
        setEditMode(false);
        refetchResponses();
      }
    });
  };

  const renderFieldInput = (field: QuestionnaireField) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            placeholder={field.type === 'phone' ? '(123) 456-7890' : undefined}
            required={field.required}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            required={field.required}
          />
        );

      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            required={field.required}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'time':
        return (
          <TextField
            fullWidth
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            required={field.required}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value === 'true'}
                onChange={(e) => handleFieldChange(field.id, e.target.checked ? 'true' : 'false')}
                disabled={!editMode}
              />
            }
            label={value === 'true' ? 'Yes' : 'No'}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth disabled={!editMode}>
            <Select
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value as string)}
              required={field.required}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multi-select':
        const selectedValues = value ? value.split(',') : [];
        return (
          <FormControl fullWidth disabled={!editMode}>
            <Select
              multiple
              value={selectedValues}
              onChange={(e) => {
                const values = e.target.value as string[];
                handleFieldChange(field.id, values.join(','));
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              required={field.required}
            >
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      default:
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            multiline
            rows={3}
            required={field.required}
          />
        );
    }
  };

  const getCompletionStatus = (questionnaire: Questionnaire) => {
    if (!questionnaire.fields) return { completed: 0, total: 0 };
    
    const requiredFields = questionnaire.fields.filter(f => f.required);
    const completedRequired = requiredFields.filter(f => formData[f.id] && formData[f.id] !== '');
    
    return {
      completed: completedRequired.length,
      total: requiredFields.length
    };
  };

  if (isLoadingQuestionnaires || isLoadingResponses) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (questionnaires.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <QuestionnaireIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Questionnaires Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No questionnaires have been configured for this event type.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Event Questionnaires
        </Typography>
        {!editMode ? (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              setEditMode(true);
              if (questionnaires.length > 0 && !selectedQuestionnaire) {
                setSelectedQuestionnaire(questionnaires[0]);
                setExpandedPanel(questionnaires[0].id.toString());
              }
            }}
          >
            Edit Responses
          </Button>
        ) : (
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => {
                setEditMode(false);
                // Reset form data to saved responses
                if (responses && responses.length > 0) {
                  const savedData: ResponseFormData = {};
                  responses.forEach(response => {
                    savedData[response.field] = response.value;
                  });
                  setFormData(savedData);
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isSavingEventResponses}
            >
              {isSavingEventResponses ? 'Saving...' : 'Save Responses'}
            </Button>
          </Stack>
        )}
      </Box>

      {/* Questionnaires */}
      {questionnaires.map((questionnaire) => {
        const status = getCompletionStatus(questionnaire);
        const isComplete = status.total > 0 && status.completed === status.total;

        return (
          <Accordion
            key={questionnaire.id}
            expanded={expandedPanel === questionnaire.id.toString()}
            onChange={handlePanelChange(questionnaire.id.toString())}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {isComplete ? (
                      <CompleteIcon color="success" />
                    ) : (
                      <IncompleteIcon color="action" />
                    )}
                    <Typography variant="subtitle1">
                      {questionnaire.name}
                    </Typography>
                    {questionnaire.event_type_name && (
                      <Chip 
                        label={questionnaire.event_type_name} 
                        size="small" 
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {status.completed} of {status.total} required fields completed
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {editMode && selectedQuestionnaire?.id === questionnaire.id && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You are editing responses for this questionnaire. Fields marked with * are required.
                </Alert>
              )}
              
              <Stack spacing={3}>
                {questionnaire.fields?.map((field, index) => (
                  <Box key={field.id}>
                    {index > 0 && <Divider sx={{ mb: 2 }} />}
                    <FormGroup>
                      <Typography variant="subtitle2" gutterBottom>
                        {field.name}
                        {field.required && (
                          <Typography component="span" color="error" sx={{ ml: 0.5 }}>
                            *
                          </Typography>
                        )}
                      </Typography>
                      {renderFieldInput(field)}
                      {formData[field.id] && !editMode && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Last updated: {format(new Date(), 'MMM d, yyyy')}
                        </Typography>
                      )}
                    </FormGroup>
                  </Box>
                ))}
              </Stack>

              {questionnaire.fields?.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  This questionnaire has no fields configured.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Summary Card */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Response Summary
          </Typography>
          <List dense>
            {questionnaires.map((questionnaire) => {
              const status = getCompletionStatus(questionnaire);
              const isComplete = status.total > 0 && status.completed === status.total;
              
              return (
                <ListItem key={questionnaire.id}>
                  <ListItemText
                    primary={questionnaire.name}
                    secondary={
                      isComplete 
                        ? 'All required fields completed'
                        : `${status.completed}/${status.total} required fields completed`
                    }
                  />
                  {isComplete && <CompleteIcon color="success" fontSize="small" />}
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};