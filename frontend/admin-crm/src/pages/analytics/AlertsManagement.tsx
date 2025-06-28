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
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as TestIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  NotificationsActive as AlertIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Webhook as WebhookIcon,
  Notifications as InAppIcon,
  Schedule as ScheduleIcon,
  Warning as ThresholdIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useAlertRules } from '../../hooks/useAnalytics';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';
import type { AlertRule, AlertRuleFilters } from '../../types/analytics.types';

interface AlertRowActionsProps {
  rule: AlertRule;
  onEdit: (rule: AlertRule) => void;
  onTest: (rule: AlertRule) => void;
  onDelete: (id: number) => void;
}

const AlertRowActions: React.FC<AlertRowActionsProps> = ({
  rule,
  onEdit,
  onTest,
  onDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(rule);
    handleClose();
  };

  const handleTest = () => {
    onTest(rule);
    handleClose();
  };

  const handleDelete = () => {
    onDelete(rule.id);
    handleClose();
  };

  return (
    <>
      <IconButton size="small" onClick={handleClick}>
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleTest}>
          <TestIcon sx={{ mr: 1 }} fontSize="small" />
          Test Rule
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </>
  );
};

interface NotificationMethodsDisplayProps {
  methods: string[];
}

const NotificationMethodsDisplay: React.FC<NotificationMethodsDisplayProps> = ({ methods }) => {
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'EMAIL': return <EmailIcon fontSize="small" />;
      case 'SMS': return <SmsIcon fontSize="small" />;
      case 'WEBHOOK': return <WebhookIcon fontSize="small" />;
      case 'IN_APP': return <InAppIcon fontSize="small" />;
      default: return <AlertIcon fontSize="small" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'EMAIL': return 'primary';
      case 'SMS': return 'success';
      case 'WEBHOOK': return 'info';
      case 'IN_APP': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {methods.map((method) => (
        <Chip
          key={method}
          icon={getMethodIcon(method)}
          label={method.replace('_', ' ')}
          size="small"
          color={getMethodColor(method) as any}
          variant="outlined"
        />
      ))}
    </Stack>
  );
};

interface AlertTableRowProps {
  rule: AlertRule;
  onEdit: (rule: AlertRule) => void;
  onTest: (rule: AlertRule) => void;
  onDelete: (id: number) => void;
}

const AlertTableRow: React.FC<AlertTableRowProps> = ({
  rule,
  onEdit,
  onTest,
  onDelete,
}) => {
  const getOperatorDisplay = (operator: string) => {
    switch (operator) {
      case 'GT': return '>';
      case 'GTE': return '≥';
      case 'LT': return '<';
      case 'LTE': return '≤';
      case 'EQ': return '=';
      case 'NE': return '≠';
      case 'CHANGE_GT': return 'Change >';
      case 'CHANGE_LT': return 'Change <';
      default: return operator;
    }
  };

  const formatLastTriggered = (date: string | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const triggered = new Date(date);
    const diffHours = Math.floor((now.getTime() - triggered.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <TableRow hover>
      <TableCell>
        <Box>
          <Typography variant="subtitle2" fontWeight="medium">
            {rule.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {rule.description || 'No description'}
          </Typography>
        </Box>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {rule.metric_definition_name || 'Unknown Metric'}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          <ThresholdIcon fontSize="small" color="action" />
          <Typography variant="body2" fontFamily="monospace">
            {getOperatorDisplay(rule.operator)} {rule.threshold_value}
          </Typography>
        </Box>
      </TableCell>
      
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2">
            Every {rule.evaluation_frequency}s
          </Typography>
        </Box>
      </TableCell>
      
      <TableCell>
        <NotificationMethodsDisplay methods={rule.notification_methods} />
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {rule.recipients.length} recipient{rule.recipients.length !== 1 ? 's' : ''}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {formatLastTriggered(rule.last_triggered)}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Chip
          label={rule.is_active ? 'Active' : 'Inactive'}
          size="small"
          color={rule.is_active ? 'success' : 'default'}
          variant={rule.is_active ? 'filled' : 'outlined'}
        />
      </TableCell>
      
      <TableCell align="right">
        <AlertRowActions
          rule={rule}
          onEdit={onEdit}
          onTest={onTest}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
};

export const AlertsManagement: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
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
    testRule({ id: rule.id, request: {} });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this alert rule? This action cannot be undone.')) {
      deleteRule(id);
    }
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingRule(null);
  };

  const handleSubmit = (data: any) => {
    if (editingRule) {
      updateRule({ id: editingRule.id, data });
    } else {
      createRule(data);
    }
    handleCloseDialog();
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
      <Paper variant="outlined">
        {isLoadingRules ? (
          <LoadingTable />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={AlertIcon}
            title="No alert rules found"
            description={
              Object.keys(filters).length > 0
                ? "No alert rules match your current filters. Try adjusting your search criteria."
                : "Get started by creating your first alert rule to monitor important metrics and get notified when thresholds are exceeded."
            }
            action={
              Object.keys(filters).length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create First Alert Rule
                </Button>
              )
            }
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Metric</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Notifications</TableCell>
                  <TableCell>Recipients</TableCell>
                  <TableCell>Last Triggered</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <AlertTableRow
                    key={rule.id}
                    rule={rule}
                    onEdit={handleEdit}
                    onTest={handleTest}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Status Messages */}
      {isDeletingRule && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting alert rule...
        </Alert>
      )}

      {isTestingRule && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Testing alert rule...
        </Alert>
      )}

      {testResult && (
        <Alert 
          severity={testResult.threshold_met ? 'warning' : 'success'} 
          sx={{ mt: 2 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Test Result
          </Typography>
          <Typography variant="body2">
            {testResult.threshold_met 
              ? `Alert would trigger! Current value: ${testResult.current_value}`
              : `Alert would not trigger. Current value: ${testResult.current_value}`
            }
          </Typography>
        </Alert>
      )}

      {/* TODO: Add AlertRuleFormDialog component */}
      {showCreateDialog && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Alert rule form dialog not yet implemented. Coming soon!
        </Alert>
      )}
    </Box>
  );
};