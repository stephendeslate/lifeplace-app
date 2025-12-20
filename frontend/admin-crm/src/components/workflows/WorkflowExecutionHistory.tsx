// frontend/admin-crm/src/components/workflows/WorkflowExecutionHistory.tsx

import React, { useState } from 'react';
import {
  Typography,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  History as HistoryIcon,
  CheckCircle as ProcessedIcon,
  Schedule as PendingIcon,
  Refresh as RefreshIcon,
  PlayArrow as TriggerIcon,
} from '@mui/icons-material';
import type { WorkflowTrigger, TriggerType, WorkflowStage } from '../../types/workflows.types';
import { TRIGGER_TYPES } from '../../types/workflows.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState } from '../common';
import type { ModernTableColumn } from '../common';

interface WorkflowExecutionHistoryProps {
  triggers: WorkflowTrigger[];
  isLoading: boolean;
  onRefresh: () => void;
  onManualTrigger?: (stageId: number, eventId: number) => void;
  isTriggering?: boolean;
  stages?: WorkflowStage[];
  templateId?: number;
}

export const WorkflowExecutionHistory: React.FC<WorkflowExecutionHistoryProps> = ({
  triggers,
  isLoading,
  onRefresh,
  onManualTrigger,
  isTriggering = false,
  stages = [],
}) => {
  const [filterType, setFilterType] = useState<TriggerType | ''>('');
  const [filterProcessed, setFilterProcessed] = useState<boolean | ''>('');

  const filteredTriggers = triggers.filter((trigger) => {
    if (filterType && trigger.trigger_type !== filterType) return false;
    if (filterProcessed !== '' && trigger.processed !== filterProcessed) return false;
    return true;
  });

  const getTriggerTypeChip = (triggerType: TriggerType) => {
    const typeConfig = TRIGGER_TYPES.find((t) => t.value === triggerType);
    const colorMap: Record<string, 'success' | 'warning' | 'info' | 'error' | 'default'> = {
      PAYMENT_RECEIVED: 'success',
      PAYMENT_OVERDUE: 'error',
      QUOTE_ACCEPTED: 'success',
      CONTRACT_SIGNED: 'success',
      MANUAL_TRIGGER: 'info',
      EVENT_CREATED: 'default',
      EVENT_COMPLETED: 'success',
    };

    return (
      <Chip
        label={typeConfig?.label || triggerType}
        size="small"
        color={colorMap[triggerType] || 'default'}
        variant="outlined"
      />
    );
  };

  const getStatusChip = (processed: boolean) => (
    <Chip
      icon={processed ? <ProcessedIcon /> : <PendingIcon />}
      label={processed ? 'Processed' : 'Pending'}
      size="small"
      color={processed ? 'success' : 'warning'}
      variant={processed ? 'filled' : 'outlined'}
    />
  );

  const columns: ModernTableColumn[] = [
    {
      key: 'event_name',
      label: 'Event',
      sortable: true,
      render: (_, row) => {
        const trigger = row as unknown as WorkflowTrigger;
        return (
          <Box>
            <Typography variant="subtitle2" fontWeight="medium">
              {trigger.event_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Event #{trigger.event}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'stage_name',
      label: 'Stage',
      render: (_, row) => {
        const trigger = row as unknown as WorkflowTrigger;
        return trigger.stage_name ? (
          <Typography variant="body2">{trigger.stage_name}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            No stage
          </Typography>
        );
      },
    },
    {
      key: 'trigger_type',
      label: 'Trigger Type',
      render: (_, row) => {
        const trigger = row as unknown as WorkflowTrigger;
        return getTriggerTypeChip(trigger.trigger_type);
      },
    },
    {
      key: 'details',
      label: 'Details',
      render: (_, row) => {
        const trigger = row as unknown as WorkflowTrigger;
        return (
          <Tooltip title={trigger.details || 'No details'}>
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ maxWidth: 200 }}
            >
              {trigger.details || '-'}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      key: 'processed',
      label: 'Status',
      align: 'center',
      render: (_, row) => {
        const trigger = row as unknown as WorkflowTrigger;
        return getStatusChip(trigger.processed);
      },
    },
    {
      key: 'created_at',
      label: 'Triggered At',
      sortable: true,
      render: (_, row) => {
        const trigger = row as unknown as WorkflowTrigger;
        return (
          <Box>
            <Typography variant="body2">
              {new Date(trigger.created_at).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(trigger.created_at).toLocaleTimeString()}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'processed_at',
      label: 'Processed At',
      render: (_, row) => {
        const trigger = row as unknown as WorkflowTrigger;
        return trigger.processed_at ? (
          <Box>
            <Typography variant="body2">
              {new Date(trigger.processed_at).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(trigger.processed_at).toLocaleTimeString()}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        );
      },
    },
  ];

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6">Execution History</Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={onRefresh} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Trigger Type</InputLabel>
          <Select
            value={filterType}
            label="Trigger Type"
            onChange={(e) => setFilterType(e.target.value as TriggerType | '')}
          >
            <MenuItem value="">All Types</MenuItem>
            {TRIGGER_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterProcessed === '' ? '' : filterProcessed ? 'true' : 'false'}
            label="Status"
            onChange={(e) => {
              const val = e.target.value;
              setFilterProcessed(val === '' ? '' : val === 'true');
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Processed</MenuItem>
            <MenuItem value="false">Pending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Manual Trigger Section */}
      {onManualTrigger && stages.length > 0 && (
        <Alert
          severity="info"
          icon={<TriggerIcon />}
          sx={{ mb: 2 }}
          action={
            <Typography variant="caption" color="text.secondary">
              Use template details to manually trigger stages
            </Typography>
          }
        >
          Manual triggers can be executed from the stage actions in the template
          view.
        </Alert>
      )}

      {filteredTriggers.length === 0 ? (
        <ModernEmptyState
          icon={HistoryIcon}
          title="No execution history"
          description={
            filterType || filterProcessed !== ''
              ? 'No triggers match the current filters'
              : 'Workflow triggers will appear here when automations are executed'
          }
        />
      ) : (
        <ModernTable
          columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
          data={filteredTriggers as unknown as Record<string, unknown>[]}
          sortBy="created_at"
          sortOrder="desc"
          loading={isTriggering}
        />
      )}

      {/* Summary */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mt: 2,
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Total: {filteredTriggers.length} triggers
        </Typography>
        <Typography variant="body2" color="success.main">
          Processed: {filteredTriggers.filter((t) => t.processed).length}
        </Typography>
        <Typography variant="body2" color="warning.main">
          Pending: {filteredTriggers.filter((t) => !t.processed).length}
        </Typography>
      </Box>
    </Paper>
  );
};
