// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowCard.tsx

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Visibility as PreviewIcon,
  EventNote as FlowIcon,
  Event as EventIcon,
  Analytics as AnalyticsIcon,
  Science as TestIcon,
  Schedule as TimeIcon,
  People as GuestsIcon,
} from '@mui/icons-material';
import type { BookingFlow } from '../../../types/bookingflows.types';

interface BookingFlowCardProps {
  flow: BookingFlow;
  onEdit: (flow: BookingFlow) => void;
  onPreview: (flow: BookingFlow) => void;
  onDuplicate: (flow: BookingFlow) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

export const BookingFlowCard: React.FC<BookingFlowCardProps> = ({
  flow,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
  isDeleting = false,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    onEdit(flow);
    handleMenuClose();
  };

  const handlePreview = () => {
    onPreview(flow);
    handleMenuClose();
  };

  const handleDuplicate = () => {
    onDuplicate(flow);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete(flow.id);
    handleMenuClose();
  };

  const getStatusColor = () => {
    if (flow.is_test_mode) return 'warning';
    if (flow.is_active) return 'success';
    return 'default';
  };

  const getStatusLabel = () => {
    if (flow.is_test_mode) return 'Test Mode';
    if (flow.is_active) return 'Active';
    return 'Inactive';
  };

  const completionPercentage = flow.total_steps > 0 
    ? Math.round((flow.enabled_steps_count / flow.total_steps) * 100)
    : 0;

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        }
      }}
      onClick={() => onEdit(flow)}
    >
      {/* Header */}
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <FlowIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" noWrap>
                {flow.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {flow.id}
              </Typography>
            </Box>
          </Box>
          
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            disabled={isDeleting}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Description */}
        {flow.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              minHeight: '2.5em'
            }}
          >
            {flow.description}
          </Typography>
        )}

        {/* Status and Event Type */}
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          <Chip
            label={getStatusLabel()}
            size="small"
            color={getStatusColor()}
            variant={flow.is_active ? 'filled' : 'outlined'}
            icon={flow.is_test_mode ? <TestIcon /> : undefined}
          />
          
          {flow.event_type_name ? (
            <Chip
              icon={<EventIcon />}
              label={flow.event_type_name}
              size="small"
              color="primary"
              variant="outlined"
            />
          ) : (
            <Chip
              label="Any Event Type"
              size="small"
              variant="outlined"
              color="default"
            />
          )}
          
          {flow.allow_guest_booking && (
            <Chip
              icon={<GuestsIcon />}
              label="Guest Booking"
              size="small"
              variant="outlined"
              color="info"
            />
          )}
        </Box>

        {/* Steps Progress */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Steps Configuration
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {flow.enabled_steps_count}/{flow.total_steps} enabled
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionPercentage}
            sx={{ 
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                backgroundColor: completionPercentage === 100 ? 'success.main' : 'primary.main'
              }
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {completionPercentage}% configured
          </Typography>
        </Box>

        {/* Booking Settings */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={0.5}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {flow.min_advance_booking_days}-{flow.max_advance_booking_days} days
            </Typography>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Updated {new Date(flow.updated_at).toLocaleDateString()}
          </Typography>
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<PreviewIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onPreview(flow);
          }}
        >
          Preview
        </Button>
        
        <Button
          size="small"
          startIcon={<AnalyticsIcon />}
          onClick={(e) => {
            e.stopPropagation();
            // Navigate to analytics - would be handled by parent
          }}
        >
          Analytics
        </Button>
      </CardActions>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Flow</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handlePreview}>
          <ListItemIcon>
            <PreviewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview Flow</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate Flow</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Flow</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};