// frontend/admin-crm/src/pages/analytics/AnalyticsSettings.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Alert,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  Security as SecurityIcon,
  Delete as DeleteIcon,
  Build as MaintenanceIcon,
  Assessment as ReportIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useAnalyticsAdmin } from '../../hooks/useAnalytics';

interface SettingsCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, description, icon, children }) => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Box 
            sx={{ 
              p: 1, 
              borderRadius: 1, 
              bgcolor: 'primary.50',
              color: 'primary.main' 
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
};

interface MaintenanceDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  isLoading: boolean;
}

const MaintenanceDialog: React.FC<MaintenanceDialogProps> = ({
  open,
  onClose,
  title,
  description,
  confirmText,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          {title}
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color="warning"
          disabled={isLoading}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const AnalyticsSettings: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [settings, setSettings] = useState({
    autoAggregation: true,
    dataRetention: '90',
    alertEvaluation: true,
    realTimeUpdates: true,
    eventTracking: true,
    performanceMode: false,
  });

  const [maintenanceDialog, setMaintenanceDialog] = useState<{
    open: boolean;
    type: 'aggregations' | 'cleanup' | 'alerts' | null;
  }>({
    open: false,
    type: null,
  });

  const {
    createDailyAggregations,
    cleanupOldEvents,
    evaluateAlerts,
    isCreatingAggregations,
    isCleaningUpEvents,
    isEvaluatingAlerts,
  } = useAnalyticsAdmin();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Analytics', path: '/analytics' },
      { label: 'Settings' },
    ]);
  }, [setBreadcrumbs]);

  const handleSettingChange = (setting: string, value: boolean | string) => {
    setSettings({ ...settings, [setting]: value });
    // TODO: Save settings to backend
  };

  const handleOpenMaintenanceDialog = (type: 'aggregations' | 'cleanup' | 'alerts') => {
    setMaintenanceDialog({ open: true, type });
  };

  const handleCloseMaintenanceDialog = () => {
    setMaintenanceDialog({ open: false, type: null });
  };

  const handleConfirmMaintenance = () => {
    switch (maintenanceDialog.type) {
      case 'aggregations':
        createDailyAggregations(new Date().toISOString());
        break;
      case 'cleanup':
        cleanupOldEvents(parseInt(settings.dataRetention));
        break;
      case 'alerts':
        evaluateAlerts();
        break;
    }
    handleCloseMaintenanceDialog();
  };

  const getMaintenanceDialogProps = () => {
    switch (maintenanceDialog.type) {
      case 'aggregations':
        return {
          title: 'Create Daily Aggregations',
          description: 'This will process and aggregate analytics data for today. This operation may take several minutes to complete.',
          confirmText: 'Create Aggregations',
          isLoading: isCreatingAggregations,
        };
      case 'cleanup':
        return {
          title: 'Cleanup Old Events',
          description: `This will permanently delete analytics events older than ${settings.dataRetention} days. This action cannot be undone.`,
          confirmText: 'Delete Old Events',
          isLoading: isCleaningUpEvents,
        };
      case 'alerts':
        return {
          title: 'Evaluate Alert Rules',
          description: 'This will manually evaluate all active alert rules and trigger notifications if thresholds are met.',
          confirmText: 'Evaluate Alerts',
          isLoading: isEvaluatingAlerts,
        };
      default:
        return {
          title: '',
          description: '',
          confirmText: '',
          isLoading: false,
        };
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Analytics Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure analytics system behavior and maintenance operations
        </Typography>
      </Box>

      <Stack spacing={3}>
        {/* Data Collection Settings */}
        <SettingsCard
          title="Data Collection"
          description="Configure how analytics data is collected and processed"
          icon={<StorageIcon />}
        >
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.eventTracking}
                  onChange={(e) => handleSettingChange('eventTracking', e.target.checked)}
                />
              }
              label="Enable Event Tracking"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.realTimeUpdates}
                  onChange={(e) => handleSettingChange('realTimeUpdates', e.target.checked)}
                />
              }
              label="Real-time Metric Updates"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.performanceMode}
                  onChange={(e) => handleSettingChange('performanceMode', e.target.checked)}
                />
              }
              label="Performance Mode (Reduced accuracy for better performance)"
            />
          </Stack>
        </SettingsCard>

        {/* Data Retention Settings */}
        <SettingsCard
          title="Data Retention"
          description="Manage how long analytics data is stored"
          icon={<ScheduleIcon />}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Event Data Retention (days)
              </Typography>
              <TextField
                type="number"
                size="small"
                value={settings.dataRetention}
                onChange={(e) => handleSettingChange('dataRetention', e.target.value)}
                inputProps={{ min: 1, max: 365 }}
                sx={{ width: 120 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Events older than this will be automatically deleted
              </Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoAggregation}
                  onChange={(e) => handleSettingChange('autoAggregation', e.target.checked)}
                />
              }
              label="Automatic Daily Aggregations"
            />
          </Stack>
        </SettingsCard>

        {/* Alert Settings */}
        <SettingsCard
          title="Alert System"
          description="Configure alert rule evaluation and notifications"
          icon={<NotificationIcon />}
        >
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.alertEvaluation}
                  onChange={(e) => handleSettingChange('alertEvaluation', e.target.checked)}
                />
              }
              label="Enable Alert Evaluation"
            />
            
            <Alert severity="info">
              Alert rules are evaluated every 5 minutes when enabled. Individual rules can have custom evaluation frequencies.
            </Alert>
          </Stack>
        </SettingsCard>

        {/* System Maintenance */}
        <SettingsCard
          title="System Maintenance"
          description="Perform maintenance operations and system checks"
          icon={<MaintenanceIcon />}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Manual Operations
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => handleOpenMaintenanceDialog('aggregations')}
                  disabled={isCreatingAggregations}
                >
                  Create Daily Aggregations
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleOpenMaintenanceDialog('cleanup')}
                  disabled={isCleaningUpEvents}
                  color="warning"
                >
                  Cleanup Old Events
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<NotificationIcon />}
                  onClick={() => handleOpenMaintenanceDialog('alerts')}
                  disabled={isEvaluatingAlerts}
                >
                  Evaluate Alert Rules
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                System Status
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <SuccessIcon color="success" fontSize="small" />
                  <Typography variant="body2">
                    Analytics system is operational
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip label="Event Tracking: Active" size="small" color="success" />
                  <Chip label="Data Processing: Normal" size="small" color="info" />
                  <Chip label="Alerts: Monitoring" size="small" color="warning" />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </SettingsCard>

        {/* Security & Privacy */}
        <SettingsCard
          title="Security & Privacy"
          description="Data protection and privacy settings"
          icon={<SecurityIcon />}
        >
          <Stack spacing={2}>
            <Alert severity="info">
              All analytics data is processed securely and in compliance with privacy regulations. Personal data is anonymized where possible.
            </Alert>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Data Processing
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  • User data is anonymized in analytics events
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • IP addresses are hashed for privacy
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Session data expires automatically
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Data retention policies are enforced
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </SettingsCard>

        {/* Export & Backup */}
        <SettingsCard
          title="Export & Backup"
          description="Data export and backup options"
          icon={<ReportIcon />}
        >
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Export analytics data and configurations for backup or migration purposes.
            </Typography>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="outlined" disabled>
                Export Metrics Configuration
              </Button>
              <Button variant="outlined" disabled>
                Export Dashboard Settings
              </Button>
              <Button variant="outlined" disabled>
                Export Alert Rules
              </Button>
            </Stack>
            
            <Alert severity="warning">
              Data export functionality is coming soon.
            </Alert>
          </Stack>
        </SettingsCard>
      </Stack>

      {/* Maintenance Dialog */}
      <MaintenanceDialog
        open={maintenanceDialog.open}
        onClose={handleCloseMaintenanceDialog}
        onConfirm={handleConfirmMaintenance}
        {...getMaintenanceDialogProps()}
      />
    </Box>
  );
};