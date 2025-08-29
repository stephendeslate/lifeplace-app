// frontend/admin-crm/src/components/events/EventTypesTable.tsx

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EventNote as EventIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import type { EventTypeTableProps, EventType } from '../../types/events.types';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { ModernEmptyState } from '../common/ModernEmptyState';
import ModernLoadingStates from '../common/ModernLoadingStates';

export const EventTypesTable: React.FC<EventTypeTableProps> = ({
  eventTypes,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, eventType: EventType) => {
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
      <ModernLoadingStates.ModernTableSkeleton
        rows={5}
        columns={5}
        hasHeader
      />
    );
  }

  if (eventTypes.length === 0) {
    return (
      <ModernEmptyState
        icon={EventIcon}
        title="No event types found"
        description="Create your first event type to organize your events by category and streamline your booking process."
        tip={{
          text: "Event types help categorize your events and can be used in booking flows, questionnaires, and reports.",
          type: 'info'
        }}
        size="medium"
        color="primary"
      />
    );
  }

  return (
    <>
      <TableContainer
        sx={{
          background: 'transparent',
          borderRadius: tokens.spacing.radius.xxl,
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ 
              '& .MuiTableCell-head': { 
                fontWeight: 600, 
                color: tokens.color.neutral[700],
                borderBottom: `1px solid ${tokens.color.borders.glass}`,
                fontSize: '0.875rem',
              } 
            }}>
              <TableCell>
                <TableSortLabel sx={{ 
                  '&.MuiTableSortLabel-root': {
                    color: tokens.color.neutral[700],
                    '&:hover': {
                      color: tokens.color.primary[600],
                    }
                  }
                }}>
                  Event Type
                </TableSortLabel>
              </TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventTypes.map((eventType) => (
              <TableRow 
                key={eventType.id} 
                hover
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    background: `${tokens.color.primary[50]}50`,
                  },
                  '& .MuiTableCell-root': {
                    borderBottom: `1px solid ${tokens.color.borders.glass}`,
                    py: 2,
                  }
                }}
                onClick={() => onEdit(eventType)}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: tokens.spacing.radius.lg,
                        background: `${tokens.color.primary[50]}80`,
                        border: `1px solid ${tokens.color.primary[200]}40`,
                      }}
                    >
                      <EventIcon sx={{ 
                        color: tokens.color.primary[600],
                        fontSize: 20 
                      }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.5 }}>
                        {eventType.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {eventType.id}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {eventType.description ? (
                      <Tooltip title={eventType.description} arrow>
                        <Typography 
                          variant="body2" 
                          color="text.primary"
                          sx={{
                            maxWidth: 280,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.5,
                          }}
                        >
                          {eventType.description}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        No description
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {getStatusChip(eventType.is_active)}
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                      {new Date(eventType.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(eventType.created_at).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Tooltip title="Edit Event Type">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(eventType);
                        }}
                        sx={{
                          ...glassPresets.light,
                          border: `1px solid ${tokens.color.primary[200]}40`,
                          color: tokens.color.primary[600],
                          '&:hover': {
                            ...glassPresets.medium,
                            color: tokens.color.primary[700],
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, eventType)}
                      disabled={isDeleting}
                      sx={{
                        ...glassPresets.light,
                        border: `1px solid ${tokens.color.neutral[300]}40`,
                        color: tokens.color.neutral[600],
                        '&:hover': {
                          ...glassPresets.medium,
                          color: tokens.color.neutral[700],
                        },
                      }}
                    >
                      {isDeleting && selectedEventType?.id === eventType.id ? (
                        <CircularProgress size={16} />
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

      {/* Modern Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            borderRadius: tokens.spacing.radius.lg,
            border: `1px solid ${tokens.color.borders.glass}`,
            boxShadow: tokens.shadow.glass.floating,
            minWidth: 200,
            mt: 0.5,
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem 
          onClick={handleEdit}
          sx={{
            py: 1.5,
            px: 2,
            borderRadius: tokens.spacing.radius.md,
            mx: 0.5,
            mb: 0.5,
            '&:hover': {
              background: `${tokens.color.primary[50]}80`,
              color: tokens.color.primary[700],
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Event Type</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={handleDelete} 
          sx={{ 
            py: 1.5,
            px: 2,
            borderRadius: tokens.spacing.radius.md,
            mx: 0.5,
            color: tokens.color.error[600],
            '&:hover': {
              background: `${tokens.color.error[50]}80`,
              color: tokens.color.error[700],
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Event Type</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};