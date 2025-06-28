// frontend/admin-crm/src/components/analytics/funnels/FunnelTable.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  LinearProgress,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Timeline as FunnelIcon,
  TrendingUp as ConversionIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import type { ConversionFunnel } from '../../../types/analytics.types';

interface FunnelCardActionsProps {
  funnel: ConversionFunnel;
  onView: (funnel: ConversionFunnel) => void;
  onEdit: (funnel: ConversionFunnel) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (funnel: ConversionFunnel) => void;
}

const FunnelCardActions: React.FC<FunnelCardActionsProps> = ({
  funnel,
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

  const handleDuplicate = () => {
    onDuplicate?.(funnel);
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
  onDuplicate?: (funnel: ConversionFunnel) => void;
  showMockAnalytics?: boolean;
}

const FunnelCard: React.FC<FunnelCardProps> = ({
  funnel,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  showMockAnalytics = true,
}) => {
  // Mock analytics data - replace with real data from useFunnelAnalytics when available
  const mockConversionRate = showMockAnalytics ? Math.floor(Math.random() * 30) + 10 : 0; // 10-40%
  const mockTotalStarted = showMockAnalytics ? Math.floor(Math.random() * 1000) + 100 : 0;
  const mockTotalCompleted = showMockAnalytics ? Math.floor((mockTotalStarted * mockConversionRate) / 100) : 0;

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
            onDuplicate={onDuplicate}
          />
        </Box>

        <FunnelStepIndicator steps={funnel.steps} />

        {/* Mock Analytics Preview */}
        {showMockAnalytics && (
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
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            icon={<ScheduleIcon />}
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

interface FunnelTableProps {
  funnels: ConversionFunnel[];
  isLoading?: boolean;
  onView: (funnel: ConversionFunnel) => void;
  onEdit: (funnel: ConversionFunnel) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (funnel: ConversionFunnel) => void;
  emptyMessage?: string;
  showMockAnalytics?: boolean;
}

export const FunnelTable: React.FC<FunnelTableProps> = ({
  funnels,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  emptyMessage = "No conversion funnels found",
  showMockAnalytics = true,
}) => {
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          flexWrap: { sm: 'wrap' },
          gap: 3 
        }}
      >
        {Array.from({ length: 6 }, (_, index) => (
          <Box 
            key={index}
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
            <Card>
              <CardContent>
                <Box sx={{ height: 200 }}>
                  {/* Loading skeleton would go here */}
                  <Typography variant="body2" color="text.secondary">
                    Loading...
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    );
  }

  if (funnels.length === 0) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          py: 8,
          textAlign: 'center'
        }}
      >
        <FunnelIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        flexWrap: { sm: 'wrap' },
        gap: 3 
      }}
    >
      {funnels.map((funnel) => (
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
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            showMockAnalytics={showMockAnalytics}
          />
        </Box>
      ))}
    </Box>
  );
};