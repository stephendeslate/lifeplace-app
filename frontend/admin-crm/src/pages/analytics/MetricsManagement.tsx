// frontend/admin-crm/src/pages/analytics/MetricsManagement.tsx

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
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as CalculateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Analytics as MetricsIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useMetricDefinitions } from '../../hooks/useAnalytics';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';
import type { MetricDefinition, MetricDefinitionFilters } from '../../types/analytics.types';

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

const MetricRow: React.FC<MetricRowProps> = ({ metric, onEdit, onDelete, onCalculate }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          {metric.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {metric.description || 'No description'}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={metric.metric_type}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${metric.source_domain}.${metric.source_model}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={metric.aggregation_period}
            size="small"
            color={metric.is_real_time ? 'warning' : 'default'}
            variant="outlined"
          />
          <Chip
            label={metric.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={metric.is_active ? 'success' : 'default'}
            variant={metric.is_active ? 'filled' : 'outlined'}
          />
        </Stack>
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

export const MetricsManagement: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null);
  const [filters, setFilters] = useState<MetricDefinitionFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const {
    metrics,
    isLoadingMetrics,
    createMetric,
    updateMetric,
    deleteMetric,
    calculateMetric,
    refetchMetrics,
    isCreatingMetric,
    isUpdatingMetric,
    isDeletingMetric,
    isCalculatingMetric,
  } = useMetricDefinitions(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Analytics', path: '/analytics' },
      { label: 'Metrics' },
    ]);
  }, [setBreadcrumbs]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleSourceDomainFilter = (domain: string) => {
    setFilters({ ...filters, source_domain: domain || undefined });
  };

  const handleActiveFilter = (isActive: string) => {
    setFilters({ 
      ...filters, 
      is_active: isActive === 'all' ? undefined : isActive === 'true' 
    });
  };

  const handleEdit = (metric: MetricDefinition) => {
    setEditingMetric(metric);
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this metric? This action cannot be undone.')) {
      deleteMetric(id);
    }
  };

  const handleCalculate = (metric: MetricDefinition) => {
    calculateMetric({ id: metric.id, request: {} });
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingMetric(null);
  };

  const handleSubmit = (data: any) => {
    if (editingMetric) {
      updateMetric({ id: editingMetric.id, data });
    } else {
      createMetric(data);
    }
    handleCloseDialog();
  };

  // Get unique source domains for filter
  const sourceDomains = Array.from(
    new Set(metrics.map(m => m.source_domain))
  ).filter(Boolean);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Metric Definitions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Define and manage business metrics for tracking performance
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Refresh metrics">
            <IconButton onClick={() => refetchMetrics()} disabled={isLoadingMetrics}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            disabled={isCreatingMetric}
          >
            Create Metric
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search metrics..."
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
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Source Domain</InputLabel>
            <Select
              value={filters.source_domain || ''}
              label="Source Domain"
              onChange={(e) => handleSourceDomainFilter(e.target.value)}
            >
              <MenuItem value="">All Domains</MenuItem>
              {sourceDomains.map((domain) => (
                <MenuItem key={domain} value={domain}>
                  {domain}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
            label={`${metrics.length} metric${metrics.length !== 1 ? 's' : ''}`}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Content */}
      <Paper variant="outlined">
        {isLoadingMetrics ? (
          <LoadingTable />
        ) : metrics.length === 0 ? (
          <EmptyState
            icon={MetricsIcon}
            title="No metrics found"
            description={
              Object.keys(filters).length > 0
                ? "No metrics match your current filters. Try adjusting your search criteria."
                : "Get started by creating your first metric definition to track business performance."
            }
            action={
              Object.keys(filters).length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create First Metric
                </Button>
              )
            }
          />
        ) : (
          <Box>
            {metrics.map((metric) => (
              <MetricRow
                key={metric.id}
                metric={metric}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCalculate={handleCalculate}
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Status Messages */}
      {isDeletingMetric && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting metric...
        </Alert>
      )}

      {isCalculatingMetric && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Calculating metric...
        </Alert>
      )}

      {/* TODO: Add MetricDefinitionFormDialog component */}
      {showCreateDialog && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Metric form dialog not yet implemented. Coming soon!
        </Alert>
      )}
    </Box>
  );
};