/**
 * CreateThreadDialog - Dialog for creating new message threads
 *
 * Features:
 * - Client selection with search functionality
 * - Event selection based on selected client
 * - Subject and message content input
 * - Integration with messaging API and context
 * - Toast notifications for success/error states
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useToastActions } from '../../contexts/ToastContext';
import { useMessagingContext, messagingApi } from '@shared';
import type { Client } from '../../types/clients.types';
import type { Event } from '../../types/events.types';
import { ClientSelector } from './ThreadCreation/ClientSelector';
import { EventSelector } from './ThreadCreation/EventSelector';

export interface CreateThreadDialogProps {
  open: boolean;
  onClose: () => void;
  preSelectedClient?: Client | null;
  preSelectedEvent?: Event | null;
}

interface CreateThreadFormData {
  client: Client | null;
  event: Event | null;
  subject: string;
  message: string;
}

const defaultFormData: CreateThreadFormData = {
  client: null,
  event: null,
  subject: '',
  message: '',
};

export const CreateThreadDialog: React.FC<CreateThreadDialogProps> = ({
  open,
  onClose,
  preSelectedClient = null,
  preSelectedEvent = null,
}) => {
  const [formData, setFormData] = useState<CreateThreadFormData>(defaultFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { showSuccess, showError } = useToastActions();
  const { actions } = useMessagingContext();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        client: preSelectedClient,
        event: preSelectedEvent,
        subject: '',
        message: '',
      });
      setErrors({});
    } else {
      setFormData(defaultFormData);
      setErrors({});
    }
  }, [open, preSelectedClient, preSelectedEvent]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client) {
      newErrors.client = 'Please select a client';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const threadData = {
        client: formData.client!.id,
        event: formData.event?.id,
        subject: formData.subject.trim(),
        initial_message: formData.message.trim(),
      };

      await messagingApi.createThread(threadData);

      // Refresh threads in context
      await actions.refreshThreads();

      showSuccess(
        'Thread Created',
        `New message thread created for ${formData.client!.first_name} ${formData.client!.last_name}`
      );

      onClose();
    } catch (error) {
      console.error('Failed to create thread:', error);
      showError(
        'Creation Failed',
        'Failed to create message thread. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, actions, showSuccess, showError, onClose]);

  const handleClientChange = useCallback((client: Client | null) => {
    setFormData(prev => ({
      ...prev,
      client,
      event: null, // Reset event when client changes
    }));
    if (errors.client) {
      setErrors(prev => ({ ...prev, client: '' }));
    }
  }, [errors.client]);

  const handleEventChange = useCallback((event: Event | null) => {
    setFormData(prev => ({ ...prev, event }));
  }, []);

  const handleSubjectChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, subject: value }));
    if (errors.subject) {
      setErrors(prev => ({ ...prev, subject: '' }));
    }
  }, [errors.subject]);

  const handleMessageChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, message: value }));
    if (errors.message) {
      setErrors(prev => ({ ...prev, message: '' }));
    }
  }, [errors.message]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          Create New Thread
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          disabled={isLoading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Client Selection */}
          <ClientSelector
            value={formData.client}
            onChange={handleClientChange}
            error={errors.client}
            disabled={isLoading}
          />

          {/* Event Selection */}
          <EventSelector
            clientId={formData.client?.id || null}
            value={formData.event}
            onChange={handleEventChange}
            disabled={isLoading}
          />

          {/* Subject */}
          <TextField
            label="Subject"
            value={formData.subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            error={!!errors.subject}
            helperText={errors.subject}
            disabled={isLoading}
            fullWidth
            required
          />

          {/* Message Content */}
          <TextField
            label="Message"
            value={formData.message}
            onChange={(e) => handleMessageChange(e.target.value)}
            error={!!errors.message}
            helperText={errors.message}
            disabled={isLoading}
            multiline
            rows={4}
            fullWidth
            required
            placeholder="Type your message here..."
          />

          {/* Error Alert */}
          {Object.keys(errors).length > 0 && (
            <Alert severity="error">
              Please fix the errors above before continuing.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !formData.client || !formData.subject.trim() || !formData.message.trim()}
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {isLoading ? 'Creating...' : 'Create Thread'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};