// frontend/admin-crm/src/components/analytics/events/EventDetails.tsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Event as EventIcon,
  Person as UserIcon,
  Business as DomainIcon,
  Code as DataIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import type { AnalyticsEvent } from '../../../types/analytics.types';

interface EventDetailsProps {
  event: AnalyticsEvent | null;
  open: boolean;
  onClose: () => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({ 
  event, 
  open, 
  onClose 
}) => {
  if (!event) return null;

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add toast notification here
    }).catch(() => {
      // Could add error toast here
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'USER_ACTION': return 'primary';
      case 'SYSTEM_EVENT': return 'info';
      case 'BUSINESS_EVENT': return 'success';
      case 'ERROR_EVENT': return 'error';
      case 'PERFORMANCE': return 'warning';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      iso: date.toISOString(),
    };
  };

  const renderEventData = () => {
    if (!event.event_data || Object.keys(event.event_data).length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" style={{ fontStyle: 'italic' }}>
          No additional event data
        </Typography>
      );
    }

    return (
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2">Event Data (JSON)</Typography>
          <Tooltip title="Copy to clipboard">
            <IconButton 
              size="small" 
              onClick={() => handleCopyToClipboard(JSON.stringify(event.event_data, null, 2))}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <pre style={{ 
          margin: 0, 
          fontSize: '0.875rem', 
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {JSON.stringify(event.event_data, null, 2)}
        </pre>
      </Paper>
    );
  };

  const eventTimestamp = formatTimestamp(event.event_timestamp);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <EventIcon />
            <Typography variant="h6">
              Event Details
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium', width: '30%' }}>
                      Event ID
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontFamily="monospace">
                          {event.id}
                        </Typography>
                        <Tooltip title="Copy ID">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyToClipboard(event.id.toString())}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      Event Name
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {event.event_name}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      Category
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={event.event_category.replace('_', ' ')} 
                        size="small" 
                        color={getCategoryColor(event.event_category) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        variant="outlined" 
                      />
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      Timestamp
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {eventTimestamp.date} at {eventTimestamp.time}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                          {eventTimestamp.iso}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          {/* Source Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Source Information
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium', width: '30%' }}>
                      Domain
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <DomainIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {event.source_domain || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      Model
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {event.source_model || 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      Source ID
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {event.source_id || 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          {/* User Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium', width: '30%' }}>
                      User
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <UserIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {event.user_name || 'Anonymous'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      Session ID
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontFamily="monospace">
                          {event.session_id ? `${event.session_id.slice(0, 8)}...` : 'N/A'}
                        </Typography>
                        {event.session_id && (
                          <Tooltip title="Copy full session ID">
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopyToClipboard(event.session_id)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      IP Address
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {event.ip_address || 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      User Agent
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          wordBreak: 'break-word',
                          maxWidth: 400,
                          fontSize: '0.8rem'
                        }}
                      >
                        {event.user_agent || 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Numeric Value */}
          {event.numeric_value !== null && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Numeric Value
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'primary.50', 
                    borderRadius: 1,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {event.numeric_value}
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          <Divider />

          {/* Event Data */}
          <Box>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
              <DataIcon />
              Event Data
            </Typography>
            {renderEventData()}
          </Box>

          {/* Metadata */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Metadata
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium', width: '30%' }}>
                      Created At
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(event.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                      Updated At
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(event.updated_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};