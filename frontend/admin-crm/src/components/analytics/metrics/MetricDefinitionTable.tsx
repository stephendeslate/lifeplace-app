// frontend/admin-crm/src/components/analytics/metrics/MetricDefinitionTable.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  PlayArrow as CalculateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Speed as MetricIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Visibility as ActiveIcon,
  VisibilityOff as InactiveIcon,
} from '@mui/icons-material';
import { EmptyState } from '../../common/EmptyState';
import type { MetricDefinition } from '../../../types/analytics.types';

interface MetricRowActionsProps {
  metric: MetricDefinition;
  onEdit: (metric: MetricDefinition) => void;
  onDelete: (id: number) => void;
  onCalculate: (metric: MetricDefinition) => void;
}

const MetricRowActions: React.FC<MetricRowActionsProps> = ({
  metric,
  onEdit,
  onDelete,
  onCalculate,
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
    onEdit(metric);
    handleClose();
  };

  const handleDelete = () => {
    onDelete(metric.id);
    handleClose();
  };

  const handleCalculate = () => {
    onCalculate(metric);
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
        <MenuItem onClick={handleCalculate}>
          <CalculateIcon sx={{ mr: 1 }} fontSize="small" />
          Calculate
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

interface MetricRowProps {
  metric: MetricDefinition;
  onEdit: (metric: MetricDefinition) => void;
  onDelete: (id: number) => void;
  onCalculate: (metric: MetricDefinition) => void;
}

const MetricRow: React.FC<MetricRowProps> = ({ 
  metric, 
  onEdit, 
  onDelete, 
  onCalculate 
}) => {
  const getMetricTypeColor = (type: string) => {
    switch (type) {
      case 'COUNT': return 'primary';
      case 'SUM': return 'success';
      case 'AVERAGE': return 'info';
      case 'PERCENTAGE': return 'warning';
      case 'RATIO': return 'secondary';
      case 'CONVERSION_RATE': return 'success';
      case 'REVENUE': return 'success';
      case 'CUSTOM': return 'default';
      default: return 'default';
    }
  };

  // @ts-expect-error - Complex table column render function types
  const getAggregationIcon = (period: string, isRealTime: boolean) => {
    if (isRealTime) {
      return <TrendingUpIcon color="warning" fontSize="small" />;
    }
    return <ScheduleIcon color="action" fontSize="small" />;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 3,
        borderBottom: 1,
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        '&:last-child': {
          borderBottom: 0,
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="h6" fontWeight="medium">
            {metric.name}
          </Typography>
          {metric.is_active ? (
            <Tooltip title="Active metric">
              <ActiveIcon color="success" fontSize="small" />
            </Tooltip>
          ) : (
            <Tooltip title="Inactive metric">
              <InactiveIcon color="disabled" fontSize="small" />
            </Tooltip>
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {metric.description || 'No description provided'}
        </Typography>
        
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
          <Chip
            label={metric.metric_type}
            size="small"
            color={getMetricTypeColor(metric.metric_type) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
            variant="outlined"
          />
          <Chip
            label={`${metric.source_domain}.${metric.source_model}`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={getAggregationIcon(metric.aggregation_period, metric.is_real_time)}
            label={metric.is_real_time ? 'Real-time' : metric.aggregation_period}
            size="small"
            color={metric.is_real_time ? 'warning' : 'default'}
            variant="outlined"
          />
          {metric.source_field && (
            <Chip
              label={`Field: ${metric.source_field}`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            Format: {metric.display_format}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Decimals: {metric.decimal_places}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Updated: {new Date(metric.updated_at).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ ml: 2 }}>
        <MetricRowActions
          metric={metric}
          onEdit={onEdit}
          onDelete={onDelete}
          onCalculate={onCalculate}
        />
      </Box>
    </Box>
  );
};

interface MetricDefinitionTableProps {
  metrics: MetricDefinition[];
  isLoading: boolean;
  onEdit: (metric: MetricDefinition) => void;
  onDelete: (id: number) => void;
  onCalculate: (metric: MetricDefinition) => void;
}

export const MetricDefinitionTable: React.FC<MetricDefinitionTableProps> = ({
  metrics,
  isLoading,
  onEdit,
  onDelete,
  onCalculate,
}) => {
  if (isLoading) {
    return (
      <Paper variant="outlined">
        <Box sx={{ p: 3 }}>
          {Array.from({ length: 3 }, (_, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box
                  sx={{
                    width: 200,
                    height: 24,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    mr: 2,
                  }}
                />
                <Box
                  sx={{
                    width: 60,
                    height: 20,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                />
              </Box>
              <Box
                sx={{
                  width: '80%',
                  height: 16,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  mb: 1,
                }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                {Array.from({ length: 3 }, (_, chipIndex) => (
                  <Box
                    key={chipIndex}
                    sx={{
                      width: 80,
                      height: 24,
                      bgcolor: 'action.hover',
                      borderRadius: 3,
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (metrics.length === 0) {
    return (
      <EmptyState
        icon={MetricIcon}
        title="No metrics found"
        description="No metric definitions match your current filters. Try adjusting your search criteria or create a new metric."
      />
    );
  }

  return (
    <Paper variant="outlined">
      {metrics.map((metric) => (
        <MetricRow
          key={metric.id}
          metric={metric}
          onEdit={onEdit}
          onDelete={onDelete}
          onCalculate={onCalculate}
        />
      ))}
    </Paper>
  );
};