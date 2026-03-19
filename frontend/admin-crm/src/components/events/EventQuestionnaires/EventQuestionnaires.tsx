import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormGroup,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
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
import type { EventQuestionnaire, EventQuestionnaireStatus } from '@/types/questionnaires.types';
import type { Event } from '@/types/events.types';
import { AssignQuestionnaireDialog } from '@/components/events/AssignQuestionnaireDialog';
import { useEventQuestionnairesLogic } from './useEventQuestionnairesLogic';
import { QuestionnaireFieldInput } from './QuestionnaireFieldInput';

interface EventQuestionnairesProps {
  event: Event;
}

const STATUS_CONFIG: Record<
  EventQuestionnaireStatus,
  { color: 'default' | 'primary' | 'warning' | 'success'; label: string }
> = {
  PENDING: { color: 'default', label: 'Pending' },
  SENT: { color: 'primary', label: 'Sent' },
  PARTIAL: { color: 'warning', label: 'In Progress' },
  COMPLETE: { color: 'success', label: 'Complete' },
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

export const EventQuestionnaires: React.FC<EventQuestionnairesProps> = ({ event }) => {
  const {
    editMode,
    selectedQuestionnaire,
    formData,
    expandedPanel,
    assignDialogOpen,
    setAssignDialogOpen,
    menuAnchorEl,
    menuTargetId,
    eventQuestionnaires,
    isLoadingQuestionnaires,
    isLoadingResponses,
    isSavingEventResponses,
    sendEventQuestionnaire,
    sendReminder,
    handlePanelChange,
    handleFieldChange,
    handleSave,
    handleMenuOpen,
    handleMenuClose,
    handleSend,
    handleSendReminder,
    handleDelete,
    handleAssignSuccess,
    handleStartEdit,
    handleCancelEdit,
  } = useEventQuestionnairesLogic(event.id);

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
        <Typography variant="h6">Event Questionnaires</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialogOpen(true)}
          >
            Assign Questionnaire
          </Button>
          {!editMode && eventQuestionnaires.length > 0 && (
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleStartEdit}>
              Edit Responses
            </Button>
          )}
          {editMode && (
            <>
              <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancelEdit}>
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
                        <Typography variant="subtitle1">{eq.questionnaire_name}</Typography>
                        <Chip label={statusConfig.label} size="small" color={statusConfig.color} />
                        {eq.is_overdue && <Chip label="Overdue" size="small" color="error" />}
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
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, eq.id)}>
                        <MoreVertIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
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
                      You are editing responses for this questionnaire. Fields marked with * are
                      required.
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
                          <QuestionnaireFieldInput
                            field={field}
                            value={formData[field.id] || ''}
                            editMode={editMode}
                            onFieldChange={handleFieldChange}
                          />
                          {formData[field.id] && !editMode && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                              Last updated: {format(new Date(), 'MMM d, yyyy')}
                            </Typography>
                          )}
                        </FormGroup>
                      </Box>
                    ))}
                  </Stack>

                  {(!eq.questionnaire_detail?.fields ||
                    eq.questionnaire_detail.fields.length === 0) && (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                      This questionnaire has no fields configured.
                    </Typography>
                  )}

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
                      <Chip label={statusConfig.label} size="small" color={statusConfig.color} />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Menu */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        {menuTargetId &&
          (() => {
            const targetEq = eventQuestionnaires.find((eq) => eq.id === menuTargetId);
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
        existingAssignments={eventQuestionnaires.map((eq) => eq.questionnaire)}
        onSuccess={handleAssignSuccess}
      />
    </Box>
  );
};
