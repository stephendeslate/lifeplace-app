// frontend/admin-crm/src/pages/analytics/DashboardsManagement.tsx

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
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Dashboard as DashboardIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Star as DefaultIcon,
  ContentCopy as DuplicateIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useDashboards } from '../../hooks/useAnalytics';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';
import type { Dashboard, DashboardFilters, DASHBOARD_TYPES } from '../../types/analytics.types';

interface DashboardCardActionsProps {
  dashboard: Dashboard;
  onView: (dashboard: Dashboard) => void;
  onEdit: (dashboard: Dashboard) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (dashboard: Dashboard) => void;
}

const DashboardCardActions: React.FC<DashboardCardActionsProps> = ({
  dashboard,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleView = () => {
    onView(dashboard);
    handleClose();
  };

  const handleEdit = () => {
    onEdit(dashboard);
    handleClose();
  };

  const handleDelete = () => {
    onDelete(dashboard.id);
    handleClose();
  };

  const handleDuplicate = () => {
    onDuplicate?.(dashboard);
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
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          View
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        {onDuplicate && (
          <MenuItem onClick={handleDuplicate}>
            <DuplicateIcon sx={{ mr: 1 }} fontSize="small" />
            Duplicate
          </MenuItem>
        )}
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </>
  );
};

interface DashboardCardProps {
  dashboard: Dashboard;
  onView: (dashboard: Dashboard) => void;
  onEdit: (dashboard: Dashboard) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (dashboard: Dashboard) => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  dashboard,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const getDashboardTypeColor = (type: string) => {
    switch (type) {
      case 'EXECUTIVE':
        return 'error';
      case 'OPERATIONAL':
        return 'primary';
      case 'CLIENT':
        return 'success';
      case 'FINANCIAL':
        return 'warning';
      case 'MARKETING':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {dashboard.name}
              {dashboard.is_default && (
                <Tooltip title="Default dashboard">
                  <DefaultIcon sx={{ ml: 1, color: 'warning.main' }} fontSize="small" />
                </Tooltip>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {dashboard.description || 'No description'}
            </Typography>
          </Box>
          <DashboardCardActions
            dashboard={dashboard}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip
            label={dashboard.dashboard_type.replace('_', ' ')}
            size="small"
            color={getDashboardTypeColor(dashboard.dashboard_type) as any}
            variant="outlined"
          />
          <Chip
            icon={dashboard.is_public ? <PublicIcon /> : <PrivateIcon />}
            label={dashboard.is_public ? 'Public' : 'Private'}
            size="small"
            variant="outlined"
          />
          <Chip
            label={dashboard.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={dashboard.is_active ? 'success' : 'default'}
            variant={dashboard.is_active ? 'filled' : 'outlined'}
          />
        </Stack>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {dashboard.widgets_count || 0} widget{(dashboard.widgets_count || 0) !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            by {dashboard.created_by_name || 'Unknown'}
          </Typography>
        </Box>
      </CardContent>

      <CardActions>
        <Button
          size="small"
          startIcon={<ViewIcon />}
          onClick={() => onView(dashboard)}
        >
          View
        </Button>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => onEdit(dashboard)}
        >
          Edit
        </Button>
      </CardActions>
    </Card>
  );
};

export const DashboardsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const {
    dashboards,
    isLoadingDashboards,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    refetchDashboards,
    isCreatingDashboard,
    isUpdatingDashboard,
    isDeletingDashboard,
  } = useDashboards(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Analytics', path: '/analytics' },
      { label: 'Dashboards' },
    ]);
  }, [setBreadcrumbs]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleTypeFilter = (type: string) => {
    setFilters({ ...filters, dashboard_type: type || undefined } as DashboardFilters);
  };

  const handleActiveFilter = (isActive: string) => {
    setFilters({ 
      ...filters, 
      is_active: isActive === 'all' ? undefined : isActive === 'true' 
    });
  };

  const handleView = (dashboard: Dashboard) => {
    navigate(`/analytics/dashboards/${dashboard.id}`);
  };

  const handleEdit = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard);
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this dashboard? This action cannot be undone.')) {
      deleteDashboard(id);
    }
  };

  const handleDuplicate = (dashboard: Dashboard) => {
    const duplicateData = {
      name: `${dashboard.name} (Copy)`,
      description: dashboard.description,
      dashboard_type: dashboard.dashboard_type,
      is_public: false, // Duplicates are private by default
      allowed_roles: dashboard.allowed_roles,
      layout_config: dashboard.layout_config,
      auto_refresh_interval: dashboard.auto_refresh_interval,
      is_active: true,
      is_default: false, // Duplicates are never default
    };
    createDashboard(duplicateData);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingDashboard(null);
  };

  const handleSubmit = (data: any) => {
    if (editingDashboard) {
      updateDashboard({ id: editingDashboard.id, data });
    } else {
      createDashboard(data);
    }
    handleCloseDialog();
  };

  // Get unique dashboard types for filter
  const dashboardTypes = ['EXECUTIVE', 'OPERATIONAL', 'CLIENT', 'FINANCIAL', 'MARKETING', 'CUSTOM'];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Dashboards
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage analytics dashboards for different audiences
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Refresh dashboards">
            <IconButton onClick={() => refetchDashboards()} disabled={isLoadingDashboards}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            disabled={isCreatingDashboard}
          >
            Create Dashboard
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search dashboards..."
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
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.dashboard_type || ''}
              label="Type"
              onChange={(e) => handleTypeFilter(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {dashboardTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
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
            label={`${dashboards.length} dashboard${dashboards.length !== 1 ? 's' : ''}`}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Content */}
      {isLoadingDashboards ? (
        <LoadingTable />
      ) : dashboards.length === 0 ? (
        <EmptyState
          icon={DashboardIcon}
          title="No dashboards found"
          description={
            Object.keys(filters).length > 0
              ? "No dashboards match your current filters. Try adjusting your search criteria."
              : "Get started by creating your first dashboard to visualize your metrics."
          }
          action={
            Object.keys(filters).length === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateDialog(true)}
              >
                Create First Dashboard
              </Button>
            )
          }
        />
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            flexWrap: { sm: 'wrap' },
            gap: 3 
          }}
        >
          {dashboards.map((dashboard) => (
            <Box 
              key={dashboard.id} 
              sx={{ 
                flex: { 
                  xs: '1 1 100%', 
                  sm: '1 1 calc(50% - 12px)', 
                  md: '1 1 calc(33.333% - 16px)' 
                },
                minWidth: 300
              }}
            >
              <DashboardCard
                dashboard={dashboard}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* Status Messages */}
      {isDeletingDashboard && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting dashboard...
        </Alert>
      )}

      {/* TODO: Add DashboardFormDialog component */}
      {showCreateDialog && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Dashboard form dialog not yet implemented. Coming soon!
        </Alert>
      )}
    </Box>
  );
};