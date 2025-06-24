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
} from '@mui/icons-material';
import type { BookingFlowTableProps } from '../../../types/bookingflows.types';

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
  const [selectedFlow, setSelectedFlow] = useState<any>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, flow: any) => {
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

  const getStatusChip = (isActive: boolean, isTestMode: boolean) => {
    if (isTestMode) {
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
        label={isActive ? 'Active' : 'Inactive'}
        size="small"
        color={isActive ? 'success' : 'default'}
        variant={isActive ? 'filled' : 'outlined'}
      />
    );
  };

  const getEventTypeChip = (eventTypeName?: string) => {
    if (!eventTypeName) {
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
        label={eventTypeName}
        size="small"
        color="primary"
        variant="outlined"
      />
    );
  };

  const getStepsChip = (totalSteps: number, enabledStepsCount: number) => {
    const isAllEnabled = totalSteps === enabledStepsCount;
    
    return (
      <Tooltip 
        title={`${enabledStepsCount} of ${totalSteps} steps enabled`}
        arrow
      >
        <Box display="flex" alignItems="center" gap={0.5}>
          <StepsIcon 
            fontSize="small" 
            color={isAllEnabled ? 'primary' : 'action'} 
          />
          <Typography 
            variant="body2" 
            fontWeight="medium"
            color={isAllEnabled ? 'primary' : 'text.secondary'}
          >
            {enabledStepsCount}/{totalSteps}
          </Typography>
        </Box>
      </Tooltip>
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
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell align="center">Steps</TableCell>
              <TableCell>Status</TableCell>
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
                            maxWidth: 200,
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
                  {getEventTypeChip(flow.event_type_name)}
                </TableCell>
                <TableCell align="center">
                  {getStepsChip(flow.total_steps, flow.enabled_steps_count)}
                </TableCell>
                <TableCell>
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    {getStatusChip(flow.is_active, flow.is_test_mode)}
                    {flow.allow_guest_booking && (
                      <Chip
                        label="Guest Booking"
                        size="small"
                        variant="outlined"
                        color="info"
                      />
                    )}
                  </Box>
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
                      >
                        <PreviewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* More Actions Menu */}
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, flow)}
                      disabled={isDeleting}
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
        
        <MenuItem 
          onClick={() => {
            // Navigate to analytics - this would be handled by parent component
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <AnalyticsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Analytics</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Flow</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};