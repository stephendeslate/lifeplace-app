// frontend/client-portal/src/components/notifications/NotificationPreferencesDialog.tsx

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Switch,
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
  Stack,
} from "@mui/material";
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Notifications as InAppIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  Description as ContractIcon,
  AccountTree as WorkflowIcon,
  Campaign as CampaignIcon,
  PhoneIphone as PushIcon,
  Warning as WarningIcon,
  Tune as TuneIcon,
  Unsubscribe as UnsubscribeIcon,
} from "@mui/icons-material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useQuery } from "@tanstack/react-query";
import { useNotificationPreferences } from "../../hooks/useNotificationPreferences";
import { notificationsApi } from "../../apis/notifications.api";
import type {
  UpdateNotificationPreferenceData,
  DigestFrequency,
  NotificationType,
} from "../../types/notifications.types";
import {
  NOTIFICATION_CATEGORIES,
  DIGEST_FREQUENCIES,
} from "../../types/notifications.types";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

// Category icon mapping
const getCategoryIcon = (categoryValue: string) => {
  switch (categoryValue) {
    case "EVENT":
      return <EventIcon fontSize="small" />;
    case "PAYMENT":
      return <PaymentIcon fontSize="small" />;
    case "COMMUNICATION":
      return <MessageIcon fontSize="small" />;
    case "SYSTEM":
      return <SettingsIcon fontSize="small" />;
    case "TASK":
      return <TaskIcon fontSize="small" />;
    case "CLIENT":
      return <PersonIcon fontSize="small" />;
    case "CONTRACT":
      return <ContractIcon fontSize="small" />;
    case "WORKFLOW":
      return <WorkflowIcon fontSize="small" />;
    case "MARKETING":
      return <CampaignIcon fontSize="small" />;
    default:
      return <InAppIcon fontSize="small" />;
  }
};

export const NotificationPreferencesDialog: React.FC<
  NotificationPreferencesDialogProps
> = ({ open, onClose }) => {
  const { useMyPreferences, useUpdatePreferences, useResetPreferences } =
    useNotificationPreferences();

  const { data: preferences, isLoading, error } = useMyPreferences();
  const updateMutation = useUpdatePreferences();
  const resetMutation = useResetPreferences();

  // Fetch available notification types for per-type disabling
  const { data: notificationTypes = [] } = useQuery({
    queryKey: ["notification-types-active"],
    queryFn: notificationsApi.getNotificationTypes,
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });

  // Local form state
  const [formData, setFormData] = useState<
    Partial<UpdateNotificationPreferenceData>
  >({});
  const [disabledTypes, setDisabledTypes] = useState<number[]>([]);
  const [quietHoursStart, setQuietHoursStart] = useState<Date | null>(null);
  const [quietHoursEnd, setQuietHoursEnd] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData({
        // Global toggles
        email_enabled: preferences.email_enabled,
        sms_enabled: preferences.sms_enabled,
        in_app_enabled: preferences.in_app_enabled,
        push_enabled: preferences.push_enabled,
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        digest_frequency: preferences.digest_frequency,
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
        // Marketing preferences (explicit consent required)
        marketing_email: preferences.marketing_email,
        marketing_sms: preferences.marketing_sms,
        marketing_in_app: preferences.marketing_in_app,
        marketing_push: preferences.marketing_push,
      });

      // Initialize disabled types
      setDisabledTypes(preferences.disabled_types || []);

      // Parse quiet hours times
      if (preferences.quiet_hours_start) {
        const [hours, minutes] = preferences.quiet_hours_start.split(":");
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0);
        setQuietHoursStart(date);
      }
      if (preferences.quiet_hours_end) {
        const [hours, minutes] = preferences.quiet_hours_end.split(":");
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0);
        setQuietHoursEnd(date);
      }
    }
  }, [preferences]);

  const handleToggle = (field: keyof UpdateNotificationPreferenceData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
    setHasChanges(true);
  };

  const handleDigestChange = (frequency: DigestFrequency) => {
    setFormData((prev) => ({
      ...prev,
      digest_frequency: frequency,
    }));
    setHasChanges(true);
  };

  const handleQuietHoursStartChange = (newValue: Date | null) => {
    setQuietHoursStart(newValue);
    setHasChanges(true);
  };

  const handleQuietHoursEndChange = (newValue: Date | null) => {
    setQuietHoursEnd(newValue);
    setHasChanges(true);
  };

  const handleToggleDisabledType = (typeId: number) => {
    setDisabledTypes((prev) => {
      if (prev.includes(typeId)) {
        return prev.filter((id) => id !== typeId);
      }
      return [...prev, typeId];
    });
    setHasChanges(true);
  };

  const handleUnsubscribeAllMarketing = () => {
    setFormData((prev) => ({
      ...prev,
      marketing_email: false,
      marketing_sms: false,
      marketing_in_app: false,
      marketing_push: false,
    }));
    setHasChanges(true);
  };

  // Group notification types by category for the disabled types section
  const typesByCategory = useMemo(() => {
    const grouped: Record<string, NotificationType[]> = {};
    notificationTypes.forEach((type) => {
      const cat = type.category || "OTHER";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(type);
    });
    return grouped;
  }, [notificationTypes]);

  const isAllMarketingDisabled =
    !formData.marketing_email &&
    !formData.marketing_sms &&
    !formData.marketing_in_app &&
    !formData.marketing_push;

  const handleSave = () => {
    const dataToSave: UpdateNotificationPreferenceData = {
      ...formData,
      disabled_types: disabledTypes,
    };

    // Add quiet hours times if enabled
    if (formData.quiet_hours_enabled) {
      if (quietHoursStart) {
        dataToSave.quiet_hours_start = `${quietHoursStart.getHours().toString().padStart(2, "0")}:${quietHoursStart.getMinutes().toString().padStart(2, "0")}`;
      }
      if (quietHoursEnd) {
        dataToSave.quiet_hours_end = `${quietHoursEnd.getHours().toString().padStart(2, "0")}:${quietHoursEnd.getMinutes().toString().padStart(2, "0")}`;
      }
    }

    updateMutation.mutate(dataToSave, {
      onSuccess: () => {
        setHasChanges(false);
        onClose();
      },
    });
  };

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  const renderCategoryToggle = (
    categoryKey: string,
    label: string,
    isMarketing: boolean = false,
  ) => {
    const emailKey =
      `${categoryKey}_email` as keyof UpdateNotificationPreferenceData;
    const smsKey =
      `${categoryKey}_sms` as keyof UpdateNotificationPreferenceData;
    const inAppKey =
      `${categoryKey}_in_app` as keyof UpdateNotificationPreferenceData;
    const pushKey =
      `${categoryKey}_push` as keyof UpdateNotificationPreferenceData;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
          ...(isMarketing && {
            bgcolor: "warning.50",
            mx: -2,
            px: 2,
            borderRadius: 1,
          }),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {getCategoryIcon(categoryKey.toUpperCase())}
          <Typography variant="body2">{label}</Typography>
          {isMarketing && (
            <Chip
              label="Consent"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ ml: 0.5, height: 20 }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={Boolean(formData[emailKey])}
                onChange={() => handleToggle(emailKey)}
                disabled={!formData.email_enabled}
              />
            }
            label={
              <EmailIcon
                fontSize="small"
                color={formData[emailKey] ? "primary" : "disabled"}
              />
            }
            labelPlacement="top"
            sx={{ mx: 0 }}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={Boolean(formData[smsKey])}
                onChange={() => handleToggle(smsKey)}
                disabled={!formData.sms_enabled}
              />
            }
            label={
              <SmsIcon
                fontSize="small"
                color={formData[smsKey] ? "primary" : "disabled"}
              />
            }
            labelPlacement="top"
            sx={{ mx: 0 }}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={Boolean(formData[inAppKey])}
                onChange={() => handleToggle(inAppKey)}
                disabled={!formData.in_app_enabled}
              />
            }
            label={
              <InAppIcon
                fontSize="small"
                color={formData[inAppKey] ? "primary" : "disabled"}
              />
            }
            labelPlacement="top"
            sx={{ mx: 0 }}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={Boolean(formData[pushKey])}
                onChange={() => handleToggle(pushKey)}
                disabled={!formData.push_enabled}
              />
            }
            label={
              <PushIcon
                fontSize="small"
                color={formData[pushKey] ? "primary" : "disabled"}
              />
            }
            labelPlacement="top"
            sx={{ mx: 0 }}
          />
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
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
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Delivery Methods
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  icon={<EmailIcon />}
                  label="Email"
                  color={formData.email_enabled ? "primary" : "default"}
                  onClick={() => handleToggle("email_enabled")}
                  variant={formData.email_enabled ? "filled" : "outlined"}
                />
                <Chip
                  icon={<SmsIcon />}
                  label="SMS"
                  color={formData.sms_enabled ? "primary" : "default"}
                  onClick={() => handleToggle("sms_enabled")}
                  variant={formData.sms_enabled ? "filled" : "outlined"}
                />
                <Chip
                  icon={<InAppIcon />}
                  label="In-App"
                  color={formData.in_app_enabled ? "primary" : "default"}
                  onClick={() => handleToggle("in_app_enabled")}
                  variant={formData.in_app_enabled ? "filled" : "outlined"}
                />
                <Chip
                  icon={<PushIcon />}
                  label="Push"
                  color={formData.push_enabled ? "info" : "default"}
                  onClick={() => handleToggle("push_enabled")}
                  variant={formData.push_enabled ? "filled" : "outlined"}
                />
              </Box>
            </Box>

            <Divider />

            {/* Category Preferences */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  Category Preferences
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    mb: 1,
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: "center" }}
                  >
                    Email
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: "center" }}
                  >
                    SMS
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: "center" }}
                  >
                    In-App
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 40, textAlign: "center" }}
                  >
                    Push
                  </Typography>
                </Box>
                <Divider sx={{ mb: 1 }} />
                {NOTIFICATION_CATEGORIES.filter(
                  (c) => c.value !== "MARKETING",
                ).map((category) => (
                  <React.Fragment key={category.value}>
                    {renderCategoryToggle(
                      category.value.toLowerCase(),
                      category.label,
                    )}
                    <Divider />
                  </React.Fragment>
                ))}

                {/* Marketing Category with Compliance Notice */}
                <Alert
                  severity="warning"
                  icon={<WarningIcon />}
                  sx={{ mt: 2, mb: 1 }}
                >
                  <Typography variant="caption">
                    <strong>Marketing Communications:</strong> These require
                    your explicit consent. You can withdraw consent at any time.
                  </Typography>
                </Alert>
                {renderCategoryToggle(
                  "marketing",
                  "Marketing & Promotions",
                  true,
                )}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                    {isAllMarketingDisabled
                      ? "All Marketing Disabled"
                      : "Unsubscribe All"}
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Digest Frequency */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  <Typography variant="subtitle2">Digest Settings</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small">
                  <InputLabel>Digest Frequency</InputLabel>
                  <Select
                    value={formData.digest_frequency || "IMMEDIATE"}
                    label="Digest Frequency"
                    onChange={(e) =>
                      handleDigestChange(e.target.value as DigestFrequency)
                    }
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                      onChange={() => handleToggle("quiet_hours_enabled")}
                    />
                  }
                  label="Enable quiet hours"
                />
                {formData.quiet_hours_enabled && (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        mt: 2,
                      }}
                    >
                      <TimePicker
                        label="Start Time"
                        value={quietHoursStart}
                        onChange={handleQuietHoursStartChange}
                        slotProps={{
                          textField: { size: "small", fullWidth: true },
                        }}
                      />
                      <TimePicker
                        label="End Time"
                        value={quietHoursEnd}
                        onChange={handleQuietHoursEndChange}
                        slotProps={{
                          textField: { size: "small", fullWidth: true },
                        }}
                      />
                    </Box>
                  </LocalizationProvider>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: "block" }}
                >
                  During quiet hours, non-urgent notifications will be held
                  until the quiet period ends.
                </Typography>
              </AccordionDetails>
            </Accordion>

            {/* Fine-Tune: Disable Specific Notification Types */}
            {notificationTypes.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TuneIcon fontSize="small" />
                    <Typography variant="subtitle2">
                      Fine-Tune Notifications
                    </Typography>
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
                    sx={{ mb: 2, display: "block" }}
                  >
                    Disable specific notification types while keeping the rest
                    of the category enabled. Unchecked types will not generate
                    notifications.
                  </Typography>
                  {Object.entries(typesByCategory).map(([category, types]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
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
                          {NOTIFICATION_CATEGORIES.find(
                            (c) => c.value === category,
                          )?.label || category}
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
                              <Typography variant="body2">
                                {type.name}
                              </Typography>
                              {type.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {type.description}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
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
          {resetMutation.isPending ? (
            <CircularProgress size={20} />
          ) : (
            "Reset to Defaults"
          )}
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
            "Save Changes"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationPreferencesDialog;
