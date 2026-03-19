import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Switch,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Notifications as InAppIcon,
  Schedule as ScheduleIcon,
  PhoneIphone as PushIcon,
  Warning as WarningIcon,
  Tune as TuneIcon,
  Unsubscribe as UnsubscribeIcon,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { DigestFrequency } from '@/types/notifications.types';
import { NOTIFICATION_CATEGORIES, DIGEST_FREQUENCIES } from '@/types/notifications.types';
import { useNotificationPreferencesDialogLogic } from './useNotificationPreferencesDialogLogic';
import { CategoryToggle, getCategoryIcon } from './CategoryToggle';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationPreferencesDialog: React.FC<NotificationPreferencesDialogProps> = ({
  open,
  onClose,
}) => {
  const {
    formData,
    isLoading,
    error,
    notificationTypes,
    disabledTypes,
    quietHoursStart,
    quietHoursEnd,
    hasChanges,
    typesByCategory,
    isAllMarketingDisabled,
    updateMutation,
    resetMutation,
    handleToggle,
    handleDigestChange,
    handleQuietHoursStartChange,
    handleQuietHoursEndChange,
    handleToggleDisabledType,
    handleUnsubscribeAllMarketing,
    handleSave,
    handleReset,
  } = useNotificationPreferencesDialogLogic(open, onClose);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Notification Preferences
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load preferences. Please try again.
          </Alert>
        ) : (
          <Stack spacing={3}>
            {/* Global Delivery Methods */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Delivery Methods
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Chip
                  icon={<EmailIcon />}
                  label="Email"
                  color={formData.email_enabled ? 'primary' : 'default'}
                  onClick={() => handleToggle('email_enabled')}
                  variant={formData.email_enabled ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<SmsIcon />}
                  label="SMS"
                  color={formData.sms_enabled ? 'primary' : 'default'}
                  onClick={() => handleToggle('sms_enabled')}
                  variant={formData.sms_enabled ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<InAppIcon />}
                  label="In-App"
                  color={formData.in_app_enabled ? 'primary' : 'default'}
                  onClick={() => handleToggle('in_app_enabled')}
                  variant={formData.in_app_enabled ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<PushIcon />}
                  label="Push"
                  color={formData.push_enabled ? 'info' : 'default'}
                  onClick={() => handleToggle('push_enabled')}
                  variant={formData.push_enabled ? 'filled' : 'outlined'}
                />
              </Box>
            </Box>

            <Divider />

            {/* Category Preferences */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Category Preferences</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mb: 1,
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: 'center' }}
                  >
                    Email
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: 'center' }}
                  >
                    SMS
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: 'center' }}
                  >
                    In-App
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: 'center' }}
                  >
                    Push
                  </Typography>
                </Box>
                <Divider sx={{ mb: 1 }} />
                {NOTIFICATION_CATEGORIES.filter((c) => c.value !== 'MARKETING').map((category) => (
                  <React.Fragment key={category.value}>
                    <CategoryToggle
                      categoryKey={category.value.toLowerCase()}
                      label={category.label}
                      formData={formData}
                      onToggle={handleToggle}
                    />
                    <Divider />
                  </React.Fragment>
                ))}

                {/* Marketing Category with Compliance Notice */}
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 2, mb: 1 }}>
                  <Typography variant="caption">
                    <strong>Marketing Communications:</strong> These require your explicit consent.
                    You can withdraw consent at any time.
                  </Typography>
                </Alert>
                <CategoryToggle
                  categoryKey="marketing"
                  label="Marketing & Promotions"
                  isMarketing
                  formData={formData}
                  onToggle={handleToggle}
                />
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UnsubscribeIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Opt out of all marketing at once
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="warning"
                    variant="outlined"
                    onClick={handleUnsubscribeAllMarketing}
                    disabled={isAllMarketingDisabled}
                    startIcon={<UnsubscribeIcon />}
                  >
                    {isAllMarketingDisabled ? 'All Marketing Disabled' : 'Unsubscribe All'}
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Digest Frequency */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  <Typography variant="subtitle2">Digest Settings</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small">
                  <InputLabel>Digest Frequency</InputLabel>
                  <Select
                    value={formData.digest_frequency || 'IMMEDIATE'}
                    label="Digest Frequency"
                    onChange={(e) => handleDigestChange(e.target.value as DigestFrequency)}
                  >
                    {DIGEST_FREQUENCIES.map((freq) => (
                      <MenuItem key={freq.value} value={freq.value}>
                        <Box>
                          <Typography variant="body2">{freq.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {freq.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </AccordionDetails>
            </Accordion>

            {/* Quiet Hours */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  <Typography variant="subtitle2">Quiet Hours</Typography>
                  {formData.quiet_hours_enabled && (
                    <Chip label="Active" size="small" color="success" />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.quiet_hours_enabled)}
                      onChange={() => handleToggle('quiet_hours_enabled')}
                    />
                  }
                  label="Enable quiet hours"
                />
                {formData.quiet_hours_enabled && (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2,
                        mt: 2,
                      }}
                    >
                      <TimePicker
                        label="Start Time"
                        value={quietHoursStart}
                        onChange={handleQuietHoursStartChange}
                        slotProps={{
                          textField: { size: 'small', fullWidth: true },
                        }}
                      />
                      <TimePicker
                        label="End Time"
                        value={quietHoursEnd}
                        onChange={handleQuietHoursEndChange}
                        slotProps={{
                          textField: { size: 'small', fullWidth: true },
                        }}
                      />
                    </Box>
                  </LocalizationProvider>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: 'block' }}
                >
                  During quiet hours, non-urgent notifications will be held until the quiet period
                  ends.
                </Typography>
              </AccordionDetails>
            </Accordion>

            {/* Fine-Tune: Disable Specific Notification Types */}
            {notificationTypes.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TuneIcon fontSize="small" />
                    <Typography variant="subtitle2">Fine-Tune Notifications</Typography>
                    {disabledTypes.length > 0 && (
                      <Chip
                        label={`${disabledTypes.length} disabled`}
                        size="small"
                        color="warning"
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 2, display: 'block' }}
                  >
                    Disable specific notification types while keeping the rest of the category
                    enabled. Unchecked types will not generate notifications.
                  </Typography>
                  {Object.entries(typesByCategory).map(([category, types]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        {getCategoryIcon(category)}
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color="text.secondary"
                          textTransform="uppercase"
                        >
                          {NOTIFICATION_CATEGORIES.find((c) => c.value === category)?.label ||
                            category}
                        </Typography>
                      </Box>
                      {types.map((type) => (
                        <FormControlLabel
                          key={type.id}
                          control={
                            <Checkbox
                              size="small"
                              checked={!disabledTypes.includes(type.id)}
                              onChange={() => handleToggleDisabledType(type.id)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">{type.name}</Typography>
                              {type.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {type.description}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            ml: 1,
                            mb: 0.5,
                          }}
                        />
                      ))}
                      <Divider sx={{ mt: 1 }} />
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleReset}
          disabled={resetMutation.isPending || isLoading}
          color="inherit"
        >
          {resetMutation.isPending ? <CircularProgress size={20} /> : 'Reset to Defaults'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending || isLoading}
        >
          {updateMutation.isPending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Save Changes'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationPreferencesDialog;
