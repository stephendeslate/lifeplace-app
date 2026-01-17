// frontend/client-portal/src/components/events/EventQuestionnaires.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Skeleton,
  Chip,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormHelperText,
  InputLabel,
  OutlinedInput,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Assignment as QuestionnaireIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as IncompleteIcon,
  ExpandMore,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useEventQuestionnaires } from '../../hooks/useEventQuestionnaires';
import type { Questionnaire, QuestionnaireField, QuestionnaireResponse } from '../../types/questionnaires.types';

interface EventQuestionnairesProps {
  eventId: number;
}

interface ResponseFormData {
  [fieldId: number]: string | string[];
}

const EventQuestionnaires: React.FC<EventQuestionnairesProps> = ({ eventId }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<ResponseFormData>({});
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  const { useQuestionnairesForEvent, useEventResponses, useSaveEventResponses } = useEventQuestionnaires();

  const {
    data: questionnaires = [],
    isLoading: isLoadingQuestionnaires,
    error: questionnairesError
  } = useQuestionnairesForEvent(eventId);

  const {
    data: responses = [],
    isLoading: isLoadingResponses,
    error: responsesError
  } = useEventResponses(eventId);

  const saveResponsesMutation = useSaveEventResponses();

  // Initialize form data with existing responses
  useEffect(() => {
    if (responses && responses.length > 0) {
      const initialData: ResponseFormData = {};
      responses.forEach((response: QuestionnaireResponse) => {
        // Handle multi-select values (stored as comma-separated strings)
        const field = questionnaires
          .flatMap(q => q.fields)
          .find(f => f.id === response.field);

        if (field?.type === 'multi-select') {
          initialData[response.field] = response.value ? response.value.split(',') : [];
        } else {
          initialData[response.field] = response.value;
        }
      });
      setFormData(initialData);
    }
  }, [responses, questionnaires]);

  const handlePanelChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleFieldChange = (fieldId: number, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSave = async () => {
    const responsesData = {
      event_id: eventId,
      responses: Object.entries(formData)
        .filter(([_, value]) => {
          // Filter out empty values
          if (Array.isArray(value)) {
            return value.length > 0;
          }
          return value !== '' && value !== null && value !== undefined;
        })
        .map(([fieldId, value]) => ({
          field_id: parseInt(fieldId),
          value: Array.isArray(value) ? value.join(',') : String(value)
        }))
    };

    saveResponsesMutation.mutate(responsesData, {
      onSuccess: () => {
        setEditMode(false);
      }
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    // Reset form data to saved responses
    if (responses && responses.length > 0) {
      const savedData: ResponseFormData = {};
      responses.forEach((response: QuestionnaireResponse) => {
        const field = questionnaires
          .flatMap(q => q.fields)
          .find(f => f.id === response.field);

        if (field?.type === 'multi-select') {
          savedData[response.field] = response.value ? response.value.split(',') : [];
        } else {
          savedData[response.field] = response.value;
        }
      });
      setFormData(savedData);
    }
  };

  const renderFieldInput = (field: QuestionnaireField) => {
    const value = formData[field.id] || (field.type === 'multi-select' ? [] : '');

    if (!editMode) {
      // View mode - display value as read-only
      let displayValue = '';
      if (Array.isArray(value)) {
        displayValue = value.join(', ');
      } else if (field.type === 'boolean') {
        displayValue = value === 'true' ? 'Yes' : 'No';
      } else if (field.type === 'date' && value) {
        displayValue = format(new Date(value as string), 'MMM dd, yyyy');
      } else {
        displayValue = String(value || '-');
      }

      return (
        <Typography variant="body1" color={value ? 'text.primary' : 'text.secondary'}>
          {displayValue}
        </Typography>
      );
    }

    // Edit mode - show appropriate input
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            required={field.required}
            helperText={field.help_text}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            helperText={field.help_text}
          />
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={field.name}
              value={value ? new Date(value as string) : null}
              onChange={(date) => handleFieldChange(field.id, date?.toISOString().split('T')[0] || '')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: field.required,
                  helperText: field.help_text,
                },
              }}
            />
          </LocalizationProvider>
        );

      case 'time':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <TimePicker
              label={field.name}
              value={value ? new Date(`2000-01-01T${value}`) : null}
              onChange={(time) => handleFieldChange(field.id, time?.toTimeString().split(' ')[0] || '')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: field.required,
                  helperText: field.help_text,
                },
              }}
            />
          </LocalizationProvider>
        );

      case 'boolean':
        return (
          <FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={value === 'true'}
                  onChange={(e) => handleFieldChange(field.id, e.target.checked ? 'true' : 'false')}
                />
              }
              label={value === 'true' ? 'Yes' : 'No'}
            />
            {field.help_text && (
              <FormHelperText>{field.help_text}</FormHelperText>
            )}
          </FormControl>
        );

      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.name}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              label={field.name}
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
            {field.help_text && (
              <FormHelperText>{field.help_text}</FormHelperText>
            )}
          </FormControl>
        );

      case 'multi-select':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.name}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => handleFieldChange(field.id, e.target.value as string[])}
              input={<OutlinedInput label={field.name} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => (
                    <Chip key={val} label={val} size="small" />
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
            {field.help_text && (
              <FormHelperText>{field.help_text}</FormHelperText>
            )}
          </FormControl>
        );

      default:
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            helperText={field.help_text}
          />
        );
    }
  };

  const getCompletionStatus = (questionnaire: Questionnaire) => {
    const allFields = questionnaire.fields || [];
    const completedFields = allFields.filter(field => {
      const response = formData[field.id];
      if (Array.isArray(response)) {
        return response.length > 0;
      }
      return response !== undefined && response !== null && response !== '';
    });

    return {
      completed: completedFields.length,
      total: allFields.length,
      isComplete: completedFields.length === allFields.length && allFields.length > 0
    };
  };

  const loading = isLoadingQuestionnaires || isLoadingResponses;
  const error = questionnairesError || responsesError;

  if (loading) {
    return (
      <Box>
        <Stack spacing={2}>
          {[1, 2, 3].map((item) => (
            <Paper key={item} sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="rectangular" width={80} height={24} />
                </Box>
                <Skeleton variant="rectangular" height={100} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load questionnaires. Please try again later.
      </Alert>
    );
  }

  if (!questionnaires || questionnaires.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: 'grey.50',
        }}
      >
        <QuestionnaireIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No questionnaires available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Questionnaires for this event will appear here when available.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box role="region" aria-label="Event questionnaires">
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
              if (questionnaires.length > 0) {
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
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saveResponsesMutation.isPending}
            >
              {saveResponsesMutation.isPending ? 'Saving...' : 'Save Responses'}
            </Button>
          </Stack>
        )}
      </Box>

      {/* Questionnaires Accordions */}
      {questionnaires.map((questionnaire) => {
        const status = getCompletionStatus(questionnaire);

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
                    {status.isComplete ? (
                      <CompleteIcon color="success" />
                    ) : (
                      <IncompleteIcon color="action" />
                    )}
                    <Typography variant="subtitle1">
                      {questionnaire.name}
                    </Typography>
                  </Stack>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {status.completed} of {status.total} fields completed
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {editMode && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You are editing responses for this questionnaire. Fields marked with * are required.
                </Alert>
              )}

              <Stack spacing={3}>
                {questionnaire.fields?.map((field, index) => (
                  <Box key={field.id}>
                    {index > 0 && <Divider sx={{ mb: 2 }} />}
                    <Box>
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
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Last updated: {format(new Date(), 'MMM d, yyyy')}
                        </Typography>
                      )}
                    </Box>
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

              return (
                <ListItem key={questionnaire.id}>
                  <ListItemText
                    primary={questionnaire.name}
                    secondary={
                      status.isComplete
                        ? 'All fields completed'
                        : `${status.completed}/${status.total} fields completed`
                    }
                  />
                  {status.isComplete && <CompleteIcon color="success" fontSize="small" />}
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EventQuestionnaires;