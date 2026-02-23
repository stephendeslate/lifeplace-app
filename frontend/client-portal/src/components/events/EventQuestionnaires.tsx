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
  LinearProgress,
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
  Warning as OverdueIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useEventQuestionnaires } from '../../hooks/useEventQuestionnaires';
import type {
  QuestionnaireField,
  QuestionnaireResponse,
  EventQuestionnaire,
  EventQuestionnaireStatus,
} from '../../types/questionnaires.types';

interface EventQuestionnairesProps {
  eventId: number;
}

interface ResponseFormData {
  [fieldId: number]: string | string[];
}

// Status chip colors and labels
const STATUS_CONFIG: Record<
  EventQuestionnaireStatus,
  { color: 'default' | 'primary' | 'warning' | 'success'; label: string }
> = {
  PENDING: { color: 'default', label: 'Pending' },
  SENT: { color: 'primary', label: 'Awaiting Response' },
  PARTIAL: { color: 'warning', label: 'In Progress' },
  COMPLETE: { color: 'success', label: 'Complete' },
};

const EventQuestionnaires: React.FC<EventQuestionnairesProps> = ({ eventId }) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<ResponseFormData>({});
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  const { useEventQuestionnairesForEvent, useEventResponses, useSaveEventResponses } =
    useEventQuestionnaires();

  // Fetch EventQuestionnaire assignments for this event
  const {
    data: eventQuestionnaires = [],
    isLoading: isLoadingQuestionnaires,
    error: questionnairesError,
    refetch: refetchQuestionnaires,
  } = useEventQuestionnairesForEvent(eventId);

  const {
    data: responses = [],
    isLoading: isLoadingResponses,
    error: responsesError,
  } = useEventResponses(eventId);

  const saveResponsesMutation = useSaveEventResponses();

  // Initialize form data with existing responses
  useEffect(() => {
    if (responses && responses.length > 0 && eventQuestionnaires.length > 0) {
      const initialData: ResponseFormData = {};
      responses.forEach((response: QuestionnaireResponse) => {
        // Handle multi-select values (stored as comma-separated strings)
        const field = eventQuestionnaires
          .flatMap((eq) => eq.questionnaire_detail?.fields || [])
          .find((f) => f.id === response.field);

        if (field?.type === 'multi-select') {
          initialData[response.field] = response.value ? response.value.split(',') : [];
        } else {
          initialData[response.field] = response.value;
        }
      });
      setFormData(initialData);
    }
  }, [responses, eventQuestionnaires]);

  const handlePanelChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleFieldChange = (fieldId: number, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
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
          value: Array.isArray(value) ? value.join(',') : String(value),
        })),
    };

    saveResponsesMutation.mutate(responsesData, {
      onSuccess: () => {
        setEditMode(false);
        refetchQuestionnaires();
      },
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    // Reset form data to saved responses
    if (responses && responses.length > 0) {
      const savedData: ResponseFormData = {};
      responses.forEach((response: QuestionnaireResponse) => {
        const field = eventQuestionnaires
          .flatMap((eq) => eq.questionnaire_detail?.fields || [])
          .find((f) => f.id === response.field);

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
            helperText={field.description}
            placeholder={field.placeholder}
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
            helperText={field.description}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={field.name}
              value={value ? new Date(value as string) : null}
              onChange={(date) =>
                handleFieldChange(field.id, date?.toISOString().split('T')[0] || '')
              }
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: field.required,
                  helperText: field.description,
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
              onChange={(time) =>
                handleFieldChange(field.id, time?.toTimeString().split(' ')[0] || '')
              }
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: field.required,
                  helperText: field.description,
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
            {field.description && <FormHelperText>{field.description}</FormHelperText>}
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
            {field.description && <FormHelperText>{field.description}</FormHelperText>}
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
            {field.description && <FormHelperText>{field.description}</FormHelperText>}
          </FormControl>
        );

      default:
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            helperText={field.description}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const renderStatusIcon = (eq: EventQuestionnaire) => {
    if (eq.status === 'COMPLETE') {
      return <CompleteIcon color="success" />;
    }
    if (eq.is_overdue) {
      return <OverdueIcon color="error" />;
    }
    if (eq.status === 'PENDING') {
      return <PendingIcon color="action" />;
    }
    if (eq.status === 'PARTIAL') {
      return <IncompleteIcon color="warning" />;
    }
    return <IncompleteIcon color="action" />;
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

  if (!eventQuestionnaires || eventQuestionnaires.length === 0) {
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
          Questionnaires for this event will appear here when assigned.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box role="region" aria-label="Event questionnaires">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Event Questionnaires</Typography>
        {!editMode ? (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              setEditMode(true);
              if (eventQuestionnaires.length > 0) {
                setExpandedPanel(eventQuestionnaires[0].id.toString());
              }
            }}
          >
            Edit Responses
          </Button>
        ) : (
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel}>
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
      {eventQuestionnaires.map((eq) => {
        const stats = eq.completion_stats;
        const statusConfig = STATUS_CONFIG[eq.status];
        const fields = eq.questionnaire_detail?.fields || [];

        return (
          <Accordion
            key={eq.id}
            expanded={expandedPanel === eq.id.toString()}
            onChange={handlePanelChange(eq.id.toString())}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {renderStatusIcon(eq)}
                    <Typography variant="subtitle1">{eq.questionnaire_name}</Typography>
                    <Chip label={statusConfig.label} size="small" color={statusConfig.color} />
                    {eq.is_overdue && <Chip label="Overdue" size="small" color="error" />}
                  </Stack>
                  {eq.due_date && !eq.is_overdue && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 5 }}>
                      Due: {format(new Date(eq.due_date), 'MMM d, yyyy')}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">
                    {stats.answered_count} of {stats.total_fields} fields
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={stats.completion_percentage}
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                    color={stats.completion_percentage === 100 ? 'success' : 'primary'}
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {editMode && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You are editing responses for this questionnaire. Fields marked with * are
                  required.
                </Alert>
              )}

              {eq.is_overdue && !editMode && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This questionnaire is overdue. Please complete it as soon as possible.
                </Alert>
              )}

              <Stack spacing={3}>
                {fields.map((field, index) => (
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
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1, display: 'block' }}
                        >
                          Last updated: {format(new Date(), 'MMM d, yyyy')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>

              {fields.length === 0 && (
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
            {eventQuestionnaires.map((eq) => {
              const stats = eq.completion_stats;
              const statusConfig = STATUS_CONFIG[eq.status];

              return (
                <ListItem key={eq.id}>
                  <ListItemText
                    primary={eq.questionnaire_name}
                    secondary={
                      eq.status === 'COMPLETE'
                        ? 'All fields completed'
                        : `${stats.answered_count}/${stats.total_fields} fields completed`
                    }
                  />
                  <Chip label={statusConfig.label} size="small" color={statusConfig.color} />
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
