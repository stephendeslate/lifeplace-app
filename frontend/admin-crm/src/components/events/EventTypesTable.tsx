// frontend/admin-crm/src/components/events/EventTypesTable.tsx

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
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EventNote as EventIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import type { EventTypeTableProps } from '../../types/events.types';

export const EventTypesTable: React.FC<EventTypeTableProps> = ({
  eventTypes,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedEventType, setSelectedEventType] = useState<any>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, eventType: any) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedEventType(eventType);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedEventType(null);
  };

  const handleEdit = () => {
    if (selectedEventType) {
      onEdit(selectedEventType);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedEventType) {
      onDelete(selectedEventType.id);
    }
    handleMenuClose();
  };

  const getStatusChip = (isActive: boolean) => (
    <Chip
      icon={isActive ? <ActiveIcon /> : <InactiveIcon />}
      label={isActive ? 'Active' : 'Inactive'}
      size="small"
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
    />
  );

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(5)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
          </Box>
        ))}
      </Box>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={8}
        textAlign="center"
      >
        <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No event types found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first event type to organize your events by category
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
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventTypes.map((eventType) => (
              <TableRow 
                key={eventType.id} 
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onEdit(eventType)}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EventIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {eventType.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {eventType.id}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    color={eventType.description ? 'text.primary' : 'text.secondary'}
                    sx={{
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {eventType.description || 'No description provided'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {getStatusChip(eventType.is_active)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(eventType.created_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(eventType.created_at).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, eventType)}
                    disabled={isDeleting}
                  >
                    {isDeleting && selectedEventType?.id === eventType.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <MoreVertIcon />
                    )}
                  </IconButton>
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
          <ListItemText>Edit Event Type</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Event Type</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};