// frontend/admin-crm/src/pages/analytics/FunnelsManagement.tsx

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
  Timeline as FunnelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useConversionFunnels } from '../../hooks/useAnalytics';
import { FunnelTable, FunnelForm } from '../../components/analytics/funnels';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';
import type { ConversionFunnel, FunnelFilters, CreateConversionFunnelData, UpdateConversionFunnelData } from '../../types/analytics.types';

export const FunnelsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<ConversionFunnel | null>(null);
  const [filters, setFilters] = useState<FunnelFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const {
    funnels,
    isLoadingFunnels,
    createFunnel,
    updateFunnel,
    deleteFunnel,
    refetchFunnels,
    isCreatingFunnel,
    isUpdatingFunnel,
    isDeletingFunnel,
  } = useConversionFunnels(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Analytics', path: '/analytics' },
      { label: 'Conversion Funnels' },
    ]);
  }, [setBreadcrumbs]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Note: The filters type doesn't include search, so we'd need to extend it
    // For now, we'll implement client-side filtering
  };

  const handleActiveFilter = (isActive: string) => {
    setFilters({ 
      ...filters, 
      is_active: isActive === 'all' ? undefined : isActive === 'true' 
    });
  };

  const handleView = (funnel: ConversionFunnel) => {
    navigate(`/analytics/funnels/${funnel.id}/analytics`);
  };

  const handleEdit = (funnel: ConversionFunnel) => {
    setEditingFunnel(funnel);
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this funnel? This action cannot be undone.')) {
      deleteFunnel(id);
    }
  };

  const handleDuplicate = (funnel: ConversionFunnel) => {
    const duplicateData = {
      name: `${funnel.name} (Copy)`,
      description: funnel.description,
      steps: funnel.steps,
      time_window_hours: funnel.time_window_hours,
      is_active: true, // Duplicates are active by default
    };
    createFunnel(duplicateData);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingFunnel(null);
  };

  const handleSubmit = (data: CreateConversionFunnelData | UpdateConversionFunnelData) => {
    if (editingFunnel) {
      updateFunnel({ id: editingFunnel.id, data });
    } else {
      createFunnel(data);
    }
    handleCloseDialog();
  };

  // Client-side search filtering
  const filteredFunnels = funnels.filter(funnel => {
    if (!searchQuery) return true;
    return funnel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (funnel.description && funnel.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Conversion Funnels
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track user journeys and conversion rates through multi-step processes
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Refresh funnels">
            <IconButton onClick={() => refetchFunnels()} disabled={isLoadingFunnels}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            disabled={isCreatingFunnel}
          >
            Create Funnel
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search funnels..."
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
            label={`${filteredFunnels.length} funnel${filteredFunnels.length !== 1 ? 's' : ''}`}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Content */}
      {isLoadingFunnels ? (
        <LoadingTable />
      ) : filteredFunnels.length === 0 ? (
        <EmptyState
          icon={FunnelIcon}
          title={searchQuery ? "No funnels found" : "No conversion funnels"}
          description={
            searchQuery
              ? "No funnels match your search criteria. Try adjusting your search terms."
              : "Get started by creating your first conversion funnel to track user journeys and conversion rates."
          }
          action={
            !searchQuery && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateDialog(true)}
              >
                Create First Funnel
              </Button>
            )
          }
        />
      ) : (
        <FunnelTable
          funnels={filteredFunnels}
          isLoading={isLoadingFunnels}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* Status Messages */}
      {isDeletingFunnel && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting funnel...
        </Alert>
      )}

      {/* Form Dialog */}
      <FunnelForm
        open={showCreateDialog}
        onClose={handleCloseDialog}
        editingFunnel={editingFunnel}
        onSubmit={handleSubmit}
        isLoading={isCreatingFunnel || isUpdatingFunnel}
      />
    </Box>
  );
};