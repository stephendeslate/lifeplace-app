// Push Notification Device Management Page
// Allows admins to view registered devices and send test push notifications

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  PhoneAndroid as AndroidIcon,
  PhoneIphone as IosIcon,
  Computer as WebIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../../../apis/notifications.api";
import { useToastActions } from "../../../contexts/ToastContext";
import { ModernPageHeader } from "../../../components/common/ModernPageHeader";
import { ModernSettingsLayout } from "../../../components/common/ModernPageLayout";
import type { DevicePushToken } from "../../../types/notifications.types";

const deviceTypeIcon = (type: string) => {
  switch (type) {
    case "ios":
      return <IosIcon fontSize="small" />;
    case "android":
      return <AndroidIcon fontSize="small" />;
    case "web":
      return <WebIcon fontSize="small" />;
    default:
      return <AndroidIcon fontSize="small" />;
  }
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString();
};

export const PushDevices: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();
  const [testTitle, setTestTitle] = useState("Test Notification");
  const [testBody, setTestBody] = useState(
    "This is a test push notification from LifePlace.",
  );

  const {
    data: devicesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["push-devices"],
    queryFn: notificationsApi.getMyDevices,
    staleTime: 60 * 1000,
  });

  const devices = devicesData?.devices ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-devices"] });
      showSuccess("Device Removed", "Push token has been unregistered.");
    },
    onError: () => {
      showError("Delete Failed", "Failed to remove device.");
    },
  });

  const testPushMutation = useMutation({
    mutationFn: (data: { title?: string; body?: string; device_id?: string }) =>
      notificationsApi.sendTestPush(data),
    onSuccess: (result) => {
      showSuccess("Test Sent", result.message);
    },
    onError: () => {
      showError("Test Failed", "Failed to send test push notification.");
    },
  });

  const handleSendTestToAll = () => {
    testPushMutation.mutate({
      title: testTitle || undefined,
      body: testBody || undefined,
    });
  };

  const handleSendTestToDevice = (device: DevicePushToken) => {
    testPushMutation.mutate({
      title: testTitle || undefined,
      body: testBody || undefined,
      device_id: device.device_id || undefined,
    });
  };

  return (
    <ModernSettingsLayout>
      <ModernPageHeader
        title="Push Devices"
        subtitle="View registered push notification devices and send test notifications"
        size="medium"
      />

      <Stack spacing={3}>
        {/* Send Test Push */}
        <Box sx={{ bgcolor: "background.paper", borderRadius: 1, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Send Test Push Notification
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send a test push notification to verify delivery to your registered
            devices.
          </Typography>
          <Stack spacing={2}>
            <Box display="flex" gap={2}>
              <TextField
                label="Title"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Body"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                size="small"
                sx={{ flex: 2 }}
              />
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={
                  testPushMutation.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SendIcon />
                  )
                }
                onClick={handleSendTestToAll}
                disabled={testPushMutation.isPending || devices.length === 0}
              >
                Send to All Devices ({devices.length})
              </Button>
            </Box>
          </Stack>
          {devices.length === 0 && !isLoading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No devices registered. Install the LifePlace mobile app and enable
              push notifications to register a device.
            </Alert>
          )}
        </Box>

        {/* Registered Devices */}
        <Box sx={{ bgcolor: "background.paper", borderRadius: 1, p: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">
              Registered Devices ({devices.length})
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : devices.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              py={4}
            >
              No push notification devices registered.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Device</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Failures</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {deviceTypeIcon(device.device_type)}
                          <Box>
                            <Typography variant="body2">
                              {device.device_name || "Unknown Device"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {device.token.substring(0, 30)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={device.device_type.toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={device.is_active ? "Active" : "Inactive"}
                          size="small"
                          color={device.is_active ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(device.last_used_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={
                            device.failure_count > 0
                              ? "error.main"
                              : "text.secondary"
                          }
                        >
                          {device.failure_count}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {device.app_version || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" gap={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            startIcon={<SendIcon />}
                            onClick={() => handleSendTestToDevice(device)}
                            disabled={testPushMutation.isPending}
                          >
                            Test
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => deleteMutation.mutate(device.id)}
                            disabled={deleteMutation.isPending}
                          >
                            Remove
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Stack>
    </ModernSettingsLayout>
  );
};
