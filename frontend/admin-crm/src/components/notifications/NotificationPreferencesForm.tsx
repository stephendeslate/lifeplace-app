// frontend/admin-crm/src/components/notifications/NotificationPreferencesForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Button,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import {
  ExpandMore,
  Save,
  RestartAlt,
  Email,
  Sms,
  Notifications,
  Schedule,
  Block,
  Settings,
  NotificationsActive,
  PhoneIphone,
  Campaign,
  Warning,
} from '@mui/icons-material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNotificationPreferences, useNotificationTypes } from '../../hooks/useNotifications';
import type {
  NotificationPreference,
  UpdateNotificationPreferenceData,
} from '../../types/notifications.types';
import { DIGEST_FREQUENCIES } from '../../types/notifications.types';

interface NotificationPreferencesFormProps {
  preferences: NotificationPreference;
  isLoading: boolean;
}

export const NotificationPreferencesForm: React.FC<NotificationPreferencesFormProps> = ({
  preferences,
  isLoading,
}) => {
  const [formData, setFormData] = useState<UpdateNotificationPreferenceData>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState<Date | null>(null);
  const [quietHoursEnd, setQuietHoursEnd] = useState<Date | null>(null);

  const {
    updatePreferences,
    resetToDefaults,
    isUpdatingPreferences,
    isResettingPreferences,
  } = useNotificationPreferences();

  const { notificationTypes } = useNotificationTypes({ is_active: true });

  // Initialize form data
  useEffect(() => {
    if (preferences) {
      setFormData({
        // Global toggles
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        in_app_enabled: preferences.in_app_enabled,
        push_enabled: preferences.push_enabled,
        // System category
        system_email: preferences.system_email,
        system_sms: preferences.system_sms,
        system_in_app: preferences.system_in_app,
        system_push: preferences.system_push,
        // Event category
        event_email: preferences.event_email,
        event_sms: preferences.event_sms,
        event_in_app: preferences.event_in_app,
        event_push: preferences.event_push,
        // Task category
        task_email: preferences.task_email,
        task_sms: preferences.task_sms,
        task_in_app: preferences.task_in_app,
        task_push: preferences.task_push,
        // Payment category
        payment_email: preferences.payment_email,
        payment_sms: preferences.payment_sms,
        payment_in_app: preferences.payment_in_app,
        payment_push: preferences.payment_push,
        // Client category
        client_email: preferences.client_email,
        client_sms: preferences.client_sms,
        client_in_app: preferences.client_in_app,
        client_push: preferences.client_push,
        // Contract category
        contract_email: preferences.contract_email,
        contract_sms: preferences.contract_sms,
        contract_in_app: preferences.contract_in_app,
        contract_push: preferences.contract_push,
        // Workflow category
        workflow_email: preferences.workflow_email,
        workflow_sms: preferences.workflow_sms,
        workflow_in_app: preferences.workflow_in_app,
        workflow_push: preferences.workflow_push,
        // Communication category
        communication_email: preferences.communication_email,
        communication_sms: preferences.communication_sms,
        communication_in_app: preferences.communication_in_app,
        communication_push: preferences.communication_push,
        // Marketing category (opt-in only)
        marketing_email: preferences.marketing_email,
        marketing_sms: preferences.marketing_sms,
        marketing_in_app: preferences.marketing_in_app,
        marketing_push: preferences.marketing_push,
        // Advanced
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        digest_frequency: preferences.digest_frequency,
        disabled_types: preferences.disabled_types,
      });

      // Set quiet hours times
      if (preferences.quiet_hours_start) {
        const startTime = new Date();
        const [hours, minutes] = preferences.quiet_hours_start.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setQuietHoursStart(startTime);
      }

      if (preferences.quiet_hours_end) {
        const endTime = new Date();
        const [hours, minutes] = preferences.quiet_hours_end.split(':');
        endTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setQuietHoursEnd(endTime);
      }

      setHasChanges(false);
    }
  }, [preferences]);

  const handleFieldChange = (field: keyof UpdateNotificationPreferenceData, value: boolean | string | number[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleQuietHoursChange = (field: 'start' | 'end', value: Date | null) => {
    if (field === 'start') {
      setQuietHoursStart(value);
      const timeString = value ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : null;
      handleFieldChange('quiet_hours_start', timeString || '');
    } else {
      setQuietHoursEnd(value);
      const timeString = value ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : null;
      handleFieldChange('quiet_hours_end', timeString || '');
    }
  };

  const handleDisabledTypesChange = (typeId: number, disabled: boolean) => {
    const currentDisabled = formData.disabled_types || [];
    let newDisabled: number[];

    if (disabled) {
      newDisabled = [...currentDisabled, typeId];
    } else {
      newDisabled = currentDisabled.filter(id => id !== typeId);
    }

    handleFieldChange('disabled_types', newDisabled);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences(formData);
    setHasChanges(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setHasChanges(false);
  };

  const renderCategoryPreferences = (category: string, label: string, icon: React.ReactNode) => {
    const categoryKey = category.toLowerCase();
    return (
      <Card key={category} variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            {icon}
            <Typography variant="h6" fontWeight="medium">
              {label}
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={
                <Switch
                  checked={formData[`${categoryKey}_email` as keyof UpdateNotificationPreferenceData] as boolean ?? false}
                  onChange={(e) => handleFieldChange(`${categoryKey}_email` as keyof UpdateNotificationPreferenceData, e.target.checked)}
                  disabled={!formData.email_enabled}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Email fontSize="small" />
                  <Typography variant="body2">Email</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData[`${categoryKey}_sms` as keyof UpdateNotificationPreferenceData] as boolean ?? false}
                  onChange={(e) => handleFieldChange(`${categoryKey}_sms` as keyof UpdateNotificationPreferenceData, e.target.checked)}
                  disabled={!formData.sms_enabled}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Sms fontSize="small" />
                  <Typography variant="body2">SMS</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData[`${categoryKey}_in_app` as keyof UpdateNotificationPreferenceData] as boolean ?? false}
                  onChange={(e) => handleFieldChange(`${categoryKey}_in_app` as keyof UpdateNotificationPreferenceData, e.target.checked)}
                  disabled={!formData.in_app_enabled}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Notifications fontSize="small" />
                  <Typography variant="body2">In-App</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData[`${categoryKey}_push` as keyof UpdateNotificationPreferenceData] as boolean ?? false}
                  onChange={(e) => handleFieldChange(`${categoryKey}_push` as keyof UpdateNotificationPreferenceData, e.target.checked)}
                  disabled={!formData.push_enabled}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneIphone fontSize="small" />
                  <Typography variant="body2">Push</Typography>
                </Box>
              }
            />
          </Stack>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <Typography color="text.secondary">Loading preferences...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Settings color="primary" />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Notification Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure how and when you receive notifications
              </Typography>
            </Box>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RestartAlt />}
              onClick={handleReset}
              disabled={isResettingPreferences}
            >
              Reset to Defaults
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={!hasChanges || isUpdatingPreferences}
            >
              {isUpdatingPreferences ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Box>

        <Stack spacing={3}>
          {/* Global Settings */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <NotificationsActive color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Global Delivery Methods
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Control which delivery methods are available for notifications
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: formData.email_enabled ? 'primary.50' : 'grey.50', flex: 1, minWidth: 180 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.email_enabled ?? true}
                        onChange={(e) => handleFieldChange('email_enabled', e.target.checked)}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Email fontSize="small" />
                        <Typography variant="body2" fontWeight="medium">Email</Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: formData.sms_enabled ? 'warning.50' : 'grey.50', flex: 1, minWidth: 180 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.sms_enabled ?? false}
                        onChange={(e) => handleFieldChange('sms_enabled', e.target.checked)}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Sms fontSize="small" />
                        <Typography variant="body2" fontWeight="medium">SMS</Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: formData.in_app_enabled ? 'success.50' : 'grey.50', flex: 1, minWidth: 180 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.in_app_enabled ?? true}
                        onChange={(e) => handleFieldChange('in_app_enabled', e.target.checked)}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Notifications fontSize="small" />
                        <Typography variant="body2" fontWeight="medium">In-App</Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: formData.push_enabled ? 'info.50' : 'grey.50', flex: 1, minWidth: 180 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.push_enabled ?? true}
                        onChange={(e) => handleFieldChange('push_enabled', e.target.checked)}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <PhoneIphone fontSize="small" />
                        <Typography variant="body2" fontWeight="medium">Push</Typography>
                      </Box>
                    }
                  />
                </Paper>
              </Stack>
            </CardContent>
          </Card>

          {/* Category Preferences */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Notification Categories
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure delivery methods for different types of notifications
              </Typography>
              
              <Stack spacing={2}>
                {renderCategoryPreferences('SYSTEM', 'System Updates', <Settings color="action" />)}
                {renderCategoryPreferences('EVENT', 'Event Management', <Schedule color="action" />)}
                {renderCategoryPreferences('TASK', 'Task Assignments', <Notifications color="action" />)}
                {renderCategoryPreferences('PAYMENT', 'Payment Processing', <Notifications color="action" />)}
                {renderCategoryPreferences('CLIENT', 'Client Management', <Notifications color="action" />)}
                {renderCategoryPreferences('CONTRACT', 'Contract Updates', <Notifications color="action" />)}
                {renderCategoryPreferences('WORKFLOW', 'Workflow Progress', <Notifications color="action" />)}
                {renderCategoryPreferences('COMMUNICATION', 'Communication Alerts', <Email color="action" />)}
              </Stack>
            </CardContent>
          </Card>

          {/* Marketing Preferences - Separate Card for Compliance */}
          <Card sx={{ border: '1px solid', borderColor: 'warning.300' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Campaign sx={{ color: 'warning.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Marketing & Promotions
                </Typography>
                <Chip label="Requires Consent" size="small" color="warning" variant="outlined" />
              </Box>

              <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Philippines DPA Compliance:</strong> Marketing communications require explicit consent.
                  These settings are OFF by default. Users can withdraw consent at any time.
                  Only enable if you have obtained explicit consent for marketing communications.
                </Typography>
              </Alert>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.marketing_email ?? false}
                      onChange={(e) => handleFieldChange('marketing_email', e.target.checked)}
                      disabled={!formData.email_enabled}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Email fontSize="small" />
                      <Typography variant="body2">Marketing Email</Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.marketing_sms ?? false}
                      onChange={(e) => handleFieldChange('marketing_sms', e.target.checked)}
                      disabled={!formData.sms_enabled}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Sms fontSize="small" />
                      <Typography variant="body2">Marketing SMS</Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.marketing_in_app ?? true}
                      onChange={(e) => handleFieldChange('marketing_in_app', e.target.checked)}
                      disabled={!formData.in_app_enabled}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Notifications fontSize="small" />
                      <Typography variant="body2">Marketing In-App</Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.marketing_push ?? false}
                      onChange={(e) => handleFieldChange('marketing_push', e.target.checked)}
                      disabled={!formData.push_enabled}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <PhoneIphone fontSize="small" />
                      <Typography variant="body2">Marketing Push</Typography>
                    </Box>
                  }
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Advanced Settings
              </Typography>
              
              <Stack spacing={3}>
                {/* Digest Frequency */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Digest Frequency
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Digest Frequency</InputLabel>
                    <Select
                      value={formData.digest_frequency || 'IMMEDIATE'}
                      onChange={(e) => handleFieldChange('digest_frequency', e.target.value)}
                      label="Digest Frequency"
                    >
                      {DIGEST_FREQUENCIES.map((frequency) => (
                        <MenuItem key={frequency.value} value={frequency.value}>
                          {frequency.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Choose how often you want to receive notification digests
                  </Typography>
                </Box>

                <Divider />

                {/* Quiet Hours */}
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Schedule color="primary" />
                    <Typography variant="subtitle1" fontWeight="medium">
                      Quiet Hours
                    </Typography>
                  </Box>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.quiet_hours_enabled ?? false}
                        onChange={(e) => handleFieldChange('quiet_hours_enabled', e.target.checked)}
                      />
                    }
                    label="Enable Quiet Hours"
                    sx={{ mb: 2 }}
                  />
                  
                  {formData.quiet_hours_enabled && (
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                        <TimePicker
                          label="Start Time"
                          value={quietHoursStart}
                          onChange={(value) => handleQuietHoursChange('start', value)}
                          slotProps={{
                            textField: { size: 'small' }
                          }}
                        />
                        
                        <Typography variant="body2" color="text.secondary">to</Typography>
                        
                        <TimePicker
                          label="End Time"
                          value={quietHoursEnd}
                          onChange={(value) => handleQuietHoursChange('end', value)}
                          slotProps={{
                            textField: { size: 'small' }
                          }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Notifications will not be sent during these hours
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Disabled Types */}
          {notificationTypes.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Block fontSize="small" />
                  <Typography variant="h6">
                    Disabled Notification Types
                  </Typography>
                  {formData.disabled_types && formData.disabled_types.length > 0 && (
                    <Chip 
                      label={formData.disabled_types.length} 
                      size="small" 
                      color="primary" 
                    />
                  )}
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Disable specific notification types completely
                </Typography>
                
                <Stack spacing={1}>
                  {notificationTypes.map((type) => (
                    <Card key={type.id} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                      <CardContent sx={{ py: 1.5 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!formData.disabled_types?.includes(type.id)}
                              onChange={(e) => handleDisabledTypesChange(type.id, !e.target.checked)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {type.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {type.description}
                              </Typography>
                            </Box>
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>

        {hasChanges && (
          <Alert severity="info" sx={{ mt: 3 }} icon={<Save />}>
            You have unsaved changes. Click "Save Changes" to apply your preferences.
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
};