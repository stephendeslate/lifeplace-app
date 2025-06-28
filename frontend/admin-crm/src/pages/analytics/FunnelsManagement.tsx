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
  LinearProgress,
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
  Timeline as FunnelIcon,
  TrendingUp as ConversionIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useConversionFunnels } from '../../hooks/useAnalytics';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';
import type { ConversionFunnel, FunnelFilters } from '../../types/analytics.types';

interface FunnelCardActionsProps {
  funnel: ConversionFunnel;
  onView: (funnel: ConversionFunnel) => void;
  onEdit: (funnel: ConversionFunnel) => void;
  onDelete: (id: number) => void;
}

const FunnelCardActions: React.FC<FunnelCardActionsProps> = ({
  funnel,
  onView,
  onEdit,
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

  const handleView = () => {
    onView(funnel);
    handleClose();
  };

  const handleEdit = () => {
    onEdit(funnel);
    handleClose();
  };

  const handleDelete = () => {
    onDelete(funnel.id);
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
          View Analytics
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

interface FunnelStepIndicatorProps {
  steps: Array<{ event_name: string; name: string; order: number }>;
  maxSteps?: number;
}

const FunnelStepIndicator: React.FC<FunnelStepIndicatorProps> = ({ 
  steps, 
  maxSteps = 5 
}) => {
  const displaySteps = steps.slice(0, maxSteps);
  const hasMore = steps.length > maxSteps;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Funnel Steps ({steps.length} steps)
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {displaySteps.map((step, index) => (
          <React.Fragment key={step.order}>
            <Chip
              icon={index === 0 ? <StartIcon /> : index === displaySteps.length - 1 ? <CompleteIcon /> : undefined}
              label={step.name}
              size="small"
              variant="outlined"
              color={index === 0 ? 'success' : index === displaySteps.length - 1 ? 'primary' : 'default'}
            />
            {index < displaySteps.length - 1 && (
              <Typography variant="body2" color="text.secondary">
                →
              </Typography>
            )}
          </React.Fragment>
        ))}
        {hasMore && (
          <>
            <Typography variant="body2" color="text.secondary">
              →
            </Typography>
            <Chip
              label={`+${steps.length - maxSteps} more`}
              size="small"
              variant="outlined"
              color="info"
            />
          </>
        )}
      </Stack>
    </Box>
  );
};

interface FunnelCardProps {
  funnel: ConversionFunnel;
  onView: (funnel: ConversionFunnel) => void;
  onEdit: (funnel: ConversionFunnel) => void;
  onDelete: (id: number) => void;
}

const FunnelCard: React.FC<FunnelCardProps> = ({
  funnel,
  onView,
  onEdit,
  onDelete,
}) => {
  // Mock analytics data - replace with real data from useFunnelAnalytics
  const mockConversionRate = Math.floor(Math.random() * 30) + 10; // 10-40%
  const mockTotalStarted = Math.floor(Math.random() * 1000) + 100;
  const mockTotalCompleted = Math.floor((mockTotalStarted * mockConversionRate) / 100);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {funnel.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {funnel.description || 'No description'}
            </Typography>
          </Box>
          <FunnelCardActions
            funnel={funnel}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Box>

        <FunnelStepIndicator steps={funnel.steps} />

        {/* Mock Analytics Preview */}
        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Conversion Rate
            </Typography>
            <Typography variant="body2" fontWeight="medium" color="primary">
              {mockConversionRate}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={mockConversionRate} 
            sx={{ mb: 2 }}
          />
          
          <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {mockTotalStarted.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Started
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" color="success.main">
                {mockTotalCompleted.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={`${funnel.time_window_hours}h window`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={funnel.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={funnel.is_active ? 'success' : 'default'}
            variant={funnel.is_active ? 'filled' : 'outlined'}
          />
        </Stack>
      </CardContent>

      <CardActions>
        <Button
          size="small"
          startIcon={<ConversionIcon />}
          onClick={() => onView(funnel)}
        >
          View Analytics
        </Button>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => onEdit(funnel)}
        >
          Edit
        </Button>
      </CardActions>
    </Card>
  );
};

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

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingFunnel(null);
  };

  const handleSubmit = (data: any) => {
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
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            flexWrap: { sm: 'wrap' },
            gap: 3 
          }}
        >
          {filteredFunnels.map((funnel) => (
            <Box 
              key={funnel.id} 
              sx={{ 
                flex: { 
                  xs: '1 1 100%', 
                  sm: '1 1 calc(50% - 12px)', 
                  md: '1 1 calc(33.333% - 16px)',
                  lg: '1 1 calc(25% - 18px)'
                },
                minWidth: 320
              }}
            >
              <FunnelCard
                funnel={funnel}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* Status Messages */}
      {isDeletingFunnel && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting funnel...
        </Alert>
      )}

      {/* TODO: Add FunnelFormDialog component */}
      {showCreateDialog && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Funnel form dialog not yet implemented. Coming soon!
        </Alert>
      )}
    </Box>
  );
};