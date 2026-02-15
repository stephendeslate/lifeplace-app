// Admin dialog for viewing/editing a client's notification preferences

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from "@mui/material";
import {
  ExpandMore,
  Email,
  Sms,
  Notifications,
  PhoneIphone,
  Campaign,
  Warning,
  Block,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ModernDialog } from "../common";
import { notificationsApi } from "../../apis/notifications.api";
import { useNotificationTypes } from "../../hooks/useNotifications";
import { useToastActions } from "../../contexts/ToastContext";
import type { UpdateNotificationPreferenceData } from "../../types/notifications.types";
import { DIGEST_FREQUENCIES } from "../../types/notifications.types";

interface ClientNotificationPreferencesProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  clientName: string;
}

export const ClientNotificationPreferences: React.FC<
  ClientNotificationPreferencesProps
> = ({ open, onClose, userId, clientName }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();
  const [formData, setFormData] = useState<UpdateNotificationPreferenceData>(
    {},
  );
  const [hasChanges, setHasChanges] = useState(false);

  const { notificationTypes } = useNotificationTypes({ is_active: true });

  // Fetch this client's preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", "all", userId],
    queryFn: () => notificationsApi.getAllPreferences(userId),
    enabled: open && !!userId,
    staleTime: 60 * 1000,
  });

  const clientPreference = preferences?.[0];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateNotificationPreferenceData) =>
      notificationsApi.updatePreferenceById(clientPreference!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notification-preferences", "all", userId],
      });
      showSuccess(
        "Preferences Updated",
        `Notification preferences for ${clientName} have been updated.`,
      );
      setHasChanges(false);
    },
    onError: () => {
      showError(
        "Update Failed",
        "Failed to update client notification preferences.",
      );
    },
  });

  // Initialize form data when preferences load
  useEffect(() => {
    if (clientPreference) {
      setFormData({
        email_enabled: clientPreference.email_enabled,
        sms_enabled: clientPreference.sms_enabled,
        in_app_enabled: clientPreference.in_app_enabled,
        push_enabled: clientPreference.push_enabled,
        system_email: clientPreference.system_email,
        system_sms: clientPreference.system_sms,
        system_in_app: clientPreference.system_in_app,
        system_push: clientPreference.system_push,
        event_email: clientPreference.event_email,
        event_sms: clientPreference.event_sms,
        event_in_app: clientPreference.event_in_app,
        event_push: clientPreference.event_push,
        task_email: clientPreference.task_email,
        task_sms: clientPreference.task_sms,
        task_in_app: clientPreference.task_in_app,
        task_push: clientPreference.task_push,
        payment_email: clientPreference.payment_email,
        payment_sms: clientPreference.payment_sms,
        payment_in_app: clientPreference.payment_in_app,
        payment_push: clientPreference.payment_push,
        client_email: clientPreference.client_email,
        client_sms: clientPreference.client_sms,
        client_in_app: clientPreference.client_in_app,
        client_push: clientPreference.client_push,
        contract_email: clientPreference.contract_email,
        contract_sms: clientPreference.contract_sms,
        contract_in_app: clientPreference.contract_in_app,
        contract_push: clientPreference.contract_push,
        workflow_email: clientPreference.workflow_email,
        workflow_sms: clientPreference.workflow_sms,
        workflow_in_app: clientPreference.workflow_in_app,
        workflow_push: clientPreference.workflow_push,
        communication_email: clientPreference.communication_email,
        communication_sms: clientPreference.communication_sms,
        communication_in_app: clientPreference.communication_in_app,
        communication_push: clientPreference.communication_push,
        marketing_email: clientPreference.marketing_email,
        marketing_sms: clientPreference.marketing_sms,
        marketing_in_app: clientPreference.marketing_in_app,
        marketing_push: clientPreference.marketing_push,
        quiet_hours_enabled: clientPreference.quiet_hours_enabled,
        digest_frequency: clientPreference.digest_frequency,
        disabled_types: clientPreference.disabled_types,
      });
      setHasChanges(false);
    }
  }, [clientPreference]);

  const handleFieldChange = (
    field: keyof UpdateNotificationPreferenceData,
    value: boolean | string | number[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleDisabledTypesChange = (typeId: number, disabled: boolean) => {
    const currentDisabled = formData.disabled_types || [];
    const newDisabled = disabled
      ? [...currentDisabled, typeId]
      : currentDisabled.filter((id) => id !== typeId);
    handleFieldChange("disabled_types", newDisabled);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const renderChannelToggles = (category: string, label: string) => {
    const key = category.toLowerCase();
    return (
      <Card key={category} variant="outlined" sx={{ mb: 1.5 }}>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            {label}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={
                    (formData[
                      `${key}_email` as keyof UpdateNotificationPreferenceData
                    ] as boolean) ?? false
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      `${key}_email` as keyof UpdateNotificationPreferenceData,
                      e.target.checked,
                    )
                  }
                  disabled={!formData.email_enabled}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Email sx={{ fontSize: 16 }} />
                  <Typography variant="caption">Email</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={
                    (formData[
                      `${key}_sms` as keyof UpdateNotificationPreferenceData
                    ] as boolean) ?? false
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      `${key}_sms` as keyof UpdateNotificationPreferenceData,
                      e.target.checked,
                    )
                  }
                  disabled={!formData.sms_enabled}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Sms sx={{ fontSize: 16 }} />
                  <Typography variant="caption">SMS</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={
                    (formData[
                      `${key}_in_app` as keyof UpdateNotificationPreferenceData
                    ] as boolean) ?? false
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      `${key}_in_app` as keyof UpdateNotificationPreferenceData,
                      e.target.checked,
                    )
                  }
                  disabled={!formData.in_app_enabled}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Notifications sx={{ fontSize: 16 }} />
                  <Typography variant="caption">In-App</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={
                    (formData[
                      `${key}_push` as keyof UpdateNotificationPreferenceData
                    ] as boolean) ?? false
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      `${key}_push` as keyof UpdateNotificationPreferenceData,
                      e.target.checked,
                    )
                  }
                  disabled={!formData.push_enabled}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PhoneIphone sx={{ fontSize: 16 }} />
                  <Typography variant="caption">Push</Typography>
                </Box>
              }
            />
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <ModernDialog
      open={open}
      onClose={onClose}
      title={`Notification Preferences: ${clientName}`}
      maxWidth="md"
      fullWidth
      actions={[
        { label: "Cancel", onClick: onClose, variant: "outlined" as const },
        {
          label: updateMutation.isPending ? "Saving..." : "Save Changes",
          onClick: handleSave,
          variant: "contained" as const,
          disabled:
            !hasChanges || updateMutation.isPending || !clientPreference,
        },
      ]}
    >
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !clientPreference ? (
        <Alert severity="info">
          No notification preferences found for this client. Preferences are
          created when the client first logs into the portal.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {/* Global Delivery Methods */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            fontWeight={600}
          >
            Global Delivery Methods
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Paper sx={{ p: 1.5, flex: 1, minWidth: 120, textAlign: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.email_enabled ?? true}
                    onChange={(e) =>
                      handleFieldChange("email_enabled", e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Email fontSize="small" />
                    <Typography variant="body2">Email</Typography>
                  </Box>
                }
              />
            </Paper>
            <Paper sx={{ p: 1.5, flex: 1, minWidth: 120, textAlign: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.sms_enabled ?? false}
                    onChange={(e) =>
                      handleFieldChange("sms_enabled", e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Sms fontSize="small" />
                    <Typography variant="body2">SMS</Typography>
                  </Box>
                }
              />
            </Paper>
            <Paper sx={{ p: 1.5, flex: 1, minWidth: 120, textAlign: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.in_app_enabled ?? true}
                    onChange={(e) =>
                      handleFieldChange("in_app_enabled", e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Notifications fontSize="small" />
                    <Typography variant="body2">In-App</Typography>
                  </Box>
                }
              />
            </Paper>
            <Paper sx={{ p: 1.5, flex: 1, minWidth: 120, textAlign: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.push_enabled ?? true}
                    onChange={(e) =>
                      handleFieldChange("push_enabled", e.target.checked)
                    }
                  />
                }
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PhoneIphone fontSize="small" />
                    <Typography variant="body2">Push</Typography>
                  </Box>
                }
              />
            </Paper>
          </Stack>

          {/* Category Preferences */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            fontWeight={600}
            sx={{ mt: 1 }}
          >
            Category Preferences
          </Typography>
          {renderChannelToggles("SYSTEM", "System Updates")}
          {renderChannelToggles("EVENT", "Event Management")}
          {renderChannelToggles("TASK", "Task Assignments")}
          {renderChannelToggles("PAYMENT", "Payment Processing")}
          {renderChannelToggles("CLIENT", "Client Management")}
          {renderChannelToggles("CONTRACT", "Contract Updates")}
          {renderChannelToggles("WORKFLOW", "Workflow Progress")}
          {renderChannelToggles("COMMUNICATION", "Communication Alerts")}

          {/* Marketing */}
          <Card variant="outlined" sx={{ borderColor: "warning.300" }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Campaign sx={{ color: "warning.main", fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={600}>
                  Marketing & Promotions
                </Typography>
                <Chip
                  label="Requires Consent"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Box>
              <Alert
                severity="warning"
                icon={<Warning />}
                sx={{ mb: 1.5, py: 0 }}
              >
                <Typography variant="caption">
                  Marketing communications require explicit DPA consent. Only
                  enable with documented consent.
                </Typography>
              </Alert>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={formData.marketing_email ?? false}
                      onChange={(e) =>
                        handleFieldChange("marketing_email", e.target.checked)
                      }
                      disabled={!formData.email_enabled}
                    />
                  }
                  label={
                    <Typography variant="caption">Marketing Email</Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={formData.marketing_sms ?? false}
                      onChange={(e) =>
                        handleFieldChange("marketing_sms", e.target.checked)
                      }
                      disabled={!formData.sms_enabled}
                    />
                  }
                  label={
                    <Typography variant="caption">Marketing SMS</Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={formData.marketing_in_app ?? true}
                      onChange={(e) =>
                        handleFieldChange("marketing_in_app", e.target.checked)
                      }
                      disabled={!formData.in_app_enabled}
                    />
                  }
                  label={
                    <Typography variant="caption">Marketing In-App</Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={formData.marketing_push ?? false}
                      onChange={(e) =>
                        handleFieldChange("marketing_push", e.target.checked)
                      }
                      disabled={!formData.push_enabled}
                    />
                  }
                  label={
                    <Typography variant="caption">Marketing Push</Typography>
                  }
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            fontWeight={600}
            sx={{ mt: 1 }}
          >
            Advanced
          </Typography>
          <FormControl size="small" sx={{ maxWidth: 250 }}>
            <InputLabel>Digest Frequency</InputLabel>
            <Select
              value={formData.digest_frequency || "IMMEDIATE"}
              onChange={(e) =>
                handleFieldChange("digest_frequency", e.target.value)
              }
              label="Digest Frequency"
            >
              {DIGEST_FREQUENCIES.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Disabled Types */}
          {notificationTypes.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Block fontSize="small" />
                  <Typography variant="subtitle2">Disabled Types</Typography>
                  {formData.disabled_types &&
                    formData.disabled_types.length > 0 && (
                      <Chip
                        label={formData.disabled_types.length}
                        size="small"
                        color="primary"
                      />
                    )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={0.5}>
                  {notificationTypes.map((type) => (
                    <FormControlLabel
                      key={type.id}
                      control={
                        <Switch
                          size="small"
                          checked={!formData.disabled_types?.includes(type.id)}
                          onChange={(e) =>
                            handleDisabledTypesChange(
                              type.id,
                              !e.target.checked,
                            )
                          }
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{type.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {type.description}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      )}
    </ModernDialog>
  );
};
