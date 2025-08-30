// frontend/admin-crm/src/components/analytics/alerts/NotificationSettings.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Webhook as WebhookIcon,
  Notifications as InAppIcon,
} from '@mui/icons-material';


interface NotificationSettingsData {
  email: {
    enabled: boolean;
    smtp_server: string;
    smtp_port: string;
    smtp_username: string;
    smtp_password: string;
    from_email: string;
    use_tls: boolean;
  };
  sms: {
    enabled: boolean;
    provider: string;
    api_key: string;
    sender_number: string;
  };
  webhook: {
    enabled: boolean;
    urls: string[];
    secret_key: string;
    timeout_seconds: string;
  };
  in_app: {
    enabled: boolean;
    show_popup: boolean;
    send_browser_notification: boolean;
  };
  global_settings: {
    rate_limit_per_hour: string;
    max_retries: string;
    retry_delay_seconds: string;
  };
}

interface NotificationSettingsProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: NotificationSettingsData) => void;
  isLoading?: boolean;
  initialData?: Partial<NotificationSettingsData>;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  open,
  onClose,
  onSave,
  isLoading = false,
  initialData,
}) => {
  const [settings, setSettings] = useState<NotificationSettingsData>({
    email: {
      enabled: false,
      smtp_server: '',
      smtp_port: '587',
      smtp_username: '',
      smtp_password: '',
      from_email: '',
      use_tls: true,
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      api_key: '',
      sender_number: '',
    },
    webhook: {
      enabled: false,
      urls: [''],
      secret_key: '',
      timeout_seconds: '30',
    },
    in_app: {
      enabled: true,
      show_popup: true,
      send_browser_notification: false,
    },
    global_settings: {
      rate_limit_per_hour: '100',
      max_retries: '3',
      retry_delay_seconds: '60',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setSettings(prev => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  const updateSettings = (section: keyof NotificationSettingsData, field: string, value: boolean | string | string[]) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));

    // Clear errors for this field
    const errorKey = `${section}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const addWebhookUrl = () => {
    setSettings(prev => ({
      ...prev,
      webhook: {
        ...prev.webhook,
        urls: [...prev.webhook.urls, ''],
      },
    }));
  };

  const removeWebhookUrl = (index: number) => {
    setSettings(prev => ({
      ...prev,
      webhook: {
        ...prev.webhook,
        urls: prev.webhook.urls.filter((_, i) => i !== index),
      },
    }));
  };

  const updateWebhookUrl = (index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      webhook: {
        ...prev.webhook,
        urls: prev.webhook.urls.map((url, i) => (i === index ? value : url)),
      },
    }));
  };

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (settings.email.enabled) {
      if (!settings.email.smtp_server.trim()) {
        newErrors['email.smtp_server'] = 'SMTP server is required';
      }
      if (!settings.email.from_email.trim()) {
        newErrors['email.from_email'] = 'From email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email.from_email)) {
        newErrors['email.from_email'] = 'Invalid email format';
      }
      if (!settings.email.smtp_port || isNaN(Number(settings.email.smtp_port))) {
        newErrors['email.smtp_port'] = 'Valid port number is required';
      }
    }

    // SMS validation
    if (settings.sms.enabled) {
      if (!settings.sms.api_key.trim()) {
        newErrors['sms.api_key'] = 'API key is required';
      }
      if (!settings.sms.sender_number.trim()) {
        newErrors['sms.sender_number'] = 'Sender number is required';
      }
    }

    // Webhook validation
    if (settings.webhook.enabled) {
      const validUrls = settings.webhook.urls.filter(url => url.trim());
      if (validUrls.length === 0) {
        newErrors['webhook.urls'] = 'At least one webhook URL is required';
      } else {
        validUrls.forEach((url, index) => {
          try {
            new URL(url);
          } catch {
            newErrors[`webhook.url_${index}`] = 'Invalid URL format';
          }
        });
      }
    }

    // Global settings validation
    if (isNaN(Number(settings.global_settings.rate_limit_per_hour)) || Number(settings.global_settings.rate_limit_per_hour) < 1) {
      newErrors['global_settings.rate_limit_per_hour'] = 'Rate limit must be a positive number';
    }
    if (isNaN(Number(settings.global_settings.max_retries)) || Number(settings.global_settings.max_retries) < 0) {
      newErrors['global_settings.max_retries'] = 'Max retries must be a non-negative number';
    }
    if (isNaN(Number(settings.global_settings.retry_delay_seconds)) || Number(settings.global_settings.retry_delay_seconds) < 1) {
      newErrors['global_settings.retry_delay_seconds'] = 'Retry delay must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateSettings()) return;
    onSave(settings);
  };


  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          Notification Settings
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Email Settings */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <EmailIcon color="primary" />
              <Typography variant="h6">Email Notifications</Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.email.enabled}
                  onChange={(e) => updateSettings('email', 'enabled', e.target.checked)}
                />
              }
              label="Enable Email Notifications"
              sx={{ mb: 2 }}
            />

            {settings.email.enabled && (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="SMTP Server"
                    value={settings.email.smtp_server}
                    onChange={(e) => updateSettings('email', 'smtp_server', e.target.value)}
                    error={!!errors['email.smtp_server']}
                    helperText={errors['email.smtp_server']}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Port"
                    value={settings.email.smtp_port}
                    onChange={(e) => updateSettings('email', 'smtp_port', e.target.value)}
                    error={!!errors['email.smtp_port']}
                    helperText={errors['email.smtp_port']}
                    type="number"
                    sx={{ minWidth: 100 }}
                    required
                  />
                </Box>

                <TextField
                  label="From Email"
                  value={settings.email.from_email}
                  onChange={(e) => updateSettings('email', 'from_email', e.target.value)}
                  error={!!errors['email.from_email']}
                  helperText={errors['email.from_email']}
                  type="email"
                  fullWidth
                  required
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Username"
                    value={settings.email.smtp_username}
                    onChange={(e) => updateSettings('email', 'smtp_username', e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Password"
                    value={settings.email.smtp_password}
                    onChange={(e) => updateSettings('email', 'smtp_password', e.target.value)}
                    type="password"
                    fullWidth
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email.use_tls}
                      onChange={(e) => updateSettings('email', 'use_tls', e.target.checked)}
                    />
                  }
                  label="Use TLS"
                />
              </Stack>
            )}
          </Paper>

          {/* SMS Settings */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SmsIcon color="success" />
              <Typography variant="h6">SMS Notifications</Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.sms.enabled}
                  onChange={(e) => updateSettings('sms', 'enabled', e.target.checked)}
                />
              }
              label="Enable SMS Notifications"
              sx={{ mb: 2 }}
            />

            {settings.sms.enabled && (
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>SMS Provider</InputLabel>
                  <Select
                    value={settings.sms.provider}
                    label="SMS Provider"
                    onChange={(e) => updateSettings('sms', 'provider', e.target.value)}
                  >
                    <MenuItem value="twilio">Twilio</MenuItem>
                    <MenuItem value="aws_sns">AWS SNS</MenuItem>
                    <MenuItem value="messagebird">MessageBird</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="API Key"
                  value={settings.sms.api_key}
                  onChange={(e) => updateSettings('sms', 'api_key', e.target.value)}
                  error={!!errors['sms.api_key']}
                  helperText={errors['sms.api_key']}
                  type="password"
                  fullWidth
                  required
                />

                <TextField
                  label="Sender Number"
                  value={settings.sms.sender_number}
                  onChange={(e) => updateSettings('sms', 'sender_number', e.target.value)}
                  error={!!errors['sms.sender_number']}
                  helperText={errors['sms.sender_number']}
                  placeholder="+1234567890"
                  fullWidth
                  required
                />
              </Stack>
            )}
          </Paper>

          {/* Webhook Settings */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <WebhookIcon color="info" />
              <Typography variant="h6">Webhook Notifications</Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.webhook.enabled}
                  onChange={(e) => updateSettings('webhook', 'enabled', e.target.checked)}
                />
              }
              label="Enable Webhook Notifications"
              sx={{ mb: 2 }}
            />

            {settings.webhook.enabled && (
              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2">Webhook URLs</Typography>
                    <Tooltip title="Add webhook URL">
                      <IconButton size="small" onClick={addWebhookUrl}>
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Stack spacing={1}>
                    {settings.webhook.urls.map((url, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          label={`Webhook URL ${index + 1}`}
                          value={url}
                          onChange={(e) => updateWebhookUrl(index, e.target.value)}
                          error={!!errors[`webhook.url_${index}`]}
                          helperText={errors[`webhook.url_${index}`]}
                          placeholder="https://your-webhook-endpoint.com"
                          fullWidth
                        />
                        {settings.webhook.urls.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => removeWebhookUrl(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Stack>
                  
                  {errors['webhook.urls'] && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {errors['webhook.urls']}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Secret Key"
                    value={settings.webhook.secret_key}
                    onChange={(e) => updateSettings('webhook', 'secret_key', e.target.value)}
                    type="password"
                    helperText="Used for webhook signature verification"
                    fullWidth
                  />
                  <TextField
                    label="Timeout (seconds)"
                    value={settings.webhook.timeout_seconds}
                    onChange={(e) => updateSettings('webhook', 'timeout_seconds', e.target.value)}
                    type="number"
                    sx={{ minWidth: 150 }}
                  />
                </Box>
              </Stack>
            )}
          </Paper>

          {/* In-App Settings */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <InAppIcon color="warning" />
              <Typography variant="h6">In-App Notifications</Typography>
            </Box>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.in_app.enabled}
                    onChange={(e) => updateSettings('in_app', 'enabled', e.target.checked)}
                  />
                }
                label="Enable In-App Notifications"
              />

              {settings.in_app.enabled && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.in_app.show_popup}
                        onChange={(e) => updateSettings('in_app', 'show_popup', e.target.checked)}
                      />
                    }
                    label="Show popup notifications"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.in_app.send_browser_notification}
                        onChange={(e) => updateSettings('in_app', 'send_browser_notification', e.target.checked)}
                      />
                    }
                    label="Send browser notifications"
                  />
                </>
              )}
            </Stack>
          </Paper>

          {/* Global Settings */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Global Settings
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Rate Limit (notifications per hour)"
                value={settings.global_settings.rate_limit_per_hour}
                onChange={(e) => updateSettings('global_settings', 'rate_limit_per_hour', e.target.value)}
                error={!!errors['global_settings.rate_limit_per_hour']}
                helperText={errors['global_settings.rate_limit_per_hour'] || 'Maximum notifications to send per hour'}
                type="number"
                fullWidth
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Max Retries"
                  value={settings.global_settings.max_retries}
                  onChange={(e) => updateSettings('global_settings', 'max_retries', e.target.value)}
                  error={!!errors['global_settings.max_retries']}
                  helperText={errors['global_settings.max_retries']}
                  type="number"
                  fullWidth
                />
                <TextField
                  label="Retry Delay (seconds)"
                  value={settings.global_settings.retry_delay_seconds}
                  onChange={(e) => updateSettings('global_settings', 'retry_delay_seconds', e.target.value)}
                  error={!!errors['global_settings.retry_delay_seconds']}
                  helperText={errors['global_settings.retry_delay_seconds']}
                  type="number"
                  fullWidth
                />
              </Box>
            </Stack>
          </Paper>

          <Alert severity="info">
            <Typography variant="body2">
              These settings apply to all alert rules. Individual alert rules can specify which notification methods to use and their recipients.
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={isLoading}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};