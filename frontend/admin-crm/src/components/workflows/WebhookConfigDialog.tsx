// frontend/admin-crm/src/components/workflows/WebhookConfigDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Box,
  Typography,
  Chip,
  IconButton,
  InputAdornment,
  Tooltip,
  Divider,
  FormControl,
  FormLabel,
  FormGroup,
  Checkbox,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import type {
  WorkflowWebhook,
  CreateWorkflowWebhookData,
  UpdateWorkflowWebhookData,
  WebhookEventType,
} from '../../types/workflows.types';
import { WEBHOOK_EVENT_TYPES } from '../../types/workflows.types';
import { useToastActions } from '../../contexts/ToastContext';

interface WebhookConfigDialogProps {
  open: boolean;
  onClose: () => void;
  editingWebhook?: WorkflowWebhook | null;
  workflowTemplateId?: number | null;
  onSubmit: (data: CreateWorkflowWebhookData | UpdateWorkflowWebhookData) => void;
  isLoading: boolean;
}

interface FormData {
  name: string;
  url: string;
  secret: string;
  is_active: boolean;
  events: WebhookEventType[];
  headers: Record<string, string>;
}

const generateSecret = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const WebhookConfigDialog: React.FC<WebhookConfigDialogProps> = ({
  open,
  onClose,
  editingWebhook,
  workflowTemplateId,
  onSubmit,
  isLoading,
}) => {
  const { showSuccess } = useToastActions();
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    url: '',
    secret: '',
    is_active: true,
    events: [],
    headers: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or editing webhook changes
  useEffect(() => {
    if (open) {
      if (editingWebhook) {
        setFormData({
          name: editingWebhook.name,
          url: editingWebhook.url,
          secret: '', // Secret is not returned for security - leave empty to keep existing
          is_active: editingWebhook.is_active,
          events: editingWebhook.events,
          headers: editingWebhook.headers,
        });
      } else {
        setFormData({
          name: '',
          url: '',
          secret: generateSecret(),
          is_active: true,
          events: [],
          headers: {},
        });
      }
      setErrors({});
      setShowSecret(false);
    }
  }, [open, editingWebhook]);

  const handleInputChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEventToggle = (eventType: WebhookEventType) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventType)
        ? prev.events.filter((e) => e !== eventType)
        : [...prev.events, eventType],
    }));
  };

  const handleRegenerateSecret = () => {
    setFormData((prev) => ({ ...prev, secret: generateSecret() }));
    setShowSecret(true);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(formData.secret);
    showSuccess('Copied', 'Secret copied to clipboard');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.url)) {
      newErrors.url = 'Must be a valid HTTP/HTTPS URL';
    }

    // Secret is required for new webhooks, optional for editing (empty = keep existing)
    if (!editingWebhook && !formData.secret.trim()) {
      newErrors.secret = 'Secret is required for HMAC signing';
    } else if (formData.secret.trim() && formData.secret.length < 16) {
      newErrors.secret = 'Secret must be at least 16 characters';
    }

    if (formData.events.length === 0) {
      newErrors.events = 'Select at least one event type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const data: CreateWorkflowWebhookData | UpdateWorkflowWebhookData = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      is_active: formData.is_active,
      events: formData.events,
      workflow_template: workflowTemplateId || null,
      headers: formData.headers,
    };

    // Only include secret if provided (empty = keep existing when editing)
    if (formData.secret.trim()) {
      data.secret = formData.secret;
    }

    onSubmit(data);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { maxHeight: '90vh' } }}
    >
      <DialogTitle>{editingWebhook ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
          {/* Basic Info */}
          <TextField
            label="Webhook Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name || 'A descriptive name for this webhook'}
            required
            fullWidth
          />

          <TextField
            label="Endpoint URL"
            value={formData.url}
            onChange={(e) => handleInputChange('url', e.target.value)}
            error={!!errors.url}
            helperText={
              errors.url || 'The URL to receive webhook events (must be HTTPS in production)'
            }
            placeholder="https://your-server.com/webhook"
            required
            fullWidth
          />

          {/* Secret Key */}
          <TextField
            label="Secret Key"
            value={formData.secret}
            onChange={(e) => handleInputChange('secret', e.target.value)}
            error={!!errors.secret}
            helperText={
              errors.secret ||
              (editingWebhook
                ? 'Leave empty to keep existing secret, or enter a new one'
                : 'Used to sign webhook payloads with HMAC-SHA256')
            }
            type={showSecret ? 'text' : 'password'}
            required={!editingWebhook}
            fullWidth
            placeholder={editingWebhook ? '(hidden for security)' : undefined}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Toggle visibility">
                    <IconButton onClick={() => setShowSecret(!showSecret)} edge="end" size="small">
                      {showSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Copy to clipboard">
                    <IconButton
                      onClick={handleCopySecret}
                      edge="end"
                      size="small"
                      disabled={!formData.secret}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Generate new secret">
                    <IconButton onClick={handleRegenerateSecret} edge="end" size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />

          <Divider />

          {/* Event Types */}
          <FormControl error={!!errors.events} component="fieldset">
            <FormLabel component="legend">Webhook Events *</FormLabel>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              Select which events should trigger this webhook
            </Typography>
            <FormGroup>
              {WEBHOOK_EVENT_TYPES.map((eventType) => (
                <Box key={eventType.value} sx={{ mb: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.events.includes(eventType.value)}
                        onChange={() => handleEventToggle(eventType.value)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{eventType.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {eventType.description}
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              ))}
            </FormGroup>
            {errors.events && (
              <Typography variant="caption" color="error">
                {errors.events}
              </Typography>
            )}
          </FormControl>

          <Divider />

          {/* Active Status */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Active</Typography>
                <Typography variant="caption" color="text.secondary">
                  When disabled, this webhook will not receive any events
                </Typography>
              </Box>
            }
          />

          {/* HMAC Info */}
          <Alert severity="info" sx={{ mt: 1 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Verifying webhook signatures</strong>
            </Typography>
            <Typography variant="caption" component="div">
              All webhook payloads include an <code>X-Webhook-Signature</code> header containing an
              HMAC-SHA256 signature. Verify this signature using your secret key to ensure the
              request came from LifePlace.
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip label="HMAC-SHA256" size="small" variant="outlined" sx={{ mr: 1 }} />
              <Chip label="JSON Payload" size="small" variant="outlined" />
            </Box>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading}>
          {isLoading
            ? editingWebhook
              ? 'Updating...'
              : 'Creating...'
            : editingWebhook
              ? 'Update Webhook'
              : 'Create Webhook'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookConfigDialog;
