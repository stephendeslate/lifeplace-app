// frontend/admin-crm/src/components/bookingflows/configurations/ConfirmationStepConfig.tsx

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
  Divider,
} from '@mui/material';
import {
  CheckCircle as ConfirmIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarIcon,
  AutoAwesome as AutoIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep, 
  ConfirmationStepConfiguration 
} from '../../../types/bookingflows.types';

interface ConfirmationStepConfigProps {
  step: BookingFlowStep;
  config?: ConfirmationStepConfiguration | null;
  onUpdate: (data: Partial<ConfirmationStepConfiguration>) => void;
  isLoading?: boolean;
}

interface ConfirmationConfigFormData {
  title: string;
  message: string;
  show_booking_summary: boolean;
  show_next_steps: boolean;
  next_steps_content: string;
  send_confirmation_email: boolean;
  send_calendar_invite: boolean;
  create_event_immediately: boolean;
}

const defaultFormData: ConfirmationConfigFormData = {
  title: 'Booking Confirmed!',
  message: 'Thank you for your booking. We\'ve received your request and will be in touch soon with next steps.',
  show_booking_summary: true,
  show_next_steps: true,
  next_steps_content: '',
  send_confirmation_email: true,
  send_calendar_invite: false,
  create_event_immediately: true,
};

export const ConfirmationStepConfig: React.FC<ConfirmationStepConfigProps> = ({
  config,
  onUpdate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ConfirmationConfigFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (config) {
      setFormData({
        title: config.title || 'Booking Confirmed!',
        message: config.message || 'Thank you for your booking. We\'ve received your request and will be in touch soon with next steps.',
        show_booking_summary: config.show_booking_summary ?? true,
        show_next_steps: config.show_next_steps ?? true,
        next_steps_content: config.next_steps_content || '',
        send_confirmation_email: config.send_confirmation_email ?? true,
        send_calendar_invite: config.send_calendar_invite ?? false,
        create_event_immediately: config.create_event_immediately ?? true,
      });
    }
  }, [config]);

  const handleInputChange = (field: keyof ConfirmationConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

  const handleSwitchChange = (field: keyof ConfirmationConfigFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Confirmation title is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Confirmation message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onUpdate({
      title: formData.title.trim(),
      message: formData.message.trim(),
      show_booking_summary: formData.show_booking_summary,
      show_next_steps: formData.show_next_steps,
      next_steps_content: formData.next_steps_content.trim(),
      send_confirmation_email: formData.send_confirmation_email,
      send_calendar_invite: formData.send_calendar_invite,
      create_event_immediately: formData.create_event_immediately,
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Confirmation Step Configuration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure the confirmation message and automated actions that occur when a booking is completed.
      </Alert>

      <Stack spacing={3}>
        {/* Confirmation Message */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Confirmation Message
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Confirmation Title"
                value={formData.title}
                onChange={handleInputChange('title')}
                error={!!errors.title}
                helperText={errors.title || 'Main heading displayed after successful booking'}
                required
              />
              
              <TextField
                fullWidth
                label="Confirmation Message"
                value={formData.message}
                onChange={handleInputChange('message')}
                error={!!errors.message}
                helperText={errors.message || 'Thank you message displayed to clients'}
                multiline
                rows={4}
                required
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Display Options
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <ConfirmIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_booking_summary}
                      onChange={handleSwitchChange('show_booking_summary')}
                    />
                  }
                  label="Show Booking Summary"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Display a summary of the booking details on the confirmation page
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                <AutoIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_next_steps}
                      onChange={handleSwitchChange('show_next_steps')}
                    />
                  }
                  label="Show Next Steps"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Display information about what happens next in the process
              </Typography>

              {formData.show_next_steps && (
                <TextField
                  fullWidth
                  label="Next Steps Content"
                  value={formData.next_steps_content}
                  onChange={handleInputChange('next_steps_content')}
                  multiline
                  rows={3}
                  helperText="Information about next steps (leave empty for default content)"
                  placeholder="What happens next:&#10;1. We'll review your booking request&#10;2. You'll receive a detailed proposal within 24 hours&#10;3. Once approved, we'll send a contract for signature"
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Automated Actions */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Automated Actions
            </Typography>
            
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <EmailIcon color="primary" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.send_confirmation_email}
                      onChange={handleSwitchChange('send_confirmation_email')}
                    />
                  }
                  label="Send Confirmation Email"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Automatically send a confirmation email to the client
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                <CalendarIcon color="action" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.send_calendar_invite}
                      onChange={handleSwitchChange('send_calendar_invite')}
                    />
                  }
                  label="Send Calendar Invite"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Send a calendar invitation for the event date/time (if specified)
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Box display="flex" alignItems="center" gap={1}>
                <AutoIcon color="success" />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.create_event_immediately}
                      onChange={handleSwitchChange('create_event_immediately')}
                    />
                  }
                  label="Create Event Immediately"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Automatically create an event record in the system upon booking completion
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PreviewIcon color="primary" />
              <Typography variant="subtitle1">
                Live Preview
              </Typography>
            </Box>
            
            <Box 
              sx={{ 
                p: 3, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                backgroundColor: 'grey.50',
                textAlign: 'center'
              }}
            >
              <ConfirmIcon 
                sx={{ fontSize: 48, color: 'success.main', mb: 2 }} 
              />
              
              <Typography variant="h5" gutterBottom color="success.main">
                {formData.title || 'Confirmation Title'}
              </Typography>
              
              <Typography variant="body1" paragraph>
                {formData.message || 'Confirmation message will appear here...'}
              </Typography>
              
              {formData.show_booking_summary && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Booking Summary
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Event details, packages, pricing, and contact information will be displayed here
                  </Typography>
                </Box>
              )}
              
              {formData.show_next_steps && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'info.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom color="info.main">
                    What Happens Next
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                    {formData.next_steps_content || 
                     "• We'll review your booking request\n• You'll receive a detailed proposal within 24 hours\n• Once approved, we'll send a contract for signature"}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Configuration Summary */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Configuration Summary
            </Typography>
            
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Display:</strong>{' '}
                {[
                  formData.show_booking_summary && 'Booking Summary',
                  formData.show_next_steps && 'Next Steps'
                ].filter(Boolean).join(', ') || 'Basic confirmation only'}
              </Typography>
              
              <Typography variant="body2">
                <strong>Automated Actions:</strong>{' '}
                {[
                  formData.send_confirmation_email && 'Confirmation Email',
                  formData.send_calendar_invite && 'Calendar Invite',
                  formData.create_event_immediately && 'Create Event'
                ].filter(Boolean).join(', ') || 'None'}
              </Typography>
              
              {formData.next_steps_content && (
                <Typography variant="body2">
                  <strong>Custom Next Steps:</strong> Configured
                </Typography>
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
    </Box>
  );
};