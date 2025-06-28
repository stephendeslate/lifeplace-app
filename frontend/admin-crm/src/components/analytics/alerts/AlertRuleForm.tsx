// frontend/admin-crm/src/components/analytics/alerts/AlertRuleForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { AlertRuleFormDialogProps, AlertRuleFormData } from '../../../types/analytics.types';
import { useMetricDefinitions } from '../../../hooks/useAnalytics';
import { ALERT_OPERATORS } from '../../../types/analytics.types';

const NOTIFICATION_METHODS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WEBHOOK', label: 'Webhook' },
  { value: 'IN_APP', label: 'In-App Notification' },
];

const EVALUATION_PERIODS = [
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '2h', label: '2 hours' },
  { value: '6h', label: '6 hours' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours' },
];

export const AlertRuleForm: React.FC<AlertRuleFormDialogProps> = ({
  open,
  onClose,
  editingRule,
  onSubmit,
  isLoading,
}) => {
  const { useActiveMetrics } = useMetricDefinitions();
  const { data: activeMetrics = [] } = useActiveMetrics();

  const [formData, setFormData] = useState<AlertRuleFormData>({
    name: '',
    description: '',
    metric_definition: '',
    operator: 'GT',
    threshold_value: '',
    evaluation_period: '15m',
    evaluation_frequency: '300',
    notification_methods: ['EMAIL'],
    recipients: [''],
    cooldown_minutes: '30',
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingRule) {
      setFormData({
        name: editingRule.name,
        description: editingRule.description || '',
        metric_definition: editingRule.metric_definition.toString(),
        operator: editingRule.operator,
        threshold_value: editingRule.threshold_value,
        evaluation_period: editingRule.evaluation_period,
        evaluation_frequency: editingRule.evaluation_frequency.toString(),
        notification_methods: editingRule.notification_methods,
        recipients: editingRule.recipients.length > 0 ? editingRule.recipients : [''],
        cooldown_minutes: editingRule.cooldown_minutes.toString(),
        is_active: editingRule.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        metric_definition: '',
        operator: 'GT',
        threshold_value: '',
        evaluation_period: '15m',
        evaluation_frequency: '300',
        notification_methods: ['EMAIL'],
        recipients: [''],
        cooldown_minutes: '30',
        is_active: true,
      });
    }
    setErrors({});
  }, [editingRule, open]);

  const handleFieldChange = (field: keyof AlertRuleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNotificationMethodChange = (methods: string[]) => {
    setFormData(prev => ({ ...prev, notification_methods: methods }));
  };

  const handleAddRecipient = () => {
    setFormData(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }));
  };

  const handleRemoveRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const handleRecipientChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.map((recipient, i) => 
        i === index ? value : recipient
      )
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.metric_definition) {
      newErrors.metric_definition = 'Metric is required';
    }

    if (!formData.threshold_value.trim()) {
      newErrors.threshold_value = 'Threshold value is required';
    } else if (isNaN(Number(formData.threshold_value))) {
      newErrors.threshold_value = 'Threshold value must be a number';
    }

    if (!formData.evaluation_frequency) {
      newErrors.evaluation_frequency = 'Evaluation frequency is required';
    } else if (isNaN(Number(formData.evaluation_frequency)) || Number(formData.evaluation_frequency) < 60) {
      newErrors.evaluation_frequency = 'Evaluation frequency must be at least 60 seconds';
    }

    if (formData.notification_methods.length === 0) {
      newErrors.notification_methods = 'At least one notification method is required';
    }

    const validRecipients = formData.recipients.filter(r => r.trim());
    if (validRecipients.length === 0) {
      newErrors.recipients = 'At least one recipient is required';
    }

    if (!formData.cooldown_minutes) {
      newErrors.cooldown_minutes = 'Cooldown period is required';
    } else if (isNaN(Number(formData.cooldown_minutes)) || Number(formData.cooldown_minutes) < 0) {
      newErrors.cooldown_minutes = 'Cooldown period must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      metric_definition: Number(formData.metric_definition),
      operator: formData.operator,
      threshold_value: formData.threshold_value.trim(),
      evaluation_period: formData.evaluation_period,
      evaluation_frequency: Number(formData.evaluation_frequency),
      notification_methods: formData.notification_methods,
      recipients: formData.recipients.filter(r => r.trim()),
      cooldown_minutes: Number(formData.cooldown_minutes),
      is_active: formData.is_active,
    };

    onSubmit(submitData);
  };

  const selectedMetric = activeMetrics.find(m => m.id.toString() === formData.metric_definition);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Alert Rule Name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                required
              />
              
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
            </Stack>
          </Box>

          <Divider />

          {/* Metric and Condition */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Condition
            </Typography>
            
            <Stack spacing={2}>
              <FormControl fullWidth error={!!errors.metric_definition} required>
                <InputLabel>Metric to Monitor</InputLabel>
                <Select
                  value={formData.metric_definition}
                  label="Metric to Monitor"
                  onChange={(e) => handleFieldChange('metric_definition', e.target.value)}
                >
                  {activeMetrics.map((metric) => (
                    <MenuItem key={metric.id} value={metric.id.toString()}>
                      {metric.name} ({metric.metric_type})
                    </MenuItem>
                  ))}
                </Select>
                {errors.metric_definition && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.metric_definition}
                  </Typography>
                )}
              </FormControl>

              {selectedMetric && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Selected Metric:</strong> {selectedMetric.description || 'No description available'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Type:</strong> {selectedMetric.metric_type} | 
                    <strong> Source:</strong> {selectedMetric.source_domain}.{selectedMetric.source_model}
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={formData.operator}
                    label="Operator"
                    onChange={(e) => handleFieldChange('operator', e.target.value)}
                  >
                    {ALERT_OPERATORS.map((op) => (
                      <MenuItem key={op.value} value={op.value}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Threshold Value"
                  value={formData.threshold_value}
                  onChange={(e) => handleFieldChange('threshold_value', e.target.value)}
                  error={!!errors.threshold_value}
                  helperText={errors.threshold_value}
                  type="number"
                  required
                  sx={{ flex: 1 }}
                />
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Evaluation Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Evaluation Settings
            </Typography>
            
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Evaluation Period</InputLabel>
                <Select
                  value={formData.evaluation_period}
                  label="Evaluation Period"
                  onChange={(e) => handleFieldChange('evaluation_period', e.target.value)}
                >
                  {EVALUATION_PERIODS.map((period) => (
                    <MenuItem key={period.value} value={period.value}>
                      {period.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Evaluation Frequency (seconds)"
                value={formData.evaluation_frequency}
                onChange={(e) => handleFieldChange('evaluation_frequency', e.target.value)}
                error={!!errors.evaluation_frequency}
                helperText={errors.evaluation_frequency || 'How often to check the condition (minimum 60 seconds)'}
                type="number"
                required
                inputProps={{ min: 60 }}
              />

              <TextField
                label="Cooldown Period (minutes)"
                value={formData.cooldown_minutes}
                onChange={(e) => handleFieldChange('cooldown_minutes', e.target.value)}
                error={!!errors.cooldown_minutes}
                helperText={errors.cooldown_minutes || 'Minimum time between alert notifications'}
                type="number"
                required
                inputProps={{ min: 0 }}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Notification Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Notification Settings
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Notification Methods
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {NOTIFICATION_METHODS.map((method) => (
                    <Chip
                      key={method.value}
                      label={method.label}
                      onClick={() => {
                        const isSelected = formData.notification_methods.includes(method.value);
                        if (isSelected) {
                          handleNotificationMethodChange(
                            formData.notification_methods.filter(m => m !== method.value)
                          );
                        } else {
                          handleNotificationMethodChange([...formData.notification_methods, method.value]);
                        }
                      }}
                      color={formData.notification_methods.includes(method.value) ? 'primary' : 'default'}
                      variant={formData.notification_methods.includes(method.value) ? 'filled' : 'outlined'}
                      clickable
                    />
                  ))}
                </Stack>
                {errors.notification_methods && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.notification_methods}
                  </Typography>
                )}
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2">
                    Recipients
                  </Typography>
                  <Tooltip title="Add recipient">
                    <IconButton size="small" onClick={handleAddRecipient}>
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Stack spacing={1}>
                  {formData.recipients.map((recipient, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        label={`Recipient ${index + 1}`}
                        value={recipient}
                        onChange={(e) => handleRecipientChange(index, e.target.value)}
                        placeholder="email@example.com"
                        size="small"
                        fullWidth
                      />
                      {formData.recipients.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveRecipient(index)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Stack>
                
                {errors.recipients && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.recipients}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Status */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                />
              }
              label="Active"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              When active, this rule will be evaluated according to the frequency setting
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isLoading}
        >
          {editingRule ? 'Update' : 'Create'} Alert Rule
        </Button>
      </DialogActions>
    </Dialog>
  );
};