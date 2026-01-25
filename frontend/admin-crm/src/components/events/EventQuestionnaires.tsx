// frontend/admin-crm/src/components/events/EventQuestionnaires.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  Menu,
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
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Assignment as QuestionnaireIcon,
  ExpandMore,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as IncompleteIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Send as SendIcon,
  NotificationsActive as ReminderIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Schedule as PendingIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useQuestionnaireResponses } from '../../hooks/useQuestionnaires';
import {
  useEventQuestionnairesForEvent,
  useDeleteEventQuestionnaire,
  useSendEventQuestionnaire,
  useSendQuestionnaireReminder,
} from '../../hooks/useEventQuestionnaires';
import type {
  QuestionnaireField,
  SaveEventResponsesData,
  EventQuestionnaire,
  EventQuestionnaireStatus,
} from '../../types/questionnaires.types';
import type { Event } from '../../types/events.types';
import { AssignQuestionnaireDialog } from './AssignQuestionnaireDialog';

interface EventQuestionnairesProps {
  event: Event;
}

interface ResponseFormData {
  [fieldId: number]: string;
}

// Status chip colors and labels
const STATUS_CONFIG: Record<EventQuestionnaireStatus, { color: 'default' | 'primary' | 'warning' | 'success'; label: string }> = {
  PENDING: { color: 'default', label: 'Pending' },
  SENT: { color: 'primary', label: 'Sent' },
  PARTIAL: { color: 'warning', label: 'In Progress' },
  COMPLETE: { color: 'success', label: 'Complete' },
};

export const EventQuestionnaires: React.FC<EventQuestionnairesProps> = ({ event }) => {
  const [editMode, setEditMode] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<EventQuestionnaire | null>(null);
  const [formData, setFormData] = useState<ResponseFormData>({});
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTargetId, setMenuTargetId] = useState<number | null>(null);

  // Fetch EventQuestionnaire assignments for this event
  const {
    data: eventQuestionnaires = [],
    isLoading: isLoadingQuestionnaires,
    refetch: refetchEventQuestionnaires,
  } = useEventQuestionnairesForEvent(event.id);

  // Fetch responses for this event
  const {
    responses,
    isLoadingResponses,
    saveEventResponses,
    isSavingEventResponses,
    refetchResponses
  } = useQuestionnaireResponses({ event_id: event.id });

  // Mutations
  const deleteEventQuestionnaire = useDeleteEventQuestionnaire();
  const sendEventQuestionnaire = useSendEventQuestionnaire();
  const sendReminder = useSendQuestionnaireReminder();

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
    if (!selectedQuestionnaire?.questionnaire_detail) return;

    const responsesData: SaveEventResponsesData = {
      event: event.id,
      responses: Object.entries(formData)
        .filter(([fieldId, value]) => {
          // Only include fields from the selected questionnaire
          const field = selectedQuestionnaire.questionnaire_detail?.fields?.find(
            f => f.id === parseInt(fieldId)
          );
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
        refetchEventQuestionnaires();
      }
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, questionnaireId: number) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuTargetId(questionnaireId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuTargetId(null);
  };

  const handleSend = (id: number) => {
    sendEventQuestionnaire.mutate(id, {
      onSuccess: () => {
        refetchEventQuestionnaires();
      },
    });
    handleMenuClose();
  };

  const handleSendReminder = (id: number) => {
    sendReminder.mutate(id, {
      onSuccess: () => {
        refetchEventQuestionnaires();
      },
    });
    handleMenuClose();
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to remove this questionnaire assignment?')) {
      deleteEventQuestionnaire.mutate(id, {
        onSuccess: () => {
          refetchEventQuestionnaires();
        },
      });
    }
    handleMenuClose();
  };

  const handleAssignSuccess = () => {
    refetchEventQuestionnaires();
  };

  const renderFieldInput = (field: QuestionnaireField) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone': {
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            placeholder={field.placeholder || (field.type === 'phone' ? '(123) 456-7890' : undefined)}
            required={field.required}
            helperText={field.description}
          />
        );
      }

      case 'number': {
        return (
          <TextField
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            required={field.required}
            placeholder={field.placeholder}
            helperText={field.description}
          />
        );
      }

      case 'date': {
        return (
          <TextField
            fullWidth
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            required={field.required}
            InputLabelProps={{ shrink: true }}
            helperText={field.description}
          />
        );
      }

      case 'time': {
        return (
          <TextField
            fullWidth
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            required={field.required}
            InputLabelProps={{ shrink: true }}
            helperText={field.description}
          />
        );
      }

      case 'boolean': {
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
      }

      case 'select': {
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
      }

      case 'multi-select': {
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
      }

      default: {
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={!editMode}
            multiline
            rows={3}
            required={field.required}
            placeholder={field.placeholder}
            helperText={field.description}
          />
        );
      }
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
    return <SendIcon color="primary" />;
  };

  if (isLoadingQuestionnaires || isLoadingResponses) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Event Questionnaires
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialogOpen(true)}
          >
            Assign Questionnaire
          </Button>
          {!editMode && eventQuestionnaires.length > 0 && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setEditMode(true);
                if (eventQuestionnaires.length > 0) {
                  setSelectedQuestionnaire(eventQuestionnaires[0]);
                  setExpandedPanel(eventQuestionnaires[0].id.toString());
                }
              }}
            >
              Edit Responses
            </Button>
          )}
          {editMode && (
            <>
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
            </>
          )}
        </Stack>
      </Box>

      {eventQuestionnaires.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <QuestionnaireIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Questionnaires Assigned
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Assign questionnaires to this event to collect additional information from the client.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialogOpen(true)}
          >
            Assign Questionnaire
          </Button>
        </Paper>
      ) : (
        <>
          {/* Questionnaires */}
          {eventQuestionnaires.map((eq) => {
            const stats = eq.completion_stats;
            const statusConfig = STATUS_CONFIG[eq.status];

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
                        <Typography variant="subtitle1">
                          {eq.questionnaire_name}
                        </Typography>
                        <Chip
                          label={statusConfig.label}
                          size="small"
                          color={statusConfig.color}
                        />
                        {eq.is_overdue && (
                          <Chip
                            label="Overdue"
                            size="small"
                            color="error"
                          />
                        )}
                        {eq.due_date && !eq.is_overdue && (
                          <Typography variant="caption" color="text.secondary">
                            Due: {format(new Date(eq.due_date), 'MMM d, yyyy')}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
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
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, eq.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Status info */}
                  {eq.status === 'PENDING' && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This questionnaire has not been sent to the client yet.
                      <Button
                        size="small"
                        sx={{ ml: 2 }}
                        onClick={() => handleSend(eq.id)}
                        disabled={sendEventQuestionnaire.isPending}
                      >
                        Send Now
                      </Button>
                    </Alert>
                  )}
                  {eq.is_overdue && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      This questionnaire is overdue. Consider sending a reminder to the client.
                      <Button
                        size="small"
                        sx={{ ml: 2 }}
                        onClick={() => handleSendReminder(eq.id)}
                        disabled={sendReminder.isPending}
                      >
                        Send Reminder
                      </Button>
                    </Alert>
                  )}

                  {editMode && selectedQuestionnaire?.id === eq.id && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      You are editing responses for this questionnaire. Fields marked with * are required.
                    </Alert>
                  )}

                  <Stack spacing={3}>
                    {eq.questionnaire_detail?.fields?.map((field, index) => (
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

                  {(!eq.questionnaire_detail?.fields || eq.questionnaire_detail.fields.length === 0) && (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                      This questionnaire has no fields configured.
                    </Typography>
                  )}

                  {/* Activity Log */}
                  {eq.activities && eq.activities.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Activity Log
                      </Typography>
                      <List dense>
                        {eq.activities.slice(0, 5).map((activity) => (
                          <ListItem key={activity.id} disablePadding>
                            <ListItemText
                              primary={activity.action_display}
                              secondary={`${format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}${activity.action_by_name ? ` by ${activity.action_by_name}` : ''}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* Summary Card */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Questionnaire Summary
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
                      <Chip
                        label={statusConfig.label}
                        size="small"
                        color={statusConfig.color}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {menuTargetId && (() => {
          const targetEq = eventQuestionnaires.find(eq => eq.id === menuTargetId);
          if (!targetEq) return null;

          return (
            <>
              {targetEq.status === 'PENDING' && (
                <MenuItem onClick={() => handleSend(menuTargetId)}>
                  <SendIcon sx={{ mr: 1 }} fontSize="small" />
                  Send to Client
                </MenuItem>
              )}
              {['SENT', 'PARTIAL'].includes(targetEq.status) && (
                <MenuItem onClick={() => handleSendReminder(menuTargetId)}>
                  <ReminderIcon sx={{ mr: 1 }} fontSize="small" />
                  Send Reminder
                </MenuItem>
              )}
              <MenuItem onClick={() => handleDelete(menuTargetId)} sx={{ color: 'error.main' }}>
                <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                Remove
              </MenuItem>
            </>
          );
        })()}
      </Menu>

      {/* Assign Dialog */}
      <AssignQuestionnaireDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        eventId={event.id}
        eventTypeId={event.event_type || undefined}
        existingAssignments={eventQuestionnaires.map(eq => eq.questionnaire)}
        onSuccess={handleAssignSuccess}
      />
    </Box>
  );
};
