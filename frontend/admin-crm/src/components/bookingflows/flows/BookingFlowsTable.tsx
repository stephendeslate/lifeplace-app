// frontend/admin-crm/src/components/bookingflows/flows/BookingFlowsTable.tsx

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  TableSortLabel,
  Skeleton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Visibility as PreviewIcon,
  EventNote as FlowIcon,
  Event as EventIcon,
  List as StepsIcon,
  Analytics as AnalyticsIcon,
  Science as TestIcon,
  People as GuestsIcon,
  Payment as PaymentIcon,
  Schedule as TimeIcon,
  CheckCircle as ActiveIcon,
  RadioButtonUnchecked as InactiveIcon,
} from '@mui/icons-material';
import type { BookingFlowTableProps, BookingFlow } from '../../../types/bookingflows.types';

export const BookingFlowsTable: React.FC<BookingFlowTableProps> = ({
  bookingFlows,
  isLoading,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedFlow, setSelectedFlow] = useState<BookingFlow | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, flow: BookingFlow) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedFlow(flow);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedFlow(null);
  };

  const handleEdit = () => {
    if (selectedFlow) {
      onEdit(selectedFlow);
    }
    handleMenuClose();
  };

  const handlePreview = () => {
    if (selectedFlow) {
      onPreview(selectedFlow);
    }
    handleMenuClose();
  };

  const handleDuplicate = () => {
    if (selectedFlow) {
      onDuplicate(selectedFlow);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedFlow) {
      onDelete(selectedFlow.id);
    }
    handleMenuClose();
  };

  const getStatusChip = (flow: BookingFlow) => {
    if (flow.is_test_mode) {
      return (
        <Chip
          label="Test Mode"
          size="small"
          color="warning"
          variant="filled"
          icon={<TestIcon />}
        />
      );
    }
    
    return (
      <Chip
        label={flow.is_active ? 'Active' : 'Inactive'}
        size="small"
        color={flow.is_active ? 'success' : 'default'}
        variant={flow.is_active ? 'filled' : 'outlined'}
        icon={flow.is_active ? <ActiveIcon /> : <InactiveIcon />}
      />
    );
  };

  const getEventTypeChip = (flow: BookingFlow) => {
    // Use event_type_name from the evolved backend serializer
    if (!flow.event_type_name || flow.event_type_name === 'Any Event Type') {
      return (
        <Chip
          label="Any Event Type"
          size="small"
          variant="outlined"
          color="default"
        />
      );
    }
    
    return (
      <Chip
        icon={<EventIcon />}
        label={flow.event_type_name}
        size="small"
        color="primary"
        variant="outlined"
      />
    );
  };

  const getStepsInfo = (flow: BookingFlow) => {
    const isAllEnabled = flow.total_steps === flow.enabled_steps_count;
    const completionPercentage = flow.total_steps > 0 
      ? Math.round((flow.enabled_steps_count / flow.total_steps) * 100)
      : 0;
    
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <StepsIcon 
            fontSize="small" 
            color={isAllEnabled ? 'primary' : 'action'} 
          />
          <Typography 
            variant="body2" 
            fontWeight="medium"
            color={isAllEnabled ? 'primary' : 'text.secondary'}
          >
            {flow.enabled_steps_count}/{flow.total_steps}
          </Typography>
        </Box>
        <Box sx={{ width: 60 }}>
          <LinearProgress
            variant="determinate"
            value={completionPercentage}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                backgroundColor: isAllEnabled ? 'success.main' : 'primary.main'
              }
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {completionPercentage}% configured
        </Typography>
      </Box>
    );
  };

  const getFeatureChips = (flow: BookingFlow) => {
    const chips = [];

    if (flow.allow_guest_booking) {
      chips.push(
        <Chip
          key="guest"
          icon={<GuestsIcon />}
          label="Guest Booking"
          size="small"
          variant="outlined"
          color="info"
        />
      );
    }

    if (flow.require_immediate_payment) {
      chips.push(
        <Chip
          key="payment"
          icon={<PaymentIcon />}
          label="Immediate Payment"
          size="small"
          variant="outlined"
          color="secondary"
        />
      );
    }

    if (flow.auto_approve_bookings) {
      chips.push(
        <Chip
          key="auto-approve"
          label="Auto-approve"
          size="small"
          variant="outlined"
          color="success"
        />
      );
    }

    return chips;
  };

  const getBookingWindow = (flow: BookingFlow) => {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <TimeIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          {flow.min_advance_booking_days}-{flow.max_advance_booking_days} days
        </Typography>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(5)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="25%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="10%" />
            <Skeleton variant="text" width="15%" />
          </Box>
        ))}
      </Box>
    );
  }

  if (bookingFlows.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={8}
        textAlign="center"
      >
        <FlowIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No booking flows found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first booking flow to guide clients through the booking process
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel>
                  Name & Details
                </TableSortLabel>
              </TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell align="center">Steps Configuration</TableCell>
              <TableCell>Status & Features</TableCell>
              <TableCell>Booking Window</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookingFlows.map((flow) => (
              <TableRow 
                key={flow.id} 
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onEdit(flow)}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FlowIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {flow.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {flow.id}
                      </Typography>
                      {flow.description && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          display="block"
                          sx={{ 
                            maxWidth: 250,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {flow.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>

                <TableCell>
                  {getEventTypeChip(flow)}
                </TableCell>

                <TableCell align="center">
                  <Tooltip 
                    title={`${flow.enabled_steps_count} of ${flow.total_steps} steps enabled`}
                    arrow
                  >
                    <Box>
                      {getStepsInfo(flow)}
                    </Box>
                  </Tooltip>
                </TableCell>

                <TableCell>
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    {getStatusChip(flow)}
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {getFeatureChips(flow).slice(0, 2)}
                      {getFeatureChips(flow).length > 2 && (
                        <Chip
                          label={`+${getFeatureChips(flow).length - 2}`}
                          size="small"
                          variant="outlined"
                          color="default"
                        />
                      )}
                    </Box>
                  </Box>
                </TableCell>

                <TableCell>
                  {getBookingWindow(flow)}
                </TableCell>

                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(flow.updated_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(flow.updated_at).toLocaleTimeString()}
                  </Typography>
                </TableCell>

                <TableCell align="right">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {/* Quick Preview Button */}
                    <Tooltip title="Preview Flow">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(flow);
                        }}
                        aria-label={`Preview ${flow.name}`}
                      >
                        <PreviewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* More Actions Menu */}
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, flow)}
                      disabled={isDeleting}
                      aria-label={`More actions for ${flow.name}`}
                    >
                      {isDeleting && selectedFlow?.id === flow.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <MoreVertIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        MenuListProps={{
          'aria-labelledby': 'booking-flow-actions-menu',
          role: 'menu',
        }}
      >
        <MenuItem onClick={handleEdit} role="menuitem">
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Flow</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handlePreview} role="menuitem">
          <ListItemIcon>
            <PreviewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview Flow</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDuplicate} role="menuitem">
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate Flow</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            // Navigate to analytics - this would be handled by parent component
            // Using the evolved analytics route structure
            if (selectedFlow) {
              // Would navigate to `/analytics/funnels/${selectedFlow.id}/analytics`
              console.log(`Navigate to analytics for flow ${selectedFlow.id}`);
            }
            handleMenuClose();
          }}
          role="menuitem"
        >
          <ListItemIcon>
            <AnalyticsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Analytics</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }} role="menuitem">
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Flow</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};