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
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useMetricDefinitions } from '../../hooks/useAnalytics';
import { 
  MetricDefinitionTable, 
  MetricDefinitionForm, 
  MetricCalculationModal 
} from '../../components/analytics/metrics';
import { LoadingTable } from '../../components/common/LoadingTable';
import { NoMetricsEmptyState } from '../../components/common/EmptyState';
import type { 
  MetricDefinition, 
  MetricDefinitionFilters,
  CreateMetricDefinitionData,
  UpdateMetricDefinitionData,
  MetricCalculationRequest,
} from '../../types/analytics.types';

export const MetricsManagement: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null);
  const [calculatingMetric, setCalculatingMetric] = useState<MetricDefinition | null>(null);
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
    calculationResult,
    // calculationError, // Remove this line or add calculationError to the hook's return type
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
    setCalculatingMetric(metric);
    setShowCalculationModal(true);
  };

  const handleCalculateMetric = (request: MetricCalculationRequest) => {
    if (calculatingMetric) {
      calculateMetric({ id: calculatingMetric.id, request });
    }
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingMetric(null);
  };

  const handleCloseCalculationModal = () => {
    setShowCalculationModal(false);
    setCalculatingMetric(null);
  };

  const handleSubmit = (data: CreateMetricDefinitionData | UpdateMetricDefinitionData) => {
    if (editingMetric) {
      updateMetric({ id: editingMetric.id, data });
    } else {
      // Only pass CreateMetricDefinitionData to createMetric
      const { name, description, source_domain, ...rest } = data as CreateMetricDefinitionData;
      createMetric({ name, description, source_domain, ...rest });
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
      {isLoadingMetrics ? (
        <LoadingTable />
      ) : metrics.length === 0 ? (
        Object.keys(filters).length > 0 ? (
          <NoMetricsEmptyState />
        ) : (
          <NoMetricsEmptyState 
            onCreateClick={() => setShowCreateDialog(true)}
          />
        )
      ) : (
        <MetricDefinitionTable
          metrics={metrics}
          isLoading={isLoadingMetrics}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCalculate={handleCalculate}
        />
      )}

      {/* Status Messages */}
      {isDeletingMetric && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting metric...
        </Alert>
      )}

      {isCalculatingMetric && !showCalculationModal && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Calculating metric...
        </Alert>
      )}

      {/* Metric Form Dialog */}
      <MetricDefinitionForm
        open={showCreateDialog}
        onClose={handleCloseDialog}
        editingMetric={editingMetric}
        onSubmit={handleSubmit}
        isLoading={isCreatingMetric || isUpdatingMetric}
      />

      {/* Calculation Modal */}
      <MetricCalculationModal
        open={showCalculationModal}
        onClose={handleCloseCalculationModal}
        metric={calculatingMetric}
        onCalculate={handleCalculateMetric}
        isCalculating={isCalculatingMetric}
        calculationResult={calculationResult}
        // calculationError={calculationError} // Remove this prop if not available
      />
    </Box>
  );
};