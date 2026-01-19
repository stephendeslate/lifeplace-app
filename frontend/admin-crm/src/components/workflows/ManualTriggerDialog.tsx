// frontend/admin-crm/src/components/workflows/ManualTriggerDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
  Chip,
} from '@mui/material';
import {
  PlayArrow as TriggerIcon,
  Email as EmailIcon,
  Task as TaskIcon,
  RequestQuote as QuoteIcon,
  Description as ContractIcon,
  Schedule as ReminderIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../../apis/events.api';
import type { WorkflowStage } from '../../types/workflows.types';
import type { Event } from '../../types/events.types';

interface ManualTriggerDialogProps {
  open: boolean;
  onClose: () => void;
  stage: WorkflowStage | null;
  templateId: number;
  onTrigger: (stageId: number, eventId: number) => void;
  isTriggering: boolean;
}

const getAutomationIcon = (automationType: string) => {
  const icons: Record<string, React.ReactNode> = {
    EMAIL: <EmailIcon fontSize="small" />,
    TASK: <TaskIcon fontSize="small" />,
    QUOTE: <QuoteIcon fontSize="small" />,
    CONTRACT: <ContractIcon fontSize="small" />,
    REMINDER: <ReminderIcon fontSize="small" />,
    NOTIFICATION: <NotificationIcon fontSize="small" />,
  };
  return icons[automationType] || null;
};

export const ManualTriggerDialog: React.FC<ManualTriggerDialogProps> = ({
  open,
  onClose,
  stage,
  templateId,
  onTrigger,
  isTriggering,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch events that use this workflow template
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events', { workflow_template: templateId }],
    queryFn: () => eventsApi.getEvents({ workflow_template: templateId, page_size: 100 }),
    enabled: open && !!templateId,
    staleTime: 60 * 1000,
  });

  const events = eventsData?.results || [];

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedEvent(null);
    }
  }, [open]);

  const handleTrigger = () => {
    if (stage && selectedEvent) {
      onTrigger(stage.id, selectedEvent.id);
    }
  };

  const handleClose = () => {
    if (!isTriggering) {
      onClose();
    }
  };

  if (!stage) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isTriggering}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TriggerIcon color="primary" />
          <Typography variant="h6">Trigger Stage Automation</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            This will manually execute the automation for the selected stage on the chosen event.
            Use this to re-run automations or trigger them for specific events.
          </Alert>

          {/* Stage Details */}
          <Typography variant="subtitle2" gutterBottom>
            Stage Details
          </Typography>
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="body1" fontWeight="medium">
                {stage.name}
              </Typography>
              <Chip
                label={stage.stage_display || stage.stage}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {stage.is_automated && getAutomationIcon(stage.automation_type)}
              <Typography variant="body2" color="text.secondary">
                {stage.is_automated ? (
                  <>Automation: {stage.automation_type}</>
                ) : (
                  'Manual stage (no automation configured)'
                )}
              </Typography>
            </Box>
            {stage.email_template_name && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Email Template: {stage.email_template_name}
              </Typography>
            )}
            {stage.contract_template_name && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Contract Template: {stage.contract_template_name}
              </Typography>
            )}
          </Box>

          {!stage.is_automated && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              This stage has no automation configured. Triggering will only create a trigger record
              for tracking purposes.
            </Alert>
          )}

          {/* Event Selection */}
          <Typography variant="subtitle2" gutterBottom>
            Select Event
          </Typography>
          <Autocomplete
            id="event-select"
            options={events}
            loading={isLoadingEvents}
            getOptionLabel={(event: Event) =>
              `${event.name || 'Unnamed Event'} - ${event.client_name || 'Unknown Client'} (${event.status})`
            }
            value={selectedEvent}
            onChange={(_, newValue) => setSelectedEvent(newValue)}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            renderOption={(props, event) => (
              <li {...props} key={event.id}>
                <Box>
                  <Typography variant="body2">
                    {event.name || 'Unnamed Event'} - {event.client_name || 'Unknown Client'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Status: {event.status} | ID: {event.id}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search events..."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingEvents ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            noOptionsText={
              isLoadingEvents
                ? 'Loading events...'
                : 'No events found using this workflow template'
            }
          />

          {events.length === 0 && !isLoadingEvents && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No events are currently using this workflow template.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={handleClose} disabled={isTriggering}>
          Cancel
        </Button>
        <Button
          onClick={handleTrigger}
          variant="contained"
          color="primary"
          disabled={!selectedEvent || isTriggering}
          startIcon={isTriggering ? <CircularProgress size={20} color="inherit" /> : <TriggerIcon />}
        >
          {isTriggering ? 'Triggering...' : 'Trigger Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
