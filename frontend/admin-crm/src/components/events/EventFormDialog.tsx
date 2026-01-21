// frontend/admin-crm/src/components/events/EventFormDialog.tsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { EventForm } from './EventForm';
import type { CreateEventData, UpdateEventData, Event } from '../../types/events.types';

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventData | UpdateEventData) => void;
  isLoading?: boolean;
  event?: Event | null;
  defaultClientId?: number;
  title?: string;
}

export const EventFormDialog: React.FC<EventFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  event,
  defaultClientId,
  title,
}) => {
  // Create a pseudo-event object with the default client for the form
  const eventWithDefaults = event || (defaultClientId ? {
    client: defaultClientId,
  } as Event : undefined);

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            {title || (event ? 'Edit Event' : 'Create New Event')}
          </Typography>
          <IconButton onClick={handleClose} size="small" disabled={isLoading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <EventForm
            event={eventWithDefaults}
            onSubmit={onSubmit}
            onCancel={handleClose}
            isLoading={isLoading}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
