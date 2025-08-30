// frontend/admin-crm/src/pages/analytics/AlertsManagement.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useAlertRules } from '../../hooks/useAnalytics';
import { LoadingAlertRulesTable } from '../../components/common/LoadingTable';
import { NoAlertRulesEmptyState } from '../../components/common/EmptyState';
import { AlertRuleForm } from '../../components/analytics/alerts/AlertRuleForm';
import { AlertRuleTable } from '../../components/analytics/alerts/AlertRuleTable';
import { AlertTester } from '../../components/analytics/alerts/AlertTester';
import { NotificationSettings } from '../../components/analytics/alerts/NotificationSettings';
import type { AlertRule, AlertRuleFilters, CreateAlertRuleData, UpdateAlertRuleData } from '../../types/analytics.types';

export const AlertsManagement: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showAlertTester, setShowAlertTester] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [testingRule, setTestingRule] = useState<AlertRule | null>(null);
  const [filters, setFilters] = useState<AlertRuleFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const {
    rules,
    isLoadingRules,
    createRule,
    updateRule,
    deleteRule,
    testRule,
    refetchRules,
    isCreatingRule,
    isUpdatingRule,
    isDeletingRule,
    isTestingRule,
    testResult,
    testError,
  } = useAlertRules(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Analytics', path: '/analytics' },
      { label: 'Alert Rules' },
    ]);
  }, [setBreadcrumbs]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleActiveFilter = (isActive: string) => {
    setFilters({ 
      ...filters, 
      is_active: isActive === 'all' ? undefined : isActive === 'true' 
    });
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setShowCreateDialog(true);
  };

  const handleTest = (rule: AlertRule) => {
    setTestingRule(rule);
    setShowAlertTester(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this alert rule? This action cannot be undone.')) {
      deleteRule(id);
    }
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
    setEditingRule(null);
  };

  const handleCloseAlertTester = () => {
    setShowAlertTester(false);
    setTestingRule(null);
  };

  const handleSubmitRule = (data: CreateAlertRuleData | UpdateAlertRuleData) => {
    if (editingRule) {
      updateRule({ id: editingRule.id, data });
    } else {
      createRule(data);
    }
    handleCloseCreateDialog();
  };

  const handleTestRule = (ruleId: number, sendNotification: boolean) => {
    testRule({ 
      id: ruleId, 
      request: { send_test_notification: sendNotification } 
    });
  };

  const handleSaveNotificationSettings = (settings: Record<string, unknown>) => {
    // TODO: Implement notification settings save
    console.log('Saving notification settings:', settings);
    setShowNotificationSettings(false);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Alert Rules
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set up automated alerts based on metric thresholds and conditions
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Notification Settings">
            <IconButton 
              onClick={() => setShowNotificationSettings(true)}
              disabled={isLoadingRules}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh alert rules">
            <IconButton onClick={() => refetchRules()} disabled={isLoadingRules}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            disabled={isCreatingRule}
          >
            Create Alert Rule
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search alert rules..."
            size="small"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.is_active === undefined ? 'all' : filters.is_active ? 'true' : 'false'}
              label="Status"
              onChange={(e) => handleActiveFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>

          <Chip
            icon={<FilterIcon />}
            label={`${rules.length} rule${rules.length !== 1 ? 's' : ''}`}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Content */}
      {isLoadingRules ? (
        <LoadingAlertRulesTable />
      ) : rules.length === 0 ? (
        <NoAlertRulesEmptyState 
          onCreateClick={Object.keys(filters).length === 0 ? () => setShowCreateDialog(true) : undefined}
        />
      ) : (
        <AlertRuleTable
          rules={rules}
          isLoading={isLoadingRules}
          onEdit={handleEdit}
          onTest={handleTest}
          onDelete={handleDelete}
          isDeleting={isDeletingRule}
        />
      )}

      {/* Status Messages */}
      {isDeletingRule && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting alert rule...
        </Alert>
      )}

      {/* Alert Rule Form Dialog */}
      <AlertRuleForm
        open={showCreateDialog}
        onClose={handleCloseCreateDialog}
        editingRule={editingRule}
        onSubmit={handleSubmitRule}
        isLoading={isCreatingRule || isUpdatingRule}
      />

      {/* Alert Tester Dialog */}
      <AlertTester
        open={showAlertTester}
        onClose={handleCloseAlertTester}
        alertRule={testingRule}
        onTest={handleTestRule}
        isLoading={isTestingRule}
        testResult={testResult}
        error={testError}
      />

      {/* Notification Settings Dialog */}
      <NotificationSettings
        open={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        onSave={handleSaveNotificationSettings}
        isLoading={false}
        initialData={{}}
      />
    </Box>
  );
};