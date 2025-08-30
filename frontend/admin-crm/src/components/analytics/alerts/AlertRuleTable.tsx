// frontend/admin-crm/src/components/analytics/alerts/AlertRuleTable.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Paper,
} from '@mui/material';
import {
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
import type { AlertRuleTableProps } from '../../../types/analytics.types';
import type { AlertRule } from '../../../types/analytics.types';

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

  const getMethodColor = (method: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
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
          color={getMethodColor(method)}
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

export const AlertRuleTable: React.FC<AlertRuleTableProps> = ({
  rules,
  isLoading,
  onEdit,
  onTest,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <Paper variant="outlined">
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography>Loading alert rules...</Typography>
        </Box>
      </Paper>
    );
  }

  if (rules.length === 0) {
    return (
      <Paper variant="outlined">
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <AlertIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No alert rules found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first alert rule to monitor important metrics.
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined">
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
                onEdit={onEdit}
                onTest={onTest}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};